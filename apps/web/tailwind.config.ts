import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#06261C',
          900: '#0B3B2C',
          800: '#0F4C39',
          700: '#135E46',
          600: '#187A5B',
          500: '#1F9872',
          100: '#E6F4EE',
          50: '#F2FAF6',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          dark: 'var(--primary-dark)',
          light: 'var(--primary-light)',
          border: 'var(--primary-border)',
          subtle: 'var(--primary-subtle)',
        },
        brand: {
          50: 'var(--primary-light)',
          100: 'var(--primary-subtle)',
          200: 'var(--primary-border)',
          300: '#FDBA74',
          400: '#FB923C',
          500: 'var(--primary)',
          600: 'var(--primary-hover)',
          700: 'var(--primary-dark)',
          800: '#C23B0B',
          900: '#9A2E08',
        },
        action: {
          primary: 'var(--primary)',
          'primary-hover': 'var(--primary-hover)',
          'primary-light': 'var(--primary-light)',
        },
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;
