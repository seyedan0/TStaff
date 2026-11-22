import type { SupervisorHealthIssue } from "@tstaff/contracts";

export const supervisorIssueLabel = (
  type: SupervisorHealthIssue["type"],
): string => {
  switch (type) {
    case "SUPERVISOR_INACTIVE_OR_ROLE_REMOVED":
      return "مدیر علمی غیرفعال است یا نقش او حذف شده";
    case "SUPERVISOR_ASSIGNMENT_REVOKED":
      return "انتساب مدیر علمی لغو شده و نیازمند رسیدگی است";
    case "LEGACY_COLLABORATOR_ASSIGNMENT":
      return "انتساب همکار از داده‌های قدیمی";
    case "CASE_OWNER_MISSING":
      return "پرونده مالک پژوهشی ندارد";
    case "CASE_SUPERVISOR_MISSING":
      return "پرونده مدیر علمی اصلی ندارد";
    case "CASE_MULTIPLE_MAIN_SUPERVISORS":
      return "پرونده بیش از یک مدیر علمی اصلی دارد";
    case "CASE_SUPERVISOR_MISMATCH":
      return "مدیر پرونده با انتساب پژوهشگر همخوان نیست";
  }
};
