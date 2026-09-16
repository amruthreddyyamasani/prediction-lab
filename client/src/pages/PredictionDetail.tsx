import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowUpRight as CatalystIcon, Check, Clock3, ExternalLink, FileQuestion, Flag, History, Info, LineChart, Link2, RefreshCw, Scale, ShieldAlert, Target, TrendingUp, X } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function probability(value: number) { return `${Math.round(value * 100)}%`; }

export default function PredictionDetail() {
  const [, params] = useRoute("/predictions/:id");
  const [, navigate] = useLocation();
  const { user } = useSupabaseAuth();
  const query = trpc.predictions.get.useQuery({ id: params?.id ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(user && params?.id) });
  const update = trpc.predictions.update.useMutation({ onSuccess: () => { setUpdateOpen(false); query.refetch(); } });
  const resolve = trpc.predictions.resolve.useMutation({ onSuccess: () => { setResolveOpen(false); query.refetch(); } });
  const [updateOpen, setUpdateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [outcome, setOutcome] = useState<"yes" | "no" | "ambiguous">("yes");
  const [resolutionNote, setResolutionNote] = useState("");
  useEffect(() => { if (query.data) setQuestion(query.data.question); }, [query.data?.id]);
  if (!user) return <div className="page-empty"><div className="empty-index">forecast / private</div><h1>Sign in to<br /><em>open the record.</em></h1><Link href="/" className="primary-button">Return home <ArrowUpRight size={17} /></Link></div>;
  if (query.isLoading) return <div className="loading-list">Opening the research record…</div>;
  if (query.error || !query.data) return <div className="page-empty"><div className="empty-index">record / not found</div><h1>This forecast<br /><em>is unavailable.</em></h1><Link href="/library" className="primary-button">Back to ledger</Link></div>;
  const prediction = query.data;
  const latest = prediction.latest;
  const reasoning = [
    { title: "Baseline", copy: latest?.baseline, Icon: Scale },
    { title: "Current signals", copy: latest?.current_signals, Icon: TrendingUp },
    { title: "Catalysts", copy: latest?.catalysts, Icon: CatalystIcon },
    { title: "Risks", copy: latest?.risks, Icon: ShieldAlert },
    { title: "Counterfactual", copy: latest?.counterfactual, Icon: FileQuestion },
    { title: "Final assessment", copy: latest?.rationale, Icon: Target },
  ];
  return <div className="detail-page">
    <Link href="/library" className="back-link"><ArrowLeft size={15} /> Forecast ledger</Link>
    <header className="detail-header"><div><div className="eyebrow"><span className="eyebrow-line"></span> {prediction.category?.name ?? "Uncategorized"} · opened {date(prediction.created_at)}</div><h1>{prediction.question}</h1><div className="criteria"><Target size={16} /><span><strong>Resolution criteria</strong>{prediction.resolution_criteria}</span></div></div><div className="detail-status"><span className={`status-mark ${prediction.status}`}>{prediction.status}</span><span className="mono">resolves {date(prediction.resolution_date)}</span></div></header>
    {latest && <section className="forecast-hero"><div className="forecast-number"><span className="mono">latest forecast</span><strong>{probability(latest.probability)}</strong><span className={`forecast-label ${latest.label}`}>{latest.label}</span></div><div className="forecast-readout"><div className="readout-bar"><span style={{ width: `${latest.probability * 100}%` }}></span></div><div className="readout-scale"><span>unlikely</span><span>uncertain</span><span>likely</span></div><p>Based on the current model assessment. This probability is a position in uncertainty, not a promise about the future.</p></div><div className="forecast-meta"><div><span>uncertainty</span><strong>{latest.uncertainty}</strong></div><div><span>version</span><strong>v{latest.version_number}</strong></div><div><span>updated</span><strong>{date(latest.created_at)}</strong></div></div></section>}
    <div className="detail-actions"><button className="secondary-button" onClick={() => setUpdateOpen(value => !value)}><RefreshCw size={15} /> Update forecast</button>{prediction.status === "active" && <button className="secondary-button" onClick={() => setResolveOpen(value => !value)}><Flag size={15} /> Resolve outcome</button>}</div>
    {updateOpen && <form className="inline-form detail-form" onSubmit={event => { event.preventDefault(); update.mutate({ id: prediction.id, question, changeSummary }); }}><div className="eyebrow">New version / explain the change</div><textarea value={question} onChange={event => setQuestion(event.target.value)} /><input value={changeSummary} onChange={event => setChangeSummary(event.target.value)} placeholder="What changed since the last forecast?" required minLength={5} /><button className="primary-button" disabled={update.isPending}>{update.isPending ? "Re-evaluating…" : "Save new forecast"}</button>{update.error && <div className="inline-error">{update.error.message}</div>}</form>}
    {resolveOpen && <form className="inline-form detail-form resolve-form" onSubmit={event => { event.preventDefault(); resolve.mutate({ id: prediction.id, outcome, resolutionNote }); }}><div className="eyebrow">Record what happened</div><div className="outcome-options">{(["yes", "no", "ambiguous"] as const).map(value => <button type="button" key={value} className={outcome === value ? "selected" : ""} onClick={() => setOutcome(value)}>{value === "yes" ? <Check size={15} /> : value === "no" ? <X size={15} /> : <Info size={15} />}{value}</button>)}</div><textarea value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} placeholder="What is the evidence for this outcome?" required minLength={5} /><button className="primary-button" disabled={resolve.isPending}>{resolve.isPending ? "Saving resolution…" : "Record outcome"}</button>{resolve.error && <div className="inline-error">{resolve.error.message}</div>}</form>}
    <div className="detail-columns"><main>
      <section className="detail-section"><div className="section-heading"><span className="panel-index">01</span><div><h2>Why this forecast</h2><p>Structured reasoning, not a generic answer.</p></div></div><div className="reasoning-grid">{reasoning.map(item => { const Icon = item.Icon; return <div className="reasoning-item" key={item.title}><Icon size={16} /><div><h3>{item.title}</h3><p>{item.copy || "Not provided."}</p></div></div>; })}</div></section>
      <section className="detail-section"><div className="section-heading"><span className="panel-index">02</span><div><h2>Key variables</h2><p>The conditions most likely to move the probability.</p></div></div><div className="variable-list">{(latest?.key_variables ?? []).map((variable, index) => <div key={variable}><span>{String(index + 1).padStart(2, "0")}</span><strong>{variable}</strong><i></i></div>)}</div></section>
      <section className="detail-section"><div className="section-heading"><span className="panel-index">03</span><div><h2>Evidence</h2><p>Sources are shown only when actually consulted.</p></div></div>{prediction.evidence.length ? prediction.evidence.map(item => <a className="evidence-row" href={item.source_url} target="_blank" rel="noreferrer" key={item.id}><div><span className={`evidence-stance ${item.stance}`}>{item.stance}</span><h3>{item.title}</h3><p>{item.excerpt}</p><small>{item.source_name} · {item.published_at ? date(item.published_at) : "undated"}</small></div><ExternalLink size={15} /></a>) : <div className="evidence-empty"><Link2 size={18} /><div><h3>No external sources attached.</h3><p>This forecast was generated from structured reasoning only. Research retrieval is not connected for this record, so Prediction Lab does not fabricate citations.</p></div></div>}</section>
    </main><aside><section className="side-panel"><div className="side-panel-title"><History size={16} /><span>Version history</span></div>{prediction.versions.map(version => <div className={`version-row ${version.id === latest?.id ? "current" : ""}`} key={version.id}><div className="version-dot"></div><div><strong>v{version.version_number} · {probability(version.probability)}</strong><span>{date(version.created_at)}</span>{version.change_summary && <p>{version.change_summary}</p>}</div></div>)}</section><section className="side-panel resolution-panel"><div className="side-panel-title"><Clock3 size={16} /><span>Resolution</span></div><div className="resolution-date">{date(prediction.resolution_date)}</div>{prediction.resolution ? <><span className={`outcome-badge ${prediction.resolution.outcome}`}>{prediction.resolution.outcome}</span><p>{prediction.resolution.resolution_note}</p>{prediction.resolution.brier_score !== null && <div className="brier-mini"><span>Brier score</span><strong>{prediction.resolution.brier_score.toFixed(3)}</strong></div>}</> : <p>Waiting for the event to become resolvable. You can record an outcome when the criteria are met.</p>}</section></aside></div>
  </div>;
}
