export type ReviewDecisionChoice = "APPROVED" | "CHANGES_REQUESTED";

export interface ReviewDecisionProps {
  id: string;
  stageSubmissionId: string;
  reviewerId: string;
  decision: ReviewDecisionChoice;
  expectedVersion: number;
  actualVersion: number;
  reason: string;
  idempotencyKey: string;
  decidedAt: Date;
}

export class ReviewDecision {
  private constructor(private readonly props: ReviewDecisionProps) {}

  static create(params: {
    id: string;
    stageSubmissionId: string;
    reviewerId: string;
    decision: ReviewDecisionChoice;
    expectedVersion: number;
    actualVersion: number;
    reason: string;
    idempotencyKey: string;
  }): ReviewDecision {
    return new ReviewDecision({
      ...params,
      decidedAt: new Date(),
    });
  }

  static reconstruct(props: ReviewDecisionProps): ReviewDecision {
    return new ReviewDecision(props);
  }

  get id(): string {
    return this.props.id;
  }

  get stageSubmissionId(): string {
    return this.props.stageSubmissionId;
  }

  get reviewerId(): string {
    return this.props.reviewerId;
  }

  get decision(): ReviewDecisionChoice {
    return this.props.decision;
  }

  get expectedVersion(): number {
    return this.props.expectedVersion;
  }

  get actualVersion(): number {
    return this.props.actualVersion;
  }

  get reason(): string {
    return this.props.reason;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get decidedAt(): Date {
    return this.props.decidedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      stageSubmissionId: this.props.stageSubmissionId,
      reviewerId: this.props.reviewerId,
      decision: this.props.decision,
      expectedVersion: this.props.expectedVersion,
      actualVersion: this.props.actualVersion,
      reason: this.props.reason,
      idempotencyKey: this.props.idempotencyKey,
      decidedAt: this.props.decidedAt.toISOString(),
    };
  }
}

