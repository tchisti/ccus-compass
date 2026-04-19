# CCUS Compass — Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate CCUS Compass from a single 3,300-line `index.html` to a full Next.js 14 App Router app with persistent URL routing, server-side Anthropic API proxy, Stripe monetisation, Resend email, and PostHog analytics — deployed on Vercel at ccus.ca.

**Architecture:** Next.js App Router (JavaScript, no TypeScript) with file-based routing. Each current tab becomes a real URL route. All secrets move to Vercel environment variables; the browser never sees the Anthropic API key. Supabase handles auth + persistence; Stripe handles payments; Resend handles transactional email.

**Tech Stack:** Next.js 14, Supabase (`@supabase/ssr`), Stripe, Resend, PostHog, MapLibre GL 4.3.2, jsPDF 2.5.1, Brave Search API (optional)

**Source of truth for component logic:** `index.html` in this repo — all interactive logic is extracted from there. Line references below are approximate; search by function/constant name.

---

## File Map

```
(repo root)
├── app/
│   ├── layout.js                    NEW — shared nav, footer, providers
│   ├── globals.css                  NEW — port all CSS from index.html <style>
│   ├── page.js                      NEW — / homepage (SSG)
│   ├── dashboard/page.js            NEW — /dashboard client page
│   ├── chat/page.js                 NEW — /chat client page
│   ├── capture/page.js              NEW — /capture client page
│   ├── primacy/page.js              NEW — /primacy client page
│   ├── tracker/page.js              NEW — /tracker client page
│   ├── map/page.js                  NEW — /map client page
│   ├── regulatory/page.js           NEW — /regulatory SSG page
│   ├── regulations/
│   │   ├── aer-d065/page.js         NEW — SSG, port aer-d065.html
│   │   ├── canada/page.js           NEW — SSG, port canada-regulatory.html
│   │   └── us/page.js               NEW — SSG, port us-regulatory.html
│   ├── pricing/page.js              NEW — /pricing SSG page
│   └── api/
│       ├── chat/route.js            NEW — Anthropic proxy + rate limiting
│       ├── search/route.js          NEW — Brave Search proxy
│       ├── generate/route.js        NEW — document generation stub
│       ├── email/route.js           NEW — Resend transactional email
│       ├── waitlist/route.js        NEW — homepage email capture
│       └── webhooks/stripe/route.js NEW — Stripe plan sync
├── components/
│   ├── layout/
│   │   ├── Nav.js                   NEW — sticky nav with Next.js Link
│   │   └── Footer.js                NEW — shared footer
│   ├── auth/
│   │   ├── AuthProvider.js          NEW — user/plan context
│   │   └── AuthModal.js             NEW — port from index.html ~line 2040
│   ├── home/
│   │   ├── Hero.js                  NEW — port HomeView hero section
│   │   ├── StatsBar.js              NEW — 4 key stats
│   │   ├── RoleCards.js             NEW — Engineer/Regulator/Investor cards
│   │   ├── PlatformCaps.js          NEW — 4 capability cards
│   │   ├── JurisdictionStrip.js     NEW — 8 badge strip
│   │   ├── EmailCapture.js          NEW — "Join free" input → /api/waitlist
│   │   └── FooterCTA.js             NEW — homepage footer
│   ├── chat/
│   │   ├── ChatView.js              NEW — port chat UI from index.html
│   │   ├── PromptChips.js           NEW — 10 suggested prompts
│   │   ├── ChatHistory.js           NEW — session sidebar
│   │   ├── MessageBubble.js         NEW — user/assistant message display
│   │   ├── TypingDots.js            NEW — port from index.html ~line 347
│   │   ├── PdfExport.js             NEW — jsPDF export button
│   │   └── UpgradeBanner.js         NEW — free limit hit CTA
│   ├── dashboard/
│   │   ├── DashboardView.js         NEW — role tab switcher + knowledge base
│   │   ├── KnowledgeBase.js         NEW — 4-tab regulatory reference
│   │   ├── engineer/
│   │   │   ├── EngineerWorkspace.js NEW — port from index.html
│   │   │   ├── CO2PhaseCalc.js      NEW — phase & properties calculator
│   │   │   ├── InjectionPressure.js NEW — §146.88 pressure design
│   │   │   ├── PlumeFootprint.js    NEW — plume estimator
│   │   │   ├── SiteChecklist.js     NEW — 30-item checklist
│   │   │   └── MaterialCompat.js    NEW — 10 materials × 3 conditions
│   │   ├── regulator/
│   │   │   ├── RegulatorWorkspace.js NEW
│   │   │   ├── PermitChecker.js      NEW — 57-item permit checklist
│   │   │   ├── FinancialAssurance.js NEW — FA calculator
│   │   │   ├── MRVChecker.js         NEW — Subpart RR coverage
│   │   │   └── PISCScheduler.js      NEW — 50-yr schedule
│   │   └── investor/
│   │       ├── InvestorWorkspace.js  NEW
│   │       ├── CreditModeler45Q.js   NEW — 45Q NPV calculator
│   │       ├── LCOCEstimator.js      NEW — 7-tech LCOC
│   │       ├── ProjectFinanceDCF.js  NEW — IRR/DSCR/breakeven
│   │       ├── CreditStackOptimizer.js NEW — 45Q+TIER+BC+EU matrix
│   │       └── TechRiskScorecard.js  NEW — 7 techs × 6 dimensions
│   ├── tracker/
│   │   ├── TrackerView.js           NEW — port tracker UI
│   │   ├── TrackerCard.js           NEW — individual update card
│   │   └── SeverityBadge.js         NEW — critical/proposed/update badge
│   ├── map/
│   │   └── SalineMap.js             NEW — "use client", MapLibre GL
│   ├── capture/
│   │   └── CaptureView.js           NEW — 6 technologies + specs table
│   ├── primacy/
│   │   └── PrimacyView.js           NEW — 6 states + comparison
│   └── shared/
│       ├── Md.js                    NEW — port markdown renderer ~line 356
│       ├── ApiKeyModal.js           NEW — BYOK key input (localStorage)
│       └── GenerateStub.js          NEW — doc generation "coming soon" CTA
├── lib/
│   ├── supabase-browser.js          NEW — createBrowserClient()
│   ├── supabase-server.js           NEW — createServerClient() for API routes
│   ├── knowledge-base.js            NEW — port CCUS_KNOWLEDGE + STATIC_REG_UPDATES + SYS_PROMPT
│   ├── reg-context.js               NEW — port buildRegContext()
│   ├── rate-limit.js                NEW — checkAndIncrementUsage()
│   ├── stripe.js                    NEW — Stripe client
│   └── resend.js                    NEW — Resend client
├── public/
│   └── data/
│       ├── D065_Annual_Compliance_Report_Template.xlsx   MOVE from /data/
│       ├── D065_AoR_Capacity_Calculator.xlsx             MOVE from /data/
│       └── D065_Sample_Cover_Letters.docx                MOVE from /data/
├── middleware.js                    NEW — Supabase session refresh
├── next.config.js                   NEW
├── package.json                     NEW (created by create-next-app)
└── .env.local                       NEW — never committed
```

---

## Phase 1: Scaffold & Foundation

### Task 1: Bootstrap Next.js at repo root

**Files:**
- Create: `package.json`, `next.config.js`, `app/layout.js`, `app/globals.css`, `app/page.js` (via create-next-app)

- [ ] **Step 1: Run create-next-app at repo root**

```bash
cd "/Users/roomi/VS Workspace/ccus-space"
npx create-next-app@latest . --no-typescript --eslint --no-tailwind --no-src-dir --app --import-alias="@/*"
```

When prompted:
- Would you like to use TypeScript? → **No**
- Would you like to use ESLint? → **Yes**
- Would you like to use Tailwind CSS? → **No**
- Would you like your code inside a `src/` directory? → **No**
- Would you like to use App Router? → **Yes**
- Would you like to use Turbopack? → **No**
- Would you like to customize the import alias? → **Yes**, keep `@/*`

- [ ] **Step 2: Verify the scaffold compiles**

```bash
npm run dev
```

Expected: Terminal shows `✓ Ready in Xs` and `http://localhost:3000` opens a default Next.js page (black/white, "Get started by editing...").

