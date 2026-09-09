/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#1C1B1A",
        surface: "#242322",
        surface2: "#2B2A27",
        border: "#39372F",
        ink: "#EDE9E3",
        muted: "#A7A196",
        amber: {
          DEFAULT: "#C98A3E",
          soft: "#E3B378",
        },
        olive: "#6B7A5E",
        rust: "#B5563A",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
      },
    },
  },
  plugins: [],
};
