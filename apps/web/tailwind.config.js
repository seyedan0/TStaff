/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        oat: {
          DEFAULT: "#F3EBDD",
          soft: "#FAF6ED",
          card: "#FFFCF5",
          border: "#DDD5C3",
        },
        forest: {
          DEFAULT: "#214E3A",
          hover: "#183B2D",
          ink: "#214031",
          muted: "#43584A",
        },
        tomato: {
          DEFAULT: "#D94F3D",
          hover: "#C03F2E",
          ink: "#B53727",
        },
        slate: {
          50: "#183B2D",
          100: "#214031",
          200: "#304B3D",
          300: "#43584A",
          400: "#59675A",
          500: "#697464",
          600: "#858E7F",
          700: "#DDD5C3",
          800: "#EAE5D7",
          900: "#FAF6ED",
          950: "#F3EBDD",
        },
        apple: {
          blue: "#214E3A",
          "blue-hover": "#183B2D",
          green: "#2E6B4B",
          amber: "#A65D31",
          red: "#D94F3D",
          indigo: "#214E3A",
          purple: "#3A5F4D",
        },
      },
      boxShadow: {
        "apple-card": "0 4px 20px -2px rgba(33, 78, 58, 0.06)",
        "apple-elevated": "0 12px 36px -6px rgba(33, 78, 58, 0.10)",
        "apple-glow": "0 0 18px -4px rgba(33, 78, 58, 0.14)",
      },
      borderRadius: {
        "apple-sm": "10px",
        "apple-md": "14px",
        "apple-lg": "18px",
        "apple-xl": "22px",
        "apple-2xl": "28px",
      },
      animation: {
        "fade-in": "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-up": "scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "spring-slide": "springSlide 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        springSlide: {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