- [ ] **Step 3: Install all dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js posthog-js
npm install stripe @stripe/stripe-js resend
```

- [ ] **Step 4: Verify no install errors**

```bash
npm run build
```

Expected: `✓ Compiled successfully`. No errors.

- [ ] **Step 5: Commit the scaffold**

```bash
git add -A
git commit -m "chore: scaffold Next.js 14 App Router at repo root"
```

---

### Task 2: Global CSS — port all styles from index.html

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css with the ported styles**

Open `app/globals.css` and replace all content with:

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; width: 100%; }
body {
  background: #070f0a;
  color: #c8ddd0;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
}

/* Light geological theme */
html[data-theme="light"],
html[data-theme="light"] body { background: #f0ede4; }
html[data-theme="light"] #root { filter: invert(1) hue-rotate(180deg); }
html[data-theme="light"] canvas { filter: invert(1) hue-rotate(180deg); }
html[data-theme="light"] ::-webkit-scrollbar-thumb { background: #c8b89a; }
html[data-theme="light"] ::-webkit-scrollbar-track { background: #f5f1e8; }

textarea, input, button { font-family: inherit; }
textarea:focus, input:focus { outline: none; }
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #1a2e1f; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #2d6b4a; }

@keyframes pulse { 0%,100% { opacity:.3; transform:scale(.8) } 50% { opacity:1; transform:scale(1.1) } }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
@keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }

.fade-in { animation: fadeIn 0.3s ease-out; }
.slide-up { animation: slideUp 0.4s ease-out; }
.hover-lift { transition: all 0.2s; }
.hover-lift:hover { transform: translateY(-2px); border-color: #5ba88a !important; }
.hover-slide { transition: all 0.2s; }
.hover-slide:hover { transform: translateX(4px); border-color: #5ba88a !important; }
.nav-btn { transition: all 0.2s; }
.nav-btn:hover { background: #12261a !important; color: #7ddfb0 !important; }
.chip { transition: all 0.2s; }
.chip:hover { border-color: #2d6b4a !important; color: #7ddfb0 !important; }
.row-hover { transition: background 0.15s; }
.row-hover:hover { background: #0d2018; }
.mono { font-family: 'JetBrains Mono', monospace; }
.tracker-card { transition: all 0.2s; }
.tracker-card:hover { border-color: #2d6b4a !important; transform: translateY(-1px); }
.impact-btn { transition: all 0.2s; }
.impact-btn:hover { background: linear-gradient(135deg, #2d6b4a, #3d8b6a) !important; color: #e0f0e8 !important; }
.filter-chip { transition: all 0.15s; }
.filter-chip:hover { border-color: #2d6b4a !important; }

/* Mobile */
.nav-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.nav-scroll::-webkit-scrollbar { display: none; }
@media (max-width: 768px) {
  .nav-btn { white-space: nowrap; }
  .chip { font-size: 0.78em !important; padding: 6px 10px !important; }
  .filter-chip { font-size: 0.78em !important; padding: 5px 10px !important; }
  .tracker-card { padding: 12px !important; }
  .row-hover { font-size: 0.82em !important; }
}
```

- [ ] **Step 2: Verify styles load**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Background should be `#070f0a` (near-black dark green). No white flash.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: port all CSS from index.html to globals.css"
```

---

### Task 3: Supabase clients + middleware

**Files:**
- Create: `lib/supabase-browser.js`
- Create: `lib/supabase-server.js`
- Create: `middleware.js`
- Create: `.env.local`

- [ ] **Step 1: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://tfxrngoruzlggtvtpwjt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_Cfoyi6h7d7QS41VuqMjLNQ_EJ0AYgH9
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase Dashboard → Settings → API → service_role key>
ANTHROPIC_API_KEY=<your Anthropic API key>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<from Stripe Dashboard>
STRIPE_SECRET_KEY=<from Stripe Dashboard>
STRIPE_WEBHOOK_SECRET=<from Stripe Dashboard → Webhooks>
RESEND_API_KEY=<from Resend Dashboard>
BRAVE_API_KEY=<from Brave Search API — optional>
NEXT_PUBLIC_POSTHOG_KEY=<from PostHog project settings>
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EOF
```

Add `.env.local` to `.gitignore` (create-next-app already does this, verify):

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` is listed.

- [ ] **Step 2: Create lib/supabase-browser.js**

```javascript
// lib/supabase-browser.js
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
```

- [ ] **Step 3: Create lib/supabase-server.js**

```javascript
// lib/supabase-server.js
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Create middleware.js**

```javascript
// middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required for @supabase/ssr
  await supabase.auth.getUser()
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 5: Verify build still passes**

```bash
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase-browser.js lib/supabase-server.js middleware.js
git commit -m "feat: add Supabase SSR clients and session middleware"
```

---

### Task 4: Supabase database schema updates

**Files:** None (SQL run in Supabase SQL Editor)

- [ ] **Step 1: Open Supabase SQL Editor**

Go to `https://supabase.com/dashboard/project/tfxrngoruzlggtvtpwjt/sql/new`

- [ ] **Step 2: Add plan + stripe columns to user_profiles**

```sql
alter table public.user_profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'enterprise')),
  add column if not exists stripe_customer_id text;
```

Click "Run". Expected: `Success. No rows returned`.

- [ ] **Step 3: Create daily_usage table**

```sql
create table if not exists public.daily_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  anon_fingerprint text,
  usage_date date not null default current_date,
  message_count int not null default 1,
  unique(user_id, usage_date),
  unique(anon_fingerprint, usage_date)
);

alter table public.daily_usage enable row level security;

do $$ begin
  create policy "Users read own usage"
    on public.daily_usage for select
    using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
```

Expected: `Success. No rows returned`.

- [ ] **Step 4: Create waitlist table**

```sql
create table if not exists public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  source text default 'homepage',
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;
-- waitlist is write-only from anonymous users (insert only via service role in API route)
```

Expected: `Success. No rows returned`.

- [ ] **Step 5: Grant service role access for API routes**

```sql
grant all on public.daily_usage to service_role;
grant all on public.waitlist to service_role;
grant all on public.user_profiles to service_role;
```

Expected: `Success. No rows returned`.

- [ ] **Step 6: Commit a migration note**

```bash
git commit --allow-empty -m "chore: Supabase schema — daily_usage, waitlist, user_profiles.plan column"
```

---

### Task 5: AuthProvider context

**Files:**
- Create: `components/auth/AuthProvider.js`

- [ ] **Step 1: Create AuthProvider.js**

```javascript
// components/auth/AuthProvider.js
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-browser'

const AuthContext = createContext({ user: null, plan: 'free', supabase: null })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [plan, setPlan] = useState('free')
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPlan(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchPlan(session.user.id)
      else setPlan('free')
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchPlan(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', userId)
      .single()
    if (data) setPlan(data.plan ?? 'free')
  }

  return (
    <AuthContext.Provider value={{ user, plan, supabase }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 2: Commit**

```bash
mkdir -p components/auth
git add components/auth/AuthProvider.js
git commit -m "feat: AuthProvider context with user + plan state"
```

---

### Task 6: ThemeProvider + Nav + Footer + shared layout

**Files:**
- Create: `components/layout/Nav.js`
- Create: `components/layout/Footer.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Create Nav.js**

```javascript
// components/layout/Nav.js
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',          icon: '⌂' },
  { href: '/dashboard', label: 'Dashboard',     icon: '◈' },
  { href: '/chat',      label: 'AI Advisor',    icon: '◉' },
  { href: '/capture',   label: 'Capture Tech',  icon: '⬡' },
  { href: '/primacy',   label: 'State Primacy', icon: '⬢' },
  { href: '/tracker',   label: 'Reg Tracker',   icon: '📡' },
  { href: '/map',       label: 'Saline Geo-Map',icon: '🗺' },
  { href: '/regulatory',label: 'Regulatory Hub',icon: '📜' },
]

export default function Nav({ onAuthClick }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setTheme(localStorage.getItem('ccus-theme') || 'dark')
    setIsMobile(window.innerWidth <= 768)
    const h = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('ccus-theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const navStyle = {
    position: 'sticky', top: 0, zIndex: 1000,
    background: '#070f0a', borderBottom: '1px solid #1a2e1f',
    display: 'flex', alignItems: 'center', gap: 0,
    height: 44, padding: '0 12px', overflowX: 'auto',
  }
  const logoStyle = {
    display: 'flex', alignItems: 'center', gap: 6,
    color: '#7ddfb0', fontWeight: 700, fontSize: '0.84em',
    textDecoration: 'none', flexShrink: 0, marginRight: 8,
    fontFamily: "'JetBrains Mono', monospace",
  }
  const iconBoxStyle = {
    width: 26, height: 26, borderRadius: 5, flexShrink: 0,
    background: 'linear-gradient(135deg,#1a4a2e,#2d6b4a)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, color: '#7ddfb0',
  }

  return (
    <nav style={navStyle} className="nav-scroll">
      <Link href="/" style={logoStyle}>
        <div style={iconBoxStyle}>⬡</div>
        {!isMobile && 'CCUS Compass'}
      </Link>

      {NAV_ITEMS.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} className="nav-btn" style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 6, fontSize: '0.82em',
            color: active ? '#7ddfb0' : '#4a6a58',
            background: active ? '#0d2018' : 'transparent',
            textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>{item.icon}</span>
            {!isMobile && <span>{item.label}</span>}
          </Link>
        )
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={toggleTheme} className="nav-btn" style={{
          padding: '4px 8px', borderRadius: 6, border: '1px solid #1a2e1f',
          background: 'transparent', color: '#4a6a58', cursor: 'pointer', fontSize: '1em',
        }}>
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button onClick={onAuthClick} className="nav-btn" style={{
          padding: '4px 10px', borderRadius: 6, border: '1px solid #1a2e1f',
          background: 'transparent', color: '#4a6a58', cursor: 'pointer',
          fontSize: '0.78em', fontFamily: "'JetBrains Mono', monospace",
        }}>
          {user ? `◉ ${user.email?.split('@')[0]}` : '⬡ Sign In'}
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Create Footer.js**

```javascript
// components/layout/Footer.js
export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid #1a2e1f', padding: '12px 20px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ fontSize: '0.75em', color: '#3a5a48', fontFamily: "'JetBrains Mono', monospace" }}>
        CCUS Compass · Developed by{' '}
        <a href="https://www.linkedin.com/in/tahirhusen/" target="_blank" rel="noopener"
          style={{ color: '#5ba88a', textDecoration: 'none' }}>
          Tahir Chisti · P.Eng · MASc
        </a>
        {' '}· SubsurfaceAI
      </span>
      <span style={{ fontSize: '0.72em', color: '#2a4a38', fontFamily: "'JetBrains Mono', monospace" }}>
        Live tracker context auto-injected · Knowledge to Aug 2025 · Paste full text for unlisted regulations · Not legal advice
      </span>
    </footer>
  )
}
```

- [ ] **Step 3: Update app/layout.js**

```javascript
// app/layout.js
'use client'
import { useState } from 'react'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth/AuthProvider'
import Nav from '@/components/layout/Nav'
import Footer from '@/components/layout/Footer'
import AuthModal from '@/components/auth/AuthModal'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-dm-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-mono' })

