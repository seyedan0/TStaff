import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { REVIEW_REPOSITORY } from "../src/modules/reviews/application/reviews.service.js";
import { SCENARIO_REPOSITORY } from "../src/modules/scenarios/application/scenarios.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";

import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
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
import type { StageStatus } from "@tstaff/contracts";

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
  async findStageInstanceById(stageId: string) {
    for (const c of this.cases) {
      const s = c.stages.find((st) => st.id === stageId);
      if (s) {
        return {
          id: s.id,
          researchCaseId: s.researchCaseId,
          stageType: s.stageType,
          status: s.status,
          version: s.version,
        };
      }
    }
    return null;
  }
  async updateStageStatus(stageId: string, status: StageStatus) {
    for (const c of this.cases) {
      const s = c.stages.find((st) => st.id === stageId);
      if (s) {
        (s as any).props.status = status;
      }
    }
  }
}

class MockReviewRepository {
  private submissions: StageSubmission[] = [];
  private decisions: ReviewDecision[] = [];

  async saveSubmission(sub: StageSubmission) {
    const idx = this.submissions.findIndex((s) => s.id === sub.id);
    if (idx >= 0) this.submissions[idx] = sub;
    else this.submissions.push(sub);
  }
  async findSubmissionById(id: string) {
    return this.submissions.find((s) => s.id === id) ?? null;
  }
  async findSubmissionsByStageInstanceId(sId: string) {
    return this.submissions.filter((s) => s.stageInstanceId === sId);
  }
  async saveDecision(d: ReviewDecision) {
    this.decisions.push(d);
  }
  async findDecisionByIdempotencyKey(key: string) {
    return this.decisions.find((d) => d.idempotencyKey === key) ?? null;
  }
  async findDecisionsBySubmissionId(subId: string) {
    return this.decisions.filter((d) => d.stageSubmissionId === subId);
  }
  async updateSubmissionWithVersionCheck(
    sub: StageSubmission,
    expectedVersion: number,
  ) {
    const idx = this.submissions.findIndex((s) => s.id === sub.id);
    if (idx === -1 || this.submissions[idx]!.version !== expectedVersion) {
      throw new ReviewStaleRevisionError(
        this.submissions[idx]?.version ?? 0,
        expectedVersion,
      );
    }
    this.submissions[idx] = sub;
  }
}

class MockScenarioRepository {
  private scenarios: Scenario[] = [];
  private decisions: any[] = [];

  async create(s: Scenario) {
    this.scenarios.push(s);
  }
  async findById(id: string) {
    return this.scenarios.find((s) => s.id === id) ?? null;
  }
  async findByCaseId(cId: string) {
    return this.scenarios.filter((s) => s.researchCaseId === cId);
  }
  async saveWithVersionCheck(s: Scenario, expectedVersion: number) {
    const idx = this.scenarios.findIndex((item) => item.id === s.id);
    if (idx === -1 || this.scenarios[idx]!.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(
        this.scenarios[idx]?.version ?? 0,
        expectedVersion,
      );
    }
    this.scenarios[idx] = s;
  }
  async findInternalBank() {
    return this.scenarios.filter((s) => s.status === "APPROVED_INTERNAL");
  }
  async saveDecision(decision: any) {
    this.decisions.push(decision);
  }
  async findDecisionByIdempotencyKey(key: string) {
    return this.decisions.find((d) => d.idempotencyKey === key) ?? null;
  }
}

