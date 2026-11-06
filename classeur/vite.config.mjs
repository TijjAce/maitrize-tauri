// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// L'interface du classeur. React, Vite et l'API de Tauri sont ceux du dépôt (../node_modules).
// Le compagnon la construit parmi ses pages (voir ../compagnon/construire-iphone.sh).
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