export default function RootLayout({ children }) {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="description" content="Navigate CCUS/CCS regulations, standards, and operations with AI-powered guidance." />
      </head>
      <body className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
        <AuthProvider>
          <Nav onAuthClick={() => setShowAuthModal(true)} />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <Footer />
          {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
        </AuthProvider>
      </body>
    </html>
  )
}
```

Note: `AuthModal` is created in Task 7 below. The layout will have a compile error until Task 7 is done — that is fine, complete Task 7 immediately after.

- [ ] **Step 4: Commit**

```bash
mkdir -p components/layout
git add components/layout/Nav.js components/layout/Footer.js app/layout.js
git commit -m "feat: shared layout — Nav, Footer, AuthProvider wrapper"
```

---

### Task 7: AuthModal component

**Files:**
- Create: `components/auth/AuthModal.js`

- [ ] **Step 1: Create AuthModal.js**

Port directly from `index.html` — search for `function AuthModal` (approximately line 2040). Extract the function body into a React component file. Key differences from the original:

```javascript
// components/auth/AuthModal.js
'use client'
import { useState } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

export default function AuthModal({ onClose }) {
  const { supabase } = useAuth()
  const [mode, setMode] = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError(''); setSuccess('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)

    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) setError(err.message)
      else setSuccess('✓ Check your email to confirm your account.')
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) setError(err.message)
      else onClose()
    }
    setLoading(false)
  }

  // Overlay + modal styles match exactly the dark-green palette in index.html
  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
  }
  const modal = {
    background: '#0b1a10', border: '1px solid #1a2e1f', borderRadius: 12,
    padding: 28, width: 360, maxWidth: '90vw',
  }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 6,
    border: '1px solid #1a2e1f', background: '#070f0a',
    color: '#c8ddd0', fontSize: '0.9em', marginBottom: 12,
  }
  const btnStyle = {
    width: '100%', padding: '10px 0', borderRadius: 6,
    background: 'linear-gradient(135deg,#1a4a2e,#2d6b4a)',
    color: '#e0f0e8', border: 'none', cursor: 'pointer',
    fontSize: '0.9em', fontWeight: 600,
  }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
          <h2 style={{ color:'#7ddfb0', fontSize:'1.1em' }}>
            {mode === 'signin' ? 'Sign In to CCUS Compass' : 'Create Account'}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#4a6a58', cursor:'pointer', fontSize:'1.2em' }}>✕</button>
        </div>

        <form onSubmit={submit}>
          <input type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle} required />

          <div style={{ position:'relative', marginBottom:12 }}>
            <input type={showPw ? 'text' : 'password'} placeholder="Password (min 8 chars)"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ ...inputStyle, marginBottom:0, paddingRight:40 }} required />
            <button type="button" onClick={() => setShowPw(p=>!p)} style={{
              position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', color:'#4a6a58', fontSize:'1.1em',
            }}>{showPw ? '🙈' : '👁'}</button>
          </div>

          {error && <div style={{ background:'#1a0808', border:'1px solid #4a1a1a', borderRadius:6, padding:'8px 12px', marginBottom:12, color:'#e07070', fontSize:'0.85em' }}>{error}</div>}
          {success && <div style={{ background:'#081a10', border:'1px solid #1a4a28', borderRadius:6, padding:'8px 12px', marginBottom:12, color:'#70e0a0', fontSize:'0.85em' }}>{success}</div>}

          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? '...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button onClick={() => { setMode(m => m==='signin'?'signup':'signin'); setError(''); setSuccess('') }}
          style={{ marginTop:14, width:'100%', background:'none', border:'none', color:'#4a6a58', cursor:'pointer', fontSize:'0.82em' }}>
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>

        <p style={{ marginTop:12, fontSize:'0.72em', color:'#2a4a38', textAlign:'center' }}>
          🔒 Your Anthropic API key is never saved to our servers. Chat history requires sign-in.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build
```

Expected: `✓ Compiled successfully` — the layout import error from Task 6 is now resolved.

- [ ] **Step 3: Commit**

```bash
git add components/auth/AuthModal.js
git commit -m "feat: AuthModal — sign in/up with Supabase, password show/hide"
```

---

### Task 8: Deploy Phase 1 to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push
```

- [ ] **Step 2: Add environment variables to Vercel**

Go to `https://vercel.com/dashboard` → Select the `ccus-space` project → Settings → Environment Variables.

Add all variables from `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `BRAVE_API_KEY` (optional)
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

- [ ] **Step 3: Verify Vercel deployment**

Vercel auto-deploys on push. Go to `https://vercel.com/dashboard` → check deployment status.

Expected: Green "Ready" status. Visit ccus.ca — should show the Next.js app (dark background, nav bar visible). The old `index.html` no longer loads as the default route.

> **Important:** At this point ccus.ca will show an empty homepage (`app/page.js` default Next.js content). That's expected — homepage content is ported in Phase 3.

---

## Phase 2: API Routes & Services

### Task 9: lib/knowledge-base.js — port knowledge data

**Files:**
- Create: `lib/knowledge-base.js`

- [ ] **Step 1: Create lib/knowledge-base.js**

This file contains three exports extracted verbatim from `index.html`:
- `CCUS_KNOWLEDGE` (lines ~79–199)
- `STATIC_REG_UPDATES` (lines ~200–321)
- `SYS_PROMPT` (lines ~323–343)

```javascript
// lib/knowledge-base.js
// Extracted verbatim from index.html — do not edit values, only structure

export const CCUS_KNOWLEDGE = {
  alberta: {
    title: "Alberta / Canada", icon: "🍁",
    items: [
      // Copy all items from CCUS_KNOWLEDGE.alberta in index.html lines 80-92
    ]
  },
  epa: {
    title: "US EPA / Federal", icon: "🇺🇸",
    items: [
      // Copy all items from CCUS_KNOWLEDGE.epa in index.html lines 93-130
    ]
  },
  international: {
    title: "International Standards", icon: "🌍",
    items: [
      // Copy all items from CCUS_KNOWLEDGE.international
    ]
  },
  operations: {
    title: "Operations & Engineering", icon: "⚙️",
    items: [
      // Copy all items from CCUS_KNOWLEDGE.operations
    ]
  },
}

export const STATIC_REG_UPDATES = [
  // Copy all 10 items verbatim from index.html lines 200-321
]

export const SYS_PROMPT = `You are **CCUS Compass** — an expert AI advisor...`
// Copy verbatim from index.html lines 323-343
```

**Extraction instructions:** Open `index.html`, copy the JavaScript value of each constant. Paste into the export statement. The values are pure JavaScript objects/arrays/strings — they work identically in a module.

- [ ] **Step 2: Verify the module exports resolve**

```bash
node -e "const kb = require('./lib/knowledge-base'); console.log(Object.keys(kb.CCUS_KNOWLEDGE), kb.STATIC_REG_UPDATES.length, typeof kb.SYS_PROMPT)"
```

Expected output: `[ 'alberta', 'epa', 'international', 'operations' ] 10 string`

- [ ] **Step 3: Commit**

```bash
git add lib/knowledge-base.js
git commit -m "feat: port CCUS_KNOWLEDGE, STATIC_REG_UPDATES, SYS_PROMPT to lib/knowledge-base.js"
```

---

### Task 10: lib/reg-context.js — port buildRegContext

**Files:**
- Create: `lib/reg-context.js`

- [ ] **Step 1: Create lib/reg-context.js**

```javascript
// lib/reg-context.js
// Extracted verbatim from index.html buildRegContext() function (~line 2254)

export function buildRegContext(query, items) {
  if (!items || items.length === 0) return ''
  const q = query.toLowerCase()
  const keywords = q.split(/\s+/).filter(w => w.length > 3)

  const BOOSTS = [
    ['45q','45q'],['class vi','class vi'],['class 6','class vi'],['aer ','aer '],
    ['d-065','d-065'],['d065','d-065'],['subpart rr','subpart rr'],['tier ','tier '],
    ['epa ','epa '],['mrv','mrv'],['phmsa','phmsa'],['sequestration','sequestration'],
    ['primacy','primacy'],['alberta','alberta'],['bcogc','bcogc'],['eu ccs','eu ccs'],
    ['45v','45v'],['inflation reduction','45q'],['endangerment','endangerment'],
    ['moratorium','moratorium'],['obbba','obbba'],['permit','permit'],
  ]

  const scored = items.map(item => {
    const haystack = (item.title + ' ' + item.desc + ' ' + item.tag + ' ' + (item.jurisdiction || '')).toLowerCase()
    let score = keywords.filter(kw => haystack.includes(kw)).length
    BOOSTS.forEach(([qkw, hkw]) => { if (q.includes(qkw) && haystack.includes(hkw)) score += 3 })
    if (item.severity === 'critical') score += 1
    return { item, score }
  })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.item)

  if (scored.length === 0) return ''

  const lines = scored.map(i =>
    `• [${i.date}] **${i.title}** (${i.tag})\n  ${i.desc}\n  Source: ${i.url || 'N/A'}`
  ).join('\n\n')

  return '\n\n---\n**LIVE REGULATORY CONTEXT** (auto-injected from CCUS Compass Regulatory Tracker):\n\n' +
    lines + '\n\n' +
    'These items are from the tracker and may post-date your knowledge cutoff. Use them as authoritative context for your response.\n---'
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/reg-context.js
git commit -m "feat: port buildRegContext to lib/reg-context.js"
```

---

### Task 11: lib/rate-limit.js

**Files:**
- Create: `lib/rate-limit.js`

- [ ] **Step 1: Create lib/rate-limit.js**

