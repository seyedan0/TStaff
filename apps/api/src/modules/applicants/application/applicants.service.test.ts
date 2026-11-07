import { describe, it, expect, beforeEach } from "vitest";
import { ApplicantsService } from "./applicants.service.js";
import { Applicant } from "../domain/applicant.entity.js";
import {
  InvalidAgeError,
  InvalidApplicantStatusTransitionError,
  ApplicantAlreadyExistsError,
} from "../domain/applicant-errors.js";
import type { ApplicantRepositoryPort } from "./ports/applicant.repository.port.js";

class InMemoryApplicantRepository implements ApplicantRepositoryPort {
  private applicants = new Map<string, Applicant>();

  async findById(id: string): Promise<Applicant | null> {
    return this.applicants.get(id) || null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<Applicant | null> {
    for (const app of this.applicants.values()) {
      if (app.phoneNumber === phoneNumber) return app;
    }
    return null;
  }

  async findByNationalId(nationalId: string): Promise<Applicant | null> {
    for (const app of this.applicants.values()) {
      if (app.nationalId === nationalId) return app;
    }
    return null;
  }

  async save(applicant: Applicant): Promise<void> {
    this.applicants.set(applicant.id, applicant);
  }

  async findAll(): Promise<Applicant[]> {
    return Array.from(this.applicants.values());
  }
}

describe("ApplicantsService & Domain (FR-001, FR-002, FR-056, AT-01, AT-28)", () => {
  let repo: InMemoryApplicantRepository;
  let service: ApplicantsService;
  let approvedHookCalledWith: any = null;

  beforeEach(() => {
    repo = new InMemoryApplicantRepository();
    approvedHookCalledWith = null;
    service = new ApplicantsService(repo, {
      async onApplicantApproved(data) {
        approvedHookCalledWith = data;
      },
    });
  });

  it("creates applicant draft with valid integer age (Rule D-01 / AT-28)", async () => {
    const applicant = await service.createDraft({
      fullName: "رضا کمالی",
      nationalId: "1234567890",
      phoneNumber: "09121112233",
      age: 28,
      provinceId: "11111111-1111-1111-1111-111111111111",
      education: "کارشناسی",
      fieldOfStudy: "مدیریت",
    });

    expect(applicant.id).toBeDefined();
    expect(applicant.status).toBe("PENDING");
    expect(applicant.age).toBe(28);
  });

  it("rejects applicant creation with non-integer or negative age", () => {
    expect(() =>
      Applicant.create({
        id: "test-1",
        fullName: "نامعتبر",
        nationalId: "1234567890",
        phoneNumber: "09121112233",
        age: 25.5,
      }),
    ).toThrow(InvalidAgeError);

    expect(() =>
      Applicant.create({
        id: "test-2",
        fullName: "نامعتبر",
        nationalId: "1234567890",
        phoneNumber: "09121112233",
        age: -2,
      }),
    ).toThrow(InvalidAgeError);
  });

  it("progresses applicant through review and approval workflow (FR-002)", async () => {
    const draft = await service.createDraft({
      fullName: "سارا احمدی",
      nationalId: "0987654321",
      phoneNumber: "09124445566",
      age: 24,
      provinceId: "11111111-1111-1111-1111-111111111111",
      education: "کارشناسی ارشد",
      fieldOfStudy: "جامعه‌شناسی",
    });

    // 1. Submit for review
    const inReview = await service.submitForReview(draft.id);
    expect(inReview.status).toBe("IN_REVIEW");

    // 2. Approve applicant (triggers Identity creation hook)
    const approved = await service.reviewDecision(draft.id, {
      decision: "APPROVED",
    });
    expect(approved.status).toBe("APPROVED");
    expect(approvedHookCalledWith).toEqual({
      id: draft.id,
      fullName: "سارا احمدی",
      phoneNumber: "09124445566",
    });
  });

  it("rejects applicant and handles reopen request (FR-033)", async () => {
    const draft = await service.createDraft({
      fullName: "مهدی حسینی",
      nationalId: "1112223334",
      phoneNumber: "09127778899",
      age: 30,
      provinceId: "11111111-1111-1111-1111-111111111111",
      education: "دکتری",
      fieldOfStudy: "اقتصاد",
    });

    await service.submitForReview(draft.id);
    const rejected = await service.reviewDecision(draft.id, {
      decision: "REJECTED",
      reason: "عدم تطابق زمینه پژوهشی",
    });

    expect(rejected.status).toBe("REJECTED");
    expect(rejected.rejectionReason).toBe("عدم تطابق زمینه پژوهشی");
    expect(approvedHookCalledWith).toBeNull(); // NO user created when rejected (FR-001/BR-01)

    // Request reopen
    const reopened = await service.requestReopen(
      draft.id,
      "ارائه سوابق پژوهشی جدید",
    );
    expect(reopened.status).toBe("REOPEN_REQUESTED");
    expect(reopened.rejectionReason).toContain("ارائه سوابق پژوهشی جدید");
  });

  it("prevents illegal status transitions", async () => {
    const draft = await service.createDraft({
      fullName: "تست وضعیت",
      nationalId: "5556667778",
      phoneNumber: "09129990011",
      age: 22,
      provinceId: "11111111-1111-1111-1111-111111111111",
      education: "دیپلم",
      fieldOfStudy: "عمومی",
    });

    // Cannot reopen draft that is not rejected
    await expect(service.requestReopen(draft.id, "دلیل")).rejects.toThrow(
      InvalidApplicantStatusTransitionError,
    );
  });

  it("prevents duplicate active applicant registration with same phone or nationalId", async () => {
    await service.createDraft({
      fullName: "کاربر اول",
      nationalId: "1111111111",
      phoneNumber: "09120000001",
      age: 25,
      provinceId: "11111111-1111-1111-1111-111111111111",
      education: "کارشناسی",
      fieldOfStudy: "مهندسی",
    });

    // Duplicate phone number
    await expect(
      service.createDraft({
        fullName: "کاربر دوم با همان شماره",
        nationalId: "2222222222",
        phoneNumber: "09120000001",
        age: 26,
        provinceId: "11111111-1111-1111-1111-111111111111",
        education: "کارشناسی",
        fieldOfStudy: "مهندسی",
      }),
    ).rejects.toThrow(ApplicantAlreadyExistsError);

    // Duplicate national ID
    await expect(
      service.createDraft({
        fullName: "کاربر سوم با همان کد ملی",
        nationalId: "1111111111",
        phoneNumber: "09120000002",
        age: 27,
        provinceId: "11111111-1111-1111-1111-111111111111",
        education: "کارشناسی",
        fieldOfStudy: "مهندسی",
      }),
    ).rejects.toThrow(ApplicantAlreadyExistsError);
  });
});
