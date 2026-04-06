/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: {
          bg: 'rgb(var(--app-bg) / <alpha-value>)',
          card: 'rgb(var(--app-card) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
          primary: 'rgb(var(--app-primary) / <alpha-value>)',
          danger: 'rgb(var(--app-danger) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      transitionDuration: {
        150: '150ms',
      },
      keyframes: {
        pulseBorder: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(96, 165, 250, 0.25)' },
          '50%': { boxShadow: '0 0 0 6px rgba(96, 165, 250, 0)' },
        },
      },
      animation: {
        pulseBorder: 'pulseBorder 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
