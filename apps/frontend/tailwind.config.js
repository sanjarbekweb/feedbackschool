/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'border-default': 'var(--border-default)',
        'accent-primary': 'var(--accent-primary)',
        'accent-primary-dark': 'var(--accent-primary-dark)',
        'accent-soft': 'var(--accent-soft)',
        'accent-secondary': 'var(--accent-secondary)',
        'state-success': 'var(--state-success)',
        'state-warning': 'var(--state-warning)',
        'state-error': 'var(--state-error)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
};
