export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class StaleRevisionError extends DomainError {
  constructor(
    public readonly currentVersion: number,
    public readonly expectedVersion: number,
  ) {
    super(
      `تعارض نسخه داوری علمی: نسخه جاری پرونده (${currentVersion}) با نسخه مورد انتظار (${expectedVersion}) مطابقت ندارد (D-02, D-03, AT-29)`,
      "STALE_REVISION",
    );
  }
}

export class ResearchCaseNotFoundError extends DomainError {
  constructor(id: string) {
    super(`پرونده پژوهشی با شناسه ${id} یافت نشد`, "RESEARCH_NOT_FOUND");
  }
}

export class InvalidStageTransitionError extends DomainError {
  constructor(message: string) {
    super(message, "INVALID_STAGE_TRANSITION");
  }
}

export class UnauthorizedSupervisorError extends DomainError {
  constructor(userId: string, caseId: string) {
    super(
      `کاربر ${userId} مدیر علمی فعال پرونده پژوهشی ${caseId} نیست و اختیار داوری ندارد (D-02)`,
      "FORBIDDEN",
    );
  }
}

export class ScenarioPrerequisiteNotMetError extends DomainError {
  constructor(message: string) {
    super(message, "SCENARIO_PREREQUISITE_NOT_MET");
  }
}

/**
 * Rule D-05 / FR-061 / AT-33:
 * Dependent stages invalidation.
 * Publication of scenario is strictly forbidden if any prerequisite stage is in REVIEW_REQUIRED.
 */
export class PrerequisiteStageReviewRequiredError extends DomainError {
  constructor(stageType: string) {
    super(
      `امکان داوری و انتشار سناریو در بانک داخلی وجود ندارد زیرا مرحله پیش‌نیاز (${stageType}) به دلیل بازگشت یا تغییر نیازمند بازبینی مجدد (REVIEW_REQUIRED) است (D-05, FR-061, AT-33)`,
      "PREREQUISITE_REVIEW_REQUIRED",
    );
  }
}

