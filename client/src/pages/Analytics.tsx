import { useState } from "react";
import { ArrowUpRight, BarChart3, Info, LineChart, Target } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function chartX(value: number) { return 10 + value * 80; }
function chartY(value: number) { return 90 - value * 80; }

export default function Analytics() {
  const { user } = useSupabaseAuth();
  const [selectedRange, setSelectedRange] = useState<number | null>(null);
  const query = trpc.analytics.useQuery(undefined, { enabled: Boolean(user) });
  const predictionsQuery = trpc.predictions.list.useQuery({ status: "resolved" }, { enabled: Boolean(user) });
  if (!user) {
    return <div className="page-empty"><div className="empty-index">03 / calibration</div><h1>Measure the<br /><em>forecast.</em></h1><p>Sign in to review calibration from your resolved forecasts.</p><Link className="primary-button" href="/">Make a forecast <ArrowUpRight size={17} /></Link></div>;
  }
  const data = query.data;
  const selectedPoint = selectedRange === null ? null : data?.calibration[selectedRange] ?? null;
  const resolvedPredictions = (predictionsQuery.data ?? []).filter(item => item.latest && (item.resolution?.outcome === "yes" || item.resolution?.outcome === "no"));
  const selectedForecasts = selectedPoint
    ? resolvedPredictions.filter(item => item.latest!.probability >= selectedPoint.lower && item.latest!.probability < selectedPoint.upper)
    : [];
  const brierScores = selectedForecasts.map(item => item.resolution?.brier_score).filter((score): score is number => typeof score === "number");
  const selectedBrier = brierScores.length ? brierScores.reduce((sum, score) => sum + score, 0) / brierScores.length : null;

  return (
    <div className="internal-page analytics-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line"></span> Forecast performance</div><h1>Calibration desk</h1><p>Compare predicted probabilities with resolved outcomes. Metrics use your saved forecasts only.</p></div>
        <div className="data-honesty"><Info size={15} /> No resolved forecasts? No invented score.</div>
      </div>
      {query.isLoading ? <div className="loading-list">Calculating from resolved forecasts…</div> : (
        <>
          <div className="metric-band">
            <div><span>Resolved forecasts</span><strong>{data?.resolvedCount ?? 0}</strong><small>events with a recorded outcome</small></div>
            <div><span>Average Brier score</span><strong>{data?.brierScore === null || data?.brierScore === undefined ? "—" : data.brierScore.toFixed(3)}</strong><small>lower is better</small></div>
            <div><span>Directional accuracy</span><strong>{percent(data?.accuracy ?? null)}</strong><small>50% baseline for binary events</small></div>
            <div><span>Average horizon</span><strong>{data?.horizonDays ? `${data.horizonDays}d` : "—"}</strong><small>question to resolution</small></div>
          </div>
          {data?.resolvedCount ? (
            <div className="analytics-grid">
              <section className="analysis-panel calibration-panel">
                <div className="panel-title"><div><span className="panel-index">A</span><h2>Reliability curve</h2></div><span className="mono panel-note">select a point or range</span></div>
                <div className="calibration-chart interactive-calibration-chart">
                  <div className="chart-y-label">observed frequency</div>
                  <div className="chart-area interactive-chart-area">
                    <svg className="calibration-svg" viewBox="0 0 100 100" role="img" aria-label="Forecast probability plotted against observed yes frequency. The dashed diagonal represents perfect calibration.">
                      <g className="calibration-grid">
                        {[0, 0.25, 0.5, 0.75, 1].map(tick => <g key={tick}>
                          <line x1="10" x2="90" y1={chartY(tick)} y2={chartY(tick)} />
                          <line x1={chartX(tick)} x2={chartX(tick)} y1="10" y2="90" />
                          <text x="6" y={chartY(tick) + 1.5} textAnchor="end">{Math.round(tick * 100)}</text>
                          <text x={chartX(tick)} y="97" textAnchor="middle">{Math.round(tick * 100)}</text>
                        </g>)}
                      </g>
                      <line className="calibration-ideal" x1="10" y1="90" x2="90" y2="10" />
                      {data.calibration.map((point, index) => {
                        if (point.count === 0 || point.forecast === null || point.observed === null) return null;
                        const x = chartX(point.forecast);
                        const idealY = chartY(point.forecast);
                        const observedY = chartY(point.observed);
                        const active = selectedRange === index;
                        const label = `${point.bucket}; average forecast ${Math.round(point.forecast * 100)}%, observed ${Math.round(point.observed * 100)}%, ${point.count} resolved forecasts`;
                        return <g key={point.bucket} className={`calibration-mark ${active ? "is-selected" : ""}`} role="button" tabIndex={0} aria-label={label} aria-pressed={active} onClick={() => setSelectedRange(index)} onMouseEnter={() => setSelectedRange(index)} onFocus={() => setSelectedRange(index)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedRange(index); } }}>
                          <title>{label}</title>
                          <line className="calibration-deviation" x1={x} y1={idealY} x2={x} y2={observedY} />
                          <circle className="calibration-hit-area" cx={x} cy={observedY} r="6" />
                          <circle className="calibration-forecast-point" cx={x} cy={idealY} r="2.2" />
                          <circle className="calibration-observed-point" cx={x} cy={observedY} r={active ? "3.5" : "2.8"} />
                        </g>;
                      })}
                    </svg>
                  </div>
                  <div className="chart-x-label">forecast probability (%)</div>
                </div>
                <div className="chart-legend"><span><i className="legend-dot forecast"></i> forecast average</span><span><i className="legend-dot actual"></i> observed yes rate</span><span><i className="legend-rule"></i> perfect calibration</span></div>
                <div className="calibration-ranges" role="group" aria-label="Select a probability range">
                  {data.calibration.map((point, index) => <button key={point.bucket} type="button" className={selectedRange === index ? "selected" : ""} aria-pressed={selectedRange === index} onMouseEnter={() => setSelectedRange(index)} onFocus={() => setSelectedRange(index)} onClick={() => setSelectedRange(index)}>
                    <span>{point.bucket}</span><small>{point.count} {point.count === 1 ? "forecast" : "forecasts"}</small>
                  </button>)}
                </div>
                <div className="calibration-selection" aria-live="polite">
                  {selectedPoint ? <>
                    <div className="calibration-selection-head"><div><span className="mono">SELECTED RANGE</span><h3>{selectedPoint.bucket}</h3></div><div className="selection-metrics"><span><small>Average forecast</small><strong>{percent(selectedPoint.forecast)}</strong></span><span><small>Observed yes rate</small><strong>{percent(selectedPoint.observed)}</strong></span><span><small>Average Brier</small><strong>{selectedBrier === null ? "—" : selectedBrier.toFixed(3)}</strong></span></div></div>
                    {predictionsQuery.isLoading ? <div className="range-empty">Loading resolved forecasts in this range…</div> : selectedForecasts.length ? <div className="calibration-forecast-list">
                      {selectedForecasts.map(item => <Link href={`/predictions/${item.id}`} className="calibration-forecast-row" key={item.id}>
                        <strong>{item.question}</strong><span>{Math.round(item.latest!.probability * 100)}% forecast</span><span className={`outcome-badge ${item.resolution!.outcome}`}>{item.resolution!.outcome}</span><span>Brier {item.resolution!.brier_score === null ? "—" : item.resolution!.brier_score.toFixed(3)}</span><ArrowUpRight size={14} />
                      </Link>)}
                    </div> : <div className="range-empty">No resolved yes/no forecasts in this probability range yet.</div>}
                  </> : <div className="range-empty">Hover over a chart point or choose a probability band to inspect the forecasts behind it.</div>}
                </div>
              </section>
              <section className="analysis-panel score-panel">
                <div className="panel-title"><div><span className="panel-index">B</span><h2>What the score means</h2></div></div>
                <div className="score-reading"><Target size={21} /><p>A Brier score measures the squared distance between a forecast probability and the eventual binary outcome. <strong>0.00 is perfect.</strong></p></div>
                <div className="score-note"><LineChart size={16} /><span>Your current score is based on {data.resolvedCount} resolved {data.resolvedCount === 1 ? "forecast" : "forecasts"}. More observations make the signal more trustworthy.</span></div>
              </section>
            </div>
          ) : (
            <div className="analytics-empty"><BarChart3 size={25} /><div><h2>No resolved forecasts yet.</h2><p>Resolve a forecast to calculate Brier score, directional accuracy, and calibration.</p></div><Link href="/library" className="text-link">Open the ledger <ArrowUpRight size={15} /></Link></div>
          )}
        </>
      )}
    </div>
  );
}
