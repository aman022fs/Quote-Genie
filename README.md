# Quotient

Choose a starting template for your business, customize it once, then create new client quotes in minutes.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, SSR) + [TanStack Router](https://tanstack.com/router) / [Query](https://tanstack.com/query)
- TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) (Postgres, Auth, Storage)
- Nitro (server build, deployable to Netlify, Vercel, or a plain Node server)

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase credentials before running the app — see [Environment variables](#environment-variables).

## Environment variables

See `.env.example` for the full list. In short:

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — public Supabase project URL and publishable key (browser-safe).
- `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` — same values, read server-side during SSR.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses Row Level Security. Never exposed to the client.

## Database

Supabase schema and RLS policies live in `supabase/migrations/`. Apply them with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

The app also expects two Storage buckets: `quotation-uploads` and `generated-quotations` (created in the Supabase dashboard or via the CLI; RLS policies for both are already included in the migrations).

## Commands

```sh
npm install      # install dependencies
npm run dev       # start the local dev server
npm run build     # production build
npm run preview   # preview the production build locally
npm run lint      # eslint
npm run format    # prettier --write
```

## Deployment

The app builds through Nitro, which auto-detects Netlify or Vercel from the platform's CI environment — no preset needs to be hardcoded. Set the environment variables above in your hosting platform's dashboard before deploying.
