import type { InterviewStatus } from "@tstaff/contracts";
import { InvalidIntervieweeAgeError } from "./resource-errors.js";

export interface InterviewProps {
  id: string;
  resourceId: string;
  intervieweeName: string;
  intervieweeAge: number | null;
  conductedAt: Date;
  status: InterviewStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Interview {
  private constructor(private readonly props: InterviewProps) {}

  static create(params: {
    id: string;
    resourceId: string;
    intervieweeName: string;
    intervieweeAge?: number | null;
    conductedAt: Date;
  }): Interview {
    if (params.intervieweeAge !== undefined && params.intervieweeAge !== null) {
      if (
        !Number.isInteger(params.intervieweeAge) ||
        params.intervieweeAge <= 0 ||
        params.intervieweeAge > 120
      ) {
        throw new InvalidIntervieweeAgeError(params.intervieweeAge);
      }
    }

    const now = new Date();
    return new Interview({
      id: params.id,
      resourceId: params.resourceId,
      intervieweeName: params.intervieweeName,
      intervieweeAge: params.intervieweeAge ?? null,
      conductedAt: params.conductedAt,
      status: "SCHEDULED",
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: InterviewProps): Interview {
    return new Interview(props);
  }

  markConducted(): Interview {
    return new Interview({
      ...this.props,
      status: "CONDUCTED",
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get resourceId(): string {
    return this.props.resourceId;
  }

  get intervieweeName(): string {
    return this.props.intervieweeName;
  }

  get intervieweeAge(): number | null {
    return this.props.intervieweeAge;
  }

  get conductedAt(): Date {
    return this.props.conductedAt;
  }

  get status(): InterviewStatus {
    return this.props.status;
  }

  toJSON() {
    return {
      id: this.props.id,
      resourceId: this.props.resourceId,
      intervieweeName: this.props.intervieweeName,
      intervieweeAge: this.props.intervieweeAge,
      conductedAt: this.props.conductedAt.toISOString(),
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
