import type { CalibrationPoint } from "@shared/calibration";
import type { ForecastRecord, ForecastVersion } from "@shared/types";

export type Vec3 = [number, number, number];

export type PlotNode = {
  id: string;
  label: string;
  detail: string;
  position: Vec3;
  color: string;
  radius?: number;
  shape?: "sphere" | "box";
};

export type PlotEdge = {
  id: string;
  from: string;
  to: string;
  color: string;
  opacity?: number;
  arrow?: boolean;
  label?: string;
};

export type PlotPath = {
  id: string;
  points: Vec3[];
  color: string;
  opacity?: number;
  dashed?: boolean;
  label?: string;
};

export type PlotColumn = {
  node: PlotNode;
  base: Vec3;
  height: number;
  width: number;
  depth: number;
};

export type PlotSpec = {
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
  zLabel: string;
  nodes: PlotNode[];
  edges: PlotEdge[];
  paths: PlotPath[];
  columns: PlotColumn[];
  emptyMessage: string;
  notice?: string;
};

const COLORS = {
  orange: "#D2743F",
  orangeLight: "#E4A06F",
  gold: "#B28A4C",
  green: "#4C8A69",
  red: "#B85B50",
  blue: "#5E8199",
  muted: "#8B8175",
};

const DAY_MS = 86_400_000;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const pct = (value: number) => `${Math.round(value * 100)}%`;
const dateLabel = (value: string) => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : "date unavailable";
};
const validProbability = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;

function orderedVersions(record: ForecastRecord): ForecastVersion[] {
  return (record.versions ?? [])
    .filter(version => Number.isFinite(Date.parse(version.created_at)) && validProbability(version.probability))
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.version_number - b.version_number);
}

function latestVersion(record: ForecastRecord, versions = orderedVersions(record)) {
  return versions.at(-1) ?? record.latest;
}

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function buildEvidenceConstellation(record: ForecastRecord): PlotSpec {
  const latest = latestVersion(record);
  const root: PlotNode = {
    id: "forecast-root",
    label: "Current forecast",
    detail: latest && validProbability(latest.probability)
      ? `Recorded probability: ${pct(latest.probability)}. ${record.question}`
      : record.question,
    position: [0, 3.8, 0],
    color: COLORS.orange,
    radius: 0.28,
  };
  const nodes: PlotNode[] = [root];
  const edges: PlotEdge[] = [];
  const factors = Array.from(new Set((latest?.key_variables ?? []).map(value => value.trim()).filter(Boolean))).slice(0, 16);

  factors.forEach((factor, index) => {
    const angle = (index / Math.max(factors.length, 1)) * Math.PI * 2;
    const id = `factor-${index}`;
    nodes.push({
      id,
      label: factor,
      detail: "Recorded key variable. No separate effect size or causal link is stored.",
      position: [Math.cos(angle) * 1.65, 1.55, Math.sin(angle) * 1.35],
      color: COLORS.gold,
      radius: 0.13,
    });
    edges.push({ id: `root-${id}`, from: root.id, to: id, color: COLORS.gold, opacity: 0.55 });
  });

  const evidence = [...(record.evidence ?? [])]
    .sort((a, b) => a.stance.localeCompare(b.stance) || b.relevance - a.relevance)
    .slice(0, 32);
  evidence.forEach((item, index) => {
    const angle = (index / Math.max(evidence.length, 1)) * Math.PI * 2;
    const relevance = clamp01(Number.isFinite(item.relevance) ? item.relevance : 0);
    const id = `evidence-${item.id}`;
    const color = item.stance === "supporting" ? COLORS.green : item.stance === "contradicting" ? COLORS.red : COLORS.blue;
    nodes.push({
      id,
      label: item.title || item.source_name,
      detail: `${item.source_name} · ${item.stance} · recorded relevance ${pct(relevance)}${item.published_at ? ` · published ${dateLabel(item.published_at)}` : ""}`,
      position: [Math.cos(angle) * 3.45, 0.9 + relevance * 3.1, Math.sin(angle) * 2.55],
      color,
      radius: 0.11 + relevance * 0.1,
    });
    edges.push({ id: `root-${id}`, from: root.id, to: id, color, opacity: 0.62 });
  });

  return {
    title: "Evidence constellation",
    description: "Recorded sources are grouped by stance; recorded key variables are separate. Links attach each record to the forecast and do not imply source-to-factor causation.",
    xLabel: "Source constellation",
    yLabel: "Recorded relevance",
    zLabel: "Evidence stance",
    nodes,
    edges,
    paths: [],
    columns: [],
    emptyMessage: "No evidence or key variables are recorded for this forecast yet.",
    notice: evidence.length < (record.evidence?.length ?? 0) ? `Showing ${evidence.length} of ${record.evidence.length} attached sources.` : undefined,
  };
}

