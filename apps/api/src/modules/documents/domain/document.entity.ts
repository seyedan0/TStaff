import {
  LibraryDocumentAlreadyArchivedError,
  LibraryDocumentFileNotReadyError,
  LibraryDocumentVersionNotPublishableError,
  LibraryDocumentVersionNotFoundError,
} from "./document-errors.js";

export type LibraryDocumentVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface LibraryDocumentVersionState {
  id: string;
  documentId: string;
  version: number;
  status: LibraryDocumentVersionStatus;
}

export interface LibraryDocumentState {
  id: string;
  archivedAt: Date | null;
  versions: readonly LibraryDocumentVersionState[];
}

export function getCurrentPublishedVersion<T extends LibraryDocumentVersionState>(
  document: Omit<LibraryDocumentState, "versions"> & { versions: readonly T[] },
): T | null {
  if (document.archivedAt) return null;
  return document.versions
    .filter((version) => version.status === "PUBLISHED")
    .sort((left, right) => right.version - left.version)[0] ?? null;
}

export function assertVersionCanPublish(
  document: LibraryDocumentState,
  versionId: string,
  isFileReady: boolean,
): LibraryDocumentVersionState {
  if (document.archivedAt) throw new LibraryDocumentAlreadyArchivedError();
  const version = document.versions.find((item) => item.id === versionId);
  if (!version) throw new LibraryDocumentVersionNotFoundError(versionId);
  const latestVersion = Math.max(...document.versions.map((item) => item.version));
  if (version.status !== "DRAFT" || version.version !== latestVersion) {
    throw new LibraryDocumentVersionNotPublishableError();
  }
  if (!isFileReady) throw new LibraryDocumentFileNotReadyError();
  return version;
}
