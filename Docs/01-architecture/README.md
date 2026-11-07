# مستندات معماری کلان (Architecture Documentation)

## سبک معماری
سامانه TStaff از معماری **Modular Monolith** با رویکرد **API-First** بهره می‌برد.

### لایه‌بندی داخلی هر ماژول
```text
modules/<module-name>/
├── domain/         # خالص؛ شامل موجودیت‌ها، ارزش‌ها (Value Objects) و خطاهای دامنه
├── application/    # واسط‌های کاربردی (Use Cases)، پورت‌ها (Ports) و هندلرهای دستور
├── infrastructure/ # پیاده‌سازی پورت‌ها، ریپازیتوری‌های پایگاه داده و آداپتورها
└── presentation/   # کنترلرهای HTTP و اعتبارسنجی ورودی‌ها (REST Controllers / Socket)
```

### قواعد جریان وابستگی
- وابستگی‌ها همواره از لایه‌های بیرونی به لایه‌های درونی است:
  `Presentation -> Application -> Domain`
  `Infrastructure -> Application Ports`
- هیچ کدی در `domain` نباید به دیتابیس، NestJS، یا کتابخانه‌های وب وابسته باشد.
- ارتباط بین ماژول‌ها فقط از طریق Public Serviceهای ماژول یا انتشار رویدادهای دامنه در Outbox مجاز است.

