import type { SupabaseClient } from "@supabase/supabase-js";
import type { Analytics, AppUser, ForecastGeneration, ForecastRecord } from "../shared/types.js";
import type { InsertUser, User } from "../drizzle/schema.js";

/** Legacy Manus auth helpers are intentionally unused; Supabase Auth is the source of truth. */
export async function getUserByOpenId(_openId: string): Promise<User | undefined> {
  return undefined;
}

export async function upsertUser(_user: InsertUser): Promise<void> {
  return;
}

const predictionSelect = `*, category:categories(id,slug,name,description,sort_order), versions:forecast_versions(*), evidence:evidence(*), resolution:resolutions(*)`;

function normalizePrediction(row: any): ForecastRecord {
  const versions = [...(row.versions ?? [])].sort((a, b) => a.version_number - b.version_number);
  return {
    ...row,
    category: Array.isArray(row.category) ? row.category[0] ?? null : row.category ?? null,
    versions,
    latest: versions.at(-1) ?? null,
    evidence: row.evidence ?? [],
    resolution: Array.isArray(row.resolution) ? row.resolution[0] ?? null : row.resolution ?? null,
  };
}

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export async function getCategories(client: SupabaseClient) {
  const { data, error } = await client.from("categories").select("id,slug,name,description,sort_order").order("sort_order");
  if (error) fail(error, "Categories could not be loaded.");
  return data ?? [];
}

export async function listPredictions(client: SupabaseClient, userId: string, status?: string) {
  let query = client.from("predictions").select(predictionSelect).eq("owner_id", userId).order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) fail(error, "Prediction history could not be loaded.");
  return (data ?? []).map(normalizePrediction);
}

export async function getPrediction(client: SupabaseClient, userId: string, id: string) {
  const { data, error } = await client.from("predictions").select(predictionSelect).eq("owner_id", userId).eq("id", id).single();
  if (error) fail(error, "Prediction could not be found.");
  return normalizePrediction(data);
}

export async function createPrediction(client: SupabaseClient, user: AppUser, generation: ForecastGeneration) {
  const categories = await getCategories(client);
  const category = categories.find(item => item.slug === generation.categorySlug) ?? null;
  const { data: prediction, error: predictionError } = await client.from("predictions").insert({
    owner_id: user.id,
    question: generation.normalizedQuestion,
    normalized_question: generation.normalizedQuestion,
    category_id: category?.id ?? null,
    resolution_date: generation.resolutionDate,
    resolution_criteria: generation.resolutionCriteria,
  }).select("id").single();
  if (predictionError || !prediction) fail(predictionError, "Prediction could not be saved.");

  const { error: versionError } = await client.from("forecast_versions").insert({
    prediction_id: prediction.id,
    version_number: 1,
    probability: generation.probability,
    label: generation.label,
    uncertainty: generation.uncertainty,
    rationale: generation.rationale,
    baseline: generation.baseline,
    current_signals: generation.currentSignals,
    catalysts: generation.catalysts,
    risks: generation.risks,
    counterfactual: generation.counterfactual,
    key_variables: generation.keyVariables,
  });
  if (versionError) fail(versionError, "Forecast was generated but could not be saved.");
  return getPrediction(client, user.id, prediction.id);
}

export async function updateForecast(client: SupabaseClient, userId: string, predictionId: string, generation: ForecastGeneration, changeSummary: string) {
  const current = await getPrediction(client, userId, predictionId);
  const nextVersion = (current.versions.at(-1)?.version_number ?? 0) + 1;
  const { error } = await client.from("forecast_versions").insert({
    prediction_id: predictionId,
    version_number: nextVersion,
    probability: generation.probability,
    label: generation.label,
    uncertainty: generation.uncertainty,
    rationale: generation.rationale,
    baseline: generation.baseline,
    current_signals: generation.currentSignals,
    catalysts: generation.catalysts,
    risks: generation.risks,
    counterfactual: generation.counterfactual,
    key_variables: generation.keyVariables,
    change_summary: changeSummary,
  });
  if (error) fail(error, "Forecast update could not be saved.");
  return getPrediction(client, userId, predictionId);
}

export async function resolvePrediction(client: SupabaseClient, userId: string, predictionId: string, outcome: "yes" | "no" | "ambiguous" | "cancelled", resolutionNote: string, sourceUrl?: string) {
  const current = await getPrediction(client, userId, predictionId);
  const actual = outcome === "yes" ? 1 : outcome === "no" ? 0 : null;
  const brierScore = actual === null || !current.latest ? null : Math.pow(current.latest.probability - actual, 2);
  const { error: resolutionError } = await client.from("resolutions").upsert({
    prediction_id: predictionId,
    outcome,
    resolution_note: resolutionNote,
    source_url: sourceUrl || null,
    brier_score: brierScore,
  }, { onConflict: "prediction_id" });
  if (resolutionError) fail(resolutionError, "Resolution could not be saved.");
  const { error: predictionError } = await client.from("predictions").update({ status: outcome === "cancelled" ? "cancelled" : "resolved" }).eq("id", predictionId).eq("owner_id", userId);
  if (predictionError) fail(predictionError, "Prediction status could not be updated.");
  return getPrediction(client, userId, predictionId);
}

export async function getAnalytics(client: SupabaseClient, userId: string): Promise<Analytics> {
  const predictions = await listPredictions(client, userId, "all");
  const resolved = predictions.filter(item => item.resolution?.outcome === "yes" || item.resolution?.outcome === "no");
  const active = predictions.filter(item => item.status === "active");
  const scores = resolved.map(item => item.resolution?.brier_score).filter((value): value is number => typeof value === "number");
  const averageProbability = resolved.length ? resolved.reduce((sum, item) => sum + (item.latest?.probability ?? 0), 0) / resolved.length : null;
  const accuracy = resolved.length ? resolved.filter(item => (item.resolution?.outcome === "yes") === ((item.latest?.probability ?? 0.5) >= 0.5)).length / resolved.length : null;
  const calibration = [0.25, 0.5, 0.75, 0.9].map(center => {
    const lower = center === 0.25 ? 0 : center - 0.125;
    const upper = center === 0.9 ? 1.001 : center + 0.125;
    const bucket = resolved.filter(item => (item.latest?.probability ?? 0) >= lower && (item.latest?.probability ?? 0) < upper);
    return {
      bucket: `${Math.round(lower * 100)}–${Math.round(Math.min(upper, 1) * 100)}%`,
      forecast: bucket.length ? bucket.reduce((sum, item) => sum + (item.latest?.probability ?? 0), 0) / bucket.length : center,
      observed: bucket.length ? bucket.filter(item => item.resolution?.outcome === "yes").length / bucket.length : 0,
      count: bucket.length,
    };
  });
  const horizonDays = predictions.length ? Math.round(predictions.reduce((sum, item) => sum + Math.max(0, (new Date(item.resolution_date).getTime() - new Date(item.created_at).getTime()) / 86400000), 0) / predictions.length) : null;
  return {
    resolvedCount: resolved.length,
    activeCount: active.length,
    averageProbability,
    brierScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    accuracy,
    calibration,
    horizonDays,
  };
}
