import type { ResearchStatus, StageType } from "@tstaff/contracts";
import { StageInstance } from "./stage-instance.entity.js";
import {
  StaleRevisionError,
  InvalidStageTransitionError,
} from "./research-errors.js";

export interface ResearchCaseProps {
  id: string;
  title: string;
  code: string;
  subject: string;
  status: ResearchStatus;
  version: number;
  stages: StageInstance[];
  createdAt: Date;
  updatedAt: Date;
}

const STAGE_ORDER: StageType[] = [
  "SOURCES",
  "EXPLANATION",
  "PRESCRIPTION",
  "SCENARIO",
];

export class ResearchCase {
  private constructor(private readonly props: ResearchCaseProps) {}

  static create(params: {
    id: string;
    title: string;
    code: string;
    subject: string;
  }): ResearchCase {
    const now = new Date();
    const stages: StageInstance[] = [
      StageInstance.create({
        id: crypto.randomUUID(),
        researchCaseId: params.id,
        stageType: "SOURCES",
        status: "IN_PROGRESS",
      }),
      StageInstance.create({
        id: crypto.randomUUID(),
        researchCaseId: params.id,
        stageType: "EXPLANATION",
        status: "PENDING",
      }),
      StageInstance.create({
        id: crypto.randomUUID(),
        researchCaseId: params.id,
        stageType: "PRESCRIPTION",
        status: "PENDING",
      }),
      StageInstance.create({
        id: crypto.randomUUID(),
        researchCaseId: params.id,
        stageType: "SCENARIO",
        status: "PENDING",
      }),
    ];

    return new ResearchCase({
      id: params.id,
      title: params.title,
      code: params.code,
      subject: params.subject,
      status: "DRAFT",
      version: 1,
      stages,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ResearchCaseProps): ResearchCase {
    return new ResearchCase(props);
  }

  getStage(type: StageType): StageInstance | undefined {
    return this.props.stages.find((s) => s.stageType === type);
  }

  /**
   * Rule D-02 & D-03 / AT-29: Optimistic Concurrency Control (CAS)
   * Advances the research case to next stage if expectedVersion matches.
   */
  advanceStage(expectedVersion: number): ResearchCase {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }

    const currentActiveStageIndex = STAGE_ORDER.findIndex((stageType) => {
      const stage = this.getStage(stageType);
      return stage && stage.status === "IN_PROGRESS";
    });

    if (currentActiveStageIndex < 0) {
      throw new InvalidStageTransitionError(
        "هیچ مرحله‌ای در وضعیت فعال (IN_PROGRESS) نیست",
      );
    }

    const currentStageType = STAGE_ORDER[currentActiveStageIndex]!;
    const nextStageType = STAGE_ORDER[currentActiveStageIndex + 1];

    const updatedStages = this.props.stages.map((s) => {
      if (s.stageType === currentStageType) {
        return s.updateStatus("APPROVED");
      }
      if (nextStageType && s.stageType === nextStageType) {
        return s.updateStatus("IN_PROGRESS");
      }
      return s;
    });

    const nextStatus: ResearchStatus = nextStageType
      ? (`${nextStageType}_STAGE` as ResearchStatus)
      : "COMPLETED";

    return new ResearchCase({
      ...this.props,
      status: nextStatus,
      version: this.props.version + 1,
      stages: updatedStages,
      updatedAt: new Date(),
    });
  }

  /**
   * Rule D-05 / FR-061 / AT-33:
   * Rollback to target stage resets target to IN_PROGRESS.
   * All dependent downstream stages automatically cascade to REVIEW_REQUIRED.
   * Prior versions & submissions are kept intact.
   */
  rollbackStage(
    targetStage: StageType,
    _reason: string,
    expectedVersion: number,
  ): ResearchCase {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }

    const currentActiveStageIndex = STAGE_ORDER.findIndex((stageType) => {
      const stage = this.getStage(stageType);
      return stage && stage.status === 'IN_PROGRESS';
    });

    const targetIndex = STAGE_ORDER.indexOf(targetStage);
    if (
      targetIndex < 0 ||
      (currentActiveStageIndex >= 0 && targetIndex >= currentActiveStageIndex)
    ) {
      throw new InvalidStageTransitionError(
        `عقب‌گرد صرفاً به مراحل قبلی مجاز است (مرحله جاری: ${
          currentActiveStageIndex >= 0 ? STAGE_ORDER[currentActiveStageIndex] : 'نامشخص'
        }، مرحله مقصد: ${targetStage})`
      );
    }


    const updatedStages = this.props.stages.map((s) => {
      const idx = STAGE_ORDER.indexOf(s.stageType);
      if (idx === targetIndex) {
        return s.updateStatus("IN_PROGRESS");
      }
      if (idx > targetIndex) {
        // Downstream dependent stage -> REVIEW_REQUIRED (D-05)
        return s.updateStatus("REVIEW_REQUIRED");
      }
      return s;
    });

    return new ResearchCase({
      ...this.props,
      status: `${targetStage}_STAGE` as ResearchStatus,
      version: this.props.version + 1,
      stages: updatedStages,
      updatedAt: new Date(),
    });
  }

  /**
   * Rule D-02 / D-03 / AT-29:
   * Scientific Review Decision with CAS check
   */
  applyReviewDecision(
    stageType: StageType,
    decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED",
    expectedVersion: number,
  ): ResearchCase {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }

    const stageStatus =
      decision === "APPROVED"
        ? "APPROVED"
        : decision === "REVISION_REQUESTED"
          ? "REVISION_REQUESTED"
          : "PENDING";

    const updatedStages = this.props.stages.map((s) => {
      if (s.stageType === stageType) {
        return s.updateStatus(stageStatus);
      }
      return s;
    });

    return new ResearchCase({
      ...this.props,
      version: this.props.version + 1,
      stages: updatedStages,
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get title(): string {
    return this.props.title;
  }

  get code(): string {
    return this.props.code;
  }

  get subject(): string {
    return this.props.subject;
  }

  get status(): ResearchStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get stages(): StageInstance[] {
    return this.props.stages;
  }

  toJSON() {
    return {
      id: this.props.id,
      title: this.props.title,
      code: this.props.code,
      subject: this.props.subject,
      status: this.props.status,
      version: this.props.version,
      stages: this.props.stages.map((s) => s.toJSON()),
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
