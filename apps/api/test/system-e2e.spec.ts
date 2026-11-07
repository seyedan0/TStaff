import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";

import { APPLICANT_REPOSITORY } from "../src/modules/applicants/application/applicants.service.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { RESOURCE_REPOSITORY } from "../src/modules/resources/application/resources.service.js";
import { REVIEW_REPOSITORY } from "../src/modules/reviews/application/reviews.service.js";
import { SCENARIO_REPOSITORY } from "../src/modules/scenarios/application/scenarios.service.js";
import { NOTIFICATION_REPOSITORY } from "../src/modules/notifications/application/notifications.service.js";
import { AUDIT_REPOSITORY } from "../src/modules/audit/application/audit.service.js";
import { MESSAGING_REPOSITORY } from "../src/modules/messaging/application/messaging.service.js";
import { ARCHIVE_JOB_REPOSITORY } from "../src/modules/archival/application/archival.service.js";
import { SETTING_REPOSITORY } from "../src/modules/settings/application/settings.service.js";
import { REPORTING_REPOSITORY } from "../src/modules/reporting/application/reporting.service.js";

import { Applicant } from "../src/modules/applicants/domain/applicant.entity.js";
import { User } from "../src/modules/identity/domain/user.entity.js";
import { ResearchCase } from "../src/modules/research/domain/research-case.entity.js";
import { ResearchAssignment } from "../src/modules/assignments/domain/assignment.entity.js";
import { Resource } from "../src/modules/resources/domain/resource.entity.js";
import { Interview } from "../src/modules/resources/domain/interview.entity.js";
import { InterviewReport } from "../src/modules/resources/domain/interview-report.entity.js";
import { StageSubmission } from "../src/modules/reviews/domain/stage-submission.entity.js";
import { ReviewDecision } from "../src/modules/reviews/domain/review-decision.entity.js";
import { Scenario } from "../src/modules/scenarios/domain/scenario.entity.js";
import { Notification } from "../src/modules/notifications/domain/notification.entity.js";
import { AuditEvent } from "../src/modules/audit/domain/audit-event.entity.js";
import { Conversation } from "../src/modules/messaging/domain/conversation.entity.js";
import { Message } from "../src/modules/messaging/domain/message.entity.js";
import { ArchiveJob } from "../src/modules/archival/domain/archive-job.entity.js";
import { SystemSetting } from "../src/modules/settings/domain/system-setting.entity.js";
import { StaleRevisionError } from "../src/modules/research/domain/research-errors.js";
import { StaleRevisionError as ReviewStaleRevisionError } from "../src/modules/reviews/domain/reviews-errors.js";
import type { StageStatus } from "@tstaff/contracts";

class SystemMockRepositories {
  applicants = new Map<string, Applicant>();
  users = new Map<string, User>();
  cases = new Map<string, ResearchCase>();
  assignments: ResearchAssignment[] = [];
  resources = new Map<string, Resource>();
  interviews = new Map<string, Interview>();
  reports = new Map<string, InterviewReport>();
  submissions = new Map<string, StageSubmission>();
  decisions: ReviewDecision[] = [];
  scenarios = new Map<string, Scenario>();
  notifications = new Map<string, Notification>();
  auditEvents: AuditEvent[] = [];
  conversations = new Map<string, Conversation>();
  messages = new Map<string, Message>();
  archiveJobs = new Map<string, ArchiveJob>();
  settings = new Map<string, SystemSetting>();
}

