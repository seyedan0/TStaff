-- Additive migration for organization scopes, resource bank referrals, immutable scenario versions, change requests, and storage provider tracking.

-- AlterTable
ALTER TABLE "resources" ADD COLUMN "province_id" TEXT;

-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN "created_by_id" TEXT;

-- AlterTable
ALTER TABLE "stored_objects" ADD COLUMN "storage_provider" TEXT NOT NULL DEFAULT 'LOCAL';

-- CreateTable
CREATE TABLE "provinces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provincial_scopes" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "province_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "provincial_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_manager_grants" (
    "id" TEXT NOT NULL,
    "manager_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "user_manager_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_referrals" (
    "id" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "referred_by_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "applicant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "resource_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenario_versions" (
    "id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ScenarioStatus" NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scenario_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_change_requests" (
    "id" TEXT NOT NULL,
    "research_case_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "target_stage" "StageType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expected_version" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewer_id" TEXT,
    "decision_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMP(3),

    CONSTRAINT "research_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE INDEX "provincial_scopes_manager_id_revoked_at_idx" ON "provincial_scopes"("manager_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "provincial_scopes_manager_id_province_id_key" ON "provincial_scopes"("manager_id", "province_id");

-- CreateIndex
CREATE INDEX "user_manager_grants_manager_id_revoked_at_idx" ON "user_manager_grants"("manager_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_manager_grants_manager_id_user_id_key" ON "user_manager_grants"("manager_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "resource_referrals_applicant_id_key" ON "resource_referrals"("applicant_id");

-- CreateIndex
CREATE INDEX "resource_referrals_recipient_id_status_idx" ON "resource_referrals"("recipient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "resource_referrals_resource_id_recipient_id_key" ON "resource_referrals"("resource_id", "recipient_id");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_versions_scenario_id_version_key" ON "scenario_versions"("scenario_id", "version");

-- CreateIndex
CREATE INDEX "research_change_requests_research_case_id_status_idx" ON "research_change_requests"("research_case_id", "status");

-- CreateIndex
CREATE INDEX "resources_province_id_created_at_idx" ON "resources"("province_id", "created_at");

-- AddForeignKey
ALTER TABLE "resource_referrals" ADD CONSTRAINT "resource_referrals_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenario_versions" ADD CONSTRAINT "scenario_versions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed canonical Iranian provinces idempotently
INSERT INTO "provinces" ("id", "name") VALUES
    ('91000000-0000-4000-8000-000000000001', 'آذربایجان شرقی'),
    ('91000000-0000-4000-8000-000000000002', 'آذربایجان غربی'),
    ('91000000-0000-4000-8000-000000000003', 'اردبیل'),
    ('91000000-0000-4000-8000-000000000004', 'اصفهان'),
    ('91000000-0000-4000-8000-000000000005', 'البرز'),
    ('91000000-0000-4000-8000-000000000006', 'ایلام'),
    ('91000000-0000-4000-8000-000000000007', 'بوشهر'),
    ('91000000-0000-4000-8000-000000000008', 'تهران'),
    ('91000000-0000-4000-8000-000000000009', 'چهارمحال و بختیاری'),
    ('91000000-0000-4000-8000-000000000010', 'خراسان جنوبی'),
    ('91000000-0000-4000-8000-000000000011', 'خراسان رضوی'),
    ('91000000-0000-4000-8000-000000000012', 'خراسان شمالی'),
    ('91000000-0000-4000-8000-000000000013', 'خوزستان'),
    ('91000000-0000-4000-8000-000000000014', 'زنجان'),
    ('91000000-0000-4000-8000-000000000015', 'سمنان'),
    ('91000000-0000-4000-8000-000000000016', 'سیستان و بلوچستان'),
    ('91000000-0000-4000-8000-000000000017', 'فارس'),
    ('91000000-0000-4000-8000-000000000018', 'قزوین'),
    ('91000000-0000-4000-8000-000000000019', 'قم'),
    ('91000000-0000-4000-8000-000000000020', 'کردستان'),
    ('91000000-0000-4000-8000-000000000021', 'کرمان'),
    ('91000000-0000-4000-8000-000000000022', 'کرمانشاه'),
    ('91000000-0000-4000-8000-000000000023', 'کهگیلویه و بویراحمد'),
    ('91000000-0000-4000-8000-000000000024', 'گلستان'),
    ('91000000-0000-4000-8000-000000000025', 'گیلان'),
    ('91000000-0000-4000-8000-000000000026', 'لرستان'),
    ('91000000-0000-4000-8000-000000000027', 'مازندران'),
    ('91000000-0000-4000-8000-000000000028', 'مرکزی'),
    ('91000000-0000-4000-8000-000000000029', 'هرمزگان'),
    ('91000000-0000-4000-8000-000000000030', 'همدان'),
    ('91000000-0000-4000-8000-000000000031', 'یزد')
ON CONFLICT ("id") DO NOTHING;

-- Backfill resource province_id strictly on exact canonical match (unmapped stays NULL)
UPDATE "resources" r
SET "province_id" = p."id"
FROM "provinces" p
WHERE r."province_id" IS NULL
  AND r."province" IS NOT NULL
  AND REGEXP_REPLACE(REPLACE(REPLACE(TRIM(r."province"), 'ي', 'ی'), 'ك', 'ک'), '^استان[[:space:]]+', '') = p."name";

-- Preserve initial version snapshot for existing scenarios without guessing created_by_id
INSERT INTO "scenario_versions" ("id", "scenario_id", "version", "title", "summary", "content", "status", "created_by_id", "created_at")
SELECT
    md5(s."id" || ':' || s."version"::text),
    s."id",
    s."version",
    s."title",
    s."summary",
    s."content",
    s."status",
    NULL,
    s."created_at"
FROM "scenarios" s
ON CONFLICT ("scenario_id", "version") DO NOTHING;

