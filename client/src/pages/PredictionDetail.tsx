import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, ArrowUpRight as CatalystIcon, BellRing, Check, Clock3, Copy, ExternalLink, FileQuestion, Flag, History, Info, LineChart, Link2, RefreshCw, Scale, ShieldAlert, Target, TrendingUp, X } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import ForecastInsights3D from "@/components/ForecastInsights3D";
import { loadReminders, saveReminders, uniqueEvidenceHosts, type ReminderDays } from "@/lib/userPreferences";
import { buildForecastExportPreview } from "@/lib/forecastExport";

function date(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function probability(value: number) { return `${Math.round(value * 100)}%`; }

export default function PredictionDetail() {
  const [, params] = useRoute("/predictions/:id");
  const [, navigate] = useLocation();
  const { user } = useSupabaseAuth();
  const query = trpc.predictions.get.useQuery({ id: params?.id ?? "00000000-0000-0000-0000-000000000000" }, { enabled: Boolean(user && params?.id) });
  const update = trpc.predictions.update.useMutation({ onSuccess: () => { setUpdateOpen(false); query.refetch(); } });
  const resolve = trpc.predictions.resolve.useMutation({ onSuccess: () => { setResolveOpen(false); query.refetch(); } });
  const addEvidence = trpc.predictions.addEvidence.useMutation({ onSuccess: async () => { setEvidenceOpen(false); setEvidenceTitle(""); setEvidenceExcerpt(""); await query.refetch(); } });
  const [updateOpen, setUpdateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [exportError, setExportError] = useState("");
  const [reminderDays, setReminderDays] = useState<ReminderDays | 0>(0);
  const [compareFromId, setCompareFromId] = useState("");
  const [compareToId, setCompareToId] = useState("");
  const [question, setQuestion] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [outcome, setOutcome] = useState<"yes" | "no" | "ambiguous">("yes");
  const [resolutionNote, setResolutionNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceSourceName, setEvidenceSourceName] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceExcerpt, setEvidenceExcerpt] = useState("");
  const [evidenceStance, setEvidenceStance] = useState<"supporting" | "contradicting" | "context">("context");
  const [evidencePublishedAt, setEvidencePublishedAt] = useState("");
  useEffect(() => { if (query.data) setQuestion(query.data.question); }, [query.data?.id]);
  useEffect(() => {
    if (user && query.data) setReminderDays(loadReminders(user.id)[query.data.id] ?? 0);
  }, [user?.id, query.data?.id]);
  useEffect(() => {
    const versions = query.data?.versions ?? [];
    if (!versions.length) return;
    setCompareFromId(versions.length > 1 ? versions[versions.length - 2].id : versions[0].id);
    setCompareToId(versions[versions.length - 1].id);
  }, [query.data?.id, query.data?.versions.length]);
  if (!user) return <div className="page-empty"><div className="empty-index">forecast / private</div><h1>Sign in to<br /><em>open the record.</em></h1><Link href="/" className="primary-button">Return home <ArrowUpRight size={17} /></Link></div>;
  if (query.isLoading) return <div className="loading-list">Opening the research record…</div>;
  if (query.error || !query.data) return <div className="page-empty"><div className="empty-index">record / unavailable</div><h1>This forecast<br /><em>could not be opened.</em></h1><p>Your record has not been changed. Retry or return to the private ledger.</p><button type="button" className="secondary-button" onClick={() => query.refetch()}>Retry</button><Link href="/library" className="primary-button">Back to ledger</Link></div>;
  const prediction = query.data;
  const latest = prediction.latest;
  const sourceHosts = uniqueEvidenceHosts(prediction.evidence);
  const newestEvidence = [...prediction.evidence].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  const compareFrom = prediction.versions.find(version => version.id === compareFromId) ?? prediction.versions[Math.max(0, prediction.versions.length - 2)] ?? null;
  const compareTo = prediction.versions.find(version => version.id === compareToId) ?? latest ?? null;
  const probabilityDelta = compareFrom && compareTo ? Math.round((compareTo.probability - compareFrom.probability) * 100) : 0;
  const exportPreview = buildForecastExportPreview(prediction);

  function changeReminder(value: string) {
    if (!user) return;
    const days = Number(value) as ReminderDays | 0;
    const next = loadReminders(user.id);
    if (days === 0) delete next[prediction.id];
    else if (days === 1 || days === 3 || days === 7 || days === 14) next[prediction.id] = days;
    saveReminders(user.id, next);
    setReminderDays(days);
  }

  async function copyExport() {
    setExportError("");
    try {
      await navigator.clipboard.writeText(exportPreview.text);
      setCopiedExport(true);
      window.setTimeout(() => setCopiedExport(false), 1800);
    } catch {
      setExportError("Clipboard access is unavailable. You can still select and copy the preview text manually.");
    }
  }

  function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addEvidence.mutate({ predictionId: prediction.id, sourceUrl: evidenceUrl, sourceName: evidenceSourceName, title: evidenceTitle, excerpt: evidenceExcerpt, stance: evidenceStance, publishedAt: evidencePublishedAt || undefined });
  }
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
    {latest && <section className="forecast-hero"><div className="forecast-number"><span className="mono">latest forecast</span><strong>{probability(latest.probability)}</strong><span className={`forecast-label ${latest.label}`}>{latest.label}</span></div><div className="forecast-readout"><div className="readout-bar"><span style={{ width: `${latest.probability * 100}%` }}></span></div><div className="readout-scale"><span>unlikely</span><span>uncertain</span><span>likely</span></div><p className="probability-explainer"><strong>Probability</strong> is the estimated chance this event occurs, given the current assessment—not a promise. <strong>Uncertainty</strong> describes how tentative that estimate is; it is a separate measure.</p></div><div className="forecast-meta"><div><span>uncertainty</span><strong>{latest.uncertainty}</strong></div><div><span>version</span><strong>v{latest.version_number}</strong></div><div><span>updated</span><strong>{date(latest.created_at)}</strong></div></div></section>}
    <div className="detail-actions"><button className="secondary-button" onClick={() => setUpdateOpen(value => !value)}><RefreshCw size={15} /> Update forecast</button><button type="button" className="secondary-button" onClick={() => setEvidenceOpen(value => !value)}><Link2 size={15} /> Add evidence</button><button type="button" className="secondary-button" onClick={() => setExportOpen(value => !value)}><Copy size={15} /> Privacy-aware export</button>{prediction.status === "active" && <button className="secondary-button" onClick={() => setResolveOpen(value => !value)}><Flag size={15} /> Resolve outcome</button>}</div>
    {evidenceOpen && <form id="evidence-add-form" className="inline-form detail-form evidence-add-form" onSubmit={submitEvidence}><div className="eyebrow">Add an evidence record</div><p className="form-hint">Add a source you reviewed. The app stores its details and stance; it does not automatically re-check the source later.</p><label>Source URL<input type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} placeholder="https://example.org/report" required /></label><div className="evidence-form-grid"><label>Source name<input value={evidenceSourceName} onChange={event => setEvidenceSourceName(event.target.value)} maxLength={200} required /></label><label>Published date <span>(optional)</span><input type="date" value={evidencePublishedAt} onChange={event => setEvidencePublishedAt(event.target.value)} /></label></div><label>Title<input value={evidenceTitle} onChange={event => setEvidenceTitle(event.target.value)} maxLength={500} required /></label><label>Evidence note<textarea value={evidenceExcerpt} onChange={event => setEvidenceExcerpt(event.target.value)} minLength={5} maxLength={3000} rows={3} required /></label><label>Relation to forecast<select value={evidenceStance} onChange={event => setEvidenceStance(event.target.value as typeof evidenceStance)}><option value="supporting">Supporting</option><option value="contradicting">Contradicting</option><option value="context">Context</option></select></label><button className="primary-button" disabled={addEvidence.isPending}>{addEvidence.isPending ? "Saving evidence…" : "Save evidence"}</button>{addEvidence.error && <p className="inline-error" role="alert">{addEvidence.error.message}</p>}</form>}
    {exportOpen && <section className="inline-form export-preview-card" aria-labelledby="export-preview-title"><div className="export-preview-header"><div><div className="eyebrow">PRIVATE TEXT EXPORT · NOT PUBLISHED</div><h2 id="export-preview-title">Review before copying</h2></div><button type="button" className="text-button" onClick={() => setExportOpen(false)}>Close</button></div><p>Only the fields below are included. Owner details, attached evidence, and private reasoning are excluded. Nothing is uploaded or made public.</p><ul>{exportPreview.included.map(item => <li key={item}>{item}</li>)}</ul><pre>{exportPreview.text}</pre><button type="button" className="secondary-button" onClick={copyExport}><Copy size={14} /> {copiedExport ? "Copied" : "Copy reviewed summary"}</button>{exportError && <p className="inline-error" role="status">{exportError}</p>}</section>}
    <ForecastInsights3D prediction={prediction} />
    {updateOpen && <form className="inline-form detail-form" onSubmit={event => { event.preventDefault(); update.mutate({ id: prediction.id, question, changeSummary }); }}><div className="eyebrow">Update forecast</div><textarea value={question} onChange={event => setQuestion(event.target.value)} /><input value={changeSummary} onChange={event => setChangeSummary(event.target.value)} placeholder="What changed since the last forecast?" required minLength={5} /><button className="primary-button" disabled={update.isPending}>{update.isPending ? "Updating…" : "Save update"}</button>{update.error && <div className="inline-error">{update.error.message}</div>}</form>}
    {resolveOpen && <form className="inline-form detail-form resolve-form" onSubmit={event => { event.preventDefault(); resolve.mutate({ id: prediction.id, outcome, resolutionNote }); }}><div className="eyebrow">Record outcome</div><div className="outcome-options">{(["yes", "no", "ambiguous"] as const).map(value => <button type="button" key={value} className={outcome === value ? "selected" : ""} onClick={() => setOutcome(value)}>{value === "yes" ? <Check size={15} /> : value === "no" ? <X size={15} /> : <Info size={15} />}{value}</button>)}</div><textarea value={resolutionNote} onChange={event => setResolutionNote(event.target.value)} placeholder="What is the evidence for this outcome?" required minLength={5} /><button className="primary-button" disabled={resolve.isPending}>{resolve.isPending ? "Saving…" : "Record outcome"}</button>{resolve.error && <div className="inline-error">{resolve.error.message}</div>}</form>}
    <div className="detail-columns"><main>
      <section className="detail-section"><div className="section-heading"><span className="panel-index">01</span><div><h2>Why this forecast</h2><p>Reasoning behind the current probability.</p></div></div><div className="reasoning-grid">{reasoning.map(item => { const Icon = item.Icon; return <div className="reasoning-item" key={item.title}><Icon size={16} /><div><h3>{item.title}</h3><p>{item.copy || "Not provided."}</p></div></div>; })}</div></section>
      <section className="detail-section"><div className="section-heading"><span className="panel-index">02</span><div><h2>Key variables</h2><p>Factors that could change the probability.</p></div></div><div className="variable-list">{(latest?.key_variables ?? []).map((variable, index) => <div key={variable}><span>{String(index + 1).padStart(2, "0")}</span><strong>{variable}</strong><i></i></div>)}</div></section>
      <section className="detail-section" id="evidence-list"><div className="section-heading"><span className="panel-index">03</span><div><h2>Evidence</h2><p>Sources attached to this forecast.</p></div></div><div className="evidence-freshness"><strong>{prediction.evidence.length} {prediction.evidence.length === 1 ? "source" : "sources"}</strong><span>{sourceHosts.length} distinct {sourceHosts.length === 1 ? "domain" : "domains"}</span><span>{newestEvidence ? `Latest evidence saved ${date(newestEvidence.created_at)}` : "No evidence timestamp recorded"}</span><small>Dates describe when evidence was saved, not an automatic source re-check.</small></div>{prediction.evidence.length ? prediction.evidence.map(item => <a className="evidence-row" href={item.source_url} target="_blank" rel="noreferrer" key={item.id}><div><span className={`evidence-stance ${item.stance}`}>{item.stance}</span><h3>{item.title}</h3><p>{item.excerpt}</p><small>{item.source_name} · {item.published_at ? date(item.published_at) : "publication date unknown"} · added {date(item.created_at)}</small></div><ExternalLink size={15} /></a>) : <div className="evidence-empty"><Link2 size={18} /><div><h3>No external sources attached.</h3><p>Add a source you reviewed to keep evidence beside the forecast.</p></div></div>}</section>
    </main><aside><section className="side-panel"><div className="side-panel-title"><History size={16} /><span>Version history</span></div>{prediction.versions.map(version => <div className={`version-row ${version.id === latest?.id ? "current" : ""}`} key={version.id}><div className="version-dot"></div><div><strong>v{version.version_number} · {probability(version.probability)}</strong><span>{date(version.created_at)}</span>{version.change_summary && <p>{version.change_summary}</p>}</div></div>)}{prediction.versions.length > 1 && <div className="version-compare-card"><h3>Compare two versions</h3><div className="version-compare-selects"><label>From<select value={compareFrom?.id ?? ""} onChange={event => setCompareFromId(event.target.value)}>{prediction.versions.map(version => <option key={version.id} value={version.id}>v{version.version_number} · {probability(version.probability)}</option>)}</select></label><label>To<select value={compareTo?.id ?? ""} onChange={event => setCompareToId(event.target.value)}>{prediction.versions.map(version => <option key={version.id} value={version.id}>v{version.version_number} · {probability(version.probability)}</option>)}</select></label></div>{compareFrom && compareTo && <><div className="version-delta"><span>Probability change</span><strong className={probabilityDelta > 0 ? "up" : probabilityDelta < 0 ? "down" : "flat"}>{probabilityDelta > 0 ? "+" : ""}{probabilityDelta} pts</strong></div><div className="version-compare-reason"><span>Recorded reason for v{compareTo.version_number}</span><p>{compareTo.change_summary || "No change summary was recorded for this version."}</p><small>Earlier rationale: {compareFrom.rationale}</small><small>Current rationale: {compareTo.rationale}</small></div></>}</div>}</section>
      <section className="side-panel reminder-panel"><div className="side-panel-title"><BellRing size={16} /><span>Resolution reminder</span></div><label className="reminder-control">Remind me<select value={reminderDays} disabled={prediction.status !== "active"} onChange={event => changeReminder(event.target.value)}><option value={0}>Off</option><option value={1}>1 day before</option><option value={3}>3 days before</option><option value={7}>7 days before</option><option value={14}>14 days before</option></select></label><p>In-app only, saved on this device. When the date is near or passes, your command center links back here to review and record the outcome. No email or push alert is sent.</p></section>
      <section className="side-panel resolution-panel"><div className="side-panel-title"><Clock3 size={16} /><span>Resolution</span></div><div className="resolution-date">{date(prediction.resolution_date)}</div>{prediction.resolution ? <><span className={`outcome-badge ${prediction.resolution.outcome}`}>{prediction.resolution.outcome}</span><p>{prediction.resolution.resolution_note}</p>{prediction.resolution.brier_score !== null && <div className="brier-mini"><span>Brier score</span><strong>{prediction.resolution.brier_score.toFixed(3)}</strong></div>}</> : <p>The outcome can be recorded when the resolution criteria are met.</p>}</section></aside></div>
    <div className="detail-mobile-quick-actions" role="group" aria-label="Forecast quick actions"><button type="button" onClick={() => { setUpdateOpen(true); window.setTimeout(() => document.querySelector(".detail-form")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion") ? "auto" : "smooth", block: "center" }), 80); }}><RefreshCw size={15} /> Update</button><button type="button" onClick={() => { setEvidenceOpen(true); window.setTimeout(() => document.getElementById("evidence-add-form")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion") ? "auto" : "smooth", block: "center" }), 80); }}><Link2 size={15} /> Evidence</button>{prediction.status === "active" && <button type="button" onClick={() => { setResolveOpen(true); window.setTimeout(() => document.querySelector(".resolve-form")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion") ? "auto" : "smooth", block: "center" }), 80); }}><Flag size={15} /> Resolve</button>}</div>
  </div>;
}
