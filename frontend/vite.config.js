import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: {
      "/api/detect-face": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api/process-voice": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api/authenticate-face": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api/authenticate-voice": {
        target: "http://localhost:5002",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
