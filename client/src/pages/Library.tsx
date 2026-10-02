import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, ChevronRight, Filter, Search, BookmarkPlus, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import RelatedQuestionNetwork3D from "@/components/RelatedQuestionNetwork3D";
import { loadSavedLibraryViews, saveSavedLibraryViews, type SavedLibraryView } from "@/lib/userPreferences";

const filters = ["all", "active", "resolved", "expired", "cancelled"];
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

export default function Library() {
  const { user } = useSupabaseAuth();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [view, setView] = useState<"list" | "network">("list");
  const [savedViews, setSavedViews] = useState<SavedLibraryView[]>([]);
  const [selectedViewId, setSelectedViewId] = useState("");
  const [newViewName, setNewViewName] = useState("");
  const query = trpc.predictions.list.useQuery({ status: "all" }, { enabled: Boolean(user) });
  const categories = trpc.categories.useQuery(undefined, { enabled: Boolean(user) });

  useEffect(() => {
    if (!user) { setSavedViews([]); return; }
    setSavedViews(loadSavedLibraryViews(user.id));
  }, [user?.id]);

  const rows = (query.data ?? []).filter(item =>
    (filter === "all" || item.status === filter) &&
    (!categoryId || item.category_id === categoryId) &&
    (!fromDate || item.created_at.slice(0, 10) >= fromDate) &&
    (!throughDate || item.created_at.slice(0, 10) <= throughDate) &&
    item.question.toLowerCase().includes(search.trim().toLowerCase())
  );

  function saveCurrentView() {
    if (!user) return;
    const name = newViewName.trim() || `View ${savedViews.length + 1}`;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
    const next = [...savedViews.filter(item => item.name.toLowerCase() !== name.toLowerCase()), { id, name: name.slice(0, 40), status: filter, categoryId, fromDate, throughDate, search, mode: view }].slice(0, 20);
    setSavedViews(next);
    saveSavedLibraryViews(user.id, next);
    setSelectedViewId(id);
    setNewViewName("");
  }

  function applySavedView(id: string) {
    const saved = savedViews.find(item => item.id === id);
    if (!saved) return;
    setSelectedViewId(id);
    setFilter(saved.status);
    setCategoryId(saved.categoryId);
    setFromDate(saved.fromDate);
    setThroughDate(saved.throughDate);
    setSearch(saved.search);
    setView(saved.mode);
  }

  function deleteSavedView() {
    if (!user || !selectedViewId) return;
    const next = savedViews.filter(item => item.id !== selectedViewId);
    setSavedViews(next);
    saveSavedLibraryViews(user.id, next);
    setSelectedViewId("");
  }

  if (!user) return <div className="page-empty"><div className="empty-index">02 / ledger</div><h1>Nothing saved<br /><em>yet.</em></h1><p>Sign in to make this a private, durable record of your forecasts.</p><Link className="primary-button" href="/">Ask the future <ArrowUpRight size={17} /></Link></div>;

  return <div className="internal-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> Saved forecasts</div><h1>Forecast ledger</h1><p>Each forecast keeps its versions, evidence, and outcome in one record.</p></div><Link href="/" className="primary-button">New forecast <ArrowUpRight size={17} /></Link></div>
    <div className="ledger-toolbar">
      <div className="filter-tabs" role="group" aria-label="Filter forecasts by status">{filters.map(item => <button type="button" key={item} className={filter === item ? "selected" : ""} aria-pressed={filter === item} onClick={() => { setFilter(item); setSelectedViewId(""); }}>{item}</button>)}</div>
      <label className="search-field"><Search size={15} /><input value={search} onChange={event => { setSearch(event.target.value); setSelectedViewId(""); }} placeholder="Search questions" aria-label="Search saved forecast questions" /></label>
    </div>
    <div className="library-filter-panel" aria-label="Additional saved forecast filters">
      <label><span>Category</span><select value={categoryId} onChange={event => { setCategoryId(event.target.value); setSelectedViewId(""); }}><option value="">All categories</option>{(categories.data ?? []).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label><span>Created from</span><input type="date" value={fromDate} max={throughDate || undefined} onChange={event => { setFromDate(event.target.value); setSelectedViewId(""); }} /></label>
      <label><span>Created through</span><input type="date" value={throughDate} min={fromDate || undefined} onChange={event => { setThroughDate(event.target.value); setSelectedViewId(""); }} /></label>
      <div className="saved-view-controls"><label><span>Saved views · this device</span><select value={selectedViewId} onChange={event => applySavedView(event.target.value)}><option value="">Choose a saved view</option>{savedViews.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><input aria-label="Name for saved view" value={newViewName} onChange={event => setNewViewName(event.target.value)} placeholder="Name this view" maxLength={40} /><button type="button" className="secondary-button" onClick={saveCurrentView} disabled={savedViews.length >= 20 && !selectedViewId}><BookmarkPlus size={14} /> Save</button>{selectedViewId && <button type="button" className="icon-button" onClick={deleteSavedView} aria-label="Delete selected saved view"><Trash2 size={14} /></button>}</div>
    </div>
    <p className="saved-view-note">Saved views are private to this browser and account; they are not synced across devices.</p>
    {!query.isLoading && !query.error && rows.length > 0 && <div className="library-view-tabs" role="group" aria-label="Forecast ledger view">
      <button type="button" className={view === "list" ? "active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>List</button>
      <button type="button" className={view === "network" ? "active" : ""} aria-pressed={view === "network"} onClick={() => setView("network")}>Related-question network · 3D</button>
    </div>}
    {query.isLoading ? <div className="loading-list" role="status">Loading your private forecasts…</div> : query.error ? <div className="empty-ledger" role="alert"><Filter size={20} /><h3>Your forecasts could not be loaded.</h3><p>Your records are unchanged. Check your session or retry.</p><button type="button" className="text-link" onClick={() => query.refetch()}>Retry <ArrowUpRight size={15} /></button></div> : rows.length === 0 ? <div className="empty-ledger"><Filter size={20} /><h3>{search || filter !== "all" || categoryId || fromDate || throughDate ? "No forecasts match this view." : "No forecasts yet."}</h3><p>{search || filter !== "all" || categoryId || fromDate || throughDate ? "Try changing a filter, date, or search term." : "Ask a question to create the first forecast."}</p><Link className="text-link" href="/">New forecast <ArrowUpRight size={15} /></Link></div> : view === "network" ? <RelatedQuestionNetwork3D records={rows} /> : (
      <div className="ledger-table"><div className="ledger-header"><span>Question</span><span>Probability</span><span>Horizon</span><span>Status</span><span></span></div>{rows.map((row, index) => <Link href={`/predictions/${row.id}`} className="ledger-row" key={row.id}><div className="question-cell"><span className="row-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{row.question}</strong><span>{row.category?.name ?? "Uncategorized"} · opened {formatDate(row.created_at)}</span></div></div><div className="probability-cell">{row.latest ? `${Math.round(row.latest.probability * 100)}%` : "—"}<small>{row.latest?.label ?? "pending"}</small></div><div className="horizon-cell"><CalendarDays size={14} />{formatDate(row.resolution_date)}</div><div><span className={`status-mark ${row.status}`}>{row.status}</span></div><ChevronRight className="row-chevron" size={18} /></Link>)}</div>
    )}
  </div>;
}
