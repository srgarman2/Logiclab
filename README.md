# LogicLab

LogicLab is a timed logical-reasoning trainer built with React, TypeScript, and Vite.

The app includes category-based quizzes, local progress tracking, optional Supabase-backed sign-in and sync, and global/friends leaderboards.

## Features

- Timed quiz mode with 30 seconds per question
- 10-question decks with difficulty ramping (easy -> medium -> hard)
- Categories: Indicator Words, Formal Logic, Argument Analysis, Flaw Detection, and All Topics
- Score system with difficulty weighting, speed bonus, and streak multipliers
- Streak shields (earned every 5 quizzes) to protect active streaks on misses/timeouts
- Category mastery tracking (correct/attempted per category)
- Challenge links to compete against a friend's score on the same question set
- Global leaderboard (weekly and all-time) plus friends leaderboard
- Optional Google/GitHub OAuth via Supabase
- Guest mode support (play without signing in, with local persistence)

## Routes

- `/` Home dashboard with stats and category quick-start
- `/quiz` Timed quiz flow
- `/leaderboard` Global and friends rankings

## Tech Stack

- React 18
- TypeScript
- Vite 5
- React Router
- Zustand (with local persistence)
- Framer Motion
- Supabase (`@supabase/supabase-js`)
- Tailwind CSS (project includes Tailwind config; UI is currently mostly inline-styled)

## Prerequisites

- Node.js 18+
- npm

## Local Development

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

## Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

If these are not set, the app still runs in guest mode, but auth and remote sync features are disabled.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor in Supabase.
3. Run the migration in `supabase/migration.sql`.
4. Enable Google and/or GitHub providers in Supabase Auth if you want OAuth sign-in.

The migration creates:

- `profiles`
- `quiz_results`
- `friendships`
- `weekly_leaderboard` view
- RLS policies and profile auto-create trigger

## Scripts

- `npm run dev` Start Vite dev server
- `npm run build` Type-check and create production build in `dist/`
- `npm run preview` Preview production build locally
