export interface InterviewReportProps {
  id: string;
  interviewId: string;
  version: number;
  title: string;
  content: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED";
  createdAt: Date;
  updatedAt: Date;
}

export class InterviewReport {
  private constructor(private readonly props: InterviewReportProps) {}

  static create(params: {
    id: string;
    interviewId: string;
    title: string;
    content: string;
    version?: number;
  }): InterviewReport {
    const now = new Date();
    return new InterviewReport({
      id: params.id,
      interviewId: params.interviewId,
      version: params.version ?? 1,
      title: params.title,
      content: params.content,
      status: "SUBMITTED",
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: InterviewReportProps): InterviewReport {
    return new InterviewReport(props);
  }

  get id(): string {
    return this.props.id;
  }

  get interviewId(): string {
    return this.props.interviewId;
  }

  get version(): number {
    return this.props.version;
  }

  get title(): string {
    return this.props.title;
  }

  get content(): string {
    return this.props.content;
  }

  get status(): "DRAFT" | "SUBMITTED" | "APPROVED" {
    return this.props.status;
  }

  toJSON() {
    return {
      id: this.props.id,
      interviewId: this.props.interviewId,
      version: this.props.version,
      title: this.props.title,
      content: this.props.content,
      status: this.props.status,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
