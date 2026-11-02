import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import relaisDev from "./vite.relaisDev.mjs";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  // Le relais de développement : Maitrize dans le navigateur d'un autre ordinateur, par Tailscale (voir vite.relaisDev.mjs).
  plugins: [react(), relaisDev()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    // Tailscale (`tailscale serve`) amène l'autre ordinateur par une adresse en .ts.net ; Vite n'écoute toujours que le Mac.
    allowedHosts: [".ts.net"],
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
