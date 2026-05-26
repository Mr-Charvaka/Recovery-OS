---
name: Monolith Grid
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f4'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e3e2e2'
  on-secondary-container: '#646464'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1c'
  on-tertiary-container: '#838484'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#e2e2e2'
  tertiary-fixed-dim: '#c6c6c6'
  on-tertiary-fixed: '#1a1c1c'
  on-tertiary-fixed-variant: '#454747'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display:
    fontFamily: Inter
    fontSize: 64px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

This design system is built on the principles of **Swiss Minimalism** and **Bauhaus functionality**. It rejects all decorative ornamentation—shadows, gradients, and depth effects—in favor of structural honesty and clinical precision. The aesthetic is defined by a strict adherence to a monochromatic palette and a rigorous 1px border logic.

The target audience includes professionals in architecture, high-end engineering, and legal sectors who demand clarity over distraction. The UI should evoke a sense of absolute reliability, intellectual focus, and timeless architectural stability. It is a "content-first" system where the interface exists only to frame and facilitate the data it contains.

## Colors

The palette is strictly binary to maximize contrast and legibility. 

- **Primary (#000000):** Used for all structural borders, primary text, and active states.
- **Neutral (#FFFFFF):** The universal background color. No "off-whites" are permitted; the canvas must be pure.
- **Secondary (#757575):** Reserved exclusively for meta-data, disabled states, and secondary labels to create a clear visual hierarchy without introducing hue.
- **Tertiary (#E5E5E5):** Used for subtle dividers or hovered background states where a black border would be too aggressive.

Interactive elements do not change color on hover; they invert (Black background with White text).

## Typography

This design system utilizes **Inter** for its neutral, systematic character and exceptional legibility at small sizes. 

- **Headlines:** Use tight tracking and heavy weights. Large display type should feel architectural.
- **Body:** Set with generous line-height (1.6) to ensure readability amidst the high-contrast environment.
- **Labels:** Small labels use increased letter-spacing and uppercase styling to differentiate functional UI from narrative content.
- **Scaling:** On mobile devices, headline sizes drop significantly to maintain the "white space" ratio, preventing the black text from overwhelming the viewport.

## Layout & Spacing

The layout is governed by a **strict 12-column fixed grid** on desktop and a **4-column fluid grid** on mobile. 

- **The Grid:** All elements must align to the 4px baseline grid. 
- **Whitespace:** Use "oversized" margins (64px+) to separate distinct content sections. This acts as a visual "breather" that replaces the need for shadows or color blocks.
- **Borders:** Containers should use 1px black borders. When multiple containers are adjacent, they should share a single 1px border (collapse borders) to maintain the clinical, wireframe-like aesthetic.
- **Responsive:** On tablet and mobile, vertical stack patterns are mandatory. Do not use side-by-side columns if they result in less than 32px of horizontal whitespace.

## Elevation & Depth

There is zero Z-axis depth in this design system. 

- **No Shadows:** Do not use box-shadows or drop-shadows under any circumstances.
- **Structural Layering:** Hierarchy is established through 1px borders and line weight. An "elevated" element (like a modal) is simply a white box with a 2px black border placed on top of the existing layout, often with a solid #000000 backdrop at 40% opacity to dim the background.
- **The "Heavy" State:** To show focus or selection, increase the border width from 1px to 2px or 3px rather than using color or shadow.

## Shapes

The shape language is **exclusively rectangular**. 

- **Sharp Corners:** All buttons, inputs, cards, and modals must have a 0px border radius. 
- **Geometric Rigidity:** This reinforces the "clinical" and "architectural" feel. Roundness is perceived as "soft" or "friendly," which contradicts the functionalist intent of this system. 
- **Icons:** Use stroke-based, geometric icons with 90-degree caps and joins. Avoid rounded terminals in iconography.

## Components

- **Buttons:** 
  - *Primary:* Solid black background, white text, 0px radius.
  - *Secondary:* White background, 1px black border, black text.
  - *Hover State:* Complete inversion of colors.
- **Input Fields:** 
  - 1px black border, 0px radius. Place labels above the field in `label-sm` (uppercase). Focus state increases border to 2px.
- **Chips/Tags:** 
  - Small rectangular boxes with 1px black borders. No fill.
- **Lists:** 
  - Separated by 1px horizontal lines only. No vertical lines within lists unless it is a data table.
- **Cards:** 
  - Simple 1px black border containers. Use generous internal padding (32px) to ensure content does not feel cramped against the sharp corners.
- **Checkboxes:** 
  - Square 1px borders. When checked, the box is filled solid black or contains a sharp, non-rounded "X" mark.
- **Modals:** 
  - Heavy 2px black border. Sharp corners. Positioned strictly in the center of the viewport.