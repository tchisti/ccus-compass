# CCUS Compass — Next.js Migration Design Spec
**Date:** 2026-04-05
**Status:** Approved
**Repo:** github.com/tchisti/ccus-space
**Deployed at:** ccus.ca (Vercel)

---

## 1. Why We're Migrating

The current `index.html` (3,300+ lines) has three structural problems:

1. **No persistent routing** — refreshing any tab resets to the homepage
2. **API key exposed client-side** — Anthropic key entered and stored in the browser
3. **No server-side capabilities** — can't gate features, proxy APIs, or send email

Next.js on Vercel solves all three, uses the existing GitHub → Vercel deployment pipeline, and positions SubsurfaceAI for monetisation, web search, and document generation without a backend rebuild.

---

## 2. Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14 App Router | JavaScript only (no TypeScript) |
| Hosting | Vercel | Existing GitHub connection carries over |
| Auth + DB | Supabase | Existing project, `@supabase/ssr` for Next.js |
| Payments | Stripe | Checkout + webhooks |
| Email | Resend | Transactional (sign-up, welcome, upgrade) |
| Analytics | PostHog | Free tier, 1M events/month |
| AI | Anthropic Claude API | `claude-sonnet-4-6`, server-side only |
| Search | Brave Search API | Web search proxy for live regulatory intel |
| Map | MapLibre GL JS 4.3.2 | Client component (`"use client"`) |
| PDF | jsPDF 2.5.1 | Client-side, chat export |
| Fonts | DM Sans + JetBrains Mono | Google Fonts (same as today) |

---

## 3. Pages & Routing

Every current tab becomes a real URL. Refresh works. Back/forward works. Google indexes SSG pages.

| Route | Page | Rendering | Notes |
|---|---|---|---|
| `/` | Homepage | SSG | Hero, stats, email capture, role cards, platform caps, jurisdiction strip, footer |
| `/dashboard` | Dashboard | Client | 3 workspace tabs (Engineer / Regulator / Investor) |
| `/chat` | AI Advisor | Client | Session history, PDF export, role selector |
| `/capture` | Capture Tech | Client | 6 technologies + compression/transport specs |
| `/primacy` | State Primacy | Client | 6 states, comparison table |
| `/tracker` | Regulatory Tracker | Client | Live Federal Register feed + 10 curated items |
| `/map` | Saline Geo-Map | Client | MapLibre GL, 508 NATCARB polygons |
| `/regulatory` | Regulatory Hub | SSG | Overview + links to deep-dive pages |
| `/regulations/aer-d065` | AER D-065 Reference | SSG | Ported from aer-d065.html |
| `/regulations/canada` | Canada Regulatory | SSG | Ported from canada-regulatory.html |
| `/regulations/us` | US Regulatory | SSG | Ported from us-regulatory.html |
| `/pricing` | Pricing Page | SSG | Free / Pro / Enterprise tiers, Stripe checkout CTA |

**SSG pages** are pre-rendered at build time — zero JS needed to serve, Google indexes them, instant first-paint. These are free inbound marketing pages.

**Client pages** use `"use client"` — same interactive behaviour as today.

**Shared layout** (`app/layout.js`) wraps every page with: Nav, Footer, AuthProvider, ThemeProvider, PostHogProvider. Nav links are Next.js `<Link>` components — no page reload on tab switch.

---

## 4. API Routes

All run on Vercel serverless. Secrets live in Vercel environment variables — never in the browser.

### `POST /api/chat`

The Anthropic proxy. Server holds the API key.

**Decision logic:**
```
Request arrives with { messages, userLevel, query }
  → Header X-User-Api-Key present?
    YES → Use their key, skip rate limit, forward to Anthropic
    NO  → Look up user's plan in Supabase
          Pro / Enterprise → Use ANTHROPIC_API_KEY env var, no limit
          Free / anonymous → Check daily_usage table
            count < 3  → Use ANTHROPIC_API_KEY, increment counter, respond
            count >= 3 → Return 429 { error: 'free_limit_reached', upgradeUrl: '/pricing' }
```

System prompt (`SYS_PROMPT`), `buildRegContext()`, and level context (`levelCtx`) are all injected server-side. The prompt is never visible to the browser.

