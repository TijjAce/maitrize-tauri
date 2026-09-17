import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, MaterielItem, Texte, couleurHex, couleurPourMatiere, newId, nowIso, texteErreur } from "../api";
import { Input, Confirm, Demander, Modal, ColorPicker, useAsync } from "../components/ui";
import { VignettePdf } from "../components/VignettePdf";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FormMateriel } from "../components/FormMateriel";
import { texteBrut } from "../texteRiche";
import { disposer, poser, lireDispositions, lirePositions, reporterDispositions, PREFIXE_BUREAU, type Case, type Positions } from "../disposition";
import { EditeurTexte } from "../components/EditeurTexte";
import { IconeDossier, COULEUR_DOSSIER } from "../components/IconeDossier";
import { copierLeBureau } from "../components/CopieDuBureau";
import { FormSequence } from "../components/FormSequence";
import { contenuDirect, nature } from "../bureau";
import { lireVideos, lireLien, vignetteYoutube } from "../videos";
import { useFileDropZone, estPdf, estImage, estDocument, typeDocument, fichierEnBase64, EXTENSIONS_DOCUMENTS } from "../dragdrop";
import {
  sousDossiers, filDAriane, normaliser, parent, estDans, renommerChemin, SousDossier,
  destinationDossier, reporterCouleurs, lireCouleurs, PREFIXE_COULEUR, SANS_COULEUR, couleurDe,
  materielsDeCreationDeDossier,
} from "../dossiers";

// ── Le bureau ──────────────────────────────────────────────────────────────
//
// Une seule surface, comme un Finder : les dossiers et les documents y sont
// côte à côte, on entre dans un dossier en double-cliquant, on remonte par le
// fil d'Ariane. Pas de volet latéral — un arbre à gauche demande de tenir deux
// endroits à la fois dans sa tête.
//
// On y laisse tomber ce qu'on veut : un lien attrapé dans le navigateur, un
// PDF venu du Finder, une image. Chaque dépôt devient un matériel rangé là où
// l'on regarde.
//
// Les dossiers ne sont pas une table mais un chemin écrit sur chaque élément —
// « Français/Lecture ». Un dossier existe donc tant que quelque chose s'y
// trouve : rien à créer, renommer ou réparer en base.
//
// Comme sur un vrai bureau, on pose chaque dossier ou document où l'on veut :
// la surface est une grille de cases, et la case de chacun est gardée (voir
// disposition.ts).

/** Taille d'une case du bureau, en pixels. */
const CASE_L = 136, CASE_H = 186;

type Element =
  | { genre: "sequence"; id: string; titre: string; dossier: string; seq: Sequence }
  | { genre: "materiel"; id: string; titre: string; dossier: string; mat: MaterielItem }
  | { genre: "texte"; id: string; titre: string; dossier: string; txt: Texte };

/** Range un élément dans un dossier, quel que soit son genre. */
function enregistrerDossier(e: Element, dossier: string) {
  if (e.genre === "sequence") return api.sequenceSave({ ...e.seq, dossier });
  if (e.genre === "materiel") return api.materielSave({ ...e.mat, dossier });
  return api.texteSave({ ...e.txt, dossier });
}

/**
 * Un élément glissé depuis le bureau lui-même porte notre format : il se range
 * dans un dossier, il ne crée rien.
 */
const vientDuBureau = (e: React.DragEvent) =>
  Array.from(e.dataTransfer.types).some((t) => t === "application/json" || t === TYPE_DOSSIER);

/** Type de glisser propre aux dossiers : son contenu est un chemin. */
const TYPE_DOSSIER = "application/x-maitrize-dossier";

/** Ce qu'on lâche sur un dossier ou le fil d'Ariane : un élément, ou un dossier. */
function lireDepotInterne(dt: DataTransfer): { element?: Element; dossier?: string } {
  const chemin = dt.getData(TYPE_DOSSIER);
  if (chemin) return { dossier: chemin };
  try { return { element: JSON.parse(dt.getData("application/json")) }; } catch { return {}; }
}

/** Clés des tuiles dans la disposition d'un dossier. */
const cleDossier = (d: SousDossier) => `d:${d.nom}`;
const cleElement = (e: Element) => `${e.genre === "sequence" ? "s" : e.genre === "materiel" ? "m" : "t"}:${e.id}`;

/**
 * Le texte d'un dépôt, quel que soit le type employé par la plateforme.
 *
 * Safari, Chrome et le Finder n'annoncent pas les mêmes types pour un même
 * lien ; n'en interroger qu'un revient à ne marcher que sur l'un d'eux.
 * `text/uri-list` peut par ailleurs contenir plusieurs lignes, dont des
 * commentaires : on prend la première adresse.
 */
