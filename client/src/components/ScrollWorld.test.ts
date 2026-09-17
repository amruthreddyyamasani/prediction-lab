import { describe, expect, it } from "vitest";
import { satelliteStats } from "./ScrollWorld";

describe("interactive satellite signals", () => {
  it("provides a distinct quick-stat payload for every satellite", () => {
    expect(satelliteStats).toHaveLength(11);
    expect(new Set(satelliteStats.map(signal => signal.label)).size).toBe(11);
    expect(satelliteStats.every(signal => signal.value.length > 0 && signal.detail.length > 0)).toBe(true);
  });
});
