// ── Le cahier journal, pour le téléphone ──────────────────────────────────
//
// Le téléphone reçoit le cahier journal des jours publiés — deux semaines en
// arrière, deux en avant, comme l'emploi du temps : pour chaque créneau, son
// prévu, son bilan, la séance posée et ses aides à la tâche. Les aides se
// dessinent ici, comme à l'impression, consignes structurées comprises ; le
// téléphone les montre ensuite aux tablettes des élèves, sur le réseau local,
// pendant l'activité. La consigne d'une feuille posée dans la séance part
// aussi, comme une aide : elle n'est plus sur le papier (voir optionsFeuille).
// Les fiches d'« En retard » citées au prévu du créneau partent de même, une
// par une, chacune avec sa consigne et son minuteur ; quand le créneau en a
// plusieurs, leur déroulement part avec elles — ce qui va se passer, dans
// l'ordre —, et la tablette y surligne la fiche en cours.
//
// Tout part chiffré avec la clé du retour (voir telephone.rs) : Nuage ne lit
// rien. Rien ne repart qui n'a pas changé ; ici, rien ne se redessine non plus.

import type { Creneau, MaterielItem, Seance } from "./api";
import { pdfsCites } from "./materielAImprimer";
import { eleveDeLaFiche, lirePdfs, titreSansLEleve } from "./materielSeance";
import { lireFabrication, MINUTEUR_MAX } from "./modifierFeuille";

/** Les ateliers de Fabriquer dont une feuille est une aide à la tâche : celles-là vont aux tablettes. */
export const ATELIERS_D_AIDE = ["sequentiel", "priseDeParole", "codePhrase", "codeLecture", "resolution", "modelisation", "fonction"] as const;

/** Combien de jours avant et après aujourd'hui : ceux de l'emploi du temps publié (telephone.rs). */
export const JOURS_PASSES = 14;
export const JOURS_PUBLIES = 14;

/**
 * Une aide citée par un créneau, et le minuteur qui part avec elle, en minutes
 * (0 : aucun) : celui du créneau pour une aide de sa séance, le sien pour une
 * fiche d'« En retard ».
 */
export interface AideDuJournal {
  id: string; titre: string; minuteur: number;
  /** Sa place dans le déroulement du créneau, pour une fiche d'élève ; absente sinon. */
  etape?: number;
}
export interface CreneauDuJournal {
  id: string; debut: string; fin: string; matiere: string; prevu: string; bilan: string;
  /** La séance posée, par son titre ; vide sans séance. */
  seance: string;
  aides: AideDuJournal[];
  /** Le minuteur des tablettes, en minutes ; 0 : aucun. Le téléphone l'envoie avec l'aide, depuis le créneau. */
  minuteur: number;
  /** Le déroulement du créneau — ses fiches, dans l'ordre —, cité par sa clé ; vide sans déroulement. */
  deroule: string;
}
export interface JourDuJournal { jour: string; creneaux: CreneauDuJournal[] }
export interface JournalTelephone { publie: string; jours: JourDuJournal[] }
/** Une aide confiée à la publication : la clé par laquelle le journal la cite, son titre, sa page complète. */
export interface AideAPublier { cle: string; titre: string; html: string }

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Les jours publiés, du plus ancien au plus lointain. */
export function joursPublies(aujourdHui: Date): string[] {
  return Array.from({ length: JOURS_PASSES + JOURS_PUBLIES }, (_, k) => {
    const d = new Date(aujourdHui.getFullYear(), aujourdHui.getMonth(), aujourdHui.getDate() - JOURS_PASSES + k);
    return iso(d);
  });
}

const estUnAtelierDAide = (atelier: string) => (ATELIERS_D_AIDE as readonly string[]).includes(atelier);

/** Une aide de séance : un matériel posé dans une séance, fait par un atelier d'aides, ou une feuille qui envoie sa consigne aux tablettes. */
export const estUneAide = (m: MaterielItem): boolean => {
  const f = lireFabrication(m.fabricationJson);
  return !!m.seanceId && !!f && (estUnAtelierDAide(f.atelier) || !!f.consigne);
};

