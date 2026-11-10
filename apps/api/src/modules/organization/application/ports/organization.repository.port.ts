export const ORGANIZATION_REPOSITORY = Symbol("ORGANIZATION_REPOSITORY");
export interface OrganizationRepositoryPort {
  provinces(): Promise<Array<{ id: string; name: string }>>;
  provinceIds(managerId: string): Promise<string[]>;
  hasUserGrant(managerId: string, userId: string): Promise<boolean>;
  setProvinceScope(managerId: string, provinceId: string, actorId: string, active: boolean): Promise<void>;
  setUserGrant(managerId: string, userId: string, actorId: string, active: boolean): Promise<void>;
  scopes(managerId?: string): Promise<Array<{ managerId: string; provinceId: string; assignedAt: Date; revokedAt: Date | null }>>;
  userGrants?(managerId?: string): Promise<Array<{ managerId: string; userId: string; assignedById: string; assignedAt: Date; revokedAt: Date | null }>>;
}
