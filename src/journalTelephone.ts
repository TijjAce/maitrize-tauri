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
// par une, chacune avec sa consigne, son minuteur et son élève : chaque élève
// a sa tablette (demande de l'enseignant, octobre 2026), que le téléphone lui
// attribue. Les déroulements partent avec elles — ce qui va se passer, dans
// l'ordre : toujours le rituel d'abord, puis les phases de la séance ; celui
// de chaque élève finit par ses fiches —, et la tablette y surligne l'étape.
// Une séance qu'« En retard » a posée pour un élève part de même à sa
// tablette, à sa place parmi ses fiches : son « Décomposer la tâche », ou le
// séquentiel de ses étapes, avec sa durée pour minuteur (demande de
// l'enseignant, octobre 2026).
//
// Tout part chiffré avec la clé du retour (voir telephone.rs) : Nuage ne lit
// rien. Rien ne repart qui n'a pas changé ; ici, rien ne se redessine non plus.

import type { Creneau, MaterielItem, Seance, Sequence } from "./api";
import { pdfsCites } from "./materielAImprimer";
import { eleveDeLaFiche, lirePdfs, titreSansLEleve } from "./materielSeance";
import { lireFabrication, MINUTEUR_MAX } from "./modifierFeuille";
import { titresDesRituels } from "./rituels";
import { TETE_EN_AUTONOMIE } from "./lignesCitees";
import { sequencesCitees } from "./sequencesCitees";

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
  /** Sa place dans le déroulement : la première phase dans celui de la classe pour une aide de la séance, la sienne dans celui de son élève pour une fiche. */
  etape?: number;
  /** L'élève d'une fiche, par son prénom : le téléphone l'envoie à sa tablette. Absent pour une aide de la séance. */
  eleve?: string;
}
export interface CreneauDuJournal {
  id: string; debut: string; fin: string; matiere: string; prevu: string; bilan: string;
  /** La séance posée, par son titre ; vide sans séance. */
  seance: string;
  aides: AideDuJournal[];
  /** Le minuteur des tablettes, en minutes ; 0 : aucun. Le téléphone l'envoie avec l'aide, depuis le créneau. */
  minuteur: number;
  /** Le déroulement de la classe — le rituel, les phases de sa séance —, cité par sa clé ; vide sans séance. */
  deroule: string;
  /** Le déroulement de chaque élève qui a des fiches — celui de la classe, puis ses fiches —, par son prénom. */
  deroules?: Record<string, string>;
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

/** La clé d'une séance qu'« En retard » a posée pour un élève : sa tablette la reçoit comme une aide. */
export const cleDeLaSeance = (seanceId: string) => `seance:${seanceId}`;

/** Le minuteur d'une séance, en minutes : sa durée, deux heures au plus ; 0 sans durée. */
export const minuteurDeLaSeance = (s: Pick<Seance, "duree">): number => Math.min(MINUTEUR_MAX, Math.max(0, Math.round(Number(s.duree) || 0)));

/** Ce qu'un élève a à faire au créneau : une fiche d'« En retard », ou une séance qu'« En retard » lui a posée. */
export type AFaire = { eleve: string; fiche: MaterielItem; seance?: undefined } | { eleve: string; seance: Seance; fiche?: undefined };

/**
 * Ce que chaque élève a à faire au créneau, dans l'ordre du prévu : ses
 * fiches, citées par leur ligne 📄, et ses séances — sous « ⏰ En autonomie : »,
 * la ligne du bouton 📚 qu'« En retard » finit par « — PRÉNOM ».
 */
export function aFaireDuCreneau(c: Pick<Creneau, "prevu">, fiches: MaterielItem[], sequences: Sequence[] = [], seances: Seance[] = []): AFaire[] {
  const lesFiches = fichesDuCreneau(c, fiches);
  const sortie: AFaire[] = [];
  const vues = new Set<string>();
  let enAutonomie = false;
  for (const ligne of (c.prevu ?? "").split("\n")) {
    if (ligne.trim() === TETE_EN_AUTONOMIE) { enAutonomie = true; continue; }
    if (/^\s*📄/u.test(ligne)) {
      const m = pdfsCites(ligne, lesFiches)[0];
      if (m && !vues.has(m.id)) { vues.add(m.id); sortie.push({ eleve: eleveDeLaFiche(m)?.prenom ?? "", fiche: m }); }
      continue;
    }
    const pour = enAutonomie ? /^\s*📚.*\s—\s+(\S.*?)\s*$/u.exec(ligne) : null;
    const seance = pour ? sequencesCitees(ligne, sequences, seances)[0]?.seance : null;
    if (pour && seance) sortie.push({ eleve: pour[1], seance });
  }
  // Une fiche que le prévu cite autrement : à la suite.
  for (const m of lesFiches) if (!vues.has(m.id)) sortie.push({ eleve: eleveDeLaFiche(m)?.prenom ?? "", fiche: m });
  return sortie;
}

/**
 * Une étape du déroulement d'un créneau, avant son image : ce qu'on lit, la
 * matière au-dessus, et le domaine dont elle prend le picto — rien d'autre
 * (demande de l'enseignant, octobre 2026) : le rituel celui de « Rituel », une
 * phase de séance celui du domaine de la séance, une fiche d'élève celui du
 * domaine de sa sorte, retrouvé en dessinant la page (voir pictosMatieres).
 */
export interface PasDuDeroulement {
  texte: string; matiere: string; domaine?: string; rituel?: boolean; fiche?: boolean;
  /** Une fiche faite d'un support de travail : sa photo, qui lui sert de picto (voir supportsDeTravail). */
  picto?: number;
}

/** Le domaine d'une séance, par sa première compétence — la sienne, sinon celle de sa séquence : le sous-domaine, sinon le domaine. */
export function domaineDeLaSeance(seance: Pick<Seance, "competences">, sequence?: Pick<Sequence, "competences">): string {
  for (const json of [seance.competences, sequence?.competences]) {
    try {
      const liste: unknown = JSON.parse(json || "[]");
      const c = Array.isArray(liste) ? (liste[0] as { sousDomaineTitre?: unknown; domaineTitre?: unknown } | undefined) : undefined;
      const domaine = [c?.sousDomaineTitre, c?.domaineTitre].find((x): x is string => typeof x === "string" && x.trim() !== "");
      if (domaine) return domaine.trim();
    } catch { /* compétences illisibles : on regarde la séquence */ }
  }
  return "";
}

/** Les étapes d'une séance pour l'élève — ses consignes, ou ses phases dites pour lui (voir aidesALaTache). */
export type EtapesDeLaSeance = (s: Seance) => string[];

/** Les élèves qui ont des fiches au créneau, par leur prénom, dans l'ordre du prévu : chacun a sa tablette. */
export const elevesDesFiches = (fiches: MaterielItem[]): string[] =>
  [...new Set(fiches.map((m) => eleveDeLaFiche(m)?.prenom ?? "").filter(Boolean))];

/** Les élèves qui ont quelque chose à faire au créneau — une fiche, une séance —, dans l'ordre du prévu. */
export const elevesDuCreneau = (aFaire: AFaire[]): string[] => [...new Set(aFaire.map((x) => x.eleve).filter(Boolean))];

/**
 * Le déroulement d'un créneau : le rituel toujours en premier — ceux du prévu
 * par leur nom —, puis les phases de sa séance — son titre seul si elle n'en
 * dit rien. Celui d'un `eleve` finit par ses fiches, dans l'ordre du prévu ;
 * celui de la classe n'en a pas, chaque élève ayant les siennes. Rien sans
 * séance ni fiche.
 */
export function pasDuDeroulement(
  c: Pick<Creneau, "prevu">, seance: Seance | undefined, etapesDe: EtapesDeLaSeance, fiches: MaterielItem[], domaineDeSeance = "", eleve?: string,
  sequences: Sequence[] = [], seances: Seance[] = [],
): PasDuDeroulement[] {
  const lesSiennes = eleve === undefined ? [] : aFaireDuCreneau(c, fiches, sequences, seances).filter((x) => x.eleve === eleve);
  if (!seance && !lesSiennes.length) return [];
  const rituels = titresDesRituels(c.prevu ?? "");
  const phases = seance ? etapesDe(seance) : [];
  return [
    { texte: rituels.length ? rituels.join(" · ") : "Rituel", matiere: rituels.length ? "Rituel" : "", rituel: true },
    ...(seance ? (phases.length ? phases : [seance.titre]) : []).map((texte) => ({ texte, matiere: "", ...(domaineDeSeance ? { domaine: domaineDeSeance } : {}) })),
    ...lesSiennes.map((x): PasDuDeroulement => {
      if (x.seance) {
        // Une séance posée par « En retard » : son titre, la matière de sa séquence, le picto de son domaine.
        const sequence = sequences.find((q) => q.id === x.seance.sequenceId);
        const domaine = domaineDeLaSeance(x.seance, sequence);
        return { texte: x.seance.titre, matiere: sequence?.matiere ?? "", fiche: true, ...(domaine ? { domaine } : {}) };
      }
      // Un support de travail montre sa photo, et dit sa matière ; une fiche la retrouve par sa sorte, au dessin.
      const support = lireFabrication(x.fiche.fabricationJson)?.support;
      return { texte: titrePourLesTablettes(x.fiche), matiere: support?.matiere ?? "", fiche: true, ...(support ? { picto: support.photo } : {}) };
    }),
  ];
}

/** La clé du déroulement d'un créneau : la publication la remplace par l'empreinte de sa page. */
export const cleDuDeroulement = (creneauId: string) => `deroule:${creneauId}`;
/** La clé du déroulement d'un élève au créneau, remplacée de même. */
export const cleDuDeroulementDe = (creneauId: string, eleve: string) => `deroule:${creneauId}:${eleve}`;
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
export function journalDes(
  jours: string[], creneaux: Creneau[], seances: Seance[], materiel: MaterielItem[], etapesDe: EtapesDeLaSeance = () => [], sequences: Sequence[] = [],
): JournalTelephone {
  const seanceDe = new Map(seances.map((s) => [s.id, s]));
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
          const seance = c.seanceId ? seanceDe.get(c.seanceId) : undefined;
          const aFaire = aFaireDuCreneau(c, fiches, sequences, seances);
          // Le déroulement de la classe : le rituel, les phases de la séance. Celui d'un élève y ajoute ses
          // fiches et ses séances, qui en sont la fin — après le rituel seul, sans séance.
          const pas = pasDuDeroulement(c, seance, etapesDe, fiches);
          const eleves = elevesDuCreneau(aFaire);
          const debutDesFiches = pas.length || 1;
          const lesSiennes = (prenom: string) => aFaire.filter((x) => x.eleve === prenom);
          return {
            id: c.id, debut: c.heureDebut, fin: c.heureFin, matiere: c.matiere ?? "", prevu: c.prevu ?? "", bilan: c.bilan ?? "",
            seance: seance?.titre ?? "",
            aides: [
              // Une aide de la séance commence avec sa première phase, juste après le rituel.
              ...aidesDuCreneau(c, deSeance).map((m) => ({ id: m.id, titre: titreDeLAide(m), minuteur, ...(pas.length ? { etape: 1 } : {}) })),
              ...aFaire.map((x) => {
                const etape = debutDesFiches + lesSiennes(x.eleve).indexOf(x);
                return x.seance
                  ? { id: cleDeLaSeance(x.seance.id), titre: x.seance.titre, minuteur: minuteurDeLaSeance(x.seance), etape, eleve: x.eleve }
                  : { id: x.fiche.id, titre: titreDeLAide(x.fiche), minuteur: minuteurDeLaFiche(x.fiche), etape, eleve: x.eleve };
              }),
            ],
            minuteur,
            deroule: pas.length ? cleDuDeroulement(c.id) : "",
            ...(eleves.length ? { deroules: Object.fromEntries(eleves.map((e) => [e, cleDuDeroulementDe(c.id, e)])) } : {}),
          };
        }),
    })),
  };
}

