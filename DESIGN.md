---
name: Pricing Tool
description: A paper-light lending workspace with a dark evergreen rail and distinct product accents.
colors:
  bg: "oklch(0.985 0.003 190)"
  surface: "oklch(1 0 0)"
  panel: "oklch(0.958 0.008 185)"
  border: "oklch(0.9 0.01 185)"
  border-strong: "oklch(0.62 0.018 185)"
  ink: "oklch(0.215 0.022 185)"
  ink-muted: "oklch(0.46 0.022 185)"
  rail: "oklch(0.19 0.03 175)"
  rail-raised: "oklch(0.24 0.036 175)"
  rail-active: "oklch(0.3 0.048 172)"
  rail-ink: "oklch(0.968 0.007 170)"
  rail-muted: "oklch(0.73 0.03 172)"
  rail-accent: "oklch(0.85 0.146 164)"
  brand: "oklch(0.44 0.095 168)"
  brand-strong: "oklch(0.37 0.085 168)"
  brand-ink: "oklch(0.99 0.01 168)"
  brand-soft: "oklch(0.945 0.038 168)"
  brand-deep: "oklch(0.235 0.045 172)"
  brand-deep-muted: "oklch(0.74 0.035 170)"
  brand-glow: "oklch(0.87 0.13 164)"
  personal: "oklch(0.46 0.145 295)"
  commercial: "oklch(0.45 0.11 240)"
  ok: "oklch(0.45 0.11 152)"
  ok-soft: "oklch(0.955 0.038 152)"
  warn: "oklch(0.46 0.092 75)"
  warn-soft: "oklch(0.955 0.055 78)"
  alert: "oklch(0.5 0.17 25)"
  alert-soft: "oklch(0.952 0.04 25)"
  info: "oklch(0.48 0.11 248)"
  info-soft: "oklch(0.955 0.03 248)"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "3.1rem"
    fontWeight: 600
    lineHeight: 1
  headline:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Source Serif 4, Georgia, Times New Roman, serif"
    fontSize: "1.3rem"
    fontWeight: 600
  body:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "Source Sans 3, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  control: "8px"
  form-control: "0.5rem"
  surface: "1rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  section: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  navigation-item:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.form-control}"
    padding: "0 0.75rem"
  status-badge:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
  product-card:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "1.25rem"
  decision-band:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.rail-ink}"
    rounded: "{rounded.surface}"
    padding: "1.25rem"
---

# Design System: Pricing Tool

## Overview

**Creative North Star: "The Ruled Ledger"**

A calm, precise operating workspace: near-white paper, hairline divisions and readable figures beside a near-black evergreen rail. Source Sans 3 carries controls and explanations; Source Serif 4 supplies headings and the tabular numbers that give results their printed-ledger character.

The original product interface is the source of truth. This demo copies its components, layout, navigation, typography and interaction patterns; changes are limited to neutral branding, fictional policy and browser-local operations. Dense forms and saved records remain legible through grouped sections, space, disclosure controls and a prominent dark decision panel.

**Key Characteristics:**

- Continuous paper-light workspace with a dark navigation rail.
- Evergreen, iris and azure accents distinguish lending areas.
- Serif tabular figures anchor rates, repayments and financial comparisons.
- Hairlines, restrained tint and explicit labels organize information.

## Colors

The palette combines cool paper neutrals with muted product colors and brighter figures on dark result surfaces. CSS OKLCH values in the frontmatter remain normative.

### Primary

**Evergreen** is the default application and Home accent. Its strong, soft, deep and glow variants connect actions, product cards and the decision panel.

### Secondary

**Iris violet** identifies Personal lending; **azure** identifies Commercial lending. Each product container replaces the brand family, including focus, dark-result and pale-surface variants.

### Neutral

**Paper, white surface and pale panel** organize content. **Ink and muted ink** supply text hierarchy. **Evergreen rail** uses its own raised, active, light-text and focus colors. Hairline borders divide content; the stronger border identifies editable controls.

