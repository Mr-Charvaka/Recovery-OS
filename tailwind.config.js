/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "on-background": "#1a1c1c",
        "surface-container-low": "#f3f3f4",
        "secondary": "#5e5e5e",
        "on-primary-container": "#848484",
        "background": "#f9f9f9",
        "error": "#ba1a1a",
        "surface-variant": "#e2e2e2",
        "primary-fixed-dim": "#c6c6c6",
        "surface-bright": "#f9f9f9",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "surface-container-high": "#e8e8e8",
        "tertiary-fixed": "#e2e2e2",
        "tertiary-container": "#1a1c1c",
        "surface-dim": "#dadada",
        "on-error-container": "#93000a",
        "surface-container-highest": "#e2e2e2",
        "on-primary": "#ffffff",
        "on-secondary-fixed-variant": "#464747",
        "primary": "#000000",
        "surface-container-lowest": "#ffffff",
        "on-secondary-container": "#646464",
        "tertiary": "#000000",
        "inverse-on-surface": "#f0f1f1",
        "surface-container": "#eeeeee",
        "secondary-fixed-dim": "#c7c6c6",
        "on-secondary-fixed": "#1b1c1c",
        "inverse-surface": "#2f3131",
        "primary-container": "#1b1b1b",
        "surface-tint": "#5e5e5e",
        "on-tertiary": "#ffffff",
        "on-surface": "#1a1c1c",
        "outline": "#7e7576",
        "on-primary-fixed": "#1b1b1b",
        "on-surface-variant": "#4c4546",
        "on-secondary": "#ffffff",
        "on-tertiary-container": "#838484",
        "secondary-fixed": "#e3e2e2",
        "on-tertiary-fixed": "#1a1c1c",
        "secondary-container": "#e3e2e2",
        "surface": "#f9f9f9",
        "on-primary-fixed-variant": "#474747",
        "primary-fixed": "#e2e2e2",
        "outline-variant": "#cfc4c5",
        "tertiary-fixed-dim": "#c6c6c6",
        "inverse-primary": "#c6c6c6",
        "on-tertiary-fixed-variant": "#454747"
      },
      borderRadius: {
        "DEFAULT": "0px",
        "lg": "0px",
        "xl": "0px",
        "full": "0px"
      },
      spacing: {
        "container-max": "1280px",
        "xl": "64px",
        "lg": "32px",
        "xs": "4px",
        "unit": "4px",
        "gutter": "24px",
        "md": "16px",
        "sm": "8px",
        "margin-mobile": "16px",
        "margin-desktop": "48px"
      },
      fontFamily: {
        "body-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "display": ["Inter", "sans-serif"],
        "label-md": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "headline-lg-mobile": ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-lg": ["18px", { "lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400" }],
        "body-md": ["16px", { "lineHeight": "1.6", "letterSpacing": "0", "fontWeight": "400" }],
        "headline-md": ["20px", { "lineHeight": "1.4", "letterSpacing": "0", "fontWeight": "600" }],
        "label-sm": ["12px", { "lineHeight": "1.2", "letterSpacing": "0.05em", "fontWeight": "600" }],
        "display": ["64px", { "lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "label-md": ["14px", { "lineHeight": "1.2", "letterSpacing": "0.02em", "fontWeight": "500" }],
        "headline-lg": ["32px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-lg-mobile": ["24px", { "lineHeight": "1.2", "letterSpacing": "-0.01em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
}
