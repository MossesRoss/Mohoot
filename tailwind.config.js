/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'],
      },
      colors: {
        'app-bg': '#1E1E2E',
        'brand-primary': '#10B981',
        'brand-accent': '#F43F5E',
      }
    },
  },
  plugins: [],
}