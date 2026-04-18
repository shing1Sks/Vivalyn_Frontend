# Vivalyn Frontend — Future Build Notes

This file tracks planned pages and features that are scoped but not yet built.
Implementation order is not implied — these are parked until explicitly picked up.

---

## Pages to Build

### 1. Pricing Page (Standalone, `/pricing`)

A dedicated full-page pricing experience beyond the landing section.

**Core concept:** Interactive cost/impact bar with 4 plan tiers.
- A horizontal slider/bar (4 stops, but continuous between them) representing plan scale.
- As the user drags the bar, an animated visualization shows how their organization's workflow transforms — e.g. paper-based learners shift to digital, teachers shift from manual grading to AI-assisted, employees shift from in-person training to async agent sessions.
- The animation should show different user archetypes (students with papers → phones/computers, managers with checklists → dashboards, trainers with whiteboards → AI agents) morphing gradually as the bar moves.
- Not a price-per-seat table — it is a scale/impact visualizer. The 4 stops correspond to the 4 plan tiers (Trial, Starter, Growth, Pro).
- Cost shown dynamically as the bar moves. Emphasis on org-level transformation, not individual feature comparison.

**Notes:**
- This is a marketing/conversion page, not a billing page.
- Should link from footer (Product section) and from the main nav.
- The animation concept requires custom SVG or Framer Motion scene work.

---

### 2. Agent Detail Pages

Individual deep-dive pages for each agent type. Linked from footer (Product section).

#### 2a. QnA Assessment Agent (`/agents/qna`)
- What it is, how it works, use cases
- Feature breakdown with examples
- FAQ specific to QnA agents
- CTA to start trial or book demo

#### 2b. General Agent (`/agents/general`)
- What it is, how it works, use cases
- Feature breakdown with examples
- FAQ specific to general agents
- CTA

**Notes:**
- These pages anchor to specific content (footer links should use `#` fragment if needed).
- Not to be confused with the live agent session route (`/agent/:agentId`).

---

### 3. Case Studies (`/case-studies`)

Customer success stories — to be populated when customers are available.
- Card grid layout, each card links to a full case study detail page.
- Placeholder/coming-soon state acceptable until content is ready.

---

### 4. Company Pages

#### 4a. About (`/about`)
- Company story, mission, team.

#### 4b. Blog (`/blog`)
- Articles, updates, thought leadership.
- May eventually be CMS-driven.

#### 4c. Contact (`/contact`)
- Contact form or direct email/calendar link.
- Distinct from the Support page (which is Stripe-compliance-driven and operational).

---

## Footer Link Plan

When the above pages are built, update `FOOTER_LINKS` in `src/lib/constants.ts`.

Current footer has: Product | Company | Resources sections.

**Proposed final footer structure:**

### Product
- General Agents → `/agents/general` *(build later)*
- QnA Assessment Agents → `/agents/qna` *(build later)*
- Simulation Agents → `#products` *(landing anchor, until dedicated page)*
- Pricing → `/pricing` *(build later)*

### Company
- About → `/about` *(build later — commented out in footer for now)*
- Blog → `/blog` *(build later — commented out in footer for now)*
- Contact → `/contact` *(build later — commented out in footer for now)*

### Resources
- Support → `/support` *(already built — Stripe compliance)*
- Documentation / Help → *(build later — commented out for now)*
- Case Studies → `/case-studies` *(build later — commented out for now)*

### Legal *(new section — all built for Stripe compliance)*
- Terms of Service → `/terms`
- Privacy Policy → `/privacy`
- Refund & Cancellation Policy → `/refund-policy`

---

## Nav Link Plan

Future nav additions (currently anchors on landing page):
- `/pricing` standalone page — replace `#pricing` anchor once the page is built.
- Agent detail links could optionally appear in a Products dropdown.

---

## Notes on the Interactive Pricing Visualization

The bar animation idea (section 1 above) is the most technically ambitious piece.
Key design decisions to resolve before building:

1. SVG scene vs. Lottie animation vs. pure Framer Motion layout transitions.
2. Whether the 4 stops are hard snap points or fully fluid (user said fluid, with snapping as guides).
3. Exact archetypes to animate: students (paper → phone), trainers (whiteboard → agent), managers (checklist → dashboard) — confirm with product/design before building.
4. Mobile behavior: vertical bar or collapsed representation.
