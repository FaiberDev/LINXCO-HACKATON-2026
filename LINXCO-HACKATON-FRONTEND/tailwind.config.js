import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', '"Atkinson Hyperlegible Next"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        display: ['"Fraunces Variable"', 'Fraunces', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        brand: {
          50: '#f3f7f0',
          100: '#e2ebdc',
          200: '#c7d8bc',
          300: '#B5CA8D',
          400: '#8BB174',
          500: '#648f4d',
          600: '#497037',
          700: '#375629',
          800: '#2E5EAA',
          900: '#1f427a',
          950: '#142b52',
        },
        charcoal: {
          50: '#f6f6f5',
          100: '#e7e7e5',
          200: '#d1d1cd',
          300: '#b1b1ab',
          400: '#898981',
          500: '#6e6e67',
          600: '#5d5d57',
          700: '#4f4f4a',
          800: '#444440',
          900: '#353531',
          950: '#1e1e1b',
        },
        aqua: {
          50: '#ecfcff',
          100: '#cff7fe',
          200: '#a5effc',
          300: '#67e2f9',
          400: '#00C4F5',
          500: '#00a3d1',
          600: '#0282af',
          700: '#09688e',
          800: '#115574',
          900: '#134762',
        },
        olive: {
          50: '#f5f8f2',
          100: '#e6efe0',
          200: '#d0e1c4',
          300: '#B5CA8D',
          400: '#8BB174',
          500: '#689351',
          600: '#50753d',
          700: '#405d32',
          800: '#354b2b',
          900: '#2d3f25',
        },
        institucional: {
          50: '#eef4fc',
          100: '#d9e6f8',
          200: '#bcd3f3',
          300: '#8eb6ea',
          400: '#5990de',
          500: '#2E5EAA',
          600: '#244b8c',
          700: '#1e3c72',
          800: '#1c345f',
          900: '#1c2e50',
          950: '#131d34',
        },
        slate: {
          900: '#0f172a',
        },
      },
      minHeight: {
        'touch': '48px',
        'touch-lg': '56px',
      },
      minWidth: {
        'touch': '48px',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideUp: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    forms,
  ],
};
