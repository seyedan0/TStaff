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
      `پرونده پژوهشی ${caseId} از قبل مدیر علمی اصلی دارد و انتساب مدیر دیگری مجاز نیست (D-09)`,
      "MAIN_SUPERVISOR_ALREADY_ASSIGNED",
    );
  }
}

export class CollaboratorSupervisorAlreadyAssignedError extends DomainError {
  constructor(caseId: string) {
    super(
      `پرونده پژوهشی ${caseId} مدیر علمی همکار نمی‌پذیرد (D-09)`,
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
    super(
      "انتساب مدیر علمی فقط برای حساب کارآموز یا کارورز مجاز است",
      "BAD_REQUEST",
    );
  }
}

export class DifferentLifetimeSupervisorError extends DomainError {
  constructor() {
    super(
      "برای این فرد قبلاً مدیر علمی دیگری ثبت شده است؛ تعیین مدیر علمی دوم مجاز نیست",
      "CONFLICT",
    );
  }
}

export class SingleSupervisorPerResearchError extends DomainError {
  constructor() {
    super(
      "برای پرونده پژوهش فقط مدیر علمی مادام‌العمر صاحب پرونده مجاز است؛ مدیر همکار پشتیبانی نمی‌شود",
      "CONFLICT",
    );
  }
}

export class ResearchOwnerRequiredError extends DomainError {
  constructor() {
    super(
      "پرونده باید به پژوهشگر مشخصی متصل باشد تا مدیر علمی یکتای او کنترل شود",
      "CONFLICT",
    );
  }
}

export class CannotRemoveMainSupervisorWithoutReplacementError extends DomainError {
  constructor() {
    super(
      "لغو مدیر علمی اصلی پرونده مجاز نیست؛ هر پرونده باید به مدیر یکتای پژوهشگر متصل بماند (D-09)",
      "CONFLICT",
    );
  }
}
