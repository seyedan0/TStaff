import type { SubmissionStatus } from "@tstaff/contracts";
import {
  StaleRevisionError,
  InvalidSubmissionStateError,
} from "./reviews-errors.js";

export interface StageSubmissionProps {
  id: string;
  stageInstanceId: string;
  authorId: string;
  version: number;
  content: string;
  storedObjectId?: string | null;
  status: SubmissionStatus;
  submittedAt: Date;
}

export class StageSubmission {
  private constructor(private readonly props: StageSubmissionProps) {}

  static create(params: {
    id: string;
    stageInstanceId: string;
    authorId: string;
    content: string;
    storedObjectId?: string;
    version?: number;
  }): StageSubmission {
    return new StageSubmission({
      id: params.id,
      stageInstanceId: params.stageInstanceId,
      authorId: params.authorId,
      version: params.version ?? 1,
      content: params.content,
      storedObjectId: params.storedObjectId ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });
  }

  static reconstruct(props: StageSubmissionProps): StageSubmission {
    return new StageSubmission(props);
  }

  approve(expectedVersion: number): StageSubmission {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status !== "SUBMITTED") {
      throw new InvalidSubmissionStateError(
        `امکان تأیید گزارش در وضعیت ${this.props.status} وجود ندارد`,
      );
    }
    return new StageSubmission({
      ...this.props,
      status: "APPROVED",
      version: this.props.version + 1,
    });
  }

  requestRevision(expectedVersion: number): StageSubmission {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status !== "SUBMITTED") {
      throw new InvalidSubmissionStateError(
        `امکان درخواست اصلاح برای گزارش در وضعیت ${this.props.status} وجود ندارد`,
      );
    }
    return new StageSubmission({
      ...this.props,
      status: "REVISION_REQUIRED",
      version: this.props.version + 1,
    });
  }

  reject(expectedVersion: number): StageSubmission {
    if (this.props.version !== expectedVersion) {
      throw new StaleRevisionError(this.props.version, expectedVersion);
    }
    return new StageSubmission({
      ...this.props,
      status: "REJECTED",
      version: this.props.version + 1,
    });
  }

  submitRevision(newContent: string, authorId: string): StageSubmission {
    return new StageSubmission({
      id: crypto.randomUUID(),
      stageInstanceId: this.props.stageInstanceId,
      authorId,
      version: this.props.version + 1,
      content: newContent,
      storedObjectId: null,
      status: "SUBMITTED",
      submittedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get stageInstanceId(): string {
    return this.props.stageInstanceId;
  }

  get authorId(): string {
    return this.props.authorId;
  }

  get version(): number {
    return this.props.version;
  }

  get content(): string {
    return this.props.content;
  }

  get status(): SubmissionStatus {
    return this.props.status;
  }

  get submittedAt(): Date {
    return this.props.submittedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      stageInstanceId: this.props.stageInstanceId,
      authorId: this.props.authorId,
      version: this.props.version,
      content: this.props.content,
      storedObjectId: this.props.storedObjectId ?? null,
      status: this.props.status,
      submittedAt: this.props.submittedAt.toISOString(),
    };
  }
}
