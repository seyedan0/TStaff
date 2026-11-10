import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { PrismaService } from "@tstaff/database";
import { TRANSACTION_RUNNER } from "../src/platform/transactions/transaction-runner.js";
import { ORGANIZATION_REPOSITORY } from "../src/modules/organization/application/ports/organization.repository.port.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { REVIEW_REPOSITORY } from "../src/modules/reviews/application/reviews.service.js";
import { SCENARIO_REPOSITORY } from "../src/modules/scenarios/application/scenarios.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";
import { AUDIT_REPOSITORY } from "../src/modules/audit/application/audit.service.js";
import { NOTIFICATION_REPOSITORY } from "../src/modules/notifications/application/notifications.service.js";
import { FilesService } from "../src/modules/files/application/files.service.js";
import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
import { CannotRemoveMainSupervisorWithoutReplacementError } from "../src/modules/assignments/domain/assignment-errors.js";
import { Resource } from "../src/modules/resources/domain/resource.entity.js";
import { Interview } from "../src/modules/resources/domain/interview.entity.js";
import { InterviewReport } from "../src/modules/resources/domain/interview-report.entity.js";
import { ResearchCase } from "../src/modules/research/domain/research-case.entity.js";
import { StageSubmission } from "../src/modules/reviews/domain/stage-submission.entity.js";
import { ReviewDecision } from "../src/modules/reviews/domain/review-decision.entity.js";
import { Scenario } from "../src/modules/scenarios/domain/scenario.entity.js";
import { StaleRevisionError } from "../src/modules/research/domain/research-errors.js";
import { StaleRevisionError as ReviewStaleRevisionError } from "../src/modules/reviews/domain/reviews-errors.js";
import { StaleScenarioRevisionError } from "../src/modules/scenarios/domain/scenarios-errors.js";

const researcherUserId = "11111111-1111-1111-1111-111111111111";
const mainSupervisorId = "22222222-2222-2222-2222-222222222222";
const collabSupervisorId = "33333333-3333-3333-3333-333333333333";
const trackingDirectorId = "44444444-4444-4444-4444-444444444444";
const reportFileId = "99999999-9999-4999-8999-999999999999";

