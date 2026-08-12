/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/ui/**/*.{js,ts,jsx,tsx,mdx}',
    './components/Listings/**/*.{js,ts,jsx,tsx,mdx}',
    './components/UI/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: "var(--navy)",
        "navy-secondary": "var(--navy-secondary)",
        "navy-deep": "var(--navy-deep)",
        sky: "var(--sky)",
        ivory: "var(--ivory)",
        gold: {
          50: '#FFFBF5',
          100: '#F5E070',
          300: '#E9C176',
          400: '#D8BB6A',
          500: '#C9A84C',
          DEFAULT: '#C9A84C',
        },
        pinblue: {
          DEFAULT: '#1E88D9',
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        ui: ["var(--font-ui)", "sans-serif"],
        arabic: ["var(--font-arabic)", "sans-serif"],
      },
      spacing: {
        sm: "var(--spacing-sm)",
        md: "var(--spacing-md)",
        lg: "var(--spacing-lg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        pill: "var(--radius-pill)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        glow: "var(--shadow-glow-md)",
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E9C176 50%, #987734 100%)',
      },
    },
  },
  plugins: [],
};
