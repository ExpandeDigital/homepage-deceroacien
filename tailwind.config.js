/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./**/*.html",
    "./assets/js/**/*.{js,mjs}",
    "./scripts/**/*.{js,mjs}",
    "!./dist/**",
    "!./node_modules/**"
  ],
  theme: {
    extend: {
      colors: {
        'brand-dark': '#0A192F',
        'brand-accent': '#FBBF24',
        'primary-dark': '#0a1f2f',
        'secondary-dark': '#112240',
        'accent-gold': '#FBBF24',
        'text-light': '#e6f1ff',
        'border-custom': '#1e2d4d',
        'kit-azul-noche': '#1a1f3a',
        'kit-azul-oscuro': '#101326',
        'kit-dorado': '#d4af37',
        'kit-texto-claro': '#f0f2f5',
        'kit-texto-secundario': '#a7a9be'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif']
      }
    }
  },
  plugins: []
};
