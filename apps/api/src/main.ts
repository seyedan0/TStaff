import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { ProblemDetailsFilter } from "./platform/errors/problem-details.filter.js";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Global RFC 7807 Exception Filter
  app.useGlobalFilters(new ProblemDetailsFilter());

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // CORS Configuration
  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:3100",
      "http://localhost:3000",
      "http://localhost:3100",
      "http://127.0.0.1:3100",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  });

  // Swagger / OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle("TStaff Core API")
    .setDescription(
      "مستندات رابط برنامه‌نویسی سامانه مدیریت شبکه پژوهشگران و فرایندهای پژوهشی (TStaff)\nمعماری Modular Monolith با استاندارد RFC 7807 Problem Details",
    )
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`TStaff Core API running on http://localhost:${port}/api/v1`);
  logger.log(
    `OpenAPI (Swagger) Docs available on http://localhost:${port}/api/docs`,
  );
}

bootstrap();
