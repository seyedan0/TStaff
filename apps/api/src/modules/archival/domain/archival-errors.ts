export class ArchivalDomainError extends Error {
  public readonly isDomainError = true;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ArchivalDomainError";
  }
}

export class ArchiveJobNotFoundError extends ArchivalDomainError {
  constructor(id: string) {
    super(`عملیات آرشیو با شناسه ${id} یافت نشد`, "ARCHIVE_JOB_NOT_FOUND");
  }
}

export class InvalidArchiveTargetError extends ArchivalDomainError {
  constructor(targetType: string) {
    super(`نوع هدف آرشیو ${targetType} معتبر نیست`, "INVALID_ARCHIVE_TARGET");
  }
}

