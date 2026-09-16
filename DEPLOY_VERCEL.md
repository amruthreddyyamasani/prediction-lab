# Deploy Prediction Lab to Vercel

Prediction Lab uses Vercel for the React static output and a Node serverless function for the existing tRPC API. Supabase remains the primary authentication and database layer. The forecasting endpoint calls the server-side LLM proxy, so its secret must never be exposed through a `VITE_` variable.

## 1. Import the repository

Create a new Vercel project from the GitHub repository and keep the repository root as the project root. Vercel reads `vercel.json`, runs `pnpm build:vercel`, serves `dist/public`, and routes `/api/*` to the catch-all function at `api/[...path].ts`.

## 2. Add environment variables

Add the following variables in Vercel Project Settings for **Production, Preview, and Development** as appropriate:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL used by the server request client. |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase public publishable key used with authenticated server requests. |
| `VITE_SUPABASE_URL` | Supabase URL used by browser Auth. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key exposed to the browser by design. |
| `BUILT_IN_FORGE_API_URL` | Server-side LLM proxy URL used for structured forecast generation. |
| `BUILT_IN_FORGE_API_KEY` | Server-side LLM proxy secret. Do not prefix it with `VITE_`. |

Use the values from the existing working environment for the Supabase and LLM proxy settings. Do not commit a populated `.env` file.

## 3. Configure Supabase Auth URLs

In Supabase Auth URL Configuration, add the deployed Vercel URL as a Site URL. Add the Vercel preview and production URLs to the Redirect URLs if email confirmation or magic-link flows are enabled. The database schema and RLS grants are already represented in `supabase/migrations/20260916_prediction_lab_core.sql`.

## 4. Deploy

Push to the repository's default branch or deploy from the Vercel dashboard. After deployment, verify the home page, sign-in modal, category selector, forecast generation, ledger, detail page, resolution flow, and calibration view. If forecast generation fails while sign-in and category loading work, check the two `BUILT_IN_FORGE_*` variables first.

## Local production check

```bash
pnpm install
pnpm check
pnpm test
pnpm build:vercel
```