export function buildScenarioTree(record: ForecastRecord): PlotSpec {
  const latest = latestVersion(record);
  const root: PlotNode = {
    id: "scenario-question",
    label: "Forecast question",
    detail: record.question,
    position: [0, 4.25, 0],
    color: COLORS.orange,
    radius: 0.26,
  };
  const current: PlotNode | null = latest && validProbability(latest.probability) ? {
    id: "scenario-current",
    label: `Recorded forecast · ${pct(latest.probability)}`,
    detail: `This is the saved current estimate, not a probability assigned to any hypothetical branch. Updated ${dateLabel(latest.created_at)}.`,
    position: [0, 0.45, 0],
    color: COLORS.orangeLight,
    radius: 0.22,
  } : null;
  const branches = [
    { label: "Baseline", detail: latest?.baseline },
    { label: "Current signals", detail: latest?.current_signals },
    { label: "Catalysts", detail: latest?.catalysts },
    { label: "Risks", detail: latest?.risks },
    { label: "Counterfactual", detail: latest?.counterfactual },
  ].filter(item => item.detail?.trim());
  const variables = Array.from(new Set((latest?.key_variables ?? []).map(value => value.trim()).filter(Boolean)))
    .slice(0, 12)
    .map(label => ({ label: `Recorded factor · ${label}`, detail: "Listed as a key variable in the saved forecast; no conditional outcome is recorded." }));
  const inputs = [...branches, ...variables];
  const nodes = [root, ...(current ? [current] : [])];
  const edges: PlotEdge[] = [];
  if (current) edges.push({ id: "question-current", from: root.id, to: current.id, color: COLORS.orange, opacity: 0.72 });

  inputs.forEach((item, index) => {
    const count = Math.max(inputs.length, 1);
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    const id = `branch-${index}`;
    nodes.push({
      id,
      label: item.label,
      detail: item.detail ?? "No recorded description.",
      position: [Math.cos(angle) * 3.15, 2.45, Math.sin(angle) * 2.35],
      color: item.label.startsWith("Risks") ? COLORS.red : item.label.startsWith("Catalysts") ? COLORS.green : COLORS.gold,
      radius: 0.15,
    });
    edges.push({ id: `question-${id}`, from: root.id, to: id, color: nodes.at(-1)!.color, opacity: 0.55 });
  });

  return {
    title: "Scenario branching tree",
    description: "Branches surface the saved baseline, signals, catalysts, risks, counterfactual, and key variables. Branches are qualitative because conditional scenario probabilities are not stored.",
    xLabel: "Recorded reasoning",
    yLabel: "Branch level",
    zLabel: "Recorded factors",
    nodes,
    edges,
    paths: [],
    columns: [],
    emptyMessage: "No scenario inputs are recorded yet. Add a forecast update with reasoning to populate this view.",
    notice: "Qualitative only · no probabilities are invented for hypothetical branches.",
  };
}

