import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response, Request } from "express";
import { randomUUID } from "node:crypto";
import { type ProblemDetails, ZodError } from "@tstaff/contracts";

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = (request.headers["x-trace-id"] as string) || randomUUID();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let title = "خطای داخلی سرور";
    let detail = "یک خطای پیش‌بینی‌نشده در سرور رخ داده است.";
    let currentVersion: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp["code"] as string) || this.getDefaultCode(status);
        title =
          (resp["error"] as string) ||
          (resp["title"] as string) ||
          exception.message;
        const rawMessage =
          resp["message"] ?? resp["detail"] ?? exception.message;
        detail = Array.isArray(rawMessage)
          ? rawMessage.join("; ")
          : String(rawMessage);
        if (typeof resp["currentVersion"] === "number") {
          currentVersion = resp["currentVersion"];
        }
      } else {
        title = exception.message;
        detail = exception.message;
        code = this.getDefaultCode(status);
      }
    } else if (
      exception instanceof ZodError ||
      (typeof exception === "object" &&
        exception !== null &&
        (exception as { name?: string }).name === "ZodError" &&
        Array.isArray((exception as { issues?: unknown }).issues))
    ) {
      const zodErr = exception as ZodError;
      status = HttpStatus.BAD_REQUEST;
      code = "VALIDATION_ERROR";
      title = "خطای اعتبارسنجی ورودی";
      detail = zodErr.issues
        .map((issue) =>
          issue.path.length > 0
            ? `${issue.path.join(".")}: ${issue.message}`
            : issue.message,
        )
        .join("; ");
    } else if (
      exception instanceof Error &&
      (exception.name === "DomainError" ||
        (exception as { isDomainError?: boolean }).isDomainError === true) &&
      "code" in exception &&
      typeof (exception as { code: unknown }).code === "string"
    ) {
      const domainCode = (exception as { code: string }).code;
      const mapped = this.mapDomainErrorCode(domainCode);
      status = mapped.status;
      code = domainCode;
      title = mapped.title;
      detail = exception.message;
      if (
        "currentVersion" in exception &&
        typeof (exception as { currentVersion: unknown }).currentVersion ===
          "number"
      ) {
        currentVersion = (exception as { currentVersion: number })
          .currentVersion;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [traceId: ${traceId}]: ${exception.message}`,
        exception.stack,
      );
      detail =
        process.env.NODE_ENV === "production"
          ? "یک خطای پیش‌بینی‌نشده در سرور رخ داده است."
          : exception.message;
    }

    const problem: ProblemDetails = {
      type: `https://api.tstaff.ir/problems/${code.toLowerCase()}`,
      title,
      status,
      code,
      detail,
      traceId,
      ...(currentVersion !== undefined ? { currentVersion } : {}),
    };

    response.setHeader("Content-Type", "application/problem+json");
    response.status(status).json(problem);
  }

  private mapDomainErrorCode(code: string): {
    status: HttpStatus;
    title: string;
  } {
    if (code.endsWith("_NOT_FOUND") || code === "NOT_FOUND") {
      return {
        status: HttpStatus.NOT_FOUND,
        title: "منبع مورد نظر یافت نشد",
      };
    }

    switch (code) {
      case "INVALID_CREDENTIALS":
      case "UNAUTHORIZED":
        return { status: HttpStatus.UNAUTHORIZED, title: "خطای احراز هویت" };

      case "FORBIDDEN":
      case "USER_SUSPENDED":
      case "INSUFFICIENT_STAGE":
      case "ACCESS_DENIED":
      case "GROUP_CHAT_NOT_ALLOWED":
        return { status: HttpStatus.FORBIDDEN, title: "عدم دسترسی مجاز" };

      case "INVALID_APPLICANT_STATUS_TRANSITION":
      case "USER_ALREADY_PROMOTED":
      case "APPLICANT_ALREADY_EXISTS":
      case "MAIN_SUPERVISOR_ALREADY_ASSIGNED":
      case "COLLABORATOR_SUPERVISOR_ALREADY_ASSIGNED":
      case "SUPERVISOR_CAPACITY_EXCEEDED":
      case "INTERVIEW_ALREADY_EXISTS_FOR_RESOURCE":
      case "STALE_REVISION":
      case "PREREQUISITE_REVIEW_REQUIRED":
      case "SCENARIO_PREREQUISITE_NOT_MET":
      case "CONFLICT":
        return { status: HttpStatus.CONFLICT, title: "تعارض در وضعیت داده" };

      case "INVALID_AGE":
      case "INCOMPLETE_SOURCES_STAGE":
      case "INVALID_CONVERSATION_PARTICIPANTS":
      case "BAD_REQUEST":
      case "VALIDATION_ERROR":
        return { status: HttpStatus.BAD_REQUEST, title: "داده ورودی نامعتبر" };

      case "FILE_TOO_LARGE":
        return { status: HttpStatus.PAYLOAD_TOO_LARGE, title: "حجم فایل بیش از حد مجاز است" };

      case "FILE_SCANNER_UNAVAILABLE":
        return { status: HttpStatus.SERVICE_UNAVAILABLE, title: "سرویس اسکن فایل در دسترس نیست" };

      default:
        return { status: HttpStatus.BAD_REQUEST, title: "خطای منطقی دامنه" };
    }
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return "UNPROCESSABLE_ENTITY";
      default:
        return "SERVER_ERROR";
    }
  }
}
