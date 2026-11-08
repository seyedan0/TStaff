import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "@tstaff/database";
import type { Prisma } from "@tstaff/database";
import {
  LibraryDocumentNotFoundError,
  LibraryDocumentVersionNotPublishableError,
  LibraryDocumentVersionNotFoundError,
} from "../domain/document-errors.js";
import type {
  CreateDocumentVersionInput,
  LibraryDocumentCatalogRecord,
  LibraryDocumentRecord,
  LibraryDocumentVersionRecord,
  DocumentsRepositoryPort,
  StudyProgressState,
} from "../application/ports/documents.ports.js";

const includeVersions = {
  versions: {
    include: { storedObject: true },
    orderBy: { version: "desc" as const },
  },
} satisfies Prisma.LibraryDocumentInclude;

type DocumentRow = Prisma.LibraryDocumentGetPayload<{ include: typeof includeVersions }>;
type VersionRow = Prisma.LibraryDocumentVersionGetPayload<{ include: { storedObject: true } }>;

@Injectable()
export class PrismaDocumentsRepository implements DocumentsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(id: string, input: CreateDocumentVersionInput): Promise<LibraryDocumentRecord> {
    await this.prisma.$transaction(async (tx) => {
      await tx.libraryDocument.create({ data: { id } });
      await tx.libraryDocumentVersion.create({
        data: {
          ...input,
          documentId: id,
          version: 1,
          status: "DRAFT",
        },
      });
    });
    return this.findDocumentOrThrow(id);
  }

  async createVersion(documentId: string, input: CreateDocumentVersionInput): Promise<LibraryDocumentRecord> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
      const document = await tx.libraryDocument.findUnique({ where: { id: documentId } });
      if (!document || document.archivedAt) throw new LibraryDocumentNotFoundError(documentId);
      const latest = await tx.libraryDocumentVersion.aggregate({
        where: { documentId },
        _max: { version: true },
      });
      await tx.libraryDocumentVersion.create({
        data: {
          ...input,
          documentId,
          version: (latest._max.version ?? 0) + 1,
          status: "DRAFT",
        },
      });
    });
    return this.findDocumentOrThrow(documentId);
  }

  async findDocument(id: string): Promise<LibraryDocumentRecord | null> {
    const row = await this.prisma.libraryDocument.findUnique({
      where: { id },
      include: includeVersions,
    });
    return row ? this.toRecord(row) : null;
  }

  async listPublished(userId: string): Promise<LibraryDocumentCatalogRecord[]> {
    const rows = await this.prisma.libraryDocument.findMany({
      where: {
        archivedAt: null,
        versions: {
          some: {
            status: "PUBLISHED",
            storedObject: { scanStatus: "AVAILABLE", isVirusScanned: true },
          },
        },
      },
      include: {
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { version: "desc" },
          take: 1,
          include: {
            storedObject: true,
            readProgress: { where: { userId }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.flatMap((document) => {
      const version = document.versions[0];
      if (!version) return [];
      const record = this.toVersionRecord(version);
      const readAt = version.readProgress[0]?.readAt ?? null;
      return [{
        id: document.id,
        currentVersion: { ...record, isRead: readAt !== null, readAt },
      }];
    });
  }

  async listManaged(): Promise<LibraryDocumentRecord[]> {
    const rows = await this.prisma.libraryDocument.findMany({
      include: includeVersions,
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => this.toRecord(row));
  }

  async findCurrentPublishedVersion(documentId: string): Promise<LibraryDocumentVersionRecord | null> {
    const version = await this.prisma.libraryDocumentVersion.findFirst({
      where: {
        documentId,
        status: "PUBLISHED",
        document: { archivedAt: null },
      },
      include: { storedObject: true },
      orderBy: { version: "desc" },
    });
    return version ? this.toVersionRecord(version) : null;
  }

  async publishVersion(documentId: string, versionId: string, isRequired: boolean): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${documentId}))`;
      const document = await tx.libraryDocument.findUnique({ where: { id: documentId } });
      if (!document || document.archivedAt) throw new LibraryDocumentNotFoundError(documentId);
      const version = await tx.libraryDocumentVersion.findFirst({ where: { id: versionId, documentId } });
      if (!version) throw new LibraryDocumentVersionNotFoundError(versionId);
      const latest = await tx.libraryDocumentVersion.aggregate({
        where: { documentId },
        _max: { version: true },
      });
      if (version.version !== latest._max.version || version.status !== "DRAFT") {
        throw new LibraryDocumentVersionNotPublishableError();
      }
      await tx.libraryDocumentVersion.updateMany({
        where: { documentId, status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
      await tx.libraryDocumentVersion.update({
        where: { id: versionId },
        data: { status: "PUBLISHED", publishedAt: new Date(), isRequired },
      });
    });
  }

  async archiveDocument(documentId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const document = await tx.libraryDocument.findUnique({ where: { id: documentId } });
      if (!document) throw new LibraryDocumentNotFoundError(documentId);
      await tx.libraryDocument.update({ where: { id: documentId }, data: { archivedAt: new Date() } });
      await tx.libraryDocumentVersion.updateMany({
        where: { documentId, status: "PUBLISHED" },
        data: { status: "ARCHIVED" },
      });
    });
  }

  async markRead(userId: string, documentId: string, versionId: string): Promise<{ readAt: Date }> {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.libraryDocumentVersion.findFirst({
        where: {
          id: versionId,
          documentId,
          status: "PUBLISHED",
          document: { archivedAt: null },
          storedObject: { scanStatus: "AVAILABLE", isVirusScanned: true },
        },
        select: { id: true },
      });
      if (!version) throw new LibraryDocumentVersionNotFoundError(versionId);
      const read = await tx.documentReadProgress.upsert({
        where: { userId_versionId: { userId, versionId } },
        create: { id: randomUUID(), userId, versionId },
        update: {},
      });
      return { readAt: read.readAt };
    });
  }

  async getStudyProgress(userId: string): Promise<StudyProgressState> {
    const documents = await this.listPublished(userId);
    const current = documents.map(({ currentVersion }) => ({
      ...currentVersion,
      readAt: currentVersion.readAt,
    }));
    return {
      requiredCurrentVersions: current.filter((version) => version.isRequired),
      readCurrentVersions: current.filter((version) => version.isRead),
    };
  }

  private async findDocumentOrThrow(id: string): Promise<LibraryDocumentRecord> {
    const document = await this.findDocument(id);
    if (!document) throw new LibraryDocumentNotFoundError(id);
    return document;
  }

  private toRecord(row: DocumentRow): LibraryDocumentRecord {
    return {
      id: row.id,
      archivedAt: row.archivedAt,
      createdAt: row.createdAt,
      versions: row.versions.map((version) => this.toVersionRecord(version)),
    };
  }

  private toVersionRecord(version: VersionRow): LibraryDocumentVersionRecord {
    return {
      id: version.id,
      documentId: version.documentId,
      version: version.version,
      title: version.title,
      description: version.description,
      category: version.category,
      isRequired: version.isRequired,
      status: version.status,
      storedObjectId: version.storedObjectId,
      uploadedById: version.uploadedById,
      publishedAt: version.publishedAt,
      fileName: version.storedObject.originalName,
      mimeType: version.storedObject.mimeType,
      scanStatus: version.storedObject.scanStatus,
      isVirusScanned: version.storedObject.isVirusScanned,
    };
  }
}
