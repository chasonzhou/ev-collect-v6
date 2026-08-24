import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // pywebview 用 file:// 加载构建产物，必须用相对路径
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        bare: resolve(__dirname, "bare.html"),
        bisect: resolve(__dirname, "bisect.html"),
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
