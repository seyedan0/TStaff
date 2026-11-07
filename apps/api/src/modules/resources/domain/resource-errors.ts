export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class InterviewAlreadyExistsForResourceError extends DomainError {
  constructor(resourceId: string) {
    super(
      `منبع ${resourceId} قبلاً دارای مصاحبه ثبت‌شده است. برای هر منبع حداکثر ۱ مصاحبه مجاز است (D-07, AT-30)`,
      "INTERVIEW_ALREADY_EXISTS_FOR_RESOURCE",
    );
  }
}

export class ResourceNotFoundError extends DomainError {
  constructor(id: string) {
    super(`منبع پژوهشی با شناسه ${id} یافت نشد`, "RESOURCE_NOT_FOUND");
  }
}

export class InterviewNotFoundError extends DomainError {
  constructor(id: string) {
    super(`مصاحبه با شناسه ${id} یافت نشد`, "INTERVIEW_NOT_FOUND");
  }
}

export class InvalidIntervieweeAgeError extends DomainError {
  constructor(age: number) {
    super(
      `سن مصاحبه‌شونده (${age}) معتبر نیست. سن باید یک عدد صحیح مثبت باشد (D-01, AT-28)`,
      "INVALID_AGE",
    );
  }
}

export class IncompleteSourcesStageError extends DomainError {
  constructor(missingDetails: string) {
    super(
      `مرحله منابع کامل نیست. طبق قاعده D-07، تمام منابع باید دارای یک مصاحبه و یک گزارش مکتوب باشند. نواقص: ${missingDetails}`,
      "INCOMPLETE_SOURCES_STAGE",
    );
  }
}
