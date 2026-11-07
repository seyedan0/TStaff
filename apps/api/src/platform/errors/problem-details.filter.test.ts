import { describe, it, expect, vi } from 'vitest';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter.js';
import type { ArgumentsHost } from '@nestjs/common';

describe('ProblemDetailsFilter (RFC 7807)', () => {
  it('formats HttpException into RFC 7807 Problem Details with custom code and version', () => {
    const filter = new ProblemDetailsFilter();

    let jsonResponse: unknown;
    let statusCode: number | undefined;
    const setHeaderMock = vi.fn();

    const mockResponse = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockResponse;
      }),
      json: vi.fn((body: unknown) => {
        jsonResponse = body;
        return mockResponse;
      }),
      setHeader: setHeaderMock,
    };

    const mockRequest = {
      headers: {
        'x-trace-id': 'custom-trace-id-xyz',
      },
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException(
      {
        code: 'STALE_REVISION',
        title: 'تعارض نسخه داوری',
        message: 'نسخه مورد ارزیابی هم‌اکنون تغییر کرده است.',
        currentVersion: 4,
      },
      HttpStatus.CONFLICT,
    );

    filter.catch(exception, mockHost);

    expect(statusCode).toBe(HttpStatus.CONFLICT);
    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/problem+json');
    expect(jsonResponse).toMatchObject({
      type: 'https://api.tstaff.ir/problems/stale_revision',
      title: 'تعارض نسخه داوری',
      status: 409,
      code: 'STALE_REVISION',
      detail: 'نسخه مورد ارزیابی هم‌اکنون تغییر کرده است.',
      traceId: 'custom-trace-id-xyz',
      currentVersion: 4,
    });
  });

  it('handles standard internal server errors gracefully', () => {
    const filter = new ProblemDetailsFilter();

    let jsonResponse: unknown;
    let statusCode: number | undefined;

    const mockResponse = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return mockResponse;
      }),
      json: vi.fn((body: unknown) => {
        jsonResponse = body;
        return mockResponse;
      }),
      setHeader: vi.fn(),
    };

    const mockRequest = {
      headers: {},
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;

    const unexpectedError = new Error('Database connection dropped unexpectedly');

    filter.catch(unexpectedError, mockHost);

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonResponse).toMatchObject({
      type: 'https://api.tstaff.ir/problems/internal_server_error',
      title: 'خطای داخلی سرور',
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      detail: 'Database connection dropped unexpectedly',
    });
    expect((jsonResponse as { traceId: string }).traceId).toBeDefined();
  });

  it('joins array validation error messages with semicolons to satisfy RFC 7807 string type', () => {
    const filter = new ProblemDetailsFilter();

    let jsonResponse: unknown;

    const mockResponse = {
      status: vi.fn(() => mockResponse),
      json: vi.fn((body: unknown) => {
        jsonResponse = body;
        return mockResponse;
      }),
      setHeader: vi.fn(),
    };

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;

    const validationException = new HttpException(
      {
        message: ['سن باید یک عدد صحیح باشد', 'نام الزامی است'],
        error: 'Bad Request',
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(validationException, mockHost);

    expect(jsonResponse).toMatchObject({
      status: 400,
      code: 'BAD_REQUEST',
      detail: 'سن باید یک عدد صحیح باشد; نام الزامی است',
    });
  });
});
