import { describe, it, expect, beforeEach } from "vitest";
import { SettingsService } from "./settings.service.js";
import { SystemSetting } from "../domain/system-setting.entity.js";
import { SettingNotFoundError } from "../domain/settings-errors.js";
import type { SettingRepositoryPort } from "./ports/setting.repository.port.js";

class InMemorySettingRepository implements SettingRepositoryPort {
  private settings = new Map<string, SystemSetting>();

  async save(setting: SystemSetting): Promise<void> {
    this.settings.set(setting.key, setting);
  }

  async findByKey(key: string): Promise<SystemSetting | null> {
    return this.settings.get(key) || null;
  }

  async findAll(): Promise<SystemSetting[]> {
    return Array.from(this.settings.values());
  }
}

describe("SettingsService & Runtime Dynamic Config (FR-052, AT-34)", () => {
  let repo: InMemorySettingRepository;
  let service: SettingsService;

  beforeEach(() => {
    repo = new InMemorySettingRepository();
    service = new SettingsService(repo);
  });

  it("creates a new system setting when not existing", async () => {
    const setting = await service.updateSetting(
      "STAGE_DEADLINE_DAYS",
      { value: "45", description: "مهلت زمانی هر مرحله به روز" },
      "admin-01",
    );

    expect(setting.key).toBe("STAGE_DEADLINE_DAYS");
    expect(setting.value).toBe("45");
    expect(setting.updatedBy).toBe("admin-01");

    const fetched = await service.getSetting("STAGE_DEADLINE_DAYS");
    expect(fetched.value).toBe("45");
  });

  it("updates an existing system setting value without redeployment", async () => {
    await service.updateSetting("MAX_SUPERVISOR_CAPACITY", {
      value: "5",
      description: "ظرفیت حداکثری مدیر علمی",
    });

    const updated = await service.updateSetting("MAX_SUPERVISOR_CAPACITY", {
      value: "7",
    });

    expect(updated.value).toBe("7");
    expect(updated.description).toBe("ظرفیت حداکثری مدیر علمی");
  });

  it("throws SettingNotFoundError when setting does not exist", async () => {
    await expect(service.getSetting("NON_EXISTING")).rejects.toThrow(
      SettingNotFoundError,
    );
  });
});

