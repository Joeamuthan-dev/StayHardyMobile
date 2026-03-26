/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'electric-green': '#00E676',
      },
      boxShadow: {
        'neon': '0 0 20px rgba(0,230,118,0.4)',
        'neon-sm': '0 0 10px rgba(0,230,118,0.3)',
        'neon-lg': '0 0 40px rgba(0,230,118,0.5)',
      },
    },
  },
  plugins: [],
}