On every request, the route also calls the Brave Search API (if `BRAVE_API_KEY` is set) to retrieve 2–3 live regulatory search results, which are appended to the system prompt as `LIVE WEB CONTEXT`. If `BRAVE_API_KEY` is not set, this step is silently skipped — the route degrades gracefully.

### `POST /api/search`

Standalone web search proxy. Accepts `{ query }`, calls Brave Search API, returns structured results. Used by the Regulatory Tracker to augment the Federal Register feed and by the AI Advisor for live regulatory lookups.

### `POST /api/generate`

Document generation endpoint.

For the initial build: returns `{ status: 'coming_soon', message: 'Document generation is a Pro feature — launching soon.', upgradeUrl: '/pricing' }` with HTTP 200.

Future: accepts project details → Claude generates MMV plan skeleton / AoR scope / permit pre-assembly → returns PDF blob.

The route is wired into the UI now so the upgrade prompt appears in context.

### `POST /api/webhooks/stripe`

Receives Stripe webhook events. Verified with `STRIPE_WEBHOOK_SECRET`.

Handled events:
- `checkout.session.completed` → set `user_profiles.plan = 'pro'`
- `customer.subscription.deleted` → set `user_profiles.plan = 'free'`
- `customer.subscription.updated` → sync plan status

### `POST /api/email`

Internal route called by the app after auth events. Sends transactional email via Resend.

Triggers:
- Sign-up confirmed → Welcome email (CCUS Compass branding, quick-start guide)
- Plan upgraded to Pro → Upgrade confirmation with feature summary
- (Future) Weekly regulatory digest

### `POST /api/waitlist`

Captures email from the Homepage "Join free" input. Stores in Supabase `waitlist` table. Sends a welcome email via Resend.

---

## 5. Auth, Plans & Rate Limiting

### Auth

`@supabase/ssr` handles session tokens server-side. `middleware.js` refreshes the Supabase session on every request. The `AuthModal` component ports over unchanged.

Email + password (min 8 chars, show/hide toggle). Email confirmation required (Supabase Site URL set to `https://ccus.ca`).

### Plan Tiers

| Tier | Price | AI Questions | Features |
|---|---|---|---|
| Free | $0 | 3 per day (your key) | All tools, view-only regulatory content, email capture |
| Pro | $49/mo | Unlimited (your key) | + AI Advisor unlimited, document generation (stub → real), PDF export, chat history, priority support |
| Enterprise | Custom | Unlimited | + API access, custom integrations, white-label, dedicated support |

Free users who hit the limit see an inline upgrade prompt in the chat: "You've used your 3 free questions today. Upgrade to Pro for unlimited access." with a Stripe checkout link.

BYOK (Bring Your Own Key): Any user (Free or Pro) can enter their own Anthropic API key. This bypasses rate limiting entirely and uses their billing. The key is stored in `localStorage` only — never sent to Supabase.

### Rate Limiting

New Supabase table `daily_usage`:

```sql
create table daily_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  anon_fingerprint text,       -- fallback for non-signed-in users (SHA-256 of IP+UserAgent, never raw IP)
  usage_date date default current_date,
  message_count int default 1,
  unique(user_id, usage_date),
  unique(anon_fingerprint, usage_date)
);
alter table daily_usage enable row level security;
-- Users can read their own count; service role writes
```

The `/api/chat` route reads and increments this table atomically using an upsert:
```sql
insert into daily_usage (user_id, usage_date, message_count)
values ($1, current_date, 1)
on conflict (user_id, usage_date)
do update set message_count = daily_usage.message_count + 1
returning message_count;
```

---

## 6. Data Model (Supabase)

### Existing Tables (carry over)

**`user_profiles`** — add two columns:
- `plan` text default `'free'` — values: `free`, `pro`, `enterprise`
- `stripe_customer_id` text — set when Stripe checkout is completed

**`chat_sessions`** — no changes. `messages` JSONB, `user_id` FK, RLS unchanged.

### New Tables

**`daily_usage`** — rate limiting (see above)

**`waitlist`**:
```sql
create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  source text default 'homepage',   -- 'homepage', 'pricing', 'chat_limit'
  created_at timestamptz default now()
);
```

### Environment Variables (Vercel)

