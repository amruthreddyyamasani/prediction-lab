import { useMemo } from "react";
import type { CalibrationPoint } from "@shared/calibration";
import ThreeDataPlot from "@/components/ThreeDataPlot";
import { buildCalibrationTerrain } from "@/lib/visualizationData";

export default function CalibrationTerrain3D({ points }: { points: CalibrationPoint[] }) {
  const spec = useMemo(() => buildCalibrationTerrain(points), [points]);
  return <ThreeDataPlot spec={spec} />;
}
