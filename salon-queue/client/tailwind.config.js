/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        gujarati: ['"Noto Sans Gujarati"', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#07080a',
          900: '#0d0e12',
          850: '#11131a',
          800: '#161922',
          700: '#202431',
          600: '#2d3345',
        },
        brand: {
          amber: '#e59b58',
          gold: '#d4af37',
          copper: '#c87d46',
          glow: '#f3b47c',
          cream: '#f9f6f0',
        },
        status: {
          waiting: '#f59e0b',
          called: '#38bdf8',
          service: '#10b981',
          completed: '#64748b',
          alert: '#f43f5e',
        },
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.35)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.55)',
        'amber-glow': '0 0 24px -4px rgba(229, 155, 88, 0.35)',
        'amber-glow-lg': '0 0 40px -2px rgba(229, 155, 88, 0.45)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite linear',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
