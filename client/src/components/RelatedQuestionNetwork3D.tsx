import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import type { ForecastRecord } from "@shared/types";
import ThreeDataPlot from "@/components/ThreeDataPlot";
import { buildRelatedQuestionNetwork } from "@/lib/visualizationData";

export default function RelatedQuestionNetwork3D({ records }: { records: ForecastRecord[] }) {
  const spec = useMemo(() => buildRelatedQuestionNetwork(records), [records]);
  return <div className="related-network-workspace">
    <ThreeDataPlot spec={spec} />
    <details className="related-network-links"><summary>Open one of these saved forecasts · {records.length}</summary><div>{records.map(record => <Link key={record.id} href={`/predictions/${record.id}`}><span>{record.question}</span><ArrowUpRight size={14} /></Link>)}</div></details>
  </div>;
}
