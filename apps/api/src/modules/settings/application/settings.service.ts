import { Injectable, Inject } from "@nestjs/common";
import type { UpdateSystemSettingDto } from "@tstaff/contracts";
import { SystemSetting } from "../domain/system-setting.entity.js";
import { SettingNotFoundError } from "../domain/settings-errors.js";
import type { SettingRepositoryPort } from "./ports/setting.repository.port.js";

export const SETTING_REPOSITORY = Symbol("SETTING_REPOSITORY");

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SETTING_REPOSITORY)
    private readonly settingRepo: SettingRepositoryPort,
  ) {}

  /**
   * Rule FR-052 / AT-34:
   * System settings are configurable at runtime without code deployment.
   */
  async getSetting(key: string): Promise<SystemSetting> {
    const setting = await this.settingRepo.findByKey(key);
    if (!setting) {
      throw new SettingNotFoundError(key);
    }
    return setting;
  }

  async getAllSettings(): Promise<SystemSetting[]> {
    return this.settingRepo.findAll();
  }

  async updateSetting(
    key: string,
    dto: UpdateSystemSettingDto,
    updatedBy?: string,
  ): Promise<SystemSetting> {
    const existing = await this.settingRepo.findByKey(key);
    let updated: SystemSetting;

    if (existing) {
      updated = existing.updateValue({
        value: dto.value,
        description: dto.description,
        updatedBy,
      });
    } else {
      updated = SystemSetting.create({
        key,
        value: dto.value,
        description: dto.description,
        updatedBy,
      });
    }

    await this.settingRepo.save(updated);
    return updated;
  }
}

