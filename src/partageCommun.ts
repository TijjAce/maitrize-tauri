// Déposer sur un bureau commun, et en récupérer : ce que fait chaque geste.
//
// Un bureau commun est un dossier partagé par un service de stockage. Ce
// module n'y lit et n'y écrit que par les commandes du backend, qui
// l'enferment dans ce dossier ; il fabrique les paquets et les déballe.

import { api, newId, nowIso, type BureauCommun, type EntreeCommune, type MaterielItem } from "./api";
import { lireCouleurs, normaliser, PREFIXE_COULEUR, SANS_COULEUR, sousDossiers } from "./dossiers";
import { estImage, fichierEnBase64 } from "./dragdrop";
import {
  base64EnTexte, compter, contenuDUnElement, contenuDuDossier, couleursDeballees, couleursDuDossier, deballer,
  destinationLibre, estPaquet, fichiersDe, nomDeFichierSur, nomDuPaquet, resumeDe, TAILLE_MAX, texteEnBase64, titreDuPaquet,
  type Contenu, type GenreElement, type Paquet, type Resume,
} from "./bureauCommun";

/** Le nom sous lequel on dépose : celui de l'enseignant, sinon une formule neutre. */
export async function auteur(): Promise<string> {
  return ((await api.settingGet("enseignantNom")) ?? "").trim() || "Un collègue";
}

const dernier = (chemin: string) => chemin.slice(chemin.lastIndexOf("/") + 1);
const parent = (chemin: string) => (chemin.includes("/") ? chemin.slice(0, chemin.lastIndexOf("/")) : "");

/** Les dossiers de mon bureau : leur chemin, du plus haut au plus profond. */
export async function dossiersDeMonBureau(): Promise<string[]> {
  const [sequences, materiels, textes, jeux, ateliers, espaces, outils, reglages] = await Promise.all([
    api.sequencesList(), api.materielList(), api.textesList(), api.jeuxList(), api.ateliersList(),
    api.espacesList(), api.outilsClasseList(), api.settingsAll(),
  ]);
  const chemins = new Set<string>();
  const ajouter = (brut: string) => {
    const segs = normaliser(brut ?? "").split("/").filter(Boolean);
    segs.forEach((_, i) => chemins.add(segs.slice(0, i + 1).join("/")));
  };
  [...sequences, ...materiels, ...textes.filter((t) => !t.dossier.startsWith("@")), ...jeux, ...ateliers, ...espaces, ...outils]
    .forEach((x) => ajouter(x.dossier));
  Object.keys(lireCouleurs(reglages)).forEach(ajouter);
  return [...chemins].sort((a, b) => a.localeCompare(b, "fr"));
}

/** Les dossiers à la racine de mon bureau, en minuscules : ce qu'on récupère ne s'y mêle pas. */
export async function dossiersPris(): Promise<Set<string>> {
  const tous = await dossiersDeMonBureau();
  const elements = tous.map((d, i) => ({ id: String(i), dossier: d }));
  return new Set(sousDossiers(elements, "", tous).map((d) => d.chemin.toLowerCase()));
}

/** Tout ce qui est sur mon bureau, pour en empaqueter une part. */
async function toutLeBureau() {
  const [sequences, seances, pieces, materiels, textes, jeux, ateliers, espaces, outils, reglages] = await Promise.all([
    api.sequencesList(), api.seancesList(), api.piecesJointesList(), api.materielList(), api.textesList(),
    api.jeuxList(), api.ateliersList(), api.espacesList(), api.outilsClasseList(), api.settingsAll(),
  ]);
  return { tout: { sequences, seances, pieces, materiels, textes, jeux, ateliers, espaces, outils }, reglages };
}

