import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: "@syncweb/shared",
        replacement: path.resolve(__dirname, "../../packages/shared/src/index.ts")
      },
      {
        find: /^@syncweb\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, "../../packages/shared/src/$1")
      },
      {
        find: "@",
        replacement: path.resolve(__dirname, "./src")
      }
    ]
  },
  server: {
    port: 5173
  }
});
