export class ReviewsDomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class StaleRevisionError extends ReviewsDomainError {
  constructor(
    public readonly currentVersion: number,
    public readonly expectedVersion: number,
  ) {
    super(
      `تعارض نسخه داوری علمی: نسخه جاری (${currentVersion}) با نسخه مورد انتظار (${expectedVersion}) مطابقت ندارد (D-02, D-03, AT-29)`,
      "STALE_REVISION",
    );
  }
}

export class SubmissionNotFoundError extends ReviewsDomainError {
  constructor(id: string) {
    super(`گزارش ارسالی مرحله با شناسه ${id} یافت نشد`, "SUBMISSION_NOT_FOUND");
  }
}

export class UnauthorizedSupervisorError extends ReviewsDomainError {
  constructor(userId: string, caseId: string) {
    super(
      `کاربر ${userId} مدیر علمی فعال پرونده پژوهشی ${caseId} نیست و اختیار داوری ندارد (D-02)`,
      "FORBIDDEN",
    );
  }
}

export class InvalidSubmissionStateError extends ReviewsDomainError {
  constructor(message: string) {
    super(message, "INVALID_SUBMISSION_STATE");
  }
}

