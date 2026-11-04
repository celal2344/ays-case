/** @type {import("prettier").Config} */
export default {
  semi: false,
  endOfLine: 'auto',
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/index.css',
  tailwindFunctions: ['cn', 'cva'],
}
