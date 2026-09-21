# Prediction Lab

Prediction Lab is a premium, AI-powered forecasting workspace for turning future-oriented questions into structured, probabilistic predictions. Each forecast is stored in a private ledger, can be updated as evidence changes, and can be resolved later for calibration analysis.

## Live application

**Canonical production website:** [prediction-lab-three.vercel.app](https://prediction-lab-three.vercel.app/)

The application is deployed on Vercel from the `main` branch of this repository. The Vercel deployment is the canonical public website for this project.

## Product flow

1. **Ask** a measurable future-oriented question.
2. **Forecast** with Gemini structured output, including probability, uncertainty, rationale, key variables, risks, catalysts, and a resolution date.
3. **Track** the forecast in a private Supabase-backed ledger.
4. **Update** the forecast when the question or evidence changes.
5. **Resolve** the prediction against an explicit outcome and resolution note.
6. **Learn** from historical outcomes through calibration analytics.

## Technology

- React 19 with Vite
- TypeScript and Tailwind CSS
- tRPC 11 for typed client-server procedures
- Express serverless handlers on Vercel
- Supabase Auth and PostgreSQL-backed persistence
- Gemini API with `gemini-3.6-flash` and structured JSON output
- Three.js-powered interactive observatory environment
- Vitest for automated tests

## Repository structure

```text
api/trpc/[...path].ts        Vercel tRPC serverless entrypoint
client/src/                  React application and user interface
server/                      tRPC procedures, database access, and AI pipeline
server/forecast.ts           Forecast prompt and structured response contract
server/_core/llm.ts          Provider adapters, including Gemini
shared/                      Shared application types and constants
supabase/migrations/         Relational Supabase schema and RLS policies
vercel.json                  Vercel build, routing, and function configuration
```

## Local development

Use Node.js 22 or later and pnpm. Install dependencies, configure the environment variables, and start the development server:

```bash
pnpm install
pnpm dev
```

The development server runs on `http://localhost:3000` by default.

## Environment variables

Do not commit `.env` files or API keys. Configure the following variables in the local environment and in Vercel Project Settings.

### Client and Supabase

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
```

### Server security and application configuration

```text
JWT_SECRET
VITE_APP_ID
OAUTH_SERVER_URL
VITE_OAUTH_PORTAL_URL
OWNER_OPEN_ID
```

### AI provider

Prediction Lab uses Gemini in production. Set the following variable as a sensitive Production secret in Vercel:

```text
GEMINI_API_KEY
```

The code also retains optional compatibility with the following provider variables, but they are not required when `GEMINI_API_KEY` is configured:

```text
OPENAI_API_KEY
BUILT_IN_FORGE_API_URL
BUILT_IN_FORGE_API_KEY
```

Never expose any server-side AI credential in client-side code.

## Database setup

Apply the relational migration in `supabase/migrations/20260916_prediction_lab_core.sql` to the target Supabase project. The schema uses separate tables for profiles, categories, predictions, forecast versions, evidence, and resolutions. Row-level security policies keep each user’s forecasting records private.

## Verification commands

Run the production build and automated tests before opening a deployment:

```bash
pnpm run build
pnpm test -- --run
```

The test suite covers authentication behavior, forecast normalization and parsing, the Vercel API adapter, and the interactive observatory component.

## Vercel deployment

The repository is configured for Vercel with the following behavior:

- Build command: `pnpm build:vercel`
- Output directory: `dist/public`
- tRPC function: `api/trpc/[...path].ts`
- Production source: the `main` branch

To deploy manually with the Vercel dashboard, import `amruthreddyyamasani/prediction-lab`, keep the repository root as the project root, add the required environment variables for the Production target, and deploy. Git pushes to `main` can then trigger production deployments through the connected Vercel project.

## Security notes

API keys belong only in Vercel’s encrypted environment-variable store or an untracked local environment file. If a key is ever pasted into chat, committed, or exposed in logs, revoke it at the provider and replace it immediately.

## License

This project is maintained as a private application repository. Add a license before distributing the source publicly.
