export class DocumentsDomainError extends Error {
  public readonly isDomainError = true;

  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DocumentsDomainError";
  }
}

export class LibraryDocumentNotFoundError extends DocumentsDomainError {
  constructor(id: string) {
    super(`سند کتابخانه با شناسه ${id} یافت نشد`, "LIBRARY_DOCUMENT_NOT_FOUND");
  }
}

export class LibraryDocumentVersionNotFoundError extends DocumentsDomainError {
  constructor(id: string) {
    super(`نسخه سند با شناسه ${id} یافت نشد`, "LIBRARY_DOCUMENT_VERSION_NOT_FOUND");
  }
}

export class LibraryDocumentFileNotReadyError extends DocumentsDomainError {
  constructor() {
    super("فایل تا پایان اسکن امنیتی قابل انتشار یا دریافت نیست", "DOCUMENT_FILE_NOT_READY");
  }
}

export class LibraryDocumentVersionNotCurrentError extends DocumentsDomainError {
  constructor() {
    super("فقط نسخه جاری و منتشرشده را می‌توان مطالعه کرد", "DOCUMENT_VERSION_NOT_CURRENT");
  }
}

export class LibraryDocumentVersionNotPublishableError extends DocumentsDomainError {
  constructor() {
    super("فقط تازه‌ترین نسخه پیش‌نویس را می‌توان منتشر کرد", "DOCUMENT_VERSION_NOT_PUBLISHABLE");
  }
}

export class LibraryDocumentAlreadyArchivedError extends DocumentsDomainError {
  constructor() {
    super("سند قبلاً بایگانی شده است", "DOCUMENT_ALREADY_ARCHIVED");
  }
}

export class RequiredDocumentsNotConfiguredError extends DocumentsDomainError {
  constructor() {
    super("هنوز هیچ سند الزامیِ منتشرشده‌ای برای ارزیابی تعریف نشده است", "REQUIRED_DOCUMENTS_NOT_CONFIGURED");
  }
}

export class StudyProgressIncompleteError extends DocumentsDomainError {
  constructor() {
    super("برای ثبت درخواست ارزیابی باید همه نسخه‌های الزامی جاری را مطالعه کنید", "STUDY_PROGRESS_INCOMPLETE");
  }
}
