/** @type {import('tailwindcss').Config} */
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#14C3BF',
          hover: '#0FA8A5',
          weak: '#E0F7F6',
        },
        secondary: '#1A2332',
        accent: {
          DEFAULT: '#F89437',
          hover: '#E07D1F',
          weak: '#FFF3E0',
        },
        success: {
          DEFAULT: '#77C738',
          weak: '#EEF9E5',
        },
        warning: '#F1AD54',
        danger: '#D64C4C',
        bg: '#F6F8FB',
        background: '#F6F8FB',
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#F9FCFF',
        },
        border: '#E6EDF2',
        text: '#1A2332',
        muted: '#5A6B7E',
      },
      borderRadius: {
        sm: '12px',
        DEFAULT: '16px',
        lg: '20px',
        full: '999px',
      },
      boxShadow: {
        sm: '0 4px 12px rgba(26, 35, 50, 0.05)',
        DEFAULT: '0 12px 28px rgba(26, 35, 50, 0.08)',
        strong: '0 18px 40px rgba(26, 35, 50, 0.10)',
        soft: '0 12px 28px rgba(26, 35, 50, 0.08)',
        card: '0 12px 28px rgba(26, 35, 50, 0.08)',
        'card-strong': '0 18px 40px rgba(26, 35, 50, 0.10)',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Tajawal', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        default: ['Plus Jakarta Sans', 'Tajawal', ...fontFamily.sans],
      },
      transitionDuration: {
        button: '180ms',
        card: '220ms',
        fast: '180ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '.75' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in .35s ease-out',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
