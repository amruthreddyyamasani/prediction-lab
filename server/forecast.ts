import { invokeLLM } from "./_core/llm";
import type { ForecastGeneration, ForecastLabel } from "@shared/types";

const forecastSchema = {
  type: "object",
  properties: {
    normalizedQuestion: { type: "string" }, resolutionDate: { type: "string", description: "ISO date YYYY-MM-DD" }, resolutionCriteria: { type: "string" }, categorySlug: { type: "string" }, probability: { type: "number", description: "A calibrated probability between 0.05 and 0.95, rounded to two decimals" }, label: { type: "string", enum: ["likely", "uncertain", "unlikely"] }, uncertainty: { type: "string", enum: ["low", "medium", "high"] }, rationale: { type: "string" }, baseline: { type: "string" }, currentSignals: { type: "string" }, catalysts: { type: "string" }, risks: { type: "string" }, counterfactual: { type: "string" }, keyVariables: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
  },
  required: ["normalizedQuestion", "resolutionDate", "resolutionCriteria", "categorySlug", "probability", "label", "uncertainty", "rationale", "baseline", "currentSignals", "catalysts", "risks", "counterfactual", "keyVariables"],
  additionalProperties: false,
} as const;

export function normalizeProbability(value: number) {
  return Math.max(0.05, Math.min(0.95, Math.round(value * 20) / 20));
}

export function labelForProbability(value: number): ForecastLabel {
  if (value >= 0.65) return "likely";
  if (value <= 0.35) return "unlikely";
  return "uncertain";
}

export function parseForecastContent(content: string): ForecastGeneration {
  const normalized = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  const candidate = start >= 0 && end > start ? normalized.slice(start, end + 1) : normalized;
  try {
    return JSON.parse(candidate) as ForecastGeneration;
  } catch {
    throw new Error("Forecast service returned an invalid structured response. Check the Vercel LLM environment variables and deployment logs.");
  }
}

export async function generateForecast(question: string, categorySlug?: string): Promise<ForecastGeneration> {
  const today = new Date().toISOString().slice(0, 10);
  const response = await invokeLLM({
    messages: [
      { role: "system", content: `You are the forecasting analyst inside Prediction Lab. Produce a disciplined probabilistic forecast, not a confident answer. Today is ${today}. Do not invent sources, citations, or evidence. This request is the structured assessment stage; the product will display that external research is pending unless a source is actually available. Make the outcome testable: define a specific date and a yes/no resolution condition. Use probability in increments of 0.05 where possible, never use false precision, and label uncertainty separately from probability. Choose one of these category slugs: ai-technology, science, business, economy, geopolitics, climate, health, space, society. If the question is vague, normalize it into a measurable version while preserving intent.` },
      { role: "user", content: `Forecast this question: ${question}${categorySlug ? `\nPreferred category: ${categorySlug}` : ""}` },
    ],
    response_format: { type: "json_schema", json_schema: { name: "prediction_lab_forecast", strict: true, schema: forecastSchema } },
    reasoning: { effort: "low" },
  });
  const content = response.choices?.[0]?.message?.content;
  const textContent = typeof content === "string" ? content : Array.isArray(content) ? content.filter(part => part.type === "text").map(part => part.text).join("\n") : "";
  if (!textContent) throw new Error("The forecasting model returned no structured result.");
  const parsed = parseForecastContent(textContent);
  const probability = normalizeProbability(parsed.probability);
  return { ...parsed, probability, label: labelForProbability(probability) };
}
