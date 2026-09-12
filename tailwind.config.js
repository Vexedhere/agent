/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0d0d10',
          raised: '#17171b',
          border: '#26262b',
        },
        accent: {
          DEFAULT: '#6d5efc',
          hover: '#7f72ff',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
