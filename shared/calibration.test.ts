import { describe, expect, it } from "vitest";
import { buildCalibrationPoints } from "./calibration.js";

describe("buildCalibrationPoints", () => {
  it("assigns boundary probabilities to exactly one adjacent range", () => {
    const points = buildCalibrationPoints([
      { probability: 0.374, outcome: "yes" },
      { probability: 0.375, outcome: "no" },
      { probability: 0.625, outcome: "yes" },
      { probability: 0.875, outcome: "no" },
      { probability: 1, outcome: "yes" },
    ]);

    expect(points.map(point => point.count)).toEqual([1, 1, 1, 2]);
    expect(points.map(point => point.bucket)).toEqual(["0–38%", "38–63%", "63–88%", "88–100%"]);
    expect(points.reduce((sum, point) => sum + point.count, 0)).toBe(5);
  });

  it("calculates the mean forecast and observed yes rate from records in a range", () => {
    const [first] = buildCalibrationPoints([
      { probability: 0.2, outcome: "yes" },
      { probability: 0.3, outcome: "no" },
      { probability: 0.8, outcome: "yes" },
    ]);

    expect(first).toMatchObject({ forecast: 0.25, observed: 0.5, count: 2 });
  });

  it("leaves empty ranges without forecast or observed values", () => {
    const points = buildCalibrationPoints([]);
    expect(points.every(point => point.count === 0 && point.forecast === null && point.observed === null)).toBe(true);
  });
});
