export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export class MainSupervisorAlreadyAssignedError extends DomainError {
  constructor(caseId: string) {
    super(
      `پرونده پژوهشی ${caseId} دارای مدیر علمی اصلی فعال است و امکان انتساب مدیر اصلی دیگر بدون جایگزینی وجود ندارد (D-02)`,
      "MAIN_SUPERVISOR_ALREADY_ASSIGNED",
    );
  }
}

export class CollaboratorSupervisorAlreadyAssignedError extends DomainError {
  constructor(caseId: string) {
    super(
      `پرونده پژوهشی ${caseId} حداکثر می‌تواند ۱ مدیر علمی همکار فعال داشته باشد (D-02)`,
      "COLLABORATOR_SUPERVISOR_ALREADY_ASSIGNED",
    );
  }
}

export class SupervisorCapacityExceededError extends DomainError {
  constructor(userId: string, maxCapacity: number) {
    super(
      `ظرفیت نظارت علمی کاربر ${userId} تکمیل است (حداکثر ${maxCapacity} پرونده فعال)`,
      "SUPERVISOR_CAPACITY_EXCEEDED",
    );
  }
}

export class AssignmentNotFoundError extends DomainError {
  constructor(id: string) {
    super(`انتساب با شناسه ${id} یافت نشد`, "ASSIGNMENT_NOT_FOUND");
  }
}

export class InvalidScientificSupervisorError extends DomainError {
  constructor() {
    super("کاربر انتخاب‌شده مدیر علمی فعال نیست", "BAD_REQUEST");
  }
}

export class InvalidTraineeAssignmentTargetError extends DomainError {
  constructor() {
    super("انتساب مدیر علمی فقط برای حساب کارآموز یا کارورز مجاز است", "BAD_REQUEST");
  }
}
