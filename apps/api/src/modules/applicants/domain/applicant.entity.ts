import {
  InvalidAgeError,
  InvalidApplicantStatusTransitionError,
} from "./applicant-errors.js";

export type ApplicantStatusType =
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "ARCHIVED"
  | "REOPEN_REQUESTED";

export interface ApplicantProps {
  id: string;
  fullName: string;
  nationalId: string;
  phoneNumber: string;
  age: number;
  provinceId?: string | null | undefined;
  initialSupervisorId?: string | null | undefined;
  createdById?: string | null | undefined;
  educationLevel?: string | null | undefined;
  fieldOfStudy?: string | null | undefined;
  status: ApplicantStatusType;
  notes?: string | null | undefined;
  rejectionReason?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class Applicant {
  private constructor(private readonly props: ApplicantProps) {
    if (!Number.isInteger(props.age) || props.age <= 0) {
      throw new InvalidAgeError(props.age);
    }
  }

  public static create(
    params: Omit<
      ApplicantProps,
      "id" | "status" | "createdAt" | "updatedAt"
    > & { id: string },
  ): Applicant {
    return new Applicant({
      ...params,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: ApplicantProps): Applicant {
    return new Applicant(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get fullName(): string {
    return this.props.fullName;
  }

  public get nationalId(): string {
    return this.props.nationalId;
  }

  public get phoneNumber(): string {
    return this.props.phoneNumber;
  }

  public get age(): number {
    return this.props.age;
  }

  public get provinceId(): string | null | undefined {
    return this.props.provinceId;
  }

  public get initialSupervisorId(): string | null | undefined {
    return this.props.initialSupervisorId;
  }

  public get createdById(): string | null | undefined {
    return this.props.createdById;
  }

  public get educationLevel(): string | null | undefined {
    return this.props.educationLevel;
  }

  public get fieldOfStudy(): string | null | undefined {
    return this.props.fieldOfStudy;
  }

  public get status(): ApplicantStatusType {
    return this.props.status;
  }

  public get notes(): string | null | undefined {
    return this.props.notes;
  }

  public get rejectionReason(): string | null | undefined {
    return this.props.rejectionReason;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public submitForReview(): Applicant {
    if (
      this.props.status !== "PENDING" &&
      this.props.status !== "REOPEN_REQUESTED"
    ) {
      throw new InvalidApplicantStatusTransitionError(
        this.props.status,
        "IN_REVIEW",
      );
    }
    return new Applicant({
      ...this.props,
      status: "IN_REVIEW",
      updatedAt: new Date(),
    });
  }

  public approve(): Applicant {
    if (this.props.status !== "IN_REVIEW" && this.props.status !== "PENDING") {
      throw new InvalidApplicantStatusTransitionError(
        this.props.status,
        "APPROVED",
      );
    }
    return new Applicant({
      ...this.props,
      status: "APPROVED",
      rejectionReason: null,
      updatedAt: new Date(),
    });
  }

  public reject(reason: string): Applicant {
    if (this.props.status === "APPROVED" || this.props.status === "ARCHIVED") {
      throw new InvalidApplicantStatusTransitionError(
        this.props.status,
        "REJECTED",
      );
    }
    return new Applicant({
      ...this.props,
      status: "REJECTED",
      rejectionReason: reason,
      updatedAt: new Date(),
    });
  }

  public requestReopen(reason: string): Applicant {
    if (this.props.status !== "REJECTED") {
      throw new InvalidApplicantStatusTransitionError(
        this.props.status,
        "REOPEN_REQUESTED",
      );
    }
    return new Applicant({
      ...this.props,
      status: "REOPEN_REQUESTED",
      rejectionReason: `درخواست بازگشایی: ${reason}`,
      updatedAt: new Date(),
    });
  }

  public toJSON(): ApplicantProps {
    return { ...this.props };
  }
}
