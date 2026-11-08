const SYSTEM_ROLES = new Set([
  "APPRENTICE",
  "INTERN",
  "SCIENTIFIC_SUPERVISOR",
  "PROVINCIAL_DIRECTOR",
  "SUPPORT_DIRECTOR",
  "TRACKING_DIRECTOR",
  "SYSTEM_ADMIN",
]);

export interface LocalQuickLoginUser {
  label: string;
  phoneNumber: string;
  role: string;
}

export interface LocalQuickLoginConfig {
  password: string;
  users: LocalQuickLoginUser[];
}

export function getLocalQuickLoginConfig(input: {
  isDevelopment: boolean;
  enabled?: string;
  hostname: string;
  password?: string;
  usersJson?: string;
}): LocalQuickLoginConfig | null {
  const host = input.hostname.toLowerCase();
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const password = input.password?.trim();
  if (!input.isDevelopment || input.enabled !== "true" || !isLoopback || !password || password.length < 8) {
    return null;
  }

  let rawUsers: unknown;
  try {
    rawUsers = JSON.parse(input.usersJson ?? "");
  } catch {
    return null;
  }
  if (!Array.isArray(rawUsers)) return null;

  const users = rawUsers.filter((value): value is LocalQuickLoginUser => {
    if (!value || typeof value !== "object") return false;
    const user = value as Record<string, unknown>;
    return typeof user.label === "string" && user.label.trim().length > 0 &&
      typeof user.phoneNumber === "string" && /^09\d{9}$/.test(user.phoneNumber) &&
      typeof user.role === "string" && SYSTEM_ROLES.has(user.role);
  }).map((user) => ({ label: user.label.trim(), phoneNumber: user.phoneNumber, role: user.role }));

  if (users.length === 0 || users.length > 40) return null;
  return { password, users };
}
