import { Module } from "@nestjs/common";
import { AuthController } from "./presentation/auth.controller.js";
import { UsersController } from "./presentation/users.controller.js";
import {
  IdentityService,
  USER_REPOSITORY,
  PASSWORD_HASHER,
} from "./application/identity.service.js";
import { PrismaUserRepository } from "./infrastructure/prisma-user.repository.js";
import { CryptoPasswordHasher } from "./infrastructure/crypto-password-hasher.js";

@Module({
  imports: [],
  controllers: [AuthController, UsersController],
  providers: [
    IdentityService,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: CryptoPasswordHasher,
    },
  ],
  exports: [IdentityService],
})
export class IdentityModule {}
