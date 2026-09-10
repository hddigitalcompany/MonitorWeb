/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#F4F4EE",
        surface: "#FFFFFF",
        surface2: "#EFEFE6",
        border: "#E2E1D3",
        ink: "#181914",
        muted: "#78776B",
        amber: {
          DEFAULT: "#C6F136",
          soft: "#E3FF8F",
        },
        olive: "#4F6B3F",
        rust: "#AE4A30",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "16px",
        md: "22px",
      },
    },
  },
  plugins: [],
};
