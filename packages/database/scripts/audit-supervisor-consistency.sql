-- Read-only pre-migration inventory for the proposed lifetime supervisor rule.
-- Run with: psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f packages/database/scripts/audit-supervisor-consistency.sql
-- Output contains internal identifiers only; protect it as operational data.
BEGIN TRANSACTION READ ONLY;

-- More than one historical supervisor, including revoked assignments.
SELECT 'multiple_historical_supervisors' AS issue, user_id AS entity_id,
       count(DISTINCT supervisor_id) AS related_count
FROM scientific_supervisor_assignments
GROUP BY user_id HAVING count(DISTINCT supervisor_id) > 1;

-- Preserve inactive collaborators too: historical research decisions can refer to them.
SELECT 'research_collaborator' AS issue, research_case_id AS entity_id,
       user_id AS related_id, is_active
FROM research_assignments WHERE role = 'COLLABORATOR_SUPERVISOR';

-- More than one active main record for the same case.
SELECT 'multiple_active_main_supervisors' AS issue, research_case_id AS entity_id,
       count(*) AS related_count
FROM research_assignments
WHERE role = 'MAIN_SUPERVISOR' AND is_active
GROUP BY research_case_id HAVING count(*) > 1;

-- Ownerless research cases and cases without an active main supervisor stop
-- the D-09 migration so their scientific history is reviewed explicitly.
SELECT 'research_case_owner_missing' AS issue, id AS entity_id
FROM research_cases WHERE researcher_id IS NULL;

SELECT 'research_case_main_supervisor_missing' AS issue, rc.id AS entity_id,
       rc.researcher_id AS owner_id
FROM research_cases rc
WHERE rc.researcher_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM research_assignments ra
  WHERE ra.research_case_id = rc.id AND ra.role = 'MAIN_SUPERVISOR' AND ra.is_active
);

-- Main supervisor differs from every historical user-level assignment, or no
-- user-level assignment exists. Cases without a researcher need manual review.
SELECT 'research_supervisor_mismatch' AS issue, rc.id AS entity_id,
       rc.researcher_id AS owner_id, ra.user_id AS supervisor_id, ra.is_active
FROM research_cases rc
JOIN research_assignments ra ON ra.research_case_id = rc.id AND ra.role = 'MAIN_SUPERVISOR'
WHERE rc.researcher_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM scientific_supervisor_assignments s
  WHERE s.user_id = rc.researcher_id AND s.supervisor_id = ra.user_id
);

-- Applicant pointers that cannot be retained by the new foreign key.
SELECT 'applicant_missing_supervisor' AS issue, a.id AS entity_id,
       a.initial_supervisor_id AS related_id
FROM applicants a
LEFT JOIN users supervisor ON supervisor.id = a.initial_supervisor_id
WHERE a.initial_supervisor_id IS NOT NULL AND supervisor.id IS NULL;

-- Approved admissions must have both an account and matching active assignment.
SELECT 'approved_applicant_incomplete' AS issue, a.id AS entity_id, u.id AS user_id
FROM applicants a LEFT JOIN users u ON u.applicant_id = a.id
WHERE a.status = 'APPROVED' AND (
  a.initial_supervisor_id IS NULL OR u.id IS NULL OR NOT EXISTS (
    SELECT 1 FROM scientific_supervisor_assignments s
    WHERE s.user_id = u.id AND s.supervisor_id = a.initial_supervisor_id AND s.revoked_at IS NULL
  )
);

-- Accounts linked to a non-approved applicant violate the admission boundary.
SELECT 'account_before_approval' AS issue, a.id AS entity_id, u.id AS user_id,
       a.status
FROM applicants a JOIN users u ON u.applicant_id = a.id
WHERE a.status <> 'APPROVED';

-- Existing assignments to inactive or no-longer-authorized supervisors.
SELECT 'inactive_or_invalid_supervisor' AS issue, s.user_id AS entity_id,
       s.supervisor_id AS related_id
FROM scientific_supervisor_assignments s
LEFT JOIN users supervisor ON supervisor.id = s.supervisor_id
WHERE s.revoked_at IS NULL AND (
  supervisor.id IS NULL OR NOT supervisor.is_active OR NOT EXISTS (
    SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = s.supervisor_id AND r.name = 'SCIENTIFIC_SUPERVISOR'
  )
);

COMMIT;
