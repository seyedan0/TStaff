# مدل داده و قیود پایگاه داده

مدل اصلی در `packages/database/prisma/schema.prisma` و migrationهای قابل اجرا در `packages/database/prisma/migrations/` قرار دارند. شناسه و نسخهٔ هر تغییر ساختار باید همراه migration آن بازبینی شود.

## قیود موجود

- `interviews_resource_id_key` روی `interviews.resource_id` یکتاست و مصاحبهٔ دوم برای یک منبع را در سطح دیتابیس مسدود می‌کند (D-07 / FR-058 / AT-30).
- `stage_instances_research_case_id_stage_type_key` برای هر نوع مرحله در یک پرونده یک رکورد نگه می‌دارد.
- `review_decisions_idempotency_key_key` کلید idempotency را در سطح جدول یکتا می‌کند.
- `interview_reports_interview_id_version_key` و `scenario_versions_scenario_id_version_key` نسخه‌های گزارش و سناریو را در محدودهٔ رکورد والد یکتا می‌کنند.
- `provincial_scopes_manager_id_province_id_key`، `user_manager_grants_manager_id_user_id_key` و `resource_referrals_resource_id_recipient_id_key` از تکرار انتساب یا ارجاع یکسان جلوگیری می‌کنند؛ `resource_referrals_applicant_id_key` اتصال تکراری به یک متقاضی را مسدود می‌کند.

محدودیت یک مدیر علمی اصلی فعال و حداکثر یک همکار در گردش دامنه پیاده‌سازی شده است؛ در migrationهای فعلی ایندکس جزئی یکتا برای این دو شرط وجود ندارد. همچنین append-only بودن ممیزی در این migrationها با قید پایگاه داده تضمین نشده است. این موارد برای تضمین سطح دیتابیس و آزمون رقابت واقعی نیازمند کار و بررسی جداگانه‌اند.

## داده‌های اخیر

Migration `20261110_workspace_bank_versions` استان‌های مرجع، قلمرو مدیران، مجوزهای کاربر، ارجاع منابع، نسخه‌های سناریو، درخواست تغییر پژوهش و ستون ارائه‌دهندهٔ ذخیره‌سازی فایل را اضافه می‌کند. فایل باینری خارج از PostgreSQL است و جدول `stored_objects` فراداده و وضعیت اسکن را نگه می‌دارد.

آزمون‌های CI عمدتاً از repository ساختگی استفاده می‌کنند. پیش از اعمال migration روی محیط عملیاتی، نسخهٔ پشتیبان، اجرای آزمایشی migration و کنترل قیود روی PostgreSQL مجزا لازم است.
