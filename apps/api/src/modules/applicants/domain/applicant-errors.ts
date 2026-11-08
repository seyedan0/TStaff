export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class ApplicantNotFoundError extends DomainError {
  constructor(id: string) {
    super(`متقاضی با شناسه ${id} یافت نشد`, "APPLICANT_NOT_FOUND");
  }
}

export class InvalidApplicantStatusTransitionError extends DomainError {
  constructor(from: string, to: string) {
    super(
      `تغییر وضعیت نامعتبر از ${from} به ${to}`,
      "INVALID_APPLICANT_STATUS_TRANSITION",
    );
  }
}

export class InvalidAgeError extends DomainError {
  constructor(age: number) {
    super(`سن ${age} معتبر نیست. سن باید عدد صحیح مثبت باشد`, "INVALID_AGE");
  }
}

export class ApplicantAlreadyExistsError extends DomainError {
  constructor(field: string, value: string) {
    super(
      `متقاضی دیگری با این ${field} (${value}) قبلاً ثبت شده است`,
      "APPLICANT_ALREADY_EXISTS",
    );
  }
}

export class InvalidInitialSupervisorError extends DomainError {
  constructor() {
    super("برای ارجاع علمی اولیه، یک مدیر علمی فعال انتخاب کنید", "BAD_REQUEST");
  }
}

export class ApplicantNotAssignedToReviewerError extends DomainError {
  constructor() {
    super("این پرونده برای ارزیابی به مدیر علمی دیگری ارجاع شده است", "FORBIDDEN");
  }
}
