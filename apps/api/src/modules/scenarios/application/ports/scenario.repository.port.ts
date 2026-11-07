import { Scenario } from "../../domain/scenario.entity.js";

export interface ScenarioReviewDecisionRecord {
  id: string;
  scenarioId: string;
  reviewerId: string;
  decision: "APPROVED" | "CHANGES_REQUESTED";
  expectedVersion: number;
  actualVersion: number;
  reason: string;
  idempotencyKey: string;
  decidedAt: Date;
}

export interface ScenarioRepositoryPort {
  create(scenario: Scenario): Promise<void>;
  findById(id: string): Promise<Scenario | null>;
  findByCaseId(caseId: string): Promise<Scenario[]>;
  saveWithVersionCheck(
    scenario: Scenario,
    expectedVersion: number,
  ): Promise<void>;
  findInternalBank(query?: {
    query?: string | undefined;
    cursor?: string | undefined;
    limit?: number | undefined;
  }): Promise<Scenario[]>;
  saveDecision(decision: ScenarioReviewDecisionRecord): Promise<void>;
  findDecisionByIdempotencyKey(
    key: string,
  ): Promise<ScenarioReviewDecisionRecord | null>;
}
