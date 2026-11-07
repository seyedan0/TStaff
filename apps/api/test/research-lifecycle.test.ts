import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";

// In-Memory test implementations
import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
import { Resource } from "../src/modules/resources/domain/resource.entity.js";
import { Interview } from "../src/modules/resources/domain/interview.entity.js";
import { InterviewReport } from "../src/modules/resources/domain/interview-report.entity.js";
import { ResearchCase } from "../src/modules/research/domain/research-case.entity.js";
import { StaleRevisionError } from "../src/modules/research/domain/research-errors.js";

class MockAssignmentRepository {
  private assignments: ResearchAssignment[] = [];
  async findActiveByCaseId(caseId: string) {
    return this.assignments.filter(
      (a) => a.researchCaseId === caseId && a.isActive,
    );
  }
  async countActiveByUserId(userId: string) {
    return this.assignments.filter((a) => a.userId === userId && a.isActive)
      .length;
  }
  async findById(id: string) {
    return this.assignments.find((a) => a.id === id) || null;
  }
  async save(a: ResearchAssignment) {
    const idx = this.assignments.findIndex((x) => x.id === a.id);
    if (idx >= 0) this.assignments[idx] = a;
    else this.assignments.push(a);
  }
}

class MockResourceRepository {
  private resources: Resource[] = [];
  private interviews: Interview[] = [];
  private reports: InterviewReport[] = [];

  async createResource(r: Resource) {
    this.resources.push(r);
  }
  async findResourceById(id: string) {
    return this.resources.find((r) => r.id === id) || null;
  }
  async findResourcesByCaseId(caseId: string) {
    return this.resources.filter((r) => r.researchCaseId === caseId);
  }
  async saveResource(r: Resource) {
    const idx = this.resources.findIndex((x) => x.id === r.id);
    if (idx >= 0) this.resources[idx] = r;
    else this.resources.push(r);
  }
  async createInterview(i: Interview) {
    this.interviews.push(i);
  }
  async findInterviewByResourceId(resourceId: string) {
    return this.interviews.find((i) => i.resourceId === resourceId) || null;
  }
  async findInterviewById(id: string) {
    return this.interviews.find((i) => i.id === id) || null;
  }
  async createReport(rep: InterviewReport) {
    this.reports.push(rep);
  }
  async findReportsByInterviewId(interviewId: string) {
    return this.reports.filter((r) => r.interviewId === interviewId);
  }
}

class MockResearchRepository {
  private cases: ResearchCase[] = [];
  async findById(id: string) {
    return this.cases.find((c) => c.id === id) || null;
  }
  async findByCode(code: string) {
    return this.cases.find((c) => c.code === code) || null;
  }
  async create(r: ResearchCase) {
    this.cases.push(r);
  }
  async saveWithVersionCheck(r: ResearchCase, expectedVersion: number) {
    const idx = this.cases.findIndex((c) => c.id === r.id);
    if (idx < 0) return;
    const existing = this.cases[idx]!;
    if (existing.version !== expectedVersion) {
      throw new StaleRevisionError(existing.version, expectedVersion);
    }
    this.cases[idx] = r;
  }
  async findAll() {
    return this.cases;
  }
}

