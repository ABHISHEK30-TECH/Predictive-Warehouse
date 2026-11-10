/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bce0ff',
          300: '#8eccff',
          400: '#59b0fc',
          500: '#3291f7',
          600: '#1d73eb',
          700: '#165bc6',
          800: '#174da0',
          900: '#18427f',
        },
        slate: {
          850: '#151e2e',
          950: '#0a0f1d',
        }
      },
    },
  },
  plugins: [],
}
