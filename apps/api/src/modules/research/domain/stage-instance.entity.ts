import type { StageType, StageStatus } from "@tstaff/contracts";

export interface StageInstanceProps {
  id: string;
  researchCaseId: string;
  stageType: StageType;
  status: StageStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class StageInstance {
  private constructor(private readonly props: StageInstanceProps) {}

  static create(params: {
    id: string;
    researchCaseId: string;
    stageType: StageType;
    status?: StageStatus;
  }): StageInstance {
    const now = new Date();
    return new StageInstance({
      id: params.id,
      researchCaseId: params.researchCaseId,
      stageType: params.stageType,
      status: params.status ?? "PENDING",
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: StageInstanceProps): StageInstance {
    return new StageInstance(props);
  }

  updateStatus(status: StageStatus): StageInstance {
    return new StageInstance({
      ...this.props,
      status,
      version: this.props.version + 1,
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get researchCaseId(): string {
    return this.props.researchCaseId;
  }

  get stageType(): StageType {
    return this.props.stageType;
  }

  get status(): StageStatus {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  toJSON() {
    return {
      id: this.props.id,
      researchCaseId: this.props.researchCaseId,
      stageType: this.props.stageType,
      status: this.props.status,
      version: this.props.version,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
