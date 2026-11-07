import type { ScenarioStatus } from "@tstaff/contracts";
import {
  StaleScenarioRevisionError,
  InvalidScenarioStatusTransitionError,
} from "./scenarios-errors.js";

export interface ScenarioProps {
  id: string;
  researchCaseId: string;
  title: string;
  summary: string;
  content: string;
  version: number;
  status: ScenarioStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Scenario {
  private constructor(private readonly props: ScenarioProps) {}

  static create(params: {
    id: string;
    researchCaseId: string;
    title: string;
    summary: string;
    content: string;
  }): Scenario {
    const now = new Date();
    return new Scenario({
      id: params.id,
      researchCaseId: params.researchCaseId,
      title: params.title,
      summary: params.summary,
      content: params.content,
      version: 1,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ScenarioProps): Scenario {
    return new Scenario(props);
  }

  update(
    params: {
      title?: string | undefined;
      summary?: string | undefined;
      content?: string | undefined;
    },
    expectedVersion: number,
  ): Scenario {
    if (this.props.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status === "APPROVED_INTERNAL") {
      throw new InvalidScenarioStatusTransitionError(
        "ویرایش مستقیم سناریوی تأییدشده در بانک داخلی مجاز نیست (نیازمند پیشنهاد نسخه جدید است)",
      );
    }
    return new Scenario({
      ...this.props,
      title: params.title ?? this.props.title,
      summary: params.summary ?? this.props.summary,
      content: params.content ?? this.props.content,
      version: this.props.version + 1,
      updatedAt: new Date(),
    });
  }

  submitForReview(expectedVersion: number): Scenario {
    if (this.props.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status !== "DRAFT") {
      throw new InvalidScenarioStatusTransitionError(
        `امکان ارسال سناریو برای داوری در وضعیت ${this.props.status} وجود ندارد`,
      );
    }
    return new Scenario({
      ...this.props,
      status: "UNDER_REVIEW",
      version: this.props.version + 1,
      updatedAt: new Date(),
    });
  }

  approveInternal(expectedVersion: number): Scenario {
    if (this.props.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status !== "UNDER_REVIEW") {
      throw new InvalidScenarioStatusTransitionError(
        `سناریو باید در وضعیت UNDER_REVIEW باشد تا داوری شود (وضعیت فعلی: ${this.props.status})`,
      );
    }
    return new Scenario({
      ...this.props,
      status: "APPROVED_INTERNAL",
      version: this.props.version + 1,
      updatedAt: new Date(),
    });
  }

  requestChanges(expectedVersion: number): Scenario {
    if (this.props.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(this.props.version, expectedVersion);
    }
    if (this.props.status !== "UNDER_REVIEW") {
      throw new InvalidScenarioStatusTransitionError(
        `سناریو باید در وضعیت UNDER_REVIEW باشد تا درخواست تغییر داده شود`,
      );
    }
    return new Scenario({
      ...this.props,
      status: "DRAFT",
      version: this.props.version + 1,
      updatedAt: new Date(),
    });
  }

  archive(expectedVersion: number): Scenario {
    if (this.props.version !== expectedVersion) {
      throw new StaleScenarioRevisionError(this.props.version, expectedVersion);
    }
    return new Scenario({
      ...this.props,
      status: "ARCHIVED",
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

  get title(): string {
    return this.props.title;
  }

  get summary(): string {
    return this.props.summary;
  }

  get content(): string {
    return this.props.content;
  }

  get version(): number {
    return this.props.version;
  }

  get status(): ScenarioStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      id: this.props.id,
      researchCaseId: this.props.researchCaseId,
      title: this.props.title,
      summary: this.props.summary,
      content: this.props.content,
      version: this.props.version,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
