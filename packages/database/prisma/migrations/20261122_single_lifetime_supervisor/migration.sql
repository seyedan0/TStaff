-- D-09: one scientific supervisor per person for the life of the account.
-- The migration intentionally stops on ambiguous legacy state. Review the
-- report with packages/database/scripts/audit-supervisor-consistency.sql,
-- resolve each case with product owners, and rerun without deleting history.
BEGIN;
ALTER TABLE "applicants"
  ADD COLUMN IF NOT EXISTS "initial_supervisor_assigned_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "initial_supervisor_assigned_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);
DO $$
DECLARE conflicts text;
BEGIN
  SELECT string_agg(issue, E'\n' ORDER BY issue) INTO conflicts
  FROM (
    SELECT format('user %s has %s historical scientific supervisors', user_id, count(DISTINCT supervisor_id)) AS issue
    FROM scientific_supervisor_assignments GROUP BY user_id HAVING count(DISTINCT supervisor_id) > 1
    UNION ALL
    SELECT format('research case %s contains a legacy collaborator supervisor row %s', research_case_id, id)
    FROM research_assignments WHERE role = 'COLLABORATOR_SUPERVISOR'
    UNION ALL
    SELECT format('research case %s has %s active main supervisors', research_case_id, count(*))
    FROM research_assignments WHERE role = 'MAIN_SUPERVISOR' AND is_active
    GROUP BY research_case_id HAVING count(*) > 1
    UNION ALL
    SELECT format('research case %s has no researcher owner but has an active main supervisor %s', rc.id, ra.id)
    FROM research_cases rc JOIN research_assignments ra ON ra.research_case_id = rc.id
    WHERE rc.researcher_id IS NULL AND ra.role = 'MAIN_SUPERVISOR' AND ra.is_active
    UNION ALL
    SELECT format('research case %s supervisor %s differs from lifetime supervisor for researcher %s', rc.id, ra.user_id, rc.researcher_id)
    FROM research_cases rc JOIN research_assignments ra ON ra.research_case_id = rc.id
    WHERE rc.researcher_id IS NOT NULL AND ra.role = 'MAIN_SUPERVISOR' AND ra.is_active
      AND NOT EXISTS (SELECT 1 FROM scientific_supervisor_assignments s WHERE s.user_id = rc.researcher_id AND s.supervisor_id = ra.user_id)
    UNION ALL
    SELECT format('research case %s has no researcher owner', rc.id)
    FROM research_cases rc WHERE rc.researcher_id IS NULL
    UNION ALL
    SELECT format('research case %s has no active main supervisor', rc.id)
    FROM research_cases rc
    WHERE rc.researcher_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM research_assignments ra
      WHERE ra.research_case_id = rc.id AND ra.role = 'MAIN_SUPERVISOR' AND ra.is_active = true
    )
    UNION ALL
    SELECT format('approved applicant %s has no initial supervisor', id)
    FROM applicants WHERE status = 'APPROVED' AND initial_supervisor_id IS NULL
    UNION ALL
    SELECT format('approved applicant %s has no account or matching active supervisor assignment', a.id)
    FROM applicants a LEFT JOIN users u ON u.applicant_id = a.id
    WHERE a.status = 'APPROVED' AND (u.id IS NULL OR NOT EXISTS (
      SELECT 1 FROM scientific_supervisor_assignments s
      WHERE s.user_id = u.id AND s.supervisor_id = a.initial_supervisor_id AND s.revoked_at IS NULL
    ))
    UNION ALL
    SELECT format('non-approved applicant %s has a linked account %s', a.id, u.id)
    FROM applicants a JOIN users u ON u.applicant_id = a.id WHERE a.status <> 'APPROVED'
    UNION ALL
    SELECT format('applicant %s refers to missing supervisor %s', a.id, a.initial_supervisor_id)
    FROM applicants a LEFT JOIN users s ON s.id = a.initial_supervisor_id
    WHERE a.initial_supervisor_id IS NOT NULL AND s.id IS NULL
  ) legacy_issues;

  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION 'D-09 migration stopped: legacy supervisor/admission data needs review.'
      USING ERRCODE = '23514', DETAIL = conflicts,
      HINT = 'Run packages/database/scripts/audit-supervisor-consistency.sql, resolve each row without deleting history, then retry.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "scientific_supervisor_assignments_user_id_key"
  ON "scientific_supervisor_assignments"("user_id");

CREATE UNIQUE INDEX IF NOT EXISTS "research_assignments_one_active_main_per_case_key"
  ON "research_assignments"("research_case_id")
  WHERE "role" = 'MAIN_SUPERVISOR' AND "is_active" = true;