/** Une fiche faite pour un élève par « En retard », en PDF : citée au prévu de son créneau, elle part aux tablettes. */
export const estUneFicheDEleve = (m: MaterielItem): boolean => !!eleveDeLaFiche(m) && lirePdfs(m.pdfsJson).length > 0;

/** Le nom d'une aide au téléphone : celui de l'aide ou de la fiche d'élève, ou « Consigne — » et celui de la feuille. */
export const titreDeLAide = (m: MaterielItem): string => {
  const f = lireFabrication(m.fabricationJson);
  return f && !f.eleve && !estUnAtelierDAide(f.atelier) && f.consigne ? `Consigne — ${m.titre}` : m.titre;
};

/**
 * Le titre que les tablettes affichent : celui de l'aide — et, pour une fiche
 * d'élève, sans l'élève ni le jour, comme sur le papier (voir materielSeance).
 */
export const titrePourLesTablettes = (m: MaterielItem): string => {
  const e = eleveDeLaFiche(m);
  return e ? titreSansLEleve(m.titre, e.prenom) : titreDeLAide(m);
};

/** Les aides qu'un créneau envoie aux tablettes : celles de la séance qui y est posée. */
export const aidesDuCreneau = (c: Pick<Creneau, "seanceId">, materiel: MaterielItem[]): MaterielItem[] =>
  c.seanceId ? materiel.filter((m) => m.seanceId === c.seanceId && estUneAide(m)) : [];

/** Les fiches d'élève citées au prévu d'un créneau, dans l'ordre du prévu. */
export const fichesDuCreneau = (c: Pick<Creneau, "prevu">, materiel: MaterielItem[]): MaterielItem[] =>
  pdfsCites(c.prevu ?? "", materiel.filter(estUneFicheDEleve));

/** La clé du déroulement d'un créneau : la publication la remplace par l'empreinte de sa page. */
export const cleDuDeroulement = (creneauId: string) => `deroule:${creneauId}`;
/** Le titre du déroulement, en tête de sa page et sur les tablettes. */
export const TITRE_DU_DEROULEMENT = "Ce qui va se passer";

/** Le minuteur d'une fiche d'élève, en minutes ; 0 : aucun. */
export const minuteurDeLaFiche = (m: MaterielItem): number => lireFabrication(m.fabricationJson)?.minuteur ?? 0;

/** Les durées proposées pour le minuteur des tablettes, en minutes : jusqu'à deux heures, ce que le portail du téléphone accepte. */
export const MINUTEURS_DES_TABLETTES = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 45, 60, 90, MINUTEUR_MAX];

/** « 15 min », « 1 h », « 1 h 30 » : la durée d'un minuteur, comme le téléphone l'écrit. */
export function dureeDuMinuteur(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const reste = minutes % 60;
  return `${Math.floor(minutes / 60)} h${reste ? ` ${String(reste).padStart(2, "0")}` : ""}`;
}

/** Le minuteur d'un créneau, en minutes entières : 0 sans minuteur, deux heures au plus. */
export const minuteurDuCreneau = (c: Pick<Creneau, "minuteur">): number =>
  Math.min(MINUTEUR_MAX, Math.max(0, Math.round(Number(c.minuteur) || 0)));

/** La page de la consigne d'une feuille, pour les tablettes : son titre, ses blocs de consigne et de règle, en grand. */
export function pageDeLaConsigne(titre: string, consigne: string): string {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  return `<div class="page"><div class="titre">${esc(titre)}</div>${consigne}</div>`;
}

/** Sur une tablette, la consigne se lit de loin : plus grande que sur la feuille. */
export const STYLE_CONSIGNE_TABLETTE = `
  .feuille .page > .titre { font-size: 24px; margin-bottom: 12px; }
  .feuille .regle, .feuille .consigne, .feuille .cu-consigne, .feuille .ls-consigne, .feuille .fa-consigne { font-size: 20px; line-height: 1.5; }
`;

/**
 * Le cahier journal des jours publiés : chaque créneau de chaque jour, avec
 * les aides de sa séance puis les fiches d'élève de son prévu, citées par la
 * clé de leur matériel. Un jour sans créneau y figure vide : le téléphone sait
 * alors que c'est un jour sans classe.
 */