/** Ce qui suffit à savoir que le journal n'a pas changé depuis la dernière publication. */
export function signatureDuJournal(journal: JournalTelephone, materiel: MaterielItem[], seances: Seance[] = []): string {
  const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
  // Une séance envoyée à un élève se redessine si ses étapes changent — ou son « Décomposer la tâche ».
  const envoyees = new Set(seances.filter((x) => cites.has(cleDeLaSeance(x.id))).map((x) => x.id));
  return JSON.stringify([journal.jours,
    materiel.filter((m) => cites.has(m.id) || (m.seanceId && envoyees.has(m.seanceId))).map((m) => [m.id, m.titre, m.fabricationJson ?? ""]),
    seances.filter((x) => envoyees.has(x.id)).map((x) => [x.id, x.titre, x.consignes ?? "", x.tableauDeroulement ?? ""])]);
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
    const lue = await avecSaVoix(page);
    dessinees.set(cle, lue);
    return lue;
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
  const lue = await avecSaVoix(page);
  dessinees.set(cle, lue);
  return lue;
}

/**
 * La page d'une séance qu'« En retard » a posée pour un élève, sur sa
 * tablette : son « Décomposer la tâche » s'il en a un, sinon le séquentiel
 * de ses étapes — ses consignes, ou ses phases dites pour l'élève.
 */