**The Product Scope Rule.** Product containers change brand colors; semantic success, warning, alert and information colors remain consistent across lending areas.

## Typography

**Display Font:** Source Serif 4 with Georgia and Times New Roman fallbacks.  
**Body Font:** Source Sans 3 with UI sans-serif and system fallbacks.

The root size is 15px. Page headings generally use the headline role; the overview grows to 2.4rem on wider screens. Section headings use the title role. Supporting prose and controls use compact sans-serif text; workspace labels use the label role. The display role belongs to the rate in the dark decision band.

**The Aligned Figures Rule.** Use Source Serif 4 with `font-variant-numeric: tabular-nums` for rates, money and comparative numeric columns.

## Layout

The desktop shell has a sticky 248px rail and a flexible content area capped at 1600px. At the large breakpoint, the mobile top bar becomes the rail; mobile navigation opens a modal drawer up to 290px wide or 85vw. Main content padding progresses from 1rem to 1.5rem and 2rem.

The overview becomes three product columns at the large breakpoint. Forms use grouped sections and a separate result region. Saved decision panels stack their sections on narrow screens and form three columns on desktop. Saved-quote tables use the original compact cards with product-specific metrics on mobile. Print output removes navigation and actions, retaining content and its explanatory title.

## Elevation & Depth

Hairline rules, space and tonal surfaces provide everyday separation. The medium soft shadow emphasizes the dark decision panel and floating menus. Flat product cards and form regions do not need that emphasis.

**The Decision Emphasis Rule.** Concentrate dark tonal depth and the largest luminous figures in the pricing decision panel.

## Shapes

Workspace controls use the control radius; preserved form controls use the closely related rem-based form-control radius. Product and decision surfaces use the surface radius. Status badges use full pill corners and a small dot alongside text. Content divisions remain straight, thin rules.

## Components

**Buttons.** All screens use the original shared button system: solid product-color primary, bordered secondary, ghost and destructive variants. Controls have a 44px minimum height, medium weight, short color transitions and a one-pixel press movement.

**Fields.** White inputs have a stronger one-pixel boundary, generous control padding and a visible two-pixel focus outline. Workspace labels sit above the field. Disabled controls retain their shape and reduce opacity.

**Navigation.** Muted light text and outlined SVG icons sit on evergreen chrome. The active row uses a lighter evergreen fill and light text. Lending, Reference and Administration groups preserve the original hierarchy. Each product has a compact identity header and segmented Quotes, New quote and Guide tabs. Mobile navigation preserves the hierarchy with a focus-trapped drawer and an explicit close control.

**Status badges.** Text carries the status meaning; a dot, matching foreground and soft background reinforce it. Semantic colors remain independent of the product accent.

**Product cards.** Soft product-color surfaces group a product heading, saved-record list and actions. Hairlines separate records; serif rates form the right-hand comparison column.

**Guides.** Score and profitability are separate linked views. Preserve the original section order, category charts, factor tables, score curves, worked examples, waterfalls and formulas. All numerical examples must use the fictional policy and agree with the browser calculations.

**Market Search.** Preserve the original search field, refinements, editorial result rows, sticky product details, comparison table and mobile comparison dock. The catalogue is a fixed fictional fixture.

**Configuration.** Preserve the original grouped navigation, horizontal section tabs, dense row forms, linked save/delete controls, score editor, policy preview and governance tables. Keep the exact field grouping and disclosure patterns; local persistence messages explain the demo boundary.

**Decision band.** A deep product-color surface holds the large rate, approval explanation and repayments. Light text, luminous figures and subtle internal dividers maintain hierarchy. Reasons disclose in place.

## Do's and Don'ts

### Do:

- **Do** preserve the paper workspace, evergreen navigation and scoped product colors.
- **Do** use serif tabular figures for financial comparisons.
- **Do** keep visible focus, labelled status and 44px control targets.
- **Do** respect reduced motion and retain readable content in print.

### Don't:

- **Don't** communicate review status through color alone.
- **Don't** recolor semantic status tones when switching product areas.
- **Don't** apply the decision panel's emphasis to every content section.
