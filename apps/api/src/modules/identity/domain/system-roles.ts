const SYSTEM_ROLES = new Set([
  "APPRENTICE",
  "INTERN",
  "SCIENTIFIC_SUPERVISOR",
  "PROVINCIAL_DIRECTOR",
  "SUPPORT_DIRECTOR",
  "TRACKING_DIRECTOR",
  "SYSTEM_ADMIN",
]);

export const extractSystemRoles = (roleNames: readonly (string | null | undefined)[]): string[] =>
  [...new Set(roleNames.filter((role): role is string => !!role && SYSTEM_ROLES.has(role)))];