```javascript
// lib/rate-limit.js
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// Uses service role — only called from API routes (server-side)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const FREE_LIMIT = 3

/**
 * Check usage and increment counter.
 * @param {string|null} userId — authenticated user ID, or null for anonymous
 * @param {string} ipAddress — raw IP from request headers
 * @returns {{ allowed: boolean, remaining: number }}
 */
export async function checkAndIncrementUsage(userId, ipAddress) {
  const fingerprint = userId
    ? null
    : createHash('sha256').update(ipAddress + '-ccus').digest('hex')

  const matchCol = userId ? 'user_id' : 'anon_fingerprint'
  const matchVal = userId || fingerprint

  // Upsert: insert new row or increment existing
  const { data, error } = await supabaseAdmin.rpc('increment_daily_usage', {
    p_user_id: userId || null,
    p_fingerprint: fingerprint || null,
  })

  if (error) {
    // On DB error, fail open (allow the request)
    console.error('rate-limit error:', error)
    return { allowed: true, remaining: FREE_LIMIT }
  }

  const count = data ?? 1
  return { allowed: count <= FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - count) }
}
```

- [ ] **Step 2: Create the Supabase RPC function**

In Supabase SQL Editor, run:

```sql
create or replace function increment_daily_usage(
  p_user_id uuid,
  p_fingerprint text
) returns int language plpgsql security definer as $$
declare
  v_count int;
begin
  if p_user_id is not null then
    insert into public.daily_usage (user_id, usage_date, message_count)
    values (p_user_id, current_date, 1)
    on conflict (user_id, usage_date)
    do update set message_count = daily_usage.message_count + 1
    returning message_count into v_count;
  else
    insert into public.daily_usage (anon_fingerprint, usage_date, message_count)
    values (p_fingerprint, current_date, 1)
    on conflict (anon_fingerprint, usage_date)
    do update set message_count = daily_usage.message_count + 1
    returning message_count into v_count;
  end if;
  return v_count;
end;
$$;
```

Expected: `Success. No rows returned`.

- [ ] **Step 3: Commit**

```bash
git add lib/rate-limit.js
git commit -m "feat: rate limiting — checkAndIncrementUsage, Supabase RPC"
```

---

### Task 12: /api/chat route

**Files:**
- Create: `app/api/chat/route.js`

- [ ] **Step 1: Create app/api/chat/route.js**

```javascript
// app/api/chat/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { buildRegContext } from '@/lib/reg-context'
import { checkAndIncrementUsage } from '@/lib/rate-limit'
import { SYS_PROMPT, STATIC_REG_UPDATES } from '@/lib/knowledge-base'

export async function POST(request) {
  const { messages, userLevel, query, userApiKey, trackerItems } = await request.json()

  // Get authenticated user (may be null)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Determine which API key to use
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

  // If using server key (not BYOK), check rate limit for free users
  if (!userApiKey) {
    const userPlan = user ? await getUserPlan(user.id, supabase) : 'free'

    if (userPlan === 'free') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'
      const { allowed, remaining } = await checkAndIncrementUsage(user?.id || null, ip)

      if (!allowed) {
        return NextResponse.json({
          error: 'free_limit_reached',
          message: "You've used your 3 free questions today. Upgrade to Pro for unlimited access.",
          upgradeUrl: '/pricing',
        }, { status: 429 })
      }
    }
  }

  // Build system prompt with live regulatory context
  const allItems = [...STATIC_REG_UPDATES, ...(trackerItems || [])]
  const regContext = buildRegContext(query || messages[messages.length - 1]?.content || '', allItems)

  const levelCtx = userLevel === 'engineer'
    ? 'User is a technical engineer. Full technical depth, specific clause numbers, engineering parameters.'
    : userLevel === 'regulator'
    ? 'User is a regulator. Focus on compliance pathways, enforcement mechanisms, review procedures.'
    : 'User is an investor/developer. Focus on economics, risk profiles, timelines, commercial viability.'

  // Optionally inject live web search context
  const searchContext = await fetchSearchContext(query || messages[messages.length - 1]?.content || '')

  const systemPrompt = SYS_PROMPT + '\n\n' + levelCtx + regContext + searchContext

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: systemPrompt,
        messages: messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (response.status === 401) {
      return NextResponse.json({ error: 'invalid_api_key', message: 'Invalid API key.' }, { status: 401 })
    }

    const data = await response.json()
    if (!response.ok) {
      return NextResponse.json({ error: 'api_error', message: data?.error?.message || 'API error' }, { status: response.status })
    }

    const text = data.content?.map(b => b.text || '').join('\n') || 'No response received.'
    return NextResponse.json({ text })

  } catch (err) {
    return NextResponse.json({ error: 'network_error', message: 'Network error. Check your connection.' }, { status: 500 })
  }
}

async function getUserPlan(userId, supabase) {
  const { data } = await supabase.from('user_profiles').select('plan').eq('id', userId).single()
  return data?.plan || 'free'
}

async function fetchSearchContext(query) {
  if (!process.env.BRAVE_API_KEY) return ''
  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent('CCUS CCS regulation ' + query)}&count=3`,
      { headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY } }
    )
    if (!res.ok) return ''
    const data = await res.json()
    const results = (data.web?.results || []).slice(0, 3)
    if (!results.length) return ''
    const lines = results.map(r => `• ${r.title}: ${r.description} (${r.url})`).join('\n')
    return '\n\n---\n**LIVE WEB SEARCH CONTEXT:**\n' + lines + '\n---'
  } catch {
    return ''
  }
}
```

- [ ] **Step 2: Test the route locally**

Start dev server: `npm run dev`

In a new terminal:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is 45Q?"}],"userLevel":"investor","query":"What is 45Q?"}'
```

Expected: JSON response with `{ "text": "..." }` containing a CCUS answer. If `ANTHROPIC_API_KEY` is not set in `.env.local`, expect a 401 response — add the key.

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/route.js
git commit -m "feat: /api/chat — Anthropic proxy with rate limiting, BYOK, regulatory context"
```

---

### Task 13: /api/search, /api/generate, /api/waitlist routes

**Files:**
- Create: `app/api/search/route.js`
- Create: `app/api/generate/route.js`
- Create: `app/api/waitlist/route.js`

- [ ] **Step 1: Create app/api/search/route.js**

```javascript
// app/api/search/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { query } = await request.json()
  if (!query) return NextResponse.json({ results: [] })

  if (!process.env.BRAVE_API_KEY) {
    return NextResponse.json({ error: 'search_unavailable', results: [] }, { status: 503 })
  }

  try {
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent('CCUS CCS carbon sequestration ' + query)}&count=5`,
      { headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY } }
    )
    const data = await res.json()
    const results = (data.web?.results || []).map(r => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }))
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: 'search_failed', results: [] }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create app/api/generate/route.js**

```javascript
// app/api/generate/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request) {
  const { templateType } = await request.json()

  // Check if user is Pro
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'pro' || profile?.plan === 'enterprise') {
      // Future: generate real document
      return NextResponse.json({
        status: 'coming_soon',
        message: 'Document generation is being built for Pro users. You will be notified when it launches.',
        templateType,
        upgradeUrl: null,
      })
    }
  }

  return NextResponse.json({
    status: 'coming_soon',
    message: 'Document generation is a Pro feature — launching soon.',
    upgradeUrl: '/pricing',
  })
}
```

- [ ] **Step 3: Create app/api/waitlist/route.js**

```javascript
// app/api/waitlist/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { email, source = 'homepage' } = await request.json()
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('waitlist')
    .upsert({ email: email.toLowerCase().trim(), source }, { onConflict: 'email' })

  if (error) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  // Send welcome email (fire and forget)
  fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'waitlist_welcome', to: email }),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/search/route.js app/api/generate/route.js app/api/waitlist/route.js
git commit -m "feat: /api/search, /api/generate stub, /api/waitlist routes"
```

---

### Task 14: Resend email route

**Files:**
- Create: `lib/resend.js`
- Create: `app/api/email/route.js`

- [ ] **Step 1: Create lib/resend.js**

```javascript
// lib/resend.js
import { Resend } from 'resend'
export const resend = new Resend(process.env.RESEND_API_KEY)
export const FROM = 'CCUS Compass <noreply@ccus.ca>'
```

- [ ] **Step 2: Create app/api/email/route.js**

```javascript
// app/api/email/route.js
import { NextResponse } from 'next/server'
import { resend, FROM } from '@/lib/resend'

