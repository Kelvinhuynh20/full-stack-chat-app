/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#bae0fe',
          300: '#7cc5fe',
          400: '#36a4fb',
          500: '#1a8af0',
          600: '#0b6dcd',
          700: '#0c57a6',
          800: '#104a87',
          900: '#133f70',
          950: '#0c2648',
        },
        dark: {
          100: '#d1d5db',
          200: '#9ca3af',
          300: '#6b7280',
          400: '#4b5563',
          500: '#374151',
          600: '#2a2f3c',
          700: '#1f2937',
          800: '#1a1d24',
          900: '#111827',
          950: '#0d111b',
        },
        accent: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
      },
    },
  },
  plugins: [],
}
