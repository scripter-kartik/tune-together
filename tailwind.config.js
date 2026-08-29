module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      keyframes: {
        'float-up': {
          '0%': { transform: 'translateY(100vh) scale(0.3) rotate(-10deg)', opacity: '0' },
          '10%': { transform: 'translateY(85vh) scale(1.1) rotate(5deg)', opacity: '1' },
          '30%': { transform: 'translateY(60vh) scale(1) rotate(-5deg)', opacity: '0.9' },
          '70%': { transform: 'translateY(20vh) scale(0.9) rotate(10deg)', opacity: '0.8' },
          '100%': { transform: 'translateY(-10vh) scale(0.8) rotate(-15deg)', opacity: '0' },
        }
      },
      animation: {
        'float-up': 'float-up 4s cubic-bezier(0.25, 1, 0.5, 1) forwards',
      },
    },
  },
  plugins: [],
};