# CCUS Compass — Project Intelligence

## What This Is

CCUS Compass is the flagship product of **SubsurfaceAI** — a single-file HTML app (React via CDN, no build step) at `index.html`, deployed from the private GitHub repo `github.com/tchisti/ccus-space`. The GeoJSON data file is hosted publicly via a GitHub Gist (repo is private, `raw.githubusercontent.com` returns 404 unauthenticated).

The app currently has four tabs: AI Advisor (Claude-powered), Regulatory Tracker (live EPA Federal Register feed), Basin Map (NATCARB saline polygon map, MapLibre GL), and an updates panel.

---

## Strategic Context: Where SubsurfaceAI Plays (April 2026)

### The Industry Gap

CCUS policy tailwinds are strong (45Q at $85/$180, TIER $95+/yr, EU NZIA 50Mt target). But project execution lags ambition by ~5-10x. ~400+ projects tracked globally; operational at scale: countable on two hands. **Every startup opportunity lives in the gap between policy intent and operational reality.**

### The Macro Opportunity Map

| Gap | Pain Severity | Market Size | Defensibility | Speed to Revenue |
|---|---|---|---|---|
| MRV Platform | **Critical** | $50–500M/yr | High (data moat) | Medium (12–18mo) |
| Permitting Automation | **Critical** | $20–100M/yr | Medium | Fast (6–9mo) |
| Project Finance Modeling | **High** | $10–50M/yr | Medium-High | Fast (6–9mo) |
| Regulatory Compliance Mapping | **High** | $10–30M/yr | High (knowledge moat) | Fast (3–6mo) ← **You're here** |
| Full-Chain Integration | **High** | $50–200M/yr | Very High | Slow (18–24mo) |
| Due Diligence Engine | **Medium-High** | $5–20M/yr | Medium | Medium (9–12mo) |
| CO₂ Quality Management | **Medium** | $5–15M/yr | Medium | Medium (9–12mo) |
| Workforce Certification | **Medium** | $10–30M/yr | High (standards moat) | Medium (12mo) |
| Credit Stacking Optimizer | **Medium** | $5–15M/yr | Low-Medium | Fast (3–6mo) |
| Transport Corridor Planning | **Medium** | $5–20M/yr | Medium | Medium (12mo) |

---

## Pain Points by Stakeholder (Where to Build)

### 1. Project Developers

- **Permitting bottleneck**: 175–239 pending EPA Class VI apps; avg review 3–4 years. Developers spend $15–50M on characterization before sitting in a queue with no timeline.
  - *Opportunity*: Permitting automation — "TurboTax for CCS permits." Pre-assemble 80% of a Class VI / AER D-065 application from standardized data templates.
- **FEL cost overruns**: Front-End Loading for one CCS hub runs $30–80M. Every project re-derives the same workflows from scratch.
  - *Opportunity*: Templatized FEL intelligence platform — pre-built technical work packages, developer customizes instead of creates. $50–200K/project license.

### 2. Regulators

- **Capacity constraint**: EPA Region 6 reviewed most Class VI apps with a team in the low dozens. State primacy agencies (ND, WY, LA, WV, AZ, TX) are capacity-constrained, 12–18mo to develop a trained reviewer.
  - *Opportunity*: AI-assisted regulatory review tools sold TO regulators. Automated completeness checks, inconsistency flagging, structured review summaries. Slow procurement but sticky recurring contracts.
- **Cross-jurisdictional intelligence gap**: No single source mapping requirement equivalencies across Alberta / Louisiana / EU / UK.
  - *Opportunity*: **This is CCUS Compass's core beachhead.** The deeper play: compliance-mapping engine that generates gap analyses — "Your Alberta MMV plan satisfies 72% of EU CCS Directive Annex II. Here are the 14 gaps." A $10–50K consulting deliverable, automated to $500/report SaaS.

### 3. Investors & Lenders

- **Cannot underwrite what they cannot model**: 45Q transferability + TIER credit pricing + voluntary carbon stacking = revenue stack with 3–4 interdependent policy variables. Most are using modified O&G DCF models.
  - *Opportunity*: CCUS-specific project finance modeling platform. Monte Carlo over policy scenarios, geological outcomes, carbon price paths. Geologist and banker on the same dashboard. $20–50K/yr per fund/lender seat.
- **Manual due diligence**: Weeks of document review per deal — permits, geological reports, monitoring data.
  - *Opportunity*: AI-powered CCS due diligence engine. Upload data room → structured risk assessment with regulatory gaps, geological red flags, financial stress tests. $25–75K per-deal pricing.