describe("E2E: M4 Scientific Review, Stage Submissions & Scenarios Lifecycle", () => {
  let app: INestApplication;

  const researcherUserId = "11111111-1111-1111-1111-111111111111";
  const mainSupervisorId = "22222222-2222-2222-2222-222222222222";
  const collabSupervisorId = "33333333-3333-3333-3333-333333333333";

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
      .overrideProvider(REVIEW_REPOSITORY)
      .useClass(MockReviewRepository)
      .overrideProvider(SCENARIO_REPOSITORY)
      .useClass(MockScenarioRepository)
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

  it("AT-02: Blocks APPRENTICE from M4 routes (stage submissions, reviews, scenarios)", async () => {
    // 1. Stage submission blocked
    const subRes = await request(app.getHttpServer())
      .post("/stages/stage-123/submissions")
      .set("x-user-stage", "APPRENTICE")
      .set("x-user-id", researcherUserId)
      .send({ content: "تلاش کارآموز برای ثبت گزارش تبیین", expectedVersion: 1 });
    expect(subRes.status).toBe(HttpStatus.FORBIDDEN);

    // 2. Scenario creation blocked
    const scRes = await request(app.getHttpServer())
      .post("/research-cases/case-123/scenarios")
      .set("x-user-stage", "APPRENTICE")
      .set("x-user-id", researcherUserId)
      .send({
        title: "سناریو",
        summary: "چکیده سناریو",
        content: "متن کامل سناریو",
      });
    expect(scRes.status).toBe(HttpStatus.FORBIDDEN);

    // 3. Scenario bank query blocked for Apprentice
    const bankRes = await request(app.getHttpServer())
      .get("/scenarios/bank")
      .set("x-user-stage", "APPRENTICE")
      .set("x-user-id", researcherUserId);
    expect(bankRes.status).toBe(HttpStatus.FORBIDDEN);
  });

  it("End-to-End M4 Lifecycle: Explanation -> Prescription -> Scenario -> Internal Bank", async () => {
    // 1. Create research case (starts in SOURCES stage)
    const createCaseRes = await request(app.getHttpServer())
      .post("/research-cases")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "بررسی الگوی نخبگانی در توسعه علم",
        code: "RC-M4-001",
        subject: "مدیریت فناوری",
      });
    expect(createCaseRes.status).toBe(HttpStatus.CREATED);
    const caseId = createCaseRes.body.id;

    // 2. Assign Main Supervisor and Collaborator Supervisor (D-02)
    const mainSupRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        userId: mainSupervisorId,
        role: "MAIN_SUPERVISOR",
      });
    expect(mainSupRes.status).toBe(HttpStatus.OK);

    const collabSupRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        userId: collabSupervisorId,
        role: "COLLABORATOR_SUPERVISOR",
      });
    expect(collabSupRes.status).toBe(HttpStatus.OK);

    // 3. Fulfill SOURCES stage requirements: 1 resource + 1 interview + 1 report (D-07, AT-30)
    const resRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/resources`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        type: "INDIVIDUAL",
        title: "دکتر رضایی - پژوهشگر برتر",
      });
    const resourceId = resRes.body.id;

    const interviewRes = await request(app.getHttpServer())
      .post(`/resources/${resourceId}/interview`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        intervieweeName: "دکتر رضایی",
        intervieweeAge: 45,
        conductedAt: new Date().toISOString(),
      });
    const interviewId = interviewRes.body.id;

    await request(app.getHttpServer())
      .post(`/interviews/${interviewId}/reports`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "گزارش مکتوب مصاحبه اول",
        content: "متن کامل مصاحبه پیاده‌سازی‌شده و مستندات منبع علمی.",
      });

    // Advance from SOURCES -> EXPLANATION
    const advToExplRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 1 });
    expect(advToExplRes.status).toBe(HttpStatus.OK);
    expect(advToExplRes.body.status).toBe("EXPLANATION_STAGE");

    const explanationStage = advToExplRes.body.stages.find(
      (s: any) => s.stageType === "EXPLANATION",
    );
    expect(explanationStage).toBeDefined();

    // 4. Submit EXPLANATION report (FR-016, AT-05)
    const explSubRes = await request(app.getHttpServer())
      .post(`/stages/${explanationStage.id}/submissions`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        content: "گزارش تفصیلی مرحله تبیین علّی مسئله با بررسی شواهد منبع",
        expectedVersion: 1,
      });
    expect(explSubRes.status).toBe(HttpStatus.CREATED);
    const explSubId = explSubRes.body.id;

    // 5. Collaborator Supervisor approves EXPLANATION report (D-02, D-03, AT-29)
    const reviewExplRes = await request(app.getHttpServer())
      .post(`/submissions/${explSubId}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", collabSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "تبیین مسئله با دقت بالا صورت گرفته و علل شفاف هستند.",
        expectedVersion: 1,
        idempotencyKey: "rev-expl-key-01",
      });
    expect(reviewExplRes.status).toBe(HttpStatus.OK);
    expect(reviewExplRes.body.submission.status).toBe("APPROVED");

    // Advance from EXPLANATION -> PRESCRIPTION
    const advToPresRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 2 });
    expect(advToPresRes.status).toBe(HttpStatus.OK);
    expect(advToPresRes.body.status).toBe("PRESCRIPTION_STAGE");

    const prescriptionStage = advToPresRes.body.stages.find(
      (s: any) => s.stageType === "PRESCRIPTION",
    );

    // 6. Submit PRESCRIPTION report (FR-019, AT-07)
    const presSubRes = await request(app.getHttpServer())
      .post(`/stages/${prescriptionStage.id}/submissions`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        content: "گزارش تفصیلی تجویز راهبردها و مدل‌های عملیاتی",
        expectedVersion: 1,
      });
    expect(presSubRes.status).toBe(HttpStatus.CREATED);
    const presSubId = presSubRes.body.id;

    // 7. Main Supervisor approves PRESCRIPTION report (FR-020)
    const reviewPresRes = await request(app.getHttpServer())
      .post(`/submissions/${presSubId}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", mainSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "تجویزها علمی، دقیق و قابل پیاده‌سازی در سناریو هستند.",
        expectedVersion: 1,
        idempotencyKey: "rev-pres-key-01",
      });
    expect(reviewPresRes.status).toBe(HttpStatus.OK);

    // Advance to SCENARIO_STAGE
    const advToScenRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 3 });
    expect(advToScenRes.status).toBe(HttpStatus.OK);
    expect(advToScenRes.body.status).toBe("SCENARIO_STAGE");

    // 8. Create SCENARIO (FR-021, AT-08)
    const createScenRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/scenarios`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "سناریوی ارتقای بهره‌وری آموزشی نخبگان",
        summary: "چکیده جامع سناریوی اجرایی بر پایه یافته‌های تجویز.",
        content: "متن کامل سناریو شامل مدل‌های اقدام و سازوکار ارزیابی اثربخشی راهبردها.",
      });
    expect(createScenRes.status).toBe(HttpStatus.CREATED);
    const scenarioId = createScenRes.body.id;
    expect(createScenRes.body.status).toBe("DRAFT");

    // Submit scenario for review
    const submitScenRes = await request(app.getHttpServer())
      .post(`/scenarios/${scenarioId}/submit`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 1 });
    expect(submitScenRes.status).toBe(HttpStatus.OK);
    expect(submitScenRes.body.status).toBe("UNDER_REVIEW");

    // 9. Supervisor approves scenario into internal bank (FR-040, AT-16)
    const reviewScenRes = await request(app.getHttpServer())
      .post(`/scenarios/${scenarioId}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", mainSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "سناریو واجد شرایط ورود به بانک داخلی سناریوها است.",
        expectedVersion: 2,
        idempotencyKey: "rev-sc-final-01",
      });
    expect(reviewScenRes.status).toBe(HttpStatus.OK);
    expect(reviewScenRes.body.status).toBe("APPROVED_INTERNAL");

    // 10. Query internal scenario bank (AT-16)
    const bankRes = await request(app.getHttpServer())
      .get("/scenarios/bank")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId);
    expect(bankRes.status).toBe(HttpStatus.OK);
    expect(Array.isArray(bankRes.body)).toBe(true);
    expect(bankRes.body.some((s: any) => s.id === scenarioId)).toBe(true);
  });

  it("Rule D-05 / FR-061 / AT-33: Rollback cascades downstream stages to REVIEW_REQUIRED and blocks scenario approval", async () => {
    // 1. Setup research case
    const createCaseRes = await request(app.getHttpServer())
      .post("/research-cases")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "پرونده بررسی بازگشت مرحله و ابطال وابستگی‌ها",
        code: "RC-M4-ROLLBACK",
        subject: "مدیریت سازمانی",
      });
    const caseId = createCaseRes.body.id;

    // Assign supervisor
    await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        userId: mainSupervisorId,
        role: "MAIN_SUPERVISOR",
      });

    // Fulfill sources
    const resRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/resources`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        type: "INDIVIDUAL",
        title: "منبع تستی",
      });
    const interviewRes = await request(app.getHttpServer())
      .post(`/resources/${resRes.body.id}/interview`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        intervieweeName: "مصاحبه‌شونده",
        intervieweeAge: 38,
        conductedAt: new Date().toISOString(),
      });
    await request(app.getHttpServer())
      .post(`/interviews/${interviewRes.body.id}/reports`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "گزارش منبع",
        content: "متن کامل گزارش مصاحبه تستی برای پیشروی مراحل.",
      });

    // Advance SOURCES -> EXPLANATION
    const adv1 = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 1 });
    expect(adv1.status).toBe(HttpStatus.OK);

    // In EXPLANATION: submit report & supervisor approves (FR-018)
    const explStage = adv1.body.stages.find(
      (s: any) => s.stageType === "EXPLANATION",
    );
    const explSub = await request(app.getHttpServer())
      .post(`/stages/${explStage.id}/submissions`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        content: "گزارش تبیین تستی برای تست بازگشت مرحله",
        expectedVersion: 1,
      });
    await request(app.getHttpServer())
      .post(`/submissions/${explSub.body.id}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", mainSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "تأیید تبیین",
        expectedVersion: 1,
        idempotencyKey: "rev-expl-roll-01",
      });

    // Advance EXPLANATION -> PRESCRIPTION
    const adv2 = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 2 });
    expect(adv2.status).toBe(HttpStatus.OK);

    // In PRESCRIPTION: submit report & supervisor approves (FR-021)
    const presStageItem = adv2.body.stages.find(
      (s: any) => s.stageType === "PRESCRIPTION",
    );
    const presSub = await request(app.getHttpServer())
      .post(`/stages/${presStageItem.id}/submissions`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        content: "گزارش تجویز تستی برای تست بازگشت مرحله",
        expectedVersion: 1,
      });
    await request(app.getHttpServer())
      .post(`/submissions/${presSub.body.id}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", mainSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "تأیید تجویز",
        expectedVersion: 1,
        idempotencyKey: "rev-pres-roll-01",
      });

    // Advance PRESCRIPTION -> SCENARIO
    const adv3 = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 3 });
    expect(adv3.status).toBe(HttpStatus.OK);

    // Create scenario
    const scenRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/scenarios`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        title: "سناریوی تحت تست بازگشت مرحله",
        summary: "چکیده سناریوی وابسته",
        content: "متن کامل سناریوی ارائه‌شده قبل از بازگشت مرحله قبلی.",
      });
    const scenarioId = scenRes.body.id;

    // Submit scenario for review
    await request(app.getHttpServer())
      .post(`/scenarios/${scenarioId}/submit`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({ expectedVersion: 1 });

    // Now, rollback case to EXPLANATION (version was 4 after 3 advances)
    const rollbackRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/rollback-stage`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", researcherUserId)
      .send({
        targetStage: "EXPLANATION",
        reason: "نیاز به بازنگری اساسی در تبیین علّی پدیده (D-05)",
        expectedVersion: 4,
      });
    expect(rollbackRes.status).toBe(HttpStatus.OK);
    // Downstream stages PRESCRIPTION and SCENARIO must be cascaded to REVIEW_REQUIRED
    const presStage = rollbackRes.body.stages.find(
      (s: any) => s.stageType === "PRESCRIPTION",
    );
    expect(presStage.status).toBe("REVIEW_REQUIRED");

    // AT-33: Now supervisor attempts to review and approve the scenario into internal bank.
    // It MUST be blocked with 409 PREREQUISITE_REVIEW_REQUIRED!
    const blockedReviewRes = await request(app.getHttpServer())
      .post(`/scenarios/${scenarioId}/review`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", mainSupervisorId)
      .send({
        decision: "APPROVED",
        reason: "تلاش برای تأیید سناریو هنگام وجود مرحله نیازمند بازبینی",
        expectedVersion: 2,
        idempotencyKey: "rev-attempt-blocked-01",
      });
    expect(blockedReviewRes.status).toBe(HttpStatus.CONFLICT);
    expect(blockedReviewRes.body.code).toBe("PREREQUISITE_REVIEW_REQUIRED");
  });
});
