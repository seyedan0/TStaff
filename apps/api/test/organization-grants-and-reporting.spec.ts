import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { HttpStatus, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { IRAN_PROVINCES } from "@tstaff/contracts";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { ORGANIZATION_REPOSITORY } from "../src/modules/organization/application/ports/organization.repository.port.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { AUDIT_REPOSITORY } from "../src/modules/audit/application/audit.service.js";
import { REPORTING_REPOSITORY } from "../src/modules/reporting/application/reporting.service.js";
import { TRANSACTION_RUNNER } from "../src/platform/transactions/transaction-runner.js";
import { User } from "../src/modules/identity/domain/user.entity.js";
import type { AuditEvent } from "../src/modules/audit/domain/audit-event.entity.js";

const trackingId = "e0000000-0000-4000-8000-000000000001";
const adminId = "e0000000-0000-4000-8000-000000000002";
const supId = "e0000000-0000-4000-8000-000000000003";
const provId = "e0000000-0000-4000-8000-000000000004";
const provEmptyId = "e0000000-0000-4000-8000-000000000005";
const internId = "e0000000-0000-4000-8000-000000000006";

const tehranProvinceId = IRAN_PROVINCES[7]!.id;
const isfahanProvinceId = IRAN_PROVINCES[3]!.id;

describe("Organization User Grants, Provincial Scopes & Reporting Boundaries", () => {
  let app: INestApplication;
  const users = new Map<string, User>();
  const auditEvents: AuditEvent[] = [];
  let scopeRows: Array<{ id: string; managerId: string; provinceId: string; assignedById: string; assignedAt: Date; revokedAt: Date | null }> = [];
  let grantRows: Array<{ id: string; managerId: string; userId: string; assignedById: string; assignedAt: Date; revokedAt: Date | null }> = [];

  beforeEach(() => {
    auditEvents.length = 0;
    scopeRows = [
      { id: "sc-1", managerId: provId, provinceId: tehranProvinceId, assignedById: trackingId, assignedAt: new Date(), revokedAt: null },
    ];
    grantRows = [];
  });

  beforeAll(async () => {
    const now = new Date();
    const mk = (id: string, phoneNumber: string, role: string, fullName: string) =>
      User.reconstitute({ id, phoneNumber, fullName, stage: "INTERN", role, roles: [role], isActive: true, isMfaEnabled: false, createdAt: now, updatedAt: now });
    users.set(trackingId, mk(trackingId, "09120001001", "TRACKING_DIRECTOR", "مدیر پیگیری"));
    users.set(adminId, mk(adminId, "09120001002", "SYSTEM_ADMIN", "مدیر سامانه"));
    users.set(supId, mk(supId, "09120001003", "SCIENTIFIC_SUPERVISOR", "مدیر علمی"));
    users.set(provId, mk(provId, "09120001004", "PROVINCIAL_DIRECTOR", "مدیر استان تهران"));
    users.set(provEmptyId, mk(provEmptyId, "09120001005", "PROVINCIAL_DIRECTOR", "مدیر بدون قلمرو"));
    users.set(internId, mk(internId, "09120001006", "INTERN", "کارورز پژوهش"));

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TRANSACTION_RUNNER).useValue({ run: async <T>(op: () => Promise<T>) => op() })
      .overrideProvider(USER_REPOSITORY).useValue({
        findById: async (id: string) => users.get(id) ?? null,
        findByPhoneNumber: async (p: string) => [...users.values()].find((u) => u.phoneNumber === p) ?? null,
        findByApplicantId: async () => null,
        save: async (u: User) => { users.set(u.id, u); },
      })
      .overrideProvider(AUDIT_REPOSITORY).useValue({
        save: async (ev: AuditEvent) => { auditEvents.push(ev); },
        findById: async () => null,
        findMany: async () => auditEvents,
      })
      .overrideProvider(ORGANIZATION_REPOSITORY).useValue({
        provinces: async () => [...IRAN_PROVINCES],
        provinceIds: async (managerId: string) => scopeRows.filter((s) => s.managerId === managerId && !s.revokedAt).map((s) => s.provinceId),
        hasUserGrant: async (managerId: string, userId: string) => grantRows.some((g) => g.managerId === managerId && g.userId === userId && !g.revokedAt),
        scopes: async (managerId?: string) => scopeRows.filter((s) => !managerId || s.managerId === managerId),
        userGrants: async (managerId?: string) => grantRows.filter((g) => !g.revokedAt && (!managerId || g.managerId === managerId)),
        setProvinceScope: async (managerId: string, provinceId: string, actorId: string, active: boolean) => {
          const existing = scopeRows.find((s) => s.managerId === managerId && s.provinceId === provinceId);
          if (existing) {
            existing.revokedAt = active ? null : new Date();
            existing.assignedById = actorId;
          } else {
            scopeRows.push({ id: crypto.randomUUID(), managerId, provinceId, assignedById: actorId, assignedAt: new Date(), revokedAt: active ? null : new Date() });
          }
        },
        setUserGrant: async (managerId: string, userId: string, actorId: string, active: boolean) => {
          const existing = grantRows.find((g) => g.managerId === managerId && g.userId === userId);
          if (existing) {
            existing.revokedAt = active ? null : new Date();
            existing.assignedById = actorId;
          } else {
            grantRows.push({ id: crypto.randomUUID(), managerId, userId, assignedById: actorId, assignedAt: new Date(), revokedAt: active ? null : new Date() });
          }
        },
      })
      .overrideProvider(REPORTING_REPOSITORY).useValue({
        getProvincialDirectorMetrics: async (provinceId?: string) => ({
          provinceId,
          totalApplicants: 12,
          approvedApplicants: 5,
          totalApprentices: 3,
          totalInterns: 4,
          activeResearchCases: provinceId === tehranProvinceId ? 2 : 9,
        }),
        getSupervisorWorklist: async (supervisorId: string) => ({ supervisorId, pendingStageSubmissions: 0, pendingScenarioReviews: 0, totalSupervisedCases: 0, items: [] }),
        getTrackingDirectorBacklog: async () => ({ delayedCasesCount: 0, reviewRequiredCasesCount: 0, unassignedCasesCount: 0, backlogItems: [] }),
        getGeneralDirectorSummary: async () => ({ totalUsers: 6, totalApplicants: 12, totalResearchCases: 4, casesByStage: {}, completedScenariosCount: 0, activeSupervisorsCount: 1 }),
        getWorkflowMetrics: async () => ({ averageStageCompletionDays: {}, rollbackFrequencyByStage: {} }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it("enforces RBAC on user grants lifecycle and audits assign/revoke", async () => {
    const server = app.getHttpServer();

    const deniedList = await request(server).get("/organization/user-grants")
      .set("x-user-id", supId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(deniedList.status).toBe(HttpStatus.FORBIDDEN);

    const deniedGrant = await request(server).post("/organization/user-grants")
      .set("x-user-id", provId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR")
      .send({ managerId: provId, userId: internId });
    expect(deniedGrant.status).toBe(HttpStatus.FORBIDDEN);

    const created = await request(server).post("/organization/user-grants")
      .set("x-user-id", trackingId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ managerId: supId, userId: internId });
    expect(created.status).toBe(HttpStatus.CREATED);

    const adminRead = await request(server).get("/organization/user-grants")
      .set("x-user-id", adminId).set("x-user-stage", "INTERN").set("x-user-role", "SYSTEM_ADMIN");
    expect(adminRead.status).toBe(HttpStatus.OK);
    expect(adminRead.body).toHaveLength(1);
    expect(adminRead.body[0].managerId).toBe(supId);
    expect(adminRead.body[0].userId).toBe(internId);

    const revoked = await request(server).delete(`/organization/user-grants/${supId}/${internId}`)
      .set("x-user-id", trackingId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(revoked.status).toBe(HttpStatus.OK);

    const afterRevoke = await request(server).get("/organization/user-grants")
      .set("x-user-id", trackingId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(afterRevoke.body).toHaveLength(0);
    expect(auditEvents.map((e) => e.action)).toEqual(["USER_GRANT_ASSIGNED", "USER_GRANT_REVOKED"]);
  });

  it("enforces provincial scope validation and reporting province boundaries (FR-026, AT-09)", async () => {
    const server = app.getHttpServer();

    const invalidProvince = await request(server).post("/organization/provincial-scopes")
      .set("x-user-id", trackingId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ managerId: provId, provinceId: "00000000-0000-4000-8000-000000000000" });
    expect(invalidProvince.status).toBe(HttpStatus.BAD_REQUEST);

    const provScopes = await request(server).get("/organization/scopes")
      .set("x-user-id", provId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(provScopes.status).toBe(HttpStatus.OK);
    expect(provScopes.body).toHaveLength(1);

    const forbiddenProvReport = await request(server).get(`/reporting/provincial-director?provinceId=${isfahanProvinceId}`)
      .set("x-user-id", provId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(forbiddenProvReport.status).toBe(HttpStatus.FORBIDDEN);

    const ownProvReport = await request(server).get("/reporting/provincial-director")
      .set("x-user-id", provId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(ownProvReport.status).toBe(HttpStatus.OK);
    expect(ownProvReport.body.provinceId).toBe(tehranProvinceId);
    expect(ownProvReport.body.activeResearchCases).toBe(2);

    const emptyProvReport = await request(server).get("/reporting/provincial-director")
      .set("x-user-id", provEmptyId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(emptyProvReport.status).toBe(HttpStatus.OK);
    expect(emptyProvReport.body.activeResearchCases).toBe(0);

    const trackingAnyProvince = await request(server).get(`/reporting/provincial-director?provinceId=${isfahanProvinceId}`)
      .set("x-user-id", trackingId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(trackingAnyProvince.status).toBe(HttpStatus.OK);
    expect(trackingAnyProvince.body.activeResearchCases).toBe(9);
  });

  it("blocks supervisor from reading another supervisor's worklist (Negative Authz)", async () => {
    const server = app.getHttpServer();
    const res = await request(server).get(`/reporting/supervisor-worklist?supervisorId=${trackingId}`)
      .set("x-user-id", supId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(res.status).toBe(HttpStatus.FORBIDDEN);
  });
});

