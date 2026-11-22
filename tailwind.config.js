/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { forest: '#174D2B', cream: '#F8F5E9', turmeric: '#E8B72D', brown: '#56351F' },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Hind"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
      boxShadow: { soft: '0 10px 30px -12px rgba(23,77,43,.25)' },
    },
  },
  plugins: [],
};
