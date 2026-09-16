import { ArrowUpRight, CalendarDays, ChevronRight, Filter, Search } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

const filters = ["all", "active", "resolved", "expired", "cancelled"];
function formatDate(value: string) { return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }

export default function Library() {
  const { user } = useSupabaseAuth();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const query = trpc.predictions.list.useQuery({ status: filter }, { enabled: Boolean(user) });
  const rows = (query.data ?? []).filter(item => item.question.toLowerCase().includes(search.toLowerCase()));
  if (!user) return <div className="page-empty"><div className="empty-index">02 / ledger</div><h1>Nothing saved<br /><em>yet.</em></h1><p>Sign in to make this a private, durable record of your forecasts.</p><Link className="primary-button" href="/">Ask the future <ArrowUpRight size={17} /></Link></div>;
  return <div className="internal-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> Personal research record</div><h1>Forecast ledger</h1><p>Every question stays linked to its original probability, later revisions, and final outcome.</p></div><Link href="/" className="primary-button">New forecast <ArrowUpRight size={17} /></Link></div><div className="ledger-toolbar"><div className="filter-tabs">{filters.map(item => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="search-field"><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search questions" /></label></div>{query.isLoading ? <div className="loading-list">Loading your research record…</div> : rows.length === 0 ? <div className="empty-ledger"><Filter size={20} /><h3>{search || filter !== "all" ? "No forecasts match this view." : "The ledger is empty."}</h3><p>{search || filter !== "all" ? "Try another filter or search term." : "Ask a question about the future to create the first entry."}</p><Link className="text-link" href="/">Make a forecast <ArrowUpRight size={15} /></Link></div> : <div className="ledger-table"><div className="ledger-header"><span>Question</span><span>Probability</span><span>Horizon</span><span>Status</span><span></span></div>{rows.map(row => <Link href={`/predictions/${row.id}`} className="ledger-row" key={row.id}><div className="question-cell"><span className="row-number">{String(rows.indexOf(row) + 1).padStart(2, "0")}</span><div><strong>{row.question}</strong><span>{row.category?.name ?? "Uncategorized"} · opened {formatDate(row.created_at)}</span></div></div><div className="probability-cell">{row.latest ? `${Math.round(row.latest.probability * 100)}%` : "—"}<small>{row.latest?.label ?? "pending"}</small></div><div className="horizon-cell"><CalendarDays size={14} />{formatDate(row.resolution_date)}</div><div><span className={`status-mark ${row.status}`}>{row.status}</span></div><ChevronRight className="row-chevron" size={18} /></Link>)}</div>}</div>;
}
