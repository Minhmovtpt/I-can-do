import { defineConfig } from "vite";

export default defineConfig({
  root: "public",
  server: {
    port: 5173
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true
  }
});
