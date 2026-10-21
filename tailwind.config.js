/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--panel)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        line: 'var(--line)',
        strong: 'var(--line-strong)',
        done: 'var(--done)',
        prog: 'var(--prog)',
        risk: 'var(--risk)',
        todo: 'var(--todo)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        sans: ['Archivo', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
