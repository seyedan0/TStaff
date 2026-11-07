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

