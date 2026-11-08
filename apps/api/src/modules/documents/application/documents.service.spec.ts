import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentsService } from "./documents.service.js";

type VersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface VersionRecord {
  id: string;
  documentId: string;
  version: number;
  title: string;
  description: string;
  category: string;
  isRequired: boolean;
  status: VersionStatus;
  storedObjectId: string;
  uploadedById: string;
  publishedAt: Date | null;
}

interface DocumentRecord {
  id: string;
  archivedAt: Date | null;
  versions: VersionRecord[];
}

class InMemoryDocumentsRepository {
  readonly documents = new Map<string, DocumentRecord>();
  readonly reads = new Set<string>();

  async createDocument(id: string, input: Omit<VersionRecord, "documentId" | "version" | "status" | "publishedAt" | "fileName" | "mimeType" | "scanStatus" | "isVirusScanned">): Promise<DocumentRecord> {
    const version: VersionRecord & { fileName: string; mimeType: string; scanStatus: "AVAILABLE"; isVirusScanned: boolean } = {
      ...input,
      documentId: id,
      version: 1,
      status: "DRAFT",
      publishedAt: null,
      fileName: "guideline.pdf",
      mimeType: "application/pdf",
      scanStatus: "AVAILABLE",
      isVirusScanned: true,
    };
    const row = { id, versions: [version], archivedAt: null, createdAt: new Date() };
    this.documents.set(row.id, row);
    return row;
  }

  async createVersion(documentId: string, input: Omit<VersionRecord, "documentId" | "version" | "status" | "publishedAt" | "fileName" | "mimeType" | "scanStatus" | "isVirusScanned">): Promise<DocumentRecord> {
    const document = this.documents.get(documentId);
    if (!document) throw new Error("DOCUMENT_NOT_FOUND");
    const version = {
      ...input,
      documentId,
      version: Math.max(...document.versions.map((item) => item.version)) + 1,
      status: "DRAFT" as const,
      publishedAt: null,
      fileName: "guideline.pdf",
      mimeType: "application/pdf",
      scanStatus: "AVAILABLE" as const,
      isVirusScanned: true,
    };
    const updated = { ...document, versions: [...document.versions, version] };
    this.documents.set(documentId, updated);
    return updated;
  }

  async findDocument(id: string): Promise<DocumentRecord | null> {
    return this.documents.get(id) ?? null;
  }

  async listPublished(userId: string) {
    return [...this.documents.values()].flatMap((document) => {
      if (document.archivedAt) return [];
      const version = [...document.versions]
        .filter((item) => item.status === "PUBLISHED")
        .sort((left, right) => right.version - left.version)[0];
      if (!version) return [];
      return [{ id: document.id, currentVersion: { ...version, isRead: this.reads.has(`${userId}:${version.id}`) } }];
    });
  }

  async listManaged() {
    return [...this.documents.values()];
  }

  async publishVersion(documentId: string, versionId: string, isRequired: boolean): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document || document.archivedAt) throw new Error("DOCUMENT_NOT_FOUND");
    const updatedVersions = document.versions.map((version) =>
      version.id === versionId
        ? { ...version, status: "PUBLISHED" as const, publishedAt: new Date(), isRequired }
        : version.status === "PUBLISHED"
          ? { ...version, status: "ARCHIVED" as const }
          : version,
    );
    this.documents.set(documentId, { ...document, versions: updatedVersions });
  }

  async archiveDocument(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (!document) throw new Error("DOCUMENT_NOT_FOUND");
    this.documents.set(documentId, { ...document, archivedAt: new Date() });
  }

  async findCurrentPublishedVersion(documentId: string) {
    const document = this.documents.get(documentId);
    if (!document || document.archivedAt) return null;
    return document.versions.find((version) => version.status === "PUBLISHED") ?? null;
  }

  async markRead(userId: string, documentId: string, versionId: string) {
    const version = await this.findCurrentPublishedVersion(documentId);
    if (!version || version.id !== versionId) throw new Error("DOCUMENT_VERSION_NOT_CURRENT");
    this.reads.add(`${userId}:${versionId}`);
    return { documentId, versionId, readAt: new Date() };
  }

  async getStudyProgress(userId: string) {
    const current = await this.listPublished(userId);
    const withRead = current.map(({ currentVersion }) => ({
      ...currentVersion,
      readAt: this.reads.has(`${userId}:${currentVersion.id}`) ? new Date() : null,
    }));
    return {
      requiredCurrentVersions: withRead.filter((version) => version.isRequired),
      readCurrentVersions: withRead.filter((version) => version.isRead),
    };
  }
}

