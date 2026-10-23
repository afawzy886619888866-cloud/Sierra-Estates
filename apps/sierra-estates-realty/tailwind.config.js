/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Use CSS variables for all colors to support theme switching
        primary: {
          50: 'hsl(var(--color-primary-light) / 0.1)',
          100: 'hsl(var(--color-primary-light) / 0.2)',
          200: 'hsl(var(--color-primary-light) / 0.3)',
          300: 'hsl(var(--color-primary-light) / 0.4)',
          400: 'hsl(var(--color-primary-light) / 0.5)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary-light)',
          700: 'var(--color-primary-dark)',
          800: 'var(--color-primary-dark)',
          900: 'var(--color-primary-dark)',
          950: 'var(--color-primary-dark)',
        },
        secondary: {
          50: 'hsl(var(--color-secondary-light) / 0.1)',
          100: 'hsl(var(--color-secondary-light) / 0.2)',
          200: 'hsl(var(--color-secondary-light) / 0.3)',
          300: 'hsl(var(--color-secondary-light) / 0.4)',
          400: 'hsl(var(--color-secondary-light) / 0.5)',
          500: 'var(--color-secondary)',
          600: 'var(--color-secondary-light)',
          700: 'var(--color-secondary-dark)',
          800: 'var(--color-secondary-dark)',
          900: 'var(--color-secondary-dark)',
          950: 'var(--color-secondary-dark)',
        },
        accent: {
          50: 'hsl(var(--color-accent-light) / 0.1)',
          100: 'hsl(var(--color-accent-light) / 0.2)',
          200: 'hsl(var(--color-accent-light) / 0.3)',
          300: 'hsl(var(--color-accent-light) / 0.4)',
          400: 'hsl(var(--color-accent-light) / 0.5)',
          500: 'var(--color-accent)',
          600: 'var(--color-accent-light)',
          700: 'var(--color-accent-dark)',
          800: 'var(--color-accent-dark)',
          900: 'var(--color-accent-dark)',
          950: 'var(--color-accent-dark)',
        },
        // Sierra Estates Official Palette V3.0 — Dark Theme + Blue Accents
        // For Egyptian Luxury Real Estate Market
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',    // Primary interactive blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',    // Deep secondary blue
          900: '#1e3a8a',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',    // Bright accent blue
          600: '#0284c7',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
        },
        // Semantic colors for states
        emerald: {
          500: '#10b981',    // Success
          600: '#059669',
        },
        amber: {
          400: '#fbbf24',    // Warning
          500: '#f59e0b',
        },
        red: {
          500: '#ef4444',    // Error
          600: '#dc2626',
        },
        // Premium Lime (Primary Brand Color)
        lime: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',    // Primary interactive lime
          600: '#65a30d',
          700: '#4d7c0f',
          800: '#3f6212',
          900: '#365314',
          DEFAULT: '#84cc16',
        },
        // Global alias to convert existing gold accents to lime
        gold: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          DEFAULT: '#84cc16',
        },
        // Deep Slate (Backgrounds & Text)
        navy: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#1e293b',
          DEFAULT: '#020617', // OLED Black / Slate 950
        },
        // Text color system
        text: {
          light: '#f1f5f9',          // Slate-100
          muted: 'rgba(203,213,225,0.78)',  // Slate-300
          subtle: 'rgba(203,213,225,0.50)', // Slate-300 @ 50%
        },
        // Surface overlays
        surface: {
          default: 'rgba(15,23,42,0.4)',     // Slate-900 @ 40%
          hover: 'rgba(59,130,246,0.08)',    // Blue-500 @ 8%
          active: 'rgba(59,130,246,0.12)',   // Blue-500 @ 12%
        },
        // Legacy accents
        teal: {
          400: '#4ECDC4',
        },
        purple: {
          400: '#C084FC',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        'display-lg': ['4rem', { lineHeight: '1.1', fontWeight: '300' }],
        'display-md': ['3rem', { lineHeight: '1.15', fontWeight: '300' }],
        'heading-lg': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-sm': ['1.25rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['0.75rem', { lineHeight: '1.4', fontWeight: '500', letterSpacing: '0.05em' }],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-left))',
        'safe-r': 'max(1rem, env(safe-area-inset-right))',
      },
      backgroundImage: {
        // Dark theme gradients with lime accents
        'gradient-subtle': 'linear-gradient(135deg, rgba(132,204,22,0.05) 0%, rgba(190,242,100,0.03) 100%)',
        'gradient-hero': 'linear-gradient(130deg, rgba(2,6,23,0.95) 0%, rgba(15,23,42,0.85) 45%, rgba(2,6,23,0.4) 100%)',
        'gradient-blue-accent': 'linear-gradient(135deg, rgba(132,204,22,0.1) 0%, rgba(190,242,100,0.05) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(15,23,42,0.5) 0%, rgba(63,98,18,0.1) 100%)',
      },
      boxShadow: {
        'luxury': '0 20px 60px rgba(0, 0, 0, 0.35)',
        'card': '0 8px 24px rgba(0, 0, 0, 0.25)',
        'sm-luxury': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'blue-glow': '0 0 24px rgba(132, 204, 22, 0.2)',
        'blue-glow-lg': '0 0 40px rgba(132, 204, 22, 0.25)',
        'inset-subtle': 'inset 0 1px 2px rgba(132, 204, 22, 0.1)',
      },
      blur: {
        xs: '2px',
      },
      opacity: {
        3: '0.03',
        8: '0.08',
      },
    },
  },
  plugins: [],
};
