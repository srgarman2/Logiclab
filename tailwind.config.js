/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        premise: '#3B82F6',
        conclusion: '#22C55E',
        loophole: '#F97316',
        background: '#EAB308',
        negation: '#F43F5E',
      },
      animation: {
        'flip-in': 'flipIn 0.4s ease-in-out',
        'flip-out': 'flipOut 0.4s ease-in-out',
        'pulse-ring': 'pulseRing 1s ease-in-out infinite',
      },
      keyframes: {
        flipIn: {
          '0%': { transform: 'rotateY(90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0deg)', opacity: '1' },
        },
        flipOut: {
          '0%': { transform: 'rotateY(0deg)', opacity: '1' },
          '100%': { transform: 'rotateY(90deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