export function buildProbabilityLandscape(record: ForecastRecord, selectedFactor = ""): PlotSpec {
  const versions = orderedVersions(record);
  const times = versions.map(version => Date.parse(version.created_at));
  const firstTime = times[0] ?? 0;
  const lastTime = times.at(-1) ?? firstTime;
  const duration = lastTime - firstTime;
  const resolutionTime = Date.parse(record.resolution_date);
  const remainingDays = versions.map(version => Number.isFinite(resolutionTime)
    ? Math.max(0, (resolutionTime - Date.parse(version.created_at)) / DAY_MS)
    : 0);
  const maxRemaining = Math.max(0, ...remainingDays);
  const factorKey = normalizedKey(selectedFactor);
  const nodes = versions.map((version, index): PlotNode => {
    const x = duration > 0 ? -4 + ((times[index] - firstTime) / duration) * 8 : versions.length > 1 ? -3.5 + (index / (versions.length - 1)) * 7 : 0;
    const z = maxRemaining > 0 ? -2.8 + (remainingDays[index] / maxRemaining) * 5.6 : 0;
    const mentionsFactor = !factorKey || version.key_variables.some(value => normalizedKey(value) === factorKey);
    const variables = version.key_variables.length ? ` Recorded variables: ${version.key_variables.join(", ")}.` : " No key variables recorded on this version.";
    return {
      id: `landscape-${version.id}`,
      label: `v${version.version_number} · ${pct(version.probability)}`,
      detail: `Saved ${dateLabel(version.created_at)} · ${Number.isFinite(resolutionTime) ? `${Math.round(remainingDays[index])} days to resolution` : "resolution horizon unavailable"}.${variables}`,
      position: [x, version.probability * 4.8, z],
      color: mentionsFactor ? COLORS.orange : COLORS.muted,
      radius: mentionsFactor ? 0.16 : 0.12,
    };
  });
  const pathPoints = nodes.map(node => node.position);

  return {
    title: "Probability landscape",
    description: "Plots recorded version probabilities against their update time and actual remaining resolution horizon. A factor filter highlights versions that recorded the factor; it does not estimate causal sensitivity.",
    xLabel: "Recorded update time",
    yLabel: "Saved probability",
    zLabel: "Days to resolution",
    nodes,
    edges: [],
    paths: pathPoints.length > 1 ? [{ id: "saved-trajectory", points: pathPoints, color: COLORS.orange, opacity: 0.72, label: "Recorded forecast trajectory" }] : [],
    columns: [],
    emptyMessage: "No dated saved forecast versions are available to plot.",
    notice: factorKey ? `Highlighting versions that recorded “${selectedFactor}”. Position values remain the saved probabilities; no factor-effect score is stored.` : "Only saved probabilities are plotted. The connecting line joins recorded updates; it is not an estimate between them.",
  };
}

export function buildForecastDrift(record: ForecastRecord): PlotSpec {
  const versions = orderedVersions(record);
  const times = versions.map(version => Date.parse(version.created_at));
  const firstTime = times[0] ?? 0;
  const lastTime = times.at(-1) ?? firstTime;
  const duration = lastTime - firstTime;
  const nodes = versions.map((version, index): PlotNode => {
    const previous = versions[index - 1];
    const delta = previous ? version.probability - previous.probability : null;
    const x = duration > 0 ? -4 + ((times[index] - firstTime) / duration) * 8 : versions.length > 1 ? -3.5 + (index / (versions.length - 1)) * 7 : 0;
    const deltaLabel = delta === null ? "Initial saved estimate; no previous version to compare." : `${delta >= 0 ? "Up" : "Down"} ${Math.round(Math.abs(delta) * 100)} percentage points from v${previous.version_number}.`;
    const reason = version.change_summary?.trim() ? ` Recorded change summary: ${version.change_summary.trim()}` : "";
    return {
      id: `drift-${version.id}`,
      label: `v${version.version_number} · ${pct(version.probability)}`,
      detail: `${dateLabel(version.created_at)} · ${deltaLabel}${reason}`,
      position: [x, version.probability * 4.8, delta === null ? 0 : Math.max(-3, Math.min(3, delta * 5))],
      color: delta === null ? COLORS.gold : delta > 0 ? COLORS.green : delta < 0 ? COLORS.red : COLORS.muted,
      radius: 0.17,
    };
  });
  const edges = nodes.slice(1).map((node, index): PlotEdge => ({
    id: `drift-edge-${index}`,
    from: nodes[index].id,
    to: node.id,
    color: node.color,
    opacity: 0.82,
    arrow: true,
    label: node.detail,
  }));

  return {
    title: "Forecast-drift vectors",
    description: "Each arrow joins two consecutive saved versions. Vertical position is the recorded probability; depth encodes the actual change from the prior version.",
    xLabel: "Recorded update time",
    yLabel: "Saved probability",
    zLabel: "Change vs prior version",
    nodes,
    edges,
    paths: [],
    columns: [],
    emptyMessage: "A drift vector appears after a forecast has at least two dated saved versions.",
    notice: "Arrows reflect saved version-to-version changes, not modelled future movement.",
  };
}

