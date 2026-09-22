# Manus handoff

This ZIP is intentionally structured as a clean Vite + React + TypeScript project.

## First run
1. Install dependencies with `npm install`.
2. Run `npm run dev`.
3. Run `npm run build` before deployment.

## Product direction
Keep the current visual language: dark, restrained, technical, laboratory-first. Avoid generic SaaS cards, excessive gradients, and decorative 3D that does not communicate chemistry.

## Important requirement
The periodic table must remain a first-class feature containing all 118 elements.

## AI
Replace the local fallback in `src/lib/copilot.ts` with a secure server-side LLM route. The AI should receive structured simulation context, not invent the chemical state.

## Simulation
The current reaction engine is deliberately small and extensible. Add more reaction definitions in `src/data/reactions.ts` and move quantitative chemistry into a dedicated simulation layer.

## Safety
Treat this as an educational simulation. For any real-world laboratory instruction layer, include safety constraints, warnings and age/education-appropriate guidance.
