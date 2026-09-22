import type { ElementData } from "../types/chemistry";
import type { Reaction } from "../data/reactions";

export type CopilotContext = {
  elements: ElementData[];
  reaction?: Reaction;
  ph: number;
  temperature: number;
  volumeMl: number;
};

export function localCopilot(question: string, context: CopilotContext): string {
  const q = question.toLowerCase();

  if (context.reaction) {
    if (q.includes("why") || q.includes("happen")) {
      return `${context.reaction.name}: ${context.reaction.description} Current pH is ${context.ph.toFixed(2)} and temperature is ${context.temperature.toFixed(1)} °C.`;
    }
    if (q.includes("next") || q.includes("do")) {
      return context.reaction.visual === "titration"
        ? "Add the titrant in small increments near the endpoint and watch the pH curve."
        : "Observe the reaction, record what you see, then compare the observation with the expected products.";
    }
  }

  if (q.includes("ph")) {
    return `The simulated solution is currently at pH ${context.ph.toFixed(2)}. Lower values are more acidic; higher values are more basic.`;
  }

  if (q.includes("temperature") || q.includes("heat")) {
    return `The simulated lab temperature is ${context.temperature.toFixed(1)} °C. Temperature changes in this prototype are controlled by the reaction model.`;
  }

  if (context.elements.length === 1) {
    const e = context.elements[0];
    return `${e.name} (${e.symbol}) has atomic number ${e.atomicNumber} and an approximate atomic mass of ${e.atomicMass}. ${e.description}`;
  }

  return "I’m connected to the current lab state. Try asking “What is happening?”, “Why did the pH change?”, or “What should I do next?”";
}
