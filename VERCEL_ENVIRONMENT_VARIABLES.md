# Vercel environment variables

Set these variables in Vercel Project Settings. Do not commit real values to the repository.

| Variable | Scope | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Server | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Supabase publishable key; safe to use with authenticated request headers. |
| `VITE_SUPABASE_URL` | Browser | Same Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Same publishable key; publishable keys are designed for browser use. |
| `GEMINI_API_KEY` | Server | Sensitive Gemini API credential used by the structured forecast pipeline. |
| `VITE_ANALYTICS_ENDPOINT` | Browser build (optional) | Umami analytics origin; set together with `VITE_ANALYTICS_WEBSITE_ID`. |
| `VITE_ANALYTICS_WEBSITE_ID` | Browser build (optional) | Umami website ID; set together with `VITE_ANALYTICS_ENDPOINT`. |

The Production deployment uses `GEMINI_API_KEY` with the `gemini-3.6-flash` model. Store it as a sensitive Production variable in Vercel. The application retains optional compatibility with `OPENAI_API_KEY`, `BUILT_IN_FORGE_API_URL`, and `BUILT_IN_FORGE_API_KEY`, but those variables are not required for the current Gemini forecast flow. Node.js 20.x or later is required.
