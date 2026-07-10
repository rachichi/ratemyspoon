/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
    },
    extend: {
      colors: {
        'warm-black': '#1a1a1a',
        'cream': '#f5ede0',
      },
    },
  },
  plugins: [],
}
