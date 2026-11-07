import { SystemSetting } from "../../domain/system-setting.entity.js";

export interface SettingRepositoryPort {
  save(setting: SystemSetting): Promise<void>;
  findByKey(key: string): Promise<SystemSetting | null>;
  findAll(): Promise<SystemSetting[]>;
}

