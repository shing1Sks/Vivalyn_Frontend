UI GUIDE:

# Visual Benchmark Style (YC-grade Clean SaaS)

Use these as visual references for cleanliness, whitespace, and motion restraint:

![Image](https://s3-alpha.figma.com/hub/file/5712166014/97f25540-6237-4442-a694-4214910e3d13-cover.png)

![Image](https://s3-alpha.figma.com/hub/file/5673950073/afb1513c-4d02-48bb-a0d7-9242272671ff-cover.png)

![Image](https://saaspo.com/cdn-cgi/image/format%3Davif%2Cquality%3D90/https%3A//cdn.prod.website-files.com/6399d2d87f63ad4774e11dc2/67937ac9e0d97a9125cf10a1_Vercel---Hero.jpeg)

![Image](https://saaspo.com/cdn-cgi/image/format%3Davif%2Cquality%3D90/https%3A//cdn.prod.website-files.com/6399d2d87f63ad4774e11dc2/679ccda0e0eb2bbf0d341366_Crisp---Hero.jpeg)

**Design traits to copy:**

* Large whitespace
* Strong typography hierarchy
* Soft borders, not heavy shadows
* Very limited color usage
* Motion only on intent (hover / reveal)

---

# Design Tokens (Give This Directly to Dev)

## Color System

**Primary palette**

```
primary-600: indigo-600
primary-700: indigo-700
primary-50: indigo-50
```

**Neutrals**

```
bg-main: white
bg-soft: gray-50
border: gray-200
text-main: gray-900
text-muted: gray-600
text-light: gray-500
```

**Semantic**

```
success: emerald-600
warning: amber-500
danger: red-600
info: blue-600
```

**Usage rules**

* Primary color ONLY for:

  * CTAs
  * active states
  * links
  * focus rings
* No gradients for YC-style — keep flat.

---

# Typography

## Font Stack

```
Primary: Inter
Fallback: system-ui, sans-serif
```

## Scale

```
Hero H1: 48–56px / font-semibold / tight tracking
H2: 32px / font-semibold
H3: 24px / font-medium
Body-lg: 18px / regular
Body: 16px / regular
Small: 14px / medium
Micro: 12px / medium uppercase tracking-wide
```

## Rules

* Headings: gray-900
* Paragraphs: gray-600
* Max line length: 60–70ch
* Line height: 1.5 body, 1.2 headings

---

# Grid + Spacing System

## Layout Grid

```
Max width: 1200px
Content width: 1100px
Side padding: 24px
Section vertical padding: 96px desktop / 64px mobile
```

## Spacing scale (Tailwind-aligned)

```
4 = micro gap
8 = small gap
16 = component gap
24 = card padding
32 = block gap
48 = section inner gap
```

---

# Surface + Shape Rules

```
Border radius:
cards: rounded-xl
buttons: rounded-lg
inputs: rounded-lg
badges: rounded-full
```

```
Borders:
1px gray-200
no dark borders
```

```
Shadows:
default: shadow-sm only
hover: shadow-md
never heavy shadows
```

---

# Motion & Animation Spec (Important)

YC-style = **fast + subtle + purposeful**

## Global animation rules

```
duration-fast: 120ms
duration-normal: 180ms
duration-slow: 260ms
easing: ease-out
```

## Hover behaviors

* Buttons: slight darken + lift 1px
* Cards: shadow-sm → shadow-md
* Links: underline fade-in or color shift

## Entrance animations

Use only for:

* hero text
* feature cards
* charts

Pattern:

```
initial: opacity 0, y: 8px
animate: opacity 1, y: 0
duration: 0.25s
stagger: 60ms
```

No bouncing. No elastic. No parallax.

---

# Component Specs

## Buttons

### Primary Button

```
bg: indigo-600
text: white
hover: indigo-700
padding: px-5 py-3
font: medium
radius: rounded-lg
focus ring: indigo-500/30
```

### Secondary Button

```
bg: white
border: gray-200
text: gray-800
hover: gray-50
```

### Ghost Button

```
bg: transparent
text: indigo-600
hover: indigo-50
```

---

## Cards

```
bg: white
border: gray-200
radius: rounded-xl
padding: 24px
hover: shadow-md + translateY(-2px)
transition: 180ms
```

---

## Badges / Tags

```
bg: indigo-50
text: indigo-700
font: medium 12px
padding: px-3 py-1
rounded-full
```

Use for:

* “Coming soon”
* “Roadmap”
* “New”

---

## Inputs

```
border: gray-300
focus: indigo-600 ring-2 ring-indigo-200
padding: py-3 px-4
placeholder: gray-400
radius: rounded-lg
```

---

# Page Layout Spec — Landing Page

Give this section structure to Claude exactly.

---

## Header

```
height: 72px
sticky
bg: white/90 backdrop-blur
border-bottom: gray-200
```

Left: Logo
Center: Nav links
Right: Primary CTA button

Nav items:

* Product
* Use cases
* Demo
* Pricing
* Docs

CTA: **Book demo**

---

## Hero Section

**Layout: 2-column**

Left:

* Badge (“AI Training Agents”)
* H1 headline
* Subhead text
* CTA row (primary + secondary)

Right:

* Product mock card stack
* Floating report card UI
* Subtle fade-in animation

Spacing:

```
top padding: 120px
gap between columns: 64px
```

---

## Problem → Solution Block

Centered narrow column layout.

```
max width: 720px
text align: center
```

Pattern:

* small label
* H2
* paragraph
* divider line

---

## Feature Grid

```
3-column grid
gap: 24px
card layout
icon top-left
title + 2-line description
```

Hover = lift + shadow.

---

## How It Works (3 Steps)

Horizontal timeline style.

Each step:

* circle number badge
* title
* 1-line description

Connector line between steps (gray-200).

---

## Report Screenshot Section

Left: screenshot card
Right: bullet breakdown

Screenshot container:

```
rounded-xl
border gray-200
shadow-sm
```

---

## Social Proof Strip

```
bg: gray-50
logo row grayscale → color on hover
testimonial cards below
```

---

## CTA Section (Bottom)

Centered.

```
bg: indigo-600
text: white
rounded-2xl container
padding: 64px
```

Button style:
white background + indigo text.

---

# Micro-Interactions

Add these small details:

* Buttons show loading spinner on click
* Form submit → success toast (top-right)
* Copy buttons for reports
* Progress bars animate width
* Score numbers count up animation

---

# Icon Style

```
library: lucide or heroicons
stroke: 1.5px
color: gray-700
size: 20px
```

Never filled icons — outline only.

---

# Illustration Style

If used:

* line illustrations
* indigo + gray only
* no cartoons
* no heavy colors

---

# Data Visualization Style

```
bars/lines: indigo-600
grid lines: gray-200
labels: gray-500
```

No rainbow charts.

---

# Dark Mode (Optional but YC-grade)

```
bg: gray-950
cards: gray-900
text: gray-100
primary unchanged
borders: gray-800
```

Auto invert — keep brand color same.
