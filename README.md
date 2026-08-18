# Jugadu Cafe Admin

Separate admin website for managing **Gallery** uploads and the homepage **Highlight** section. Shares the same Supabase project as the public cafe site.

## Setup

1. Run these SQL files from the public `jugadu-cafe` repo in the Supabase SQL Editor:
   - `supabase/migrations/003_gallery_and_highlight.sql`
   - `supabase/migrations/004_highlight_items_and_story.sql`
   - `supabase/migrations/005_page_views.sql`
2. In Supabase → **Authentication → Users**, create an admin user (email + password).
3. Copy `.env.example` → `.env.local` and set the same `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the public site.
4. Install & run:

```bash
npm install
npm run dev
```

Default port: `http://localhost:3000` (use `npm run dev -- -p 3001` if the public site is already on 3000).

## Modules

- **Login** — Supabase Auth email/password
- **Gallery** — upload photo/video → Storage `cafe-media` + `gallery_items` row
- **Highlights** — text strip under the title + multiple photos/videos in a slider
- **Our Story** — replace the Our Story video/photo on the public site

## Deploy

Deploy this app as its own Vercel project. Add the same Supabase env vars. Do not share this URL publicly.
