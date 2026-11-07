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

