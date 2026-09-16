import { describe, expect, it } from "vitest";
import { labelForProbability, normalizeProbability } from "./forecast";

describe("forecast probability contract", () => {
  it("rounds to meaningful five-point increments and clamps extremes", () => {
    expect(normalizeProbability(0.013)).toBe(0.05);
    expect(normalizeProbability(0.673)).toBe(0.65);
    expect(normalizeProbability(0.998)).toBe(0.95);
  });

  it("keeps the label separate from certainty", () => {
    expect(labelForProbability(0.8)).toBe("likely");
    expect(labelForProbability(0.5)).toBe("uncertain");
    expect(labelForProbability(0.2)).toBe("unlikely");
  });
});
