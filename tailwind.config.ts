import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        xp: {
          blue: "#0058ee",
          darkBlue: "#003c96",
          titlebarDark: "#0054e3",
          titlebarLight: "#278eff",
          taskbar: "#245edb",
          startGreen: "#388e3c",
          startGreenHover: "#2e7d32",
          grayBg: "#ece9d8",
          cardBg: "#f5f4ea",
          borderDark: "#716f64",
          borderLight: "#ffffff",
          textDark: "#000000",
          highlight: "#316ac5",
          silver: "#e3e3db",
          warningYellow: "#ffcc00",
          errorRed: "#d32f2f",
        },
      },
      fontFamily: {
        xp: ["Tahoma", "Segoe UI", "Geneva", "Verdana", "sans-serif"],
        mono: ["Consolas", "Courier New", "monospace"],
      },
      boxShadow: {
        'xp-window': '2px 2px 10px rgba(0,0,0,0.5)',
        'xp-button': 'inset 1px 1px 0px #ffffff, inset -1px -1px 0px #716f64',
        'xp-button-pressed': 'inset 1px 1px 2px #404040',
        'xp-inset': 'inset 2px 2px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};

export default config;
