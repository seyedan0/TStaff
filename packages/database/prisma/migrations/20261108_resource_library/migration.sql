CREATE TYPE "LibraryDocumentVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "apprentice_evaluations"
ADD COLUMN "completed_documents" JSONB;

CREATE TABLE "library_documents" (
  "id" TEXT NOT NULL,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "library_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "library_document_versions" (
  "id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "status" "LibraryDocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "stored_object_id" TEXT NOT NULL,
  "uploaded_by_id" TEXT NOT NULL,
  "published_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "library_document_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "library_document_versions_version_positive" CHECK ("version" > 0),
  CONSTRAINT "library_document_versions_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "library_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "library_document_versions_stored_object_id_fkey"
    FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "library_document_versions_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "document_read_progress" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_read_progress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_read_progress_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_read_progress_version_id_fkey"
    FOREIGN KEY ("version_id") REFERENCES "library_document_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "library_document_versions_document_id_version_key"
ON "library_document_versions"("document_id", "version");
CREATE UNIQUE INDEX "library_document_versions_stored_object_id_key"
ON "library_document_versions"("stored_object_id");
CREATE UNIQUE INDEX "uq_library_one_published_version"
ON "library_document_versions"("document_id")
WHERE "status" = 'PUBLISHED';
CREATE INDEX "library_document_versions_document_id_status_idx"
ON "library_document_versions"("document_id", "status");
CREATE UNIQUE INDEX "document_read_progress_user_id_version_id_key"
ON "document_read_progress"("user_id", "version_id");
CREATE INDEX "document_read_progress_user_id_idx"
ON "document_read_progress"("user_id");
