import type { LibraryDocumentVersionStatus } from "../../domain/document.entity.js";

export interface CreateDocumentVersionInput {
  id: string;
  title: string;
  description: string;
  category: string;
  isRequired: boolean;
  storedObjectId: string;
  uploadedById: string;
}

export interface LibraryDocumentVersionRecord extends CreateDocumentVersionInput {
  documentId: string;
  version: number;
  status: LibraryDocumentVersionStatus;
  publishedAt: Date | null;
  fileName: string;
  mimeType: string;
  scanStatus: "QUARANTINED" | "AVAILABLE" | "REJECTED";
  isVirusScanned: boolean;
}

export interface LibraryDocumentRecord {
  id: string;
  archivedAt: Date | null;
  createdAt: Date;
  versions: LibraryDocumentVersionRecord[];
}

export interface LibraryDocumentCatalogRecord {
  id: string;
  currentVersion: LibraryDocumentVersionRecord & { isRead: boolean; readAt: Date | null };
}

export interface StudyDocumentSnapshot {
  documentId: string;
  versionId: string;
  title: string;
  category: string;
  version: number;
  isRequired: boolean;
  readAt: string;
}

export interface StudyProgressState {
  requiredCurrentVersions: Array<LibraryDocumentVersionRecord & { isRead: boolean; readAt: Date | null }>;
  readCurrentVersions: Array<LibraryDocumentVersionRecord & { isRead: boolean; readAt: Date | null }>;
}

export interface DocumentsRepositoryPort {
  createDocument(id: string, input: CreateDocumentVersionInput): Promise<LibraryDocumentRecord>;
  createVersion(documentId: string, input: CreateDocumentVersionInput): Promise<LibraryDocumentRecord>;
  findDocument(id: string): Promise<LibraryDocumentRecord | null>;
  listPublished(userId: string): Promise<LibraryDocumentCatalogRecord[]>;
  listManaged(): Promise<LibraryDocumentRecord[]>;
  findCurrentPublishedVersion(documentId: string): Promise<LibraryDocumentVersionRecord | null>;
  publishVersion(documentId: string, versionId: string, isRequired: boolean): Promise<void>;
  archiveDocument(documentId: string): Promise<void>;
  markRead(userId: string, documentId: string, versionId: string): Promise<{ readAt: Date }>;
  getStudyProgress(userId: string): Promise<StudyProgressState>;
}

export const DOCUMENTS_REPOSITORY = Symbol("DOCUMENTS_REPOSITORY");