export function journalDes(jours: string[], creneaux: Creneau[], seances: Seance[], materiel: MaterielItem[]): JournalTelephone {
  const titreDe = new Map(seances.map((s) => [s.id, s.titre]));
  const deSeance = materiel.filter((m) => !!m.seanceId);
  const fiches = materiel.filter(estUneFicheDEleve);
  return {
    publie: "",
    jours: jours.map((jour) => ({
      jour,
      creneaux: creneaux
        .filter((c) => (c.date ?? "").slice(0, 10) === jour)
        .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
        .map((c) => {
          const minuteur = minuteurDuCreneau(c);
          const lesFiches = fichesDuCreneau(c, fiches);
          // Plusieurs fiches se suivent : leur déroulement part avec elles.
          const avecDeroule = lesFiches.length >= 2;
          return {
            id: c.id, debut: c.heureDebut, fin: c.heureFin, matiere: c.matiere ?? "", prevu: c.prevu ?? "", bilan: c.bilan ?? "",
            seance: c.seanceId ? titreDe.get(c.seanceId) ?? "" : "",
            aides: [
              ...aidesDuCreneau(c, deSeance).map((m) => ({ id: m.id, titre: titreDeLAide(m), minuteur })),
              ...lesFiches.map((m, i) => ({ id: m.id, titre: titreDeLAide(m), minuteur: minuteurDeLaFiche(m), ...(avecDeroule ? { etape: i } : {}) })),
            ],
            minuteur,
            deroule: avecDeroule ? cleDuDeroulement(c.id) : "",
          };
        }),
    })),
  };
}

/** Ce qui suffit à savoir que le journal n'a pas changé depuis la dernière publication. */
export function signatureDuJournal(journal: JournalTelephone, materiel: MaterielItem[]): string {
  const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
  return JSON.stringify([journal.jours, materiel.filter((m) => cites.has(m.id)).map((m) => [m.id, m.titre, m.fabricationJson ?? ""])]);
}

// ── Dessiner une aide ──────────────────────────────────────────────────────
// Les ateliers et l'API sont chargés à la demande : le reste du module se teste sans eux.

/** Les pages déjà dessinées, par matériel et par fabrication : une aide qui ne change pas ne se redessine pas. */
const dessinees = new Map<string, string>();

/**
 * La page complète d'une aide de séance, comme à l'impression ; celle d'une
 * fiche d'élève : son titre et sa consigne — son titre seul pour une fiche
 * faite avant qu'on garde sa consigne. Rien pour un matériel qui n'en est pas une.
 */
