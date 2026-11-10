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
  Req,
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
    @Req() request: any,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است");
    }
    const dto = CreateConversationDtoSchema.parse(body);
    const roles: string[] = request?.user?.roles ?? (request?.user?.role ? [request.user.role] : []);
    const conversation =
      await this.messagingService.createOrGetDirectConversation(
        userId,
        dto.participantId,
        dto.type,
        dto.researchCaseId,
        roles,
      );
    return conversation.toJSON();
  }

  @Get("contacts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت فهرست مخاطبین مجاز گفت‌وگوی دونفره" })
  async getContacts(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Req() request: any,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است");
    }
    const roles: string[] = request?.user?.roles ?? (request?.user?.role ? [request.user.role] : []);
    return this.messagingService.getContacts(userId, roles);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت فهرست گفت‌وگوهای کاربر جاری" })
  async getMyConversations(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Req() request: any,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است");
    }
    const conversations =
      await this.messagingService.getUserConversations(userId);
    return this.messagingService.enrichConversations(userId, conversations);
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت مشخصات گفت‌وگو با شناسه" })
  async getConversationById(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
    @Req() request: any,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است");
    }
    const conversation = await this.messagingService.getConversationById(
      id,
      userId,
    );
    return conversation.toJSON();
  }

  @Get(":id/messages")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت تاریخچه پیام‌های گفت‌وگو" })
  async getMessages(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
    @Req() request: any,
    @Query("limit") limit?: string,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است");
    }
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 100;
    const messages = await this.messagingService.getConversationMessages(
      id,
      userId,
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
    @Req() request: any,
  ) {
    const userId = request?.user?.id ?? headerUserId;
    if (!userId) {
      throw new BadRequestException("شناسه فرستنده الزامی است");
    }
    const dto = SendMessageDtoSchema.parse(body);
    const message = await this.messagingService.sendMessage(
      id,
      userId,
      dto,
    );
    return message.toJSON();
  }
}
