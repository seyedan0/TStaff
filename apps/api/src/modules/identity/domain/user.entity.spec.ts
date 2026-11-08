import { describe, expect, it } from "vitest";
import { User } from "./user.entity.js";

describe("User stage roles (FR-003, AT-02)", () => {
  it("creates approved applicants as apprentices and changes the system role on promotion", () => {
    const apprentice = User.create({ id: "user-1", phoneNumber: "09120000000" });
    expect(apprentice.stage).toBe("APPRENTICE");
    expect(apprentice.role).toBe("APPRENTICE");

    const intern = apprentice.promoteToIntern();
    expect(intern.stage).toBe("INTERN");
    expect(intern.role).toBe("INTERN");
    expect(apprentice.stage).toBe("APPRENTICE");
  });
});
