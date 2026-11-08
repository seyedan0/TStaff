import type { PublishedLibraryDocumentDto } from "@tstaff/contracts";

export interface StudyProgress {
  requiredCount: number;
  readRequiredCount: number;
  canRequestEvaluation: boolean;
}

export function getStudyProgress(
  documents: readonly PublishedLibraryDocumentDto[],
): StudyProgress {
  const requiredDocuments = documents.filter((document) => document.currentVersion.isRequired);
  const readRequiredCount = requiredDocuments.filter((document) => document.currentVersion.isRead).length;
  return {
    requiredCount: requiredDocuments.length,
    readRequiredCount,
    canRequestEvaluation: requiredDocuments.length > 0 && readRequiredCount === requiredDocuments.length,
  };
}
