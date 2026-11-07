export class AuditDomainError extends Error {
  public readonly isDomainError = true;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuditDomainError";
  }
}

export class AuditEventNotFoundError extends AuditDomainError {
  constructor(id: string) {
    super(`رویداد ممیزی با شناسه ${id} یافت نشد`, "AUDIT_EVENT_NOT_FOUND");
  }
}