/** Empaquette un contenu et le pose sur le bureau commun. */
async function deposerContenu(
  contenu: Contenu, titre: string, couleurs: Record<string, string>, bureau: BureauCommun, ou: string,
): Promise<{ nom: string; elements: number }> {
  if (!compter(contenu)) throw new Error("Il n'y a rien à déposer ici.");
  const fichiers: Record<string, string> = {};
  let taille = 0;
  for (const nom of fichiersDe(contenu)) {
    // Un fichier disparu du disque ne doit pas empêcher de déposer le reste.
    try { fichiers[nom] = await api.fichierRead(nom); taille += fichiers[nom].length; } catch { continue; }
    if (taille > TAILLE_MAX) throw new Error("C'est trop lourd pour le bureau commun : déposez plutôt les sous-dossiers un par un.");
  }
  const qui = await auteur();
  const depose = new Date().toISOString();
  // Le résumé vient avant tout le reste : il se lit sans ouvrir les fichiers.
  const paquet: Paquet = {
    v: 1, resume: resumeDe(contenu, qui, depose, Object.keys(fichiers).length),
    dossier: titre, auteur: qui, depose, contenu, couleurs, fichiers,
  };
  const nom = nomDuPaquet(titre, qui);
  await api.communEcrire(bureau.id, ou, nom, texteEnBase64(JSON.stringify(paquet)), true);
  return { nom, elements: compter(contenu) };
}

/**
 * Dépose un dossier de mon bureau, entier, sur un bureau commun : un fichier
 * « .maitrize » à son nom et au mien. Le redéposer remplace le précédent.
 */
export async function deposerDossier(chemin: string, bureau: BureauCommun, ou = ""): Promise<{ nom: string; elements: number }> {
  const { tout, reglages } = await toutLeBureau();
  const contenu = contenuDuDossier(chemin, tout);
  return deposerContenu(contenu, dernier(normaliser(chemin)), couleursDuDossier(chemin, lireCouleurs(reglages)), bureau, ou);
}

/**
 * Dépose un seul élément — une séquence, un jeu, un matériel… — glissé sur le
 * bureau commun. Il part comme un dossier d'un seul objet.
 */
export async function deposerElement(
  genre: GenreElement, id: string, titre: string, bureau: BureauCommun, ou = "",
): Promise<{ nom: string; elements: number }> {
  const { tout } = await toutLeBureau();
  const contenu = contenuDUnElement(genre, id, tout);
  if (!compter(contenu)) throw new Error("Cet élément n'est plus sur votre bureau.");
  return deposerContenu(contenu, titre.trim() || "Sans titre", {}, bureau, ou);
}

/**
 * Un nom de fichier valable chez chacun, sur Mac comme sur PC — le dossier
 * partagé arrive chez tout le monde —, extension gardée.
 */
export function nomPosable(nom: string): string {
  const i = nom.lastIndexOf(".");
  const ext = i > 0 ? nomDeFichierSur(nom.slice(i + 1), "") : "";
  const base = nomDeFichierSur(i > 0 ? nom.slice(0, i) : nom);
  return ext ? `${base}.${ext}` : base;
}

/** Au-delà, on ne relit pas tout un paquet pour deviner ce qu'il contient. */
const RELECTURE_MAX = 2 * 1024 * 1024;

/** Ce qu'on a déjà appris d'un paquet, tant qu'il n'a pas changé. */
const RESUMES = new Map<string, Promise<Resume | null>>();

/**
 * Ce que contient un dossier Maitrize posé sur un bureau commun.
 *
 * Le résumé est écrit en tête du fichier : on n'en lit que les premiers
 * octets. Les paquets déposés avant cette écriture n'en ont pas ; on les
 * relit alors en entier, mais seulement s'ils sont légers.
 */
export function resumeDuPaquet(bureau: BureauCommun, entree: EntreeCommune): Promise<Resume | null> {
  const cle = `${bureau.id}|${entree.chemin}|${entree.modifie}`;
  let p = RESUMES.get(cle);
  if (!p) {
    p = (async () => {
      const tete = await api.communResume(bureau.id, entree.chemin).catch(() => "");
      if (tete) {
        try { return JSON.parse(tete) as Resume; } catch { /* en-tête abîmé */ }
      }
      if (entree.octets > RELECTURE_MAX) return null;
      const paquet = JSON.parse(base64EnTexte(await api.communLire(bureau.id, entree.chemin))) as Paquet;
      if (paquet?.resume) return paquet.resume;
      if (!paquet?.contenu) return null;
      return resumeDe(paquet.contenu, paquet.auteur ?? "", paquet.depose ?? "", Object.keys(paquet.fichiers ?? {}).length);
    })();
    p.catch(() => RESUMES.delete(cle));
    RESUMES.set(cle, p);
  }
  return p;
}

