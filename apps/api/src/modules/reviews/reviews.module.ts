import { Module } from "@nestjs/common";
import { ReviewsController } from "./presentation/reviews.controller.js";
import {
  ReviewsService,
  REVIEW_REPOSITORY,
} from "./application/reviews.service.js";
import { PrismaReviewRepository } from "./infrastructure/prisma-review.repository.js";
import { ResearchModule } from "../research/research.module.js";
import { AssignmentsModule } from "../assignments/assignments.module.js";

@Module({
  imports: [ResearchModule, AssignmentsModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    {
      provide: REVIEW_REPOSITORY,
      useClass: PrismaReviewRepository,
    },
  ],
  exports: [ReviewsService],
})
export class ReviewsModule {}
