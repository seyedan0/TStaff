import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { IRAN_PROVINCES, provinceNameFromId, type ResourceBankItem, type ResourceBankQuery, type ResearchChangeRequestDto } from "@tstaff/contracts";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { TRANSACTION_RUNNER } from "../src/platform/transactions/transaction-runner.js";
import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { CHANGE_REQUEST_REPOSITORY } from "../src/modules/research/application/ports/change-request.repository.port.js";
import { AUDIT_REPOSITORY } from "../src/modules/audit/application/audit.service.js";
import { NOTIFICATION_REPOSITORY } from "../src/modules/notifications/application/notifications.service.js";
import { ORGANIZATION_REPOSITORY } from "../src/modules/organization/application/ports/organization.repository.port.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { RESOURCE_BANK_REPOSITORY, type BankScope, type ReferralRecord } from "../src/modules/resources/application/ports/resource-bank.repository.port.js";
import { FilesService } from "../src/modules/files/application/files.service.js";
import { Applicant } from "../src/modules/applicants/domain/applicant.entity.js";
import { User } from "../src/modules/identity/domain/user.entity.js";
import { ResearchCase } from "../src/modules/research/domain/research-case.entity.js";
import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
import { CannotRemoveMainSupervisorWithoutReplacementError } from "../src/modules/assignments/domain/assignment-errors.js";
import { AuditEvent } from "../src/modules/audit/domain/audit-event.entity.js";
import { StaleRevisionError } from "../src/modules/research/domain/research-errors.js";

const tehranId = IRAN_PROVINCES[7]!.id;
const isfahanId = IRAN_PROVINCES[3]!.id;

const trackingDirectorId = "a0000000-0000-4000-8000-000000000001";
const tehranDirectorId = "a0000000-0000-4000-8000-000000000002";
const isfahanDirectorId = "a0000000-0000-4000-8000-000000000003";
const supAId = "a0000000-0000-4000-8000-000000000004";
const supBId = "a0000000-0000-4000-8000-000000000005";
const internXId = "a0000000-0000-4000-8000-000000000006";
const internYId = "a0000000-0000-4000-8000-000000000007";

const resTehranId = "b0000000-0000-4000-8000-000000000001";
const resIsfahanId = "b0000000-0000-4000-8000-000000000002";
const resUnmappedId = "b0000000-0000-4000-8000-000000000003";

