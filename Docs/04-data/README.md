# مدل داده و قواعد یکپارچگی پایگاه داده (Data Model & Constraints)

## قواعد کلیدی طراحی دیتابیس
1. **یکتایی مصاحبه برای هر منبع:**
   ```sql
   CREATE UNIQUE INDEX uq_interview_resource ON interviews(resource_id);
   ```
2. **حداکثر یک مدیر اصلی فعال:**
   ```sql
   CREATE UNIQUE INDEX uq_research_main_active
   ON research_assignments(research_id)
   WHERE assignment_kind = 'MAIN' AND revoked_at IS NULL;
   ```
3. **حداکثر یک همکار فعال:**
   ```sql
   CREATE UNIQUE INDEX uq_research_collab_active
   ON research_assignments(research_id)
   WHERE assignment_kind = 'COLLABORATOR' AND revoked_at IS NULL;
   ```
4. **جلوگیری از ارسال تکراری تصمیم:**
   ```sql
   CREATE UNIQUE INDEX uq_review_idempotency
   ON review_decisions(actor_id, idempotency_key);
   ```
5. **جدول ممیزی غیرقابل ویرایش (Append-only Audit Log):**
   هیچ عملیات `UPDATE` یا `DELETE` روی جدول `audit_events` مجاز نیست.
6. **مهاجرت ساختاری `20261110_workspace_bank_versions`:**
   - جدول استان‌های مرجع `provinces` (۳۱ استان با شناسه‌های ثابت `@tstaff/contracts`) و ستون `resources.province_id`.
   - جدول قلمرو مدیران استانی `provincial_scopes` (`@@unique([manager_id, province_id])`) و جدول مجوز مشاهده پروفایل کاربری `user_manager_grants`.
   - جدول `resource_referrals` با محدودیت یکتایی `(resource_id, recipient_id)` و `applicant_id` برای جلوگیری از ارجاع و تبدیل تکراری.
   - جدول تاریخچه نسخه‌های سناریو `scenario_versions` (`@@unique([scenario_id, version])`) و ستون `scenarios.created_by_id`.
   - جدول `research_change_requests` برای درخواست‌های بازگشایی مرحله تأییدشده همراه با `expected_version` و `version`.
   - ستون `stored_objects.storage_provider` (`LOCAL` / `S3`) جهت حفظ دسترسی به فایل‌های پیشین هنگام تغییر ارائه‌دهنده ذخیره‌سازی.

