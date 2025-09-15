// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#075a96',
        'primary-dark': '#05497a',
        'primary-light': '#0a6fb5',
        'primary-muted': '#d1e6f7',

        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },

        white: '#ffffff',
        black: '#000000',
      },
    },
  },
  plugins: [],
};
