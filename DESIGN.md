---
version: alpha
name: Nothing Inspired Grid
description: "A stark modular product-marketing system inspired by Nothing.tech: off-white canvas, brutal black typography, hard product tiles, generous whitespace, technical captions, thin hairlines, and a confident 12-column grid. The page feels like consumer electronics packaging stretched into a website: product-first, grid-first, almost editorial, with industrial labels, minimal CTAs, and large atmospheric image panels."

colors:
  canvas: "#f4f2ec"
  canvas-warm: "#ebe8df"
  ink: "#111111"
  ink-muted: "#666666"
  ink-soft: "#8a8a8a"
  inverse-canvas: "#0b0b0b"
  inverse-ink: "#ffffff"
  surface-1: "#e8e5dc"
  surface-2: "#dedacf"
  surface-dark: "#171717"
  hairline: "rgba(0,0,0,0.16)"
  hairline-strong: "rgba(0,0,0,0.32)"
  ghost: "rgba(0,0,0,0.04)"
  accent-red: "#ff3b30"
  accent-green: "#49f7a5"
  technical-gray: "#c8c4ba"

typography:
  display-xxl:
    fontFamily: "NType82, Space Grotesk, Arial, sans-serif"
    fontSize: 118px
    fontWeight: 500
    lineHeight: 0.86
    letterSpacing: -5.2px
  display-xl:
    fontFamily: "NType82, Space Grotesk, Arial, sans-serif"
    fontSize: 84px
    fontWeight: 500
    lineHeight: 0.92
    letterSpacing: -3.8px
  display-lg:
    fontFamily: "NType82, Space Grotesk, Arial, sans-serif"
    fontSize: 56px
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: -2.2px
  headline:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: -0.8px
  subhead:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.2px
  body:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.1px
  body-sm:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: -0.05px
  caption:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.02em
    textTransform: uppercase
  micro:
    fontFamily: "IBM Plex Mono, Space Mono, monospace"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0.04em
  button:
    fontFamily: "Inter Variable, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.1px

rounded:
  none: 0px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 18px
  pill: 999px
  full: 9999px

spacing:
  hair: 1px
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 36px
  xxl: 48px
  section: 104px
  hero: 144px

grid:
  columns: 12
  gap: "clamp(12px, 1.6vw, 24px)"
  margin: "clamp(16px, 3vw, 48px)"
  maxWidth: "1440px"

components:
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: 64px
    borderBottom: "1px solid {colors.hairline}"

  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "11px 18px"

  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline-strong}"
    padding: "10px 17px"

  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "0"

  hero-product-panel:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    minHeight: "92vh"
    padding: "{spacing.xxl}"
    layout: "12-column editorial grid"

  product-card:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    border: "1px solid {colors.hairline}"
    padding: "{spacing.lg}"

  product-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.inverse-ink}"
    rounded: "{rounded.none}"
    border: "1px solid rgba(255,255,255,0.12)"
    padding: "{spacing.lg}"

  technical-label:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.micro}"
    padding: "0"

  spec-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    borderTop: "1px solid {colors.hairline}"
    padding: "12px 0"

  image-tile:
    backgroundColor: "{colors.surface-2}"
    rounded: "{rounded.none}"
    overflow: "hidden"

  footer:
    backgroundColor: "{colors.inverse-canvas}"
    textColor: "{colors.inverse-ink}"
    typography: "{typography.caption}"
    padding: "64px 48px"
---