function calibrationColor(error: number) {
  if (error <= 0.1) return COLORS.green;
  if (error <= 0.25) return COLORS.gold;
  return COLORS.red;
}

export function buildCalibrationTerrain(points: CalibrationPoint[]): PlotSpec {
  const populated = points.filter(point => point.count > 0 && point.forecast !== null && point.observed !== null);
  const nodes: PlotNode[] = [];
  const edges: PlotEdge[] = [];
  const columns: PlotColumn[] = [];

  populated.forEach((point, index) => {
    const forecast = clamp01(point.forecast!);
    const observed = clamp01(point.observed!);
    const z = ((point.lower + point.upper) / 2 - 0.5) * 6;
    const x = forecast * 8 - 4;
    const error = Math.abs(forecast - observed);
    const color = calibrationColor(error);
    const observedNode: PlotNode = {
      id: `observed-${index}`,
      label: `${point.bucket} · observed ${pct(observed)}`,
      detail: `Observed yes rate ${pct(observed)} from ${point.count} resolved forecasts. Average forecast in this band: ${pct(forecast)}; calibration gap: ${Math.round((observed - forecast) * 100)} percentage points.`,
      position: [x, observed * 4.5, z],
      color,
      radius: 0.14 + Math.min(0.12, Math.sqrt(point.count) * 0.025),
    };
    const forecastNode: PlotNode = {
      id: `forecast-${index}`,
      label: `${point.bucket} · forecast ${pct(forecast)}`,
      detail: `Average saved probability for ${point.count} resolved forecasts in this band. This is the comparison target, not the observed outcome rate.`,
      position: [x, forecast * 4.5, z],
      color: COLORS.blue,
      radius: 0.12,
    };
    nodes.push(forecastNode);
    edges.push({ id: `calibration-gap-${index}`, from: forecastNode.id, to: observedNode.id, color, opacity: 0.72 });
    columns.push({ node: observedNode, base: [x, 0, z], height: observed * 4.5, width: 0.42, depth: 0.55 });
  });

  return {
    title: "Calibration terrain",
    description: "A discrete column per populated probability band: height is the observed yes rate, the comparison marker is the average saved forecast, and size indicates sample count.",
    xLabel: "Average saved probability",
    yLabel: "Observed yes rate",
    zLabel: "Probability band",
    nodes,
    edges,
    paths: [],
    columns,
    emptyMessage: "No populated yes/no calibration bands yet. Empty bins are intentionally omitted.",
    notice: "Discrete observed bins only · no smooth surface is inferred across empty bands.",
  };
}

const STOP_WORDS = new Set([
  "about", "after", "against", "among", "and", "are", "before", "between", "could", "does", "from", "have", "into", "more", "most", "other", "over", "that", "their", "there", "these", "this", "those", "through", "under", "when", "where", "which", "will", "with", "would", "your", "what", "than", "then", "they", "them", "some", "such", "were", "been", "being", "does", "done", "also", "less", "much", "many", "make", "made", "only", "very", "just", "does", "from", "while", "into", "upon", "before", "after", "until", "more", "most", "will", "into", "for", "the", "who", "how", "can", "not", "any", "all", "out", "our", "its", "was", "has", "had", "but", "you", "she", "him", "his", "her", "they", "use", "via", "per", "new", "old", "get", "got", "why", "yes", "no",
]);