export async function pageDeLAide(m: MaterielItem): Promise<string | null> {
  const f = lireFabrication(m.fabricationJson);
  if (!f || !(estUnAtelierDAide(f.atelier) || f.consigne || f.eleve)) return null;
  const cle = `${m.id}|${m.fabricationJson ?? ""}`;
  const deja = dessinees.get(cle);
  if (deja) return deja;
  if (!estUnAtelierDAide(f.atelier)) {
    // La consigne d'une feuille : structurée, et avec les pictos de ses verbes si l'enseignant en a choisi.
    const { STYLE_FEUILLE } = await import("./cartesImprimables");
    const { documentImprimable } = await import("./print");
    const { STYLE_CONSIGNES_STRUCTUREES, structurerConsignesHtml } = await import("./consignesStructurees");
    const { consignesEnPictos } = await import("./impressionAtelier");
    const titre = titrePourLesTablettes(m);
    const pictos = await consignesEnPictos(structurerConsignesHtml(pageDeLaConsigne(titre, f.consigne ?? "")));
    const page = documentImprimable(titre, pictos.corps, STYLE_FEUILLE + STYLE_CONSIGNES_STRUCTUREES + pictos.style + STYLE_CONSIGNE_TABLETTE);
    dessinees.set(cle, page);
    return page;
  }
  const a = await import("./aidesALaTache");
  const { sequentielImprimable, priseDeParoleImprimable } = await import("./aidesDesSequences");
  const { STYLE_FEUILLE } = await import("./cartesImprimables");
  const { documentImprimable } = await import("./print");
  const { STYLE_CONSIGNES_STRUCTUREES, structurerConsignesHtml } = await import("./consignesStructurees");
  const mem = f.memoires ?? {};
  let rendu: { html: string; style: string };
  switch (f.atelier) {
    case "sequentiel": rendu = await sequentielImprimable(a.reglagesSequentielSurs(mem.sequentiel)); break;
    case "priseDeParole": rendu = await priseDeParoleImprimable(a.reglagesParoleSurs(mem.priseDeParole)); break;
    case "resolution": rendu = { html: a.htmlResolution(a.reglagesResolutionSurs(mem.resolution)), style: a.STYLE_AIDES }; break;
    case "modelisation": rendu = { html: a.htmlModelisation(a.reglagesModelisationSurs(mem.modelisation)), style: a.STYLE_AIDES }; break;
    case "codePhrase": {
      // Sur la tablette, le code se lit de loin : l'affiche, quel que soit le format imprimé.
      const c = await import("./codeDeLaPhrase");
      const carte = c.reglagesCarteSurs((mem.codePhraseCarte ?? {}) as Partial<import("./codeDeLaPhrase").ReglagesCarteCode>);
      rendu = { html: c.htmlCodeDeLaPhrase(c.lireCode(mem.codePhrase), { ...carte, format: "affiche" }), style: c.STYLE_CODE_PHRASE };
      break;
    }
    case "codeLecture": {
      // De même : l'affiche du code de la lecture, lisible de loin.
      const c = await import("./codeDeLaLecture");
      const carte = c.reglagesCarteLectureSurs((mem.codeLectureCarte ?? {}) as Partial<import("./codeDeLaLecture").ReglagesCarteLecture>);
      rendu = { html: c.htmlCodeDeLaLecture(c.lireCodeLecture(mem.codeLecture), { ...carte, format: "affiche" }), style: c.STYLE_CODE_LECTURE };
      break;
    }
    default: rendu = { html: a.htmlFonction(a.reglagesFonctionSurs(mem.fonction)), style: a.STYLE_AIDES };
  }
  const { sansReferences } = await import("./references");
  const page = documentImprimable(m.titre, sansReferences(structurerConsignesHtml(rendu.html)), STYLE_FEUILLE + rendu.style + STYLE_CONSIGNES_STRUCTUREES);
  dessinees.set(cle, page);
  return page;
}

// ── Le déroulement d'un créneau ────────────────────────────────────────────

/** Les déroulements déjà dessinés, par leurs fiches : un créneau qui ne change pas ne se redessine pas. */
const deroulementsDessines = new Map<string, string>();

