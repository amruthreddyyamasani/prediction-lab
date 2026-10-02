import { describe, expect, it } from "vitest";
import type { CalibrationPoint } from "@shared/calibration";
import type { Evidence, ForecastRecord, ForecastVersion } from "@shared/types";
import {
  buildCalibrationTerrain,
  buildEvidenceConstellation,
  buildForecastDrift,
  buildProbabilityLandscape,
  buildRelatedQuestionNetwork,
  buildScenarioTree,
} from "./visualizationData";

function version(overrides: Partial<ForecastVersion> & Pick<ForecastVersion, "id" | "version_number" | "probability" | "created_at">): ForecastVersion {
  return {
    prediction_id: "record-1",
    label: "uncertain",
    uncertainty: "medium",
    rationale: "Saved reasoning",
    baseline: null,
    current_signals: null,
    catalysts: null,
    risks: null,
    counterfactual: null,
    key_variables: [],
    generated_by: "test-fixture",
    change_summary: null,
    ...overrides,
  };
}

function record(overrides: Partial<ForecastRecord> = {}): ForecastRecord {
  const versions = overrides.versions ?? [];
  const latest = Object.prototype.hasOwnProperty.call(overrides, "latest") ? overrides.latest! : versions.at(-1) ?? null;
  return {
    id: "record-1",
    owner_id: "owner-1",
    question: "Will the recorded event happen?",
    normalized_question: null,
    category_id: null,
    category: null,
    status: "active",
    resolution_date: "2027-01-01T00:00:00.000Z",
    resolution_criteria: "Recorded criteria",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    evidence: [],
    resolution: null,
    ...overrides,
    latest,
    versions,
  };
}

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "source-1",
    prediction_id: "record-1",
    source_url: "https://example.test/source",
    source_name: "Test source",
    title: "Recorded source",
    published_at: "2026-01-10T00:00:00.000Z",
    excerpt: "Saved source excerpt",
    stance: "supporting",
    relevance: 0.8,
    source_type: "article",
    created_at: "2026-01-11T00:00:00.000Z",
    ...overrides,
  };
}

