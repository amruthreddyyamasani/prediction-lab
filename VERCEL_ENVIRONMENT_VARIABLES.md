# Vercel environment variables

Set these variables in Vercel Project Settings. Do not commit real values to the repository.

| Variable | Scope | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | Server | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Server | Supabase publishable key; safe to use with authenticated request headers. |
| `VITE_SUPABASE_URL` | Browser | Same Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Same publishable key; publishable keys are designed for browser use. |
| `BUILT_IN_FORGE_API_URL` | Server | LLM proxy URL used by the structured forecast pipeline. |
| `BUILT_IN_FORGE_API_KEY` | Server | Secret LLM proxy credential; never expose it with a `VITE_` prefix. |
| `VITE_ANALYTICS_ENDPOINT` | Browser build (optional) | Umami analytics origin; set together with `VITE_ANALYTICS_WEBSITE_ID`. |
| `VITE_ANALYTICS_WEBSITE_ID` | Browser build (optional) | Umami website ID; set together with `VITE_ANALYTICS_ENDPOINT`. |

The Supabase values can be taken from the working Prediction Lab environment. For an independently hosted Vercel deployment, the LLM proxy must be reachable from Vercel and authorized for the project; otherwise replace the server-side forecast provider with a compatible provider before production use. Node.js 20.x or later is required.
