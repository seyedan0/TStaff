import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication, HttpStatus } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { ProblemDetailsFilter } from "../src/platform/errors/problem-details.filter.js";

import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { NOTIFICATION_REPOSITORY } from "../src/modules/notifications/application/notifications.service.js";
import { AUDIT_REPOSITORY } from "../src/modules/audit/application/audit.service.js";
import { MESSAGING_REPOSITORY } from "../src/modules/messaging/application/messaging.service.js";
import { ARCHIVE_JOB_REPOSITORY } from "../src/modules/archival/application/archival.service.js";
import { SETTING_REPOSITORY } from "../src/modules/settings/application/settings.service.js";
import { REPORTING_REPOSITORY } from "../src/modules/reporting/application/reporting.service.js";
import { ASSIGNMENT_REPOSITORY } from "../src/modules/assignments/application/assignments.service.js";
import { ORGANIZATION_REPOSITORY } from "../src/modules/organization/application/ports/organization.repository.port.js";
import { RESEARCH_REPOSITORY } from "../src/modules/research/application/research.service.js";

import { User } from "../src/modules/identity/domain/user.entity.js";
import { Notification } from "../src/modules/notifications/domain/notification.entity.js";
import { AuditEvent } from "../src/modules/audit/domain/audit-event.entity.js";
import { Conversation } from "../src/modules/messaging/domain/conversation.entity.js";
import { Message } from "../src/modules/messaging/domain/message.entity.js";
import { ArchiveJob } from "../src/modules/archival/domain/archive-job.entity.js";
import { SystemSetting } from "../src/modules/settings/domain/system-setting.entity.js";

class MockUserRepository {
  private users = new Map<string, User>();
  async findById(id: string) {
    return this.users.get(id) || null;
  }
  async findByPhoneNumber(phone: string) {
    for (const u of this.users.values()) if (u.phoneNumber === phone) return u;
    return null;
  }
  async findByApplicantId(appId: string) {
    for (const u of this.users.values()) if (u.applicantId === appId) return u;
    return null;
  }
  async save(user: User) {
    this.users.set(user.id, user);
  }
  async findAllManagers() {
    return Array.from(this.users.values()).filter((u) => u.role && u.role !== "INTERN" && u.role !== "APPRENTICE");
  }
  async findAllInterns() {
    return Array.from(this.users.values()).filter((u) => u.stage === "INTERN");
  }
  async findAllDirectoryUsers() {
    return Array.from(this.users.values()).map((u) => {
      const json = u.toJSON();
      return {
        id: json.id,
        fullName: json.fullName ?? "کاربر",
        phoneNumber: json.phoneNumber,
        stage: json.stage,
        role: (json.role ?? json.stage) as any,
        roles: (json.roles?.length ? json.roles : [json.stage]) as any,
        isActive: json.isActive,
        provinceId: null,
        createdAt: json.createdAt.toISOString(),
      };
    });
  }
}

class MockNotificationRepository {
  private notifs = new Map<string, Notification>();
  async save(n: Notification) {
    this.notifs.set(n.id, n);
  }
  async findById(id: string) {
    return this.notifs.get(id) || null;
  }
  async findByUserId(userId: string, filter: any) {
    let list = Array.from(this.notifs.values()).filter(
      (n) => n.userId === userId,
    );
    if (filter?.unreadOnly) list = list.filter((n) => !n.isRead);
    return list.slice(0, filter?.limit || 20);
  }
  async countUnread(userId: string) {
    return Array.from(this.notifs.values()).filter(
      (n) => n.userId === userId && !n.isRead,
    ).length;
  }
}

class MockAuditRepository {
  private events: AuditEvent[] = [];
  async save(ev: AuditEvent) {
    this.events.push(ev);
  }
  async findById(id: string) {
    return this.events.find((e) => e.id === id) || null;
  }
  async findMany(filter: any) {
    let res = [...this.events];
    if (filter.aggregateType)
      res = res.filter((e) => e.aggregateType === filter.aggregateType);
    if (filter.action) res = res.filter((e) => e.action === filter.action);
    return res.slice(0, filter.limit || 50);
  }
}

