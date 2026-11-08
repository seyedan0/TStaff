import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { AppModule } from "../src/app.module.js";
import { USER_REPOSITORY } from "../src/modules/identity/application/identity.service.js";
import { User } from "../src/modules/identity/domain/user.entity.js";

class MockUserRepository {
  private users = new Map<string, User>();
  private evaluations: any[] = [];
  private tickets: any[] = [];

  constructor() {
    const apprentice = User.create({
      id: "10000000-0000-0000-0000-000000000006",
      phoneNumber: "09126666666",
      fullName: "رضا میرزایی",
      stage: "APPRENTICE",
      role: "APPRENTICE",
      isActive: true,
      passwordHash: "hash",
    });
    this.users.set(apprentice.id, apprentice);
  }

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async findByPhoneNumber(phone: string) {
    for (const u of this.users.values()) if (u.phoneNumber === phone) return u;
    return null;
  }

  async save(user: User) {
    this.users.set(user.id, user);
  }

  async createStudyEvaluation(userId: string, notes?: string) {
    const ev = {
      id: "eval-test-1",
      userId,
      status: "PENDING" as const,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.evaluations.push(ev);
    return ev;
  }

  async getStudyEvaluationByUserId(userId: string) {
    return this.evaluations.find((e) => e.userId === userId) || null;
  }

  async createSupportTicket(userId: string, subject: string, description: string) {
    const ticket = {
      id: "ticket-test-1",
      userId,
      subject,
      description,
      status: "OPEN" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tickets.push(ticket);
    return ticket;
  }
}

describe("Study Evaluations & Support Tickets E2E Integration", () => {
  let app: INestApplication;
  const mockRepo = new MockUserRepository();

  const testApprenticeId = "10000000-0000-0000-0000-000000000006";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(mockRepo)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it("fails to request study evaluation without x-user-id header (401 Unauthorized)", async () => {
    const res = await request(app.getHttpServer())
      .post("/users/study-evaluations/request")
      .set("x-user-stage", "APPRENTICE")
      .send({
        completedGuidelines: ["شیوه‌نامه استخراج منابع D-07"],
        notes: "مطالعه انجام شد",
      });

    expect(res.status).toBe(401);
  });

  it("submits study evaluation request successfully with x-user-id", async () => {
    const res = await request(app.getHttpServer())
      .post("/users/study-evaluations/request")
      .set("x-user-stage", "APPRENTICE")
      .set("x-user-id", testApprenticeId)
      .send({
        completedGuidelines: [
          "شیوه‌نامه استخراج منابع D-07",
          "راهنمای تحلیل علّی و تدوین بیانیه تبیین مسئله",
        ],
        notes: "کلیه ۶ شیوه‌نامه مصوب مطالعه گردید.",
      });

    expect([201, 200]).toContain(res.status);
    expect(res.body.status).toBe("PENDING");
  });

  it("fails to create support ticket without x-user-id header (401 Unauthorized)", async () => {
    const res = await request(app.getHttpServer())
      .post("/users/support-tickets")
      .set("x-user-stage", "APPRENTICE")
      .send({
        subject: "تست موضوع تیکت بدون لاگین",
        description: "شرح تست عدم احراز هویت",
      });

    expect(res.status).toBe(401);
  });

  it("creates support ticket successfully when x-user-id is provided", async () => {
    const res = await request(app.getHttpServer())
      .post("/users/support-tickets")
      .set("x-user-stage", "APPRENTICE")
      .set("x-user-id", testApprenticeId)
      .send({
        subject: "پرسش پیرامون مصاحبه خبره",
        description: "آیا ضبط صوت برای تمام مصاحبه‌ها الزامی است؟",
      });

    expect(res.status).toBe(201);
    expect(res.body.subject).toBe("پرسش پیرامون مصاحبه خبره");
    expect(res.body.status).toBe("OPEN");
  });
});
