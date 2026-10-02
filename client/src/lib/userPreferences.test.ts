import { describe, expect, it } from "vitest";
import { daysUntil, localDateString, uniqueEvidenceHosts } from "./userPreferences";

describe("local product preferences helpers", () => {
  it("calculates days to and since a resolution date using the local calendar day", () => {
    const today = new Date(2026, 9, 2, 12);
    expect(daysUntil("2026-10-09", today)).toBe(7);
    expect(daysUntil("2026-10-01", today)).toBe(-1);
  });

  it("rejects malformed or impossible calendar dates", () => {
    expect(daysUntil("2026-02-30", new Date("2026-02-01T12:00:00Z"))).toBeNull();
    expect(daysUntil("not-a-date", new Date("2026-02-01T12:00:00Z"))).toBeNull();
  });

  it("counts distinct source domains without treating path variants as new sources", () => {
    expect(uniqueEvidenceHosts([
      { source_url: "https://www.example.com/a" },
      { source_url: "https://example.com/b" },
      { source_url: "https://news.example.org/story" },
      { source_url: "not a url" },
    ])).toEqual(["example.com", "news.example.org"]);
  });

  it("formats dates using local calendar fields", () => {
    expect(localDateString(new Date(2026, 9, 2, 12))).toBe("2026-10-02");
  });
});
