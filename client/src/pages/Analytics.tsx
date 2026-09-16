import { ArrowUpRight, BarChart3, Info, LineChart, Target } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

export default function Analytics() {
  const { user } = useSupabaseAuth();
  const query = trpc.analytics.useQuery(undefined, { enabled: Boolean(user) });
  if (!user) {
    return <div className="page-empty"><div className="empty-index">03 / calibration</div><h1>Measure the<br /><em>forecast.</em></h1><p>Calibration becomes meaningful only after your forecasts resolve. Sign in to keep a record.</p><Link className="primary-button" href="/">Make a forecast <ArrowUpRight size={17} /></Link></div>;
  }
  const data = query.data;
  return (
    <div className="internal-page analytics-page">
      <div className="page-heading">
        <div><div className="eyebrow"><span className="eyebrow-line"></span> Performance, not vanity metrics</div><h1>Calibration desk</h1><p>When the lab says 70%, how often does the event actually happen? This page only renders metrics computed from resolved records.</p></div>
        <div className="data-honesty"><Info size={15} /> No resolved forecasts? No invented score.</div>
      </div>
      {query.isLoading ? <div className="loading-list">Calculating from your ledger…</div> : (
        <>
          <div className="metric-band">
            <div><span>Resolved forecasts</span><strong>{data?.resolvedCount ?? 0}</strong><small>events with a recorded outcome</small></div>
            <div><span>Average Brier score</span><strong>{data?.brierScore === null || data?.brierScore === undefined ? "—" : data.brierScore.toFixed(3)}</strong><small>lower is better</small></div>
            <div><span>Directional accuracy</span><strong>{percent(data?.accuracy ?? null)}</strong><small>50% baseline for binary events</small></div>
            <div><span>Average horizon</span><strong>{data?.horizonDays ? `${data.horizonDays}d` : "—"}</strong><small>question to resolution</small></div>
          </div>
          {data?.resolvedCount ? (
            <div className="analytics-grid">
              <section className="analysis-panel">
                <div className="panel-title"><div><span className="panel-index">A</span><h2>Reliability curve</h2></div><span className="mono panel-note">forecast vs observed</span></div>
                <div className="calibration-chart"><div className="chart-y-label">observed</div><div className="chart-area"><div className="chart-line ideal"></div><div className="chart-line observed"></div>{data.calibration.map((point, index) => <div className="chart-point-group" key={point.bucket} style={{ left: `${index * 28 + 8}%` }}><span className="chart-point forecast" style={{ bottom: `${point.forecast * 100}%` }}></span><span className="chart-point actual" style={{ bottom: `${point.observed * 100}%` }}></span><small>{point.bucket}<br />n={point.count}</small></div>)}</div><div className="chart-x-label">forecast probability</div></div>
                <div className="chart-legend"><span><i className="legend-dot forecast"></i> forecasted probability</span><span><i className="legend-dot actual"></i> observed frequency</span><span><i className="legend-rule"></i> perfect calibration</span></div>
              </section>
              <section className="analysis-panel score-panel">
                <div className="panel-title"><div><span className="panel-index">B</span><h2>What the score means</h2></div></div>
                <div className="score-reading"><Target size={21} /><p>A Brier score measures the squared distance between a forecast probability and the eventual binary outcome. <strong>0.00 is perfect.</strong></p></div>
                <div className="score-note"><LineChart size={16} /><span>Your current score is based on {data.resolvedCount} resolved {data.resolvedCount === 1 ? "forecast" : "forecasts"}. More observations make the signal more trustworthy.</span></div>
              </section>
            </div>
          ) : (
            <div className="analytics-empty"><BarChart3 size={25} /><div><h2>The calibration desk is waiting.</h2><p>Resolve a forecast in the ledger and this space will calculate Brier score, directional accuracy, and reliability from the actual outcome.</p></div><Link href="/library" className="text-link">Open the ledger <ArrowUpRight size={15} /></Link></div>
          )}
        </>
      )}
    </div>
  );
}
