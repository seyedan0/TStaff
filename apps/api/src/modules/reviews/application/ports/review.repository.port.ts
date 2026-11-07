import { StageSubmission } from "../../domain/stage-submission.entity.js";
import { ReviewDecision } from "../../domain/review-decision.entity.js";

export interface ReviewRepositoryPort {
  saveSubmission(submission: StageSubmission): Promise<void>;
  findSubmissionById(id: string): Promise<StageSubmission | null>;
  findSubmissionsByStageInstanceId(
    stageInstanceId: string,
  ): Promise<StageSubmission[]>;
  saveDecision(decision: ReviewDecision): Promise<void>;
  findDecisionByIdempotencyKey(key: string): Promise<ReviewDecision | null>;
  findDecisionsBySubmissionId(submissionId: string): Promise<ReviewDecision[]>;
  updateSubmissionWithVersionCheck(
    submission: StageSubmission,
    expectedVersion: number,
  ): Promise<void>;
}

