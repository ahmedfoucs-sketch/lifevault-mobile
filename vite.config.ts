import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // Relative base so assets load from the Capacitor webview
  base: "./",
  server: { host: true, port: 5173 },
  build: { outDir: "dist", target: "es2020" },
});