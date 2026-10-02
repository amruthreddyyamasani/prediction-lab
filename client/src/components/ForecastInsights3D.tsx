import { useMemo, useState } from "react";
import type { ForecastRecord } from "@shared/types";
import ThreeDataPlot from "@/components/ThreeDataPlot";
import {
  buildEvidenceConstellation,
  buildForecastDrift,
  buildProbabilityLandscape,
  buildScenarioTree,
} from "@/lib/visualizationData";

const views = [
  { id: "evidence", label: "Evidence constellation" },
  { id: "scenarios", label: "Scenario branches" },
  { id: "landscape", label: "Probability landscape" },
  { id: "drift", label: "Forecast drift" },
] as const;
type ViewId = typeof views[number]["id"];

export default function ForecastInsights3D({ prediction }: { prediction: ForecastRecord }) {
  const [active, setActive] = useState<ViewId>("evidence");
  const [selectedFactor, setSelectedFactor] = useState("");
  const specs = useMemo(() => ({
    evidence: buildEvidenceConstellation(prediction),
    scenarios: buildScenarioTree(prediction),
    landscape: buildProbabilityLandscape(prediction, selectedFactor),
    drift: buildForecastDrift(prediction),
  }), [prediction, selectedFactor]);
  const factors = useMemo(() => Array.from(new Set((prediction.versions ?? [])
    .flatMap(version => version.key_variables)
    .map(value => value.trim())
    .filter(Boolean))), [prediction.versions]);
  const current = specs[active];
  const hasEvidence = prediction.evidence.length > 0 || (prediction.latest?.key_variables.length ?? 0) > 0;
  const hasDatedVersion = specs.landscape.nodes.length > 0;
  const hasDrift = specs.drift.nodes.length > 1;
  const hasScenarioInputs = Boolean(
    prediction.latest?.baseline?.trim() ||
    prediction.latest?.current_signals?.trim() ||
    prediction.latest?.catalysts?.trim() ||
    prediction.latest?.risks?.trim() ||
    prediction.latest?.counterfactual?.trim() ||
    prediction.latest?.key_variables.length,
  );
  const emptyMessage = active === "evidence" && !hasEvidence
    ? specs.evidence.emptyMessage
    : active === "landscape" && !hasDatedVersion
      ? specs.landscape.emptyMessage
      : active === "drift" && !hasDrift
        ? specs.drift.emptyMessage
        : active === "scenarios" && !hasScenarioInputs
          ? "No scenario inputs are recorded yet. Add a forecast update with reasoning to populate this view."
          : null;

  return <section className="analysis-panel forecast-visual-workbench" aria-labelledby="forecast-visual-heading">
    <div className="panel-title"><div><span className="panel-index">3D</span><h2 id="forecast-visual-heading">Explore this forecast</h2></div><span className="mono panel-note">four data-backed views</span></div>
    <p className="forecast-visual-intro">Orbit the recorded evidence, reasoning and version trail. Scenario branches remain qualitative; the product does not store factor sensitivities or hypothetical branch probabilities.</p>
    <div className="visualization-tabs" role="group" aria-label="Forecast visualizations">
      {views.map(view => <button key={view.id} type="button" aria-pressed={active === view.id} className={active === view.id ? "active" : ""} onClick={() => setActive(view.id)}>{view.label}</button>)}
    </div>
    <div className="visualization-content" aria-live="polite">
      {active === "landscape" && factors.length > 0 && <label className="visualization-factor-filter"><span>Highlight recorded factor mentions</span><select value={selectedFactor} onChange={event => setSelectedFactor(event.target.value)}><option value="">All saved versions</option>{factors.map(factor => <option key={factor} value={factor}>{factor}</option>)}</select></label>}
      {emptyMessage ? <div className="visualization-empty" role="status">{emptyMessage}</div> : <ThreeDataPlot spec={current} />}
    </div>
  </section>;
}
