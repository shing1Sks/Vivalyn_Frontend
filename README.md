# Vivalyn — Frontend

SPA for the Vivalyn platform — build AI voice agents for sales training, assessments, and simulations. Managers configure agents via a wizard; trainees run live voice sessions and receive automated feedback reports.

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Language | TypeScript 5.9 (strict) |
| Styling | Tailwind CSS 4 (CSS-first, no config file) |
| Routing | React Router DOM 7 |
| Animation | Framer Motion 12 |
| Charts | Recharts 3 |
| Icons | Lucide React |
| Auth | Supabase (`@supabase/supabase-js`) |

---

## Prerequisites

- Node.js 20+
- npm 10+
- Backend server running (see `backend/main_web_server/README.md`)
- Supabase project with auth enabled

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local   # or create manually (see below)

# 3. Start dev server
npm run dev
```

Runs on `http://localhost:5173`.

---

## Environment Variables

Create `.env.local` in this directory:

```env
# Backend API base URL
VITE_BACKEND_URL=http://localhost:8000

# Supabase project credentials (anon key — public, read from Supabase dashboard)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

| Variable | Required | Description |
|---|---|---|
| `VITE_BACKEND_URL` | yes | FastAPI backend base URL. Fallback: `http://localhost:8000` |
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Supabase anon (public) key — used for auth only |

---

## Pages

| Route | Page | Access |
|---|---|---|
| `/` | Landing | Public |
| `/auth` | Sign in / Sign up | Public — `?next=<path>` redirects after login |
| `/agent-space` | AgentSpace dashboard | Authenticated |
| `/invite/:inviteId` | Accept team invite | Public |
| `/agent/:agentId` | Live voice session | Public — `?mode=test` for testing (requires JWT) |
| `/admin` | Admin dashboard | Admin emails only |

---

## Scripts

```bash
npm run dev       # Start dev server with HMR
npm run build     # Type-check + production build (output: dist/)
npm run preview   # Serve the production build locally
npm run lint      # ESLint
```

---

## Project Structure

```
src/
  pages/          # Route-level pages — thin orchestrators
  components/
    ui/            # Reusable primitives (Button, Card, Badge, etc.)
    layout/        # Header, Footer
    agentspace/    # AgentSpace dashboard + agent wizard
    agentlive/     # Live voice session screens
    admin/         # Admin analytics and management views
  sections/        # Landing page sections
  context/         # Auth, Profile, AgentSpace, Token providers
  hooks/           # useAgentSession (WebSocket session lifecycle)
  lib/             # api.ts, supabase.ts, constants.ts, motion.ts
  assets/
```

For coding conventions, component patterns, design system, and strict rules — see [CLAUDE.md](CLAUDE.md).
