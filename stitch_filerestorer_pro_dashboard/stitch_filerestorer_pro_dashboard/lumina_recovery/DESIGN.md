---
name: Lumina Recovery
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-stats:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  section-gap: 48px
  sidebar-width: 280px
---

## Brand & Style
The design system is engineered for **FileRestorer Pro**, a high-performance utility where speed, security, and precision are paramount. The brand personality is authoritative yet cutting-edge, evoking the feeling of a sophisticated digital laboratory.

The design style is a hybrid of **Corporate Modern** and **Glassmorphism**. It utilizes a deep, nocturnal foundation to reduce eye strain during intensive data recovery sessions, punctuated by vibrant, glowing accents that signify activity and success. The interface relies on high-quality typography and translucent layering to create a sense of depth and technical sophistication, ensuring users feel they are using an enterprise-grade tool.

## Colors
The palette is centered on a high-contrast dark theme. The **Primary Background (#0A0F1D)** provides a deep, void-like canvas that allows UI elements to pop. 

- **Accent Primary (#6366F1):** Used for primary actions, focus states, and active scanning indicators.
- **Accent Success (#10B981):** Dedicated to recovered files, completed tasks, and healthy drive status.
- **Accent Warning (#F59E0B):** Used for critical data loss alerts and interrupted processes.
- **Surface Layering:** Containers use a translucent variation of #121B2D with 80% opacity to facilitate glassmorphic effects.

## Typography
The system uses **Outfit** for display and headings to provide a modern, geometric feel that looks "engineered." **Inter** is used for all functional body text and interface labels to ensure maximum legibility at small sizes during complex data operations.

For technical data—such as hex codes, file paths, and recovery sectors—**JetBrains Mono** is introduced as a secondary mono font to maintain the "pro" utility aesthetic. All typography should prioritize high contrast, using pure white (#FFFFFF) for primary headers and muted slate (#94A3B8) for secondary metadata.

## Layout & Spacing
This design system employs a **Fixed Grid** model for desktop, centered on a 12-column system. The layout is structured around a persistent left-hand navigation sidebar and a primary workspace area.

- **Rhythm:** A strict 8px spacing scale governs all margins and paddings.
- **Margins:** Desktop views use 32px outer margins, while internal containers use 24px padding.
- **Density:** High-density layouts are preferred for file lists, while "Step-by-Step" wizards utilize generous whitespace (48px+ gaps) to focus user attention.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and **Tonal Layering** rather than traditional heavy shadows.

- **Glass Effects:** Surfaces use a 12px to 20px Backdrop Blur.
- **Borders:** Instead of shadows, use "Inner Glow" borders: a 1px solid stroke at 10% white opacity on the top and left edges to simulate light hitting a glass edge.
- **Active States:** Elevated elements (like a selected file) should use a subtle outer glow using the Primary Accent color with 15% opacity and a 20px blur to simulate "active energy."

## Shapes
The shape language is "Soft Tech." Elements are rounded enough to feel modern and accessible, but sharp enough to maintain a professional, utility-first appearance.

- **Standard Elements:** Buttons, inputs, and small cards use a **0.5rem (8px)** radius.
- **Large Containers:** Main dashboard panels and glassmorphic cards use **1rem (16px)** to soften the large surface areas.
- **Status Pills:** Indicators and tags use a fully rounded (pill) shape to distinguish them from interactive buttons.

## Components
### Buttons & Actions
Primary buttons feature a subtle gradient of the Accent Primary color and a slight "drop glow" (shadow-color: primary, blur: 10px, opacity: 0.3). Secondary buttons are "Ghost" style with a 1px white-alpha border.

### Glassmorphic Cards
Cards are the primary layout unit. They must have `backdrop-filter: blur(12px)`, a background color of `#121B2D` at 80% opacity, and a 1px border of `#FFFFFF` at 10% opacity.

### Progress Bars
Sleek, 4px tall tracks. The "filled" portion should use the Primary Accent with a neon glow effect. For recovery in progress, use a striped "marching ants" animation.

### Status Pills
High-contrast indicators (e.g., "Deep Scan", "Encrypted"). Use a background with 10% opacity of the status color (Success, Warning, or Primary) and a solid 1px border of the same color.

### Input Fields
Inputs are dark-filled (#0A0F1D) with a 1px border that glows Accent Primary upon focus. Use monospaced font for file path inputs.

### File Lists
Data-heavy rows with alternating subtle background tints. Use hover states that apply a 5% white overlay to indicate selection readiness.