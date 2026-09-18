# Quiz Night

A private, friends-only, Jeopardy-style multiplayer quiz platform. One host runs the show on a laptop/TV; teams join from their phones as dedicated buzzers — no app install required.

Built with Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (Postgres, Realtime, Storage, Auth).

## Table of contents

- [Prerequisites](#prerequisites)
- [Supabase setup](#supabase-setup)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Seed data](#seed-data)
- [Testing](#testing)
- [FFmpeg (media trimming)](#ffmpeg-media-trimming)
- [PWA](#pwa)
- [Production deployment](#production-deployment)
- [How to run a quiz night](#how-to-run-a-quiz-night)
- [Architecture](#architecture)
- [Security notes](#security-notes)

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is enough for private use)
- `ffmpeg` installed on the server if you want media trimming (optional — everything else works without it)

## Supabase setup

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). It creates:
   - All application tables (`games`, `categories`, `questions`, `media`, `game_sessions`, `session_categories`, `session_questions`, `session_media`, `teams`, `buzz_events`, `score_events`, `final_wagers`, `game_events`)
   - Row Level Security policies scoping every table to its owning host (`auth.uid()`)
   - The `quiz-media` Storage bucket (public read, authenticated write) used for uploaded images/video/audio
3. In **Authentication → Providers**, email/password auth is enabled by default — that's all this app uses (no OAuth needed). You can disable "Confirm email" for a faster private-use signup flow, or leave it on and confirm via the Supabase dashboard.
4. Grab your **Project URL**, **anon public key**, and **service role key** from **Project Settings → API**.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | **Never** exposed to the browser. Used only inside API route handlers, which enforce their own authorization since it bypasses RLS. |
| `TEAM_TOKEN_SECRET` | server only | Long random string (`openssl rand -hex 32`). Signs the opaque per-team buzzer tokens (teams have no accounts — see [Architecture](#architecture)). |
| `NEXT_PUBLIC_APP_URL` | client | Used to build the QR-code join URL. Set to your real domain in production. |
| `FFMPEG_PATH` / `FFPROBE_PATH` | server only | Optional; defaults to `ffmpeg`/`ffprobe` on `$PATH`. |

Never commit `.env.local` — it's already git-ignored.

## Local development

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. You'll be redirected to `/login`, where you can create the (single, or per-friend-group) host account. There's no separate signup flow — the login page has a "Create host account" toggle.

## Seed data

To get a fully-populated demo game (text questions, an image, a YouTube clip, an uploaded audio clip, multiple media on one question, and a Final Question) for trying out the app:

```bash
npm run seed
```

This creates (or reuses) a host account — `demo@quiznight.local` / `QuizNightDemo123!` by default, override with `SEED_HOST_EMAIL` / `SEED_HOST_PASSWORD` — and a "Quiz Night Demo" game. Sign in with those credentials and open the game from the dashboard.

## Testing

```bash
npm test          # run once
npm run test:watch
```

82+ unit tests cover the logic the spec calls out as most critical:

- **Buzz ordering & concurrency** — server-sequence ranking, duplicate-buzz rejection, the full incorrect-answer progression through a buzz queue (`src/lib/game/buzz-queue.test.ts`)
- **Scoring** — correct/incorrect deltas, negative scores, Final Question wager clamping (`src/lib/game/scoring.test.ts`)
- **Session state machine** — valid/invalid transitions, pause/resume (`src/lib/game/state-machine.test.ts`)
- **CSV/Excel import validation** — missing fields, bad points, duplicate cells, header tolerance (`src/lib/game/import.test.ts`)
- **YouTube URL parsing**, **upload MIME/size/extension validation**, **team token hashing**, **join code generation**, and the **team buzzer UI state derivation** (what the phone should show in every situation)

The buzzer system specifically gets its own dedicated test suite per the spec's emphasis on it — see `buzz-queue.test.ts`'s "incorrect-answer progression" and "duplicate buzz prevention" blocks.

Database-dependent logic (RLS policies, the atomic buzz insert's uniqueness guarantee under real concurrency) is designed to be verified against a live Supabase project — see [Manual QA](#manual-qa-checklist) below.

## FFmpeg (media trimming)

Media trimming (`/api/media/[id]/trim`) shells out to `ffmpeg`/`ffprobe` via `execFile` with a fixed argument array — never a shell string, so no filename or timestamp can inject extra commands. If `ffmpeg` isn't installed, the trim endpoint returns a clear "not available" error instead of failing silently; every other feature (upload, YouTube embeds, images/GIFs) works without it.

To install:

```bash
# Debian/Ubuntu
sudo apt-get install ffmpeg
# macOS
brew install ffmpeg
```

## PWA

`public/manifest.webmanifest` + `public/sw.js` make the app installable and cache the static build shell for fast repeat loads. The service worker deliberately **never** caches API responses or page HTML — the live board and buzzer need a real connection, and a stale cached buzzer screen would be actively misleading during a live game.

## Production deployment

Any Node hosting platform that runs Next.js works (Vercel, Fly.io, Railway, a plain VPS with `next start`). Steps:

1. Set all the environment variables above in your host's dashboard.
2. If you want media trimming, make sure `ffmpeg` is installed on the server (Vercel's serverless functions do **not** include it — a VPS/Docker deployment is the simplest path if you need trimming in production; without it, everything except trimming still works).
3. `npm run build && npm start`.
4. Point `NEXT_PUBLIC_APP_URL` at your real domain so QR codes resolve correctly.

## How to run a quiz night

1. **Create a game** from the dashboard, or run `npm run seed` for a ready-made demo.
2. Add categories and questions in the editor (or import a CSV/Excel file — see the "Import CSV/Excel" button).
3. Click **▶ Play** to start a new session. This snapshots your game template so later edits never affect a game in progress.
4. **Display the QR code / game code** on the TV — teams scan it (or visit `/join/<code>`) and enter a team name.
5. Once your friends have joined, click **Start Game →**.
6. Click a point value to open a question, **▶ Play Media** / **👁 Reveal Answer** as needed.
7. Click **🔔 Enable Buzzers** — the first phone to press BUZZ wins the top spot; the full order is recorded.
8. Select a team, mark **✅ Correct** or **❌ Incorrect** — an incorrect answer automatically clears them from the queue so you can select the next team in line.
9. Scores update live on every screen. Use the **Manual scoring** panel any time for ad-hoc point adjustments, and **↺ Undo last score change** if you misclick.
10. Play your Final Question (if you added one) for the wager-and-reveal finale, then **End game** to show the final scoreboard.
11. **🔁 Play Again** starts a brand-new session from the same template — scores reset, same questions.

### Manual QA checklist

The spec calls for a full simulated game as acceptance criteria. To run it: create a game with 3+ categories, add media to a few questions, start a session, open `/join/<code>` on 3-4 separate devices/browser profiles, join with different team names, start the game, buzz from multiple devices at once on the same question and confirm the order shown matches server arrival order, mark the first team incorrect and confirm the second team becomes selectable, mark them correct and confirm the score updates, manually adjust and undo a score, play a Final Question, finish the game, and start a new session from the same template.

## Architecture

```
src/
  app/                # Next.js routes (pages + API route handlers)
  components/
    ui/                # Design-system primitives (Button, Card, Toast, Confirm)
    editor/             # Game template editor (categories/questions/media/import)
    host/               # Live host screen (board, question flow, buzzer panel, scoreboard)
    team/               # Team buzzer PWA screen
  lib/
    supabase/           # Browser / server (RLS) / admin (service role) clients
    game/                # Pure, unit-tested game logic (buzz queue, scoring, state
                         # machine, CSV import, YouTube parsing, upload validation, ffmpeg args)
    realtime/            # Client hooks for the Supabase Realtime broadcast channel
    sound/               # Synthesized (no external audio assets) sound effects
    validation/          # Zod request schemas
  types/database.ts      # Hand-written types mirroring the SQL schema
supabase/migrations/     # SQL schema + RLS + storage policies
scripts/seed.ts          # Demo data generator
```

**Game Template vs. Game Session** (spec-critical separation): a `games`/`categories`/`questions`/`media` row set is the reusable quiz content. Clicking **Play** *snapshots* it into `game_sessions`/`session_categories`/`session_questions`/`session_media` — a live game never touches the template, so editing a quiz mid-session (or after) is always safe, and the same template can be replayed indefinitely via **Play Again**.

**Realtime & data separation** (spec section 68 — team clients must never see answers): all session mutation goes through server-side API route handlers using the Supabase **service role** key, which perform their own authorization (host-session-ownership checks, or a per-team opaque token for team actions) and then broadcast a *redacted* public state over a Supabase Realtime **broadcast** channel (`session:<id>`) — this payload never contains `question_text`/`answer_text`/host notes, full stop. The host screen additionally reads the full question (including the answer) directly from Postgres via an **authenticated, RLS-scoped** browser client, so the answer only ever reaches a browser that's signed in as the session's host. Team browsers have no Supabase Auth session at all, and RLS would block them from that table even if they tried.

**Server-authoritative buzzer** (spec sections 17-18, 55): a buzz press is a `POST` that inserts into `buzz_events`; ordering comes from a Postgres `bigserial` column assigned atomically at insert time — never a client timestamp. A unique index on `(session_question_id, team_id)` makes a duplicate/replayed buzz from the same team a guaranteed no-op even under a race, and Postgres resolves concurrent inserts from different teams atomically, so there's never more than one "first place."

**Teams have no accounts** (spec section 69): joining a session mints a random opaque token, returned once and stored in the team's `localStorage`. The server stores only an HMAC of it (`TEAM_TOKEN_SECRET`) and verifies every subsequent team request (buzz, wager, heartbeat) against it in constant time.

**Explicit state machine** (spec section 53): `src/lib/game/state-machine.ts` defines every valid `game_sessions.status` transition (`lobby → board → question → buzzing → answering → scoring → answer → board → …`, plus `final_question`, `paused`, `finished`) instead of scattered booleans.

## Security notes

- Every session-mutating API route validates its input with Zod and checks authorization before touching the database (host-ownership for host actions, team-token verification for team actions).
- File uploads are validated server-side by real MIME type **and** extension **and** size (never trust the browser), given a random non-guessable storage path, and never executed or interpreted.
- `ffmpeg` is invoked with a fixed `execFile` argument array — never through a shell — so no input can perform command injection.
- Client-submitted scores, buzz timestamps, and answers are never trusted; the server computes and stores all of them.
- RLS locks every table to its owning host; the service role key (which bypasses RLS) is imported only in server-only modules and never reaches the browser.
