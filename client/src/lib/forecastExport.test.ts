import { describe, expect, it } from "vitest";
import type { ForecastRecord } from "@shared/types";
import { buildForecastExportPreview } from "./forecastExport";

const forecast = {
  id: "1", owner_id: "user-1", question: "Will the project launch?", normalized_question: null,
  category_id: null, category: null, status: "active", resolution_date: "2027-01-01",
  resolution_criteria: "A public release is available.", created_at: "2026-01-01", updated_at: "2026-02-01",
  latest: { id: "v1", prediction_id: "1", version_number: 1, probability: 0.63, label: "uncertain", uncertainty: "medium", rationale: "A moderate assessment.", baseline: null, current_signals: null, catalysts: null, risks: null, counterfactual: null, key_variables: [], generated_by: "test", change_summary: null, created_at: "2026-02-01" },
  versions: [], evidence: [{ id: "e1", prediction_id: "1", source_url: "https://private.example", source_name: "Private source", title: "Private evidence", published_at: null, excerpt: "Should not be copied.", stance: "supporting", relevance: 0.5, source_type: "external", created_at: "2026-01-01" }], resolution: null,
} as ForecastRecord;

describe("privacy-aware export preview", () => {
  it("lists exactly the included forecast fields and excludes owner, evidence, and private reasoning", () => {
    const preview = buildForecastExportPreview(forecast);
    expect(preview.included).toContain("Resolution date and criteria");
    expect(preview.text).toContain("Latest probability: 63%");
    expect(preview.text).not.toContain("user-1");
    expect(preview.text).not.toContain("Private evidence");
    expect(preview.text).not.toContain("moderate assessment");
  });
});
