/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surry: {
          green: '#1a472a',
          'green-l': '#2d6a40',
          'green-ll': '#3a8f54',
          'green-dark': '#0d2415',
          gold: '#c9a84c',
          'gold-l': '#e8c96c',
          cream: '#e8e4d8',
          'cream-d': '#c4bfa8',
          red: '#c0392b',
          'red-l': '#e74c3c',
          bg: '#0f1115', // very dark main bg
          bg2: '#15171c', // slightly lighter for sidebar
          bg3: '#1e2330',
          border: '#2a3040',
          'table-border': '#1a1105', // dark wood border
        }
      },
      fontFamily: {
        sans: ['"DM Mono"', 'monospace'],
        serif: ['"Playfair Display"', 'serif'],
      }
    },
  },
  plugins: [],
}
