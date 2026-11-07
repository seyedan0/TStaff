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

