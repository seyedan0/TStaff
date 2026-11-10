# مستندات دامنه و ماشین وضعیت (Domain & State Machines)

## وضعیت‌های متقاضی (Applicant States)
`DRAFT -> PENDING_SCIENTIFIC_REVIEW -> APPROVED | REJECTED`
- وضعیت ویژه بازگشایی: `REJECTED -> REOPEN_REQUESTED -> REOPEN_APPROVED -> PENDING_SCIENTIFIC_REVIEW`

## وضعیت‌های کاربر (User Growth Stages)
`APPRENTICE -> INTERN`
- وضعیت‌های حساب: `ACTIVE | SUSPENDED | CLOSED_ARCHIVED`

## وضعیت‌های مراحل پژوهش (Research Stage States)
`DRAFT -> SUBMITTED -> CHANGES_REQUESTED | APPROVED`
- وضعیت‌های اعتبار وابستگی: `VALID | REVIEW_REQUIRED`
- بازگشت یا تغییر در پیش‌نیازها باعث تبدیل وضعیت خروجی به `REVIEW_REQUIRED` می‌شود.

## کارتابل مدیر علمی، درخواست بازگشایی و تفکیک دسترسی
- **دسترسی سطح کاربر (`scientific_supervisor_assignments`) و سطح پژوهش (`research_assignments`):** مدیر منتسب به کاربر به پروفایل هویتی، پژوهش‌ها و تاریخچه مرتبط دسترسی دارد؛ مدیر منتسب صرفاً به پژوهش (اصلی یا همکار) فقط همان پژوهش را با نمای محدودشده پروفایل می‌بیند. لغو انتساب فوراً دسترسی ناشی از همان انتساب را قطع می‌کند بدون آن‌که سوابق تصمیم پاک شوند.
- **بازگشایی مرحله تأییدشده (`research_change_requests`):** پس از تأیید درخواست بازگشایی با کنترل نسخه اتمی (`409 STALE_REVISION`)، مرحله هدف به `IN_PROGRESS` و مراحل وابسته بعدی مطابق `D-05` به `REVIEW_REQUIRED` می‌روند و نسخه‌های قبلی حفظ می‌شوند.
- **منابع و بانک منابع (`resource_referrals`):** رکوردهای منبع مستقل و غیرقابل ادغام باقی می‌مانند (`uq_interview_resource` برقرار است). ارجاع بین‌استانی وضعیت `PENDING -> CONVERTING -> CONVERTED | REVOKED` دارد و تبدیل به پرونده پذیرش تا پیش از تأیید علمی حساب کاربری (`User`) نمی‌سازد (`FR-001`).
- **سناریوها (`scenario_versions`):** هر تغییر سناریو نسخه جدیدی ثبت می‌کند و تصمیم‌ها با `actualVersion` و `reviewerName` نگه داشته می‌شوند. دسترسی به سناریو منحصراً از مسیر پرونده پژوهش یا کارتابل مجاز است.