describe("E2E: Research Lifecycle, Concurrency & Stage Rules (D-01 to D-07, AT-02, AT-28, AT-29, AT-30, AT-33)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ASSIGNMENT_REPOSITORY)
      .useClass(MockAssignmentRepository)
      .overrideProvider(RESOURCE_REPOSITORY)
      .useClass(MockResourceRepository)
      .overrideProvider(RESEARCH_REPOSITORY)
      .useClass(MockResearchRepository)
      .overrideProvider(USER_REPOSITORY)
      .useValue({
        findByPhoneNumber: async () => null,
        findById: async () => null,
        findByApplicantId: async () => null,
        save: async () => {},
      })
      .overrideProvider(APPLICANT_REPOSITORY)
      .useValue({
        findById: async () => null,
        findByPhoneNumber: async () => null,
        findByNationalId: async () => null,
        save: async () => {},
        findAll: async () => [],
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("blocks APPRENTICE from creating or viewing research cases with 403 Forbidden (AT-02)", async () => {
    const res = await request(app.getHttpServer())
      .post("/research-cases")
      .set("x-user-stage", "APPRENTICE")
      .send({
        title: "تست کارآموز",
        code: "RC-FORBIDDEN",
        subject: "مدیریت",
      });

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
    expect(res.body).toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
  });

  it("executes full research scenario: supervisors, 1:1 interview, CAS race, and rollback review_required", async () => {
    const agent = request(app.getHttpServer());

    // 1. INTERN creates research case -> 201 Created
    const createRes = await agent
      .post("/research-cases")
      .set("x-user-stage", "INTERN")
      .send({
        title: "بررسی نظام مدیریت منابع",
        code: "RC-2026-E2E",
        subject: "علوم اداری",
      });

    expect(createRes.status).toBe(HttpStatus.CREATED);
    const caseId = createRes.body.id;
    expect(createRes.body.version).toBe(1);
    expect(createRes.body.status).toBe("DRAFT");

    // 2. Assign MAIN_SUPERVISOR and COLLABORATOR_SUPERVISOR (D-02)
    const supervisorMainId = "11111111-1111-1111-1111-111111111111";
    const supervisorCollabId = "22222222-2222-2222-2222-222222222222";

    const assignMainRes = await agent
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: supervisorMainId,
        role: "MAIN_SUPERVISOR",
      });
    expect(assignMainRes.status).toBe(HttpStatus.OK);
    expect(assignMainRes.body.role).toBe("MAIN_SUPERVISOR");

    const assignCollabRes = await agent
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: supervisorCollabId,
        role: "COLLABORATOR_SUPERVISOR",
      });
    expect(assignCollabRes.status).toBe(HttpStatus.OK);
    expect(assignCollabRes.body.role).toBe("COLLABORATOR_SUPERVISOR");

    // 3. Attempting to assign second MAIN_SUPERVISOR without reassigning fails with 409
    const secondMainRes = await agent
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: "33333333-3333-3333-3333-333333333333",
        role: "MAIN_SUPERVISOR",
      });
    expect(secondMainRes.status).toBe(HttpStatus.CONFLICT);
    expect(secondMainRes.body.code).toBe("MAIN_SUPERVISOR_ALREADY_ASSIGNED");

    // 4. Register Resource
    const resourceRes = await agent
      .post(`/research-cases/${caseId}/resources`)
      .set("x-user-stage", "INTERN")
      .send({
        type: "INDIVIDUAL",
        title: "استاد نمونه",
        contactInfo: "09120001122",
      });
    expect(resourceRes.status).toBe(HttpStatus.CREATED);
    const resourceId = resourceRes.body.id;

    // 5. Register Interview with positive integer age (D-01, AT-28)
    const interviewRes = await agent
      .post(`/resources/${resourceId}/interview`)
      .set("x-user-stage", "INTERN")
      .send({
        intervieweeName: "استاد نمونه",
        intervieweeAge: 50,
        conductedAt: "2026-06-15T10:00:00.000Z",
      });
    expect(interviewRes.status).toBe(HttpStatus.CREATED);
    const interviewId = interviewRes.body.id;

    // 6. Attempting to register second interview for same resource is blocked (D-07, AT-30)
    const secondInterviewRes = await agent
      .post(`/resources/${resourceId}/interview`)
      .set("x-user-stage", "INTERN")
      .send({
        intervieweeName: "استاد نمونه - مصاحبه دوم غیرمجاز",
        intervieweeAge: 50,
        conductedAt: "2026-06-16T10:00:00.000Z",
      });
    expect(secondInterviewRes.status).toBe(HttpStatus.CONFLICT);
    expect(secondInterviewRes.body.code).toBe(
      "INTERVIEW_ALREADY_EXISTS_FOR_RESOURCE",
    );

    // 7. Advance stage before written report is submitted -> blocked (D-07)
    const prematureAdvance = await agent
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .send({ expectedVersion: 1 });
    expect(prematureAdvance.status).toBe(HttpStatus.BAD_REQUEST);
    expect(prematureAdvance.body.code).toBe("INCOMPLETE_SOURCES_STAGE");

    // 8. Submit written report for interview
    const reportRes = await agent
      .post(`/interviews/${interviewId}/reports`)
      .set("x-user-stage", "INTERN")
      .send({
        title: "گزارش مصاحبه جامع",
        content: "متن گزارش تحلیلی داده‌های میدانی مصاحبه...",
      });
    expect(reportRes.status).toBe(HttpStatus.CREATED);

    // 9. Now advance stage succeeds with expectedVersion: 1 -> version becomes 2
    const advanceRes = await agent
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .send({ expectedVersion: 1 });
    expect(advanceRes.status).toBe(HttpStatus.OK);
    expect(advanceRes.body.version).toBe(2);
    expect(advanceRes.body.status).toBe("EXPLANATION_STAGE");

    // 10. Concurrent supervisor review decision race (D-02, D-03, AT-29)
    // Supervisor Main commits decision with expectedVersion: 2
    const supervisorDecision1 = await agent
      .post(`/research-cases/${caseId}/stages/EXPLANATION/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", supervisorMainId)
      .send({
        decision: "APPROVED",
        notes: "مورد تایید است",
        expectedVersion: 2,
      });
    expect(supervisorDecision1.status).toBe(HttpStatus.OK);
    expect(supervisorDecision1.body.version).toBe(3);

    // Concurrent supervisor Collab attempts decision with old expectedVersion: 2 -> fails with 409 STALE_REVISION
    const supervisorDecision2 = await agent
      .post(`/research-cases/${caseId}/stages/EXPLANATION/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", supervisorCollabId)
      .send({
        decision: "REVISION_REQUESTED",
        notes: "نیاز به بازنگری",
        expectedVersion: 2, // Stale!
      });
    expect(supervisorDecision2.status).toBe(HttpStatus.CONFLICT);
    expect(supervisorDecision2.body.code).toBe("STALE_REVISION");
    expect(supervisorDecision2.body.currentVersion).toBe(3);

    // 11. Rollback stage to SOURCES with expectedVersion: 3 (D-05, AT-33)
    const rollbackRes = await agent
      .post(`/research-cases/${caseId}/rollback-stage`)
      .set("x-user-stage", "INTERN")
      .send({
        targetStage: "SOURCES",
        reason: "نیاز به داده‌های منبع تکمیلی",
        expectedVersion: 3,
      });
    expect(rollbackRes.status).toBe(HttpStatus.OK);
    expect(rollbackRes.body.version).toBe(4);
    expect(rollbackRes.body.status).toBe("SOURCES_STAGE");

    // Verify downstream EXPLANATION is now REVIEW_REQUIRED
    const explanationStage = rollbackRes.body.stages.find(
      (s: any) => s.stageType === "EXPLANATION",
    );
    expect(explanationStage.status).toBe("REVIEW_REQUIRED");

    const sourcesStage = rollbackRes.body.stages.find(
      (s: any) => s.stageType === "SOURCES",
    );
    expect(sourcesStage.status).toBe("IN_PROGRESS");
  });
});
