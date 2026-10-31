import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        eka: {
          50 : '#EEF4FB',
          100: '#D5E5F5',
          200: '#ABCBEB',
          300: '#81B1E1',
          400: '#5797D7',
          500: '#2D7DCD',
          600: '#1F5FA0',
          700: '#1F4E79',  // color primario Droguería EKA
          800: '#163A5A',
          900: '#0D253C',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger : '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [
    typography,
  ],
}
