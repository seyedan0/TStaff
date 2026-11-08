import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  CreateLibraryDocumentDto,
  CreateLibraryDocumentVersionDto,
  LibraryDocumentDto,
  LibraryDocumentVersionDto,
  ManagedLibraryDocumentVersionDto,
  PublishedLibraryDocumentDto,
  StudyDocumentSnapshot,
} from "@tstaff/contracts";
import { FilesService } from "../../files/application/files.service.js";
import {
  LibraryDocumentAlreadyArchivedError,
  LibraryDocumentFileNotReadyError,
  LibraryDocumentNotFoundError,
  LibraryDocumentVersionNotCurrentError,
  LibraryDocumentVersionNotFoundError,
  RequiredDocumentsNotConfiguredError,
  StudyProgressIncompleteError,
} from "../domain/document-errors.js";
import { assertVersionCanPublish } from "../domain/document.entity.js";
import {
  DOCUMENTS_REPOSITORY,
  type DocumentsRepositoryPort,
  type LibraryDocumentCatalogRecord,
  type LibraryDocumentRecord,
  type LibraryDocumentVersionRecord,
} from "./ports/documents.ports.js";

export interface UploadedLibraryDocumentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DOCUMENTS_REPOSITORY)
    private readonly repository: DocumentsRepositoryPort,
    @Inject(FilesService)
    private readonly files: FilesService,
  ) {}

  async createDocument(
    input: CreateLibraryDocumentDto,
    file: UploadedLibraryDocumentFile,
    uploadedById: string,
  ): Promise<LibraryDocumentDto> {
    const stored = await this.files.upload(file, uploadedById);
    const document = await this.repository.createDocument(randomUUID(), {
      id: randomUUID(),
      ...input,
      isRequired: false,
      storedObjectId: stored.id,
      uploadedById,
    });
    return this.toManagedDocument(document);
  }

  async createVersion(
    documentId: string,
    input: CreateLibraryDocumentVersionDto,
    file: UploadedLibraryDocumentFile,
    uploadedById: string,
  ): Promise<LibraryDocumentDto> {
    const document = await this.getManagedDocument(documentId);
    if (document.archivedAt) throw new LibraryDocumentAlreadyArchivedError();
    const stored = await this.files.upload(file, uploadedById);
    const updated = await this.repository.createVersion(documentId, {
      id: randomUUID(),
      ...input,
      isRequired: false,
      storedObjectId: stored.id,
      uploadedById,
    });
    return this.toManagedDocument(updated);
  }

  async publishVersion(documentId: string, versionId: string, isRequired: boolean): Promise<LibraryDocumentDto> {
    const document = await this.getManagedDocument(documentId);
    const version = document.versions.find((item) => item.id === versionId);
    if (!version) throw new LibraryDocumentVersionNotFoundError(versionId);
    const fileReady = await this.files.isAvailable(version.storedObjectId);
    assertVersionCanPublish(document, versionId, fileReady);
    await this.repository.publishVersion(documentId, versionId, isRequired);
    return this.toManagedDocument(await this.getManagedDocument(documentId));
  }

  async archiveDocument(documentId: string): Promise<LibraryDocumentDto> {
    const document = await this.getManagedDocument(documentId);
    if (document.archivedAt) throw new LibraryDocumentAlreadyArchivedError();
    await this.repository.archiveDocument(documentId);
    return this.toManagedDocument(await this.getManagedDocument(documentId));
  }

  async listPublished(userId: string): Promise<PublishedLibraryDocumentDto[]> {
    const documents = await this.repository.listPublished(userId);
    const available = await Promise.all(documents.map(async (document) => ({
      ...document,
      isAvailable: await this.files.isAvailable(document.currentVersion.storedObjectId),
    })));
    return available
      .filter((document) => document.currentVersion.status === "PUBLISHED" && document.isAvailable)
      .map(({ id, currentVersion }) => ({
        id,
        currentVersion: this.toPublicVersion(currentVersion),
      }));
  }

  async getPublished(documentId: string, userId: string) {
    const document = (await this.listPublished(userId)).find((item) => item.id === documentId);
    if (!document) throw new LibraryDocumentNotFoundError(documentId);
    return document;
  }

  async listManaged(): Promise<LibraryDocumentDto[]> {
    const documents = await this.repository.listManaged();
    return documents.map((document) => this.toManagedDocument(document));
  }

  async getManagedDocument(documentId: string): Promise<LibraryDocumentRecord> {
    const document = await this.repository.findDocument(documentId);
    if (!document) throw new LibraryDocumentNotFoundError(documentId);
    return document;
  }

  async getDownload(documentId: string) {
    const version = await this.repository.findCurrentPublishedVersion(documentId);
    if (!version) throw new LibraryDocumentNotFoundError(documentId);
    if (!(await this.files.isAvailable(version.storedObjectId))) {
      throw new LibraryDocumentFileNotReadyError();
    }
    return this.files.getReadyFileForLibrary(version.storedObjectId);
  }

  async markRead(userId: string, documentId: string, versionId: string) {
    const current = await this.repository.findCurrentPublishedVersion(documentId);
    if (!current || current.id !== versionId) throw new LibraryDocumentVersionNotCurrentError();
    if (!(await this.files.isAvailable(current.storedObjectId))) {
      throw new LibraryDocumentFileNotReadyError();
    }
    return this.repository.markRead(userId, documentId, versionId);
  }

  async getStudySnapshot(userId: string): Promise<{
    requiredCount: number;
    readRequiredCount: number;
    completedDocuments: StudyDocumentSnapshot[];
  }> {
    const progress = await this.repository.getStudyProgress(userId);
    const required = await Promise.all(progress.requiredCurrentVersions.map(async (version) => ({
      ...version,
      isAvailable: await this.files.isAvailable(version.storedObjectId),
    })));
    const currentReads = await Promise.all(progress.readCurrentVersions.map(async (version) => ({
      ...version,
      isAvailable: await this.files.isAvailable(version.storedObjectId),
    })));
    const requiredAvailable = required.filter((version) => version.isAvailable);
    if (requiredAvailable.length === 0) throw new RequiredDocumentsNotConfiguredError();

    const readRequiredCount = requiredAvailable.filter((version) => version.isRead).length;
    if (readRequiredCount !== requiredAvailable.length) throw new StudyProgressIncompleteError();

    return {
      requiredCount: requiredAvailable.length,
      readRequiredCount,
      completedDocuments: currentReads
        .filter((version) => version.isRead && version.readAt && version.isAvailable)
        .map((version) => ({
          documentId: version.documentId,
          versionId: version.id,
          title: version.title,
          category: version.category,
          version: version.version,
          isRequired: version.isRequired,
          readAt: version.readAt!.toISOString(),
        })),
    };
  }

  private toPublicVersion(version: LibraryDocumentCatalogRecord["currentVersion"]): LibraryDocumentVersionDto {
    return {
      id: version.id,
      version: version.version,
      title: version.title,
      description: version.description,
      category: version.category,
      isRequired: version.isRequired,
      status: version.status,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      isRead: version.isRead,
      fileName: version.fileName,
      scanStatus: version.scanStatus,
    };
  }

  private toManagedDocument(document: LibraryDocumentRecord): LibraryDocumentDto {
    const versions = document.versions.map((version) => this.toManagedVersion(version));
    return {
      id: document.id,
      archivedAt: document.archivedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      currentVersion: versions.find((version) => version.status === "PUBLISHED") ?? null,
      versions,
    };
  }

  private toManagedVersion(version: LibraryDocumentVersionRecord): ManagedLibraryDocumentVersionDto {
    return {
      id: version.id,
      version: version.version,
      title: version.title,
      description: version.description,
      category: version.category,
      isRequired: version.isRequired,
      status: version.status,
      publishedAt: version.publishedAt?.toISOString() ?? null,
      fileName: version.fileName,
      scanStatus: version.scanStatus,
      uploadedById: version.uploadedById,
      storedObjectId: version.storedObjectId,
    };
  }
}