export async function pageDeLaSeance(s: Seance, materiel: MaterielItem[]): Promise<string | null> {
  const sienne = materiel.find((m) => m.seanceId === s.id && lireFabrication(m.fabricationJson)?.atelier === "sequentiel");
  if (sienne) return pageDeLAide(sienne);
  const cle = `seance|${s.id}|${s.titre}|${s.consignes ?? ""}|${s.tableauDeroulement ?? ""}`;
  const deja = dessinees.get(cle);
  if (deja) return deja;
  const a = await import("./aidesALaTache");
  const { sequentielImprimable } = await import("./aidesDesSequences");
  const { STYLE_FEUILLE } = await import("./cartesImprimables");
  const { documentImprimable } = await import("./print");
  const { STYLE_CONSIGNES_STRUCTUREES, structurerConsignesHtml } = await import("./consignesStructurees");
  const { sansReferences } = await import("./references");
  const rendu = await sequentielImprimable(a.sequentielDeLaSeance(s.titre, a.etapesDeLaSeance(s)));
  const page = documentImprimable(s.titre, sansReferences(structurerConsignesHtml(rendu.html)), STYLE_FEUILLE + rendu.style + STYLE_CONSIGNES_STRUCTUREES);
  const lue = await avecSaVoix(page);
  dessinees.set(cle, lue);
  return lue;
}

