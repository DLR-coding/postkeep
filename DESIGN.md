---
version: alpha
name: Expo
website: "https://expo.dev"
description: A React Native developer-platform whose marketing site reads like a quietly-confident infrastructure brand. The base canvas is pure white with a soft sky-blue gradient atmospheric wash behind the hero; near-black ink (`#171717`) carries body and display alike. The single brand voltage is **pure black** (`#000000`) for primary CTAs — minimal and editorial-feeling, paired with a small blue text-link accent (`#0d74ce`) reserved for inline body links. Type pairs Inter at modest weights (display 600, body 400) with JetBrains Mono on every code surface. The brand's strongest visual signature is the **device-mockup hero** — a centered MacBook + iPhone composite showing real Expo dev surfaces — over the gradient sky wash.

seo:
  title: "Expo Design System for React — Pure Black CTAs, Inter, and 24 components"
  metaDescription: "Expo's design system as a DESIGN.md file. Black #000000 CTAs, Inter + JetBrains Mono, 24 components. For React, Next.js, and AI tools."
  highlights:
    - "Single CTA voltage — pure black #000000 on every primary button, never the blue inline link color"
    - "Inter at 600 across display, JetBrains Mono on every code surface — no custom typeface"
    - "Device-mockup hero is the page chrome — MacBook plus iPhone composite over a sky-blue gradient wash"
    - "8px CTA radius, 12px card radius — compact developer-tool dialect, no pill geometry on actions"
    - "96px section rhythm with hairline borders and one soft drop shadow — atmospheric depth only inside the hero"
  tags:
    - "Developer Tools & IDEs"
    - "Mobile Platforms"
  lastUpdated: "2026-05-12"
  author:
    name: "Dov Azencot"
    url: "https://x.com/dovazencot"
  opening: |
    Expo's marketing site reads like a quietly-confident React Native developer platform. The canvas is pure white with a soft sky-blue gradient wash behind the hero band — the only atmospheric decoration on the page. Near-black ink at #171717 carries both display and body, and the single brand voltage is pure black at #000000, reserved for primary CTAs. A small blue text-link accent at #0d74ce shows up inside body copy, never on a button. The brand's strongest signature is the device-mockup hero: a centered MacBook plus iPhone composite showing real Expo dev surfaces — Expo Studio, the EAS Build dashboard, the Expo Go simulator — sitting over the sky gradient. The composite is the page chrome instead of an illustration, and it tells you what the product does without a single bullet point.

    This page packages all of that into a single DESIGN.md file using the Google Labs spec format. Inside: 24 color tokens grouped into brand, surface, atmospheric, hairline, text, and semantic; 15 type styles all running Inter except for the JetBrains Mono code style; 9 corner radii from 4px hairlines to a 9999px pill reserved for badges only; a 4px-based spacing scale that tops out at a 96px section rhythm; and 24 component recipes covering top nav, three button tiers, hero band, device mockup, feature cards in light and dark, workflow steps, code blocks, IDE mockups, two pricing tiers, text input, badge pill, ecosystem tile, CTA band, and footer.

    Feed the file to Claude, Cursor, or GitHub Copilot and the agent reproduces Expo's editorial restraint — pure black CTAs at 8px radius, Inter 600 for display, JetBrains Mono on every code surface — instead of inventing a saturated brand color the page doesn't have. Reference the tokens directly inside Tailwind config or CSS variables when you want a developer-tool surface that earns trust through neutrality rather than chrome. The discipline of refusing a saturated action color and trusting Inter at weight 600 is what makes this system worth studying.
  related:
    - href: "/design"
      title: "Browse all design systems"
      description: "The full directory of DESIGN.md files on shadcn.io, with live mockups for each."
    - href: "https://expo.dev"
      title: "Expo — the React Native platform"
      description: "Expo's marketing site — the source surface for this DESIGN.md spec, including Expo Studio and EAS."
    - href: "https://github.com/google-labs-code/design.md"
      title: "The DESIGN.md specification"
      description: "Google Labs' open spec for machine-readable design system files — the format this page is built on."
  questions:
    - id: "primary-color"
      title: "What is Expo's primary brand color?"
      answer: "Expo's primary brand color for actions is pure black — #000000, used on every primary CTA across the marketing site. There is no saturated brand voltage like Stripe's indigo or Airbnb's Rausch; the discipline is the brand. A small inline text-link blue at #0d74ce appears inside body copy, but never on a CTA or button. The sky-blue gradient wash behind the hero is atmospheric depth, not a brand color — replicating it outside the hero would break the system."
    - id: "typography"
      title: "What typography does Expo use?"
      answer: "Expo runs Inter as the single sans family across display, body, navigation, and captions, with JetBrains Mono on every code surface. There is no custom display typeface — the system trusts Inter at weight 600 for display headlines (64px hero h1, 48px subsidiary, 36px section heads) and weight 400 for body. Both fonts are freely available, so substitutes aren't needed. Display gets negative letter-spacing from -0.5px to -1.92px to tighten the editorial feel."
    - id: "shape-language"
      title: "What is Expo's shape language?"
      answer: "Compact developer-ergonomic radii. CTAs sit at 8px (`{rounded.md}`), feature cards and code blocks at 12px (`{rounded.lg}`), and the device-mockup card at 16px (`{rounded.xl}`). Pill geometry (9999px) is reserved for badges only — Expo never puts a fully rounded pill on a CTA, which is what gives the buttons their developer-tool dialect rather than a consumer-friendly feel."
    - id: "dark-mode"
      title: "Does Expo have a dark mode in this spec?"
      answer: "The marketing site is light-only on the canvas, but the system uses dark surfaces aggressively as inversion accents. Dark feature cards, code blocks, IDE mockups, and the featured pricing tier all sit on `{colors.surface-dark}` (#171717) with white text. There is no full dark-mode page in the captured marketing surfaces — dark is used as a contrast device inside a light page, not as an alternative theme."
    - id: "use-in-project"
      title: "Can I use this DESIGN.md to build a React Native or developer-tool site?"
      answer: "Yes — every color, type style, radius, and spacing value is a quoted token you can paste into Tailwind config or CSS variables. Feed the file to Claude, Cursor, or any AI tool that reads DESIGN.md and the agent will reproduce Expo's restraint: pure black CTAs at 8px radius, Inter 600 display, JetBrains Mono code, dark surfaces as contrast accents instead of theme. Especially useful when you're building a developer platform and need a brand voice that doesn't lean on a saturated action color."
    - id: "known-gaps"
      title: "What's missing from this DESIGN.md spec?"
      answer: "A few things, documented in the Known Gaps section: animation timings for the device-mockup parallax and hero entrance are out of scope; the in-app surfaces (interactive EAS dashboard, Expo Go simulator) are only partially captured via marketing mockups rather than real product UI; and form validation states beyond the focus border thickening to 2px ink weren't visible on the captured surfaces. Inter and JetBrains Mono are both freely available, so there are no licensing concerns to flag."

