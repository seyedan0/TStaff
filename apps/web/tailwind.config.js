/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Vazirmatn",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Tahoma",
          "sans-serif",
        ],
      },
      colors: {
        oat: "#F3EBDD",
        forest: "#214E3A",
        tomato: "#D94F3D",
        slate: { 50: "#183B2D", 100: "#214031", 200: "#304B3D", 300: "#43584A", 400: "#59675A", 500: "#697464", 600: "#9CA38F", 700: "#DDD9C8", 800: "#EAE5D7", 900: "#FAF6ED", 950: "#F3EBDD" },
        apple: {
          blue: "#214E3A",
          "blue-hover": "#183B2D",
          green: "#326B4B",
          amber: "#A65D31",
          red: "#D94F3D",
          indigo: "#214E3A",
          purple: "#486747",
          gray: {
            100: "#F5F5F7",
            200: "#E5E5EA",
            300: "#D1D1D6",
            400: "#AEAEB2",
            500: "#8E8E93",
            600: "#636366",
            700: "#48484A",
            800: "#2C2C2E",
            900: "#1C1C1E",
            950: "#0D0D0E",
          },
        },
      },
      boxShadow: {
        "apple-card": "0 4px 24px -1px rgba(33, 78, 58, 0.06)",
        "apple-elevated": "0 12px 40px -4px rgba(33, 78, 58, 0.09)",
        "apple-glow": "0 0 20px -3px rgba(33, 78, 58, 0.12)",
      },
      borderRadius: {
        "apple-sm": "10px",
        "apple-md": "14px",
        "apple-lg": "18px",
        "apple-xl": "24px",
        "apple-2xl": "32px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-up": "scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spring-slide": "springSlide 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        springSlide: {
          "0%": { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

