Refer to `UI.md` for the full design token and visual style spec.

---

# Frontend — Developer Guide

## Stack

- **React 19** + **Vite 7** + **TypeScript** (strict — no unused locals/params)
- **Tailwind CSS 4** — CSS-first via `@import "tailwindcss"` in `index.css`. No `tailwind.config.js`.
- **React Router DOM 7**
- **Framer Motion 12**
- **Lucide React** — icons only
- **Supabase** (`@supabase/supabase-js`) — auth only

---

## Project Structure

```
src/
  pages/              # Route-level pages — thin orchestrators, minimal logic
  components/
    ui/               # Global reusable primitives: Button, Card, Badge, Logo, UserAvatar,
                      #   Accordion, SectionWrapper, InquiryModal, etc.
    layout/           # Header, Footer
    agentspace/       # AgentSpace feature components
      wizard/         # Agent builder wizard — PlannerFlow, AgentConfigureView, LanguageVoiceSelector
    agentlive/        # Live session components
    admin/            # Admin dashboard views — AdminSidebar, AdminOverviewView, AdminOrgView,
                      #   AdminAgentView, AdminSubscriptionsView, AdminDiscountsView,
                      #   AdminInquiriesView, RunDetailPanel, UsageCharts, PricingCalculator
  sections/           # Landing page sections only (Hero, Pricing, FAQ, etc.)
  context/            # Global state providers
  hooks/              # Shared custom hooks
  lib/                # api.ts, supabase.ts, constants.ts, motion.ts
  assets/             # Static assets
```

**Rule:** Page-specific components go in `components/<pagename>/`. Global components go in `components/ui/`.

---

## Routing

| Route | Page | Auth |
|---|---|---|
| `/` | Landing | public |
| `/auth` | Auth | public — supports `?next=` redirect |
| `/agent-space` | AgentSpace | authenticated |
| `/invite/:inviteId` | InviteAccept | public |
| `/agent/:agentId` | AgentLive | public — supports `?mode=test` (test mode requires JWT) |
| `/admin` | AdminDashboard | admin-only — verified via `adminMe()` API call |

**Provider nesting:**
- Global (`main.tsx`): `AuthProvider > ProfileProvider > App`
- Page-level (`AgentSpace.tsx` only): `AgentSpaceProvider > TokenProvider > <content>`

`AgentSpaceProvider` and `TokenProvider` are NOT globally available — only mounted on the `/agent-space` route.

---

## Context Providers

| Hook | Exports | Notes |
|---|---|---|
| `useAuth()` | `user`, `session`, `loading`, `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle`, `signInWithMicrosoft`, `signOut` | Supabase session, OAuth redirects to `/agent-space` |
| `useProfile()` | `profile: UserProfile \| null`, `profileLoading` | Auto sign-out on 401 (deleted user) |
| `useAgentSpace()` | `spaces`, `activeSpace`, `spacesLoading`, `spacesError`, `switchSpace`, `createSpace`, `refetchSpaces` | Page-level (AgentSpace.tsx only). Persists last space in `localStorage` key `vivalyn_last_agentspace_id` |
| `useTokenBalance()` | `balance: number \| null`, `lowThreshold: number` (default 10), `balanceLoading`, `refetchBalance` | Page-level (AgentSpace.tsx only). Depends on `useAgentSpace()` for active space |

---

## API (`lib/api.ts`)

- All functions are `async`, accept `token: string` for authenticated routes
- Base URL: `VITE_BACKEND_URL` env var (fallback: `http://localhost:8000`)
- Auth header: `Authorization: Bearer <token>`
- Error class: `ApiError extends Error` with `.status: number`
- Pattern: `fetch → check res.ok → parse json → return typed result`

Key function groups: `profile`, `agentspaces`, `members`, `invites` (agentspace-scoped + inbox), `voices`, `agents`, `evaluation/planning` (`generateEvaluationCriteria`, `planAgent`, `compileAgentPlan`, `rewriteAgentSection`), `runs`, `tokens`, `subscriptions`, `plans`, `inquiries`, `admin`, `discounts`

---

## Custom Hooks (`hooks/`)

| Hook | File | Description |
|---|---|---|
| `useAgentSession(opts)` | `hooks/useAgentSession.ts` | Manages the WebSocket live session lifecycle. Phases: `idle → connecting → ready → active → ended`. Returns `{ phase, agentState, transcript, micEnabled, toggleMic, endSession, error, sessionReport }`. Types: `AgentState`, `SessionPhase`, `TranscriptEntry`, `SessionReport`. |

---

## Component Conventions

- **Pages are thin** — state + layout only, delegate logic to sub-components
- **No path aliases** — use relative imports only (`../components/ui/Button`)
- **No new files** unless clearly necessary — prefer editing existing
- TypeScript strict — type all props explicitly, no `any`

---

## UI & Design System

Full spec in `UI.md`. Quick reference:

| Token | Value |
|---|---|
| Primary | `indigo-600` — CTAs, active states, links, focus rings only |
| Soft bg | `gray-50` |
| Border | `gray-200` |
| Text main | `gray-900` |
| Text muted | `gray-600` |
| Card radius | `rounded-xl` |
| Button/input radius | `rounded-lg` |
| Badge radius | `rounded-full` |
| Shadow | `shadow-sm` default · `shadow-md` on hover |

---

## Motion & Animation

- **Transition token:** `duration-[120ms]` — always use bracket syntax (project convention, not `duration-120`)
- **Dropdown panel:** `AnimatePresence` with `initial={{ opacity: 0, y: -4 }}` `animate={{ opacity: 1, y: 0 }}` `exit={{ opacity: 0, y: -4 }}` `transition={{ duration: 0.12 }}`
- **Entrance animations** (hero, feature cards, charts only): `opacity 0→1, y: 8px→0, duration: 0.25s, stagger: 60ms`
- No bounce, no elastic, no parallax

---

## Strict Rules

1. **No emojis** — never in JSX, strings, or comments. Use Lucide icons for all visual indicators.
2. **No native `<select>`** — always build a custom dropdown (trigger button + AnimatePresence panel + `mousedown` click-outside via `useRef`). For 2-option selects (e.g. Member/Admin), use a segmented control (`bg-gray-100 rounded-lg p-1`) instead.
3. **No gradients** — flat colors only.
4. **Outline icons only** — never filled. Lucide defaults (stroke-width 1.5) are correct.
5. **Update CHANGELOG** after each change — ask user before writing.

---

## Environment Variables

```
VITE_BACKEND_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