describe("DocumentsService (FR-006, FR-007, AT-35–AT-38)", () => {
  let repository: InMemoryDocumentsRepository;
  let files: {
    upload: ReturnType<typeof vi.fn>;
    isAvailable: ReturnType<typeof vi.fn>;
    getReadyFileForLibrary: ReturnType<typeof vi.fn>;
  };
  let service: DocumentsService;

  beforeEach(() => {
    repository = new InMemoryDocumentsRepository();
    files = {
      upload: vi.fn(async (_file: unknown, uploadedById: string) => ({
        id: `file-${uploadedById}`,
        originalName: "guideline.pdf",
        size: 12,
        scanStatus: "AVAILABLE" as const,
      })),
      isAvailable: vi.fn(async () => true),
      getReadyFileForLibrary: vi.fn(async () => ({
        stream: null,
        name: "guideline.pdf",
        mimeType: "application/pdf",
      })),
    };
    service = new DocumentsService(repository as never, files as never);
  });

  it("persists uploaded files as draft versions until a supervisor publishes them", async () => {
    const created = await service.createDocument(
      {
        title: "راهنمای منابع",
        description: "شرح کوتاه",
        category: "آموزش",
      },
      { originalname: "guideline.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );

    expect(created.versions[0]).toMatchObject({ version: 1, status: "DRAFT", isRequired: false });
    expect(files.upload).toHaveBeenCalledWith(expect.anything(), "supervisor-1");
  });

  it("refuses to publish a version while its stored file is quarantined", async () => {
    const created = await service.createDocument(
      { title: "راهنما", description: "شرح", category: "آموزش" },
      { originalname: "guide.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    files.isAvailable.mockResolvedValueOnce(false);

    await expect(service.publishVersion(created.id, created.versions[0]!.id, true))
      .rejects.toMatchObject({ code: "DOCUMENT_FILE_NOT_READY" });
    expect((await repository.findDocument(created.id))?.versions[0]?.status).toBe("DRAFT");
  });

  it("keeps only the current published, clean versions in the user catalog", async () => {
    const created = await service.createDocument(
      { title: "راهنما", description: "شرح", category: "آموزش" },
      { originalname: "guide.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await service.publishVersion(created.id, created.versions[0]!.id, true);
    const next = await service.createVersion(
      created.id,
      { title: "راهنما", description: "شرح تازه", category: "آموزش" },
      { originalname: "guide-v2.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );

    expect(await service.listPublished("reader-1")).toHaveLength(1);
    expect((await service.listPublished("reader-1"))[0]?.currentVersion.version).toBe(1);

    await service.publishVersion(created.id, next.versions.at(-1)!.id, false);
    expect((await service.listPublished("reader-1"))[0]?.currentVersion.version).toBe(2);
  });

  it("requires at least one mandatory current version and all mandatory current versions read", async () => {
    await expect(service.getStudySnapshot("apprentice-1"))
      .rejects.toMatchObject({ code: "REQUIRED_DOCUMENTS_NOT_CONFIGURED" });

    const required = await service.createDocument(
      { title: "الزامی", description: "شرح", category: "آموزش" },
      { originalname: "required.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await service.publishVersion(required.id, required.versions[0]!.id, true);
    const optional = await service.createDocument(
      { title: "مرجع", description: "شرح", category: "آموزش" },
      { originalname: "optional.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await service.publishVersion(optional.id, optional.versions[0]!.id, false);

    await expect(service.getStudySnapshot("apprentice-1"))
      .rejects.toMatchObject({ code: "STUDY_PROGRESS_INCOMPLETE" });
    await service.markRead("apprentice-1", required.id, required.versions[0]!.id);
    await service.markRead("apprentice-1", optional.id, optional.versions[0]!.id);

    await expect(service.getStudySnapshot("apprentice-1")).resolves.toMatchObject({
      requiredCount: 1,
      readRequiredCount: 1,
      completedDocuments: [
        expect.objectContaining({ documentId: required.id, version: 1 }),
        expect.objectContaining({ documentId: optional.id, version: 1 }),
      ],
    });
  });

  it("cannot record a read for an old version after a newer version is published", async () => {
    const created = await service.createDocument(
      { title: "راهنما", description: "شرح", category: "آموزش" },
      { originalname: "guide.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await service.publishVersion(created.id, created.versions[0]!.id, true);
    const next = await service.createVersion(
      created.id,
      { title: "راهنما", description: "شرح تازه", category: "آموزش" },
      { originalname: "guide-v2.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await service.publishVersion(created.id, next.versions.at(-1)!.id, true);

    await expect(service.markRead("apprentice-1", created.id, created.versions[0]!.id))
      .rejects.toMatchObject({ code: "DOCUMENT_VERSION_NOT_CURRENT" });
  });

  it("only downloads a published current version and archives without deleting history", async () => {
    const created = await service.createDocument(
      { title: "راهنما", description: "شرح", category: "آموزش" },
      { originalname: "guide.pdf", mimetype: "application/pdf", size: 12, buffer: Buffer.from("pdf") },
      "supervisor-1",
    );
    await expect(service.getDownload("unpublished-id")).rejects.toBeDefined();
    await service.publishVersion(created.id, created.versions[0]!.id, true);
    await expect(service.getDownload(created.id)).resolves.toMatchObject({ name: "guideline.pdf" });

    await service.archiveDocument(created.id);
    await expect(service.getDownload(created.id)).rejects.toBeDefined();
    expect((await repository.findDocument(created.id))?.versions).toHaveLength(1);
  });
});
