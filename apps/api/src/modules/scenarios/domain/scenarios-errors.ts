export class ScenariosDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ScenarioNotFoundError extends ScenariosDomainError {
  constructor(id: string) {
    super(`سناریو با شناسه ${id} یافت نشد`, "SCENARIO_NOT_FOUND");
  }
}

export class ScenarioPrerequisiteNotMetError extends ScenariosDomainError {
  constructor(message: string) {
    super(message, "SCENARIO_PREREQUISITE_NOT_MET");
  }
}

/**
 * Rule D-05 / FR-061 / AT-33:
 * Dependent stages invalidation.
 * Publication of scenario is strictly forbidden if any prerequisite stage is in REVIEW_REQUIRED.
 */
export class PrerequisiteStageReviewRequiredError extends ScenariosDomainError {
  constructor(stageType: string) {
    super(
      `امکان داوری و انتشار سناریو در بانک داخلی وجود ندارد زیرا مرحله پیش‌نیاز (${stageType}) به دلیل بازگشت یا تغییر نیازمند بازبینی مجدد (REVIEW_REQUIRED) است (D-05, FR-061, AT-33)`,
      "PREREQUISITE_REVIEW_REQUIRED",
    );
  }
}

export class StaleScenarioRevisionError extends ScenariosDomainError {
  constructor(
    public readonly currentVersion: number,
    public readonly expectedVersion: number,
  ) {
    super(
      `تعارض نسخه سناریو: نسخه جاری (${currentVersion}) با نسخه مورد انتظار (${expectedVersion}) مطابقت ندارد (CAS)`,
      "STALE_REVISION",
    );
  }
}

export class InvalidScenarioStatusTransitionError extends ScenariosDomainError {
  constructor(message: string) {
    super(message, "CONFLICT");
  }
}

export class UnauthorizedSupervisorError extends ScenariosDomainError {
  constructor(userId: string, caseId: string) {
    super(
      `کاربر ${userId} مدیر علمی فعال پرونده پژوهشی ${caseId} نیست و اختیار داوری ندارد (D-02)`,
      "FORBIDDEN",
    );
  }
}


