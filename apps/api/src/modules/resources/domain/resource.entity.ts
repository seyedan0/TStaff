import type { ResourceType, ResourceStatus } from "@tstaff/contracts";
import { InterviewAlreadyExistsForResourceError } from "./resource-errors.js";

export interface ResourceProps {
  id: string;
  researchCaseId: string;
  type: ResourceType;
  title: string;
  description: string | null;
  contactInfo: string | null;
  personAge?: number | null;
  position?: string | null;
  provinceId?: string | null;
  province?: string | null;
  county?: string | null;
  status: ResourceStatus;
  interviewId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Resource {
  private constructor(private readonly props: ResourceProps) {}

  static create(params: {
    id: string;
    researchCaseId: string;
    type: ResourceType;
    title: string;
    description?: string | null;
    contactInfo?: string | null;
    personAge?: number | null;
    position?: string | null;
    provinceId?: string | null;
    province?: string | null;
    county?: string | null;
  }): Resource {
    const now = new Date();
    return new Resource({
      id: params.id,
      researchCaseId: params.researchCaseId,
      type: params.type,
      title: params.title,
      description: params.description ?? null,
      contactInfo: params.contactInfo ?? null,
      personAge: params.personAge ?? null,
      position: params.position ?? null,
      provinceId: params.provinceId ?? null,
      province: params.province ?? null,
      county: params.county ?? null,
      status: "IDENTIFIED",
      interviewId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ResourceProps): Resource {
    return new Resource(props);
  }

  attachInterview(interviewId: string): Resource {
    if (this.props.interviewId !== null) {
      throw new InterviewAlreadyExistsForResourceError(this.props.id);
    }

    return new Resource({
      ...this.props,
      interviewId,
      status: "INTERVIEWED",
      updatedAt: new Date(),
    });
  }

  updateInfo(params: {
    title?: string | undefined;
    description?: string | undefined;
    contactInfo?: string | undefined;
    personAge?: number | undefined;
    position?: string | undefined;
    provinceId?: string | null | undefined;
    province?: string | undefined;
    county?: string | undefined;
  }): Resource {
    return new Resource({
      ...this.props,
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.description !== undefined ? { description: params.description || null } : {}),
      ...(params.contactInfo !== undefined ? { contactInfo: params.contactInfo || null } : {}),
      ...(params.personAge !== undefined ? { personAge: params.personAge } : {}),
      ...(params.position !== undefined ? { position: params.position || null } : {}),
      ...(params.provinceId !== undefined ? { provinceId: params.provinceId } : {}),
      ...(params.province !== undefined ? { province: params.province || null } : {}),
      ...(params.county !== undefined ? { county: params.county || null } : {}),
      updatedAt: new Date(),
    });
  }

  validate(): Resource {
    return new Resource({
      ...this.props,
      status: "VALIDATED",
      updatedAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get researchCaseId(): string {
    return this.props.researchCaseId;
  }

  get type(): ResourceType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string | null {
    return this.props.description;
  }

  get contactInfo(): string | null {
    return this.props.contactInfo;
  }

  get status(): ResourceStatus {
    return this.props.status;
  }

  get interviewId(): string | null {
    return this.props.interviewId;
  }

  toJSON() {
    return {
      id: this.props.id,
      researchCaseId: this.props.researchCaseId,
      type: this.props.type,
      title: this.props.title,
      description: this.props.description,
      contactInfo: this.props.contactInfo,
      personAge: this.props.personAge ?? null,
      position: this.props.position ?? null,
      provinceId: this.props.provinceId ?? null,
      province: this.props.province ?? null,
      county: this.props.county ?? null,
      status: this.props.status,
      interviewId: this.props.interviewId,
      hasInterview: this.props.interviewId !== null,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
