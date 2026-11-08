-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('QUARANTINED', 'AVAILABLE', 'REJECTED');

-- AlterEnum
ALTER TYPE "StageStatus" ADD VALUE 'SUBMITTED';

-- AlterTable
ALTER TABLE "applicants" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "initial_supervisor_id" TEXT;

-- AlterTable
ALTER TABLE "research_cases" ADD COLUMN     "researcher_id" TEXT;

-- AlterTable
ALTER TABLE "stage_submissions" ADD COLUMN     "stored_object_id" TEXT;

-- AlterTable
ALTER TABLE "resources" ADD COLUMN     "county" TEXT,
ADD COLUMN     "person_age" INTEGER,
ADD COLUMN     "position" TEXT,
ADD COLUMN     "province" TEXT;

-- AlterTable
ALTER TABLE "interviews" ADD COLUMN     "duration_minutes" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "mode" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "interview_reports" ADD COLUMN     "stored_object_id" TEXT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "stored_objects" ADD COLUMN     "scan_status" "FileScanStatus" NOT NULL DEFAULT 'QUARANTINED';

-- CreateTable
CREATE TABLE "scientific_supervisor_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "supervisor_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "scientific_supervisor_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_organizations" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "education_level" TEXT,
    "organization_type" TEXT,
    "description" TEXT,

    CONSTRAINT "resource_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scientific_supervisor_assignments_supervisor_id_revoked_at_idx" ON "scientific_supervisor_assignments"("supervisor_id", "revoked_at");

-- CreateIndex
CREATE INDEX "scientific_supervisor_assignments_user_id_revoked_at_idx" ON "scientific_supervisor_assignments"("user_id", "revoked_at");

-- CreateIndex
WITH ranked_reports AS (
    SELECT
        id,
        interview_id,
        version,
        created_at,
        COUNT(*) OVER (PARTITION BY interview_id, version) AS version_count,
        ROW_NUMBER() OVER (PARTITION BY interview_id, version ORDER BY created_at, id) AS duplicate_rank,
        MAX(version) OVER (PARTITION BY interview_id) AS max_version
    FROM interview_reports
),
duplicates AS (
    SELECT
        id,
        max_version + ROW_NUMBER() OVER (PARTITION BY interview_id ORDER BY version, created_at, id) AS new_version
    FROM ranked_reports
    WHERE version_count > 1 AND duplicate_rank > 1
)
UPDATE interview_reports AS reports
SET version = duplicates.new_version
FROM duplicates
WHERE reports.id = duplicates.id;

-- CreateIndex
CREATE UNIQUE INDEX "scientific_supervisor_assignments_user_id_supervisor_id_key" ON "scientific_supervisor_assignments"("user_id", "supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_organizations_resource_id_key" ON "resource_organizations"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_reports_interview_id_version_key" ON "interview_reports"("interview_id", "version");

-- AddForeignKey
ALTER TABLE "research_cases" ADD CONSTRAINT "research_cases_researcher_id_fkey" FOREIGN KEY ("researcher_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scientific_supervisor_assignments" ADD CONSTRAINT "scientific_supervisor_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scientific_supervisor_assignments" ADD CONSTRAINT "scientific_supervisor_assignments_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_submissions" ADD CONSTRAINT "stage_submissions_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_organizations" ADD CONSTRAINT "resource_organizations_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_reports" ADD CONSTRAINT "interview_reports_stored_object_id_fkey" FOREIGN KEY ("stored_object_id") REFERENCES "stored_objects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

