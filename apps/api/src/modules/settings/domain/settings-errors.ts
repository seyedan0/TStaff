export class SettingsDomainError extends Error {
  public readonly isDomainError = true;
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "SettingsDomainError";
  }
}

export class SettingNotFoundError extends SettingsDomainError {
  constructor(key: string) {
    super(`تنظیم سیستمی با کلید ${key} یافت نشد`, "SETTING_NOT_FOUND");
  }
}