describe("Workspace, Resource Bank, Change Requests & Directory (Phase B Acceptance)", () => {
  let app: INestApplication;
  const users = new Map<string, User>();
  const applicantDetails = new Map<string, { nationalId: string; age: number; provinceId: string; provinceName: string | null; education: string; fieldOfStudy: string }>();
  const applicants = new Map<string, Applicant>();
  const cases = new Map<string, ResearchCase>();
  let caseAssignments: ResearchAssignment[] = [];
  let userAssignments: Array<{ userId: string; supervisorId: string; assignedById: string; isPrimary: boolean }> = [];
  const changeRequests = new Map<string, ResearchChangeRequestDto>();
  const auditEvents: AuditEvent[] = [];
  const notifications: any[] = [];
  const evaluations = new Map<string, any>();
  const provinceScopes = new Map<string, Set<string>>();
  const referrals: Array<ReferralRecord & { itemId: string; createdAt: string; status: "PENDING" | "CONVERTING" | "CONVERTED" | "REVOKED" }> = [];
  const bankItems: ResourceBankItem[] = [
    {
      id: resTehranId,
      fullName: "علی محمدی",
      age: 42,
      position: "مدیر آموزشگاه",
      organization: {
        name: "دبیرستان نمونه تهران",
        organizationType: "آموزشی",
        educationLevel: "کارشناسی ارشد",
      },
      contactInfo: "09120001111",
      provinceId: tehranId,
      province: provinceNameFromId(tehranId),
      county: "تهران",
      referrals: [],
      createdAt: "2026-11-01T10:00:00.000Z",
    },
    {
      id: resIsfahanId,
      fullName: "علی محمدی",
      age: 38,
      position: "پژوهشگر",
      organization: {
        name: "مرکز پژوهش اصفهان",
        organizationType: "پژوهشی",
        educationLevel: "دکتری",
      },
      contactInfo: "09120001111",
      provinceId: isfahanId,
      province: provinceNameFromId(isfahanId),
      county: "اصفهان",
      referrals: [],
      createdAt: "2026-11-02T10:00:00.000Z",
    },
    {
      id: resUnmappedId,
      fullName: "منبع ثبت‌نشده استانی",
      age: 50,
      position: "کارشناس",
      organization: null,
      contactInfo: "09130002222",
      provinceId: null,
      province: null,
      county: null,
      referrals: [],
      createdAt: "2026-11-03T10:00:00.000Z",
    },
  ];

  let txTail = Promise.resolve();
  const serialTx = async <T>(op: () => Promise<T>): Promise<T> => {
    const prev = txTail;
    let release!: () => void;
    txTail = new Promise<void>((res) => { release = res; });
    await prev;
    try {
      return await op();
    } finally {
      release();
    }
  };

  let case1Id: string;
  let case2Id: string;

  beforeAll(async () => {
    const now = new Date();
    const mkUser = (id: string, fullName: string, phoneNumber: string, role: string) => User.reconstitute({
      id, phoneNumber, fullName, stage: "INTERN", role, roles: [role], isActive: true, isMfaEnabled: false, createdAt: now, updatedAt: now,
    });
    users.set(trackingDirectorId, mkUser(trackingDirectorId, "مدیر پیگیری کشوری", "09121000001", "TRACKING_DIRECTOR"));
    users.set(tehranDirectorId, mkUser(tehranDirectorId, "مدیر استان تهران", "09121000002", "PROVINCIAL_DIRECTOR"));
    users.set(isfahanDirectorId, mkUser(isfahanDirectorId, "مدیر استان اصفهان", "09121000003", "PROVINCIAL_DIRECTOR"));
    users.set(supAId, mkUser(supAId, "استاد اصلی الف", "09121000004", "SCIENTIFIC_SUPERVISOR"));
    users.set(supBId, mkUser(supBId, "استاد همکار ب", "09121000005", "SCIENTIFIC_SUPERVISOR"));
    users.set(internXId, mkUser(internXId, "پژوهشگر ایکس", "09121000006", "INTERN"));
    users.set(internYId, mkUser(internYId, "پژوهشگر وای", "09121000007", "INTERN"));

    applicantDetails.set(internXId, {
      nationalId: "0011223344",
      age: 29,
      provinceId: tehranId,
      provinceName: provinceNameFromId(tehranId),
      education: "دکتری",
      fieldOfStudy: "فلسفه تعلیم و تربیت",
    });
    applicantDetails.set(internYId, {
      nationalId: "0099887766",
      age: 26,
      provinceId: tehranId,
      provinceName: provinceNameFromId(tehranId),
      education: "کارشناسی ارشد",
      fieldOfStudy: "مدیریت آموزشی",
    });

    provinceScopes.set(tehranDirectorId, new Set([tehranId]));
    provinceScopes.set(isfahanDirectorId, new Set([isfahanId]));

    evaluations.set("eval-y", {
      id: "eval-y",
      userId: internYId,
      userFullName: "پژوهشگر وای",
      userPhone: "09121000007",
      supervisorId: null,
      status: "PENDING",
      notes: "درخواست قدیمی‌تر",
      feedback: null,
      completedDocuments: [],
      createdAt: new Date("2026-10-01T08:00:00.000Z"),
      updatedAt: new Date("2026-10-01T08:00:00.000Z"),
    });

    userAssignments.push(
      { userId: internXId, supervisorId: supAId, assignedById: trackingDirectorId, isPrimary: true },
      { userId: internYId, supervisorId: supAId, assignedById: trackingDirectorId, isPrimary: true },
    );

    const c1 = ResearchCase.create({ id: "c0000000-0000-4000-8000-000000000001", title: "پژوهش نخست ایکس", code: "CASE-WB-1", subject: "موضوع ۱", researcherId: internXId });
    const c2base = ResearchCase.create({ id: "c0000000-0000-4000-8000-000000000002", title: "پژوهش دوم ایکس", code: "CASE-WB-2", subject: "موضوع ۲", researcherId: internXId });
    const c2SubmittedSources = c2base.submitStageForReview("SOURCES", 1);
    const c2ApprovedSources = c2SubmittedSources.applyReviewDecision("SOURCES", "APPROVED", 2);
    const c2SubmittedExpl = c2ApprovedSources.submitStageForReview("EXPLANATION", 3);
    const c2ApprovedExpl = c2SubmittedExpl.applyReviewDecision("EXPLANATION", "APPROVED", 4);
    cases.set(c1.id, c1);
    cases.set(c2ApprovedExpl.id, c2ApprovedExpl);
    case1Id = c1.id;
    case2Id = c2ApprovedExpl.id;

    caseAssignments.push(
      ResearchAssignment.create({ id: "ca-1", researchCaseId: case1Id, userId: supAId, role: "MAIN_SUPERVISOR" }),
      ResearchAssignment.create({ id: "ca-2", researchCaseId: case2Id, userId: supAId, role: "MAIN_SUPERVISOR" }),
      ResearchAssignment.create({ id: "ca-3", researchCaseId: case2Id, userId: supBId, role: "COLLABORATOR_SUPERVISOR" }),
    );

    auditEvents.push(
      AuditEvent.create({ aggregateType: "User", aggregateId: internXId, action: "SCIENTIFIC_SUPERVISOR_ASSIGNED", actorId: trackingDirectorId, payload: { supervisorId: supAId } }),
      AuditEvent.create({ aggregateType: "ResearchCase", aggregateId: case1Id, action: "CASE_SUPERVISOR_ASSIGNED", actorId: trackingDirectorId, payload: { supervisorId: supAId } }),
      AuditEvent.create({ aggregateType: "ResearchCase", aggregateId: case2Id, action: "STAGE_REVIEW_DECIDED", actorId: supAId, payload: { stageType: "EXPLANATION", decision: "APPROVED" } }),
    );

    const canSeeBank = (item: ResourceBankItem, scope: BankScope) => {
      if (scope.nationwide) return true;
      if (item.provinceId && scope.provinceIds.includes(item.provinceId)) return true;
      return referrals.some((r) => r.resourceId === item.id && r.recipientId === scope.actorId && !r.revokedAt);
    };
    const toBankItem = (item: ResourceBankItem, scope: BankScope): ResourceBankItem => {
      const visibleReferrals = referrals
        .filter((r) => r.resourceId === item.id && !r.revokedAt && (scope.nationwide || r.recipientId === scope.actorId))
        .map(({ id, recipientId, status, applicantId, createdAt }) => ({ id, recipientId, status, applicantId, createdAt }));
      return {
        ...item,
        referrals: visibleReferrals,
      };
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TRANSACTION_RUNNER).useValue({ run: serialTx })
      .overrideProvider(USER_REPOSITORY).useValue({
        findById: async (id: string) => users.get(id) ?? null,
        findByPhoneNumber: async (p: string) => [...users.values()].find((u) => u.phoneNumber === p) ?? null,
        findByApplicantId: async (appId: string) => [...users.values()].find((u) => u.applicantId === appId) ?? null,
        findProvinceIdByUserId: async (id: string) => applicantDetails.get(id)?.provinceId ?? null,
        findApplicantDetailsByUserId: async (id: string) => applicantDetails.get(id) ?? null,
        findAllManagers: async () => [...users.values()].filter((u) => !["INTERN", "APPRENTICE"].includes(u.role ?? "")),
        findAllInterns: async () => [...users.values()].filter((u) => u.role === "INTERN"),
        findAllDirectoryUsers: async () => [...users.values()].map((u) => {
          const j = u.toJSON();
          return {
            id: j.id, fullName: j.fullName ?? "کاربر", phoneNumber: j.phoneNumber, stage: j.stage,
            role: (j.role ?? j.stage) as any, roles: (j.roles?.length ? j.roles : [j.stage]) as any,
            isActive: j.isActive, provinceId: applicantDetails.get(j.id)?.provinceId ?? null, createdAt: j.createdAt.toISOString(),
          };
        }),
        save: async (u: User) => { users.set(u.id, u); },
        getPendingStudyEvaluations: async () => [...evaluations.values()].filter((e) => e.status === "PENDING"),
        getStudyEvaluationByUserId: async (userId: string) => [...evaluations.values()].find((e) => e.userId === userId) ?? null,
        createStudyEvaluation: async () => ({}),
        decideStudyEvaluation: async () => ({}),
        createSupportTicket: async () => ({}),
        getAllSupportTickets: async () => [],
        resolveSupportTicket: async () => ({}),
      })
      .overrideProvider(APPLICANT_REPOSITORY).useValue({
        findById: async (id: string) => applicants.get(id) ?? null,
        findByPhoneNumber: async (p: string) => [...applicants.values()].find((a) => a.phoneNumber === p) ?? null,
        findByNationalId: async (nid: string) => [...applicants.values()].find((a) => a.nationalId === nid) ?? null,
        save: async (a: Applicant) => { applicants.set(a.id, a); },
        findAll: async () => [...applicants.values()],
      })
      .overrideProvider(RESEARCH_REPOSITORY).useValue({
        create: async (c: ResearchCase) => { cases.set(c.id, c); },
        findById: async (id: string) => cases.get(id) ?? null,
        findByCode: async (code: string) => [...cases.values()].find((c) => c.code === code) ?? null,
        findAll: async () => [...cases.values()],
        saveWithVersionCheck: async (c: ResearchCase, expectedVersion: number) => {
          const cur = cases.get(c.id);
          if (!cur || cur.version !== expectedVersion) throw new StaleRevisionError(cur?.version ?? 0, expectedVersion);
          cases.set(c.id, c);
        },
        findStageInstanceById: async () => null,
      })
      .overrideProvider(ASSIGNMENT_REPOSITORY).useValue({
        findActiveByCaseId: async (cId: string) => caseAssignments.filter((a) => a.researchCaseId === cId && a.isActive),
        countActiveByUserId: async (uId: string) => caseAssignments.filter((a) => a.userId === uId && a.isActive).length,
        findById: async (id: string) => caseAssignments.find((a) => a.id === id) ?? null,
        save: async (a: ResearchAssignment) => {
          const idx = caseAssignments.findIndex((x) => x.id === a.id);
          if (idx >= 0) caseAssignments[idx] = a; else caseAssignments.push(a);
        },
        isScientificSupervisor: async (id: string) => id === supAId || id === supBId,
        isIntern: async (id: string) => id === internXId || id === internYId,
        assignToUser: async (input: { userId: string; supervisorId: string; assignedById: string }) => {
          if (!userAssignments.some((x) => x.userId === input.userId && x.supervisorId === input.supervisorId)) {
            userAssignments.push({ ...input, isPrimary: !userAssignments.some((x) => x.userId === input.userId) });
          }
        },
        listSupervisorsForUser: async (uId: string) => userAssignments.filter((x) => x.userId === uId).map((x) => ({
          id: `${x.userId}:${x.supervisorId}`, ...x, supervisorName: users.get(x.supervisorId)?.fullName ?? "مدیر علمی", phoneNumber: "09121000004", assignedAt: new Date(),
        })),
        listUsersForSupervisor: async (sId: string) => userAssignments.filter((x) => x.supervisorId === sId).map((x) => ({
          id: x.userId, fullName: users.get(x.userId)?.fullName ?? "پژوهشگر", stage: "INTERN", phoneNumber: users.get(x.userId)?.phoneNumber ?? "",
        })),
        isSupervisorAssignedToUser: async (uId: string, sId: string) => userAssignments.some((x) => x.userId === uId && x.supervisorId === sId),
        isSupervisorAssignedToCase: async (cId: string, sId: string) => caseAssignments.some((a) => a.researchCaseId === cId && a.userId === sId && a.isActive),
        getCaseIdsForSupervisor: async (sId: string) => caseAssignments.filter((a) => a.userId === sId && a.isActive).map((a) => a.researchCaseId),
        listCaseSupervisors: async (cId: string) => caseAssignments.filter((a) => a.researchCaseId === cId && a.isActive).map((a) => ({
          id: a.id, researchCaseId: a.researchCaseId, userId: a.userId, fullName: users.get(a.userId)?.fullName ?? "مدیر علمی",
          phoneNumber: users.get(a.userId)?.phoneNumber ?? "", role: a.role, isActive: a.isActive, assignedAt: a.assignedAt,
        })),
        assignToCase: async (input: { researchCaseId: string; userId: string; role: "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR" }) => {
          const active = caseAssignments.filter((a) => a.researchCaseId === input.researchCaseId && a.isActive);
          ResearchAssignment.validateCanAssign(input.role, active);
          caseAssignments.push(ResearchAssignment.create({ id: crypto.randomUUID(), ...input }));
        },
        replaceMainSupervisorOnCase: async (cId: string, sId: string) => {
          caseAssignments = caseAssignments.map((a) => a.researchCaseId === cId && a.isActive && (a.role === "MAIN_SUPERVISOR" || a.userId === sId) ? a.deactivate() : a);
          caseAssignments.push(ResearchAssignment.create({ id: crypto.randomUUID(), researchCaseId: cId, userId: sId, role: "MAIN_SUPERVISOR" }));
        },
        revokeFromUser: async (uId: string, sId: string) => {
          userAssignments = userAssignments.filter((x) => !(x.userId === uId && x.supervisorId === sId));
        },
        revokeFromCase: async (cId: string, sId: string) => {
          const active = caseAssignments.find((a) => a.researchCaseId === cId && a.userId === sId && a.isActive);
          if (active?.role === "MAIN_SUPERVISOR") throw new CannotRemoveMainSupervisorWithoutReplacementError();
          caseAssignments = caseAssignments.map((a) => a.researchCaseId === cId && a.userId === sId && a.isActive ? a.deactivate() : a);
        },
      })
      .overrideProvider(CHANGE_REQUEST_REPOSITORY).useValue({
        create: async (item: ResearchChangeRequestDto) => { changeRequests.set(item.id, item); },
        get: async (id: string) => changeRequests.get(id) ?? null,
        list: async (cId: string) => [...changeRequests.values()].filter((r) => r.researchCaseId === cId),
        decide: async (item: ResearchChangeRequestDto, expectedVersion: number) => {
          const cur = changeRequests.get(item.id);
          if (!cur || cur.version !== expectedVersion || cur.status !== "PENDING") throw new StaleRevisionError(cur?.version ?? 0, expectedVersion);
          changeRequests.set(item.id, item);
        },
      })
      .overrideProvider(AUDIT_REPOSITORY).useValue({
        save: async (ev: AuditEvent) => { auditEvents.push(ev); },
        findById: async (id: string) => auditEvents.find((e) => e.id === id) ?? null,
        findMany: async (filter: any) => auditEvents.filter((e) =>
          (!filter.aggregateType || e.aggregateType === filter.aggregateType) &&
          (!filter.aggregateId || e.aggregateId === filter.aggregateId),
        ),
      })
      .overrideProvider(NOTIFICATION_REPOSITORY).useValue({
        save: async (n: any) => { notifications.push(n); },
        findById: async () => null,
        findByUserId: async () => [],
        countUnread: async () => 0,
      })
      .overrideProvider(ORGANIZATION_REPOSITORY).useValue({
        provinces: async () => [...IRAN_PROVINCES],
        provinceIds: async (mId: string) => [...(provinceScopes.get(mId) ?? [])],
        hasUserGrant: async () => false,
        scopes: async () => [],
        setProvinceScope: async (mId: string, pId: string, _actor: string, active: boolean) => {
          const set = provinceScopes.get(mId) ?? new Set<string>();
          if (active) set.add(pId); else set.delete(pId);
          provinceScopes.set(mId, set);
        },
        setUserGrant: async () => {},
      })
      .overrideProvider(RESOURCE_REPOSITORY).useValue({
        findFileCaseIds: async () => [],
        findResourceById: async () => null,
        findResourcesByCaseId: async () => [],
        createResource: async () => {},
        saveResource: async () => {},
        createInterview: async () => {},
        saveInterview: async () => {},
        findInterviewByResourceId: async () => null,
        findInterviewById: async () => null,
        createReport: async () => {},
        findReportsByInterviewId: async () => [],
      })
      .overrideProvider(RESOURCE_BANK_REPOSITORY).useValue({
        list: async (scope: BankScope, query: ResourceBankQuery) => {
          const filtered = bankItems.filter((item) => canSeeBank(item, scope) && (!query.provinceId || item.provinceId === query.provinceId));
          return { items: filtered.map((item) => toBankItem(item, scope)), total: filtered.length };
        },
        find: async (id: string, scope: BankScope) => {
          const item = bankItems.find((b) => b.id === id);
          return item && canSeeBank(item, scope) ? toBankItem(item, scope) : null;
        },
        findReferral: async (resourceId: string, recipientId: string) => referrals.find((r) => r.resourceId === resourceId && r.recipientId === recipientId) ?? null,
        hasActiveConversion: async (resourceId: string) => {
          const r = referrals.find((x) => x.resourceId === resourceId && !x.revokedAt && (x.status === "CONVERTED" || x.status === "CONVERTING"));
          return r ? { referralId: r.id, applicantId: r.applicantId } : null;
        },
        refer: async (resourceId: string, recipientId: string) => {
          const existing = referrals.find((r) => r.resourceId === resourceId && r.recipientId === recipientId);
          if (existing) return existing;
          const record = { id: crypto.randomUUID(), resourceId, itemId: resourceId, recipientId, status: "PENDING" as const, applicantId: null, revokedAt: null, createdAt: new Date().toISOString() };
          referrals.push(record);
          return record;
        },
        referral: async (id: string) => referrals.find((r) => r.id === id) ?? null,
        revoke: async (id: string) => {
          const r = referrals.find((x) => x.id === id);
          if (r) { r.revokedAt = new Date(); r.status = "REVOKED"; }
        },
        claimConversion: async (id: string) => {
          const r = referrals.find((x) => x.id === id);
          if (!r || r.revokedAt || r.status !== "PENDING") return false;
          r.status = "CONVERTING";
          return true;
        },
        completeConversion: async (id: string, applicantId: string) => {
          const r = referrals.find((x) => x.id === id);
          if (r) { r.applicantId = applicantId; r.status = "CONVERTED"; }
        },
        hasApplicantReferral: async (recipientId: string, applicantId: string) => referrals.some((r) => r.recipientId === recipientId && r.applicantId === applicantId && !r.revokedAt),
      })
      .overrideProvider(FilesService).useValue({ assertReadyForUse: async () => {}, isAvailable: async () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it("deduplicates and prioritizes supervisor workspace and isolates profile vs case-only access", async () => {
    const server = app.getHttpServer();
    // SupA sees 2 unique users sorted by pending-first, oldest-pending-first (internY has eval-y from Oct)
    const listA = await request(server).get("/scientific-supervisors/me/workspace")
      .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(listA.status).toBe(HttpStatus.OK);
    expect(listA.body.users.map((u: any) => u.id)).toEqual([internYId, internXId]);

    // User-level assigned supA gets full personal profile + both cases + User & ResearchCase audit events with actorName
    const detailA = await request(server).get(`/scientific-supervisors/me/trainees/${internXId}`)
      .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(detailA.status).toBe(HttpStatus.OK);
    expect(detailA.body.nationalId).toBe("0011223344");
    expect(detailA.body.canCreateResearch).toBe(true);
    expect(detailA.body.cases).toHaveLength(2);
    expect(detailA.body.history.some((h: any) => h.aggregateType === "User" && h.actorName === "مدیر پیگیری کشوری")).toBe(true);
    expect(detailA.body.history.some((h: any) => h.aggregateType === "ResearchCase" && h.aggregateId === case1Id)).toBe(true);

    // Case-only collaborator supB sees only internX once, redacted personal fields, ONLY case2, and only case2 history
    const detailB = await request(server).get(`/scientific-supervisors/me/trainees/${internXId}`)
      .set("x-user-id", supBId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(detailB.status).toBe(HttpStatus.OK);
    expect(detailB.body.nationalId).toBeNull();
    expect(detailB.body.age).toBeNull();
    expect(detailB.body.canCreateResearch).toBe(false);
    expect(detailB.body.cases.map((c: any) => c.id)).toEqual([case2Id]);
    expect(detailB.body.history.every((h: any) => h.aggregateType === "ResearchCase" && h.aggregateId === case2Id)).toBe(true);
  });

  it("enforces atomic main supervisor replacement, change-request concurrency (409 STALE_REVISION), and D-05 rollback", async () => {
    const server = app.getHttpServer();
    // Standalone removal of MAIN_SUPERVISOR is blocked with 409
    const removeMain = await request(server).delete(`/research-cases/${case2Id}/supervisors/${supAId}`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(removeMain.status).toBe(HttpStatus.CONFLICT);
    expect(removeMain.body.code).toBe("CONFLICT");
    expect(removeMain.body.detail).toContain("جایگزین");

    // Researcher opens change request on approved EXPLANATION stage (case2 is at version 5)
    const cr = await request(server).post(`/research-cases/${case2Id}/change-requests`)
      .set("x-user-id", internXId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .send({ targetStage: "EXPLANATION", reason: "تکمیل یافته‌های جدید", expectedVersion: 5 });
    expect(cr.status).toBe(HttpStatus.CREATED);

    // Concurrent decisions by MAIN (supA) & COLLAB (supB): first succeeds, second hits 409 STALE_REVISION
    const [r1, r2] = await Promise.all([
      request(server).post(`/research-cases/${case2Id}/change-requests/${cr.body.id}/decide`)
        .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
        .send({ decision: "APPROVED", reason: "بازگشایی مجاز است", expectedVersion: 1, caseVersion: 5 }),
      request(server).post(`/research-cases/${case2Id}/change-requests/${cr.body.id}/decide`)
        .set("x-user-id", supBId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
        .send({ decision: "REJECTED", reason: "مخالفت همزمان", expectedVersion: 1, caseVersion: 5 }),
    ]);
    const statuses = [r1.status, r2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 201].some((s) => r1.status === s || r2.status === s) ? [Math.min(r1.status, r2.status), 409] : [201, 409]);
    const failed = r1.status === 409 ? r1 : r2;
    expect(failed.body.code).toBe("STALE_REVISION");

    // Verify EXPLANATION returned to IN_PROGRESS and PRESCRIPTION/SCENARIO became REVIEW_REQUIRED (D-05)
    // Also verify canReview=true for assigned supervisor, false for intern, and directory access for TRACKING_DIRECTOR
    const updatedCase = await request(server).get(`/research-cases/${case2Id}`)
      .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(updatedCase.status).toBe(HttpStatus.OK);
    expect(updatedCase.body.canReview).toBe(true);
    expect(updatedCase.body.stages.find((s: any) => s.stageType === "EXPLANATION").status).toBe("IN_PROGRESS");
    expect(updatedCase.body.stages.find((s: any) => s.stageType === "PRESCRIPTION").status).toBe("REVIEW_REQUIRED");
    expect(updatedCase.body.stages.find((s: any) => s.stageType === "SCENARIO").status).toBe("REVIEW_REQUIRED");

    const internCase = await request(server).get(`/research-cases/${case2Id}`)
      .set("x-user-id", internXId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN");
    expect(internCase.status).toBe(HttpStatus.OK);
    expect(internCase.body.canReview).toBe(false);

    const directoryOk = await request(server).get("/research-cases/directory")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(directoryOk.status).toBe(HttpStatus.OK);
    expect(directoryOk.body.length).toBeGreaterThanOrEqual(2);

    const directoryDenied = await request(server).get("/research-cases/directory")
      .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(directoryDenied.status).toBe(HttpStatus.FORBIDDEN);

    // Atomic replacement promotes supB to MAIN_SUPERVISOR cleanly
    const swapped = await request(server).put(`/research-cases/${case2Id}/supervisors/main`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ supervisorId: supBId });
    expect(swapped.status).toBe(HttpStatus.OK);
    const listSups = await request(server).get(`/research-cases/${case2Id}/supervisors`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(listSups.body.find((s: any) => s.role === "MAIN_SUPERVISOR")?.userId).toBe(supBId);
  });

  it("scopes resource bank, blocks report leakage, guards duplicate referrals/conversions, and defers User creation (FR-001)", async () => {
    const server = app.getHttpServer();
    // Tracking director sees nationwide bank including unmapped and same-name non-merged records; never report/file data
    const trackingList = await request(server).get("/resource-bank")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    expect(trackingList.status).toBe(HttpStatus.OK);
    expect(trackingList.body.items).toHaveLength(3);
    expect(JSON.stringify(trackingList.body)).not.toContain("storedObjectId");
    expect(JSON.stringify(trackingList.body)).not.toContain("reports");

    // Tehran provincial director sees only Tehran resource until referred
    const tehranList = await request(server).get("/resource-bank")
      .set("x-user-id", tehranDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(tehranList.body.items.map((x: any) => x.id)).toEqual([resTehranId]);

    const deniedIsfahan = await request(server).get(`/resource-bank/${resIsfahanId}`)
      .set("x-user-id", tehranDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR");
    expect(deniedIsfahan.status).toBe(HttpStatus.NOT_FOUND);

    // Tracking director refers Isfahan resource to Tehran director once; duplicate referral returns 409
    const refRes = await request(server).post(`/resource-bank/${resIsfahanId}/referrals`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ recipientId: tehranDirectorId, notes: "ارجاع بین‌استانی" });
    expect(refRes.status).toBe(HttpStatus.CREATED);

    const dupRef = await request(server).post(`/resource-bank/${resIsfahanId}/referrals`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ recipientId: tehranDirectorId });
    expect(dupRef.status).toBe(HttpStatus.CONFLICT);

    // Tehran director converts referred resource to applicant without creating a User account yet (FR-001)
    const usersBefore = users.size;
    const conv = await request(server).post(`/resource-bank/${resIsfahanId}/applicants`)
      .set("x-user-id", tehranDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR")
      .send({
        fullName: "علی محمدی",
        nationalId: "2233445566",
        phoneNumber: "09120001111",
        age: 38,
        provinceId: tehranId,
        education: "دکتری",
        fieldOfStudy: "فقه",
        initialSupervisorId: supAId,
      });
    expect(conv.status).toBe(HttpStatus.CREATED);
    expect(users.size).toBe(usersBefore);

    // Isfahan director cannot convert the already converted resource -> 409 Conflict
    const dupConv = await request(server).post(`/resource-bank/${resIsfahanId}/applicants`)
      .set("x-user-id", isfahanDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "PROVINCIAL_DIRECTOR")
      .send({
        fullName: "علی محمدی",
        nationalId: "3344556677",
        phoneNumber: "09131112233",
        age: 38,
        provinceId: isfahanId,
        education: "دکتری",
        fieldOfStudy: "فقه",
        initialSupervisorId: supAId,
      });
    expect(dupConv.status).toBe(HttpStatus.CONFLICT);

    // User directory accessible to SUPPORT_DIRECTOR, denied to SCIENTIFIC_SUPERVISOR
    const dirDenied = await request(server).get("/users")
      .set("x-user-id", supAId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    expect(dirDenied.status).toBe(HttpStatus.FORBIDDEN);
    const dirOk = await request(server).get("/users")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "SUPPORT_DIRECTOR");
    expect(dirOk.status).toBe(HttpStatus.OK);
    expect(dirOk.body.length).toBeGreaterThanOrEqual(7);
  });
});