### 4. Capture Technology & EPCs

- **Integration gap**: Capture vendor / EPC / pipeline operator / subsurface team — nobody owns full-chain integration. Boundary Dam and Petra Nova post-mortems both show integration failures, not technology failures.
  - *Opportunity*: Full-chain digital integration platform (heavy lift, very defensible — 18–24mo to build).
- **CO₂ stream quality management**: Real-time monitoring, excursion management, multi-source blending optimization for hubs — largely manual today.
  - *Opportunity*: CO₂ quality management SaaS. Especially valuable for hub operators (ACTL, Humber cluster, Houston Ship Channel).

### 5. MRV — The Biggest Underserved Category

MRV (Subpart RR, AER D-065 §4.1, ISO 27914 Annex C) is almost entirely manual. Operators collect 4D seismic, InSAR, DAS, DTS, wellhead pressure, groundwater sampling — and assemble it into reports by hand. The 45Q credit depends on MRV plan approval; a misreported tonne is a clawed-back credit.

- *Opportunity*: **Integrated MRV platform — the single largest startup opportunity in CCUS right now.** Ingest monitoring data streams, automate mass-balance reconciliation (Eq RR-11), generate Subpart RR / AER D-065 / ISO 27914-compliant reports, auditable chain of custody per stored tonne. Revenue model: $0.10–0.50/tCO₂ stored. At 100 Mt/yr by 2030 → $10–50M/yr from platform fees alone.

### 6. Transport & Infrastructure

- CO₂ pipeline permitting faces NIMBY opposition + PHMSA rules still in limbo (post-Satartia 2020). Route optimization + risk communication tools are underserved.

### 7. Cross-Cutting Gaps

- **Workforce**: No standardized CCS certification exists. Opportunity: SPE SRMS / ISO TC 265-aligned certification platform.
- **Credit stacking**: 45Q + TIER + voluntary market stacking rules are murky and jurisdiction-specific. Opportunity: credit stacking optimization engine — lightweight, fast to revenue.

---

## SubsurfaceAI Strategic Roadmap

The throughline: **SubsurfaceAI becomes the intelligence layer between technical subsurface reality and regulatory/financial/operational decisions.** Not a data platform. Not a consulting firm. An intelligence platform — a category of one right now.

**Expansion vectors in order of strategic leverage:**

1. **Deepen compliance mapping** (current beachhead) → jurisdiction comparison reports, gap analyses, automated equivalency tables. Own this completely.
2. **Add document generation** → MMV plan skeleton, AoR scope document, permit application pre-assembly. Highest-margin upsell, already on roadmap.
3. **Build toward MRV integration** → start with MRV plan templates from CCUS Compass, evolve to data ingestion and reporting. The knowledge base already built is the foundation for the $50–500M/yr prize.
4. **Credit stacking optimizer** → lightweight to build, immediate revenue, positions SubsurfaceAI as the financial-technical bridge investors need.

> "The industry is building the cathedral. Nobody's built the scaffolding yet. That's your opening."

---

## Heads-Up Triggers (Things to Flag During Development)

When working on CCUS Compass features, flag if:
- A new feature adds regulatory content: cross-check it covers the full jurisdiction set (EPA Class VI, AER D-065/D051, EU CCS Directive, ISO 27914, PHMSA, state primacy programs).
- UI/UX decisions limit future monetization: e.g., making features free that correspond to paid opportunities in the roadmap (compliance gap reports, document generation).
- Data sources are added: confirm they support the MRV / permitting / finance roadmap, not just informational display.
- Technical debt accumulates in the single-file architecture: at some point the app will need a proper build system before adding MRV data ingestion or multi-user features.

---

## Technical Notes

- **Stack**: Single HTML file, React 18 via CDN, Babel in-browser transpilation, MapLibre GL JS 4.3.2, CARTO Positron basemap (no API keys required).
- **Data**: NATCARB saline polygon GeoJSON (508 polygons, 5.4MB) hosted at public GitHub Gist — `https://gist.githubusercontent.com/tchisti/0de77ece7ab82de72cc967d92b469e5b/raw/natcarb_saline_poly.geojson`. 345/508 polygons have CO₂/reservoir data joined from the full NATCARB v1502 saline 10km grid (186,675 cells). Source: DOE/NETL EDX.
- **Repo**: Private (`github.com/tchisti/ccus-space`). GeoJSON must be hosted externally (Gist) for browser fetch to work.
- **AI Advisor**: Calls Claude API with Claude's API key stored client-side (entered by user). System prompt is CCUS/CCS domain-specific.
