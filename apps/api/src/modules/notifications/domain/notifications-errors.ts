export class NotificationDomainError extends Error {
  public readonly isDomainError = true;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "NotificationDomainError";
  }
}

export class NotificationNotFoundError extends NotificationDomainError {
  constructor(id: string) {
    super(`اعلان با شناسه ${id} یافت نشد`, "NOTIFICATION_NOT_FOUND");
  }
}

export class NotificationForbiddenError extends NotificationDomainError {
  constructor() {
    super("دسترسی به اعلان سایر کاربران مجاز نیست", "FORBIDDEN");
  }
}

