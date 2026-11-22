export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class UserNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`کاربر با مشخصه ${identifier} یافت نشد`, "USER_NOT_FOUND");
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super("شماره همراه یا رمز عبور اشتباه است", "INVALID_CREDENTIALS");
  }
}

export class UserSuspendedError extends DomainError {
  constructor(userId: string) {
    super(
      `حساب کاربری ${userId} معلق شده است و امکان ورود ندارد`,
      "USER_SUSPENDED",
    );
  }
}

export class UserAlreadyPromotedError extends DomainError {
  constructor(userId: string) {
    super(
      `کاربر ${userId} قبلاً به وضعیت کارورز ارتقا یافته است`,
      "USER_ALREADY_PROMOTED",
    );
  }
}

export class InvalidApprovedApplicantSupervisorError extends DomainError {
  constructor() {
    super(
      "مدیر علمی اولیهٔ متقاضی فعال نیست یا نقش مدیر علمی ندارد",
      "BAD_REQUEST",
    );
  }
}

export class ApprovedApplicantLifetimeSupervisorConflictError extends DomainError {
  constructor() {
    super(
      "مدیر علمی سابقه‌دار این فرد با مدیر اولیه پذیرش یکسان نیست؛ ساخت حساب متوقف شد",
      "CONFLICT",
    );
  }
}
