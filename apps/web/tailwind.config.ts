import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        hive: {
          bg: '#ffffff',
          surface: '#fafafa',
          border: '#eaeaea',
          accent: '#000000',
          bull: '#22c55e',
          bear: '#ef4444',
          neutral: '#666666',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 0, 0, 0.05)' },
          '100%': { boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
