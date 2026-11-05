// L'interface du classeur. React, Vite et l'API de Tauri sont ceux du dépôt (../node_modules) :
// rien d'autre à installer que la ligne de commande de Tauri, épinglée sur celle du compagnon.
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const ici = fileURLToPath(new URL(".", import.meta.url));

export default {
  root: ici,
  base: "./",
  plugins: [react()],
  clearScreen: false,
  server: { port: 5206, strictPort: true, host: "127.0.0.1" },
  build: { outDir: "dist", emptyOutDir: true, target: "safari15" },
};
