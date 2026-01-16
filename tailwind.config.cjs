module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Lato"', 'sans-serif'],
        display: ['"Lato"', 'sans-serif']
      },
      colors: {
        ink: '#0f1117'
      }
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['night']
  }
};
