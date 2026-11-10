/** Bank metadata is a separate permission from access to a research/file. */
export function canReadBankEntry(
  roles: readonly string[], managerId: string, provinceIds: readonly string[],
  provinceId: string | null,
  referrals: readonly { recipientId: string; revokedAt: Date | null }[],
): boolean {
  if (roles.includes("TRACKING_DIRECTOR")) return true;
  return roles.includes("PROVINCIAL_DIRECTOR") && (
    (provinceId !== null && provinceIds.includes(provinceId)) ||
    referrals.some((referral) => referral.recipientId === managerId && !referral.revokedAt)
  );
}
