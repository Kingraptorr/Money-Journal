import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "miniapp",
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    outDir: "../dist/miniapp",
    emptyOutDir: true,
  },
});
