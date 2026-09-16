// La copie du bureau sur l'ordinateur : ce qu'elle doit contenir.
//
// Le bureau de Maitrize devient un vrai dossier (sur le Bureau par défaut) :
// chaque dossier y est un dossier, chaque document déposé un fichier qui
// s'ouvre d'un double-clic, chaque texte ou séquence une page web, chaque lien
// un raccourci. Ce module dresse la liste — chemins, empreintes, contenus ;
// l'écriture sur le disque revient au backend (copie_bureau.rs), qui ne
// détruit rien.
//
// Les noms doivent passer sur macOS comme sur Windows, et rester les mêmes
// d'un passage à l'autre : sinon chaque copie déplacerait tout.

import type { DocumentCoffre, Jeu, MaterielItem, PieceJointe, Seance, Sequence, Texte } from "./api";
import { documentImprimable, escapeHtml } from "./print";
import { normaliser, PREFIXE_COULEUR } from "./dossiers";
import { versHtml } from "./texteRiche";
import { lireVideos } from "./videos";
import { htmlDeLaSequence } from "./sequenceHtml";
import { infosDuJeu, jeuxCites, sansMarqueurs, STYLE_REGLES } from "./jeuxCites";

/** Change quand la forme des fichiers écrits change : ils sont alors tous réécrits. */
const VERSION = "1";

export interface DonneesBureau {
  sequences: Sequence[];
  seances: Seance[];
  piecesJointes: PieceJointe[];
  materiels: MaterielItem[];
  textes: Texte[];
  coffre: DocumentCoffre[];
  reglages: Record<string, string>;
  jeux: Jeu[];
}

export type Plateforme = "mac" | "windows";

export type SourceCopie =
  | { genre: "fichier"; nom: string }
  /** Contenu écrit par la copie, fabriqué seulement s'il faut l'écrire. */
  | { genre: "contenu"; creer: () => string };

export interface FichierCopie { chemin: string; empreinte: string; source: SourceCopie }
export interface PlanDeCopie { fichiers: FichierCopie[]; dossiers: string[] }

/** Noms réservés à la racine de la copie (voir copie_bureau.rs). */
export const NOMS_RESERVES = ["Anciennes versions", "À lire.txt", ".maitrize-copie.json"];

/** Empreinte d'un texte : deux passes de cyrb53, en hexadécimal. */
export function empreinte(texte: string): string {
  const passe = (graine: number) => {
    let h1 = 0xdeadbeef ^ graine, h2 = 0x41c6ce57 ^ graine;
    for (let i = 0; i < texte.length; i++) {
      const c = texte.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
  };
  return passe(1) + passe(2);
}

/** Caractères refusés par Windows ou macOS dans un nom de fichier. */
const REFUSES = new Set(["<", ">", ":", '"', "/", String.fromCharCode(92), "|", "?", "*"]);
const RESERVES_WINDOWS = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
const LONGUEUR_NOM = 80;

/** Un nom que macOS et Windows acceptent tous deux. */
export function nomSur(brut: string, secours = "Sans titre"): string {
  let n = [...(brut ?? "").normalize("NFC")]
    .map((c) => (c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || REFUSES.has(c) ? " " : c))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    // Un point en tête cache le fichier sur Mac.
    .replace(/^[.\s]+/, "");
  if (n.length > LONGUEUR_NOM) n = n.slice(0, LONGUEUR_NOM);
  // Windows refuse un point ou une espace en fin de nom.
  n = n.replace(/[.\s]+$/, "");
  if (!n) n = secours;
  if (RESERVES_WINDOWS.test(n.split(".")[0].trim())) n = `${n} (fichier)`;
  return n;
}

/** L'extension d'un fichier de Maitrize, point compris : « .pdf ». */
function extensionDe(nomStocke: string): string {
  const m = /\.([A-Za-z0-9]{1,8})$/.exec(nomStocke);
  return m ? `.${m[1].toLowerCase()}` : "";
}

/** Un nom lisible sans l'extension qu'il porterait déjà : « Classeur.xlsx » → « Classeur ». */
function sansExtension(nom: string, ext: string): string {
  return ext && nom.toLowerCase().endsWith(ext) ? nom.slice(0, -ext.length) : nom;
}

const liste = <T>(json: string | null | undefined): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};