class MockAssignmentRepository {
  private caseAssignments: ResearchAssignment[] = [];
  private userAssignments: Array<{ userId: string; supervisorId: string; assignedById: string; isPrimary: boolean }> = [];
  async findActiveByCaseId(caseId: string) { return this.caseAssignments.filter((item) => item.researchCaseId === caseId && item.isActive); }
  async countActiveByUserId(userId: string) { return this.caseAssignments.filter((item) => item.userId === userId && item.isActive).length; }
  async findById(id: string) { return this.caseAssignments.find((item) => item.id === id) ?? null; }
  async save(item: ResearchAssignment) {
    const index = this.caseAssignments.findIndex((entry) => entry.id === item.id);
    if (index < 0) this.caseAssignments.push(item); else this.caseAssignments[index] = item;
  }
  async isScientificSupervisor(id: string) { return id === mainSupervisorId || id === collabSupervisorId; }
  async isIntern(userId: string) { return userId === researcherUserId; }
  async assignToUser(input: { userId: string; supervisorId: string; assignedById: string }) {
    if (!(await this.isScientificSupervisor(input.supervisorId))) throw new Error("مدیر علمی نامعتبر است");
    if (this.userAssignments.some((item) => item.userId === input.userId && item.supervisorId === input.supervisorId)) return;
    this.userAssignments.push({ ...input, isPrimary: !this.userAssignments.some((item) => item.userId === input.userId) });
  }
  async isSupervisorAssignedToUser(userId: string, supervisorId: string) { return this.userAssignments.some((item) => item.userId === userId && item.supervisorId === supervisorId); }
  async listSupervisorsForUser(userId: string) { return this.userAssignments.filter((item) => item.userId === userId).map((item) => ({ id: `${item.userId}:${item.supervisorId}`, ...item, supervisorName: "مدیر علمی آزمایشی", phoneNumber: "09120000000", assignedAt: new Date() })); }
  async listUsersForSupervisor(supervisorId: string) { return this.userAssignments.filter((item) => item.supervisorId === supervisorId).map((item) => ({ id: item.userId, fullName: "کارورز آزمایشی", stage: "INTERN", phoneNumber: "09120000001" })); }
  async isSupervisorAssignedToCase(caseId: string, supervisorId: string) { return this.caseAssignments.some((item) => item.researchCaseId === caseId && item.userId === supervisorId && item.isActive); }
  async getCaseIdsForSupervisor(supervisorId: string) { return this.caseAssignments.filter((item) => item.userId === supervisorId && item.isActive).map((item) => item.researchCaseId); }
  async listCaseSupervisors(caseId: string) {
    return this.caseAssignments.filter((item) => item.researchCaseId === caseId && item.isActive).map((item) => ({
      id: item.id, researchCaseId: item.researchCaseId, userId: item.userId, fullName: "مدیر علمی آزمایشی", phoneNumber: "09120000000", role: item.role, isActive: item.isActive, assignedAt: item.assignedAt,
    }));
  }
  async assignToCase(input: { researchCaseId: string; userId: string; role: "MAIN_SUPERVISOR" | "COLLABORATOR_SUPERVISOR" }) {
    if (!(await this.isScientificSupervisor(input.userId))) throw new Error("مدیر علمی نامعتبر است");
    const active = await this.findActiveByCaseId(input.researchCaseId);
    if (active.some((item) => item.userId === input.userId && item.role === input.role)) return;
    ResearchAssignment.validateCanAssign(input.role, active);
    await this.save(ResearchAssignment.create({ id: crypto.randomUUID(), ...input }));
  }
  async replaceMainSupervisorOnCase(caseId: string, supervisorId: string) {
    if (!(await this.isScientificSupervisor(supervisorId))) throw new Error("مدیر علمی نامعتبر است");
    this.caseAssignments = this.caseAssignments.map((item) =>
      item.researchCaseId === caseId && item.isActive && (item.role === "MAIN_SUPERVISOR" || item.userId === supervisorId)
        ? item.deactivate()
        : item,
    );
    await this.save(ResearchAssignment.create({ id: crypto.randomUUID(), researchCaseId: caseId, userId: supervisorId, role: "MAIN_SUPERVISOR" }));
  }
  async revokeFromUser(userId: string, supervisorId: string) {
    this.userAssignments = this.userAssignments.filter((item) => !(item.userId === userId && item.supervisorId === supervisorId));
  }
  async revokeFromCase(caseId: string, supervisorId: string) {
    const active = this.caseAssignments.find((item) => item.researchCaseId === caseId && item.userId === supervisorId && item.isActive);
    if (active?.role === "MAIN_SUPERVISOR") throw new CannotRemoveMainSupervisorWithoutReplacementError();
    this.caseAssignments = this.caseAssignments.map((item) =>
      item.researchCaseId === caseId && item.userId === supervisorId && item.isActive ? item.deactivate() : item,
    );
  }
}

class MockResourceRepository {
  private resources: Resource[] = [];
  private interviews: Interview[] = [];
  private reports: InterviewReport[] = [];
  async createResource(item: Resource) { this.resources.push(item); }
  async findResourceById(id: string) { return this.resources.find((item) => item.id === id) ?? null; }
  async findResourcesByCaseId(caseId: string) { return this.resources.filter((item) => item.researchCaseId === caseId); }
  async saveResource(item: Resource) { const i = this.resources.findIndex((entry) => entry.id === item.id); if (i >= 0) this.resources[i] = item; }
  async createInterview(item: Interview) { this.interviews.push(item); }
  async saveInterview(item: Interview) { const i = this.interviews.findIndex((entry) => entry.id === item.id); if (i >= 0) this.interviews[i] = item; }
  async findInterviewByResourceId(resourceId: string) { return this.interviews.find((item) => item.resourceId === resourceId) ?? null; }
  async findInterviewById(id: string) { return this.interviews.find((item) => item.id === id) ?? null; }
  async createReport(item: InterviewReport) { this.reports.push(item); }
  async findReportsByInterviewId(interviewId: string) { return this.reports.filter((item) => item.interviewId === interviewId); }
}

