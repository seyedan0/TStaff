import { Module } from "@nestjs/common";
import { FilesController } from "./presentation/files.controller.js";
import { FilesService } from "./application/files.service.js";
import {
  PRIVATE_FILE_STORAGE,
  STORED_OBJECT_REPOSITORY,
  VIRUS_SCANNER,
  FILE_ACCESS,
} from "./application/ports/files.ports.js";
import { LocalPrivateFileStorage } from "./infrastructure/local-private-file.storage.js";
import { PrismaStoredObjectRepository } from "./infrastructure/prisma-stored-object.repository.js";
import { ClamAvVirusScanner } from "./infrastructure/clamav-virus.scanner.js";
import { S3PrivateFileStorage } from "./infrastructure/s3-private-file.storage.js";
import { ProviderPrivateFileStorage } from "./infrastructure/provider-private-file.storage.js";
import { AttachedFileAccessPolicy } from "./infrastructure/attached-file-access.policy.js";

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    LocalPrivateFileStorage,
    S3PrivateFileStorage,
    { provide: PRIVATE_FILE_STORAGE, useClass: ProviderPrivateFileStorage },
    { provide: FILE_ACCESS, useClass: AttachedFileAccessPolicy },
    { provide: STORED_OBJECT_REPOSITORY, useClass: PrismaStoredObjectRepository },
    { provide: VIRUS_SCANNER, useClass: ClamAvVirusScanner },
  ],
  exports: [FilesService],
})
export class FilesModule {}
