import { AuditEvent } from "../../domain/audit-event.entity.js";
import type { AuditQueryFilter } from "@tstaff/contracts";

export interface AuditRepositoryPort {
  save(event: AuditEvent): Promise<void>;
  findById(id: string): Promise<AuditEvent | null>;
  findMany(filter: AuditQueryFilter): Promise<AuditEvent[]>;
}

