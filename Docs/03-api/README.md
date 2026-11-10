# استانداردهای API و ارتباطات (API Standards & Contracts)

## پیشوند و قالب روت‌ها
- تمام مسیرهای REST با `/api/v1` آغاز می‌شوند.
- قالب نام‌گذاری منابع به‌صورت جمع و kebab-case است (مانند `/api/v1/research-cases`).

## ساختار استاندارد پاسخ خطا (RFC 7807 Problem Details)
```json
{
  "type": "https://docs.tstaff.local/errors/stale-revision",
  "title": "Stale revision",
  "status": 409,
  "code": "STALE_REVISION",
  "detail": "The submission version has already been decided by another supervisor.",
  "traceId": "01J...ULID",
  "currentVersion": 2
}
```

## کلیدهای اجباری برای عملیات حساس
- `Idempotency-Key`: جلوگیری از تکرار درخواست ثبت تصمیم یا پرداخت.
- `If-Match` یا فیلد `expectedVersion`: کنترل همزمانی در ثبت تصمیم داوری.

## مسیرهای اصلی اضافه‌شده در نسخه اجرایی
- **کارتابل و دسترسی علمی:** `GET /api/v1/scientific-supervisors/me/workspace` (مرتب‌سازی موارد نیازمند اقدام در صدر و قدیمی‌ترین درخواست اول)، `GET /api/v1/scientific-supervisors/me/trainees/:userId`.
- **درخواست‌های بازگشایی پژوهش:** `GET/POST /api/v1/research-cases/:caseId/change-requests` و `POST /api/v1/research-cases/:caseId/change-requests/:requestId/decide`؛ به همراه `GET /api/v1/research-cases/directory` برای پایش مدیر پیگیری.
- **بانک منابع و ارجاع بین‌استانی:** `GET /api/v1/resource-bank`، `GET /api/v1/resource-bank/:id` (محدود به مشخصات فرد، مجموعه، تماس، موقعیت و وضعیت معرفی بدون افشای گزارش یا فایل)، `POST /api/v1/resource-bank/:id/referrals`، `DELETE /api/v1/resource-bank/referrals/:id` و `POST /api/v1/resource-bank/:id/applicants`.
- **قلمرو استانی و مجوزهای مدیریتی:** `GET /api/v1/organization/provinces`، `GET /api/v1/organization/scopes`، `POST/DELETE /api/v1/organization/provincial-scopes` و `GET/POST/DELETE /api/v1/organization/user-grants`.
- **حذف کاوش عمومی بانک سناریو:** مسیر سراسری `GET /api/v1/scenarios` حذف شده و دسترسی به سناریوها فقط در چارچوب پرونده و کارتابل علمی مجاز است.

## مسیرهای URL فرانت‌اند (`apps/web` با React Router)
- ورود و بازگشت مقصد: `/login` (حفظ `returnTo` امن برای لینک‌های مستقیم، و بازگشت تمیز به `/login` هنگام خروج صریح).
- پرونده‌ها و مراحل: `/projects`، `/projects/new`، `/projects/:caseId`، `/projects/:caseId/stages/:stageType`، `/projects/:caseId/resources/:resourceId`.
- کارتابل علمی و پذیرش: `/supervision/users`، `/supervision/users/:userId`، `/supervision/reviews`، `/supervision/evaluations`، `/admissions`، `/admissions/new`، `/admissions/:applicantId`.
- بانک منابع، کتابخانه و پشتیبانی: `/resource-bank`، `/resource-bank/:resourceId`، `/library`، `/library/:documentId`، `/messages`، `/messages/:conversationId`، `/province/metrics`، `/tracking/:section`، `/support/tickets/:ticketId?`، `/support/users/:userId?`، `/management/:section`.

