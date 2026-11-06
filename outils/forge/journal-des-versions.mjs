// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Écrit CHANGELOG.md d'après la liste « Quoi de neuf » de l'application (src/nouveautes.ts) :
// une seule source, et les notes de chaque version sur la Forge s'y lisent (mettre-en-ligne.sh).
//
//   node outils/forge/journal-des-versions.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NOUVEAUTES } from "../../src/nouveautes.ts";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const parties = NOUVEAUTES.map(({ version, titre, points }) => {
  const lignes = points.map(({ quoi, ou }) => `- ${quoi}${ou ? ` *(${ou})*` : ""}`);
  return `## ${version}\n\n${titre}\n\n${lignes.join("\n")}\n`;
});

const entete = `# Journal des versions

Ce qui a changé dans Maitrize, version par version. C'est la liste que l'application montre
elle-même dans « Quoi de neuf » après chaque mise à jour.
`;

writeFileSync(join(racine, "CHANGELOG.md"), `${entete}\n${parties.join("\n")}`);
console.log(`CHANGELOG.md : ${NOUVEAUTES.length} versions.`);