```
ANTHROPIC_API_KEY          # Your Anthropic key (server-side only)
NEXT_PUBLIC_SUPABASE_URL   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY # Supabase publishable key
SUPABASE_SERVICE_ROLE_KEY  # For server-side DB writes (webhooks)
STRIPE_SECRET_KEY          # Stripe secret key
STRIPE_WEBHOOK_SECRET      # Stripe webhook signing secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RESEND_API_KEY             # Resend transactional email
BRAVE_API_KEY              # Brave Search (optional — degrades gracefully if absent)
NEXT_PUBLIC_POSTHOG_KEY    # PostHog project key
NEXT_PUBLIC_POSTHOG_HOST   # https://app.posthog.com
```

---

## 7. Component Structure

```
app/
├── layout.js                     ← Shared: Nav, Footer, AuthProvider, PostHogProvider
├── page.js                       ← / Homepage (SSG)
├── dashboard/page.js
├── chat/page.js
├── capture/page.js
├── primacy/page.js
├── tracker/page.js
├── map/page.js
├── regulatory/page.js
├── regulations/
│   ├── aer-d065/page.js
│   ├── canada/page.js
│   └── us/page.js
├── pricing/page.js
└── api/
    ├── chat/route.js
    ├── search/route.js
    ├── generate/route.js
    ├── email/route.js
    ├── waitlist/route.js
    └── webhooks/stripe/route.js

components/
├── layout/
│   ├── Nav.js                    ← Sticky nav, Next.js <Link>, auth state
│   ├── Footer.js
│   └── ThemeToggle.js
├── auth/
│   ├── AuthModal.js              ← Sign in/up (ported)
│   └── AuthProvider.js           ← user, plan, session context
├── home/
│   ├── Hero.js                   ← Tagline, CTA buttons, API key note
│   ├── StatsBar.js               ← 4 key stats
│   ├── RoleCards.js              ← Engineer / Regulator / Investor expandable cards
│   ├── PlatformCaps.js           ← 4 capability cards
│   ├── JurisdictionStrip.js      ← 8 jurisdiction badges
│   ├── EmailCapture.js           ← "Join free" email input → /api/waitlist
│   └── FooterCTA.js
├── chat/
│   ├── ChatView.js               ← Main chat container (ported)
│   ├── ChatInput.js
│   ├── ChatHistory.js            ← Session sidebar
│   ├── PromptChips.js            ← 10 suggested questions
│   ├── MessageBubble.js          ← User + assistant messages, Md renderer
│   ├── TypingDots.js
│   ├── PdfExport.js
│   └── UpgradeBanner.js          ← Shown when free limit hit
├── dashboard/
│   ├── DashboardView.js          ← Role tab switcher + knowledge base
│   ├── RoleSelector.js
│   ├── KnowledgeBase.js          ← 4-tab regulatory reference
│   ├── engineer/
│   │   ├── EngineerWorkspace.js
│   │   ├── CO2PhaseCalculator.js
│   │   ├── InjectionPressure.js
│   │   ├── PlumFootprint.js
│   │   ├── SiteChecklist.js
│   │   └── MaterialCompat.js
│   ├── regulator/
│   │   ├── RegulatorWorkspace.js
│   │   ├── PermitChecker.js
│   │   ├── FinancialAssurance.js
│   │   ├── MRVChecker.js
│   │   └── PISCScheduler.js
│   └── investor/
│       ├── InvestorWorkspace.js
│       ├── CreditModeler45Q.js
│       ├── LCOCEstimator.js
│       ├── ProjectFinanceDCF.js
│       ├── CreditStackOptimizer.js
│       └── TechRiskScorecard.js
├── tracker/
│   ├── TrackerView.js
│   ├── TrackerCard.js
│   └── SeverityBadge.js
├── map/
│   └── SalineMap.js              ← "use client", MapLibre GL
├── capture/
│   └── CaptureView.js
├── primacy/
│   └── PrimacyView.js
└── shared/
    ├── Md.js                     ← Markdown renderer
    ├── ApiKeyModal.js            ← BYOK key input
    └── GenerateStub.js           ← "Coming soon" document generation CTA

lib/
├── supabase-browser.js           ← createBrowserClient()
├── supabase-server.js            ← createServerClient() for API routes
├── knowledge-base.js             ← CCUS_KNOWLEDGE, STATIC_REG_UPDATES, SYS_PROMPT
├── reg-context.js                ← buildRegContext() (ported)
├── stripe.js                     ← Stripe client init
├── resend.js                     ← Resend client init
└── rate-limit.js                 ← checkAndIncrementUsage()

public/
├── data/
│   ├── D065_Annual_Compliance_Report_Template.xlsx
│   ├── D065_AoR_Capacity_Calculator.xlsx
│   └── D065_Sample_Cover_Letters.docx
└── natcarb_saline_poly.geojson   ← Optional local copy (primary: GitHub Gist)
```

