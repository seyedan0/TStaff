export class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class InvalidFileError extends DomainError {
  constructor(message: string) {
    super(message, "BAD_REQUEST");
  }
}

export class FileTooLargeError extends DomainError {
  constructor(maxBytes: number) {
    super(`حداکثر اندازه فایل ${maxBytes} بایت است`, "FILE_TOO_LARGE");
  }
}

export class StoredObjectNotFoundError extends DomainError {
  constructor(id: string) {
    super(`فایل با شناسه ${id} یافت نشد`, "STORED_OBJECT_NOT_FOUND");
  }
}

export class FileAccessDeniedError extends DomainError {
  constructor(message: string) {
    super(message, "FORBIDDEN");
  }
}

export class FileNotReadyError extends DomainError {
  constructor(message: string) {
    super(message, "BAD_REQUEST");
  }
}

export class FileScannerUnavailableError extends DomainError {
  constructor() {
    super("سرویس اسکن امنیتی در دسترس نیست", "FILE_SCANNER_UNAVAILABLE");
  }
}
