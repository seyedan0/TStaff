import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";
import { FilesService } from "../src/modules/files/application/files.service.js";
import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
import { Resource } from "../src/modules/resources/domain/resource.entity.js";
import { Interview } from "../src/modules/resources/domain/interview.entity.js";
import { InterviewReport } from "../src/modules/resources/domain/interview-report.entity.js";
import { ResearchCase } from "../src/modules/research/domain/research-case.entity.js";
import { StaleRevisionError } from "../src/modules/research/domain/research-errors.js";

const directorId = "00000000-0000-4000-8000-000000000010";
const internId = "00000000-0000-4000-8000-000000000011";
const mainSupervisorId = "00000000-0000-4000-8000-000000000012";
const collaboratorId = "00000000-0000-4000-8000-000000000013";
const otherSupervisorId = "00000000-0000-4000-8000-000000000014";
const reportFileId = "00000000-0000-4000-8000-000000000099";

class MockAssignmentRepository {
  private researchAssignments: ResearchAssignment[] = [];
  private userAssignments: Array<{ userId: string; supervisorId: string; assignedById: string; isPrimary: boolean }> = [];
  private readonly supervisors = new Set([mainSupervisorId, collaboratorId, otherSupervisorId]);

  async findActiveByCaseId(caseId: string) { return this.researchAssignments.filter((item) => item.researchCaseId === caseId && item.isActive); }
  async countActiveByUserId(userId: string) { return this.researchAssignments.filter((item) => item.userId === userId && item.isActive).length; }
  async findById(id: string) { return this.researchAssignments.find((item) => item.id === id) ?? null; }
  async save(item: ResearchAssignment) {
    const index = this.researchAssignments.findIndex((entry) => entry.id === item.id);
    if (index < 0) this.researchAssignments.push(item); else this.researchAssignments[index] = item;
  }
  async isScientificSupervisor(id: string) { return this.supervisors.has(id); }
  async assignToUser(input: { userId: string; supervisorId: string; assignedById: string }) {
    if (!this.supervisors.has(input.supervisorId)) throw new Error("مدیر علمی نامعتبر است");
    if (this.userAssignments.some((item) => item.userId === input.userId && item.supervisorId === input.supervisorId)) return;
    this.userAssignments.push({ ...input, isPrimary: !this.userAssignments.some((item) => item.userId === input.userId) });
  }
  async listSupervisorsForUser(userId: string) {
    return this.userAssignments.filter((item) => item.userId === userId).map((item) => ({ id: `${item.userId}:${item.supervisorId}`, ...item, supervisorName: "مدیر علمی آزمایشی", phoneNumber: "09120000001", assignedAt: new Date() }));
  }
  async listUsersForSupervisor(supervisorId: string) {
    return this.userAssignments.filter((item) => item.supervisorId === supervisorId).map((item) => ({ id: item.userId, fullName: "کارورز آزمایشی", stage: "INTERN", phoneNumber: "09120000002" }));
  }
  async isSupervisorAssignedToUser(userId: string, supervisorId: string) { return this.userAssignments.some((item) => item.userId === userId && item.supervisorId === supervisorId); }
}

