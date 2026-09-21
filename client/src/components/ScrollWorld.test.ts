import { describe, expect, it } from "vitest";
import { fieldStages } from "./ScrollWorld";

describe("forecasting field stages", () => {
  it("keeps the visual sequence aligned with the product workflow", () => {
    expect(fieldStages.map(stage => stage.label)).toEqual(["Question", "Variables", "Evidence", "Probability", "Resolution"]);
    expect(fieldStages.every(stage => stage.detail.length > 0)).toBe(true);
  });
});