class MockResearchRepository {
  private cases: ResearchCase[] = [];
  async findById(id: string) { return this.cases.find((item) => item.id === id) ?? null; }
  async findByCode(code: string) { return this.cases.find((item) => item.code === code) ?? null; }
  async create(item: ResearchCase) { this.cases.push(item); }
  async saveWithVersionCheck(item: ResearchCase, expectedVersion: number) {
    const i = this.cases.findIndex((entry) => entry.id === item.id);
    const current = this.cases[i];
    if (!current || current.version !== expectedVersion) throw new StaleRevisionError(current?.version ?? 0, expectedVersion);
    this.cases[i] = item;
  }
  async findAll() { return this.cases; }
  async findStageInstanceById(id: string) {
    for (const researchCase of this.cases) {
      const stage = researchCase.stages.find((item) => item.id === id);
      if (stage) return { id: stage.id, researchCaseId: stage.researchCaseId, stageType: stage.stageType, status: stage.status, version: stage.version };
    }
    return null;
  }
}

class MockReviewRepository {
  private submissions: StageSubmission[] = [];
  private decisions: ReviewDecision[] = [];
  async saveSubmission(item: StageSubmission) { const i = this.submissions.findIndex((entry) => entry.id === item.id); if (i >= 0) this.submissions[i] = item; else this.submissions.push(item); }
  async findSubmissionById(id: string) { return this.submissions.find((item) => item.id === id) ?? null; }
  async findSubmissionsByStageInstanceId(id: string) { return this.submissions.filter((item) => item.stageInstanceId === id); }
  async saveDecision(item: ReviewDecision) { this.decisions.push(item); }
  async findDecisionByIdempotencyKey(key: string) { return this.decisions.find((item) => item.idempotencyKey === key) ?? null; }
  async findDecisionsBySubmissionId(id: string) { return this.decisions.filter((item) => item.stageSubmissionId === id); }
  async updateSubmissionWithVersionCheck(item: StageSubmission, expectedVersion: number) {
    const i = this.submissions.findIndex((entry) => entry.id === item.id);
    if (i < 0 || this.submissions[i]!.version !== expectedVersion) throw new ReviewStaleRevisionError(this.submissions[i]?.version ?? 0, expectedVersion);
    this.submissions[i] = item;
  }
}

class MockScenarioRepository {
  private scenarios: Scenario[] = [];
  private versions = new Map<string, any[]>();
  private decisions: any[] = [];
  async create(item: Scenario) {
    this.scenarios.push(item);
    this.snapshot(item);
  }
  async findById(id: string) { return this.scenarios.find((item) => item.id === id) ?? null; }
  async findByCaseId(caseId: string) { return this.scenarios.filter((item) => item.researchCaseId === caseId); }
  async saveWithVersionCheck(item: Scenario, expectedVersion: number) {
    const i = this.scenarios.findIndex((entry) => entry.id === item.id);
    if (i < 0 || this.scenarios[i]!.version !== expectedVersion) throw new StaleScenarioRevisionError(this.scenarios[i]?.version ?? 0, expectedVersion);
    this.scenarios[i] = item;
    this.snapshot(item);
  }
  async findVersions(scenarioId: string) { return [...(this.versions.get(scenarioId) ?? [])].sort((a, b) => b.version - a.version); }
  async findDecisions(scenarioId: string) {
    return this.decisions
      .filter((d) => d.scenarioId === scenarioId)
      .map((d) => ({
        id: d.id,
        reviewerId: d.reviewerId,
        reviewerName: "مدیر علمی آزمایشی",
        decision: d.decision,
        expectedVersion: d.expectedVersion,
        actualVersion: d.actualVersion,
        reason: d.reason,
        decidedAt: (d.decidedAt instanceof Date ? d.decidedAt : new Date(d.decidedAt)).toISOString(),
      }));
  }
  async findInternalBank() { return this.scenarios.filter((item) => item.status === "APPROVED_INTERNAL"); }
  async saveDecision(item: any) { this.decisions.push(item); }
  async findDecisionByIdempotencyKey(key: string) { return this.decisions.find((item) => item.idempotencyKey === key) ?? null; }
  private snapshot(item: Scenario) {
    const list = this.versions.get(item.id) ?? [];
    list.push({
      version: item.version,
      title: item.title,
      summary: item.summary,
      content: item.content,
      status: item.status,
      createdById: item.createdById ?? null,
      createdAt: item.updatedAt.toISOString(),
    });
    this.versions.set(item.id, list);
  }
}