class MockResearchRepository {
  private cases: ResearchCase[] = [];
  async findById(id: string) { return this.cases.find((item) => item.id === id) ?? null; }
  async findByCode(code: string) { return this.cases.find((item) => item.code === code) ?? null; }
  async create(item: ResearchCase) { this.cases.push(item); }
  async saveWithVersionCheck(item: ResearchCase, expectedVersion: number) {
    const index = this.cases.findIndex((entry) => entry.id === item.id);
    const current = this.cases[index];
    if (!current || current.version !== expectedVersion) throw new StaleRevisionError(current?.version ?? 0, expectedVersion);
    this.cases[index] = item;
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

class MockResourceRepository {
  private resources: Resource[] = [];
  private interviews: Interview[] = [];
  private reports: InterviewReport[] = [];
  async createResource(item: Resource) { this.resources.push(item); }
  async findResourceById(id: string) { return this.resources.find((item) => item.id === id) ?? null; }
  async findResourcesByCaseId(caseId: string) { return this.resources.filter((item) => item.researchCaseId === caseId); }
  async saveResource(item: Resource) {
    const index = this.resources.findIndex((entry) => entry.id === item.id);
    if (index >= 0) this.resources[index] = item;
  }
  async createInterview(item: Interview) { this.interviews.push(item); }
  async saveInterview(item: Interview) {
    const index = this.interviews.findIndex((entry) => entry.id === item.id);
    if (index >= 0) this.interviews[index] = item;
  }
  async findInterviewByResourceId(resourceId: string) { return this.interviews.find((item) => item.resourceId === resourceId) ?? null; }
  async findInterviewById(id: string) { return this.interviews.find((item) => item.id === id) ?? null; }
  async createReport(item: InterviewReport) { this.reports.push(item); }
  async findReportsByInterviewId(interviewId: string) { return this.reports.filter((item) => item.interviewId === interviewId); }
}

describe("Research workflow acceptance (D-02, D-03, D-05, D-07, FR-045, FR-058, AT-02, AT-29, AT-30, AT-33)", () => {
  let app: INestApplication;
  let caseId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ASSIGNMENT_REPOSITORY).useClass(MockAssignmentRepository)
      .overrideProvider(RESOURCE_REPOSITORY).useClass(MockResourceRepository)
      .overrideProvider(RESEARCH_REPOSITORY).useClass(MockResearchRepository)
      .overrideProvider(USER_REPOSITORY).useValue({ findByPhoneNumber: async () => null, findById: async () => null, findByApplicantId: async () => null, save: async () => {} })
      .overrideProvider(APPLICANT_REPOSITORY).useValue({ findById: async () => null, findByPhoneNumber: async () => null, findByNationalId: async () => null, save: async () => {}, findAll: async () => [] })
      .overrideProvider(FilesService).useValue({ assertReadyForUse: async () => {}, isAvailable: async () => true })
      .compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it("blocks apprentice access and prevents the trainee from assigning managers or creating a case (AT-02)", async () => {
    const blocked = await request(app.getHttpServer()).post("/research-cases")
      .set("x-user-id", internId).set("x-user-stage", "APPRENTICE").set("x-user-role", "APPRENTICE")
      .send({ title: "پرونده غیرمجاز", code: "RC-BLOCKED", subject: "مدیریت", researcherId: internId });
    expect(blocked.status).toBe(403);

    const assignment = await request(app.getHttpServer()).post(`/users/${internId}/scientific-supervisors`)
      .set("x-user-id", internId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .send({ supervisorId: mainSupervisorId });
    expect(assignment.status).toBe(403);
  });

  it("saves a person source immediately, enforces one interview and requires a scanned report plus supervisor approval before the next stage (D-07, AT-30)", async () => {
    const agent = request(app.getHttpServer());
    const directorHeaders = (req: request.Test) => req.set("x-user-id", directorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");
    const managerHeaders = (req: request.Test, supervisorId: string) => req.set("x-user-id", supervisorId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");
    const internHeaders = (req: request.Test) => req.set("x-user-id", internId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN");

    for (const supervisorId of [mainSupervisorId, collaboratorId, otherSupervisorId]) {
      const assigned = await directorHeaders(agent.post(`/users/${internId}/scientific-supervisors`)).send({ supervisorId });
      expect(assigned.status).toBe(201);
    }
    const caseRes = await managerHeaders(agent.post("/research-cases"), mainSupervisorId).send({
      title: "مطالعه کارورز آزمایشی", code: "RC-2026-WORKFLOW", subject: "فرایند پژوهش", researcherId: internId,
    });
    expect(caseRes.status).toBe(201);
    caseId = caseRes.body.id;

    const person = await internHeaders(agent.post(`/research-cases/${caseId}/resources`)).send({ type: "INDIVIDUAL", title: "احمد حسینی", personAge: 25, position: "معلم ریاضی" });
    expect(person.status).toBe(201);
    const listed = await internHeaders(agent.get(`/research-cases/${caseId}/resources`));
    expect(listed.status).toBe(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0]).toMatchObject({ title: "احمد حسینی", personAge: 25, position: "معلم ریاضی" });

    const interview = await internHeaders(agent.post(`/resources/${person.body.id}/interview`)).send({ intervieweeName: "احمد حسینی", intervieweeAge: 25, conductedAt: "2026-11-08T08:00:00.000Z" });
    expect(interview.status).toBe(201);
    const duplicateInterview = await internHeaders(agent.post(`/resources/${person.body.id}/interview`)).send({ intervieweeName: "احمد حسینی", intervieweeAge: 25, conductedAt: "2026-11-08T09:00:00.000Z" });
    expect(duplicateInterview.status).toBe(409);

    const incomplete = await internHeaders(agent.post(`/research-cases/${caseId}/resources/complete`)).send({ expectedVersion: 1 });
    expect(incomplete.status).toBe(400);
    expect(incomplete.body.code).toBe("INCOMPLETE_SOURCES_STAGE");

    const report = await internHeaders(agent.post(`/interviews/${interview.body.id}/reports`)).send({ title: "گزارش مصاحبه", content: "گزارش مکتوب مصاحبه برای آزمون پذیرش.", fileId: reportFileId });
    expect(report.status).toBe(201);
    expect(report.body).toMatchObject({ version: 1, storedObjectId: reportFileId });
    const completed = await internHeaders(agent.post(`/research-cases/${caseId}/resources/complete`)).send({ expectedVersion: 1 });
    expect(completed.status).toBe(200);
    expect(completed.body.stages.find((stage: any) => stage.stageType === "SOURCES").status).toBe("SUBMITTED");

    const approved = await managerHeaders(agent.post(`/research-cases/${caseId}/stages/SOURCES/review`), mainSupervisorId).send({ decision: "APPROVED", expectedVersion: completed.body.version });
    expect(approved.status).toBe(200);
    expect(approved.body.stages.find((stage: any) => stage.stageType === "EXPLANATION").status).toBe("IN_PROGRESS");

    const rolledBack = await managerHeaders(agent.post(`/research-cases/${caseId}/rollback-stage`), collaboratorId).send({ targetStage: "SOURCES", reason: "بازبینی داده‌های مصاحبه", expectedVersion: approved.body.version });
    expect(rolledBack.status).toBe(200);
    expect(rolledBack.body.stages.find((stage: any) => stage.stageType === "EXPLANATION").status).toBe("REVIEW_REQUIRED");
  });
});
