import { describe, it, expect } from "vitest";
import { Resource } from "./resource.entity.js";
import { Interview } from "./interview.entity.js";
import {
  InvalidIntervieweeAgeError,
  InterviewAlreadyExistsForResourceError,
} from "./resource-errors.js";

describe("Resources & Interviews Domain (D-01, D-07, AT-28, AT-30)", () => {
  it("creates a Resource in IDENTIFIED status", () => {
    const resource = Resource.create({
      id: "res-1",
      researchCaseId: "case-1",
      type: "INDIVIDUAL",
      title: "دکتر علوی - متخصص مدیریت دولتی",
      description: "مدیر کل اسبق",
      contactInfo: "09121234567",
    });

    expect(resource.id).toBe("res-1");
    expect(resource.type).toBe("INDIVIDUAL");
    expect(resource.status).toBe("IDENTIFIED");
  });

  it("creates an Interview with positive integer age (D-01 / AT-28)", () => {
    const interview = Interview.create({
      id: "int-1",
      resourceId: "res-1",
      intervieweeName: "دکتر علوی",
      intervieweeAge: 48,
      conductedAt: new Date("2026-05-10T10:00:00.000Z"),
    });

    expect(interview.id).toBe("int-1");
    expect(interview.intervieweeAge).toBe(48);
    expect(interview.status).toBe("SCHEDULED");
  });

  it("rejects invalid or non-integer age in Interview (D-01 / AT-28)", () => {
    expect(() =>
      Interview.create({
        id: "int-1",
        resourceId: "res-1",
        intervieweeName: "دکتر علوی",
        intervieweeAge: 48.5, // float rejected
        conductedAt: new Date(),
      }),
    ).toThrow(InvalidIntervieweeAgeError);

    expect(() =>
      Interview.create({
        id: "int-1",
        resourceId: "res-1",
        intervieweeName: "دکتر علوی",
        intervieweeAge: -5, // negative rejected
        conductedAt: new Date(),
      }),
    ).toThrow(InvalidIntervieweeAgeError);

    expect(() =>
      Interview.create({
        id: "int-1",
        resourceId: "res-1",
        intervieweeName: "دکتر علوی",
        intervieweeAge: 0, // zero rejected
        conductedAt: new Date(),
      }),
    ).toThrow(InvalidIntervieweeAgeError);
  });

  it("strictly enforces unique 1-to-1 interview per resource (D-07, AT-30)", () => {
    const resource = Resource.create({
      id: "res-1",
      researchCaseId: "case-1",
      type: "INDIVIDUAL",
      title: "منبع پژوهشی ۱",
    });

    // Attaching first interview works
    const withInterview = resource.attachInterview("int-1");
    expect(withInterview.interviewId).toBe("int-1");
    expect(withInterview.status).toBe("INTERVIEWED");

    // Attempting to attach second interview fails with domain error
    expect(() => withInterview.attachInterview("int-2")).toThrow(
      InterviewAlreadyExistsForResourceError,
    );
  });
});
