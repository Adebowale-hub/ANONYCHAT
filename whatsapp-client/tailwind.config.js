/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        'neo': '5px 5px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '3px 3px 0px 0px rgba(0,0,0,1)',
      }
    },
  },
  plugins: [],
}