const { theme } = require('@sanity/demo/tailwind')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './intro-template/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    ...theme,
    // Overriding fontFamily to use @next/font loaded families
    fontFamily: {
      mono: 'var(--font-mono)',
      sans: 'var(--font-sans)',
      serif: 'var(--font-serif)',
      antarctican: 'var(--font-antarctican-mono)',
      ariana: 'var(--font-ariana-pro)'
    },
    extend: {
      colors: {
        'primary': '#2D6A4F',
        'secondary': '#FFC857',
        'background': '#F8F8F8',
        'dark': '#333333',
        'light': '#FFC857',
      },
      screens: {
        'tall': { 'raw': '(min-height: 800px)' },
      },
      borderColor: {
        // Set your desired default border color here
        DEFAULT: '#2D6A4F',
      },
    }

  },
  plugins: [require('@tailwindcss/typography')],
}