const TEMPLATES = {
  signup_welcome: ({ email }) => ({
    to: email,
    subject: 'Welcome to CCUS Compass — your CCUS intelligence platform',
    html: `
      <div style="background:#070f0a;color:#c8ddd0;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;">
        <div style="color:#7ddfb0;font-size:1.3em;font-weight:700;margin-bottom:16px;">⬡ CCUS Compass</div>
        <h1 style="color:#e0f0e8;font-size:1.4em;margin-bottom:12px;">Welcome aboard, ${email.split('@')[0]}.</h1>
        <p style="color:#8aada0;margin-bottom:20px;">You now have access to AI-powered CCUS/CCS regulatory intelligence covering Alberta, EPA Class VI, EU CCS Directive, ISO standards, and more.</p>
        <p style="color:#8aada0;margin-bottom:8px;font-weight:600;">Quick start:</p>
        <ol style="color:#8aada0;padding-left:20px;">
          <li style="margin-bottom:8px;">Open the <a href="https://ccus.ca/chat" style="color:#5ba88a;">AI Advisor</a> and select your role (Engineer / Regulator / Investor)</li>
          <li style="margin-bottom:8px;">Try the <a href="https://ccus.ca/dashboard" style="color:#5ba88a;">Dashboard tools</a> — 13 interactive calculators</li>
          <li style="margin-bottom:8px;">Check the <a href="https://ccus.ca/tracker" style="color:#5ba88a;">Regulatory Tracker</a> for the latest updates</li>
        </ol>
        <p style="color:#3a5a48;font-size:0.8em;margin-top:32px;">SubsurfaceAI · ccus.ca · Not legal or regulatory advice</p>
      </div>
    `,
  }),

  upgrade_confirmation: ({ email }) => ({
    to: email,
    subject: "You're on Pro — unlimited CCUS AI access activated",
    html: `
      <div style="background:#070f0a;color:#c8ddd0;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;">
        <div style="color:#7ddfb0;font-size:1.3em;font-weight:700;margin-bottom:16px;">⬡ CCUS Compass Pro</div>
        <h1 style="color:#e0f0e8;font-size:1.4em;margin-bottom:12px;">Pro access activated.</h1>
        <p style="color:#8aada0;margin-bottom:20px;">Unlimited AI Advisor questions, document generation (coming soon), and full access to all tools.</p>
        <a href="https://ccus.ca/chat" style="display:inline-block;background:linear-gradient(135deg,#1a4a2e,#2d6b4a);color:#e0f0e8;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open AI Advisor →</a>
        <p style="color:#3a5a48;font-size:0.8em;margin-top:32px;">SubsurfaceAI · ccus.ca · Questions? Reply to this email.</p>
      </div>
    `,
  }),

  waitlist_welcome: ({ email }) => ({
    to: email,
    subject: "You're on the CCUS Compass list",
    html: `
      <div style="background:#070f0a;color:#c8ddd0;font-family:sans-serif;padding:32px;max-width:600px;margin:0 auto;">
        <div style="color:#7ddfb0;font-size:1.3em;font-weight:700;margin-bottom:16px;">⬡ CCUS Compass</div>
        <p style="color:#8aada0;margin-bottom:20px;">Thanks for your interest. We'll notify you as new features launch.</p>
        <p style="color:#8aada0;margin-bottom:20px;">In the meantime, the free tier is live — try the AI Advisor, Dashboard tools, and Regulatory Tracker at <a href="https://ccus.ca" style="color:#5ba88a;">ccus.ca</a>.</p>
        <p style="color:#3a5a48;font-size:0.8em;margin-top:32px;">SubsurfaceAI · ccus.ca</p>
      </div>
    `,
  }),
}

export async function POST(request) {
  const { type, to, ...vars } = await request.json()
  const template = TEMPLATES[type]
  if (!template) return NextResponse.json({ error: 'Unknown template' }, { status: 400 })

  const { to: recipient, subject, html } = template({ email: to, ...vars })

  try {
    await resend.emails.send({ from: FROM, to: recipient, subject, html })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Resend error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/resend.js app/api/email/route.js
git commit -m "feat: Resend transactional email — welcome, upgrade, waitlist templates"
```

---

### Task 15: Stripe + /api/webhooks/stripe + /pricing page

**Files:**
- Create: `lib/stripe.js`
- Create: `app/api/webhooks/stripe/route.js`
- Create: `app/pricing/page.js`

- [ ] **Step 1: Create lib/stripe.js**

```javascript
// lib/stripe.js
import Stripe from 'stripe'
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
```

- [ ] **Step 2: Create app/api/webhooks/stripe/route.js**

```javascript
// app/api/webhooks/stripe/route.js
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const session = event.data.object

  if (event.type === 'checkout.session.completed') {
    const userId = session.metadata?.supabase_user_id
    const customerId = session.customer
    if (userId) {
      await supabaseAdmin.from('user_profiles').update({
        plan: 'pro',
        stripe_customer_id: customerId,
      }).eq('id', userId)

      // Send upgrade email (fire and forget)
      const user = await supabaseAdmin.auth.admin.getUserById(userId)
      if (user.data.user?.email) {
        fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'upgrade_confirmation', to: user.data.user.email }),
        }).catch(() => {})
      }
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customerId = session.customer
    await supabaseAdmin.from('user_profiles').update({ plan: 'free' })
      .eq('stripe_customer_id', customerId)
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Create app/pricing/page.js**

```javascript
// app/pricing/page.js
import Link from 'next/link'

export const metadata = {
  title: 'CCUS Compass — Pricing',
  description: 'Free and Pro plans for CCUS/CCS regulatory intelligence.',
}

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '3 AI Advisor questions per day',
      'All 13 interactive tools (Engineer / Regulator / Investor)',
      'Regulatory Tracker (live + curated)',
      'Saline Geo-Map (508 NATCARB polygons)',
      'Knowledge base (Alberta, EPA, ISO, Operations)',
    ],
    cta: 'Start Free',
    href: '/chat',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'per month',
    features: [
      'Unlimited AI Advisor questions',
      'Chat history (30 sessions)',
      'PDF chat export',
      'Document generation — MMV plan, AoR scope (coming soon)',
      'Priority support',
      'Everything in Free',
    ],
    cta: 'Upgrade to Pro',
    href: '#stripe-checkout',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Everything in Pro',
      'API access',
      'Custom integrations',
      'White-label options',
      'Dedicated support',
    ],
    cta: 'Contact Us',
    href: 'mailto:tahir@subsurfaceai.com',
    highlight: false,
  },
]

export default function PricingPage() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ color: '#7ddfb0', fontSize: '1.8em', marginBottom: 8, textAlign: 'center' }}>
        CCUS Compass Pricing
      </h1>
      <p style={{ color: '#4a6a58', textAlign: 'center', marginBottom: 48 }}>
        The intelligence layer between subsurface reality and regulatory decisions.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
        {PLANS.map(plan => (
          <div key={plan.name} style={{
            border: `1px solid ${plan.highlight ? '#2d6b4a' : '#1a2e1f'}`,
            borderRadius: 12, padding: 28,
            background: plan.highlight ? '#0b1a10' : '#070f0a',
          }}>
            <div style={{ color: plan.highlight ? '#7ddfb0' : '#5ba88a', fontWeight: 700, fontSize: '1.1em', marginBottom: 4 }}>
              {plan.name}
            </div>
            <div style={{ color: '#e0f0e8', fontSize: '2em', fontWeight: 700, marginBottom: 4 }}>
              {plan.price}
              {plan.period && <span style={{ fontSize: '0.45em', color: '#4a6a58', fontWeight: 400 }}> / {plan.period}</span>}
            </div>
            <ul style={{ listStyle: 'none', margin: '20px 0', padding: 0 }}>
              {plan.features.map(f => (
                <li key={f} style={{ color: '#8aada0', fontSize: '0.88em', padding: '5px 0', paddingLeft: 16, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#2d6b4a' }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link href={plan.href} style={{
              display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 6,
              background: plan.highlight ? 'linear-gradient(135deg,#1a4a2e,#2d6b4a)' : 'transparent',
              border: plan.highlight ? 'none' : '1px solid #1a2e1f',
              color: plan.highlight ? '#e0f0e8' : '#4a6a58',
              textDecoration: 'none', fontWeight: 600, fontSize: '0.9em',
            }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
```

Note: The Stripe checkout integration requires creating a Stripe Price ID. Do this in the Stripe Dashboard → Products → Create product "CCUS Compass Pro" → $49/mo recurring. Copy the Price ID and add `STRIPE_PRO_PRICE_ID=price_xxx` to `.env.local`. The checkout link on the Pro card will use this in a future iteration — for now the CTA links to `#stripe-checkout` which can be wired up client-side in Phase 3.

- [ ] **Step 4: Commit**

```bash
git add lib/stripe.js app/api/webhooks/stripe/route.js app/pricing/page.js
git commit -m "feat: Stripe webhook handler + /pricing page"
```

---

## Phase 3: Port Interactive Pages

### Task 16: Shared utilities — Md, ApiKeyModal, UpgradeBanner

**Files:**
- Create: `components/shared/Md.js`
- Create: `components/shared/ApiKeyModal.js`
- Create: `components/shared/UpgradeBanner.js`
- Create: `components/chat/TypingDots.js`

- [ ] **Step 1: Create components/shared/Md.js**

Port `function Md({ text })` from `index.html` ~line 356:

```javascript
// components/shared/Md.js
export default function Md({ text }) {
  const lines = (text || '').split('\n')
  return (
    <div>
      {lines.map((line, idx) => {
        // Port all regex replacements verbatim from index.html Md() function
        // (bold, italic, code, links, headers, lists)
        // See index.html lines 357-420 for full implementation
        let h = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code style="background:#1a2e1a;padding:2px 6px;border-radius:3px;font-size:0.88em;color:#7ddfb0">$1</code>')
          .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#5ba88a;text-decoration:underline">$1</a>')

        if (/^### /.test(line)) return <h3 key={idx} style={{ color:'#7ddfb0', margin:'12px 0 6px', fontSize:'1em' }} dangerouslySetInnerHTML={{ __html: h.replace(/^### /, '') }} />
        if (/^## /.test(line)) return <h2 key={idx} style={{ color:'#7ddfb0', margin:'14px 0 8px', fontSize:'1.1em' }} dangerouslySetInnerHTML={{ __html: h.replace(/^## /, '') }} />
        if (/^# /.test(line)) return <h1 key={idx} style={{ color:'#7ddfb0', margin:'16px 0 10px', fontSize:'1.25em' }} dangerouslySetInnerHTML={{ __html: h.replace(/^# /, '') }} />
        if (/^[*-] /.test(line)) return <div key={idx} style={{ paddingLeft:16, color:'#a0c8b0', lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: '• ' + h.replace(/^[*-] /, '') }} />
        if (/^\d+\. /.test(line)) return <div key={idx} style={{ paddingLeft:16, color:'#a0c8b0', lineHeight:1.6 }} dangerouslySetInnerHTML={{ __html: h }} />
        if (line.trim() === '') return <div key={idx} style={{ height:8 }} />
        return <div key={idx} style={{ color:'#c0d8c8', lineHeight:1.7 }} dangerouslySetInnerHTML={{ __html: h }} />
      })}
    </div>
  )
}
```

