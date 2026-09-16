import { ArrowUpRight, Compass, Layers3 } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function Categories() {
  const { user } = useSupabaseAuth();
  const categories = trpc.categories.useQuery(undefined, { enabled: Boolean(user) });
  const predictions = trpc.predictions.list.useQuery({ status: "all" }, { enabled: Boolean(user) });
  if (!user) return <div className="page-empty"><div className="empty-index">04 / topics</div><h1>Explore the<br /><em>question space.</em></h1><p>Topic counts become useful when they come from your real research record.</p><Link className="primary-button" href="/">Ask a question <ArrowUpRight size={17} /></Link></div>;
  return <div className="internal-page"><div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> Browse your question space</div><h1>Topics</h1><p>Categories are a lens, not a constraint. The lab can grow with the questions you ask.</p></div><Link href="/" className="primary-button">New forecast <ArrowUpRight size={17} /></Link></div><div className="topic-grid">{(categories.data ?? []).map(category => { const count = predictions.data?.filter(item => item.category_id === category.id).length ?? 0; const active = predictions.data?.filter(item => item.category_id === category.id && item.status === "active").length ?? 0; return <div className="topic-row" key={category.id}><span className="topic-number">{String(category.sort_order / 10).padStart(2, "0")}</span><div className="topic-main"><h2>{category.name}</h2><p>{category.description}</p></div><div className="topic-count"><strong>{count.toString().padStart(2, "0")}</strong><span>{active ? `${active} active` : "no active forecasts"}</span></div><span className="topic-arrow"><ArrowUpRight size={17} /></span></div> })}</div><div className="topic-footnote"><Compass size={17} /><span>Counts reflect only your saved records. There is no public popularity ranking in this lab.</span></div></div>;
}
