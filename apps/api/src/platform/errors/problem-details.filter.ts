import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { randomUUID } from 'node:crypto';
import type { ProblemDetails } from '@tstaff/contracts';

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId = (request.headers['x-trace-id'] as string) || randomUUID();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let title = 'خطای داخلی سرور';
    let detail = 'یک خطای پیش‌بینی‌نشده در سرور رخ داده است.';
    let currentVersion: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        code = (resp['code'] as string) || this.getDefaultCode(status);
        title = (resp['error'] as string) || (resp['title'] as string) || exception.message;
        const rawMessage = resp['message'] ?? resp['detail'] ?? exception.message;
        detail = Array.isArray(rawMessage) ? rawMessage.join('; ') : String(rawMessage);
        if (typeof resp['currentVersion'] === 'number') {
          currentVersion = resp['currentVersion'];
        }
      } else {
        title = exception.message;
        detail = exception.message;
        code = this.getDefaultCode(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception [traceId: ${traceId}]: ${exception.message}`, exception.stack);
      detail =
        process.env.NODE_ENV === 'production'
          ? 'یک خطای پیش‌بینی‌نشده در سرور رخ داده است.'
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

    response.setHeader('Content-Type', 'application/problem+json');
    response.status(status).json(problem);
  }

  private getDefaultCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'SERVER_ERROR';
    }
  }
}
