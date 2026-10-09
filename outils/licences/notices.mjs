// Les licences des composants tiers, à joindre à l'application.
//
// Les licences MIT, BSD ou Apache des bibliothèques que l'application
// embarque demandent que leur texte et leurs mentions de droits accompagnent
// chaque copie distribuée. Ce script les relève — bibliothèques JavaScript de
// l'interface, d'après package-lock.json ; bibliothèques Rust, d'après
// `cargo metadata` pour la plateforme construite — et écrit
// public/licences-tierces.txt, que l'écran Réglages › Licences affiche.
//
// node outils/licences/notices.mjs            — la plateforme de cet ordinateur, hors ligne
// node outils/licences/notices.mjs --en-ligne — autorise cargo à télécharger ce qui manque (construction des versions)

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const enLigne = process.argv.includes("--en-ligne");

/** Les fichiers de licence d'un dossier, et ceux d'un code embarqué un cran plus bas (Oniguruma, par exemple). */
function textesDeLicence(dossier) {
  const estLicence = (n) => /^(licen[cs]e|copying|notice|unlicense|copyright)([.-].*)?$/i.test(n);
  const textes = [];
  const lire = (d, profondeur) => {
    let noms = [];
    try { noms = readdirSync(d); } catch { return; }
    for (const n of noms.sort()) {
      const chemin = join(d, n);
      let s;
      try { s = statSync(chemin); } catch { continue; }
      if (s.isFile() && estLicence(n) && s.size < 200_000) textes.push(readFileSync(chemin, "utf8").trim());
      else if (s.isDirectory() && profondeur === 0 && !/^(node_modules|target|tests?|benches|examples|\.git)$/.test(n)) lire(chemin, 1);
    }
  };
  lire(dossier, 0);
  return [...new Set(textes)].filter(Boolean);
}

// ── L'interface : les paquets npm qui ne servent pas qu'au développement ──
const verrou = JSON.parse(readFileSync(join(racine, "package-lock.json"), "utf8"));
const js = Object.entries(verrou.packages ?? {})
  .filter(([chemin, p]) => chemin.startsWith("node_modules/") && !p.dev && !p.devOptional)
  .map(([chemin, p]) => ({
    nom: chemin.slice(chemin.lastIndexOf("node_modules/") + "node_modules/".length),
    version: p.version ?? "",
    licence: typeof p.license === "string" ? p.license : "voir le texte",
    textes: textesDeLicence(join(racine, chemin)),
  }))
  .sort((a, b) => a.nom.localeCompare(b.nom));

// ── L'application : les crates Rust de la plateforme construite ──
const hote = execFileSync("rustc", ["-vV"], { encoding: "utf8" }).match(/^host: (.+)$/m)?.[1];
const args = ["metadata", "--format-version", "1", "--manifest-path", join(racine, "src-tauri", "Cargo.toml"), "--filter-platform", hote];
if (!enLigne) args.push("--offline");
const meta = JSON.parse(execFileSync("cargo", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }));
const presents = new Set((meta.resolve?.nodes ?? []).map((n) => n.id));
const rust = meta.packages
  .filter((p) => presents.has(p.id) && p.source) // `source` vide : le paquet de l'application elle-même
  .map((p) => ({
    nom: p.name,
    version: p.version,
    licence: p.license ?? (p.license_file ? "voir le texte" : "non précisée"),
    textes: textesDeLicence(dirname(p.manifest_path)),
  }))
  .sort((a, b) => a.nom.localeCompare(b.nom) || a.version.localeCompare(b.version));

/** Le texte de la licence MIT, pour les données reprises (le banc de filtres de Whisper). */
const LICENCE_MIT = "Permission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the \"Software\"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.";

const ligne = (c) => `${c.nom} ${c.version} — ${c.licence}`;
const parties = [
  "Maîtrize — licences des composants tiers",
  "",
  "Maîtrize est distribué sous la licence GNU Affero General Public License v3 (AGPL-3.0) ; son code source :",
  "https://github.com/TijjAce/maitrize-tauri. Il embarque les composants ci-dessous, chacun sous sa propre licence,",
  "dont le texte suit la liste.",
  "",
  `Relevé pour ${hote}. Les pictogrammes (ARASAAC, Sclera, F. Bajard) et les modèles de transcription ne sont pas`,
  "embarqués : ils se téléchargent depuis l'application, et leurs licences y sont rappelées.",
  "",
  "== Données reprises ==",
  "Banc de filtres mel de Whisper (src-tauri/assets/melfilters.bytes) : les valeurs du modèle de référence",
  "d'OpenAI, https://github.com/openai/whisper — licence MIT.",
  "",
  "MIT License",
  "",
  "Copyright (c) 2022 OpenAI",
  "",
  ...LICENCE_MIT.split("\n"),
  "",
  `== Interface (JavaScript) — ${js.length} composants ==`,
  ...js.map(ligne),
  "",
  `== Application (Rust) — ${rust.length} composants ==`,
  ...rust.map(ligne),
  "",
  "== Textes des licences ==",
];
// Chaque texte une fois, avec les composants qui le partagent : la licence Apache ou MIT d'origine revient
// des centaines de fois, mot pour mot.
const parTexte = new Map();
for (const c of [...js, ...rust]) {
  for (const texte of c.textes) parTexte.set(texte, [...(parTexte.get(texte) ?? []), `${c.nom} ${c.version}`]);
}
for (const [texte, qui] of parTexte) parties.push("", `--- ${qui.join(", ")} ---`, texte);
const sortie = join(racine, "public", "licences-tierces.txt");
writeFileSync(sortie, parties.join("\n") + "\n");
const sansTexte = [...js, ...rust].filter((c) => !c.textes.length).map(ligne);
console.log(`${js.length} composants JavaScript, ${rust.length} composants Rust → ${sortie}`);
if (sansTexte.length) console.log(`Sans fichier de licence (mention de la seule licence) : ${sansTexte.length}\n  ${sansTexte.slice(0, 15).join("\n  ")}`);
if (!existsSync(sortie)) process.exit(1);
