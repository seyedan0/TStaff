import { beforeEach, describe, expect, it } from "vitest";
import type { CreateApplicantDto } from "@tstaff/contracts";
import { Applicant } from "../domain/applicant.entity.js";
import {
  ApplicantAllocationConflictError,
  ApplicantAlreadyExistsError,
  ApplicantNotAssignedToReviewerError,
  InvalidInitialSupervisorError,
} from "../domain/applicant-errors.js";
import type { ApplicantRepositoryPort } from "./ports/applicant.repository.port.js";
import { ApplicantsService } from "./applicants.service.js";

const SUPERVISOR = "22222222-2222-2222-2222-222222222222";
const TRACKING = "33333333-3333-3333-3333-333333333333";
const PROVINCE = "11111111-1111-1111-1111-111111111111";

class InMemoryApplicantRepository implements ApplicantRepositoryPort {
  private readonly applicants = new Map<string, Applicant>();
  async findById(id: string) {
    return this.applicants.get(id) ?? null;
  }
  async findByPhoneNumber(phone: string) {
    return (
      [...this.applicants.values()].find(
        (item) => item.phoneNumber === phone,
      ) ?? null
    );
  }
  async findByNationalId(nationalId: string) {
    return (
      [...this.applicants.values()].find(
        (item) => item.nationalId === nationalId,
      ) ?? null
    );
  }
  async save(applicant: Applicant) {
    this.applicants.set(applicant.id, applicant);
  }
  async findAll(filter?: { provinceId?: string; status?: string }) {
    return [...this.applicants.values()].filter(
      (item) =>
        (!filter?.provinceId || item.provinceId === filter.provinceId) &&
        (!filter?.status || item.status === filter.status),
    );
  }
  async findPendingAllocationQueue() {
    return [...this.applicants.values()].filter(
      (item) => item.status === "PENDING" && !item.initialSupervisorId,
    );
  }
  async assignInitialSupervisor(
    id: string,
    supervisorId: string,
    assignedById: string,
    assignedAt: Date,
  ) {
    const item = this.applicants.get(id);
    if (!item || item.status !== "PENDING" || item.initialSupervisorId)
      return false;
    this.applicants.set(
      id,
      Applicant.reconstitute({
        ...item.toJSON(),
        initialSupervisorId: supervisorId,
        initialSupervisorAssignedById: assignedById,
        initialSupervisorAssignedAt: assignedAt,
        updatedAt: new Date(),
      }),
    );
    return true;
  }
}

describe("Applicant allocation and admission (FR-001, FR-002, FR-056, AT-01, AT-28)", () => {
  let repo: InMemoryApplicantRepository;
  let service: ApplicantsService;
  let approvedHookCalls: Array<Record<string, unknown>>;
  const dto: CreateApplicantDto = {
    fullName: "سارا احمدی",
    nationalId: "0987654321",
    phoneNumber: "09124445566",
    age: 24,
    provinceId: PROVINCE,
    education: "کارشناسی ارشد",
    fieldOfStudy: "جامعه‌شناسی",
  };
  const createAssignedDraft = async () => {
    const applicant = await service.createDraft(dto, "provincial-user");
    await service.assignInitialSupervisor(applicant.id, SUPERVISOR, TRACKING);
    return applicant;
  };

  beforeEach(() => {
    repo = new InMemoryApplicantRepository();
    approvedHookCalls = [];
    service = new ApplicantsService(
      repo,
      {
        async onApplicantApproved(data) {
          approvedHookCalls.push(data);
        },
      },
      {
        isScientificSupervisor: async (id: string) => id === SUPERVISOR,
      } as never,
    );
  });

  it("creates a userless applicant without any supervisor and queues it for tracking (FR-001, AT-01)", async () => {
    const applicant = await service.createDraft(dto, "provincial-user");
    expect(applicant.initialSupervisorId).toBeNull();
    expect(await service.getPendingAllocationQueue()).toHaveLength(1);
    await expect(service.submitForReview(applicant.id)).rejects.toBeInstanceOf(
      InvalidInitialSupervisorError,
    );
    expect(approvedHookCalls).toHaveLength(0);
  });

  it("accepts exactly one valid initial allocation and rejects a stale concurrent allocation (AT-01)", async () => {
    const applicant = await service.createDraft(dto, "provincial-user");
    const results = await Promise.allSettled([
      service.assignInitialSupervisor(applicant.id, SUPERVISOR, TRACKING),
      service.assignInitialSupervisor(applicant.id, SUPERVISOR, TRACKING),
    ]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(
      results.filter(
        (item) =>
          item.status === "rejected" &&
          item.reason instanceof ApplicantAllocationConflictError,
      ),
    ).toHaveLength(1);
    expect(await service.getPendingAllocationQueue()).toHaveLength(0);
  });

  it("lets only the assigned scientific supervisor start admission review (D-09, FR-002)", async () => {
    const draft = await createAssignedDraft();
    await expect(
      service.submitForReview(draft.id, "other-supervisor", "other-supervisor"),
    ).rejects.toBeInstanceOf(ApplicantNotAssignedToReviewerError);

    const submitted = await service.submitForReview(
      draft.id,
      SUPERVISOR,
      SUPERVISOR,
    );
    expect(submitted.status).toBe("IN_REVIEW");
  });

  it("does not allocate to an inactive or non-supervisor account (AT-01)", async () => {
    const applicant = await service.createDraft(dto);
    await expect(
      service.assignInitialSupervisor(
        applicant.id,
        "44444444-4444-4444-4444-444444444444",
        TRACKING,
      ),
    ).rejects.toBeInstanceOf(InvalidInitialSupervisorError);
    expect(
      (await service.getById(applicant.id)).initialSupervisorId,
    ).toBeNull();
  });

  it("routes review only to the allocated supervisor and creates the account after approval (FR-001, AT-01)", async () => {
    const draft = await createAssignedDraft();
    await service.submitForReview(draft.id);
    await expect(
      service.reviewDecision(
        draft.id,
        { decision: "APPROVED" },
        "other-supervisor",
      ),
    ).rejects.toBeInstanceOf(ApplicantNotAssignedToReviewerError);
    const approved = await service.reviewDecision(
      draft.id,
      { decision: "APPROVED" },
      SUPERVISOR,
    );
    expect(approved.status).toBe("APPROVED");
    expect(approvedHookCalls).toHaveLength(1);
    expect(approvedHookCalls[0]).toMatchObject({
      initialSupervisorId: SUPERVISOR,
    });
  });

  it("does not create an account for a rejected applicant (FR-001, AT-01)", async () => {
    const draft = await createAssignedDraft();
    await service.submitForReview(draft.id);
    const rejected = await service.reviewDecision(
      draft.id,
      { decision: "REJECTED", reason: "ارزیابی علمی" },
      SUPERVISOR,
    );
    expect(rejected.status).toBe("REJECTED");
    expect(approvedHookCalls).toHaveLength(0);
  });

  it("rejects duplicate active applicants by phone or national ID (FR-001)", async () => {
    await service.createDraft(dto);
    await expect(
      service.createDraft({ ...dto, phoneNumber: "09120000000" }),
    ).rejects.toBeInstanceOf(ApplicantAlreadyExistsError);
    await expect(
      service.createDraft({ ...dto, nationalId: "1112223334" }),
    ).rejects.toBeInstanceOf(ApplicantAlreadyExistsError);
  });

  it("keeps age as a positive integer (D-01, FR-056, AT-28)", async () => {
    await expect(service.createDraft({ ...dto, age: 24.5 })).rejects.toThrow();
  });
});
