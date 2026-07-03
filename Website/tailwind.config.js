/** @type {import('tailwindcss').Config} */
const mono = (value) => ({
  DEFAULT: value,
  50: "var(--background)",
  100: "var(--surface)",
  200: "var(--surface)",
  300: value,
  400: value,
  500: value,
  600: value,
  700: value,
  800: value,
  900: value,
  950: value,
});

module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cormorant: ["var(--font-poppins)", "sans-serif"],
        montserrat: ["var(--font-poppins)", "sans-serif"],
        serif: ["var(--font-poppins)", "sans-serif"],
        sans: ["var(--font-poppins)", "sans-serif"],
        roboto: ["var(--font-poppins)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
      },
      fontSize: {
        xs: [
          "0.9375rem",
          {
            lineHeight: "1.375rem",
          },
        ],
        sm: [
          "1.0625rem",
          {
            lineHeight: "1.5625rem",
          },
        ],
        base: [
          "1.1875rem",
          {
            lineHeight: "1.8125rem",
          },
        ],
        lg: [
          "1.375rem",
          {
            lineHeight: "2rem",
          },
        ],
        xl: [
          "1.5rem",
          {
            lineHeight: "2.125rem",
          },
        ],
        "2xl": [
          "1.75rem",
          {
            lineHeight: "2.375rem",
          },
        ],
        "3xl": [
          "2.125rem",
          {
            lineHeight: "2.625rem",
          },
        ],
        "4xl": [
          "2.75rem",
          {
            lineHeight: "3.25rem",
          },
        ],
        "5xl": [
          "3.5rem",
          {
            lineHeight: "1",
          },
        ],
        "6xl": [
          "4.25rem",
          {
            lineHeight: "1",
          },
        ],
        "7xl": [
          "5.25rem",
          {
            lineHeight: "1",
          },
        ],
        "8xl": [
          "6.75rem",
          {
            lineHeight: "1",
          },
        ],
        "9xl": [
          "8.75rem",
          {
            lineHeight: "1",
          },
        ],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        background: "rgb(var(--background-rgb) / <alpha-value>)",
        foreground: "rgb(var(--secondary-rgb) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--secondary-rgb) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--surface-rgb) / <alpha-value>)",
          foreground: "rgb(var(--secondary-rgb) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--background-rgb) / <alpha-value>)",
          foreground: "var(--muted-foreground)",
        },
        destructive: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--background-rgb) / <alpha-value>)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "rgb(var(--primary-rgb) / <alpha-value>)",
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--background-rgb) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary-rgb) / <alpha-value>)",
          foreground: "rgb(var(--background-rgb) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent-rgb) / <alpha-value>)",
          foreground: "rgb(var(--background-rgb) / <alpha-value>)",
        },
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        white: "rgb(var(--surface-rgb) / <alpha-value>)",
        black: "rgb(var(--secondary-rgb) / <alpha-value>)",
        red: mono("var(--primary)"),
        orange: mono("var(--primary)"),
        amber: mono("var(--primary)"),
        yellow: mono("var(--primary)"),
        pink: mono("var(--primary)"),
        green: mono("var(--secondary)"),
        blue: mono("var(--secondary)"),
        purple: mono("var(--secondary)"),
        teal: mono("var(--secondary)"),
        indigo: mono("var(--secondary)"),
        cyan: mono("var(--secondary)"),
        lime: mono("var(--secondary)"),
        mint: mono("var(--secondary)"),
        cream: mono("var(--background)"),
        gray: {
          DEFAULT: "var(--secondary-legacy)",
          50: "var(--background)",
          100: "var(--surface)",
          200: "var(--surface)",
          300: "var(--surface)",
          400: "var(--secondary2)",
          500: "var(--secondary-legacy)",
          600: "var(--secondary)",
          700: "var(--secondary)",
          800: "var(--secondary)",
          900: "var(--secondary)",
        },
        line: "var(--line)",
        outline: "var(--outline)",
        secondary2: "var(--secondary2)",
        secondaryLegacy: "var(--secondary-legacy)",
        surface1: "var(--surface1)",
        surface2: "var(--surface2)",

        // Semantic Status Colors
        success: "rgb(var(--primary-rgb) / <alpha-value>)",
        error: "rgb(var(--primary-rgb) / <alpha-value>)",
      },
    },
    container: {
      padding: {
        DEFAULT: "14px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