> **Note:** Open `index.html` and find `function Md({ text })` (~line 356). Copy the full switch/if logic for all markdown rules verbatim. The above is a skeleton — use the exact regex patterns from the source file.

- [ ] **Step 2: Create components/chat/TypingDots.js**

Port `function TypingDots()` from `index.html` ~line 347:

```javascript
// components/chat/TypingDots.js
export default function TypingDots() {
  return (
    <div style={{ display:'flex', gap:4, padding:'8px 0', alignItems:'center' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width:7, height:7, borderRadius:'50%', background:'#5ba88a',
          animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite`
        }} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create components/shared/UpgradeBanner.js**

```javascript
// components/shared/UpgradeBanner.js
import Link from 'next/link'

export default function UpgradeBanner({ remaining }) {
  return (
    <div style={{
      background: '#1a0808', border: '1px solid #4a1a1a', borderRadius: 8,
      padding: '12px 16px', margin: '8px 0', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
    }}>
      <span style={{ color: '#e07070', fontSize: '0.88em' }}>
        {remaining === 0
          ? "You've used your 3 free questions today."
          : `${remaining} free question${remaining === 1 ? '' : 's'} remaining today.`}
      </span>
      <Link href="/pricing" style={{
        background: 'linear-gradient(135deg,#4a1a1a,#6a2a2a)',
        color: '#e0a0a0', padding: '6px 14px', borderRadius: 6,
        textDecoration: 'none', fontSize: '0.82em', fontWeight: 600, flexShrink: 0,
      }}>
        Upgrade to Pro →
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Create components/shared/ApiKeyModal.js**

Port the BYOK key entry UI from `index.html` (search `KeyModal` or `apiKey`). This stores the key in `localStorage` only.

```javascript
// components/shared/ApiKeyModal.js
'use client'
import { useState } from 'react'

export default function ApiKeyModal({ onClose, onSave }) {
  const [key, setKey] = useState('')
  const [show, setShow] = useState(false)

  function save() {
    if (!key.trim()) return
    localStorage.setItem('ccus_api_key', key.trim())
    onSave(key.trim())
    onClose()
  }

  const overlay = { position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 }
  const modal = { background:'#0b1a10', border:'1px solid #1a2e1f', borderRadius:12, padding:28, width:380, maxWidth:'90vw' }

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
          <h2 style={{ color:'#7ddfb0', fontSize:'1em' }}>Enter Anthropic API Key</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'#4a6a58', cursor:'pointer', fontSize:'1.2em' }}>✕</button>
        </div>
        <p style={{ color:'#4a6a58', fontSize:'0.82em', marginBottom:14 }}>
          Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener" style={{ color:'#5ba88a' }}>console.anthropic.com</a>.
          Your key is stored in your browser only — never sent to our servers.
        </p>
        <div style={{ position:'relative', marginBottom:12 }}>
          <input type={show ? 'text' : 'password'} placeholder="sk-ant-..." value={key}
            onChange={e => setKey(e.target.value)}
            style={{ width:'100%', padding:'10px 40px 10px 12px', borderRadius:6, border:'1px solid #1a2e1f', background:'#070f0a', color:'#c8ddd0', fontSize:'0.9em' }} />
          <button type="button" onClick={() => setShow(p=>!p)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#4a6a58' }}>
            {show ? '🙈' : '👁'}
          </button>
        </div>
        <button onClick={save} style={{ width:'100%', padding:'10px 0', borderRadius:6, background:'linear-gradient(135deg,#1a4a2e,#2d6b4a)', color:'#e0f0e8', border:'none', cursor:'pointer', fontWeight:600 }}>
          Save Key
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/shared/ components/chat/TypingDots.js
git commit -m "feat: shared components — Md, TypingDots, UpgradeBanner, ApiKeyModal"
```

---

### Task 17: Homepage (/)

**Files:**
- Modify: `app/page.js`
- Create: `components/home/Hero.js`
- Create: `components/home/StatsBar.js`
- Create: `components/home/RoleCards.js`
- Create: `components/home/PlatformCaps.js`
- Create: `components/home/JurisdictionStrip.js`
- Create: `components/home/EmailCapture.js`
- Create: `components/home/FooterCTA.js`

- [ ] **Step 1: Extract HomeView from index.html**

Search `function HomeView` in `index.html`. This is the large component (~line 1800+) containing all homepage sections. Split it into the component files above.

- [ ] **Step 2: Create components/home/EmailCapture.js**

```javascript
// components/home/EmailCapture.js
'use client'
import { useState } from 'react'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'success' | 'error'

  async function submit(e) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStatus('loading')
    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'homepage' }),
    })
    setStatus(res.ok ? 'success' : 'error')
  }

  return (
    <div style={{ marginTop: 24 }}>
      {status === 'success' ? (
        <p style={{ color: '#70e0a0', fontSize: '0.9em' }}>✓ You're on the list — check your inbox.</p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email" placeholder="Enter your email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 6, border: '1px solid #1a2e1f', background: '#0b1a10', color: '#c8ddd0', fontSize: '0.9em' }}
          />
          <button type="submit" disabled={status === 'loading'} style={{
            padding: '10px 20px', borderRadius: 6, border: 'none',
            background: 'linear-gradient(135deg,#1a4a2e,#2d6b4a)',
            color: '#e0f0e8', cursor: 'pointer', fontWeight: 600, fontSize: '0.9em', flexShrink: 0,
          }}>
            {status === 'loading' ? '...' : 'Join Free →'}
          </button>
        </form>
      )}
      {status === 'error' && <p style={{ color: '#e07070', fontSize: '0.82em', marginTop: 6 }}>Something went wrong. Try again.</p>}
    </div>
  )
}
```

- [ ] **Step 3: Assemble app/page.js**

```javascript
// app/page.js
import Hero from '@/components/home/Hero'
import StatsBar from '@/components/home/StatsBar'
import RoleCards from '@/components/home/RoleCards'
import PlatformCaps from '@/components/home/PlatformCaps'
import JurisdictionStrip from '@/components/home/JurisdictionStrip'
import FooterCTA from '@/components/home/FooterCTA'

export const metadata = {
  title: 'CCUS Compass — AI-Powered CCUS Knowledge Platform',
  description: 'Navigate CCUS/CCS regulations, standards, and operations with AI-powered guidance. Alberta, EPA Class VI, ISO standards, well design, monitoring, carbon credits.',
}

export default function HomePage() {
  return (
    <div>
      <Hero />
      <StatsBar />
      <RoleCards />
      <PlatformCaps />
      <JurisdictionStrip />
      <FooterCTA />
    </div>
  )
}
```

Each sub-component (Hero, StatsBar, etc.) is extracted directly from `HomeView()` in `index.html`. Port the JSX and inline styles verbatim — the only change is replacing `React.createElement` calls (if any) with JSX syntax, and `setView('chat')` navigation calls with `<Link href="/chat">`.

- [ ] **Step 4: Test homepage loads at localhost:3000**

```bash
npm run dev
```

Navigate to `http://localhost:3000`. Expected: full homepage with hero, stats, role cards, platform capabilities, jurisdiction badges.

- [ ] **Step 5: Commit**

```bash
git add app/page.js components/home/
git commit -m "feat: homepage — Hero, StatsBar, RoleCards, PlatformCaps, JurisdictionStrip, EmailCapture"
```

---

### Task 18: AI Advisor (/chat)

**Files:**
- Create: `app/chat/page.js`
- Create: `components/chat/ChatView.js`
- Create: `components/chat/ChatHistory.js`
- Create: `components/chat/PromptChips.js`
- Create: `components/chat/MessageBubble.js`
- Create: `components/chat/PdfExport.js`

- [ ] **Step 1: Create app/chat/page.js**

```javascript
// app/chat/page.js
import ChatView from '@/components/chat/ChatView'

export const metadata = { title: 'AI Advisor — CCUS Compass' }

export default function ChatPage() {
  return <ChatView />
}
```

- [ ] **Step 2: Create components/chat/ChatView.js**

Port the chat logic from `index.html` App() function. Key changes from the original:

1. `send()` calls `POST /api/chat` instead of calling Anthropic directly
2. Remove all Anthropic fetch logic — the API route handles it
3. Keep: Supabase session persistence (chat_sessions), PDF export, user level selector, prompt chips, auth check

