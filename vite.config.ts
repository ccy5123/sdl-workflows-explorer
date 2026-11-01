import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the same build works under any path (GitHub Pages project site).
export default defineConfig({
  base: "./",
  plugins: [react()],
});
