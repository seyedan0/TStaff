import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import {
  CreateConversationDtoSchema,
  SendMessageDtoSchema,
} from "@tstaff/contracts";
import { MessagingService } from "../application/messaging.service.js";
import { StageGuard } from "../../../platform/security/stage.guard.js";

@ApiTags("Messaging (پیام‌رسان دونفره FR-024, AT-10)")
@Controller("conversations")
@UseGuards(StageGuard)
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی",
  required: true,
})
export class MessagingController {
  constructor(
    @Inject(MessagingService)
    private readonly messagingService: MessagingService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "ایجاد یا بازیابی گفت‌وگوی دونفره مستقیم میان کاربر و مخاطب (FR-024, AT-10, BR-16)",
  })
  @ApiResponse({
    status: 200,
    description: "گفت‌وگوی دونفره مستقیم بازگردانده شد",
  })
  async createOrGetConversation(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Body() body: unknown,
  ) {
    if (!headerUserId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const dto = CreateConversationDtoSchema.parse(body);
    const conversation =
      await this.messagingService.createOrGetDirectConversation(
        headerUserId,
        dto.participantId,
        dto.type,
        dto.researchCaseId,
      );
    return conversation.toJSON();
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت فهرست گفت‌وگوهای کاربر جاری" })
  async getMyConversations(
    @Headers("x-user-id") headerUserId: string | undefined,
  ) {
    if (!headerUserId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const conversations =
      await this.messagingService.getUserConversations(headerUserId);
    return conversations.map((c) => c.toJSON());
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت مشخصات گفت‌وگو با شناسه" })
  async getConversationById(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
  ) {
    if (!headerUserId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const conversation = await this.messagingService.getConversationById(
      id,
      headerUserId,
    );
    return conversation.toJSON();
  }

  @Get(":id/messages")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت تاریخچه پیام‌های گفت‌وگو" })
  async getMessages(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
    @Query("limit") limit?: string,
  ) {
    if (!headerUserId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 100;
    const messages = await this.messagingService.getConversationMessages(
      id,
      headerUserId,
      parsedLimit,
    );
    return messages.map((m) => m.toJSON());
  }

  @Post(":id/messages")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "ارسال پیام جدید در گفت‌وگوی دونفره (FR-030)" })
  @ApiResponse({
    status: 201,
    description: "پیام با موفقیت ارسال شد",
  })
  async sendMessage(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
    @Body() body: unknown,
  ) {
    if (!headerUserId) {
      throw new BadRequestException("شناسه فرستنده الزامی است (x-user-id)");
    }
    const dto = SendMessageDtoSchema.parse(body);
    const message = await this.messagingService.sendMessage(
      id,
      headerUserId,
      dto,
    );
    return message.toJSON();
  }
}
