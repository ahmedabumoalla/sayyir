import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sayyir: {
          brown: "#8C3F1F",
          dark: "#5B2A14",
          sand: "#C9A063",
          olive: "#6E6F4B",
          bg: "#F7F4EF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