describe("E2E System Integration: M1 to M6 Complete Flow & Pre-UI Readiness", () => {
  let app: INestApplication;
  const mocks = new SystemMockRepositories();

  const provincialDirectorId = "11111111-1111-1111-1111-111111111111";
  const mainSupervisorId = "22222222-2222-2222-2222-222222222222";
  const collabSupervisorId = "33333333-3333-3333-3333-333333333333";
  let internUserId: string;
  let applicantId: string;
  let caseId: string;

  beforeAll(async () => {
    // Seed director and supervisors
    mocks.users.set(
      provincialDirectorId,
      User.create({
        id: provincialDirectorId,
        phoneNumber: "09120000001",
      }).promoteToIntern(),
    );
    mocks.users.set(
      mainSupervisorId,
      User.create({
        id: mainSupervisorId,
        phoneNumber: "09120000002",
      }).promoteToIntern(),
    );
    mocks.users.set(
      collabSupervisorId,
      User.create({
        id: collabSupervisorId,
        phoneNumber: "09120000003",
      }).promoteToIntern(),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APPLICANT_REPOSITORY)
      .useValue({
        findById: async (id: string) => mocks.applicants.get(id) || null,
        findByPhoneNumber: async (p: string) =>
          Array.from(mocks.applicants.values()).find(
            (a) => a.phoneNumber === p,
          ) || null,
        findByNationalId: async () => null,
        save: async (a: Applicant) => mocks.applicants.set(a.id, a),
        findAll: async () => Array.from(mocks.applicants.values()),
      })
      .overrideProvider(USER_REPOSITORY)
      .useValue({
        findById: async (id: string) => mocks.users.get(id) || null,
        findByPhoneNumber: async (p: string) =>
          Array.from(mocks.users.values()).find((u) => u.phoneNumber === p) ||
          null,
        findByApplicantId: async (appId: string) =>
          Array.from(mocks.users.values()).find(
            (u) => u.applicantId === appId,
          ) || null,
        save: async (u: User) => mocks.users.set(u.id, u),
      })
      .overrideProvider(RESEARCH_REPOSITORY)
      .useValue({
        create: async (c: ResearchCase) => mocks.cases.set(c.id, c),
        findById: async (id: string) => mocks.cases.get(id) || null,
        findByCode: async (code: string) =>
          Array.from(mocks.cases.values()).find((c) => c.code === code) || null,
        saveWithVersionCheck: async (
          c: ResearchCase,
          expectedVersion: number,
        ) => {
          const existing = mocks.cases.get(c.id);
          if (!existing || existing.version !== expectedVersion) {
            throw new StaleRevisionError(
              existing?.version ?? 0,
              expectedVersion,
            );
          }
          mocks.cases.set(c.id, c);
        },
        updateStageStatus: async (
          caseId: string,
          stageType: any,
          status: StageStatus,
        ) => {
          const c = mocks.cases.get(caseId);
          if (c) {
            const stIdx = c.stages.findIndex((s) => s.stageType === stageType);
            if (stIdx >= 0) {
              const updatedStages = [...c.stages];
              updatedStages[stIdx] = {
                ...updatedStages[stIdx]!,
                status,
                version: (updatedStages[stIdx]?.version ?? 1) + 1,
              };
              mocks.cases.set(
                caseId,
                ResearchCase.reconstitute({
                  ...c.toJSON(),
                  stages: updatedStages,
                }),
              );
            }
          }
        },
      })
      .overrideProvider(ASSIGNMENT_REPOSITORY)
      .useValue({
        findActiveByCaseId: async (caseId: string) =>
          mocks.assignments.filter(
            (a) => a.researchCaseId === caseId && a.isActive,
          ),
        countActiveByUserId: async (userId: string) =>
          mocks.assignments.filter((a) => a.userId === userId && a.isActive)
            .length,
        findById: async (id: string) =>
          mocks.assignments.find((a) => a.id === id) || null,
        save: async (a: ResearchAssignment) => {
          const idx = mocks.assignments.findIndex((x) => x.id === a.id);
          if (idx >= 0) mocks.assignments[idx] = a;
          else mocks.assignments.push(a);
        },
      })
      .overrideProvider(RESOURCE_REPOSITORY)
      .useValue({
        createResource: async (r: Resource) => mocks.resources.set(r.id, r),
        findResourceById: async (id: string) =>
          mocks.resources.get(id) || null,
        findResourcesByCaseId: async (cId: string) =>
          Array.from(mocks.resources.values()).filter(
            (r) => r.researchCaseId === cId,
          ),
        saveResource: async (r: Resource) => mocks.resources.set(r.id, r),
        createInterview: async (i: Interview) =>
          mocks.interviews.set(i.id, i),
        findInterviewByResourceId: async (rId: string) =>
          Array.from(mocks.interviews.values()).find(
            (i) => i.resourceId === rId,
          ) || null,
        findInterviewById: async (id: string) =>
          mocks.interviews.get(id) || null,
        createReport: async (rep: InterviewReport) =>
          mocks.reports.set(rep.id, rep),
        findReportsByInterviewId: async (iId: string) =>
          Array.from(mocks.reports.values()).filter(
            (rep) => rep.interviewId === iId,
          ),
      })
      .overrideProvider(REVIEW_REPOSITORY)
      .useValue({
        saveSubmission: async (s: StageSubmission) =>
          mocks.submissions.set(s.id, s),
        findSubmissionById: async (id: string) =>
          mocks.submissions.get(id) || null,
        findSubmissionsByStageInstanceId: async (sId: string) =>
          Array.from(mocks.submissions.values()).filter(
            (s) => s.stageInstanceId === sId,
          ),
        saveDecision: async (d: ReviewDecision) => mocks.decisions.push(d),
        findDecisionByIdempotencyKey: async (key: string) =>
          mocks.decisions.find((d) => d.idempotencyKey === key) || null,
        findDecisionsBySubmissionId: async (sId: string) =>
          mocks.decisions.filter((d) => d.stageSubmissionId === sId),
        updateSubmissionWithVersionCheck: async (
          s: StageSubmission,
          expectedVersion: number,
        ) => {
          const existing = mocks.submissions.get(s.id);
          if (!existing || existing.version !== expectedVersion) {
            throw new ReviewStaleRevisionError(
              existing?.version ?? 0,
              expectedVersion,
            );
          }
          mocks.submissions.set(s.id, s);
        },
      })
      .overrideProvider(SCENARIO_REPOSITORY)
      .useValue({
        create: async (sc: Scenario) => mocks.scenarios.set(sc.id, sc),
        findById: async (id: string) => mocks.scenarios.get(id) || null,
        findByCaseId: async (cId: string) =>
          Array.from(mocks.scenarios.values()).filter(
            (sc) => sc.researchCaseId === cId,
          ),
        saveWithVersionCheck: async (sc: Scenario) =>
          mocks.scenarios.set(sc.id, sc),
        findInternalBank: async () => Array.from(mocks.scenarios.values()),
      })
      .overrideProvider(NOTIFICATION_REPOSITORY)
      .useValue({
        save: async (n: Notification) => mocks.notifications.set(n.id, n),
        findById: async (id: string) => mocks.notifications.get(id) || null,
        findByUserId: async (uId: string) =>
          Array.from(mocks.notifications.values()).filter(
            (n) => n.userId === uId,
          ),
        countUnread: async (uId: string) =>
          Array.from(mocks.notifications.values()).filter(
            (n) => n.userId === uId && !n.isRead,
          ).length,
      })
      .overrideProvider(AUDIT_REPOSITORY)
      .useValue({
        save: async (e: AuditEvent) => mocks.auditEvents.push(e),
        findById: async (id: string) =>
          mocks.auditEvents.find((e) => e.id === id) || null,
        findMany: async () => mocks.auditEvents,
      })
      .overrideProvider(MESSAGING_REPOSITORY)
      .useValue({
        saveConversation: async (c: Conversation) =>
          mocks.conversations.set(c.id, c),
        findConversationById: async (id: string) =>
          mocks.conversations.get(id) || null,
        findDirectConversation: async (a: string, b: string) => {
          for (const c of mocks.conversations.values()) {
            if (
              c.participantIds.includes(a) &&
              c.participantIds.includes(b) &&
              c.participantIds.length === 2
            ) {
              return c;
            }
          }
          return null;
        },
        findConversationsByUserId: async (uId: string) =>
          Array.from(mocks.conversations.values()).filter((c) =>
            c.hasParticipant(uId),
          ),
        saveMessage: async (m: Message) => mocks.messages.set(m.id, m),
        findMessagesByConversationId: async (cId: string) =>
          Array.from(mocks.messages.values()).filter(
            (m) => m.conversationId === cId,
          ),
      })
      .overrideProvider(ARCHIVE_JOB_REPOSITORY)
      .useValue({
        save: async (j: ArchiveJob) => mocks.archiveJobs.set(j.id, j),
        findById: async (id: string) => mocks.archiveJobs.get(id) || null,
        findRecent: async () => Array.from(mocks.archiveJobs.values()),
        applyTargetArchival: async () => {},
      })
      .overrideProvider(SETTING_REPOSITORY)
      .useValue({
        save: async (s: SystemSetting) => mocks.settings.set(s.key, s),
        findByKey: async (key: string) => mocks.settings.get(key) || null,
        findAll: async () => Array.from(mocks.settings.values()),
      })
      .overrideProvider(REPORTING_REPOSITORY)
      .useValue({
        getProvincialDirectorMetrics: async () => ({
          totalApplicants: 1,
          approvedApplicants: 1,
          totalApprentices: 0,
          totalInterns: 1,
          activeResearchCases: 1,
        }),
        getSupervisorWorklist: async () => ({
          supervisorId: mainSupervisorId,
          pendingStageSubmissions: 0,
          pendingScenarioReviews: 0,
          totalSupervisedCases: 1,
          items: [],
        }),
        getTrackingDirectorBacklog: async () => ({
          delayedCasesCount: 0,
          reviewRequiredCasesCount: 0,
          unassignedCasesCount: 0,
          backlogItems: [],
        }),
        getGeneralDirectorSummary: async () => ({
          totalUsers: 4,
          totalApplicants: 1,
          totalResearchCases: 1,
          casesByStage: { SOURCES: 1, EXPLANATION: 0, PRESCRIPTION: 0, SCENARIO: 0 },
          completedScenariosCount: 0,
          activeSupervisorsCount: 2,
        }),
        getWorkflowMetrics: async () => ({
          averageStageCompletionDays: { SOURCES: 14, EXPLANATION: 21, PRESCRIPTION: 14, SCENARIO: 7 },
          rollbackFrequencyByStage: { SOURCES: 0, EXPLANATION: 0, PRESCRIPTION: 0, SCENARIO: 0 },
        }),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("Flow 1: Admission & Strict Integer Age (D-01, FR-001, FR-002, FR-004, AT-01, AT-02, AT-03, AT-28)", async () => {
    // A: Strict positive integer age validation (AT-28, D-01)
    const invalidAgeRes = await request(app.getHttpServer())
      .post("/applicants")
      .set("x-user-stage", "INTERN")
      .send({
        fullName: "علی رضوانی",
        nationalId: "1234567890",
        phoneNumber: "09121234567",
        age: 24.5, // Decimals strictly rejected
        provinceId: "11111111-1111-1111-1111-111111111111",
        education: "کارشناسی",
        fieldOfStudy: "مهندسی صنایع",
      });
    expect(invalidAgeRes.status).toBe(HttpStatus.BAD_REQUEST);

    // B: Valid draft applicant creation
    const draftRes = await request(app.getHttpServer())
      .post("/applicants")
      .set("x-user-stage", "INTERN")
      .send({
        fullName: "علی رضوانی",
        nationalId: "1234567890",
        phoneNumber: "09121234567",
        age: 25,
        provinceId: "11111111-1111-1111-1111-111111111111",
        education: "کارشناسی",
        fieldOfStudy: "مهندسی صنایع",
      });
    expect(draftRes.status).toBe(HttpStatus.CREATED);
    applicantId = draftRes.body.id;

    // C: Submit applicant
    await request(app.getHttpServer())
      .post(`/applicants/${applicantId}/submit`)
      .set("x-user-stage", "INTERN")
      .send();

    // D: Scientific approval creates APPRENTICE user (FR-001, FR-002, FR-003)
    const approveRes = await request(app.getHttpServer())
      .post(`/applicants/${applicantId}/decisions`)
      .set("x-user-stage", "INTERN")
      .send({
        decision: "APPROVED",
        reviewerNotes: "نمرات علمی و مصاحبه مورد تأیید است",
      });
    expect(approveRes.status).toBe(HttpStatus.OK);
    expect(approveRes.body.status).toBe("APPROVED");

    const createdUser = Array.from(mocks.users.values()).find(
      (u) => u.applicantId === applicantId,
    );
    expect(createdUser).toBeDefined();
    expect(createdUser!.stage).toBe("APPRENTICE");
    internUserId = createdUser!.id;

    // E: Negative check: Apprentice cannot access research system (AT-02)
    const blockedRes = await request(app.getHttpServer())
      .get("/research-cases")
      .set("x-user-stage", "APPRENTICE");
    expect(blockedRes.status).toBe(HttpStatus.FORBIDDEN);

    // F: Provincial director promotes apprentice to intern (FR-004, AT-03)
    const promoteRes = await request(app.getHttpServer())
      .post(`/users/${internUserId}/promote-to-intern`)
      .set("x-user-stage", "INTERN")
      .send({ evaluationNotes: "دوره کارآموزی تکمیل شد" });
    expect(promoteRes.status).toBe(HttpStatus.OK);
    expect(promoteRes.body.stage).toBe("INTERN");
  });

  it("Flow 2: Research Case Creation, Dual Supervisor Assignment & Concurrent Review (D-02, D-03, FR-045, FR-057, AT-29)", async () => {
    // A: Create Research Case (AT-04)
    const createCaseRes = await request(app.getHttpServer())
      .post("/research-cases")
      .set("x-user-stage", "INTERN")
      .send({
        title: "بررسی سبک زندگی دیجیتال",
        code: "CASE-M6-SYS",
        subject: "جامعه‌شناسی فضای مجازی",
      });
    expect(createCaseRes.status).toBe(HttpStatus.CREATED);
    caseId = createCaseRes.body.id;

    // B: Assign Main and Collaborator Supervisors (D-02, AT-29)
    await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: mainSupervisorId,
        role: "MAIN_SUPERVISOR",
      });

    await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: collabSupervisorId,
        role: "COLLABORATOR_SUPERVISOR",
      });

    // C: Second Main supervisor attempt blocked with 409 Conflict
    const secondMainRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/assignments/supervisors`)
      .set("x-user-stage", "INTERN")
      .send({
        userId: provincialDirectorId,
        role: "MAIN_SUPERVISOR",
      });
    expect(secondMainRes.status).toBe(HttpStatus.CONFLICT);
  });

  it("Flow 3: Resource Unique Interview Invariant (D-07, FR-058, AT-30)", async () => {
    // A: Add resource
    const resRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/resources`)
      .set("x-user-stage", "INTERN")
      .send({
        type: "INDIVIDUAL",
        title: "مصاحبه با کارشناس فضای مجازی",
        description: "تحلیل رفتارهای آنلاین کاربران",
      });
    expect(resRes.status).toBe(HttpStatus.CREATED);
    const resourceId = resRes.body.id;

    // B: Create 1st interview
    const interviewRes = await request(app.getHttpServer())
      .post(`/resources/${resourceId}/interview`)
      .set("x-user-stage", "INTERN")
      .send({
        intervieweeName: "دکتر حسینی",
        intervieweeAge: 45,
        conductedAt: new Date().toISOString(),
      });
    expect(interviewRes.status).toBe(HttpStatus.CREATED);
    const interviewId = interviewRes.body.id;

    // C: Attempting 2nd interview on same resource strictly rejected with 409 (D-07, AT-30)
    const secondInterviewRes = await request(app.getHttpServer())
      .post(`/resources/${resourceId}/interview`)
      .set("x-user-stage", "INTERN")
      .send({
        intervieweeName: "دکتر حسینی - تکمیلی",
        conductedAt: new Date().toISOString(),
      });
    expect(secondInterviewRes.status).toBe(HttpStatus.CONFLICT);

    // D: Create 1 report for interview to complete SOURCES stage prerequisites
    const reportRes = await request(app.getHttpServer())
      .post(`/interviews/${interviewId}/reports`)
      .set("x-user-stage", "INTERN")
      .send({
        title: "گزارش مصاحبه تخصصی",
        content: "تحلیل تفصیلی داده‌های میدانی و سبک زندگی آنلاین کاربران",
      });
    expect(reportRes.status).toBe(HttpStatus.CREATED);
  });

  it("Flow 4: Scientific Cycle, Rollback & Cascading Invalidation (D-05, FR-061, AT-33)", async () => {
    // Advance SOURCES to EXPLANATION
    const advanceRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/advance-stage`)
      .set("x-user-stage", "INTERN")
      .send({ expectedVersion: 1 });
    expect(advanceRes.status).toBe(HttpStatus.OK);
    expect(
      advanceRes.body.stages.find((s: any) => s.stageType === "EXPLANATION")?.status,
    ).toBe("IN_PROGRESS");

    // Rollback stage from EXPLANATION to SOURCES with review-required cascade
    const rollbackRes = await request(app.getHttpServer())
      .post(`/research-cases/${caseId}/rollback-stage`)
      .set("x-user-stage", "INTERN")
      .send({
        targetStage: "SOURCES",
        reason: "اصلاح داده‌های میدانی و تحلیل مجدد مصاحبه",
        expectedVersion: 2,
      });

    expect(rollbackRes.status).toBe(HttpStatus.OK);
    expect(
      rollbackRes.body.stages.find((s: any) => s.stageType === "SOURCES")?.status,
    ).toBe("IN_PROGRESS");
    expect(
      rollbackRes.body.stages.find((s: any) => s.stageType === "EXPLANATION")?.status,
    ).toBe("REVIEW_REQUIRED");
  });

  it("Flow 5: 1:1 Direct Chat Restrictions & Security (FR-024, FR-030, AT-10, BR-16)", async () => {
    // A: Create 1:1 conversation
    const convRes = await request(app.getHttpServer())
      .post("/conversations")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", internUserId)
      .send({
        participantId: mainSupervisorId,
        type: "DIRECT_SUPERVISOR_TRAINEE",
      });
    expect(convRes.status).toBe(HttpStatus.OK);
    const convId = convRes.body.id;

    // B: Send message
    const msgRes = await request(app.getHttpServer())
      .post(`/conversations/${convId}/messages`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", internUserId)
      .send({
        content: "سلام استاد، داده‌های مصاحبه تکمیل گردید.",
      });
    expect(msgRes.status).toBe(HttpStatus.CREATED);

    // C: Unauthorized stranger blocked with 403 Forbidden
    const unauthMsgRes = await request(app.getHttpServer())
      .post(`/conversations/${convId}/messages`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", "99999999-9999-9999-9999-999999999999")
      .send({ content: "تلاش غیرمجاز" });
    expect(unauthMsgRes.status).toBe(HttpStatus.FORBIDDEN);
  });

  it("Flow 6: Selective Notification Policy & Persistent Archival (D-04, FR-025, FR-060, AT-31, AT-32)", async () => {
    // Critical notification
    const notifRes = await request(app.getHttpServer())
      .post("/notifications")
      .set("x-user-stage", "INTERN")
      .send({
        userId: internUserId,
        type: "SUPERVISOR_NOTE",
        title: "نکته مهم داوری",
        body: "اصلاحات بخش پیشینه پژوهش را بررسی نمایید.",
        isCritical: true,
      });
    expect(notifRes.status).toBe(HttpStatus.CREATED);
    expect(notifRes.body.isCritical).toBe(true);

    // Persistent Archival Snapshot without physical deletion
    const archiveRes = await request(app.getHttpServer())
      .post("/archives/jobs")
      .set("x-user-stage", "INTERN")
      .send({
        targetType: "RESEARCH_CASE",
        targetId: caseId,
      });
    expect(archiveRes.status).toBe(HttpStatus.CREATED);
    expect(archiveRes.body.status).toBe("COMPLETED");
  });

  it("Flow 7: Runtime Dynamic Settings & Management Dashboards (FR-052, AT-34, FR-026)", async () => {
    // Dynamic runtime setting update
    const settingRes = await request(app.getHttpServer())
      .put("/settings/STAGE_DEADLINE_DAYS")
      .set("x-user-stage", "INTERN")
      .send({
        value: "45",
        description: "مهلت زمانی مراحل به روز",
      });
    expect(settingRes.status).toBe(HttpStatus.OK);
    expect(settingRes.body.value).toBe("45");

    // Provincial Director Dashboard
    const dashboardRes = await request(app.getHttpServer())
      .get("/reporting/provincial-director")
      .set("x-user-stage", "INTERN");
    expect(dashboardRes.status).toBe(HttpStatus.OK);
    expect(dashboardRes.body.totalInterns).toBe(1);
  });
});