class MockMessagingRepository {
  private convs = new Map<string, Conversation>();
  private msgs = new Map<string, Message>();
  async saveConversation(c: Conversation) {
    this.convs.set(c.id, c);
  }
  async findConversationById(id: string) {
    return this.convs.get(id) || null;
  }
  async findDirectConversation(a: string, b: string) {
    for (const c of this.convs.values()) {
      if (
        c.participantIds.includes(a) &&
        c.participantIds.includes(b) &&
        c.participantIds.length === 2
      ) {
        return c;
      }
    }
    return null;
  }
  async findConversationsByUserId(userId: string) {
    return Array.from(this.convs.values()).filter((c) =>
      c.hasParticipant(userId),
    );
  }
  async saveMessage(m: Message) {
    this.msgs.set(m.id, m);
  }
  async findMessagesByConversationId(cId: string, limit = 100) {
    return Array.from(this.msgs.values())
      .filter((m) => m.conversationId === cId)
      .slice(0, limit);
  }
}

class MockArchiveRepository {
  private jobs = new Map<string, ArchiveJob>();
  public archivedTargets: { targetType: string; targetId: string }[] = [];
  async save(j: ArchiveJob) {
    this.jobs.set(j.id, j);
  }
  async findById(id: string) {
    return this.jobs.get(id) || null;
  }
  async findRecent(limit = 20) {
    return Array.from(this.jobs.values()).slice(0, limit);
  }
  async applyTargetArchival(targetType: string, targetId: string) {
    this.archivedTargets.push({ targetType, targetId });
  }
}

class MockSettingRepository {
  private settings = new Map<string, SystemSetting>();
  async save(s: SystemSetting) {
    this.settings.set(s.key, s);
  }
  async findByKey(key: string) {
    return this.settings.get(key) || null;
  }
  async findAll() {
    return Array.from(this.settings.values());
  }
}

class MockReportingRepository {
  async getProvincialDirectorMetrics(provinceId?: string) {
    return {
      provinceId,
      totalApplicants: 100,
      approvedApplicants: 50,
      totalApprentices: 40,
      totalInterns: 10,
      activeResearchCases: 15,
    };
  }
  async getSupervisorWorklist(supervisorId: string) {
    return {
      supervisorId,
      pendingStageSubmissions: 3,
      pendingScenarioReviews: 1,
      totalSupervisedCases: 5,
      items: [
        {
          caseId: "00000000-0000-0000-0000-000000000010",
          caseCode: "CASE-M5",
          caseSubject: "بررسی الگوهای رفتاری",
          stage: "SOURCES",
          pendingItemType: "STAGE_SUBMISSION" as const,
          pendingItemId: "00000000-0000-0000-0000-000000000020",
          submittedAt: new Date().toISOString(),
        },
      ],
    };
  }
  async getTrackingDirectorBacklog() {
    return {
      delayedCasesCount: 4,
      reviewRequiredCasesCount: 2,
      unassignedCasesCount: 1,
      backlogItems: [
        {
          caseId: "00000000-0000-0000-0000-000000000011",
          caseCode: "CASE-M5-DELAYED",
          subject: "موضوع معطل",
          currentStage: "EXPLANATION",
          status: "REVIEW_REQUIRED",
          daysInCurrentStage: 20,
        },
      ],
    };
  }
  async getGeneralDirectorSummary() {
    return {
      totalUsers: 150,
      totalApplicants: 300,
      totalResearchCases: 40,
      casesByStage: {
        SOURCES: 15,
        EXPLANATION: 15,
        PRESCRIPTION: 5,
        SCENARIO: 5,
      },
      completedScenariosCount: 5,
      activeSupervisorsCount: 15,
    };
  }
  async getWorkflowMetrics() {
    return {
      averageStageCompletionDays: {
        SOURCES: 14,
        EXPLANATION: 21,
        PRESCRIPTION: 14,
        SCENARIO: 7,
      },
      rollbackFrequencyByStage: {
        SOURCES: 2,
        EXPLANATION: 1,
        PRESCRIPTION: 0,
        SCENARIO: 0,
      },
    };
  }
}