colors:
  primary: "#000000"
  primary-active: "#1a1a1a"
  text-link: "#0d74ce"
  text-link-secondary: "#476cff"
  ink: "#171717"
  body: "#60646c"
  body-strong: "#171717"
  muted: "#999999"
  muted-soft: "#cccccc"
  hairline: "#f0f0f3"
  hairline-soft: "#f5f5f7"
  hairline-strong: "#dcdee0"
  canvas: "#ffffff"
  canvas-soft: "#fafafa"
  surface-card: "#ffffff"
  surface-strong: "#f0f0f3"
  surface-dark: "#171717"
  surface-dark-elevated: "#1a1a1a"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  on-dark-soft: "#b0b4ba"
  gradient-sky-light: "#cfe7ff"
  gradient-sky-mid: "#a8c8e8"
  accent-warning: "#ab6400"
  accent-preview: "#8145b5"
  accent-link-bright: "#47c2ff"
  semantic-error: "#eb8e90"
  semantic-success: "#16a34a"

typography:
  display-mega:
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -1.92px
  display-xl:
    fontFamily: "'Inter', sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: -1.44px
  display-lg:
    fontFamily: "'Inter', sans-serif"
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -1.08px
  display-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.84px
  display-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: -0.5px
  title-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  body-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  caption:
    fontFamily: "'Inter', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "'Inter', sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.88px
    textTransform: uppercase
  code:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  button:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  nav-link:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 10px 18px
    height: 40px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 9px 17px
    height: 40px
  button-tertiary-text:
    backgroundColor: transparent
    textColor: "{colors.text-link}"
    typography: "{typography.button}"
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-mega}"
    padding: 96px
  device-mockup-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0"
  feature-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  feature-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  workflow-step-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  workflow-step-icon:
    backgroundColor: "{colors.surface-strong}"
    rounded: "{rounded.md}"
    size: 32px
  code-block:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 20px
  ide-mockup-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.lg}"
    padding: "0"
  pricing-tier-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px 16px
    height: 44px
  badge-pill:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 10px
  ecosystem-tile:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.md}"
    size: 64px
  cta-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    padding: 96px
  testimonial-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.body}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  footer-light:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    padding: 64px 48px
  footer-link:
    backgroundColor: transparent
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
---

## Overview

Expo's marketing site reads like a quietly-confident React-Native developer platform. The base canvas is **pure white** (`{colors.canvas}` — #ffffff) with a soft **sky-blue gradient atmospheric wash** behind the hero band. Near-black ink `{colors.ink}` (#171717) carries body and display alike. The single brand voltage is **pure black** (`{colors.primary}` — #000000) for primary CTAs — minimal and editorial-feeling. A small blue text-link accent (`{colors.text-link}` — #0d74ce) is reserved for inline body links, never as a CTA.

Type runs **Inter** as the single sans family at modest weights (display 600, body 400). JetBrains Mono carries every code surface. No custom typeface — the brand trusts Inter's editorial neutrality.

The brand's strongest visual signature is the **device-mockup hero** — a centered MacBook + iPhone composite showing real Expo dev surfaces (Expo Studio, EAS Build dashboard, the Expo Go simulator) — over a sky-blue gradient atmospheric wash. The composite is the page's chrome instead of an illustration.

**Key Characteristics:**
- Pure white canvas with sky-blue gradient atmospheric backdrop in hero only.
- Single primary CTA: pure black pill at `{rounded.md}` (8px) — compact developer-tool dialect.
- Text-link blue (`{colors.text-link}`) for inline links only — never on a CTA.
- Inter as the single sans family — no custom display typeface.
- JetBrains Mono on every code surface.
- Device-mockup hero with real Expo product surfaces is the brand chrome.
- Hairline + soft drop depth; no atmospheric brand decoration outside the hero.
- 96px section rhythm.

## Known Gaps

- Inter and JetBrains Mono are freely available — no licensing concerns.
- Animation timings (device mockup parallax, hero entrance) out of scope.
- In-app surfaces (EAS dashboard interactive, Expo Go simulator) only partially captured via marketing mockups.
- Form validation states beyond focus not visible on captured surfaces.
