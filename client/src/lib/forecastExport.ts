import type { ForecastRecord } from "@shared/types";

export type ForecastExportPreview = {
  title: string;
  included: string[];
  text: string;
};

export function buildForecastExportPreview(record: ForecastRecord): ForecastExportPreview {
  const current = record.latest;
  const probability = current ? `${Math.round(current.probability * 100)}%` : "No saved probability";
  const uncertainty = current?.uncertainty ?? "Not recorded";
  const text = [
    record.question,
    `Status: ${record.status}`,
    `Resolution date: ${record.resolution_date}`,
    `Resolution criteria: ${record.resolution_criteria}`,
    `Latest probability: ${probability}`,
    `Uncertainty: ${uncertainty}`,
    `Forecast updated: ${current?.created_at ?? "Not recorded"}`,
  ].join("\n");
  return {
    title: "Private text export preview",
    included: ["Forecast question", "Current status", "Resolution date and criteria", "Latest saved probability", "Uncertainty label", "Latest forecast timestamp"],
    text,
  };
}
