# Virtual Chem Lab

A polished interactive chemistry workbench built with React, TypeScript, Three.js, and React Three Fiber.

- Complete 118-element reference table with search and element detail inspection.
- Interactive 3D lab scene with glassware, liquids, bubbles, precipitate, burner, flame tests, and orbit controls.
- Simulations for neutralization, zinc plus hydrochloric acid, silver chloride precipitation, flame tests, and acid-base titration.
- Context-aware local Chemistry Copilot with a server-side endpoint integration point.
- Persistent digital lab notebook using browser local storage.

## Local development

```bash
npm install --legacy-peer-deps
npm run dev
```

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0
```
