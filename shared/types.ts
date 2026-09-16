export type ForecastLabel = "likely" | "uncertain" | "unlikely";
export type Uncertainty = "low" | "medium" | "high";
export type PredictionStatus = "active" | "resolved" | "expired" | "cancelled";
export type EvidenceStance = "supporting" | "contradicting" | "context";

export type ForecastVersion = {
  id: string;
  prediction_id: string;
  version_number: number;
  probability: number;
  label: ForecastLabel;
  uncertainty: Uncertainty;
  rationale: string;
  baseline: string | null;
  current_signals: string | null;
  catalysts: string | null;
  risks: string | null;
  counterfactual: string | null;
  key_variables: string[];
  generated_by: string;
  change_summary: string | null;
  created_at: string;
};

export type Evidence = {
  id: string;
  prediction_id: string;
  source_url: string;
  source_name: string;
  title: string;
  published_at: string | null;
  excerpt: string;
  stance: EvidenceStance;
  relevance: number;
  source_type: string;
  created_at: string;
};

export type Resolution = {
  id: string;
  prediction_id: string;
  outcome: "yes" | "no" | "ambiguous" | "cancelled";
  resolved_at: string;
  resolution_note: string;
  source_url: string | null;
  brier_score: number | null;
  created_at: string;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type ForecastRecord = {
  id: string;
  owner_id: string;
  question: string;
  normalized_question: string | null;
  category_id: string | null;
  category: Category | null;
  status: PredictionStatus;
  resolution_date: string;
  resolution_criteria: string;
  created_at: string;
  updated_at: string;
  latest: ForecastVersion | null;
  versions: ForecastVersion[];
  evidence: Evidence[];
  resolution: Resolution | null;
};

export type Analytics = {
  resolvedCount: number;
  activeCount: number;
  averageProbability: number | null;
  brierScore: number | null;
  accuracy: number | null;
  calibration: Array<{ bucket: string; forecast: number; observed: number; count: number }>;
  horizonDays: number | null;
};

export type ForecastInput = {
  question: string;
  categorySlug?: string;
};

export type ForecastGeneration = {
  normalizedQuestion: string;
  resolutionDate: string;
  resolutionCriteria: string;
  categorySlug: string;
  probability: number;
  label: ForecastLabel;
  uncertainty: Uncertainty;
  rationale: string;
  baseline: string;
  currentSignals: string;
  catalysts: string;
  risks: string;
  counterfactual: string;
  keyVariables: string[];
};

export type AppUser = {
  id: string;
  openId: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
};

export type * from "../drizzle/schema";
export * from "./_core/errors";
