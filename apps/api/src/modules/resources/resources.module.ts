import { forwardRef, Module } from "@nestjs/common";
import { ResourcesController } from "./presentation/resources.controller.js";
import {
  ResourcesService,
  RESOURCE_REPOSITORY,
} from "./application/resources.service.js";
import { PrismaResourceRepository } from "./infrastructure/prisma-resource.repository.js";
import { FilesModule } from "../files/files.module.js";
import { ResearchModule } from "../research/research.module.js";

@Module({
  imports: [FilesModule, forwardRef(() => ResearchModule)],
  controllers: [ResourcesController],
  providers: [
    ResourcesService,
    {
      provide: RESOURCE_REPOSITORY,
      useClass: PrismaResourceRepository,
    },
  ],
  exports: [ResourcesService],
})
export class ResourcesModule {}
