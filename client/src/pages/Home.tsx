import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Database, Info, LockKeyhole, Radar, Sparkles, Target, WandSparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTheme } from "@/contexts/ThemeContext";
import ObservatoryField from "@/components/ObservatoryField";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { daysUntil, loadReminders, localDateString, type ReminderMap } from "@/lib/userPreferences";

const sampleQuestions = [
  "Will AI agents complete more than 20% of software-development tasks by 2028?",
  "Will India become the world's third-largest economy before 2030?",
  "Will humans return to the Moon before December 31, 2030?",
];
const quickTemplates = [
  { label: "Policy", question: "Will the named policy be formally adopted by June 30, 2027?", criteria: "Count as yes if the responsible authority publishes or enacts the named policy by the resolution date." },
  { label: "Product", question: "Will the named product reach general availability by June 30, 2027?", criteria: "Count as yes if customers can purchase or generally access the product by the resolution date." },
  { label: "Indicator", question: "Will the named official indicator exceed its stated threshold by June 30, 2027?", criteria: "Use the first official release for the named indicator covering the specified period." },
];
const stages = ["Question", "Variables", "Evidence", "Model", "Probability", "Forecast"];
const storySteps = [
  { label: "Ask", detail: "Frame a future event as a clear, measurable question." },
  { label: "Understand", detail: "Set an outcome and a resolution date you can check." },
  { label: "Research", detail: "Review the context, evidence, catalysts, and risks." },
  { label: "Forecast", detail: "Express uncertainty as a probability, not certainty." },
  { label: "Track", detail: "Revisit your view as the forecast evolves." },
  { label: "Resolve", detail: "Record what happened against your resolution criteria." },
  { label: "Learn", detail: "Review resolved results to assess calibration." },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [resolutionCriteria, setResolutionCriteria] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [stage, setStage] = useState(0);
  const [activeSample, setActiveSample] = useState<number | null>(null);
  const [guidedTourOpen, setGuidedTourOpen] = useState(false);
  const [guidedTourStep, setGuidedTourStep] = useState(0);
  const [reminders, setReminders] = useState<ReminderMap>({});
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const categories = trpc.categories.useQuery(undefined, { enabled: Boolean(user) });
  const history = trpc.predictions.list.useQuery({ status: "all" }, { enabled: Boolean(user) });
  const analytics = trpc.analytics.useQuery(undefined, { enabled: Boolean(user) });
  const generate = trpc.predictions.generate.useMutation({ onSuccess: data => navigate(`/predictions/${data.id}`) });

  useEffect(() => {
    if (!user) return;
    setReminders(loadReminders(user.id));
    try { setOnboardingDismissed(window.localStorage.getItem(`prediction-lab:onboarding:${user.id}`) === "done"); } catch { setOnboardingDismissed(false); }
  }, [user?.id]);

  useEffect(() => {
    if (!generate.isPending) return;
    setStage(0);
    const interval = window.setInterval(() => setStage(current => Math.min(current + 1, stages.length - 1)), 720);
    return () => window.clearInterval(interval);
  }, [generate.isPending]);

  const activeCount = history.data?.filter(item => item.status === "active").length ?? 0;
  const resolvedCount = history.data?.filter(item => item.status === "resolved").length ?? 0;
  const forecastable = question.trim().length >= 10;
  const selectedDateDays = resolutionDate ? daysUntil(resolutionDate) : null;
  const invalidResolutionDate = Boolean(resolutionDate && (selectedDateDays === null || selectedDateDays < 0));
  const topicRows = (categories.data ?? []).slice(0, 6).map(category => ({
    ...category,
    count: history.data?.filter(item => item.category_id === category.id).length ?? 0,
  }));
  const priorityRecords = (history.data ?? []).filter(item => item.status === "active").map(item => {
    const remaining = daysUntil(item.resolution_date);
    const staleDays = Math.floor((Date.now() - new Date(item.updated_at).getTime()) / 86_400_000);
    const reminderDays = reminders[item.id];
    const reminderDue = reminderDays !== undefined && remaining !== null && remaining <= reminderDays;
    if (remaining === null || (remaining > 7 && staleDays < 30 && !reminderDue)) return null;
    const priority = remaining < 0 ? 0 : remaining <= 7 ? 1 : reminderDue ? 2 : 3;
    return { item, remaining, staleDays, reminderDue, priority };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.priority - b.priority || (a.remaining ?? 0) - (b.remaining ?? 0))
    .slice(0, 5);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"));
      return;
    }
    if (!forecastable || invalidResolutionDate || (resolutionCriteria && resolutionCriteria.trim().length < 5)) return;
    generate.mutate({ question: question.trim(), categorySlug: category || undefined, resolutionCriteria: resolutionCriteria.trim() || undefined, resolutionDate: resolutionDate || undefined });
  }

  function followPointer(event: React.PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
  }

  function applySample(sample: string, index: number) {
    setQuestion(sample);
    setActiveSample(index);
    questionInputRef.current?.focus({ preventScroll: true });
    window.setTimeout(() => setActiveSample(current => current === index ? null : current), 900);
  }

  function applyTemplate(template: typeof quickTemplates[number]) {
    setQuestion(template.question);
    setResolutionCriteria(template.criteria);
    questionInputRef.current?.focus({ preventScroll: true });
  }

  function dismissOnboarding() {
    setOnboardingDismissed(true);
    if (user) {
      try { window.localStorage.setItem(`prediction-lab:onboarding:${user.id}`, "done"); } catch { /* onboarding can still be dismissed in memory */ }
    }
  }

  function openGuidedTour() {
    setGuidedTourStep(0);
    setGuidedTourOpen(true);
  }

  function finishTourAndFocusQuestion() {
    setGuidedTourOpen(false);
    window.setTimeout(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("user-reduced-motion");
      document.getElementById("ask-form")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      questionInputRef.current?.focus({ preventScroll: true });
    }, 180);
  }

  return <div className={`home-page observatory-page ${user ? "authenticated-home" : "public-home"}`}>
    <section className="hero-grid hero-observatory" data-home-section="ask" id="ask" onPointerMove={followPointer}>
      <div className="hero-copy depth-copy">
        <div className="eyebrow"><span className="eyebrow-line"></span> Forecasting workspace <span className="mono">01 / 06</span></div>
        <h1>Turn a question<br /><em>into a forecast.</em></h1>
        <p className="hero-lede">Frame a future event, set a probability, and keep the reasoning with the question until it resolves.</p>
        <div className="trust-line"><span><Radar size={14} /> evidence-linked</span><span><Target size={14} /> resolution criteria</span><span><Database size={14} /> private ledger</span></div>
        {!user && <button type="button" className="guided-tour-launch" onClick={openGuidedTour}><Sparkles size={15} /><span>Explore a guided sample</span><ArrowUpRight size={14} /></button>}
        <a className="scroll-cue" href="#ask"><span className="scroll-cue-line" /><span>See how it works</span><ArrowDown size={14} /></a>
      </div>
      <div className="hero-field-wrap"><ObservatoryField /><div className="field-caption"><span>Interactive probability field</span><span className="mono">hover / observe / question</span></div></div>
    </section>

    <section className="ask-section cinematic-section" id="ask-form">
      <div className="section-kicker"><span>01</span><span className="kicker-rule"></span><span>Define the question</span><span className="section-coordinate mono">N 18° 42' · E 73° 51'</span></div>
      <div className="ask-heading"><div><h2>What are you<br /><span>forecasting?</span></h2></div><p>State a specific future event with a clear resolution date and outcome.</p></div>
      <div className="console-label-row"><span>Forecast question</span><span className="mono">STATUS: READY</span></div>
      <form className={`question-instrument spatial-console ${generate.isPending ? "is-working" : ""} ${activeSample !== null ? "is-seeded" : ""}`} onSubmit={submit} onPointerMove={followPointer}>
        <div className="console-glow" />
        <div className="question-top"><span className="instrument-label">Forecast question</span><span className="instrument-count mono">{question.length.toString().padStart(3, "0")} / 1000</span></div>
        <textarea ref={questionInputRef} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Will AI agents replace more software development jobs by 2030?" rows={4} disabled={generate.isPending} aria-label="Forecast question" />
        <div className="guided-resolution-fields">
          <label><span>Resolution criteria <small>optional override</small></span><textarea value={resolutionCriteria} onChange={event => setResolutionCriteria(event.target.value)} placeholder="What observable event counts as yes? Leave blank to use the model suggestion." rows={2} maxLength={1000} disabled={generate.isPending} /></label>
          <label><span>Resolution date <small>optional override</small></span><input type="date" min={localDateString()} value={resolutionDate} onChange={event => setResolutionDate(event.target.value)} disabled={generate.isPending} /></label>
        </div>
        <div className="console-divider"><span /> <span className="mono">QUESTION → OUTCOME</span> <span /></div>
        <div className="instrument-bottom"><label className="category-select"><span>Optional lens</span><select value={category} onChange={event => setCategory(event.target.value)} disabled={!user || generate.isPending}><option value="">Auto-categorize</option>{(categories.data ?? []).map(item => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select><ChevronDown size={15} /></label><button type="submit" className="primary-button magnetic-button" onPointerMove={followPointer} disabled={generate.isPending || Boolean(user && (!forecastable || invalidResolutionDate || (resolutionCriteria.trim().length > 0 && resolutionCriteria.trim().length < 5)))} aria-busy={generate.isPending}>{generate.isPending ? <><span className="button-pulse"></span> Generating forecast…</> : <>{user ? "Generate forecast" : "Sign in to save"}<ArrowUpRight size={17} /></>}</button></div>{user && !forecastable && <div className="console-hint">Use at least 10 characters for the question.</div>}{invalidResolutionDate && <div className="inline-error" role="alert">Choose a valid resolution date today or later.</div>}{resolutionCriteria.trim().length > 0 && resolutionCriteria.trim().length < 5 && <div className="console-hint">Add at least five characters to custom criteria.</div>}{generate.error && <div className="inline-error"><Info size={15} /> {generate.error.message.includes("Supabase") ? "Your database session is unavailable. Sign in again and retry." : generate.error.message}</div>}
      </form>
      <div className="sample-row"><span className="sample-label">Sample prompts</span>{sampleQuestions.map((sample, index) => <button key={sample} className={`sample-question ${activeSample === index ? "is-selected" : ""}`} onClick={() => applySample(sample, index)}><span>0{index + 1}</span>{sample}</button>)}</div>
      <div className="quick-template-row"><span className="sample-label">Quick-start templates · edit the placeholders before forecasting</span><div>{quickTemplates.map(template => <button type="button" key={template.label} onClick={() => applyTemplate(template)}>{template.label}<ArrowUpRight size={13} /></button>)}</div></div>
    </section>

    {generate.isPending && <section className="processing-panel cinematic-section"><div className="processing-head"><div><div className="eyebrow"><span className="eyebrow-line"></span> Generating forecast</div><h3>Building the forecast from the question and available evidence.</h3></div><span className="mono processing-time">live / {String(stage + 1).padStart(2, "0")}</span></div><div className="forecast-progress" role="progressbar" aria-label="Forecast generation progress" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={stage + 1}><span style={{ width: `${((stage + 1) / stages.length) * 100}%` }} /></div><div className="stage-list cinematic-stages">{stages.map((item, index) => <div className={`stage-row ${index < stage ? "done" : ""} ${index === stage ? "current" : ""}`} key={item}><span className="stage-index">{index < stage ? <Check size={13} /> : `0${index + 1}`}</span><span>{item}</span><span className="stage-state">{index < stage ? "complete" : index === stage ? "in progress" : "queued"}</span></div>)}</div><p className="processing-note"><Sparkles size={14} /> A forecast is a probability, not a statement of certainty.</p></section>}

    <section className="command-center cinematic-section" aria-labelledby="command-center-title">
      <div className="command-center-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> Personal workspace</div><h2 id="command-center-title">Forecast command center</h2><p>Priority is based on your saved resolution dates and last-update timestamps.</p></div>{user && <Link className="text-link" href="/library">Full ledger <ArrowUpRight size={15} /></Link>}</div>
      {user && !onboardingDismissed && <div className="onboarding-card"><div><span className="mono">QUICK START · 01 / 03</span><h3>Build a forecast you can learn from.</h3><p>A clear question, a resolvable finish line, and a later outcome make the record useful.</p><div className="onboarding-steps"><span className={history.data?.length ? "done" : ""}>1 · Create a question</span><span>{history.data?.some(item => item.versions.length > 1) ? "✓ " : "2 · "}Review an update</span><span className={resolvedCount ? "done" : ""}>3 · Resolve and calibrate</span></div></div><div><a className="secondary-button" href="#ask-form">Start a forecast <ArrowUpRight size={14} /></a><button type="button" className="text-button" onClick={dismissOnboarding}>Dismiss</button></div></div>}
      {!user ? <div className="command-center-empty"><p>Sign in to see forecasts that are due, stale, or waiting for an outcome.</p><button className="text-link" onClick={() => window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"))}>Open sign in <ArrowUpRight size={14} /></button></div> : history.isLoading ? <div className="loading-list" role="status">Loading your priority forecasts…</div> : history.error ? <div className="command-center-empty" role="alert"><p>Your forecast record could not be loaded.</p><button className="text-link" onClick={() => history.refetch()}>Retry <ArrowUpRight size={14} /></button></div> : priorityRecords.length ? <div className="command-center-list">{priorityRecords.map(({ item, remaining, staleDays, reminderDue }) => <Link key={item.id} href={`/predictions/${item.id}`} className="command-center-row"><span className={`priority-indicator ${remaining !== null && remaining < 0 ? "overdue" : remaining !== null && remaining <= 7 ? "soon" : "stale"}`} /><span className="priority-copy"><strong>{item.question}</strong><small>{remaining !== null && remaining < 0 ? `${Math.abs(remaining)} days overdue · awaiting outcome` : remaining !== null && remaining <= 7 ? `Resolves in ${remaining} ${remaining === 1 ? "day" : "days"}` : `No update for ${staleDays} days`}{reminderDue ? " · reminder due" : ""}</small></span><span className="priority-action">{remaining !== null && remaining <= 0 ? "Record outcome" : "Review"}<ArrowUpRight size={14} /></span></Link>)}</div> : <div className="command-center-empty"><p>No urgent reviews right now. Active forecasts due within seven days or not updated for 30 days will appear here.</p><a className="text-link" href="#ask-form">Create a forecast <ArrowUpRight size={14} /></a></div>}
    </section>

    <section className="lab-state-section cinematic-section" data-home-section="ledger" id="ledger"><div className="section-kicker"><span>02</span><span className="kicker-rule"></span><span>Your forecast record</span><span className="section-coordinate mono">ARCHIVE / PRIVATE</span></div>{user ? <div className="record-overview archive-panel"><div className="record-title"><h2>Your forecasts</h2><p>Counts below come from your saved forecasts.</p></div><div className="record-stats"><div><strong>{activeCount.toString().padStart(2, "0")}</strong><span>active forecasts</span></div><div><strong>{resolvedCount.toString().padStart(2, "0")}</strong><span>resolved</span></div><div><strong>{history.data?.length.toString().padStart(2, "0") ?? "00"}</strong><span>total questions</span></div></div>{history.data?.length ? <div className="home-ledger-preview"><div className="home-ledger-rows">{history.data.slice(0, 4).map((row, index) => <Link key={row.id} href={`/predictions/${row.id}`} className="home-ledger-row"><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{row.question}</strong><span>{row.latest ? `${Math.round(row.latest.probability * 100)}%` : "—"}</span><span className={`status-mark ${row.status}`}>{row.status}</span><ArrowUpRight size={14} /></Link>)}</div><Link className="text-link" href="/library">Open the forecast ledger <ArrowUpRight size={15} /></Link></div> : <div className="first-record"><WandSparkles size={18} /><span>No forecasts yet. Ask a question above to create one.</span></div>}</div> : <div className="guest-state archive-panel"><div className="guest-icon"><LockKeyhole size={20} /></div><div><h3>Your forecasts are private.</h3><p>You can explore without an account. Sign in when you want to save and review forecasts.</p></div><button className="text-link" onClick={() => window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"))}>Create account <ArrowUpRight size={15} /></button></div>}</section>

    <section className="method-strip cinematic-section" data-home-section="calibration" id="calibration">
      <div className="method-label">Calibration</div>
      <div className="scroll-destination">
        <div><span className="eyebrow"><span className="eyebrow-line"></span> Your forecast record</span><h2>Measure how your probabilities hold up.</h2><p>Calibration uses resolved forecasts only. Nothing is filled in when there is no real outcome.</p></div>
        <div className="calibration-snapshot">
          <div><span>Resolved</span><strong>{user ? analytics.data?.resolvedCount ?? 0 : "—"}</strong></div>
          <div><span>Brier score</span><strong>{user && analytics.data?.brierScore != null ? analytics.data.brierScore.toFixed(3) : "—"}</strong></div>
          <div><span>Accuracy</span><strong>{user && analytics.data?.accuracy != null ? `${Math.round(analytics.data.accuracy * 100)}%` : "—"}</strong></div>
        </div>
        <Link className="text-link" href="/analytics">Open calibration <ArrowUpRight size={15} /></Link>
      </div>
    </section>

    <section className="scroll-section topic-scroll-section cinematic-section" data-home-section="topics" id="topics">
      <div className="section-kicker"><span>04</span><span className="kicker-rule"></span><span>Explore topics</span><span className="section-coordinate mono">YOUR RECORD / ONLY</span></div>
      <div className="scroll-destination topic-destination">
        <div className="scroll-section-heading"><div><h2>Where are you forecasting?</h2><p>Browse the categories already available in the product and see where your saved questions sit.</p></div><Link className="text-link" href="/categories">Open topics <ArrowUpRight size={15} /></Link></div>
        <div className="topic-preview">
          {user ? topicRows.map((topic, index) => <div className="topic-preview-row" key={topic.id}><span className="mono">{String(index + 1).padStart(2, "0")}</span><strong>{topic.name}</strong><span>{topic.count} saved</span></div>) : <div className="scroll-empty">Sign in to see counts from your saved forecasts.</div>}
        </div>
      </div>
    </section>

    <section className="scroll-section settings-scroll-section cinematic-section" data-home-section="settings" id="settings">
      <div className="section-kicker"><span>05</span><span className="kicker-rule"></span><span>Settings</span><span className="section-coordinate mono">ACCOUNT / DISPLAY</span></div>
      <div className="scroll-destination settings-destination">
        <div><span className="eyebrow"><span className="eyebrow-line"></span> Interface</span><h2>Keep the workspace in your preferred theme.</h2><p>{user ? "Theme, contrast, and motion preferences are stored locally on this device." : "Theme, contrast, and motion preferences are available without an account."}</p></div>
        <div className="theme-preview"><span className="mono">CURRENT THEME</span><strong>{theme === "dark" ? "Dark" : "Cream"}</strong><button className="secondary-button" onClick={toggleTheme}>{theme === "dark" ? "Use cream theme" : "Use dark theme"}</button><Link className="text-link" href="/settings">Open settings <ArrowUpRight size={15} /></Link></div>
      </div>
    </section>

    <section className="method-strip story-strip cinematic-section" aria-label="Forecast lifecycle">
      <div className="method-label"><span>Forecast lifecycle</span><small className="story-scroll-cue mono">Scroll / swipe →</small></div>
      <div className="forecast-story-rail" role="list" aria-label="Seven steps in the forecasting workflow" tabIndex={0}>
        {storySteps.map((item, index) => <article className="forecast-story-card" key={item.label} role="listitem">
          <div className="story-step-meta"><span className="story-step-number">{String(index + 1).padStart(2, "0")}</span><span className="story-step-path" /><ArrowRight size={13} aria-hidden="true" /></div>
          <h3>{item.label}</h3><p>{item.detail}</p>
        </article>)}
      </div>
    </section>

    <Dialog open={guidedTourOpen} onOpenChange={setGuidedTourOpen}>
      <DialogContent className="guided-tour-dialog">
        <div className="guided-tour-topline"><span className="mono">SAMPLE FORECAST / WALKTHROUGH</span><span className="tour-demo-badge">DEMO · NOT SAVED</span></div>
        <div className="guided-tour-progress" aria-label={`Step ${guidedTourStep + 1} of 3`}>{[0, 1, 2].map(step => <span key={step} className={step <= guidedTourStep ? "complete" : ""} />)}</div>
        <div className="guided-tour-content" key={guidedTourStep}>
          <span className="guided-tour-step mono">STEP 0{guidedTourStep + 1} / 03</span>
          {guidedTourStep === 0 ? <>
            <DialogTitle>Start with a clear finish line.</DialogTitle>
            <DialogDescription>A useful forecast has a specific outcome and a date when you can check what happened.</DialogDescription>
            <div className="tour-question-card"><span className="mono">FICTIONAL EXAMPLE · RESOLVES JUN 30, 2027</span><strong>Will the fictional city of Northstar open three public charging hubs by June 30, 2027?</strong><div><span>Clear yes/no outcome</span><span>Fixed resolution date</span></div></div>
            <p className="tour-footnote"><Info size={14} /> Northstar is fictional. This question is used only to demonstrate the workflow.</p>
          </> : guidedTourStep === 1 ? <>
            <DialogTitle>A probability is not a promise.</DialogTitle>
            <DialogDescription>The demo estimate below is illustrative only—not an AI-generated or real-world forecast.</DialogDescription>
            <div className="tour-estimate-card"><div className="tour-probability-ring"><span>64<small>%</small></span></div><div><span className="mono">ILLUSTRATIVE PROBABILITY</span><strong>More likely than not</strong><p>In this fictional scenario, two hubs are funded and a third contract is still pending.</p></div></div>
            <div className="tour-uncertainty"><span>Estimate</span><span className="tour-uncertainty-line"><i /></span><span>Uncertainty remains</span></div>
          </> : <>
            <DialogTitle>Keep the reasoning as events change.</DialogTitle>
            <DialogDescription>A real forecast keeps its evidence, updates, and eventual outcome together. This tour stays local and does not create a record.</DialogDescription>
            <div className="tour-timeline"><div><span className="tour-timeline-dot current" /><span className="mono">TODAY</span><strong>Start at 64%</strong><small>Three hubs are the resolution target.</small></div><div><span className="tour-timeline-dot" /><span className="mono">NEW EVIDENCE</span><strong>Update the estimate</strong><small>A signed contract could change the probability.</small></div><div><span className="tour-timeline-dot" /><span className="mono">RESOLUTION</span><strong>Compare with the outcome</strong><small>Calibration uses real resolved forecasts only.</small></div></div>
            <p className="tour-footnote"><LockKeyhole size={14} /> No account, AI request, or saved forecast is created by this walkthrough.</p>
          </>}
        </div>
        <div className="guided-tour-actions">
          <button type="button" className="tour-back" onClick={() => setGuidedTourStep(step => Math.max(0, step - 1))} disabled={guidedTourStep === 0}><ArrowLeft size={15} /> Back</button>
          <span className="mono">{String(guidedTourStep + 1).padStart(2, "0")} / 03</span>
          {guidedTourStep < 2 ? <button type="button" className="primary-button" onClick={() => setGuidedTourStep(step => Math.min(2, step + 1))}>Continue <ArrowRight size={16} /></button> : <button type="button" className="primary-button" onClick={finishTourAndFocusQuestion}>Try my own question <ArrowUpRight size={16} /></button>}
        </div>
      </DialogContent>
    </Dialog>
  </div>;
}
