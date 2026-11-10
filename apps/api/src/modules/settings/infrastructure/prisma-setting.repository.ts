import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@tstaff/database";
import { SystemSetting } from "../domain/system-setting.entity.js";
import type { SettingRepositoryPort } from "../application/ports/setting.repository.port.js";

@Injectable()
export class PrismaSettingRepository implements SettingRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(setting: SystemSetting): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description ?? null,
        updatedBy: setting.updatedBy ?? null,
        updatedAt: setting.updatedAt,
      },
      update: {
        value: setting.value,
        description: setting.description ?? null,
        updatedBy: setting.updatedBy ?? null,
        updatedAt: setting.updatedAt,
      },
    });
  }

  async findByKey(key: string): Promise<SystemSetting | null> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findAll(): Promise<SystemSetting[]> {
    const rows = await this.prisma.systemSetting.findMany({
      orderBy: { key: "asc" },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(row: {
    key: string;
    value: string;
    description: string | null;
    updatedBy: string | null;
    updatedAt: Date;
  }): SystemSetting {
    return SystemSetting.reconstitute({
      key: row.key,
      value: row.value,
      description: row.description,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    });
  }
}
