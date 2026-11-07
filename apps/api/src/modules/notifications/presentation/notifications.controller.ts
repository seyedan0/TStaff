import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import {
  CreateNotificationDtoSchema,
  NotificationQuerySchema,
} from "@tstaff/contracts";
import { NotificationsService } from "../application/notifications.service.js";
import {
  StageGuard,
  RequireStage,
} from "../../../platform/security/stage.guard.js";

@ApiTags("Notifications (سیستم اعلان‌ها)")
@Controller("notifications")
@UseGuards(StageGuard)
@ApiHeader({
  name: "x-user-stage",
  description: "سطح کاربری جهت اعتبارسنجی سطح دسترسی",
  required: true,
})
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "دریافت فهرست اعلان‌های کاربر جاری (D-04, FR-060, AT-32)",
  })
  @ApiResponse({
    status: 200,
    description: "فهرست اعلان‌ها با موفقیت بازگردانده شد",
  })
  async getUserNotifications(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Query("userId") queryUserId: string | undefined,
    @Query() query: unknown,
  ) {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const filter = NotificationQuerySchema.parse(query);
    const notifications =
      await this.notificationsService.getUserNotifications(userId, filter);
    return notifications.map((n) => n.toJSON());
  }

  @Get("unread-count")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "دریافت تعداد اعلان‌های خوانده‌نشده کاربر" })
  async getUnreadCount(
    @Headers("x-user-id") headerUserId: string | undefined,
    @Query("userId") queryUserId: string | undefined,
  ) {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post()
  @RequireStage("INTERN")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "ایجاد اعلان جدید (با قابلیت علامت‌گذاری رویداد حساس D-04)",
  })
  @ApiResponse({
    status: 201,
    description: "اعلان با موفقیت ایجاد شد",
  })
  async createNotification(@Body() body: unknown) {
    const dto = CreateNotificationDtoSchema.parse(body);
    const notification =
      await this.notificationsService.createNotification(dto);
    return notification.toJSON();
  }

  @Patch(":id/read")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "علامت‌گذاری اعلان به عنوان خوانده‌شده" })
  @ApiResponse({
    status: 200,
    description: "وضعیت اعلان به‌روزرسانی شد",
  })
  async markAsRead(
    @Param("id") id: string,
    @Headers("x-user-id") headerUserId: string | undefined,
    @Query("userId") queryUserId: string | undefined,
  ) {
    const userId = headerUserId || queryUserId;
    if (!userId) {
      throw new BadRequestException("شناسه کاربر الزامی است (x-user-id)");
    }
    const notification = await this.notificationsService.markAsRead(id, userId);
    return notification.toJSON();
  }
}
