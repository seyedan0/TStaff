import type { InterviewStatus } from "@tstaff/contracts";
import { InvalidIntervieweeAgeError } from "./resource-errors.js";

export interface InterviewProps {
  id: string;
  resourceId: string;
  intervieweeName: string;
  intervieweeAge: number | null;
  conductedAt: Date;
  durationMinutes?: number | null;
  mode?: string | null;
  location?: string | null;
  notes?: string | null;
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
    durationMinutes?: number;
    mode?: string;
    location?: string;
    notes?: string;
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
      durationMinutes: params.durationMinutes ?? null,
      mode: params.mode ?? null,
      location: params.location ?? null,
      notes: params.notes ?? null,
      status: "SCHEDULED",
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: InterviewProps): Interview {
    return new Interview(props);
  }

  updateInfo(params: {
    intervieweeName?: string | undefined;
    intervieweeAge?: number | undefined;
    conductedAt?: Date | undefined;
    durationMinutes?: number | undefined;
    mode?: string | undefined;
    location?: string | undefined;
    notes?: string | undefined;
  }): Interview {
    const intervieweeAge = params.intervieweeAge ?? this.props.intervieweeAge;
    if (intervieweeAge !== null && (!Number.isInteger(intervieweeAge) || intervieweeAge <= 0 || intervieweeAge > 120)) {
      throw new InvalidIntervieweeAgeError(intervieweeAge);
    }
    return new Interview({
      ...this.props,
      ...(params.intervieweeName !== undefined ? { intervieweeName: params.intervieweeName } : {}),
      intervieweeAge,
      ...(params.conductedAt !== undefined ? { conductedAt: params.conductedAt } : {}),
      ...(params.durationMinutes !== undefined ? { durationMinutes: params.durationMinutes } : {}),
      ...(params.mode !== undefined ? { mode: params.mode || null } : {}),
      ...(params.location !== undefined ? { location: params.location || null } : {}),
      ...(params.notes !== undefined ? { notes: params.notes || null } : {}),
      updatedAt: new Date(),
    });
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
      durationMinutes: this.props.durationMinutes ?? null,
      mode: this.props.mode ?? null,
      location: this.props.location ?? null,
      notes: this.props.notes ?? null,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
