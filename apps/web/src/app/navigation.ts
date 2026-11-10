import type { SystemRole } from "@tstaff/contracts";

export interface NavigationItem { to: string; label: string }

export const ROLE_LABELS: Record<SystemRole, string> = {
  APPRENTICE: "کارآموز",
  INTERN: "پژوهشگر (کارورز)",
  SCIENTIFIC_SUPERVISOR: "مدیر علمی",
  PROVINCIAL_DIRECTOR: "مدیر استانی",
  TRACKING_DIRECTOR: "مدیر پیگیری",
  SUPPORT_DIRECTOR: "مدیر پشتیبانی",
  SYSTEM_ADMIN: "مدیر سامانه",
};

export function getRoleLabel(role: SystemRole): string {
  return ROLE_LABELS[role] ?? role;
}

const userItems: NavigationItem[] = [{ to: "/library", label: "منابع آموزشی" }, { to: "/messages", label: "گفت‌وگو" }];
const menus: Record<SystemRole, NavigationItem[]> = {
  APPRENTICE: userItems,
  INTERN: [{ to: "/projects", label: "پژوهش‌های من" }, ...userItems],
  SCIENTIFIC_SUPERVISOR: [
    { to: "/supervision/users", label: "پژوهشگران" },
    { to: "/supervision/reviews", label: "داوری پژوهش" },
    { to: "/supervision/evaluations", label: "ارزیابی کارآموزان" },
    { to: "/library", label: "کتابخانه" }, { to: "/messages", label: "گفت‌وگو" },
    { to: "/admissions", label: "پذیرش علمی" },
  ],
  PROVINCIAL_DIRECTOR: [{ to: "/admissions", label: "پذیرش متقاضیان" }, { to: "/resource-bank", label: "بانک منابع" }, { to: "/province/metrics", label: "وضعیت استان" }],
  TRACKING_DIRECTOR: [{ to: "/tracking/pipeline", label: "پایش شبکه" }, { to: "/tracking/managers", label: "مدیران" }, { to: "/tracking/assignments", label: "انتساب‌ها" }, { to: "/resource-bank", label: "بانک منابع" }, { to: "/tracking/audit", label: "تاریخچه نظارت" }],
  SUPPORT_DIRECTOR: [{ to: "/support/tickets", label: "درخواست‌های پشتیبانی" }, { to: "/support/users", label: "کاربران" }],
  SYSTEM_ADMIN: [{ to: "/management/settings", label: "تنظیمات" }, { to: "/management/archive", label: "بایگانی" }, { to: "/management/managers", label: "مدیران" }, { to: "/management/health", label: "سلامت سامانه" }],
};
export function getNavigation(role: SystemRole): NavigationItem[] { return menus[role] ?? []; }
export function getHomePath(role: SystemRole): string { return getNavigation(role)[0]?.to ?? "/"; }
const researchers: SystemRole[] = ["INTERN", "SCIENTIFIC_SUPERVISOR", "PROVINCIAL_DIRECTOR", "TRACKING_DIRECTOR", "SYSTEM_ADMIN"];
const routeRules: Array<{ pattern: RegExp; roles: SystemRole[] }> = [
  { pattern: /^\/projects\/new\/?$/, roles: ["SCIENTIFIC_SUPERVISOR", "SYSTEM_ADMIN"] },
  { pattern: /^\/projects(?:\/[^/]+(?:\/stages\/(?:SOURCES|EXPLANATION|PRESCRIPTION|SCENARIO)|\/resources\/[^/]+)?)?\/?$/, roles: researchers },
  { pattern: /^\/supervision\/(?:users(?:\/[^/]+)?|reviews|evaluations)\/?$/, roles: ["SCIENTIFIC_SUPERVISOR"] },
  { pattern: /^\/admissions\/new\/?$/, roles: ["PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN"] },
  { pattern: /^\/admissions(?:\/[^/]+)?\/?$/, roles: ["SCIENTIFIC_SUPERVISOR", "PROVINCIAL_DIRECTOR", "SYSTEM_ADMIN"] },
  { pattern: /^\/resource-bank(?:\/[^/]+)?\/?$/, roles: ["PROVINCIAL_DIRECTOR", "TRACKING_DIRECTOR"] },
  { pattern: /^\/library(?:\/[^/]+)?\/?$/, roles: ["APPRENTICE", "INTERN", "SCIENTIFIC_SUPERVISOR"] },
  { pattern: /^\/messages(?:\/[^/]+)?\/?$/, roles: ["APPRENTICE", "INTERN", "SCIENTIFIC_SUPERVISOR"] },
  { pattern: /^\/province\/metrics\/?$/, roles: ["PROVINCIAL_DIRECTOR"] },
  { pattern: /^\/tracking\/(?:pipeline|managers|assignments|audit)\/?$/, roles: ["TRACKING_DIRECTOR"] },
  { pattern: /^\/support\/(?:tickets|users)(?:\/[^/]+)?\/?$/, roles: ["SUPPORT_DIRECTOR"] },
  { pattern: /^\/management\/(?:settings|archive|managers|health)\/?$/, roles: ["SYSTEM_ADMIN"] },
];
export function routeAccess(role: SystemRole, pathname: string): "allowed" | "forbidden" | "not-found" {
  const rule = routeRules.find(item => item.pattern.test(pathname));
  return rule ? rule.roles.includes(role) ? "allowed" : "forbidden" : "not-found";
}
export function safeReturnTo(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !/[\\\u0000-\u001f]/.test(value) && !value.split(/[?#]/)[0]?.startsWith("/login") ? value : null;
}