/** Les noms déjà pris dans chaque dossier de la copie, sans distinction de casse. */
class Noms {
  private pris = new Map<string, Set<string>>();
  constructor() {
    this.pris.set("", new Set(NOMS_RESERVES.map((n) => n.normalize("NFC").toLowerCase())));
  }
  /** Réserve « nom.ext » dans `dossier`, ou « nom (2).ext » s'il est pris. */
  reserver(dossier: string, nom: string, ext: string): string {
    let pris = this.pris.get(dossier);
    if (!pris) { pris = new Set(); this.pris.set(dossier, pris); }
    let candidat = `${nom}${ext}`;
    for (let i = 2; pris.has(candidat.normalize("NFC").toLowerCase()); i++) candidat = `${nom} (${i})${ext}`;
    pris.add(candidat.normalize("NFC").toLowerCase());
    return dossier ? `${dossier}/${candidat}` : candidat;
  }
}

const BOM = String.fromCharCode(0xfeff);

/** Un raccourci vers une adresse : .webloc sur Mac, .url sous Windows. */
function raccourci(url: string, plateforme: Plateforme): { ext: string; contenu: string } {
  if (plateforme === "mac") {
    return {
      ext: ".webloc",
      contenu: `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n`
        + `<plist version="1.0"><dict><key>URL</key><string>${escapeHtml(url)}</string></dict></plist>\n`,
    };
  }
  return { ext: ".url", contenu: `[InternetShortcut]\r\nURL=${url.replace(/[\r\n]/g, "")}\r\n` };
}