/**
 * Pose des fichiers — et des dossiers entiers, venus du Finder — sur un bureau
 * commun. Un fichier refusé n'arrête pas les autres : on dit lesquels.
 */
export async function poserFichiers(
  bureau: BureauCommun, dossier: string, fichiers: { chemin: string; fichier: File }[],
): Promise<{ poses: number; refuses: string[]; tropLourds: string[] }> {
  const r = { poses: 0, refuses: [] as string[], tropLourds: [] as string[] };
  for (const { chemin, fichier } of fichiers) {
    if (fichier.size > TAILLE_MAX) { r.tropLourds.push(fichier.name); continue; }
    const sous = [dossier, ...parent(chemin).split("/").filter(Boolean).map((d) => nomDeFichierSur(d))].filter(Boolean).join("/");
    try {
      await api.communEcrire(bureau.id, sous, nomPosable(dernier(chemin)), await fichierEnBase64(fichier), false);
      r.poses++;
    } catch {
      r.refuses.push(fichier.name);
    }
  }
  return r;
}

/** Un fichier récupéré devient un matériel de mon bureau, comme un fichier glissé dessus. */
function materielDuFichier(nom: string, stocke: string, dossier: string): MaterielItem {
  return {
    id: newId(), titre: nom.replace(/\.[^.]+$/, "") || nom, descriptionMateriel: "", competenceId: "",
    competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
    imagesJson: estImage(nom) ? JSON.stringify([stocke]) : "[]",
    pdfsJson: estImage(nom) ? "[]" : JSON.stringify([stocke]),
    dateCreation: nowIso(), seanceId: null, sequenceId: null, dossier, videosJson: "[]", coffreJson: "[]",
  };
}

/** Récupère un fichier du bureau commun sur mon bureau, dans `dossier`. */
export async function recupererFichier(bureau: BureauCommun, chemin: string, dossier = ""): Promise<void> {
  const nom = dernier(chemin);
  const stocke = await api.fichierSave(nom, await api.communLire(bureau.id, chemin));
  await api.materielSave(materielDuFichier(nom, stocke, dossier));
}

/**
 * Récupère un dossier Maitrize (« .maitrize ») sur mon bureau, en copie à
 * moi. Rend le dossier où il a été posé.
 *
 * `sous` : quand il vient d'un dossier récupéré en entier, il se range dedans.
 */
export async function recupererPaquet(bureau: BureauCommun, chemin: string, pris: Set<string>, sous = ""): Promise<string> {
  let paquet: Paquet;
  try {
    paquet = JSON.parse(base64EnTexte(await api.communLire(bureau.id, chemin)));
  } catch {
    throw new Error(`« ${dernier(chemin)} » n'est pas un dossier Maitrize lisible.`);
  }
  if (paquet?.v !== 1 || !paquet.contenu) throw new Error(`« ${dernier(chemin)} » vient d'une version plus récente de Maitrize.`);
  const titre = paquet.dossier || titreDuPaquet(dernier(chemin));
  const destination = sous ? normaliser(`${sous}/${titre}`) : destinationLibre(titre, paquet.auteur ?? "", pris);
  // Chaque fichier est réenregistré, sous un nouveau nom : on garde la correspondance.
  const renommes = new Map<string, string>();
  for (const [nom, contenu] of Object.entries(paquet.fichiers ?? {})) {
    try { renommes.set(nom, await api.fichierSave(nom, contenu)); } catch { /* les autres passent */ }
  }
  const c = deballer(paquet, destination, (n) => renommes.get(n) ?? n, newId);
  // Dans l'ordre des liens : la séquence avant ses séances, la séance avant ses pièces.
  for (const s of c.sequences) await api.sequenceSave(s);
  for (const s of c.seances) await api.seanceSave(s);
  for (const x of c.pieces) await api.pieceJointeSave(x);
  for (const m of c.materiels) await api.materielSave(m);
  for (const t of c.textes) await api.texteSave(t);
  for (const j of c.jeux) await api.jeuSave(j);
  for (const a of c.ateliers) await api.atelierSave(a);
  for (const e of c.espaces) await api.espaceSave(e);
  for (const o of c.outils) await api.outilClasseSave(o);
  // Le dossier existe même s'il ne contenait que des sous-dossiers, avec ses couleurs.
  const couleurs = couleursDeballees(paquet, destination);
  if (!couleurs[destination]) couleurs[destination] = SANS_COULEUR;
  for (const [ch, valeur] of Object.entries(couleurs)) await api.settingSet(PREFIXE_COULEUR + ch, valeur);
  return destination;
}

