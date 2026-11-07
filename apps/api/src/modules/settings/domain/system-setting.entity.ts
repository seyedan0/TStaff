export interface SystemSettingProps {
  key: string;
  value: string;
  description?: string | null | undefined;
  updatedBy?: string | null | undefined;
  updatedAt: Date;
}

export class SystemSetting {
  private constructor(private readonly props: SystemSettingProps) {}

  public static create(params: {
    key: string;
    value: string;
    description?: string | null | undefined;
    updatedBy?: string | null | undefined;
  }): SystemSetting {
    return new SystemSetting({
      key: params.key,
      value: params.value,
      description: params.description ?? null,
      updatedBy: params.updatedBy ?? null,
      updatedAt: new Date(),
    });
  }

  public static reconstitute(props: SystemSettingProps): SystemSetting {
    return new SystemSetting(props);
  }

  public get key(): string {
    return this.props.key;
  }

  public get value(): string {
    return this.props.value;
  }

  public get description(): string | null | undefined {
    return this.props.description;
  }

  public get updatedBy(): string | null | undefined {
    return this.props.updatedBy;
  }

  public get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public updateValue(params: {
    value: string;
    description?: string | null | undefined;
    updatedBy?: string | null | undefined;
  }): SystemSetting {
    return new SystemSetting({
      ...this.props,
      value: params.value,
      description:
        params.description !== undefined
          ? params.description
          : this.props.description,
      updatedBy:
        params.updatedBy !== undefined
          ? params.updatedBy
          : this.props.updatedBy,
      updatedAt: new Date(),
    });
  }

  public toJSON(): SystemSettingProps {
    return { ...this.props };
  }
}
