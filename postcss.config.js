// Tailwind CSS v4's PostCSS plugin handles vendor prefixing internally, so
// autoprefixer is not needed here and is deliberately absent — adding it back
// breaks the build, because it resolves a browserslist "extends
// @sanity/browserslist-config" declared by several Sanity packages that do not
// ship that config.
// https://tailwindcss.com/docs/using-with-preprocessors
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
