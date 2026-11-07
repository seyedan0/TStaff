import { Module } from "@nestjs/common";
import { SettingsController } from "./presentation/settings.controller.js";
import {
  SettingsService,
  SETTING_REPOSITORY,
} from "./application/settings.service.js";
import { PrismaSettingRepository } from "./infrastructure/prisma-setting.repository.js";

@Module({
  imports: [],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    {
      provide: SETTING_REPOSITORY,
      useClass: PrismaSettingRepository,
    },
  ],
  exports: [SettingsService],
})
export class SettingsModule {}
