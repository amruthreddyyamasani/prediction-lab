export type BinaryOutcome = "yes" | "no";

export const CALIBRATION_BINS = [
  { label: "0–38%", lower: 0, upper: 0.375, center: 0.25 },
  { label: "38–63%", lower: 0.375, upper: 0.625, center: 0.5 },
  { label: "63–88%", lower: 0.625, upper: 0.875, center: 0.75 },
  { label: "88–100%", lower: 0.875, upper: 1.001, center: 0.9375 },
] as const;

export type CalibrationRecord = {
  probability: number;
  outcome: BinaryOutcome;
};

export type CalibrationPoint = {
  bucket: string;
  lower: number;
  upper: number;
  forecast: number | null;
  observed: number | null;
  count: number;
};

export function buildCalibrationPoints(records: CalibrationRecord[]): CalibrationPoint[] {
  return CALIBRATION_BINS.map(bin => {
    const inRange = records.filter(record => record.probability >= bin.lower && record.probability < bin.upper);
    return {
      bucket: bin.label,
      lower: bin.lower,
      upper: bin.upper,
      forecast: inRange.length ? inRange.reduce((sum, record) => sum + record.probability, 0) / inRange.length : null,
      observed: inRange.length ? inRange.filter(record => record.outcome === "yes").length / inRange.length : null,
      count: inRange.length,
    };
  });
}