ALTER TABLE "applicants"
  DROP CONSTRAINT IF EXISTS "applicants_initial_supervisor_id_fkey";
ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_initial_supervisor_id_fkey"
  FOREIGN KEY ("initial_supervisor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION enforce_lifetime_supervisor_assignment() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE u.id = NEW.supervisor_id AND u.is_active = true AND r.name = 'SCIENTIFIC_SUPERVISOR'
  ) THEN
    RAISE EXCEPTION 'D-09: supervisor must have an active scientific-supervisor role'
      USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM scientific_supervisor_assignments s
    WHERE s.user_id = NEW.user_id AND s.supervisor_id <> NEW.supervisor_id
  ) THEN
    RAISE EXCEPTION 'D-09: a person cannot receive a different lifetime supervisor'
      USING ERRCODE = '23505', CONSTRAINT = 'scientific_supervisor_assignments_user_id_key';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "scientific_supervisor_assignments_lifetime_guard" ON "scientific_supervisor_assignments";
CREATE TRIGGER "scientific_supervisor_assignments_lifetime_guard"
  BEFORE INSERT OR UPDATE OF "user_id", "supervisor_id"
  ON "scientific_supervisor_assignments"
  FOR EACH ROW EXECUTE FUNCTION enforce_lifetime_supervisor_assignment();

CREATE OR REPLACE FUNCTION enforce_research_supervisor_matches_owner() RETURNS trigger AS $$
DECLARE owner_id text;
BEGIN
  IF NEW.role = 'COLLABORATOR_SUPERVISOR' THEN
    RAISE EXCEPTION 'D-09: collaborator scientific supervisors are not supported'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.role = 'MAIN_SUPERVISOR' AND NEW.is_active = true THEN
    SELECT researcher_id INTO owner_id FROM research_cases WHERE id = NEW.research_case_id;
    IF owner_id IS NULL THEN
      RAISE EXCEPTION 'D-09: a research case must have a researcher before supervisor assignment'
        USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM scientific_supervisor_assignments s
      WHERE s.user_id = owner_id AND s.supervisor_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'D-09: research supervisor must match the researcher''s lifetime supervisor'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "research_assignments_owner_supervisor_guard" ON "research_assignments";
CREATE TRIGGER "research_assignments_owner_supervisor_guard"
  BEFORE INSERT OR UPDATE OF "research_case_id", "user_id", "role", "is_active"
  ON "research_assignments"
  FOR EACH ROW EXECUTE FUNCTION enforce_research_supervisor_matches_owner();

-- A case must retain exactly one active main supervisor matching its owner at
-- transaction commit. Deferral lets the application create a case and its
-- initial assignment together inside the existing unit of work.
CREATE OR REPLACE FUNCTION assert_research_case_supervisor_invariant(target_case_id text) RETURNS void AS $$
DECLARE
  owner_id text;
  active_main_count integer;
  active_main_user_id text;
BEGIN
  SELECT researcher_id INTO owner_id FROM research_cases WHERE id = target_case_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'D-09: research case must have a researcher owner'
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*), min(user_id) INTO active_main_count, active_main_user_id
  FROM research_assignments
  WHERE research_case_id = target_case_id AND role = 'MAIN_SUPERVISOR' AND is_active = true;
  IF active_main_count <> 1 THEN
    RAISE EXCEPTION 'D-09: research case must have exactly one active main supervisor'
      USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM scientific_supervisor_assignments s
    WHERE s.user_id = owner_id AND s.supervisor_id = active_main_user_id
  ) THEN
    RAISE EXCEPTION 'D-09: active main supervisor must match the owner lifetime supervisor'
      USING ERRCODE = '23514';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_research_case_supervisor_invariant_trigger() RETURNS trigger AS $$
DECLARE target_case_id text;
BEGIN
  IF TG_TABLE_NAME = 'research_cases' THEN
    target_case_id := COALESCE(NEW.id, OLD.id);
  ELSE
    target_case_id := COALESCE(NEW.research_case_id, OLD.research_case_id);
  END IF;
  PERFORM assert_research_case_supervisor_invariant(target_case_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "research_cases_supervisor_invariant" ON research_cases;
CREATE CONSTRAINT TRIGGER "research_cases_supervisor_invariant"
  AFTER INSERT OR UPDATE OR DELETE ON research_cases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_research_case_supervisor_invariant_trigger();

DROP TRIGGER IF EXISTS "research_assignments_supervisor_invariant" ON research_assignments;
CREATE CONSTRAINT TRIGGER "research_assignments_supervisor_invariant"
  AFTER INSERT OR UPDATE OR DELETE ON research_assignments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION check_research_case_supervisor_invariant_trigger();
COMMIT;