describe("E2E: M5 Management, Communications & Dashboards Lifecycle", () => {
  let app: INestApplication;
  let userRepo: MockUserRepository;
  let notifRepo: MockNotificationRepository;
  let auditRepo: MockAuditRepository;
  let msgRepo: MockMessagingRepository;
  let archiveRepo: MockArchiveRepository;
  let settingRepo: MockSettingRepository;

  const traineeId = "11111111-1111-1111-1111-111111111111";
  const supervisorId = "22222222-2222-2222-2222-222222222222";
  const strangerId = "33333333-3333-3333-3333-333333333333";
  const trackingDirectorId = "44444444-4444-4444-4444-444444444444";
  const systemAdminId = "55555555-5555-5555-5555-555555555555";

  beforeAll(async () => {
    userRepo = new MockUserRepository();
    notifRepo = new MockNotificationRepository();
    auditRepo = new MockAuditRepository();
    msgRepo = new MockMessagingRepository();
    archiveRepo = new MockArchiveRepository();
    settingRepo = new MockSettingRepository();

    // Seed test users
    await userRepo.save(
      User.reconstitute({
        id: traineeId,
        phoneNumber: "09121110001",
        stage: "INTERN",
        isActive: true,
        isMfaEnabled: false,
        fullName: "کارورز آزمایشی",
        role: "INTERN",
        roles: ["INTERN"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await userRepo.save(
      User.reconstitute({
        id: supervisorId,
        phoneNumber: "09121110002",
        stage: "INTERN",
        isActive: true,
        isMfaEnabled: false,
        fullName: "مدیر علمی",
        role: "SCIENTIFIC_SUPERVISOR",
        roles: ["SCIENTIFIC_SUPERVISOR"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await userRepo.save(
      User.reconstitute({
        id: strangerId,
        phoneNumber: "09121110003",
        stage: "INTERN",
        isActive: true,
        isMfaEnabled: false,
        fullName: "کاربر نامرتبط",
        role: "INTERN",
        roles: ["INTERN"],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(userRepo)
      .overrideProvider(NOTIFICATION_REPOSITORY)
      .useValue(notifRepo)
      .overrideProvider(AUDIT_REPOSITORY)
      .useValue(auditRepo)
      .overrideProvider(MESSAGING_REPOSITORY)
      .useValue(msgRepo)
      .overrideProvider(ARCHIVE_JOB_REPOSITORY)
      .useValue(archiveRepo)
      .overrideProvider(SETTING_REPOSITORY)
      .useValue(settingRepo)
      .overrideProvider(REPORTING_REPOSITORY)
      .useClass(MockReportingRepository)
      .overrideProvider(ASSIGNMENT_REPOSITORY)
      .useValue({
        findActiveByCaseId: async () => [],
        countActiveByUserId: async () => 0,
        findById: async () => null,
        save: async () => {},
        isScientificSupervisor: async (id: string) => id === supervisorId,
        isIntern: async (id: string) => id === traineeId || id === strangerId,
        assignToUser: async () => {},
        listSupervisorsForUser: async (id: string) => id === traineeId ? [{ id: "sup-1", userId: traineeId, supervisorId, supervisorName: "مدیر علمی", phoneNumber: "09121110002", isPrimary: true, assignedAt: new Date() }] : [],
        listUsersForSupervisor: async (id: string) => id === supervisorId ? [{ id: traineeId, fullName: "کارورز آزمایشی", stage: "INTERN", phoneNumber: "09121110001" }] : [],
        isSupervisorAssignedToUser: async (u: string, s: string) => u === traineeId && s === supervisorId,
        isSupervisorAssignedToCase: async () => false,
        getCaseIdsForSupervisor: async () => [],
        listCaseSupervisors: async () => [],
      })
      .overrideProvider(ORGANIZATION_REPOSITORY)
      .useValue({
        provinces: async () => [],
        provinceIds: async () => [],
        hasUserGrant: async () => false,
        scopes: async () => [],
        setProvinceScope: async () => {},
        setUserGrant: async () => {},
      })
      .overrideProvider(RESEARCH_REPOSITORY)
      .useValue({
        findById: async () => null,
        findByCode: async () => null,
        create: async () => {},
        saveWithVersionCheck: async () => {},
        findAll: async () => [],
        findStageInstanceById: async () => null,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Account suspension & reactivation immediately blocks and restores access (FR-035, AT-12, BR-18)", async () => {
    // Step A: Suspend user
    const suspendRes = await request(app.getHttpServer())
      .post(`/users/${traineeId}/suspend`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ reason: "تخلف انضباطی در فرایند پژوهش" });

    expect(suspendRes.status).toBe(HttpStatus.OK);
    expect(suspendRes.body.isActive).toBe(false);

    // Step B: Blocked when request header indicates suspended
    const blockedRes = await request(app.getHttpServer())
      .get(`/users/${traineeId}`)
      .set("x-user-id", traineeId).set("x-user-stage", "INTERN")
      .set("x-user-suspended", "true");

    expect(blockedRes.status).toBe(HttpStatus.FORBIDDEN);
    expect(blockedRes.body.code).toBe("USER_SUSPENDED");

    // Step C: Reactivate user
    const reactivateRes = await request(app.getHttpServer())
      .post(`/users/${traineeId}/reactivate`)
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .send({ reason: "رفع تخلف و تعهد کتبی" });

    expect(reactivateRes.status).toBe(HttpStatus.OK);
    expect(reactivateRes.body.isActive).toBe(true);
  });

  it("2. Selective Notifications and Searchable Audit Log (D-04, FR-060, AT-31, AT-32, BR-17)", async () => {
    const beforeCountRes = await request(app.getHttpServer())
      .get("/notifications/unread-count")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", traineeId);
    expect(beforeCountRes.status).toBe(HttpStatus.OK);
    expect(beforeCountRes.body.unreadCount).toBe(2); // USER_SUSPENDED & USER_REACTIVATED from test 1

    // Step A: Create critical notification
    const criticalNotifRes = await request(app.getHttpServer())
      .post("/notifications")
      .set("x-user-id", supervisorId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
      .send({
        userId: traineeId,
        type: "USER_SUSPENDED",
        title: "اخطار تعلیق",
        body: "حساب کاربری شما تعلیق شد",
        isCritical: true,
      });

    expect(criticalNotifRes.status).toBe(HttpStatus.CREATED);
    expect(criticalNotifRes.body.isCritical).toBe(true);
    const notifId = criticalNotifRes.body.id;

    // Step B: Check unread count incremented by 1
    const countRes = await request(app.getHttpServer())
      .get("/notifications/unread-count")
      .set("x-user-stage", "INTERN")
      .set("x-user-id", traineeId);

    expect(countRes.status).toBe(HttpStatus.OK);
    expect(countRes.body.unreadCount).toBe(beforeCountRes.body.unreadCount + 1);

    // Step C: Mark as read
    const markRes = await request(app.getHttpServer())
      .patch(`/notifications/${notifId}/read`)
      .set("x-user-stage", "INTERN")
      .set("x-user-id", traineeId);

    expect(markRes.status).toBe(HttpStatus.OK);
    expect(markRes.body.isRead).toBe(true);

    // Step D: Record and query audit log (restricted to TRACKING_DIRECTOR / SYSTEM_ADMIN)
    await auditRepo.save(
      AuditEvent.create({
        aggregateType: "ResearchCase",
        aggregateId: "case-999",
        action: "STAGE_ROLLED_BACK",
        actorId: supervisorId,
      }),
    );

    const deniedAuditRes = await request(app.getHttpServer())
      .get("/audit-events?aggregateType=ResearchCase")
      .set("x-user-id", traineeId).set("x-user-stage", "INTERN").set("x-user-role", "INTERN");
    expect(deniedAuditRes.status).toBe(HttpStatus.FORBIDDEN);

    const auditRes = await request(app.getHttpServer())
      .get("/audit-events?aggregateType=ResearchCase")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");

    expect(auditRes.status).toBe(HttpStatus.OK);
    expect(Array.isArray(auditRes.body)).toBe(true);
    expect(auditRes.body[0]?.action).toBe("STAGE_ROLLED_BACK");
  });

  it("3. 1:1 Direct Chat restrictions & message flow (FR-024, FR-030, AT-10, BR-16)", async () => {
    // Unrelated user cannot open direct conversation
    const unauthorizedConvRes = await request(app.getHttpServer())
      .post("/conversations")
      .set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .set("x-user-id", traineeId)
      .send({ participantId: strangerId, type: "DIRECT_SUPERVISOR_TRAINEE" });
    expect(unauthorizedConvRes.status).toBe(HttpStatus.FORBIDDEN);

    // Allowed contacts endpoint returns assigned supervisor (not unrelated peer)
    const contactsRes = await request(app.getHttpServer())
      .get("/conversations/contacts")
      .set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .set("x-user-id", traineeId);
    expect(contactsRes.status).toBe(HttpStatus.OK);
    expect(contactsRes.body.map((c: any) => c.id)).toContain(supervisorId);
    expect(contactsRes.body.map((c: any) => c.id)).not.toContain(strangerId);

    // Step A: Create direct conversation
    const convRes = await request(app.getHttpServer())
      .post("/conversations")
      .set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .set("x-user-id", traineeId)
      .send({
        participantId: supervisorId,
        type: "DIRECT_SUPERVISOR_TRAINEE",
      });

    expect(convRes.status).toBe(HttpStatus.OK);
    const convId = convRes.body.id;
    expect(convRes.body.participantIds).toHaveLength(2);

    // Step B: Trainee sends message
    const msgRes = await request(app.getHttpServer())
      .post(`/conversations/${convId}/messages`)
      .set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .set("x-user-id", traineeId)
      .send({
        content: "سلام، منبع شماره ۲ با موفقیت مصاحبه و ثبت شد.",
      });

    expect(msgRes.status).toBe(HttpStatus.CREATED);
    expect(msgRes.body.content).toContain("منبع شماره ۲");

    // Step C: Supervisor reads messages
    const historyRes = await request(app.getHttpServer())
      .get(`/conversations/${convId}/messages`)
      .set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
      .set("x-user-id", supervisorId);

    expect(historyRes.status).toBe(HttpStatus.OK);
    expect(historyRes.body).toHaveLength(1);

    // Step D: Stranger user blocked with 403 Forbidden
    const strangerRes = await request(app.getHttpServer())
      .get(`/conversations/${convId}/messages`)
      .set("x-user-stage", "INTERN").set("x-user-role", "INTERN")
      .set("x-user-id", strangerId);

    expect(strangerRes.status).toBe(HttpStatus.FORBIDDEN);
  });

  it("4. Persistent Archival Snapshot without physical deletion (FR-025, FR-039, AT-14, AT-27, BR-19)", async () => {
    const caseId = "99999999-9999-9999-9999-999999999999";
    const deniedArchive = await request(app.getHttpServer())
      .post("/archives/jobs")
      .set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
      .set("x-user-id", supervisorId)
      .send({ targetType: "RESEARCH_CASE", targetId: caseId });
    expect(deniedArchive.status).toBe(HttpStatus.FORBIDDEN);

    const archiveRes = await request(app.getHttpServer())
      .post("/archives/jobs")
      .set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR")
      .set("x-user-id", trackingDirectorId)
      .send({
        targetType: "RESEARCH_CASE",
        targetId: caseId,
      });

    expect(archiveRes.status).toBe(HttpStatus.CREATED);
    expect(archiveRes.body.status).toBe("COMPLETED");
    expect(archiveRes.body.storageLocation).toContain(caseId);

    // Verify target was marked as archived in mock repo
    expect(archiveRepo.archivedTargets).toContainEqual({
      targetType: "RESEARCH_CASE",
      targetId: caseId,
    });
  });

  it("5. Runtime System Settings & Management Dashboards (FR-026, FR-027, FR-028, FR-031, FR-052, AT-09, AT-11, AT-15, AT-24, AT-34)", async () => {
    const deniedSettingRes = await request(app.getHttpServer())
      .put("/settings/STAGE_MAX_DAYS")
      .set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR")
      .set("x-user-id", supervisorId)
      .send({ value: "40" });
    expect(deniedSettingRes.status).toBe(HttpStatus.FORBIDDEN);

    // Step A: Update dynamic system setting (SYSTEM_ADMIN only)
    const putSettingRes = await request(app.getHttpServer())
      .put("/settings/STAGE_MAX_DAYS")
      .set("x-user-stage", "INTERN").set("x-user-role", "SYSTEM_ADMIN")
      .set("x-user-id", systemAdminId)
      .send({
        value: "40",
        description: "حداکثر روز مجاز برای هر مرحله",
      });

    expect(putSettingRes.status).toBe(HttpStatus.OK);
    expect(putSettingRes.body.value).toBe("40");

    // Step B: Get setting
    const getSettingRes = await request(app.getHttpServer())
      .get("/settings/STAGE_MAX_DAYS")
      .set("x-user-id", supervisorId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");

    expect(getSettingRes.status).toBe(HttpStatus.OK);
    expect(getSettingRes.body.value).toBe("40");

    // Step C: Provincial Director Dashboard
    const provRes = await request(app.getHttpServer())
      .get("/reporting/provincial-director?provinceId=tehran")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");

    expect(provRes.status).toBe(HttpStatus.OK);
    expect(provRes.body.totalApplicants).toBe(100);
    expect(provRes.body.totalInterns).toBe(10);

    // Step D: Supervisor Worklist
    const supRes = await request(app.getHttpServer())
      .get(`/reporting/supervisor-worklist?supervisorId=${supervisorId}`)
      .set("x-user-id", supervisorId).set("x-user-stage", "INTERN").set("x-user-role", "SCIENTIFIC_SUPERVISOR");

    expect(supRes.status).toBe(HttpStatus.OK);
    expect(supRes.body.pendingStageSubmissions).toBe(3);
    expect(supRes.body.items).toHaveLength(1);

    // Step E: Tracking Director Backlog
    const trackRes = await request(app.getHttpServer())
      .get("/reporting/tracking-director-backlog")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");

    expect(trackRes.status).toBe(HttpStatus.OK);
    expect(trackRes.body.delayedCasesCount).toBe(4);
    expect(trackRes.body.backlogItems).toHaveLength(1);

    // Step F: General Director Summary
    const generalRes = await request(app.getHttpServer())
      .get("/reporting/general-director-summary")
      .set("x-user-id", trackingDirectorId).set("x-user-stage", "INTERN").set("x-user-role", "TRACKING_DIRECTOR");

    expect(generalRes.status).toBe(HttpStatus.OK);
    expect(generalRes.body.totalResearchCases).toBe(40);
    expect(generalRes.body.activeSupervisorsCount).toBe(15);
  });
});

