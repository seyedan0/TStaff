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
        apple: {
          blue: "#0A84FF",
          "blue-hover": "#0071E3",
          green: "#30D158",
          amber: "#FF9F0A",
          red: "#FF453A",
          indigo: "#5E5CE6",
          purple: "#BF5AF2",
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
        "apple-card": "0 4px 24px -1px rgba(0, 0, 0, 0.2), 0 2px 8px -1px rgba(0, 0, 0, 0.1)",
        "apple-elevated": "0 12px 40px -4px rgba(0, 0, 0, 0.35), 0 4px 12px -2px rgba(0, 0, 0, 0.2)",
        "apple-glow": "0 0 20px -3px rgba(10, 132, 255, 0.35)",
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

