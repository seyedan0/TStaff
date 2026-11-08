import { UserAlreadyPromotedError, UserSuspendedError } from "./user-errors.js";

export type UserStageType = "APPRENTICE" | "INTERN";

export interface UserProps {
  id: string;
  applicantId?: string | null | undefined;
  phoneNumber: string;
  email?: string | null | undefined;
  passwordHash?: string | null | undefined;
  stage: UserStageType;
  isActive: boolean;
  isMfaEnabled: boolean;
  fullName?: string | null | undefined;
  role?: string | null | undefined;
  roles?: string[] | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  public static create(
    params: Omit<
      UserProps,
      "id" | "stage" | "isActive" | "isMfaEnabled" | "createdAt" | "updatedAt"
    > & {
      id: string;
      initialPasswordHash?: string | null;
    },
  ): User {
    return new User({
      id: params.id,
      applicantId: params.applicantId,
      phoneNumber: params.phoneNumber,
      email: params.email,
      passwordHash: params.initialPasswordHash,
      fullName: params.fullName,
      role: params.role ?? "APPRENTICE",
      stage: "APPRENTICE", // Starts as Apprentice (FR-003)
      isActive: true,
      isMfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: UserProps): User {
    return new User(props);
  }

  public get id(): string {
    return this.props.id;
  }

  public get applicantId(): string | null | undefined {
    return this.props.applicantId;
  }

  public get phoneNumber(): string {
    return this.props.phoneNumber;
  }

  public get email(): string | null | undefined {
    return this.props.email;
  }

  public get passwordHash(): string | null | undefined {
    return this.props.passwordHash;
  }

  public get stage(): UserStageType {
    return this.props.stage;
  }

  public get isActive(): boolean {
    return this.props.isActive;
  }

  public get fullName(): string | null | undefined {
    return this.props.fullName;
  }

  public get role(): string | null | undefined {
    return this.props.role;
  }

  public get isMfaEnabled(): boolean {
    return this.props.isMfaEnabled;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public promoteToIntern(): User {
    if (!this.props.isActive) {
      throw new UserSuspendedError(this.props.id);
    }
    if (this.props.stage === "INTERN") {
      throw new UserAlreadyPromotedError(this.props.id);
    }
    return new User({
      ...this.props,
      stage: "INTERN",
      role: "INTERN",
      updatedAt: new Date(),
    });
  }

  public suspend(): User {
    return new User({
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    });
  }

  public reactivate(): User {
    return new User({
      ...this.props,
      isActive: true,
      updatedAt: new Date(),
    });
  }

  public toJSON(): Omit<UserProps, "passwordHash"> {
    const { passwordHash, ...safe } = this.props;
    return safe;
  }
}