---

## 8. Feature Parity Checklist

Everything in the current `index.html` must exist in the Next.js app before the old file is removed.

### Views
- [ ] Homepage (hero, stats, role cards, platform caps, jurisdiction strip, footer)
- [ ] Dashboard (3 workspaces + 4-tab regulatory knowledge base)
- [ ] AI Advisor (chat, history, prompt chips, PDF export, user level selector)
- [ ] Capture Tech (6 technologies + compression/transport)
- [ ] State Primacy (6 states + comparison table)
- [ ] Regulatory Tracker (live feed + 10 curated items + 5 filters)
- [ ] Saline Geo-Map (508 polygons, 7 properties, hover/select, "Ask AI →")

### Engineer Tools
- [ ] CO₂ Phase & Properties Calculator
- [ ] Injection Well Pressure Design (§146.88)
- [ ] CO₂ Plume Footprint Estimator (1/5/10/25/50-yr)
- [ ] Site Characterisation Checklist (30+ items, 6 categories)
- [ ] Material Compatibility Reference Table (10 materials × 3 conditions)

### Regulator Tools
- [ ] Permit Completeness Checker (57 items, 12 CFR categories)
- [ ] Financial Assurance Calculator
- [ ] MRV / Subpart RR Coverage Checker (18 items)
- [ ] 50-yr PISC Monitoring Scheduler

### Investor Tools
- [ ] 45Q Credit Modeler ($85/t, $180/t DAC, 12-yr NPV, PWA toggle)
- [ ] LCOC Estimator (7 technologies)
- [ ] Project Finance DCF (IRR bisection, DSCR, breakeven)
- [ ] Credit Stacking Optimizer (45Q + TIER + BC + EU ETS)
- [ ] Technology Risk Scorecard (7 techs × 6 dimensions, radar scores)

### Knowledge Base
- [ ] Alberta/Canada (8 regulations)
- [ ] US EPA/Federal (11 regulations)
- [ ] International Standards (7 standards)
- [ ] Operations & Engineering (7 topics)

### AI Advisor Features
- [ ] 3 user levels (engineer / regulator / investor)
- [ ] 10 prompt chips
- [ ] Session history (30 sessions, auto-restore)
- [ ] PDF export (branded, jsPDF)
- [ ] Regulatory context auto-injection (buildRegContext)
- [ ] BYOK (API key in localStorage)
- [ ] Free limit upgrade prompt

### Auth & Settings
- [ ] Supabase sign in / sign up (email + password, min 8 chars, show/hide)
- [ ] Chat session persistence + auto-restore
- [ ] Dark/light theme (localStorage)