function lireTexteDepose(dt: DataTransfer): string {
  for (const type of ["text/uri-list", "text/plain", "URL", "public.url", "text/html"]) {
    let valeur = "";
    try { valeur = dt.getData(type); } catch { continue; }
    if (!valeur) continue;
    const ligne = valeur.split(/[\r\n]+/).map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && /^https?:\/\//i.test(l));
    if (ligne) return ligne;
    // text/html : le lien est dans un attribut href.
    const href = valeur.match(/href=["']?(https?:\/\/[^"'\s>]+)/i)?.[1];
    if (href) return href;
  }
  return "";
}

const liste = (json: string): string[] => { try { return JSON.parse(json || "[]"); } catch { return []; } };
const nb = (json: string): number => liste(json).length;

/** Un matériel neuf, rangé où il faut. Partagé par la création et les dépôts. */
const materielVierge = (dossier: string): MaterielItem => ({
  id: newId(), titre: "Nouveau matériel", descriptionMateriel: "", competenceId: "",
  competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
  imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null,
  sequenceId: null, dossier, videosJson: "[]", coffreJson: "[]",
});

/** Duplique une séquence avec toutes ses séances. */
async function dupliquerSequence(seq: Sequence) {
  const copie: Sequence = { ...seq, id: crypto.randomUUID(), titre: seq.titre + " (copie)", dateCreation: new Date().toISOString() };
  await api.sequenceSave(copie);
  const seances = await api.seancesList(seq.id);
  for (const s of seances) {
    await api.seanceSave({ ...s, id: crypto.randomUUID(), sequenceId: copie.id });
  }
  return copie;
}

export default function PlanDeTravail() {
  const nav = useNavigate();
  const { data: sequences, reload: rS } = useAsync(() => api.sequencesList(), []);
  const { data: materiels, reload: rM } = useAsync(() => api.materielList(), []);
  const { data: textes, reload: rT } = useAsync(() => api.textesList(), []);
  // La copie de ce bureau dans un vrai dossier de l'ordinateur (voir CopieDuBureau).
  const { data: copie } = useAsync(() => api.copieBureauInfo(), []);
  const ouvrirCopie = () => {
    copierLeBureau().catch(() => {});
    api.copieBureauOuvrir().catch((e) => toast("Copie introuvable : " + texteErreur(e), { icone: "⚠️" }));
  };
  const recharger = () => { rS(); rM(); rT(); };
  const [texteOuvert, setTexteOuvert] = React.useState<Texte | null>(null);
  const [sequenceFiche, setSequenceFiche] = React.useState<{ sequence: Sequence; nouvelle: boolean } | null>(null);

  const [dossier, setDossier] = React.useState("");
  const [q, setQ] = React.useState("");
  const [survol, setSurvol] = React.useState<string | null>(null);
  const [survolBureau, setSurvolBureau] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Element | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = React.useState<SousDossier | null>(null);
  const [materielOuvert, setMaterielOuvert] = React.useState<MaterielItem | null>(null);
  const [couleurs, setCouleurs] = React.useState<Record<string, string>>({});
  const [aColorer, setAColorer] = React.useState<SousDossier | null>(null);
  const [couleursLues, setCouleursLues] = React.useState(false);
  const [dispositions, setDispositions] = React.useState<Record<string, Positions>>({});
  // Relus aussi quand des données arrivent de l'autre ordinateur : un dossier
  // créé là-bas, même vide, doit paraître ici sans rouvrir le plan de travail.
  const { data: reglages } = useAsync(() => api.settingsAll(), []);
  React.useEffect(() => {
    if (!reglages) return;
    setCouleurs(lireCouleurs(reglages));
    setDispositions(lireDispositions(reglages));
    setCouleursLues(true);
  }, [reglages]);

  /** Applique des réécritures de dispositions, en base puis à l'écran. */
  const ecrireDispositions = async (ecritures: Record<string, string>) => {
    for (const [cle, valeur] of Object.entries(ecritures)) await api.settingSet(cle, valeur);
    setDispositions((avant) => {
      const apres = { ...avant };
      for (const [cle, valeur] of Object.entries(ecritures)) {
        const chemin = cle.slice(PREFIXE_BUREAU.length);
        if (valeur) apres[chemin] = lirePositions(valeur); else delete apres[chemin];
      }
      return apres;
    });
  };

  /** Applique des réécritures de couleurs, en base puis à l'écran. */
  const ecrireCouleurs = async (ecritures: Record<string, string>) => {
    for (const [cle, valeur] of Object.entries(ecritures)) await api.settingSet(cle, valeur);
    setCouleurs((avant) => {
      const apres = { ...avant };
      for (const [cle, valeur] of Object.entries(ecritures)) {
        const chemin = cle.slice(PREFIXE_COULEUR.length);
        if (valeur) apres[chemin] = valeur; else delete apres[chemin];
      }
      return apres;
    });
  };
  // Saisies courtes : `window.prompt` n'existe pas dans la fenêtre de
  // l'application, l'appel ne faisait rien et le bouton paraissait mort.
  const [demande, setDemande] = React.useState<
    { titre: string; label: string; valeur?: string; placeholder?: string; sur: (v: string) => void } | null>(null);

  const elements: Element[] = React.useMemo(() => [
    ...(sequences ?? []).map((s): Element => ({ genre: "sequence", id: s.id, titre: s.titre || "Sans titre", dossier: s.dossier, seq: s })),
    ...(materiels ?? []).map((m): Element => ({ genre: "materiel", id: m.id, titre: m.titre || "Sans titre", dossier: m.dossier, mat: m })),
    // Les dossiers « @… » sont réservés (feuilles d'informations d'Organisation) : pas sur le bureau.
    ...(textes ?? []).filter((x) => !x.dossier.startsWith("@"))
      .map((x): Element => ({ genre: "texte", id: x.id, titre: x.titre || "Sans titre", dossier: x.dossier, txt: x })),
  ], [sequences, materiels, textes]);

  // Les anciennes créations de dossier y déposaient un « Nouveau matériel »
  // vide pour que le dossier tienne. On le retire, le dossier reste.
  const menage = React.useRef(false);
  React.useEffect(() => {
    if (menage.current || !couleursLues || !materiels || !sequences || !textes) return;
    menage.current = true;
    const vides = materielsDeCreationDeDossier(materiels, elements);
    if (!vides.length) return;
    (async () => {
      const marques: Record<string, string> = {};
      for (const m of vides) {
        const chemin = normaliser(m.dossier);
        if (!couleurs[chemin]) marques[PREFIXE_COULEUR + chemin] = SANS_COULEUR;
      }
      await ecrireCouleurs(marques);
      for (const m of vides) await api.materielDelete(m.id);
      recharger();
      toast(`${vides.length} « Nouveau matériel » vide${vides.length > 1 ? "s" : ""} retiré${vides.length > 1 ? "s" : ""} : les dossiers restent.`, { icone: "🧹" });
    })().catch(() => {});
  }, [couleursLues, materiels, sequences, textes]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtre = q.trim().toLowerCase();
  const dossiers = filtre ? [] : sousDossiers(elements, dossier, Object.keys(couleurs));
  // Une recherche regarde partout : sinon il faudrait deviner où se trouve ce
  // qu'on cherche avant de le chercher.
  const ici = elements
    .filter((e) => (filtre
      ? e.titre.toLowerCase().includes(filtre) || (e.genre === "texte" && texteBrut(e.txt.contenu).toLowerCase().includes(filtre))
      : normaliser(e.dossier) === dossier))
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  // ── Disposition libre ──
  const surfaceEl = React.useRef<HTMLDivElement | null>(null);
  const observateur = React.useRef<ResizeObserver | null>(null);
  const [largeurSurface, setLargeurSurface] = React.useState(() => Math.max(CASE_L, window.innerWidth - 320));
  const surfaceRef = React.useCallback((el: HTMLDivElement | null) => {
    observateur.current?.disconnect();
    surfaceEl.current = el;
    if (!el) return;
    const mesurer = () => { if (el.clientWidth) setLargeurSurface(el.clientWidth); };
    mesurer();
    observateur.current = new ResizeObserver(mesurer);
    observateur.current.observe(el);
  }, []);
  const nbCols = Math.max(1, Math.floor(largeurSurface / CASE_L));
  const cles = [...dossiers.map(cleDossier), ...ici.map(cleElement)];
  const cleDisposition = cles.join("|");
  const disposition = React.useMemo(() => disposer(cles, dispositions[dossier] ?? {}, nbCols),
    [cleDisposition, dispositions, dossier, nbCols]); // eslint-disable-line react-hooks/exhaustive-deps
  const nbRangs = cles.length ? Math.max(...Object.values(disposition).map((c) => c.rang)) + 1 : 0;

  const glisse = React.useRef<{ cle: string; dx: number; dy: number } | null>(null);
  const [caseVisee, setCaseVisee] = React.useState<Case | null>(null);
  const caseSous = (x: number, y: number, decalage = { dx: CASE_L / 2, dy: 40 }): Case | null => {
    const el = surfaceEl.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const gauche = x - r.left - decalage.dx + CASE_L / 2, haut = y - r.top - decalage.dy + CASE_H / 2;
    return { col: Math.min(nbCols - 1, Math.max(0, Math.floor(gauche / CASE_L))), rang: Math.max(0, Math.floor(haut / CASE_H)) };
  };
  const commencerGlisser = (cle: string, e: React.DragEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    glisse.current = { cle, dx: e.clientX - r.left, dy: e.clientY - r.top };
  };
  const finirGlisser = () => { glisse.current = null; setCaseVisee(null); };
  /** Pose la tuile glissée sur la case visée ; les autres ne bougent pas. */
  const poserSurLeBureau = async (e: React.DragEvent) => {
    const g = glisse.current;
    const c = g ? caseSous(e.clientX, e.clientY, g) : null;
    finirGlisser();
    if (!g || !c || !disposition[g.cle]) return;
    const actuelle = disposition[g.cle];
    if (actuelle.col === c.col && actuelle.rang === c.rang) return;
    await ecrireDispositions({ [PREFIXE_BUREAU + dossier]: JSON.stringify(poser(disposition, g.cle, c, nbCols)) });
  };
  /** Place une tuile qu'on vient de créer à l'endroit du clic droit. */
  const caseCreation = React.useRef<Case | null>(null);
  const placerCreation = async (cle: string) => {
    const c = caseCreation.current;
    caseCreation.current = null;
    if (!c) return;
    await ecrireDispositions({ [PREFIXE_BUREAU + dossier]: JSON.stringify(poser(disposition, cle, c, nbCols)) });
  };
  const rangerParNom = () => ecrireDispositions({ [PREFIXE_BUREAU + dossier]: "" });

  // ── Déplacements et dépôts ──
  const ranger = async (e: Element, vers: string) => {
    const cible = normaliser(vers);
    if (normaliser(e.dossier) === cible) return;
    await enregistrerDossier(e, cible);
    recharger();
    toast(cible ? `Rangé dans ${cible}` : "Sorti sur le bureau", { icone: "📂" });
  };

  const deposerLien = async (texte: string) => {
    const v = lireLien(texte);
    if (!v) return false;
    await api.materielSave({
      ...materielVierge(dossier),
      titre: v.youtubeId ? "Vidéo YouTube" : new URL(v.url).hostname.replace(/^www\./, ""),
      videosJson: JSON.stringify([v]),
    });
    recharger();
    toast("Vidéo ajoutée", { icone: "▶️" });
    return true;
  };

  /**
   * Pose des fichiers sur le bureau : PDF, Word, Excel, PowerPoint, LibreOffice,
   * images. Chacun devient une tuile, qui s'ouvre d'un double-clic dans son
   * application. `dans` : lâchés sur un dossier, ils y entrent ; sinon ils se
   * posent à la case visée, les suivants à côté.
   */
  const deposerFichiers = async (fichiers: File[], ou: { dans?: string; caseDepot?: Case | null } = {}) => {
    const cible = ou.dans ?? dossier;
    const cles: string[] = [];
    for (const f of fichiers) {
      try {
        const nom = await api.fichierSave(f.name, await fichierEnBase64(f));
        const image = estImage(f.name);
        const m: MaterielItem = {
          ...materielVierge(cible),
          titre: f.name.replace(/\.[^.]+$/, ""),
          imagesJson: image ? JSON.stringify([nom]) : "[]",
          pdfsJson: image ? "[]" : JSON.stringify([nom]),
        };
        await api.materielSave(m);
        cles.push(`m:${m.id}`);
      } catch (err) {
        toast(`« ${f.name} » n'a pas pu être ajouté : ${texteErreur(err)}`, { icone: "⚠️", duree: 6000 });
      }
    }
    if (!cles.length) return;
    if (ou.caseDepot && cible === dossier && !filtre) {
      let dispo = disposition;
      let positions: Positions = {};
      for (const cle of cles) {
        positions = poser(dispo, cle, ou.caseDepot, nbCols);
        dispo = Object.fromEntries(Object.entries(positions).map(([k, [col, rang]]) => [k, { col, rang }]));
      }
      await ecrireDispositions({ [PREFIXE_BUREAU + dossier]: JSON.stringify(positions) });
    }
    recharger();
    const combien = cles.length > 1 ? `${cles.length} fichiers ajoutés` : "Fichier ajouté";
    toast(cible !== dossier ? `${combien} dans ${cible.slice(cible.lastIndexOf("/") + 1)}` : combien, { icone: "📥" });
  };

  const { ref: zoneFichiers, actif: survolFichiers } = useFileDropZone({
    accept: (c) => estDocument(c) || estImage(c),
    onFiles: (fichiers, e) => {
      const surDossier = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-chemin]")?.dataset.chemin;
      if (surDossier) deposerFichiers(fichiers, { dans: surDossier });
      else deposerFichiers(fichiers, { caseDepot: caseSous(e.clientX, e.clientY) });
    },
    onRefus: (noms) => toast(`${noms.map((n) => `« ${n} »`).join(", ")} : ce type de fichier ne se pose pas sur le bureau. `
      + "Il accepte PDF, Word, Excel, PowerPoint, LibreOffice et images.", { icone: "⚠️", duree: 7000 }),
  });
  // Importer par le sélecteur de fichiers, depuis le clic droit : les fichiers
  // se posent là où l'on a cliqué.
  const choixFichiers = React.useRef<HTMLInputElement>(null);
  const caseImport = React.useRef<Case | null>(null);

  // ── Dossiers ──
  const deplacerDossier = async (chemin: string, vers: string) => {
    const arrivee = destinationDossier(chemin, vers);
    if (!arrivee) return;
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), chemin));
    for (const e of touches) {
      const nouveau = renommerChemin(normaliser(e.dossier), chemin, arrivee);
      await enregistrerDossier(e, nouveau);
    }
    await ecrireCouleurs(reporterCouleurs(couleurs, chemin, arrivee));
    await ecrireDispositions(reporterDispositions(dispositions, chemin, arrivee));
    // On regardait l'intérieur du dossier déplacé : on le suit.
    if (dossier && estDans(dossier, chemin)) setDossier(renommerChemin(dossier, chemin, arrivee));
    recharger();
    toast(normaliser(vers) ? `Dossier rangé dans ${normaliser(vers)}` : "Dossier sorti sur le bureau", { icone: "📁" });
  };

  /** Ce qu'on lâche sur un dossier : un élément s'y range, un dossier y entre. */
  const deposerSur = (dt: DataTransfer, cible: string) => {
    const { element, dossier: d } = lireDepotInterne(dt);
    if (d) deplacerDossier(d, cible);
    else if (element) ranger(element, cible);
  };

  const creerDossier = () => setDemande({
    titre: "Nouveau dossier", label: "Nom du dossier", placeholder: "Lecture, Rituels…",
    sur: async (nom) => {
      // Le dossier est noté dans les réglages : il existe vide, sans qu'on y
      // dépose un matériel que personne n'a demandé.
      const chemin = normaliser(dossier ? `${dossier}/${nom}` : nom);
      if (!chemin) return;
      if (!couleurs[chemin]) await ecrireCouleurs({ [PREFIXE_COULEUR + chemin]: SANS_COULEUR });
      // Comme sur un bureau : le dossier apparaît là où l'on a cliqué, on y entre d'un double-clic.
      await placerCreation(`d:${chemin.slice(chemin.lastIndexOf("/") + 1)}`);
    },
  });

  const renommerDossier = (d: SousDossier) => setDemande({
    titre: "Renommer le dossier", label: "Nouveau nom", valeur: d.nom,
    sur: (nom) => { if (nom !== d.nom) appliquerRenommage(d, nom); },
  });

  const appliquerRenommage = async (d: SousDossier, nom: string) => {
    const nouveau = normaliser(parent(d.chemin) ? `${parent(d.chemin)}/${nom}` : nom);
    await ecrireCouleurs(reporterCouleurs(couleurs, d.chemin, nouveau));
    await ecrireDispositions(reporterDispositions(dispositions, d.chemin, nouveau));
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, nouveau);
      await enregistrerDossier(e, chemin);
    }
    recharger();
    toast(`Dossier renommé (${touches.length} élément(s))`, { icone: "✏️" });
  };

  /** Vide un dossier en remontant son contenu d'un cran, sans rien effacer. */
  const viderDossier = async (d: SousDossier) => {
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, parent(d.chemin));
      await enregistrerDossier(e, chemin);
    }
    // Le dossier disparaît avec sa couleur ; ses sous-dossiers remontent avec la leur.
    const { [d.chemin]: couleurRetiree, ...autres } = couleurs;
    await ecrireCouleurs({
      ...reporterCouleurs(autres, d.chemin, parent(d.chemin)),
      ...(couleurRetiree ? { [PREFIXE_COULEUR + d.chemin]: "" } : {}),
    });
    await ecrireDispositions(reporterDispositions(dispositions, d.chemin, parent(d.chemin), true));
    setDossierASupprimer(null);
    recharger();
    toast(`${touches.length} élément(s) remonté(s) d'un dossier`, { icone: "📂" });
  };

  // ── Créations ──
  const creerSequence = async () => {
    const s: Sequence = {
      id: newId(), titre: "Nouvelle séquence", matiere: "", cycle: "", objectifs: "",
      competences: "[]", competenceVisee: "", imageNom: null, couleur: "indigo",
      dateCreation: nowIso(), periode: 1, annee: "", ratingEngagement: 0, ratingFacilite: 0,
      ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "", dossier,
    };
    // La fiche d'abord : on nomme la séquence avant d'y entrer.
    setSequenceFiche({ sequence: s, nouvelle: true });
  };
  const creerRef = React.useRef(creerSequence);
  creerRef.current = creerSequence;
  React.useEffect(() => {
    // ⌘K et le tableau de bord amènent ici puis émettent cet événement.
    const h = () => creerRef.current();
    window.addEventListener("maitrize:nouvelle-sequence", h);
    return () => window.removeEventListener("maitrize:nouvelle-sequence", h);
  }, []);

  // La fiche d'abord : le matériel n'existe qu'une fois enregistré. Annuler ne
  // laisse plus de « Nouveau matériel » vide sur le bureau.
  const creerMateriel = () => setMaterielOuvert({ ...materielVierge(dossier), titre: "" });

  const creerTexte = async () => {
    const x: Texte = { id: newId(), titre: "Nouveau texte", contenu: "", dossier, dateCreation: nowIso(), dateModification: "" };
    await api.texteSave(x);
    await placerCreation(`t:${x.id}`);
    recharger();
    setTexteOuvert(x);
  };

  /** Double-clic : un dépôt simple s'ouvre tel quel, le reste en fiche. */
  const ouvrir = (e: Element) => {
    if (e.genre === "sequence") { nav(`/sequences/${e.id}`); return; }
    if (e.genre === "texte") { setTexteOuvert(e.txt); return; }
    const c = contenuDirect(e.mat);
    if (!c) { setMaterielOuvert(e.mat); return; }
    // Dans le navigateur : l'intégration YouTube exige un référent que la
    // fenêtre de l'application compilée (tauri://) ne fournit pas.
    if (c.genre === "video") openUrl(c.video.url).catch(() => window.open(c.video.url, "_blank"));
    else api.fichierOuvrir(c.nom).catch((err) => toast(String(err), { icone: "⚠️" }));
  };

  const supprimer = async (e: Element) => {
    if (e.genre === "sequence") await api.sequenceDelete(e.id);
    else if (e.genre === "texte") await api.texteDelete(e.id);
    else await api.materielDelete(e.id);
    setASupprimer(null);
    recharger();
  };

  const fil = filDAriane(dossier);

  const tuileElement = (e: Element) => (
    <TuileElement key={e.genre + e.id} element={e}
      onOuvrir={() => ouvrir(e)}
      onModifier={e.genre === "materiel" && contenuDirect(e.mat) ? () => setMaterielOuvert(e.mat)
        : e.genre === "sequence" ? () => setSequenceFiche({ sequence: e.seq, nouvelle: false }) : undefined}
      onRanger={() => setDemande({
        titre: "Ranger dans…", label: "Chemin du dossier",
        valeur: e.dossier, placeholder: "Français/Lecture",
        sur: (c) => ranger(e, c),
      })}
      onSupprimer={() => setASupprimer(e)}
      onDuplique={recharger}
      onGlisser={(ev) => commencerGlisser(cleElement(e), ev)} onFinGlisser={finirGlisser} />
  );

  return (
    <Page titre="Plan de travail" sous="Votre bureau : séquences, matériel, documents">

      <div className="toolbar">
        {/* Fil d'Ariane : on remonte en cliquant, et l'on peut y déposer pour
            ranger un cran plus haut. */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", flex: 1 }}>
          {fil.map((n, i) => (
            <React.Fragment key={n.chemin || "racine"}>
              {i > 0 && <span style={{ color: "var(--text-2)" }}>›</span>}
              <button
                onClick={() => { setDossier(n.chemin); setQ(""); }}
                onDragOver={(e) => { e.preventDefault(); setSurvol(n.chemin); }}
                onDragLeave={() => setSurvol(null)}
                onDrop={(e) => { e.preventDefault(); setSurvol(null); deposerSur(e.dataTransfer, n.chemin); }}
                style={{
                  border: "none", background: survol === n.chemin ? "var(--accent)" : "transparent",
                  color: survol === n.chemin ? "#fff" : i === fil.length - 1 ? "var(--text)" : "var(--text-2)",
                  font: "inherit", fontWeight: i === fil.length - 1 ? 700 : 400,
                  padding: "3px 7px", borderRadius: 6, cursor: "pointer",
                }}>
                {i === 0 ? "🖥 " : ""}{n.nom}
              </button>
            </React.Fragment>
          ))}
          <div style={{ flex: 1 }} />
          <button type="button" className="btn ghost sm" disabled={!!filtre || !dispositions[dossier]}
            title={dispositions[dossier]
              ? "Remettre les icônes en ordre : les dossiers d'abord, puis par nom"
              : "Déjà rangé : les icônes suivent l'ordre des noms"}
            onClick={rangerParNom}>
            🧹 Ranger
          </button>
        </div>
        <Input className="search" placeholder="Rechercher partout…" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
        {copie?.active && (
          <button className="btn ghost sm" onClick={ouvrirCopie}
            title={`Ouvrir la copie de ce bureau sur l'ordinateur : ${copie.racine}`}>🗂 Copie sur l'ordinateur</button>
        )}
      </div>

      <input ref={choixFichiers} type="file" multiple hidden accept={`${EXTENSIONS_DOCUMENTS},image/*`}
        onChange={(e) => {
          const fichiers = Array.from(e.target.files ?? []);
          e.target.value = ""; // choisir deux fois le même fichier doit encore marcher
          if (fichiers.length) deposerFichiers(fichiers, { caseDepot: caseImport.current });
          caseImport.current = null;
        }} />

      {/* ── La surface ── */}
      <div ref={zoneFichiers}
        onDragOver={(e) => {
          if (vientDuBureau(e)) {
            // Une tuile du bureau qu'on déplace : on montre la case où elle arrivera.
            if (!glisse.current || filtre) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            const c = caseSous(e.clientX, e.clientY, glisse.current);
            setCaseVisee((avant) => (c && avant && avant.col === c.col && avant.rang === c.rang ? avant : c));
            return;
          }
          e.preventDefault();
          // « copy » plutôt que le défaut : sans lui, certains navigateurs
          // affichent le curseur d'interdiction même quand le dépôt est accepté.
          e.dataTransfer.dropEffect = "copy";
          setSurvolBureau(true);
        }}
        onDragLeave={(e) => {
          setSurvolBureau(false);
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCaseVisee(null);
        }}
        onDrop={async (e) => {
          if (vientDuBureau(e)) {
            e.preventDefault();
            if (glisse.current && !filtre) await poserSurLeBureau(e);
            return;
          }
          e.preventDefault(); setSurvolBureau(false);
          const texte = lireTexteDepose(e.dataTransfer);
          if (!texte) return; // un dépôt de fichiers est traité par la zone dédiée
          if (!(await deposerLien(texte))) toast("Ce n'est pas une adresse web.", { icone: "⚠️" });
        }}
        onContextMenu={(e) => {
          // Sur une tuile, c'est son propre menu qui s'ouvre.
          if ((e.target as HTMLElement).closest("[draggable]")) return;
          // Ce qu'on crée d'un clic droit apparaît à l'endroit du clic.
          const caseClic = filtre || !surfaceEl.current ? null : caseSous(e.clientX, e.clientY);
          const avecCase = (f: () => void) => () => { caseCreation.current = caseClic; f(); };
          openCtx(e, [
            { label: "Nouveau dossier", icon: "📁", onClick: avecCase(creerDossier) },
            { label: "Nouveau texte", icon: "📝", onClick: avecCase(creerTexte) },
            { label: "Nouvelle séquence", icon: "📚", sep: true, onClick: avecCase(creerSequence) },
            { label: "Nouveau matériel", icon: "🧰", onClick: creerMateriel },
            { label: "Importer des fichiers… (PDF, Word, Excel…)", icon: "📥", sep: true, onClick: () => {
              caseImport.current = caseClic;
              choixFichiers.current?.click();
            } },
            ...(!filtre && dispositions[dossier] ? [{ label: "Ranger par nom", icon: "🔤", sep: true, onClick: rangerParNom }] : []),
          ]);
        }}
        style={{
          minHeight: "60vh", borderRadius: 12, padding: 14,
          border: (survolBureau || survolFichiers) ? "2px dashed var(--accent)" : "2px dashed transparent",
          background: (survolBureau || survolFichiers) ? "var(--panel-2)" : undefined,
          transition: "background .15s",
        }}>

        {!dossiers.length && !ici.length ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{filtre ? "🔍" : "🖥"}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {filtre ? "Rien trouvé" : dossier ? "Dossier vide" : "Bureau vide"}
            </div>
            {!filtre && (
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Déposez ici un lien YouTube, un PDF, un document Word, Excel ou LibreOffice, une image.<br />
                Clic droit pour créer un dossier, un texte, une séquence, ou importer des fichiers.
              </div>
            )}
          </div>
        ) : (
          filtre ? (
            // Une recherche montre ses résultats en liste de cases, sans disposition.
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 14 }}>
              {ici.map((e) => tuileElement(e))}
            </div>
          ) : (
            <div ref={surfaceRef} className="bureau-surface" style={{ height: Math.max(nbRangs + 1, 3) * CASE_H }}>
              {caseVisee && !survol && (
                <div className="bureau-case-visee" aria-hidden="true"
                  style={{ left: caseVisee.col * CASE_L, top: caseVisee.rang * CASE_H, width: CASE_L, height: CASE_H }} />
              )}
              {dossiers.map((d) => {
                const c = disposition[cleDossier(d)];
                return (
                  <div key={d.chemin} className="bureau-case" style={{ left: c.col * CASE_L, top: c.rang * CASE_H, width: CASE_L }}>
                    <TuileDossier dossier={d} survole={survol === d.chemin}
                      couleur={couleurHex[couleurDe(couleurs[d.chemin]) ?? ""] ?? COULEUR_DOSSIER}
                      onOuvrir={() => setDossier(d.chemin)}
                      onSurvol={setSurvol}
                      onDepose={(dt) => deposerSur(dt, d.chemin)}
                      onColorer={() => setAColorer(d)}
                      onRenommer={() => renommerDossier(d)}
                      onVider={() => setDossierASupprimer(d)}
                      onGlisser={(e) => commencerGlisser(cleDossier(d), e)} onFinGlisser={finirGlisser}
                      estSaisi={() => glisse.current?.cle === cleDossier(d)} />
                  </div>
                );
              })}
              {ici.map((e) => {
                const c = disposition[cleElement(e)];
                return (
                  <div key={e.genre + e.id} className="bureau-case" style={{ left: c.col * CASE_L, top: c.rang * CASE_H, width: CASE_L }}>
                    {tuileElement(e)}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {demande && (
        <Demander titre={demande.titre} label={demande.label} valeur={demande.valeur}
          placeholder={demande.placeholder}
          onClose={() => setDemande(null)}
          onValider={(v) => { setDemande(null); demande.sur(v); }} />
      )}

      {aColorer && (
        <Modal titre={`Couleur de « ${aColorer.nom} »`} onClose={() => setAColorer(null)}
          footer={<>
            <button className="btn" onClick={() => {
              // Sans couleur, le dossier reste là, même vide.
              ecrireCouleurs({ [PREFIXE_COULEUR + aColorer.chemin]: SANS_COULEUR }); setAColorer(null);
            }}>Sans couleur</button>
            <button className="btn primary" onClick={() => setAColorer(null)}>Fermer</button>
          </>}>
          <ColorPicker value={couleurDe(couleurs[aColorer.chemin]) ?? ""} onChange={(c) => {
            ecrireCouleurs({ [PREFIXE_COULEUR + aColorer.chemin]: c }); setAColorer(null);
          }} />
        </Modal>
      )}

      {sequenceFiche && (
        <FormSequence sequence={sequenceFiche.sequence} onClose={() => setSequenceFiche(null)}
          onSaved={async (seq) => {
            const nouvelle = sequenceFiche.nouvelle;
            setSequenceFiche(null);
            if (nouvelle) await placerCreation(`s:${seq.id}`);
            recharger();
            if (nouvelle) nav(`/sequences/${seq.id}`);
          }} />
      )}

      {texteOuvert && (
        <EditeurTexte texte={texteOuvert} onClose={() => { setTexteOuvert(null); recharger(); }} />
      )}

      {materielOuvert && (
        <FormMateriel m={materielOuvert} onClose={() => setMaterielOuvert(null)}
          onSaved={() => { setMaterielOuvert(null); recharger(); }} />
      )}
      {aSupprimer && (
        <Confirm message={`Supprimer « ${aSupprimer.titre} » ?`}
          onYes={() => supprimer(aSupprimer)} onClose={() => setASupprimer(null)} />
      )}
      {dossierASupprimer && (
        <Confirm
          message={`Supprimer le dossier « ${dossierASupprimer.nom} » ? Son contenu (${dossierASupprimer.total} élément(s)) ne sera pas effacé : il remontera d'un cran.`}
          onYes={() => viderDossier(dossierASupprimer)}
          onClose={() => setDossierASupprimer(null)} />
      )}
    </Page>
  );
}

/** Un dossier posé sur le bureau : on y entre, on y dépose. */
function TuileDossier({ dossier, survole, couleur, onOuvrir, onSurvol, onDepose, onColorer, onRenommer, onVider, onGlisser, onFinGlisser, estSaisi }: {
  dossier: SousDossier; survole: boolean; couleur: string; onOuvrir: () => void;
  onSurvol: (c: string | null) => void; onDepose: (dt: DataTransfer) => void;
  onColorer: () => void; onRenommer: () => void; onVider: () => void;
  onGlisser?: (e: React.DragEvent<HTMLElement>) => void; onFinGlisser?: () => void;
  /** Vrai quand c'est ce dossier même qu'on déplace : il ne se reçoit pas, il se pose ailleurs. */
  estSaisi?: () => boolean;
}) {
  return (
    <div draggable data-chemin={dossier.chemin}
      onDragStart={(e) => { e.dataTransfer.setData(TYPE_DOSSIER, dossier.chemin); e.dataTransfer.effectAllowed = "move"; onGlisser?.(e); }}
      onDragEnd={onFinGlisser}
      onDoubleClick={onOuvrir}
      onDragOver={(e) => {
        // Un lien ou un fichier venu d'ailleurs file jusqu'au bureau, qui sait
        // l'accueillir. Lâcher un dossier sur lui-même est refusé plus loin :
        // pendant le survol, on ne peut pas encore lire ce qui est glissé.
        if (!vientDuBureau(e) || estSaisi?.()) return;
        e.preventDefault(); e.stopPropagation(); onSurvol(dossier.chemin);
      }}
      onDragLeave={() => onSurvol(null)}
      onDrop={(e) => {
        if (!vientDuBureau(e) || estSaisi?.()) return;
        e.preventDefault(); e.stopPropagation(); onSurvol(null); onDepose(e.dataTransfer);
      }}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "📂", onClick: onOuvrir },
        { label: "Renommer", icon: "✏️", onClick: onRenommer },
        { label: "Couleur…", icon: "🎨", onClick: onColorer },
        { label: "Supprimer le dossier", icon: "🗑", danger: true, sep: true, onClick: onVider },
      ])}
      title={`${dossier.nom} — ${dossier.total} élément(s)`}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10,
        background: survole ? "var(--accent)" : "transparent",
        color: survole ? "#fff" : undefined, transition: "background .12s" }}>
      <IconeDossier couleur={couleur} ouvert={survole} />
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {dossier.nom}
      </div>
      <div style={{ fontSize: 10.5, color: survole ? "#fff" : "var(--text-2)" }}>
        {dossier.total} élément{dossier.total > 1 ? "s" : ""}
      </div>
    </div>
  );
}