function terms(question: string) {
  return new Set(question
    .toLocaleLowerCase()
    .normalize("NFKC")
    .split(/[\s.,!?;:'"“”‘’()\[\]{}<>\/\\–—-]+/g)
    .filter(token => token.length >= 4 && !STOP_WORDS.has(token)));
}

export function buildRelatedQuestionNetwork(records: ForecastRecord[], maxNodes = 40): PlotSpec {
  const selected = records.slice(0, maxNodes);
  const nodes: PlotNode[] = [];
  const edges: PlotEdge[] = [];
  const categoryGroups = new Map<string, { label: string; records: ForecastRecord[] }>();
  selected.forEach(record => {
    const categoryId = record.category_id ?? record.category?.id ?? null;
    const categoryLabel = record.category?.name ?? "Uncategorized";
    if (!categoryId) return;
    const group = categoryGroups.get(categoryId) ?? { label: categoryLabel, records: [] };
    group.records.push(record);
    categoryGroups.set(categoryId, group);
  });
  const orderedGroups = Array.from(categoryGroups.entries()).sort((a, b) => a[1].label.localeCompare(b[1].label));
  const sectorByCategory = new Map(orderedGroups.map(([id], index) => [id, (index / Math.max(orderedGroups.length, 1)) * Math.PI * 2]));
  const nodeByRecord = new Map<string, PlotNode>();

  selected.forEach((record, index) => {
    const categoryId = record.category_id ?? record.category?.id ?? null;
    const categoryGroup = categoryId ? categoryGroups.get(categoryId) : null;
    const groupRecords = categoryGroup?.records ?? [record];
    const groupIndex = groupRecords.findIndex(item => item.id === record.id);
    const baseAngle = categoryId ? sectorByCategory.get(categoryId) ?? 0 : (index / Math.max(selected.length, 1)) * Math.PI * 2;
    const offset = groupRecords.length > 1 ? ((groupIndex / (groupRecords.length - 1)) - 0.5) * 0.72 : 0;
    const angle = baseAngle + offset;
    const probabilityText = record.latest && validProbability(record.latest.probability) ? `Current saved probability ${pct(record.latest.probability)}.` : "No saved probability is available.";
    const node: PlotNode = {
      id: `question-${record.id}`,
      label: record.question,
      detail: `${record.category?.name ?? "Uncategorized"} · ${record.status} · ${probabilityText}`,
      position: [Math.cos(angle) * (2.9 + (groupIndex % 3) * 0.18), 2.1 + (groupIndex % 3) * 0.45, Math.sin(angle) * (2.7 + (groupIndex % 3) * 0.18)],
      color: record.status === "resolved" ? COLORS.green : record.status === "active" ? COLORS.orange : COLORS.muted,
      radius: 0.17,
    };
    nodeByRecord.set(record.id, node);
    nodes.push(node);
  });

  orderedGroups.forEach(([categoryId, group], index) => {
    const angle = sectorByCategory.get(categoryId) ?? 0;
    const hubId = `category-${categoryId}`;
    nodes.push({
      id: hubId,
      label: group.label,
      detail: `Recorded category. ${group.records.length} of the currently displayed saved forecasts use this category.`,
      position: [Math.cos(angle) * 1.25, 2.3, Math.sin(angle) * 1.25],
      color: COLORS.gold,
      radius: 0.2,
    });
    group.records.forEach(record => {
      const questionNode = nodeByRecord.get(record.id);
      if (questionNode) edges.push({ id: `category-link-${index}-${record.id}`, from: hubId, to: questionNode.id, color: COLORS.gold, opacity: 0.48 });
    });
  });

  const termSets = selected.map(record => terms(record.question));
  for (let left = 0; left < selected.length; left++) {
    for (let right = left + 1; right < selected.length; right++) {
      const shared = Array.from(termSets[left]).filter(term => termSets[right].has(term)).sort();
      if (shared.length < 2) continue;
      const from = nodeByRecord.get(selected[left].id);
      const to = nodeByRecord.get(selected[right].id);
      if (!from || !to) continue;
      edges.push({
        id: `shared-terms-${selected[left].id}-${selected[right].id}`,
        from: from.id,
        to: to.id,
        color: COLORS.blue,
        opacity: 0.55,
        label: `Shared exact terms: ${shared.join(", ")}`,
      });
    }
  }

  return {
    title: "Related-question network",
    description: "Shows only the signed-in user's displayed forecasts. Category links use saved category IDs; other links require at least two exact shared question terms after common words are removed.",
    xLabel: "Relationship layout",
    yLabel: "Category clusters",
    zLabel: "Shared terms",
    nodes,
    edges,
    paths: [],
    columns: [],
    emptyMessage: "No saved forecasts are available for the current library filters.",
    notice: records.length > selected.length ? `Showing ${selected.length} of ${records.length} displayed forecasts.` : "Connections are exact category matches or shared terms; they are not semantic or predictive similarity scores.",
  };
}
