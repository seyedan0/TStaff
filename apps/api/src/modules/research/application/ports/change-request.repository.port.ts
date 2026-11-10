import type { ResearchChangeRequestDto } from "@tstaff/contracts";

export const CHANGE_REQUEST_REPOSITORY = Symbol("CHANGE_REQUEST_REPOSITORY");
export interface ChangeRequestRepositoryPort {
  create(item: ResearchChangeRequestDto): Promise<void>;
  get(id: string): Promise<ResearchChangeRequestDto | null>;
  list(caseId: string): Promise<ResearchChangeRequestDto[]>;
  decide(item: ResearchChangeRequestDto, expectedVersion: number): Promise<void>;
}