### New Features
- [ ] Persistent URL routing (no refresh reset)
- [ ] Server-side Anthropic API proxy (`/api/chat`)
- [ ] Free tier rate limiting (3/day, daily_usage table)
- [ ] Stripe plan tiers (Free / Pro $49/mo / Enterprise)
- [ ] Stripe checkout + webhook plan sync
- [ ] PostHog analytics (page views + custom events)
- [ ] SEO SSG knowledge pages (/regulations/*)
- [ ] Homepage email capture → waitlist table
- [ ] Resend transactional email (sign-up welcome, upgrade confirmation)
- [ ] `/api/search` web search proxy (Brave Search)
- [ ] `/api/generate` stub with Pro upgrade prompt
- [ ] Pricing page (/pricing)
- [ ] Downloadable templates in /public/data/

---

## 9. Analytics Events (PostHog)

| Event | Properties | Trigger |
|---|---|---|
| `page_view` | route, referrer | Auto (PostHog) |
| `ai_question_sent` | userLevel, plan, hasRegContext, queryLength | On send() |
| `free_limit_hit` | userId | On 429 from /api/chat |
| `upgrade_prompt_seen` | source (chat / generate / pricing) | On UpgradeBanner render |
| `plan_upgraded` | fromPlan, toPlan | Stripe webhook |
| `tool_used` | toolName, workspace | On tool interaction |
| `map_cell_selected` | basinName, resourceName | On cell click |
| `map_ask_ai_clicked` | basinName | On "Ask AI →" click |
| `tracker_impact_clicked` | itemTitle, jurisdiction | On "Explain Impact →" |
| `email_captured` | source | On waitlist submission |
| `pdf_exported` | messageCount | On PDF export |
| `document_generate_clicked` | templateType | On /api/generate stub hit |

---

## 10. Email Templates (Resend)

Three transactional emails. All use CCUS Compass dark-green branding.

**1. Sign-up Welcome**
- Trigger: New user confirms email
- Subject: "Welcome to CCUS Compass — your CCUS intelligence platform"
- Content: Quick-start guide (3 steps), link to AI Advisor, link to Dashboard tools

**2. Plan Upgrade Confirmation**
- Trigger: Stripe `checkout.session.completed`
- Subject: "You're on Pro — unlimited CCUS AI access activated"
- Content: What's unlocked (unlimited AI, document generation), receipt link

**3. Waitlist Welcome**
- Trigger: Homepage email capture submission
- Subject: "You're on the CCUS Compass waitlist"
- Content: "We'll notify you as new features launch", link to try the free tier

---

## 11. Migration Phases

### Phase 1 — Scaffold & Foundation
- Run `npx create-next-app@latest . --no-typescript` at the root of the `ccus-space` repo. This converts the repo in-place. The old HTML files remain untouched alongside the new `app/` directory until Phase 5.
- Set up `app/layout.js` with Nav, Footer, AuthProvider, ThemeProvider, PostHogProvider
- Configure Vercel environment variables
- Deploy bare app to ccus.ca — verify routing works
- Set up Supabase `@supabase/ssr`, middleware session refresh
- Add `daily_usage` and `waitlist` tables, alter `user_profiles` (add `plan`, `stripe_customer_id`)

### Phase 2 — API Routes & Services
- `/api/chat` — Anthropic proxy with rate limiting + BYOK + web search injection
- `/api/search` — Brave Search proxy
- `/api/generate` — Stub returning coming-soon response
- `/api/email` — Resend integration (3 templates)
- `/api/waitlist` — Email capture
- `/api/webhooks/stripe` — Plan sync
- Stripe checkout flow on `/pricing` page

### Phase 3 — Port Interactive Pages
Port each tab one at a time. Each component is a direct extraction from `index.html`:

1. Homepage (`/`) — Hero, StatsBar, EmailCapture, RoleCards, PlatformCaps, JurisdictionStrip
2. AI Advisor (`/chat`) — ChatView, ChatHistory, PromptChips, PDF export, UpgradeBanner
3. Dashboard (`/dashboard`) — All 13 tools across 3 workspaces + 4-tab knowledge base
4. Regulatory Tracker (`/tracker`) — Live feed + curated + filters
5. Saline Geo-Map (`/map`) — MapLibre GL client component
6. Capture Tech (`/capture`) — 6 technologies + specs
7. State Primacy (`/primacy`) — 6 states + comparison

### Phase 4 — SEO & Standalone Pages
- Port `regulatory.html` → `/regulatory` (SSG)
- Port `aer-d065.html` → `/regulations/aer-d065` (SSG)
- Port `canada-regulatory.html` → `/regulations/canada` (SSG)
- Port `us-regulatory.html` → `/regulations/us` (SSG)
- Update all internal cross-links between these pages to use Next.js routes
- Add meta tags, Open Graph, structured data to all SSG pages
- Move downloadable templates to `/public/data/`

### Phase 5 — Polish & Cutover
- Remove old `index.html`, `regulatory.html`, `aer-d065.html`, `canada-regulatory.html`, `us-regulatory.html`, `ccus-nav.js`
- Final styling pass — verify dark/light theme on all pages
- PostHog dashboard setup
- End-to-end test: sign up → free chat (3 questions) → upgrade prompt → Stripe checkout → Pro access
- DNS/Vercel confirm ccus.ca points to Next.js app

---

## 12. Out of Scope (This Build)

- TypeScript
- Mobile native app
- Real document generation (stub only — wired for Pro upsell)
- Multi-language / i18n
- Team/org accounts (Enterprise)
- MRV data ingestion pipeline
- Public API (documented for future)