describe("data-backed 3D visualization builders", () => {
  it("connects evidence and variables only to the forecast, without fabricating source-factor links", () => {
    const savedVersion = version({ id: "v1", version_number: 1, probability: 0.64, created_at: "2026-01-01T00:00:00.000Z", key_variables: ["Policy timing"] });
    const plot = buildEvidenceConstellation(record({ versions: [savedVersion], latest: savedVersion, evidence: [evidence()] }));
    const source = plot.nodes.find(node => node.id === "evidence-source-1");
    const factor = plot.nodes.find(node => node.id === "factor-0");
    expect(source?.detail).toContain("supporting");
    expect(source?.detail).toContain("80%");
    expect(factor?.label).toBe("Policy timing");
    expect(plot.edges).toHaveLength(2);
    expect(plot.edges.every(edge => edge.from === "forecast-root")).toBe(true);
  });

  it("keeps scenario branches qualitative and assigns no branch probabilities", () => {
    const savedVersion = version({ id: "v1", version_number: 1, probability: 0.72, created_at: "2026-01-01T00:00:00.000Z", catalysts: "The recorded catalyst", risks: "The recorded risk", key_variables: ["Demand"] });
    const plot = buildScenarioTree(record({ versions: [savedVersion], latest: savedVersion }));
    expect(plot.notice).toContain("no probabilities");
    expect(plot.nodes.some(node => node.label.startsWith("Recorded forecast · 72%"))).toBe(true);
    expect(plot.nodes.some(node => node.label === "Catalysts" && node.detail === "The recorded catalyst")).toBe(true);
    expect(plot.nodes.some(node => node.label === "Risks" && node.detail === "The recorded risk")).toBe(true);
    expect(plot.nodes.some(node => node.label === "Recorded factor · Demand")).toBe(true);
    expect(plot.nodes.filter(node => node.id.startsWith("branch-")).every(node => !/\d+%/.test(node.label))).toBe(true);
  });

  it("plots only actual saved probabilities and uses a factor as a highlight, not a sensitivity estimate", () => {
    const later = version({ id: "v2", version_number: 2, probability: 0.7, created_at: "2026-03-01T00:00:00.000Z", key_variables: ["Policy timing"] });
    const earlier = version({ id: "v1", version_number: 1, probability: 0.45, created_at: "2026-01-01T00:00:00.000Z", key_variables: ["Demand"] });
    const plot = buildProbabilityLandscape(record({ versions: [later, earlier] }), "Policy timing");
    expect(plot.nodes.map(node => node.label)).toEqual(["v1 · 45%", "v2 · 70%"]);
    expect(plot.nodes.map(node => node.position[1])).toEqual([0.45 * 4.8, 0.7 * 4.8]);
    expect(plot.nodes[0].color).not.toBe(plot.nodes[1].color);
    expect(plot.notice).toContain("no factor-effect score");
    expect(plot.paths[0].points).toEqual(plot.nodes.map(node => node.position));
  });

  it("derives drift arrows and percentage-point changes from consecutive saved versions", () => {
    const first = version({ id: "v1", version_number: 1, probability: 0.4, created_at: "2026-01-01T00:00:00.000Z" });
    const second = version({ id: "v2", version_number: 2, probability: 0.57, created_at: "2026-02-01T00:00:00.000Z", change_summary: "New evidence arrived" });
    const plot = buildForecastDrift(record({ versions: [second, first] }));
    expect(plot.nodes).toHaveLength(2);
    expect(plot.nodes[1].detail).toContain("Up 17 percentage points");
    expect(plot.nodes[1].detail).toContain("New evidence arrived");
    expect(plot.edges).toHaveLength(1);
    expect(plot.edges[0].arrow).toBe(true);
  });

  it("renders only populated calibration bins and preserves their observed counts", () => {
    const points: CalibrationPoint[] = [
      { bucket: "0–38%", lower: 0, upper: 0.375, forecast: 0.25, observed: 0.5, count: 4 },
      { bucket: "38–63%", lower: 0.375, upper: 0.625, forecast: null, observed: null, count: 0 },
    ];
    const plot = buildCalibrationTerrain(points);
    expect(plot.columns).toHaveLength(1);
    expect(plot.columns[0].node.detail).toContain("4 resolved forecasts");
    expect(plot.columns[0].node.position[1]).toBe(0.5 * 4.5);
    expect(plot.nodes).toHaveLength(1);
    expect(plot.notice).toContain("no smooth surface");
  });

  it("creates relationship edges only from recorded categories or multiple exact shared terms", () => {
    const categoryA = { id: "economy", slug: "economy", name: "Economy", description: null, sort_order: 1 };
    const categoryB = { id: "culture", slug: "culture", name: "Culture", description: null, sort_order: 2 };
    const a = record({ id: "a", question: "Will the central bank raise interest rates?", category_id: categoryA.id, category: categoryA });
    const b = record({ id: "b", question: "Will the central bank cut interest rates?", category_id: categoryA.id, category: categoryA });
    const c = record({ id: "c", question: "Will the film festival add a venue?", category_id: categoryB.id, category: categoryB });
    const plot = buildRelatedQuestionNetwork([a, b, c]);
    expect(plot.nodes.some(node => node.id === "question-a")).toBe(true);
    expect(plot.nodes.some(node => node.id === "question-b")).toBe(true);
    expect(plot.nodes.some(node => node.id === "question-c")).toBe(true);
    expect(plot.edges.some(edge => edge.label?.includes("bank, central, interest, rates"))).toBe(true);
    expect(plot.edges.some(edge => edge.from === "category-economy" && edge.to === "question-a")).toBe(true);
    expect(plot.edges.some(edge => edge.from === "question-a" && edge.to === "question-c")).toBe(false);
    expect(plot.notice).toContain("not semantic");
  });
});
