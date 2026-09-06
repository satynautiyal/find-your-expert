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
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          500: '#FA5A2A',
          600: '#F15A24',
          700: '#DE4714',
          800: '#C23B0B',
          900: '#9A2E08',
        },
        action: {
          orange: '#F15A24',
          'orange-hover': '#DE4714',
          'orange-light': '#FFF7ED',
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
