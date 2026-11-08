import { Module } from "@nestjs/common";
import { AssignmentsModule } from "../assignments/assignments.module.js";
import { FilesController } from "./presentation/files.controller.js";
import { FilesService } from "./application/files.service.js";
import {
  PRIVATE_FILE_STORAGE,
  STORED_OBJECT_REPOSITORY,
  VIRUS_SCANNER,
} from "./application/ports/files.ports.js";
import { LocalPrivateFileStorage } from "./infrastructure/local-private-file.storage.js";
import { PrismaStoredObjectRepository } from "./infrastructure/prisma-stored-object.repository.js";
import { ClamAvVirusScanner } from "./infrastructure/clamav-virus.scanner.js";

@Module({
  imports: [AssignmentsModule],
  controllers: [FilesController],
  providers: [
    FilesService,
    { provide: PRIVATE_FILE_STORAGE, useClass: LocalPrivateFileStorage },
    { provide: STORED_OBJECT_REPOSITORY, useClass: PrismaStoredObjectRepository },
    { provide: VIRUS_SCANNER, useClass: ClamAvVirusScanner },
  ],
  exports: [FilesService],
})
export class FilesModule {}
