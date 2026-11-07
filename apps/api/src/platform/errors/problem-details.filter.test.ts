import { describe, it, expect, vi } from "vitest";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ProblemDetailsFilter } from "./problem-details.filter.js";
import type { ArgumentsHost } from "@nestjs/common";

describe("ProblemDetailsFilter (RFC 7807)", () => {
  it("formats HttpException into RFC 7807 Problem Details with custom code and version", () => {
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
        "x-trace-id": "custom-trace-id-xyz",
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
        code: "STALE_REVISION",
        title: "تعارض نسخه داوری",
        message: "نسخه مورد ارزیابی هم‌اکنون تغییر کرده است.",
        currentVersion: 4,
      },
      HttpStatus.CONFLICT,
    );

    filter.catch(exception, mockHost);

    expect(statusCode).toBe(HttpStatus.CONFLICT);
    expect(setHeaderMock).toHaveBeenCalledWith(
      "Content-Type",
      "application/problem+json",
    );
    expect(jsonResponse).toMatchObject({
      type: "https://api.tstaff.ir/problems/stale_revision",
      title: "تعارض نسخه داوری",
      status: 409,
      code: "STALE_REVISION",
      detail: "نسخه مورد ارزیابی هم‌اکنون تغییر کرده است.",
      traceId: "custom-trace-id-xyz",
      currentVersion: 4,
    });
  });

  it("handles standard internal server errors gracefully", () => {
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

    const unexpectedError = new Error(
      "Database connection dropped unexpectedly",
    );

    filter.catch(unexpectedError, mockHost);

    expect(statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonResponse).toMatchObject({
      type: "https://api.tstaff.ir/problems/internal_server_error",
      title: "خطای داخلی سرور",
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      detail: "Database connection dropped unexpectedly",
    });
    expect((jsonResponse as { traceId: string }).traceId).toBeDefined();
  });

  it("joins array validation error messages with semicolons to satisfy RFC 7807 string type", () => {
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
        message: ["سن باید یک عدد صحیح باشد", "نام الزامی است"],
        error: "Bad Request",
        statusCode: 400,
      },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(validationException, mockHost);

    expect(jsonResponse).toMatchObject({
      status: 400,
      code: "BAD_REQUEST",
      detail: "سن باید یک عدد صحیح باشد; نام الزامی است",
    });
  });

  it("handles ZodError and maps to 400 VALIDATION_ERROR with path-prefixed detail", () => {
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

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;

    const zodError = {
      name: "ZodError",
      issues: [
        { path: ["age"], message: "سن باید یک عدد صحیح باشد" },
        { path: ["phoneNumber"], message: "شماره همراه نامعتبر است" },
      ],
    };

    filter.catch(zodError, mockHost);

    expect(statusCode).toBe(400);
    expect(jsonResponse).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      title: "خطای اعتبارسنجی ورودی",
      detail:
        "age: سن باید یک عدد صحیح باشد; phoneNumber: شماره همراه نامعتبر است",
    });
  });

  it("maps DomainError instances to corresponding HTTP status and titles", () => {
    const filter = new ProblemDetailsFilter();

    const createDomainError = (message: string, code: string) => {
      const err = new Error(message);
      err.name = "DomainError";
      return Object.assign(err, { code });
    };

    const testCases = [
      {
        error: createDomainError(
          "متقاضی با شناسه 123 یافت نشد",
          "APPLICANT_NOT_FOUND",
        ),
        expectedStatus: 404,
        expectedCode: "APPLICANT_NOT_FOUND",
      },
      {
        error: createDomainError("رمز عبور نادرست است", "INVALID_CREDENTIALS"),
        expectedStatus: 401,
        expectedCode: "INVALID_CREDENTIALS",
      },
      {
        error: createDomainError("حساب کاربری معلق است", "USER_SUSPENDED"),
        expectedStatus: 403,
        expectedCode: "USER_SUSPENDED",
      },
      {
        error: createDomainError(
          "تغییر وضعیت نامعتبر است",
          "INVALID_APPLICANT_STATUS_TRANSITION",
        ),
        expectedStatus: 409,
        expectedCode: "INVALID_APPLICANT_STATUS_TRANSITION",
      },
      {
        error: createDomainError("سن معتبر نیست", "INVALID_AGE"),
        expectedStatus: 400,
        expectedCode: "INVALID_AGE",
      },
      {
        error: createDomainError(
          "متقاضی دیگری با این مشخصات وجود دارد",
          "APPLICANT_ALREADY_EXISTS",
        ),
        expectedStatus: 409,
        expectedCode: "APPLICANT_ALREADY_EXISTS",
      },
    ];

    for (const { error, expectedStatus, expectedCode } of testCases) {
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

      const mockHost = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ headers: {} }),
        }),
      } as unknown as ArgumentsHost;

      filter.catch(error, mockHost);

      expect(statusCode).toBe(expectedStatus);
      expect(jsonResponse).toMatchObject({
        status: expectedStatus,
        code: expectedCode,
        detail: error.message,
      });
    }
  });

  it("treats unknown/third-party errors with code (e.g. Prisma P2002) as 500 without leaking details", () => {
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

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ headers: {} }),
      }),
    } as unknown as ArgumentsHost;

    const prismaError = Object.assign(
      new Error("Unique constraint failed on the fields: (`phone_number`)"),
      {
        code: "P2002",
        clientVersion: "5.x",
      },
    );

    filter.catch(prismaError, mockHost);

    expect(statusCode).toBe(500);
    expect(jsonResponse).toMatchObject({
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      title: "خطای داخلی سرور",
    });
  });
});
