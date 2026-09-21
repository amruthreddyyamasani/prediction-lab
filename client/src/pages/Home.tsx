import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Check, ChevronDown, Database, Info, LockKeyhole, Radar, Sparkles, Target, WandSparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import ObservatoryField from "@/components/ObservatoryField";

const sampleQuestions = [
  "Will AI agents complete more than 20% of software-development tasks by 2028?",
  "Will India become the world's third-largest economy before 2030?",
  "Will humans return to the Moon before December 31, 2030?",
];
const stages = ["Question", "Variables", "Evidence", "Model", "Probability", "Forecast"];

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useSupabaseAuth();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState(0);
  const categories = trpc.categories.useQuery(undefined, { enabled: Boolean(user) });
  const history = trpc.predictions.list.useQuery({ status: "all" }, { enabled: Boolean(user) });
  const generate = trpc.predictions.generate.useMutation({ onSuccess: data => navigate(`/predictions/${data.id}`) });

  useEffect(() => {
    if (!generate.isPending) return;
    setStage(0);
    const interval = window.setInterval(() => setStage(current => Math.min(current + 1, stages.length - 1)), 720);
    return () => window.clearInterval(interval);
  }, [generate.isPending]);

  const activeCount = history.data?.filter(item => item.status === "active").length ?? 0;
  const resolvedCount = history.data?.filter(item => item.status === "resolved").length ?? 0;
  const forecastable = question.trim().length >= 10;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"));
      return;
    }
    if (!forecastable) return;
    generate.mutate({ question: question.trim(), categorySlug: category || undefined });
  }

  return <div className={`home-page observatory-page ${user ? "authenticated-home" : "public-home"}`}>
    <section className="hero-grid hero-observatory">
      <div className="hero-copy depth-copy">
        <div className="eyebrow"><span className="eyebrow-line"></span> Forecasting workspace <span className="mono">01 / 06</span></div>
        <h1>Turn a question<br /><em>into a forecast.</em></h1>
        <p className="hero-lede">Frame a future event, set a probability, and keep the reasoning with the question until it resolves.</p>
        <div className="trust-line"><span><Radar size={14} /> evidence-linked</span><span><Target size={14} /> resolution criteria</span><span><Database size={14} /> private ledger</span></div>
        <a className="scroll-cue" href="#ask"><span className="scroll-cue-line" /><span>See how it works</span><ArrowDown size={14} /></a>
      </div>
      <div className="hero-field-wrap"><ObservatoryField /><div className="field-caption"><span>Interactive probability field</span><span className="mono">hover / observe / question</span></div></div>
    </section>

    <section className="ask-section cinematic-section" id="ask">
      <div className="section-kicker"><span>01</span><span className="kicker-rule"></span><span>Define the question</span><span className="section-coordinate mono">N 18° 42' · E 73° 51'</span></div>
      <div className="ask-heading"><div><h2>What are you<br /><span>forecasting?</span></h2></div><p>State a specific future event with a clear resolution date and outcome.</p></div>
      <div className="console-label-row"><span>Forecast question</span><span className="mono">STATUS: READY</span></div>
      <form className={`question-instrument spatial-console ${generate.isPending ? "is-working" : ""}`} onSubmit={submit}>
        <div className="console-glow" />
        <div className="question-top"><span className="instrument-label">Forecast question</span><span className="instrument-count mono">{question.length.toString().padStart(3, "0")} / 1000</span></div>
        <textarea value={question} onChange={event => setQuestion(event.target.value)} placeholder="Will AI agents replace more software development jobs by 2030?" rows={4} disabled={generate.isPending} aria-label="Forecast question" />
        <div className="console-divider"><span /> <span className="mono">QUESTION → OUTCOME</span> <span /></div>
        <div className="instrument-bottom"><label className="category-select"><span>Optional lens</span><select value={category} onChange={event => setCategory(event.target.value)} disabled={!user || generate.isPending}><option value="">Auto-categorize</option>{(categories.data ?? []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><ChevronDown size={15} /></label><button type="submit" className="primary-button magnetic-button" disabled={generate.isPending || Boolean(user && !forecastable)} aria-busy={generate.isPending}>{generate.isPending ? <><span className="button-pulse"></span> Generating forecast…</> : <>{user ? "Generate forecast" : "Sign in to save"}<ArrowUpRight size={17} /></>}</button></div>{user && !forecastable && <div className="console-hint">Use at least 10 characters for the question.</div>}{generate.error && <div className="inline-error"><Info size={15} /> {generate.error.message.includes("Supabase") ? "Your database session is unavailable. Sign in again and retry." : generate.error.message}</div>}
      </form>
      <div className="sample-row"><span className="sample-label">Open a live question</span>{sampleQuestions.map((sample, index) => <button key={sample} className="sample-question" onClick={() => setQuestion(sample)}><span>0{index + 1}</span>{sample}</button>)}</div>
    </section>

    {generate.isPending && <section className="processing-panel cinematic-section"><div className="processing-head"><div><div className="eyebrow"><span className="eyebrow-line"></span> Generating forecast</div><h3>Building the forecast from the question and available evidence.</h3></div><span className="mono processing-time">live / {String(stage + 1).padStart(2, "0")}</span></div><div className="stage-list cinematic-stages">{stages.map((item, index) => <div className={`stage-row ${index < stage ? "done" : ""} ${index === stage ? "current" : ""}`} key={item}><span className="stage-index">{index < stage ? <Check size={13} /> : `0${index + 1}`}</span><span>{item}</span><span className="stage-state">{index < stage ? "complete" : index === stage ? "in progress" : "queued"}</span></div>)}</div><p className="processing-note"><Sparkles size={14} /> A forecast is a probability, not a statement of certainty.</p></section>}

    <section className="lab-state-section cinematic-section"><div className="section-kicker"><span>02</span><span className="kicker-rule"></span><span>Your forecast record</span><span className="section-coordinate mono">ARCHIVE / PRIVATE</span></div>{user ? <div className="record-overview archive-panel"><div className="record-title"><h2>Your forecasts</h2><p>Counts below come from your saved forecasts.</p></div><div className="record-stats"><div><strong>{activeCount.toString().padStart(2, "0")}</strong><span>active forecasts</span></div><div><strong>{resolvedCount.toString().padStart(2, "0")}</strong><span>resolved</span></div><div><strong>{history.data?.length.toString().padStart(2, "0") ?? "00"}</strong><span>total questions</span></div></div>{history.data?.length ? <Link className="text-link" href="/library">Open the forecast ledger <ArrowUpRight size={15} /></Link> : <div className="first-record"><WandSparkles size={18} /><span>No forecasts yet. Ask a question above to create one.</span></div>}</div> : <div className="guest-state archive-panel"><div className="guest-icon"><LockKeyhole size={20} /></div><div><h3>Your forecasts are private.</h3><p>You can explore without an account. Sign in when you want to save and review forecasts.</p></div><button className="text-link" onClick={() => window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"))}>Create account <ArrowUpRight size={15} /></button></div>}</section>

    <section className="method-strip cinematic-section"><div className="method-label">Forecast lifecycle</div><div className="method-steps">{["Ask", "Understand", "Research", "Forecast", "Track", "Resolve", "Learn"].map((item, index) => <span key={item}><b>{String(index + 1).padStart(2, "0")}</b>{item}{index < 6 && <i>→</i>}</span>)}</div></section>
  </div>;
}
