import React from "react";
import { texteErreur } from "../api";
import { toast } from "./Toaster";
import { motDuFichier } from "../imagesPerso";
import { cleDuMot, garderMonPicto, lireMesPictos } from "../mesPictos";

// ── Vos symboles Makaton ───────────────────────────────────────────────────
//
// Les symboles Makaton appartiennent à la Makaton Charity : ils se
// reçoivent sous licence, avec la formation, et ne se rediffusent pas.
// L'application n'en livre donc aucun. L'enseignant qui en a importe ses
// fichiers : chacun rejoint Mes pictos sous le mot de son nom de fichier
// (« lundi.png » → « lundi »), avec l'étiquette « Makaton », et se trouve
// ensuite partout où l'on cherche un picto.

/** L'image lue, en PNG carré sur fond blanc : la taille d'un picto, quel que soit le format reçu. */
async function enPng(f: File, cote = 512): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const toile = document.createElement("canvas");
    toile.width = toile.height = cote;
    const pinceau = toile.getContext("2d");
    if (!pinceau || !image.naturalWidth || !image.naturalHeight) throw new Error("Image illisible.");
    pinceau.fillStyle = "#fff";
    pinceau.fillRect(0, 0, cote, cote);
    const k = Math.min(cote / image.naturalWidth, cote / image.naturalHeight);
    const [l, h] = [image.naturalWidth * k, image.naturalHeight * k];
    pinceau.drawImage(image, (cote - l) / 2, (cote - h) / 2, l, h);
    return toile.toDataURL("image/png").split(",")[1] ?? "";
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Importe les fichiers comme symboles Makaton : ceux dont le mot y est déjà ne reviennent pas en double. */
export async function importerSymbolesMakaton(fichiers: File[]): Promise<{ importes: number; deja: string[]; illisibles: string[] }> {
  const connus = new Set((await lireMesPictos()).filter((p) => p.origine === "makaton").map((p) => cleDuMot(p.mot)));
  let importes = 0;
  const deja: string[] = [];
  const illisibles: string[] = [];
  for (const f of fichiers) {
    const mot = motDuFichier(f.name) || f.name.replace(/\.[^.]+$/, "");
    if (connus.has(cleDuMot(mot))) { deja.push(mot); continue; }
    try {
      await garderMonPicto({ mot, base64: await enPng(f), origine: "makaton" });
      connus.add(cleDuMot(mot));
      importes++;
    } catch {
      illisibles.push(f.name);
    }
  }
  return { importes, deja, illisibles };
}

/** Le bouton qui importe des symboles Makaton, et dit ce qu'il en est advenu. */
export function BoutonImportMakaton({ onImporte, className = "btn sm" }: { onImporte?: () => void; className?: string }) {
  const [occupe, setOccupe] = React.useState(false);
  const importer = async (fichiers: File[]) => {
    if (!fichiers.length) return;
    setOccupe(true);
    try {
      const { importes, deja, illisibles } = await importerSymbolesMakaton(fichiers);
      const phrases = [
        importes ? `${importes} symbole${importes > 1 ? "s" : ""} Makaton importé${importes > 1 ? "s" : ""} : cherchez-les par leur mot.` : "",
        deja.length ? `Déjà là : ${deja.slice(0, 4).join(", ")}${deja.length > 4 ? "…" : ""}.` : "",
        illisibles.length ? `Illisible${illisibles.length > 1 ? "s" : ""} : ${illisibles.slice(0, 3).join(", ")}${illisibles.length > 3 ? "…" : ""} (PNG, JPEG, GIF ou WebP).` : "",
      ].filter(Boolean);
      toast(phrases.join(" ") || "Aucun symbole importé.", { icone: "Ⓜ️", duree: 9000 });
      if (importes) onImporte?.();
    } catch (e) {
      toast("Import impossible : " + texteErreur(e), { icone: "⚠️" });
    } finally {
      setOccupe(false);
    }
  };
  return (
    <label className={className} style={{ cursor: occupe ? "default" : "pointer" }}
      title="Vos fichiers de symboles Makaton, un par mot : « lundi.png » devient « lundi ». Ils appartiennent à la Makaton Charity : n'importez que ceux que votre licence vous permet d'utiliser ; ils restent dans Maitrize, pour vos élèves.">
      {occupe ? "⏳ Import…" : "Ⓜ️ Importer des symboles Makaton"}
      <input type="file" accept="image/*" multiple hidden disabled={occupe}
        onChange={(e) => {
          const fichiers = [...(e.target.files ?? [])];
          e.target.value = "";
          void importer(fichiers);
        }} />
    </label>
  );
}
