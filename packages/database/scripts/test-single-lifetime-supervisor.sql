-- Reversible PostgreSQL constraint check for D-09 / AT-39.
-- Run only against an isolated test database:
-- docker exec -i tstaff-test-postgres psql -X -v ON_ERROR_STOP=1 -U tstaff_user -d tstaff_dev < packages/database/scripts/test-single-lifetime-supervisor.sql
BEGIN;

INSERT INTO roles (id, name) VALUES
  ('d09-test-role-supervisor', 'SCIENTIFIC_SUPERVISOR'),
  ('d09-test-role-apprentice', 'APPRENTICE')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, phone_number, updated_at, is_active) VALUES
  ('d09-test-supervisor-1', '09000000001', now(), true),
  ('d09-test-supervisor-2', '09000000002', now(), true),
  ('d09-test-supervisor-inactive', '09000000003', now(), false),
  ('d09-test-trainee-1', '09000000004', now(), true),
  ('d09-test-trainee-2', '09000000005', now(), true);

INSERT INTO user_roles (user_id, role_id) VALUES
  ('d09-test-supervisor-1', (SELECT id FROM roles WHERE name = 'SCIENTIFIC_SUPERVISOR')),
  ('d09-test-supervisor-2', (SELECT id FROM roles WHERE name = 'SCIENTIFIC_SUPERVISOR')),
  ('d09-test-supervisor-inactive', (SELECT id FROM roles WHERE name = 'SCIENTIFIC_SUPERVISOR')),
  ('d09-test-trainee-1', (SELECT id FROM roles WHERE name = 'APPRENTICE')),
  ('d09-test-trainee-2', (SELECT id FROM roles WHERE name = 'APPRENTICE'));

INSERT INTO scientific_supervisor_assignments (id, user_id, supervisor_id, assigned_by_id, is_primary)
VALUES
  ('d09-test-user-assignment-1', 'd09-test-trainee-1', 'd09-test-supervisor-1', 'd09-test-supervisor-1', true),
  ('d09-test-user-assignment-2', 'd09-test-trainee-2', 'd09-test-supervisor-2', 'd09-test-supervisor-2', true);

INSERT INTO research_cases (id, title, code, subject, researcher_id, updated_at)
VALUES ('d09-test-case-1', 'D-09 constraint test', 'D09-TEST-1', 'D-09', 'd09-test-trainee-1', now());
INSERT INTO research_assignments (id, research_case_id, user_id, role, is_active)
VALUES ('d09-test-case-assignment-1', 'd09-test-case-1', 'd09-test-supervisor-1', 'MAIN_SUPERVISOR', true);
SET CONSTRAINTS ALL IMMEDIATE;

DO $$
DECLARE rejected boolean;
BEGIN
  rejected := false;
  BEGIN
    INSERT INTO scientific_supervisor_assignments (id, user_id, supervisor_id, assigned_by_id, is_primary)
    VALUES ('d09-test-user-assignment-duplicate', 'd09-test-trainee-1', 'd09-test-supervisor-2', 'd09-test-supervisor-2', true);
  EXCEPTION WHEN unique_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: second lifetime supervisor was accepted'; END IF;

  UPDATE scientific_supervisor_assignments SET revoked_at = now()
  WHERE user_id = 'd09-test-trainee-1' AND supervisor_id = 'd09-test-supervisor-1';
  rejected := false;
  BEGIN
    INSERT INTO scientific_supervisor_assignments (id, user_id, supervisor_id, assigned_by_id, is_primary)
    VALUES ('d09-test-user-assignment-after-revoke', 'd09-test-trainee-1', 'd09-test-supervisor-2', 'd09-test-supervisor-2', true);
  EXCEPTION WHEN unique_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: a revoked assignment allowed supervisor replacement'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO scientific_supervisor_assignments (id, user_id, supervisor_id, assigned_by_id, is_primary)
    VALUES ('d09-test-user-assignment-inactive', 'd09-test-trainee-2', 'd09-test-supervisor-inactive', 'd09-test-supervisor-1', true);
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: inactive supervisor was accepted'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO research_assignments (id, research_case_id, user_id, role, is_active)
    VALUES ('d09-test-case-collaborator', 'd09-test-case-1', 'd09-test-supervisor-1', 'COLLABORATOR_SUPERVISOR', true);
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: collaborator supervisor was accepted'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO research_assignments (id, research_case_id, user_id, role, is_active)
    VALUES ('d09-test-case-mismatch', 'd09-test-case-1', 'd09-test-supervisor-2', 'MAIN_SUPERVISOR', true);
  EXCEPTION WHEN check_violation OR unique_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: mismatched case supervisor was accepted'; END IF;

  rejected := false;
  BEGIN
    UPDATE research_cases SET researcher_id = 'd09-test-trainee-2' WHERE id = 'd09-test-case-1';
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: case owner changed without matching supervisor'; END IF;

  rejected := false;
  BEGIN
    INSERT INTO research_cases (id, title, code, subject, researcher_id, updated_at)
    VALUES ('d09-test-case-no-supervisor', 'D-09 constraint test', 'D09-TEST-2', 'D-09', 'd09-test-trainee-1', now());
  EXCEPTION WHEN check_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'AT-39 failed: a case without an active supervisor was accepted'; END IF;

  RAISE NOTICE 'D-09 PostgreSQL constraint checks passed';
END $$;

ROLLBACK;