/**
 * Une séquence ou un matériel posé sur le bureau.
 *
 * L'aperçu passe avant le nom : on reconnaît un document à son allure avant
 * de le lire.
 */
function TuileElement({ element, onOuvrir, onModifier, onRanger, onSupprimer, onDuplique, onGlisser, onFinGlisser }: {
  element: Element; onOuvrir: () => void; onRanger: () => void;
  /** Présent pour un dépôt simple, qui s'ouvre sans passer par sa fiche. */
  onModifier?: () => void;
  onSupprimer: () => void; onDuplique: () => void;
  onGlisser?: (e: React.DragEvent<HTMLElement>) => void; onFinGlisser?: () => void;
}) {
  const seq = element.genre === "sequence" ? element.seq : null;
  const t = seq ? (couleurHex[couleurPourMatiere(seq.matiere)] ?? couleurHex.gray) : couleurHex.gray;
  const videos = element.genre === "materiel" ? lireVideos(element.mat.videosJson) : [];
  const apercuVideo = videos.find((v) => v.youtubeId);
  const image = element.genre === "materiel" ? liste(element.mat.imagesJson)[0] : seq?.imageNom;
  const pdf = element.genre === "materiel" ? liste(element.mat.pdfsJson)[0] : undefined;

  return (
    <div draggable
      onDragStart={(e) => { e.dataTransfer.setData("application/json", JSON.stringify(element)); onGlisser?.(e); }}
      onDragEnd={onFinGlisser}
      onDoubleClick={onOuvrir}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "↗", onClick: onOuvrir },
        ...(onModifier ? [{ label: "Modifier…", icon: "✏️", onClick: onModifier }] : []),
        ...(element.genre === "sequence" ? [{ label: "Dupliquer", icon: "📑",
          onClick: () => dupliquerSequence(element.seq).then(onDuplique) }] : []),
        { label: "Ranger dans…", icon: "📂", onClick: onRanger },
        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
      ])}
      title={element.titre}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 8,
        overflow: "hidden", background: t + "1f", border: `1px solid ${t}44`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {apercuVideo ? (
          <img src={vignetteYoutube(apercuVideo.youtubeId!)} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : image ? (
          <ApercuFichier nom={image} />
        ) : pdf && estPdf(pdf) ? (
          <VignettePdf nom={pdf} />
        ) : pdf ? (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 42 }}>{typeDocument(pdf).icone}</span>
            <span style={{ fontSize: 10, color: "var(--text-2)", textTransform: "uppercase" }}>{pdf.split(".").pop()}</span>
          </span>
        ) : element.genre === "texte" ? (
          <ApercuTexte contenu={element.txt.contenu} />
        ) : (
          <span style={{ fontSize: 40 }}>{element.genre === "sequence" ? "📚" : "🧰"}</span>
        )}
        {element.genre === "materiel" && (
          <div style={{ position: "absolute", bottom: 3, right: 3, display: "flex", gap: 3 }}>
            {nb(element.mat.pdfsJson) > 0 && <Pastille>📄 {nb(element.mat.pdfsJson)}</Pastille>}
            {nb(element.mat.coffreJson) > 0 && <Pastille>🔐</Pastille>}
            {videos.length > 0 && <Pastille>▶️</Pastille>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5, lineHeight: 1.2, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {element.titre}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-2)", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {element.genre === "sequence"
          ? [seq!.matiere, seq!.cycle].filter(Boolean).join(" · ") || "Séquence"
          : element.genre === "texte" ? "Texte" : nature(element.mat)}
      </div>
    </div>
  );
}

/** Les premières lignes d'un texte, posées comme sur une feuille. */
function ApercuTexte({ contenu }: { contenu: string }) {
  const debut = texteBrut(contenu).split("\n").slice(0, 14).join("\n").slice(0, 600);
  return (
    <div aria-hidden="true" style={{
      width: "72%", height: "86%", background: "#fff", borderRadius: 2, padding: "8px 8px",
      boxShadow: "0 1px 2px rgba(0,0,0,.18), 0 3px 10px rgba(0,0,0,.12)", overflow: "hidden",
      textAlign: "left", fontSize: 6.5, lineHeight: 1.35, color: "#4b5563",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {debut.trim() ? debut : <span style={{ color: "#c4c9d1", fontSize: 9 }}>Vide</span>}
    </div>
  );
}

const Pastille = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontSize: 9.5, background: "rgba(0,0,0,.55)", color: "#fff",
    borderRadius: 4, padding: "1px 4px" }}>{children}</span>
);

function ApercuFichier({ nom }: { nom: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.fichierRead(nom).then((b) => { if (vivant) setSrc(`data:image;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [nom]);
  return src
    ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : <span style={{ fontSize: 34 }}>🖼</span>;
}