describe("Scientific review and scenario workflow (D-02, D-03, D-05, FR-016, FR-019, FR-021, FR-040, AT-02, AT-05, AT-07, AT-08, AT-16, AT-29, AT-33)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue({ $connect: async () => {}, $disconnect: async () => {} })
      .overrideProvider(TRANSACTION_RUNNER).useValue({ run: async <T>(operation: () => Promise<T>) => operation() })
      .overrideProvider(ORGANIZATION_REPOSITORY).useValue({ hasUserGrant: async () => false, provinceIds: async () => [] })
      .overrideProvider(ASSIGNMENT_REPOSITORY).useClass(MockAssignmentRepository)
      .overrideProvider(RESOURCE_REPOSITORY).useClass(MockResourceRepository)
      .overrideProvider(RESEARCH_REPOSITORY).useClass(MockResearchRepository)
      .overrideProvider(REVIEW_REPOSITORY).useClass(MockReviewRepository)
      .overrideProvider(SCENARIO_REPOSITORY).useClass(MockScenarioRepository)
      .overrideProvider(USER_REPOSITORY).useValue({ findByPhoneNumber: async () => null, findById: async () => null, findByApplicantId: async () => null, findAllDirectoryUsers: async () => [], save: async () => {} })
      .overrideProvider(APPLICANT_REPOSITORY).useValue({ findById: async () => null, findByPhoneNumber: async () => null, findByNationalId: async () => null, save: async () => {}, findAll: async () => [] })
      .overrideProvider(AUDIT_REPOSITORY).useValue({ save: async () => {}, findById: async () => null, findMany: async () => [] })
      .overrideProvider(NOTIFICATION_REPOSITORY).useValue({ save: async () => {}, findById: async () => null, findByUserId: async () => [], countUnread: async () => 0 })
      .overrideProvider(FilesService).useValue({ assertReadyForUse: async () => {}, isAvailable: async () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  const asIntern = (call: request.Test) => call.set("x-user-id", researcherUserId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN");
  const asManager = (call: request.Test, id = mainSupervisorId) => call.set("x-user-id", id).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
  const scenarioContent = JSON.stringify({ audience: "TEACHER", province: "تهران", category: "آموزش", keywords: ["بهره‌وری"], implementationSteps: ["تشکیل گروه راهبری و تعیین مسئول اجرا"] });

  async function createAssignedCase(code: string) {
    const agent = request(app.getHttpServer());
    for (const supervisorId of [mainSupervisorId, collabSupervisorId]) {
      const assigned = await agent.post(`/users/${researcherUserId}/scientific-supervisors`).set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR").send({ supervisorId });
      expect(assigned.status).toBe(201);
    }
    const created = await asManager(agent.post("/research-cases")).send({ title: "پژوهش آزمایشی ساختاریافته", code, subject: "مدیریت آموزشی", researcherId: researcherUserId });
    expect(created.status).toBe(201);
    const assignedToCase = await agent.post(`/research-cases/${created.body.id}/supervisors`).set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR").send({ userId: collabSupervisorId, role: "COLLABORATOR_SUPERVISOR" });
    expect(assignedToCase.status).toBe(201);
    return created.body;
  }

  async function approveSources(agent: ReturnType<typeof request>, caseId: string) {
    const person = await asIntern(agent.post(`/research-cases/${caseId}/resources`)).send({ type: "INDIVIDUAL", title: "دکتر رضایی", personAge: 45, position: "پژوهشگر" });
    expect(person.status).toBe(201);
    const interview = await asIntern(agent.post(`/resources/${person.body.id}/interview`)).send({ intervieweeName: "دکتر رضایی", intervieweeAge: 45, conductedAt: "2026-11-08T08:00:00.000Z" });
    expect(interview.status).toBe(201);
    const report = await asIntern(agent.post(`/interviews/${interview.body.id}/reports`)).send({ title: "گزارش مصاحبه", content: "گزارش مکتوب جهت تکمیل بررسی منابع.", fileId: reportFileId });
    expect(report.status).toBe(201);
    const submitted = await asIntern(agent.post(`/research-cases/${caseId}/resources/complete`)).send({ expectedVersion: 1 });
    expect(submitted.status).toBe(200);
    const approved = await asManager(agent.post(`/research-cases/${caseId}/stages/SOURCES/review`)).send({ decision: "APPROVED", expectedVersion: submitted.body.version });
    expect(approved.status).toBe(200);
    return approved.body;
  }

  async function approveReport(agent: ReturnType<typeof request>, caseId: string, stageId: string, expectedCaseVersion: number, key: string) {
    const submission = await asIntern(agent.post(`/stages/${stageId}/submissions`)).send({ content: `گزارش مرحله ${key} برای داوری علمی`, fileId: reportFileId, expectedVersion: expectedCaseVersion });
    expect(submission.status).toBe(201);
    const reviewed = await asManager(agent.post(`/submissions/${submission.body.id}/review`), collabSupervisorId).send({ decision: "APPROVED", reason: "محتوا تأیید و مرحله بعدی باز شود", expectedVersion: 1, caseVersion: expectedCaseVersion + 1, idempotencyKey: `${key}-review-key` });
    expect(reviewed.status).toBe(200);
    const latestCase = await asIntern(agent.get(`/research-cases/${caseId}`));
    expect(latestCase.status).toBe(200);
    return latestCase.body;
  }

  async function reachScenarioStage(agent: ReturnType<typeof request>, code: string) {
    const researchCase = await createAssignedCase(code);
    let current = await approveSources(agent, researchCase.id);
    const explanation = current.stages.find((stage: any) => stage.stageType === "EXPLANATION");
    current = await approveReport(agent, researchCase.id, explanation.id, current.version, `${code}-explanation`);
    const prescription = current.stages.find((stage: any) => stage.stageType === "PRESCRIPTION");
    current = await approveReport(agent, researchCase.id, prescription.id, current.version, `${code}-prescription`);
    return { researchCase, current };
  }

  it("blocks APPRENTICE from M4 routes and prevents interns from creating research cases (AT-02)", async () => {
    const agent = request(app.getHttpServer());
    const blocked = await agent.post("/stages/stage-123/submissions").set("x-user-id", researcherUserId).set("x-user-stage", "APPRENTICE").send({ content: "تلاش کارآموز برای ثبت گزارش", expectedVersion: 1 });
    expect(blocked.status).toBe(403);
    const creation = await agent.post("/research-cases").set("x-user-id", researcherUserId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN").send({ title: "ساخت غیرمجاز پرونده", code: "RC-M4-FORBIDDEN", subject: "مدیریت", researcherId: researcherUserId });
    expect(creation.status).toBe(403);
  });

  it("submits explanation and prescription with files, requires review, and publishes a structured scenario to the internal bank", async () => {
    const agent = request(app.getHttpServer());
    const { researchCase, current } = await reachScenarioStage(agent, "RC-M4-APPROVAL");
    const scenario = await asIntern(agent.post(`/research-cases/${researchCase.id}/scenarios`)).send({ title: "سناریوی ارتقای بهره‌وری آموزشی", summary: "اقدام اجرایی برای بهبود هماهنگی آموزشی در مدرسه.", content: scenarioContent });
    expect(scenario.status).toBe(201);
    const submitted = await asIntern(agent.post(`/scenarios/${scenario.body.id}/submit`)).send({ expectedVersion: 1 });
    expect(submitted.status).toBe(200);
    const caseAfterSubmit = await asIntern(agent.get(`/research-cases/${researchCase.id}`));
    expect(caseAfterSubmit.body.stages.find((stage: any) => stage.stageType === "SCENARIO").status).toBe("SUBMITTED");
    const decision = await asManager(agent.post(`/scenarios/${scenario.body.id}/review`)).send({ decision: "APPROVED", reason: "سناریو ساختاریافته و آماده انتشار داخلی است.", expectedVersion: 2, caseVersion: caseAfterSubmit.body.version, idempotencyKey: "scenario-approval-key-1" });
    expect(decision.status).toBe(200);
    expect(decision.body.status).toBe("APPROVED_INTERNAL");
    const removedBank = await asIntern(agent.get("/scenarios/bank"));
    expect(removedBank.status).toBe(404);
    const scenarioDetail = await asManager(agent.get(`/scenarios/${scenario.body.id}`));
    expect(scenarioDetail.status).toBe(200);
    expect(scenarioDetail.body.versions.length).toBeGreaterThanOrEqual(2);
    expect(scenarioDetail.body.decisions).toHaveLength(1);
    expect(current.status).toBe("SCENARIO_STAGE");

    // Revoking collaborator assignment removes scenario read access while preserving decision history
    await agent.delete(`/research-cases/${researchCase.id}/supervisors/${collabSupervisorId}`).set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    await agent.delete(`/users/${researcherUserId}/scientific-supervisors/${collabSupervisorId}`).set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    const revokedRead = await asManager(agent.get(`/scenarios/${scenario.body.id}`), collabSupervisorId);
    expect(revokedRead.status).toBe(403);
    const preservedDecisions = await asManager(agent.get(`/scenarios/${scenario.body.id}/decisions`), mainSupervisorId);
    expect(preservedDecisions.status).toBe(200);
    expect(preservedDecisions.body).toHaveLength(1);
  });

  it("blocks scenario approval after rollback marks dependent outputs for review (D-05, FR-061, AT-33)", async () => {
    const agent = request(app.getHttpServer());
    const { researchCase, current } = await reachScenarioStage(agent, "RC-M4-ROLLBACK");
    const scenario = await asIntern(agent.post(`/research-cases/${researchCase.id}/scenarios`)).send({ title: "سناریوی وابسته به تجویز", summary: "اقدام اجرایی وابسته به خروجی مراحل پیش‌نیاز.", content: scenarioContent });
    const submission = await asIntern(agent.post(`/scenarios/${scenario.body.id}/submit`)).send({ expectedVersion: 1 });
    expect(submission.status).toBe(200);
    const caseAfterSubmit = await asIntern(agent.get(`/research-cases/${researchCase.id}`));
    const rollback = await asManager(agent.post(`/research-cases/${researchCase.id}/rollback-stage`), mainSupervisorId).send({ targetStage: "EXPLANATION", reason: "بازبینی دوباره تبیین مسئله", expectedVersion: caseAfterSubmit.body.version });
    expect(rollback.status).toBe(200);
    expect(rollback.body.stages.find((stage: any) => stage.stageType === "PRESCRIPTION").status).toBe("REVIEW_REQUIRED");
    expect(rollback.body.stages.find((stage: any) => stage.stageType === "SCENARIO").status).toBe("REVIEW_REQUIRED");
    const blocked = await asManager(agent.post(`/scenarios/${scenario.body.id}/review`)).send({ decision: "APPROVED", reason: "تلاش برای تأیید پس از بازگشت مرحله", expectedVersion: 2, caseVersion: rollback.body.version, idempotencyKey: "scenario-rollback-block-1" });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("PREREQUISITE_REVIEW_REQUIRED");
    expect(current.status).toBe("SCENARIO_STAGE");
  });
});
