import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', 'sans-serif'],
        display: ['var(--font-space)', 'sans-serif'],
      },
      colors: {
        brand: {
          bg: '#F7F7F4', // Warm off-white
          text: '#0D0D0D', // Near black
          primary: '#125B39', // Deep Forest Green
          primaryHover: '#0E482C',
          accent: '#E33A25', // Editorial Red
          surface: '#FFFFFF',
          border: '#E6E6E2',
          muted: '#80807A',
        }
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px rgba(13,13,13,1)',
        'brutal-sm': '2px 2px 0px 0px rgba(13,13,13,1)',
      }
    },
  },
  plugins: [],
};
export default config;