/**
 * La page, chacune de ses étapes avec son haut-parleur : sur la tablette,
 * l'élève l'entend (voir voixDesConsignes.ts). L'audio se prépare une fois par
 * phrase ; sans clé ni réseau, la tablette lit de sa propre voix.
 */
async function avecSaVoix(page: string): Promise<string> {
  const [{ avecLaVoix }, { api }] = await Promise.all([import("./voixDesConsignes"), import("./api")]);
  return avecLaVoix(page, (texte) => api.voixLire(texte));
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
 * Le déroulement d'un créneau, pour les tablettes : le rituel, les phases de
 * sa séance, ses fiches, chacun dans son cadre — son picto, sa matière, son
 * nom (sans l'élève pour une fiche) —, reliés par des flèches, de haut en
 * bas. Chaque cadre est une étape : le téléphone les lit pour que la tablette
 * surligne où en est la classe.
 */
export async function pageDuDeroulement(etapes: PasDuDeroulement[]): Promise<string> {
  const { api } = await import("./api");
  const { documentImprimable } = await import("./print");
  const { CLE_MATIERES, CLE_PAR_DOMAINE, domainesParMatiere, lireParDomaine, matiereDuNom, pictoDuDomaine, pictosProposes } = await import("./pictosMatieres");
  const { lireLexique } = await import("./caa");
  // Les pictos des matières et des domaines : ceux de la page CAA et de Réglages › Personnalisation, et les matières
  // que l'enseignant détaille par domaine.
  const choix = lireLexique(await api.settingGet(CLE_MATIERES).catch(() => ""));
  const parDomaine = lireParDomaine(await api.settingGet(CLE_PAR_DOMAINE).catch(() => ""));
  const domaines = domainesParMatiere(await api.referentielsList().catch(() => []));
  // Les pictos choisis font partie de la page : un choix nouveau la redessine.
  const cle = JSON.stringify([etapes, choix, parDomaine, domaines]);
  const deja = deroulementsDessines.get(cle);
  if (deja) return deja;
  // Une fiche d'élève : sa matière, écrite au-dessus, et son domaine, retrouvés par sa sorte.
  const { domaineDeLaRecette, matiereDeLaRecette, recetteDuTitre } = await import("./fichesAutonomie");
  const pas = etapes.map((p) => {
    const r = p.fiche && p.picto == null ? recetteDuTitre(p.texte) : undefined;
    return r ? { ...p, matiere: matiereDeLaRecette(r), domaine: domaineDeLaRecette(r) } : p;
  });
  // Le picto de la matière, par défaut ; celui du domaine si l'enseignant détaille la matière et l'a choisi — jamais
  // celui du verbe (demandes de l'enseignant). Le rituel a le sien, sous « Rituel ».
  const cibles = pas.map((p) => {
    if (p.rituel) return { nom: "Rituel", matiere: "Rituel" };
    const nom = p.domaine ?? "";
    return nom ? { nom, matiere: (p.fiche && p.matiere) || matiereDuNom(nom, domaines) } : null;
  });
  const images: (string | undefined)[] = pas.map(() => undefined);
  try {
    const aProposer = [...new Set(cibles.flatMap((x) => (x ? [x.matiere ?? x.nom] : [])))];
    const proposes = await pictosProposes(aProposer).catch((): Record<string, number> => ({}));
    // La photo d'un support d'abord ; sinon le picto de la matière, ou du domaine.
    const refs = cibles.map((x, i) => pas[i].picto ?? (x ? pictoDuDomaine(x.nom, x.matiere, choix, parDomaine, domaines, proposes) : null));
    const { chargerImages } = await import("./components/ChoixPicto");
    const dessins = await chargerImages([...new Set(refs.filter((r): r is number | string => r != null))], true);
    refs.forEach((r, i) => { if (r != null) images[i] = dessins[r]; });
  } catch { /* pas de banque : des cadres sans image */ }
  const cadres = pas.map((e, i) => {
    const image = images[i];
    return (i ? FLECHE_DU_DEROULEMENT : "") + `<div class="at-etape dr-etape">${image ? `<img src="${image}" alt="">` : '<span class="dr-vide"></span>'}`
      + `<span class="dr-mots">${e.matiere ? `<span class="dr-matiere">${echapper(e.matiere)}</span>` : ""}<span class="at-texte">${echapper(e.texte)}</span></span></div>`;
  }).join("");
  const page = documentImprimable(TITRE_DU_DEROULEMENT,
    `<div class="page"><div class="titre">${TITRE_DU_DEROULEMENT}</div><div class="dr">${cadres}</div></div>`, STYLE_DU_DEROULEMENT);
  const lue = await avecSaVoix(page);
  deroulementsDessines.set(cle, lue);
  return lue;
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
    const { etapesDeLaSeance } = await import("./aidesALaTache");
    const jours = joursPublies(maintenant);
    const [creneaux, seances, materiel, sequences] = await Promise.all([
      api.creneauxList(jours[0], jours[jours.length - 1]), api.seancesList(), api.materielList(), api.sequencesList().catch((): Sequence[] => []),
    ]);
    const journal = journalDes(jours, creneaux, seances, materiel, etapesDeLaSeance, sequences);
    // Un picto de matière ou de domaine choisi, une matière détaillée ou non : les déroulements changent, ils repartent.
    const { CLE_MATIERES, CLE_PAR_DOMAINE } = await import("./pictosMatieres");
    const reglage = async (cle: string) => (await api.settingGet(cle).catch(() => "")) ?? "";
    const signature = `${signatureDuJournal(journal, materiel, seances)}|${await reglage(CLE_MATIERES)}|${await reglage(CLE_PAR_DOMAINE)}`;
    if (signature === publiee) return;
    const cites = new Set(journal.jours.flatMap((j) => j.creneaux.flatMap((c) => c.aides.map((a) => a.id))));
    const aides: AideAPublier[] = [];
    for (const m of materiel.filter((x) => cites.has(x.id))) {
      const html = await pageDeLAide(m).catch(() => null);
      if (html) aides.push({ cle: m.id, titre: titrePourLesTablettes(m), html });
    }
    // Les séances qu'« En retard » a posées pour un élève : chacune sa page, une fois.
    for (const x of seances.filter((s) => cites.has(cleDeLaSeance(s.id)))) {
      const html = await pageDeLaSeance(x, materiel).catch(() => null);
      if (html) aides.push({ cle: cleDeLaSeance(x.id), titre: x.titre, html });
    }
    // Les déroulements de chaque créneau qui en a : celui de la classe — le rituel, les phases de sa séance —,
    // et celui de chaque élève qui a des fiches, qui finit par les siennes.
    const fiches = materiel.filter(estUneFicheDEleve);
    const seanceDe = new Map(seances.map((s) => [s.id, s]));
    const sequenceDe = new Map(sequences.map((q) => [q.id, q]));
    const publies = new Map(journal.jours.flatMap((j) => j.creneaux).map((x) => [x.id, x]));
    for (const c of creneaux) {
      const publie = publies.get(c.id);
      if (!publie) continue;
      const seance = c.seanceId ? seanceDe.get(c.seanceId) : undefined;
      const domaine = seance ? domaineDeLaSeance(seance, seance.sequenceId ? sequenceDe.get(seance.sequenceId) : undefined) : "";
      const aPublier: [string, string | undefined][] = [
        ...(publie.deroule ? [[publie.deroule, undefined] as [string, undefined]] : []),
        ...Object.entries(publie.deroules ?? {}).map(([eleve, cle]) => [cle, eleve] as [string, string]),
      ];
      for (const [cle, eleve] of aPublier) {
        const html = await pageDuDeroulement(pasDuDeroulement(c, seance, etapesDeLaSeance, fiches, domaine, eleve, sequences, seances)).catch(() => null);
        if (html) aides.push({ cle, titre: TITRE_DU_DEROULEMENT, html });
      }
    }
    const bilan = await api.telephonePublierJournal(journal, aides);
    if (bilan.relie) publiee = signature;
  } catch {
    // Pas de réseau, pas de relais : le passage suivant réessaiera.
  } finally {
    enCours = false;
  }
}