```javascript
// components/chat/ChatView.js
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { createClient } from '@/lib/supabase-browser'
import PromptChips from './PromptChips'
import ChatHistory from './ChatHistory'
import MessageBubble from './MessageBubble'
import TypingDots from './TypingDots'
import PdfExport from './PdfExport'
import UpgradeBanner from '@/components/shared/UpgradeBanner'
import ApiKeyModal from '@/components/shared/ApiKeyModal'

export default function ChatView() {
  const { user, plan } = useAuth()
  const supabase = createClient()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userLevel, setUserLevel] = useState('investor')
  const [apiKey, setApiKey] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('ccus_api_key') || '' : '')
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [chatSessions, setChatSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [upgradeState, setUpgradeState] = useState(null) // null | { remaining: 0 }
  const [trackerItems, setTrackerItems] = useState([])

  const chatEndRef = useRef(null)
  const userRef = useRef(null)
  const sessionIdRef = useRef(null)

  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { sessionIdRef.current = currentSessionId }, [currentSessionId])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  // Load sessions and auto-restore on sign-in
  useEffect(() => {
    if (user) loadSessions(user.id, true)
  }, [user])

  // Pre-fetch live tracker items for context injection
  useEffect(() => {
    fetch('https://www.federalregister.gov/api/v1/documents.json?fields[]=title&fields[]=publication_date&fields[]=html_url&fields[]=abstract&conditions[term]=carbon+sequestration+geologic+storage&conditions[type][]=RULE&conditions[type][]=PROPOSED_RULE&conditions[type][]=NOTICE&per_page=6&order=newest')
      .then(r => r.json())
      .then(data => {
        const items = (data.results || []).map(d => ({
          id: 'live_' + Math.random(),
          date: d.publication_date || '',
          title: d.title || '',
          desc: d.abstract || '',
          jurisdiction: 'federal',
          tag: 'US Federal',
          tagColor: '#5ba88a',
          severity: 'update',
          url: d.html_url || '#',
          source: 'Federal Register (Live)',
          live: true,
        }))
        setTrackerItems(items)
      })
      .catch(() => {})
  }, [])

  async function loadSessions(uid, autoRestore) {
    const { data } = await supabase.from('chat_sessions')
      .select('id,title,created_at,updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(30)
    setChatSessions(data || [])
    if (autoRestore && data?.length > 0) loadSession(data[0].id)
  }

  async function loadSession(id) {
    const { data } = await supabase.from('chat_sessions').select('messages').eq('id', id).single()
    if (data) { setMessages(data.messages || []); setCurrentSessionId(id); sessionIdRef.current = id }
  }

  async function persistSession(msgs, uid, sessId) {
    if (!uid) return
    const title = msgs.find(m => m.role === 'user')?.content?.slice(0, 60) || 'New session'
    if (sessId) {
      await supabase.from('chat_sessions').update({ messages: msgs, updated_at: new Date().toISOString() }).eq('id', sessId)
    } else {
      const { data, error } = await supabase.from('chat_sessions').insert({ user_id: uid, title, messages: msgs }).select('id').single()
      if (data && !error) {
        setCurrentSessionId(data.id)
        sessionIdRef.current = data.id
        loadSessions(uid, false)
      }
    }
  }

  const send = useCallback(async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setUpgradeState(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-User-Api-Key': apiKey } : {}) },
        body: JSON.stringify({
          messages: next,
          userLevel,
          query: text.trim(),
          trackerItems,
        }),
      })

      const data = await res.json()

      if (res.status === 429 && data.error === 'free_limit_reached') {
        setUpgradeState({ remaining: 0 })
        setMessages(p => [...p, { role: 'assistant', content: data.message }])
        setLoading(false)
        return
      }

      if (!res.ok) {
        setMessages(p => [...p, { role: 'assistant', content: `⚠️ **Error:** ${data.message || 'Unknown error'}` }])
        setLoading(false)
        return
      }

      const finalMsgs = [...next, { role: 'assistant', content: data.text }]
      setMessages(finalMsgs)
      persistSession(finalMsgs, userRef.current?.id, sessionIdRef.current)

    } catch {
      setMessages(p => [...p, { role: 'assistant', content: '⚠️ **Connection error.** Check your network.' }])
    }

    setLoading(false)
  }, [messages, loading, apiKey, userLevel, trackerItems])

  // Port the full JSX from index.html ChatView render (~line 2700–2960)
  // including: header with level selector + history toggle + key button + new chat,
  // history sidebar, messages list, typing indicator, upgrade banner, input area, footer note
  return (
    <div style={{ display:'flex', height:'calc(100vh - 44px)' }}>
      {/* Port ChatHistory sidebar from index.html */}
      {/* Port messages list + MessageBubble components */}
      {/* Port input area + PromptChips */}
      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} onSave={setApiKey} />}
      {upgradeState && <UpgradeBanner remaining={upgradeState.remaining} />}
    </div>
  )
}
```

> **Extraction note:** The full JSX for the chat layout is in `index.html` under the `view === 'chat'` render branch (~line 2700–2960). Port it section by section, replacing `React.createElement` with JSX. The logic above is the complete state/effects layer — the JSX is a direct port.

- [ ] **Step 3: Port remaining chat sub-components**

Extract from `index.html`:
- `ChatHistory` — session list sidebar (search for `showHistory` state usage in render)
- `PromptChips` — `SUGGESTED` array + chip buttons (~line 2800)
- `MessageBubble` — user/assistant message display with `Md` renderer
- `PdfExport` — jsPDF export button (search `exportPdf` or `jsPDF`)

Each becomes its own file. Use the `'use client'` directive.

- [ ] **Step 4: Verify chat loads and sends a message**

```bash
npm run dev
```

Navigate to `http://localhost:3000/chat`. Type a question. Expected: response appears, no "direct browser access" error (API call is now server-side).

- [ ] **Step 5: Commit**

```bash
git add app/chat/ components/chat/
git commit -m "feat: /chat — AI Advisor with server-side API proxy, session history, PDF export"
```

---

### Task 19: Dashboard (/dashboard) — 13 tools across 3 workspaces

**Files:**
- Create: `app/dashboard/page.js`
- Create: `components/dashboard/DashboardView.js`
- Create: `components/dashboard/KnowledgeBase.js`
- Create: all engineer/, regulator/, investor/ components

- [ ] **Step 1: Create app/dashboard/page.js**

```javascript
// app/dashboard/page.js
import DashboardView from '@/components/dashboard/DashboardView'
export const metadata = { title: 'Dashboard — CCUS Compass' }
export default function DashboardPage() { return <DashboardView /> }
```

- [ ] **Step 2: Port DashboardView.js**

Extract `view === 'dashboard'` render branch from `index.html` (~line 2960). This contains:
- Role selector tabs (Engineer / Regulator / Investor)
- Conditional rendering of workspace based on selected role
- 4-tab regulatory knowledge base (`CCUS_KNOWLEDGE`)

```javascript
// components/dashboard/DashboardView.js
'use client'
import { useState } from 'react'
import { CCUS_KNOWLEDGE } from '@/lib/knowledge-base'
import EngineerWorkspace from './engineer/EngineerWorkspace'
import RegulatorWorkspace from './regulator/RegulatorWorkspace'
import InvestorWorkspace from './investor/InvestorWorkspace'
import KnowledgeBase from './KnowledgeBase'

export default function DashboardView() {
  const [role, setRole] = useState('engineer')
  const [knowledgeTab, setKnowledgeTab] = useState('alberta')

  // Port the full JSX from index.html dashboard render
  // Role selector header, workspace switcher, knowledge base tabs
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px' }}>
      {/* Role selector — port from index.html */}
      {role === 'engineer' && <EngineerWorkspace />}
      {role === 'regulator' && <RegulatorWorkspace />}
      {role === 'investor' && <InvestorWorkspace />}
      <KnowledgeBase activeTab={knowledgeTab} onTabChange={setKnowledgeTab} />
    </div>
  )
}
```

- [ ] **Step 3: Port all 13 tools**

For each tool file, extract the corresponding component from `index.html`. Search by function name:

| File | Search term in index.html |
|---|---|
| `CO2PhaseCalc.js` | `CO2PhaseCalculator` or `phaseState` |
| `InjectionPressure.js` | `InjectionPressure` or `BHP` |
| `PlumeFootprint.js` | `PlumeFootprint` or `plumeR` |
| `SiteChecklist.js` | `SiteChecklist` or `checkItems` |
| `MaterialCompat.js` | `MaterialCompat` or `MATERIALS` |
| `PermitChecker.js` | `PermitChecker` or `permitItems` |
| `FinancialAssurance.js` | `FinancialAssurance` or `fa.wells` |
| `MRVChecker.js` | `MRVChecker` or `mrvItems` |
| `PISCScheduler.js` | `PISCScheduler` or `cessYear` |
| `CreditModeler45Q.js` | `CreditModeler` or `q45` |
| `LCOCEstimator.js` | `LCOCEstimator` or `lcoc` |
| `ProjectFinanceDCF.js` | `ProjectFinanceDCF` or `dcf` |
| `CreditStackOptimizer.js` | `CreditStack` or `stackRegion` |
| `TechRiskScorecard.js` | `TechRiskScorecard` or `TECHS_R` |

Add `'use client'` to each file. The internal logic (state, calculations, JSX) is a direct copy.

- [ ] **Step 4: Verify all 3 workspaces render**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard`. Switch between Engineer / Regulator / Investor tabs. Check all tools render without console errors.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/ components/dashboard/
git commit -m "feat: /dashboard — 13 tools across 3 workspaces + 4-tab knowledge base"
```

---

### Task 20: Regulatory Tracker (/tracker)

**Files:**
- Create: `app/tracker/page.js`
- Create: `components/tracker/TrackerView.js`
- Create: `components/tracker/TrackerCard.js`
- Create: `components/tracker/SeverityBadge.js`

- [ ] **Step 1: Create page and port components**

Extract `view === 'tracker'` render branch and all tracker state/effects from `index.html`. Key adaptation: the `fetchTrackerLive` function moves into `TrackerView.js` as a `useEffect`.

```javascript
// app/tracker/page.js
import TrackerView from '@/components/tracker/TrackerView'
export const metadata = { title: 'Regulatory Tracker — CCUS Compass' }
export default function TrackerPage() { return <TrackerView /> }
```

- [ ] **Step 2: Port TrackerView with live feed + STATIC_REG_UPDATES**

```javascript
// components/tracker/TrackerView.js
'use client'
import { useState, useEffect, useCallback } from 'react'
import { STATIC_REG_UPDATES } from '@/lib/knowledge-base'
import TrackerCard from './TrackerCard'
import SeverityBadge from './SeverityBadge'
// Port full tracker state and render from index.html
// fetchTrackerLive() → Federal Register API call
// allTrackerItems = [...STATIC_REG_UPDATES, ...liveItems deduped].sort(by date)
// Filter chips: all / federal / states / alberta / international
// "Explain Impact →" button calls router.push('/chat?q=...')
```

