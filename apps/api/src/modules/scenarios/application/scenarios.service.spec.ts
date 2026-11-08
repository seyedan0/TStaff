import { describe, it, expect, beforeEach, vi } from "vitest";
import { ScenariosService } from "./scenarios.service.js";
import { Scenario } from "../domain/scenario.entity.js";
import {
  ScenarioNotFoundError,
  ScenarioPrerequisiteNotMetError,
  PrerequisiteStageReviewRequiredError,
  StaleScenarioRevisionError,
  UnauthorizedSupervisorError,
} from "../domain/scenarios-errors.js";
import type { ScenarioRepositoryPort } from "./ports/scenario.repository.port.js";
import type { ResearchService } from "../../research/application/research.service.js";
import type { AssignmentsService } from "../../assignments/application/assignments.service.js";

describe("ScenariosService (Unit / Domain Application)", () => {
  let scenariosService: ScenariosService;
  let mockScenarioRepo: ScenarioRepositoryPort;
  let mockResearchService: Partial<ResearchService>;
  let mockAssignmentsService: Partial<AssignmentsService>;

  const caseId = "case-uuid-42";
  const authorId = "researcher-user-1";
  const supervisorId = "supervisor-user-1";
  const unauthorizedUserId = "unauthorized-user-99";

  beforeEach(() => {
    const scenarios: Scenario[] = [];

    mockScenarioRepo = {
      create: vi.fn(async (s: Scenario) => {
        scenarios.push(s);
      }),
      findById: vi.fn(async (id: string) => {
        return scenarios.find((s) => s.id === id) ?? null;
      }),
      findByCaseId: vi.fn(async (cId: string) => {
        return scenarios.filter((s) => s.researchCaseId === cId);
      }),
      saveWithVersionCheck: vi.fn(
        async (s: Scenario, expectedVersion: number) => {
          const idx = scenarios.findIndex((item) => item.id === s.id);
          if (idx === -1 || scenarios[idx]!.version !== expectedVersion) {
            throw new StaleScenarioRevisionError(
              scenarios[idx]?.version ?? 0,
              expectedVersion,
            );
          }
          scenarios[idx] = s;
        },
      ),
      findInternalBank: vi.fn(async () => {
        return scenarios.filter((s) => s.status === "APPROVED_INTERNAL");
      }),
      saveDecision: vi.fn(async () => {}),
      findDecisionByIdempotencyKey: vi.fn(async () => null),
    };

    mockResearchService = {
      assertPrerequisitesApprovedForScenario: vi.fn(async (_cId: string) => {}),
      assertOwnerCanEditStage: vi.fn(async () => {}),
      isSupervisorAssignedToCase: vi.fn(async (_cId: string, uId: string) => uId === supervisorId),
      getCase: vi.fn(async () => ({ version: 1 } as any)),
      reviewDecision: vi.fn(async () => ({} as any)),
      submitScenarioForReview: vi.fn(async () => ({} as any)),
    };

    mockAssignmentsService = {};

    scenariosService = new ScenariosService(
      mockScenarioRepo,
      mockResearchService as ResearchService,
      mockAssignmentsService as AssignmentsService,
    );
  });

  it("creates a scenario when prerequisite stages are approved (FR-021, AT-08)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "سناریوی ارتقای بهره‌وری",
      summary: "چکیده تفصیلی سناریوی اقدام راهبردی جهت حل مسئله.",
      content: "متن کامل سناریو شامل مدل‌های اقدام، توالی رویدادها و شاخص‌های سنجش اثر.",
    });

    expect(scenario.id).toBeDefined();
    expect(scenario.researchCaseId).toBe(caseId);
    expect(scenario.status).toBe("DRAFT");
    expect(scenario.version).toBe(1);
    expect(
      mockResearchService.assertPrerequisitesApprovedForScenario,
    ).toHaveBeenCalledWith(caseId);
  });

  it("fails to create scenario if prerequisite stages are incomplete", async () => {
    vi.mocked(
      mockResearchService.assertPrerequisitesApprovedForScenario!,
    ).mockRejectedValueOnce(
      new ScenarioPrerequisiteNotMetError("مراحل پیش‌نیاز تکمیل نشده‌اند"),
    );

    await expect(
      scenariosService.createScenario(caseId, authorId, {
        title: "سناریو",
        summary: "چکیده سناریو",
        content: "متن سناریوی اقدام",
      }),
    ).rejects.toThrow(ScenarioPrerequisiteNotMetError);
  });

  it("updates scenario draft with version check (CAS)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان اولیه",
      summary: "چکیده اولیه سناریو",
      content: "متن اولیه سناریو",
    });

    const updated = await scenariosService.updateScenario(scenario.id, authorId, {
      title: "عنوان بازنگری‌شده",
      expectedVersion: 1,
    });

    expect(updated.title).toBe("عنوان بازنگری‌شده");
    expect(updated.version).toBe(2);
  });

  it("submits scenario for review and transitions to UNDER_REVIEW", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو",
      content: "متن کامل سناریو",
    });

    const underReview = await scenariosService.submitScenarioForReview(
      scenario.id,
      authorId,
      1,
    );
    expect(underReview.status).toBe("UNDER_REVIEW");
    expect(underReview.version).toBe(2);
    expect(mockResearchService.submitScenarioForReview).toHaveBeenCalledWith(caseId, authorId);
  });

  it("restores the scenario draft if case-level review submission loses its version check (D-02, AT-29)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو با جزئیات کافی برای ارسال.",
      content: "متن کامل سناریو همراه با توالی اقدامات اجرایی.",
    });
    vi.mocked(mockResearchService.submitScenarioForReview!).mockRejectedValueOnce(new Error("STALE_REVISION"));

    await expect(scenariosService.submitScenarioForReview(scenario.id, authorId, 1)).rejects.toThrow("STALE_REVISION");
    const restored = await scenariosService.getScenarioById(scenario.id);
    expect(restored.status).toBe("DRAFT");
    expect(restored.version).toBe(3);
  });

  it("blocks scenario submission while an upstream stage needs review (D-05, FR-061, AT-33)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو با جزئیات کافی برای ارسال.",
      content: "متن کامل سناریو همراه با توالی اقدامات اجرایی.",
    });
    vi.mocked(mockResearchService.assertPrerequisitesApprovedForScenario!).mockRejectedValueOnce(
      new PrerequisiteStageReviewRequiredError("PRESCRIPTION"),
    );

    await expect(scenariosService.submitScenarioForReview(scenario.id, authorId, 1))
      .rejects.toThrow(PrerequisiteStageReviewRequiredError);
    expect(mockResearchService.submitScenarioForReview).not.toHaveBeenCalled();
  });

  it("allows supervisor to approve scenario into APPROVED_INTERNAL (internal bank AT-16)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو",
      content: "متن کامل سناریو",
    });
    await scenariosService.submitScenarioForReview(scenario.id, authorId, 1);

    const approved = await scenariosService.reviewScenario(
      scenario.id,
      supervisorId,
      {
        decision: "APPROVED",
        reason: "سناریو واجد شرایط ورود به بانک داخلی سناریوها است.",
        expectedVersion: 2,
        caseVersion: 1,
        idempotencyKey: "rev-sc-key-01",
      },
    );

    expect(approved.status).toBe("APPROVED_INTERNAL");
    expect(approved.version).toBe(3);

    // Verify it appears in internal bank
    const bank = await scenariosService.getInternalBank();
    expect(bank.length).toBe(1);
    expect(bank[0]!.id).toBe(scenario.id);
  });

  it("Rule D-05 / FR-061 / AT-33: BLOCKS scenario approval if any prerequisite stage is in REVIEW_REQUIRED", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو",
      content: "متن کامل سناریو",
    });
    await scenariosService.submitScenarioForReview(scenario.id, authorId, 1);

    // Simulate stage rollback in upstream (e.g. PRESCRIPTION or EXPLANATION rolled back to REVIEW_REQUIRED)
    vi.mocked(
      mockResearchService.assertPrerequisitesApprovedForScenario!,
    ).mockRejectedValueOnce(
      new PrerequisiteStageReviewRequiredError("PRESCRIPTION"),
    );

    await expect(
      scenariosService.reviewScenario(scenario.id, supervisorId, {
        decision: "APPROVED",
        reason: "تأیید سناریو",
        expectedVersion: 2,
        caseVersion: 1,
        idempotencyKey: "rev-blocked-key-33",
      }),
    ).rejects.toThrow(PrerequisiteStageReviewRequiredError);
  });

  it("rejects unauthorized user attempting to review scenario (Negative Authorization)", async () => {
    const scenario = await scenariosService.createScenario(caseId, authorId, {
      title: "عنوان سناریو",
      summary: "چکیده سناریو",
      content: "متن کامل سناریو",
    });
    await scenariosService.submitScenarioForReview(scenario.id, authorId, 1);

    await expect(
      scenariosService.reviewScenario(scenario.id, unauthorizedUserId, {
        decision: "APPROVED",
        reason: "داوری غیرمجاز",
        expectedVersion: 2,
        caseVersion: 1,
        idempotencyKey: "unauth-sc-key-1",
      }),
    ).rejects.toThrow(UnauthorizedSupervisorError);
  });
});