/**
 * Récupère un dossier ordinaire du bureau commun, entier : ses fichiers
 * deviennent des matériels, ses dossiers Maitrize des dossiers, rangés comme
 * sur le bureau commun. Rend le dossier où il a été posé.
 */
export async function recupererDossier(bureau: BureauCommun, chemin: string, pris: Set<string>): Promise<string> {
  const destination = destinationLibre(dernier(chemin), "reçu", pris);
  for (const f of await api.communFichiers(bureau.id, chemin)) {
    const dedans = normaliser([destination, parent(f.slice(chemin.length + 1))].filter(Boolean).join("/"));
    if (estPaquet(f)) await recupererPaquet(bureau, f, pris, dedans);
    else await recupererFichier(bureau, f, dedans);
  }
  // Le dossier paraît même vide, comme sur le bureau commun.
  await api.settingSet(PREFIXE_COULEUR + destination, SANS_COULEUR);
  return destination;
}

/**
 * Ce qu'un glisser-déposer du Finder ou de l'Explorateur apporte : les
 * fichiers, et le contenu des dossiers, avec leur chemin relatif.
 *
 * Les entrées se lisent **pendant** l'événement : après, le navigateur les
 * oublie. On les prend donc tout de suite, et on lit les dossiers ensuite.
 */
export function entreesDuDepot(dt: DataTransfer): () => Promise<{ chemin: string; fichier: File }[]> {
  type Entree = {
    isFile: boolean; isDirectory: boolean; name: string;
    file?: (ok: (f: File) => void, ko: (e: unknown) => void) => void;
    createReader?: () => { readEntries: (ok: (l: Entree[]) => void, ko: (e: unknown) => void) => void };
  };
  const entrees = Array.from(dt.items ?? [])
    .map((i) => (i as unknown as { webkitGetAsEntry?: () => Entree | null }).webkitGetAsEntry?.() ?? null)
    .filter((x): x is Entree => Boolean(x));
  const simples = Array.from(dt.files ?? []);
  return async () => {
    if (!entrees.length) return simples.map((f) => ({ chemin: f.name, fichier: f }));
    const sortie: { chemin: string; fichier: File }[] = [];
    const parcourir = async (e: Entree, prefixe: string): Promise<void> => {
      if (e.isFile && e.file) {
        const f = await new Promise<File>((ok, ko) => e.file!(ok, ko));
        sortie.push({ chemin: prefixe + f.name, fichier: f });
      } else if (e.isDirectory && e.createReader) {
        const lecteur = e.createReader();
        // Un lecteur rend les entrées par lots : on lit jusqu'au lot vide.
        for (;;) {
          const lot = await new Promise<Entree[]>((ok, ko) => lecteur.readEntries(ok, ko));
          if (!lot.length) break;
          for (const x of lot) await parcourir(x, `${prefixe}${e.name}/`);
        }
      }
    };
    for (const e of entrees) await parcourir(e, "");
    return sortie.filter((x) => !x.fichier.name.startsWith("."));
  };
}
