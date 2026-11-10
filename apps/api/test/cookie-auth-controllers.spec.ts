import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { HttpStatus, type ExecutionContext, type INestApplication } from "@nestjs/common";
import request from "supertest";
import { MessagingController } from "../src/modules/messaging/presentation/messaging.controller.js";
import { MessagingService } from "../src/modules/messaging/application/messaging.service.js";
import { NotificationsController } from "../src/modules/notifications/presentation/notifications.controller.js";
import { NotificationsService } from "../src/modules/notifications/application/notifications.service.js";
import { SettingsController } from "../src/modules/settings/presentation/settings.controller.js";
import { SettingsService } from "../src/modules/settings/application/settings.service.js";
import { ArchivalController } from "../src/modules/archival/presentation/archival.controller.js";
import { ArchivalService } from "../src/modules/archival/application/archival.service.js";
import { ReportingController } from "../src/modules/reporting/presentation/reporting.controller.js";
import { ReportingService } from "../src/modules/reporting/application/reporting.service.js";
import { StageGuard } from "../src/platform/security/stage.guard.js";

const SESSION_USER_ID = "d0000000-0000-4000-8000-000000000001";
const PEER_USER_ID = "d0000000-0000-4000-8000-000000000002";
const TARGET_ID = "d0000000-0000-4000-8000-000000000003";

describe("Cookie-Session Controller Actor Resolution (No x-user-id header)", () => {
  let app: INestApplication;

  const messagingService = {
    getContacts: vi.fn(async () => []),
    getUserConversations: vi.fn(async () => []),
    enrichConversations: vi.fn(async () => []),
    getConversationMessages: vi.fn(async () => []),
    sendMessage: vi.fn(async (_id: string, _senderId: string, dto: { content: string }) => ({
      toJSON: () => ({ id: "msg-1", content: dto.content, senderId: SESSION_USER_ID }),
    })),
    createOrGetDirectConversation: vi.fn(async () => ({
      toJSON: () => ({ id: "conv-1" }),
    })),
    getConversationById: vi.fn(async () => ({ toJSON: () => ({ id: "conv-1" }) })),
  };

  const notificationsService = {
    getUserNotifications: vi.fn(async () => []),
    getUnreadCount: vi.fn(async () => ({ unreadCount: 3 })),
    markAsRead: vi.fn(async (id: string) => ({ toJSON: () => ({ id, isRead: true }) })),
    createNotification: vi.fn(async () => ({ toJSON: () => ({ id: "n-1" }) })),
  };

  const settingsService = {
    getAllSettings: vi.fn(async () => []),
    getSetting: vi.fn(async () => ({ toJSON: () => ({ key: "k", value: "v" }) })),
    updateSetting: vi.fn(async (key: string, dto: { value: string }, updatedBy?: string) => ({
      toJSON: () => ({ key, value: dto.value, updatedBy }),
    })),
  };

  const archivalService = {
    createAndProcessArchiveJob: vi.fn(async (dto: any, actorId?: string) => ({
      toJSON: () => ({ id: "job-1", ...dto, actorId, status: "COMPLETED" }),
    })),
    listRecentJobs: vi.fn(async () => []),
    getJobById: vi.fn(async () => ({ toJSON: () => ({ id: "job-1" }) })),
  };

  const reportingService = {
    getProvincialDirectorMetrics: vi.fn(async () => ({})),
    getSupervisorWorklist: vi.fn(async (supervisorId: string) => ({
      supervisorId,
      pendingStageSubmissions: 0,
      pendingScenarioReviews: 0,
      totalSupervisedCases: 0,
      items: [],
    })),
    getTrackingDirectorBacklog: vi.fn(async () => ({})),
    getGeneralDirectorSummary: vi.fn(async () => ({})),
    getWorkflowMetrics: vi.fn(async () => ({})),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [
        MessagingController,
        NotificationsController,
        SettingsController,
        ArchivalController,
        ReportingController,
      ],
      providers: [
        { provide: MessagingService, useValue: messagingService },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: SettingsService, useValue: settingsService },
        { provide: ArchivalService, useValue: archivalService },
        { provide: ReportingService, useValue: reportingService },
      ],
    })
      .overrideGuard(StageGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: SESSION_USER_ID,
            stage: "INTERN",
            role: "SYSTEM_ADMIN",
            roles: ["SYSTEM_ADMIN", "SCIENTIFIC_SUPERVISOR"],
            isActive: true,
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("resolves user identity from request.user.id across all five controllers without x-user-id header", async () => {
    const server = app.getHttpServer();

    const contacts = await request(server).get("/conversations/contacts");
    expect(contacts.status).toBe(HttpStatus.OK);
    expect(messagingService.getContacts).toHaveBeenCalledWith(SESSION_USER_ID, ["SYSTEM_ADMIN", "SCIENTIFIC_SUPERVISOR"]);

    const convList = await request(server).get("/conversations");
    expect(convList.status).toBe(HttpStatus.OK);
    expect(messagingService.getUserConversations).toHaveBeenCalledWith(SESSION_USER_ID);

    const createdConv = await request(server).post("/conversations").send({ participantId: PEER_USER_ID, type: "DIRECT_SUPERVISOR_TRAINEE" });
    expect(createdConv.status).toBe(HttpStatus.OK);

    const msgs = await request(server).get("/conversations/conv-1/messages");
    expect(msgs.status).toBe(HttpStatus.OK);
    expect(messagingService.getConversationMessages).toHaveBeenCalledWith("conv-1", SESSION_USER_ID, 100);

    const sent = await request(server).post("/conversations/conv-1/messages").send({ content: "سلام همکار گرامی" });
    expect(sent.status).toBe(HttpStatus.CREATED);
    expect(messagingService.sendMessage).toHaveBeenCalledWith("conv-1", SESSION_USER_ID, { content: "سلام همکار گرامی" });

    const notifCount = await request(server).get("/notifications/unread-count");
    expect(notifCount.status).toBe(HttpStatus.OK);
    expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(SESSION_USER_ID);

    const notifs = await request(server).get("/notifications");
    expect(notifs.status).toBe(HttpStatus.OK);
    expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(SESSION_USER_ID, expect.anything());

    const readNotif = await request(server).patch("/notifications/notif-1/read");
    expect(readNotif.status).toBe(HttpStatus.OK);
    expect(notificationsService.markAsRead).toHaveBeenCalledWith("notif-1", SESSION_USER_ID);

    const settingRes = await request(server).put("/settings/max_upload_mb").send({ value: "25" });
    expect(settingRes.status).toBe(HttpStatus.OK);
    expect(settingsService.updateSetting).toHaveBeenCalledWith("max_upload_mb", { value: "25" }, SESSION_USER_ID);

    const archiveRes = await request(server).post("/archives/jobs").send({ targetType: "RESEARCH_CASE", targetId: TARGET_ID });
    expect(archiveRes.status).toBe(HttpStatus.CREATED);
    expect(archivalService.createAndProcessArchiveJob).toHaveBeenCalledWith({ targetType: "RESEARCH_CASE", targetId: TARGET_ID }, SESSION_USER_ID);

    const worklist = await request(server).get("/reporting/supervisor-worklist");
    expect(worklist.status).toBe(HttpStatus.OK);
    expect(reportingService.getSupervisorWorklist).toHaveBeenCalledWith(SESSION_USER_ID);
  });
});
