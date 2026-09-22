export type ElementData = {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: number;
  group: number | null;
  period: number;
  category: string;
  state: "solid" | "liquid" | "gas";
  electronShells: number[];
  description: string;
};

export type LabState = {
  selectedElements: ElementData[];
  ph: number;
  temperature: number;
  volumeMl: number;
  activity: string;
};