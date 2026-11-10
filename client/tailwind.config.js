/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        slate: {
          950: '#07090e',
          900: '#0d1117',
          850: '#111620',
          800: '#161b22',
        },
      },
    },
  },
  plugins: [],
}