- [ ] **Step 3: Commit**

```bash
git add app/tracker/ components/tracker/
git commit -m "feat: /tracker — regulatory tracker with live Federal Register feed"
```

---

### Task 21: Saline Geo-Map (/map)

**Files:**
- Create: `app/map/page.js`
- Create: `components/map/SalineMap.js`

- [ ] **Step 1: Add MapLibre GL via CDN in layout**

Since MapLibre is a CDN script in the original, add it via Next.js `Script` component in `app/layout.js`:

```javascript
// In app/layout.js, add inside <head>:
import Script from 'next/script'

// Add inside the returned JSX:
<Script src="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.js" strategy="beforeInteractive" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.3.2/dist/maplibre-gl.css" />
```

Alternatively, install the npm package: `npm install maplibre-gl` and import directly.

- [ ] **Step 2: Create app/map/page.js**

```javascript
// app/map/page.js
import dynamic from 'next/dynamic'
export const metadata = { title: 'Saline Geo-Map — CCUS Compass' }

// Dynamic import with ssr:false — MapLibre requires browser APIs
const SalineMap = dynamic(() => import('@/components/map/SalineMap'), { ssr: false, loading: () => (
  <div style={{ height:'calc(100vh - 44px)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4a6a58' }}>
    Initialising Map…
  </div>
)})

export default function MapPage() { return <SalineMap /> }
```

- [ ] **Step 3: Port SalineMap.js**

Extract `view === 'map'` render branch and all map state/effects from `index.html`. This includes:
- MapLibre init with CARTO basemap
- NATCARB GeoJSON fetch from GitHub Gist
- 7 colour property layers
- Hover/select interactions
- Legend, controls panel, selected-cell detail panel
- "Ask AI →" button — use `router.push('/chat?basin=...')`

```javascript
// components/map/SalineMap.js
'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
// Port ALL map logic from index.html useEffect for view==='map'
// maplibregl is available via CDN Script or npm import
```

- [ ] **Step 4: Verify map loads**

```bash
npm run dev
```

Navigate to `http://localhost:3000/map`. The NATCARB map should load with the CARTO basemap and saline polygon layer. Test hover, click, colour selector.

- [ ] **Step 5: Commit**

```bash
git add app/map/ components/map/
git commit -m "feat: /map — Saline Geo-Map with MapLibre GL, NATCARB 508 polygons"
```

---

### Task 22: Capture Tech + State Primacy

**Files:**
- Create: `app/capture/page.js`
- Create: `components/capture/CaptureView.js`
- Create: `app/primacy/page.js`
- Create: `components/primacy/PrimacyView.js`

- [ ] **Step 1: Port CaptureView**

Extract `view === 'capture'` render branch from `index.html`. Contains:
- `CAPTURE_TECH` array (6 technologies with TRL, energy, cost, notes)
- Compression & Transport specs table
- Port verbatim — no logic changes needed

```javascript
// app/capture/page.js
import CaptureView from '@/components/capture/CaptureView'
export const metadata = { title: 'Capture Technologies — CCUS Compass' }
export default function CapturePage() { return <CaptureView /> }
```

- [ ] **Step 2: Port PrimacyView**

Extract `view === 'primacy'` render branch. Contains:
- `STATE_PRIMACY` array (6 states)
- Comparison table (State vs EPA Direct review)

```javascript
// app/primacy/page.js
import PrimacyView from '@/components/primacy/PrimacyView'
export const metadata = { title: 'State Primacy — CCUS Compass' }
export default function PrimacyPage() { return <PrimacyView /> }
```

- [ ] **Step 3: Commit**

```bash
git add app/capture/ app/primacy/ components/capture/ components/primacy/
git commit -m "feat: /capture and /primacy — Capture Tech and State Primacy views"
```

---

## Phase 4: SEO & Regulatory Pages

### Task 23: SSG regulatory pages

**Files:**
- Create: `app/regulatory/page.js`
- Create: `app/regulations/aer-d065/page.js`
- Create: `app/regulations/canada/page.js`
- Create: `app/regulations/us/page.js`

- [ ] **Step 1: Port regulatory.html → app/regulatory/page.js**

Open `regulatory.html`. Extract all HTML content. Convert to JSX. Replace `<script src="ccus-nav.js">` with nothing (nav is in layout). Replace `href="aer-d065.html"` with `href="/regulations/aer-d065"`, etc.

```javascript
// app/regulatory/page.js
export const metadata = {
  title: 'Regulatory Hub — CCUS Compass',
  description: 'Deep-dive regulatory guides for CCUS/CCS — EPA Class VI, AER D-065, EU CCS Directive, ISO 27914.',
}
export default function RegulatoryPage() {
  // Port regulatory.html body content as JSX
  return <div>/* ported content */</div>
}
```

- [ ] **Step 2: Port aer-d065.html → app/regulations/aer-d065/page.js**

Open `aer-d065.html` (148KB). This is a large reference page. Port the HTML body content as JSX. Update internal links:
- `href="regulatory.html"` → `href="/regulatory"`
- `href="index.html"` → `href="/"`

```javascript
export const metadata = {
  title: 'AER Directive 065 — Complete CCS Regulatory Reference | CCUS Compass',
  description: 'Full AER Directive 065 reference for CO₂ sequestration: injection operations, induced seismicity §4.1.8, monitoring requirements.',
}
```

- [ ] **Step 3: Port canada-regulatory.html and us-regulatory.html**

Same pattern. Update all internal links to use Next.js routes.

- [ ] **Step 4: Move downloadable files to public/**

```bash
mkdir -p public/data
cp "data/D065_Annual_Compliance_Report_Template.xlsx" public/data/
cp "data/D065_AoR_Capacity_Calculator.xlsx" public/data/
cp "data/D065_Sample_Cover_Letters.docx" public/data/
```

Update any `href` links in the ported pages to point to `/data/filename.xlsx`.

- [ ] **Step 5: Commit**

```bash
git add app/regulatory/ app/regulations/ public/data/
git commit -m "feat: SSG regulatory pages — /regulatory, /regulations/aer-d065, /canada, /us"
```

---

## Phase 5: Polish & Cutover

### Task 24: PostHog analytics

**Files:**
- Create: `components/analytics/PostHogProvider.js`
- Modify: `app/layout.js`

- [ ] **Step 1: Create PostHogProvider.js**

```javascript
// components/analytics/PostHogProvider.js
'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'

export default function PostHogProvider({ children }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // manual below
    })
  }, [])

  useEffect(() => {
    posthog.capture('$pageview', { path: pathname })
  }, [pathname])

  return children
}

// Export helper for custom events — import this in components
export function track(event, props = {}) {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.capture(event, props)
  }
}
```

- [ ] **Step 2: Add to layout.js**

Import and wrap children with `<PostHogProvider>` in `app/layout.js`.

- [ ] **Step 3: Add key tracking calls**

In `ChatView.js` `send()`: `track('ai_question_sent', { userLevel, plan, queryLength: text.length })`

In `UpgradeBanner.js` render: `useEffect(() => track('upgrade_prompt_seen', { source: 'chat' }), [])`

In `EmailCapture.js` success: `track('email_captured', { source: 'homepage' })`

In `SalineMap.js` cell click: `track('map_cell_selected', { basinName })`

- [ ] **Step 4: Commit**

```bash
git add components/analytics/
git commit -m "feat: PostHog analytics — page views + custom events"
```

---

### Task 25: Cutover — remove old HTML files

> **Only do this after verifying full feature parity on ccus.ca.**

- [ ] **Step 1: End-to-end verification checklist**

Test every feature on `https://ccus.ca`:
- [ ] All 7 routes load and refresh correctly
- [ ] AI Advisor sends a message (no client-side API key exposure)
- [ ] Free limit (3 questions) triggers upgrade prompt
- [ ] Sign up → welcome email received
- [ ] Saline Geo-Map loads 508 polygons
- [ ] "Ask AI →" from map opens /chat with basin context
- [ ] Regulatory Tracker loads live Federal Register feed
- [ ] All 13 tools in Dashboard work
- [ ] Chat history saves and restores
- [ ] PDF export downloads correctly
- [ ] Dark/light theme toggle persists on refresh
- [ ] /regulations/aer-d065 loads and Google can index it
- [ ] /pricing page shows 3 tiers

- [ ] **Step 2: Remove legacy files**

```bash
git rm index.html regulatory.html aer-d065.html canada-regulatory.html us-regulatory.html ccus-nav.js
```

- [ ] **Step 3: Remove old data directory (files are now in public/)**

```bash
git rm -r data/
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: remove legacy HTML files — Next.js migration complete"
git push
```

- [ ] **Step 5: Verify Vercel deployment**

Confirm `https://ccus.ca` serves the Next.js app with no 404s on any route.

---

## Self-Review Notes

- All 13 tools covered in Task 19 with explicit search terms for extraction
- Rate limiting SQL function is explicit, no ambiguity
- Stripe checkout flow: Note that wiring the Pro CTA button to a real Stripe Checkout Session requires creating a `/api/stripe/checkout` route that creates a session with `metadata: { supabase_user_id: user.id }` — this was omitted for brevity but should be added between Task 15 and Task 16. The webhook in Task 15 reads `session.metadata.supabase_user_id`.
- MapLibre: `dynamic(() => import(...), { ssr: false })` is critical — MapLibre uses `window` on import and will crash SSR without this
- `app/layout.js` uses `'use client'` because of `useState` for `showAuthModal` — this is correct for App Router client layouts
- `lib/supabase-server.js` uses `cookies()` from `next/headers` — this is a Server Component API, only usable in API routes and Server Components, not in client components
