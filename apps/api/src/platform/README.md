# Platform Layer (`apps/api/src/platform`)

زیرساخت‌های مشترک و فنی سرور NestJS:
- `config`: مدیریت متغیرهای محیطی و اعتبارسنجی آن‌ها.
- `db`: کلاینت پایگاه داده PostgreSQL و تراکنش‌ها.
- `events`: سیستم انتشار و دریافت رویدادها (Outbox Event Bus).
- `errors`: تبدیل خطاهای دامنه به قالب Problem Details (RFC 7807).
- `logging`: لاگر ساختاریافته JSON با حذف PII و افزودن `traceId`.
- `health`: مانیتورینگ سلامت سرویس‌ها (`/health`).
- `security`: گاردهای احراز هویت نشست و محافظت‌های CSRF و Rate Limit.