const echapper = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** La flèche d'un cadre au suivant, de haut en bas. */
const FLECHE_DU_DEROULEMENT = '<svg class="dr-fleche" viewBox="0 0 24 44" aria-hidden="true"><path d="M12 3v36M4 30l8 9 8-9" fill="none" stroke="#3a3a3a" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const STYLE_DU_DEROULEMENT = `
  .page > .titre { font-size: 28px; font-weight: 800; text-align: center; margin: 4px 0 16px; }
  .dr { display: flex; flex-direction: column; align-items: center; }
  .dr-etape { display: flex; align-items: center; gap: 16px; width: 100%; max-width: 560px; box-sizing: border-box; padding: 12px 18px;
    border: 3px solid #3a3a3a; border-radius: 18px; background: #fff; }
  .dr-etape img, .dr-vide { width: 88px; height: 88px; object-fit: contain; flex: none; }
  .dr-vide { border: 2px dashed #cbc8d8; border-radius: 12px; box-sizing: border-box; }
  .dr-mots { display: flex; flex-direction: column; gap: 3px; }
  .dr-matiere { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  .dr .at-texte { font-size: 22px; font-weight: 700; line-height: 1.25; }
  .dr-fleche { display: block; width: 24px; height: 44px; margin: 4px 0; }
`;

/**
 * Le déroulement d'un créneau, pour les tablettes : ses fiches dans l'ordre,
 * chacune dans son cadre — sa matière, son picto, son nom sans l'élève —,
 * reliées par des flèches, de haut en bas. Chaque cadre est une étape : le
 * téléphone les lit pour que la tablette surligne la fiche en cours.
 */
export async function pageDuDeroulement(fiches: MaterielItem[]): Promise<string> {
  const cle = fiches.map((m) => `${m.id}|${m.titre}`).join("\n");
  const deja = deroulementsDessines.get(cle);
  if (deja) return deja;
  const { api } = await import("./api");
  const { documentImprimable } = await import("./print");
  const { matiereDeLaRecette, motDuPictoDeLaFiche, recetteDuTitre } = await import("./fichesAutonomie");
  const etapes = fiches.map((m) => {
    const titre = titrePourLesTablettes(m);
    const r = recetteDuTitre(titre);
    return { titre, matiere: r ? matiereDeLaRecette(r) : "", mot: r ? motDuPictoDeLaFiche(r, titre) : "" };
  });
  // Les pictos de la banque de l'ordinateur, au sens de la classe comme ceux des consignes ; sans elle, des cadres sans image.
  const ids = new Map<string, number>();
  const images = new Map<number, string>();
  try {
    const trouves = await api.arasaacPourConsignes([...new Set(etapes.map((e) => e.mot).filter(Boolean))]);
    for (const p of trouves) ids.set(p.mot.toLowerCase(), p.id);
    for (const id of new Set(ids.values())) {
      try { images.set(id, `data:image/png;base64,${await api.arasaacImage(id)}`); } catch { /* ce picto manque */ }
    }
  } catch { /* pas de banque */ }
  const cadres = etapes.map((e, i) => {
    const image = images.get(ids.get(e.mot.toLowerCase()) ?? -1);
    return (i ? FLECHE_DU_DEROULEMENT : "") + `<div class="at-etape dr-etape">${image ? `<img src="${image}" alt="">` : '<span class="dr-vide"></span>'}`
      + `<span class="dr-mots">${e.matiere ? `<span class="dr-matiere">${echapper(e.matiere)}</span>` : ""}<span class="at-texte">${echapper(e.titre)}</span></span></div>`;
  }).join("");
  const page = documentImprimable(TITRE_DU_DEROULEMENT,
    `<div class="page"><div class="titre">${TITRE_DU_DEROULEMENT}</div><div class="dr">${cadres}</div></div>`, STYLE_DU_DEROULEMENT);
  deroulementsDessines.set(cle, page);
  return page;
}

// ── Publier ────────────────────────────────────────────────────────────────

let publiee = "";
let enCours = false;

/**
 * Publie le cahier journal pour le téléphone s'il a changé depuis la
 * dernière fois : appelée par la relève de fond, une fois le téléphone relié.
 * Silencieuse : un échec se retente au passage suivant.
 */
export async function publierLeJournal(maintenant = new Date()): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    const { api } = await import("./api");
    const jours = joursPublies(maintenant);
    const [creneaux, seances, materiel] = await Promise.all([
      api.creneauxList(jours[0], jours[jours.length - 1]), api.seancesList(), api.materielList(),
    ]);
    const journal = journalDes(jours, creneaux, seances, materiel);
    const signature = signatureDuJournal(journal, materiel);
    if (signature === publiee) return;
    const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
    const aides: AideAPublier[] = [];
    for (const m of materiel.filter((x) => cites.has(x.id))) {
      const html = await pageDeLAide(m).catch(() => null);
      if (html) aides.push({ cle: m.id, titre: titrePourLesTablettes(m), html });
    }
    // Le déroulement des créneaux à plusieurs fiches : les fiches de leur prévu, dans l'ordre.
    const fiches = materiel.filter(estUneFicheDEleve);
    for (const c of creneaux) {
      const cle = cleDuDeroulement(c.id);
      if (!journal.jours.some((j) => j.creneaux.some((x) => x.deroule === cle))) continue;
      const html = await pageDuDeroulement(fichesDuCreneau(c, fiches)).catch(() => null);
      if (html) aides.push({ cle, titre: TITRE_DU_DEROULEMENT, html });
    }
    const bilan = await api.telephonePublierJournal(journal, aides);
    if (bilan.relie) publiee = signature;
  } catch {
    // Pas de réseau, pas de relais : le passage suivant réessaiera.
  } finally {
    enCours = false;
  }
}
