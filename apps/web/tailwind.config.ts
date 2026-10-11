import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Outfit', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        forest: {
          950: '#06261C',
          900: '#0B3B2C',
          800: '#0F4C39',
          700: '#135E46',
          600: '#187A5B',
          500: '#1F9872',
          400: '#34D399',
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
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
          dark: 'var(--secondary-dark)',
          light: 'var(--secondary-light)',
          border: 'var(--secondary-border)',
          subtle: 'var(--secondary-subtle)',
        },
        orange: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F15A24',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        brand: {
          50: 'var(--primary-light)',
          100: 'var(--primary-subtle)',
          200: 'var(--primary-border)',
          300: '#A8D5C2',
          400: '#269A86',
          500: 'var(--primary)',
          600: 'var(--primary-hover)',
          700: 'var(--primary-dark)',
          800: '#0F4C39',
          900: '#0B3B2C',
          orange: 'var(--secondary)',
          green: 'var(--primary)',
        },
        action: {
          primary: 'var(--primary)',
          'primary-hover': 'var(--primary-hover)',
          'primary-light': 'var(--primary-light)',
          secondary: 'var(--secondary)',
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