/** Ce que la copie doit contenir. */
export function planDeCopie(d: DonneesBureau, plateforme: Plateforme): PlanDeCopie {
  const fichiers: FichierCopie[] = [];
  const dossiersCopie = new Set<string>();
  const noms = new Noms();
  const contenu = (chemin: string, cle: string, creer: () => string) =>
    fichiers.push({ chemin, empreinte: empreinte(`${VERSION}|${plateforme}|${cle}`), source: { genre: "contenu", creer } });

  // ── Les dossiers du bureau, même vides ──
  const textes = d.textes.filter((t) => !t.dossier.startsWith("@"));
  const chemins = new Set<string>();
  const ajouterChemin = (brut: string) => {
    const segments = normaliser(brut).split("/").filter(Boolean);
    segments.forEach((_, i) => chemins.add(segments.slice(0, i + 1).join("/")));
  };
  [...d.sequences, ...d.materiels, ...textes].forEach((e) => ajouterChemin(e.dossier ?? ""));
  Object.entries(d.reglages).forEach(([cle, valeur]) => { if (cle.startsWith(PREFIXE_COULEUR) && valeur) ajouterChemin(cle.slice(PREFIXE_COULEUR.length)); });

  // Le chemin de chaque dossier du bureau dans la copie, parents d'abord.
  const reel = new Map<string, string>([["", ""]]);
  const ordre = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  [...chemins]
    .sort((a, b) => a.split("/").length - b.split("/").length || ordre(a, b))
    .forEach((chemin) => {
      const i = chemin.lastIndexOf("/");
      const parent = reel.get(i < 0 ? "" : chemin.slice(0, i)) ?? "";
      const place = noms.reserver(parent, nomSur(chemin.slice(i + 1)), "");
      reel.set(chemin, place);
      dossiersCopie.add(place);
    });
  const dossierDe = (brut: string) => reel.get(normaliser(brut ?? "")) ?? "";

  // ── Les éléments, du plus ancien au plus récent : un nouveau venu du même
  // nom prend « (2) », l'ancien garde le sien. ──
  type Element = { date: string; id: string; placer: () => void };
  const elements: Element[] = [];
  const coffre = new Map(d.coffre.map((c) => [c.id, c]));

  for (const t of textes) {
    elements.push({ date: t.dateCreation, id: t.id, placer: () => {
      const titre = t.titre.trim() || "Sans titre";
      const chemin = noms.reserver(dossierDe(t.dossier), nomSur(titre), ".html");
      contenu(chemin, `texte|${titre}|${t.contenu}`, () =>
        documentImprimable(titre, `<h1>${escapeHtml(titre)}</h1>${versHtml(t.contenu)}`));
    } });
  }

  for (const seq of d.sequences) {
    elements.push({ date: seq.dateCreation, id: seq.id, placer: () => {
      const titre = seq.titre.trim() || "Sans titre";
      const dossier = dossierDe(seq.dossier);
      const seances = d.seances.filter((s) => s.sequenceId === seq.id).sort((a, b) => a.numero - b.numero);
      const pieces = d.piecesJointes.filter((p) => seances.some((s) => s.id === p.seanceId));
      const cites = jeuxCites(seances.map((s) => sansMarqueurs(s.deroulement)).join("\n"), d.jeux)
        .map((j) => [j.titre, j.regles, infosDuJeu(j)]);
      const chemin = noms.reserver(dossier, `${nomSur(titre)} (séquence)`, ".html");
      // Le dossier n'entre pas dans l'empreinte : une séquence rangée ailleurs est déplacée, pas réécrite.
      contenu(chemin, `sequence|${JSON.stringify([{ ...seq, dossier: "" }, seances, pieces, cites])}`, () =>
        documentImprimable(titre, htmlDeLaSequence(seq, seances, pieces, d.jeux, (nom) => `maitrize-fichier:${nom}`), STYLE_REGLES));
      // Les documents joints aux séances (hors images, déjà dans la page).
      const documents = pieces.filter((p) => p.type !== "image" && p.nomFichier);
      if (documents.length) {
        const sous = noms.reserver(dossier, `${nomSur(titre)} (séquence) - documents`, "");
        dossiersCopie.add(sous);
        for (const p of documents) {
          const ext = extensionDe(p.nomFichier);
          fichiers.push({
            chemin: noms.reserver(sous, nomSur(sansExtension(p.nom, ext), "Document"), ext),
            empreinte: p.nomFichier, source: { genre: "fichier", nom: p.nomFichier },
          });
        }
      }
    } });
  }

  for (const m of d.materiels) {
    elements.push({ date: m.dateCreation, id: m.id, placer: () => {
      const titre = m.titre.trim() || "Sans titre";
      const documents = [
        ...liste<string>(m.pdfsJson).map((nom) => ({ nom, lisible: titre })),
        ...liste<string>(m.imagesJson).map((nom) => ({ nom, lisible: titre })),
        ...liste<string>(m.coffreJson).flatMap((id) => {
          const c = coffre.get(id);
          return c?.nomFichier ? [{ nom: c.nomFichier, lisible: c.nom.trim() || titre }] : [];
        }),
      ].filter((x) => typeof x.nom === "string" && x.nom);
      const liens = lireVideos(m.videosJson);
      const competence = [
        m.competenceTitre && `Compétence : ${m.competenceTitre}`,
        [m.domaineTitre, m.sousDomaineTitre].filter(Boolean).join(" › ") && `Domaine : ${[m.domaineTitre, m.sousDomaineTitre].filter(Boolean).join(" › ")}`,
        m.cycle && `Cycle : ${m.cycle}`,
      ].filter(Boolean).join("\n");
      const description = [m.descriptionMateriel.trim(), competence].filter(Boolean).join("\n\n");
      if (!documents.length && !liens.length && !description) return;
      const dossier = dossierDe(m.dossier);
      // Un document seul, sans rien autour : un fichier à son nom.
      if (documents.length === 1 && !liens.length && !description) {
        const ext = extensionDe(documents[0].nom);
        fichiers.push({
          chemin: noms.reserver(dossier, nomSur(sansExtension(titre, ext)), ext),
          empreinte: documents[0].nom, source: { genre: "fichier", nom: documents[0].nom },
        });
        return;
      }
      // Sinon un dossier à son nom, avec tout ce qu'il contient.
      const sous = noms.reserver(dossier, nomSur(titre), "");
      dossiersCopie.add(sous);
      for (const doc of documents) {
        const ext = extensionDe(doc.nom);
        fichiers.push({
          chemin: noms.reserver(sous, nomSur(sansExtension(doc.lisible, ext)), ext),
          empreinte: doc.nom, source: { genre: "fichier", nom: doc.nom },
        });
      }
      if (description) {
        const texte = `${BOM}${titre}\n\n${description}\n`;
        contenu(noms.reserver(sous, "Description", ".txt"), `description|${texte}`, () => texte);
      }
      for (const lien of liens) {
        let hote = "";
        try { hote = new URL(lien.url).hostname.replace(/^www\./, ""); } catch { /* adresse illisible */ }
        const r = raccourci(lien.url, plateforme);
        const nom = nomSur(lien.titre?.trim() || (lien.youtubeId ? "Vidéo YouTube" : hote), "Lien");
        contenu(noms.reserver(sous, nom, r.ext), `lien|${lien.url}`, () => r.contenu);
      }
    } });
  }

  elements
    .sort((a, b) => ordre(a.date ?? "", b.date ?? "") || ordre(a.id, b.id))
    .forEach((e) => e.placer());

  return { fichiers, dossiers: [...dossiersCopie].sort(ordre) };
}
