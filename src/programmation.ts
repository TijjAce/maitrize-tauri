// La programmation d'une séquence : le niveau et la période de l'année pour
// lesquels elle est pensée.
//
// Une séquence prend son sens à un moment de l'année : la centaine dès le
// début du CE1, les nombres jusqu'à 59 au plus tard en période 2 du CP.
// Quand le programme le dit — pour la numération, les opérations posées, les
// fractions, la monnaie —, on propose la période, et l'on cite sa phrase ; le
// niveau, lui, est celui de la compétence. Ce n'est qu'une proposition :
// l'enseignant la garde ou la change.

/** Les niveaux pour lesquels une séquence peut être pensée. */
export const NIVEAUX_DE_PROGRAMMATION = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"] as const;

export interface ProgrammationProposee {
  /** « CP », « CE1 »… ; vide quand la compétence ne le dit pas. */
  niveau: string;
  /** La période proposée, ou rien quand le programme ne la fixe pas. */
  periode: number | null;
  /** D'où vient la période : la phrase du programme, citée. */
  raison: string;
}

const PROGRAMME = "Programme de mathématiques du cycle 2 (2024)";
const cite = (classe: string, phrase: string) => `${PROGRAMME}, ${classe} : « ${phrase} »`;

/** La période des séquences de numération, d'après les repères du programme. */
const PAR_DEMARCHE: Record<string, { periode: number; raison: string }> = {
  "numeration-dizaine-cp": { periode: 1, raison: cite("CP", "L'aspect décimal (base dix) et l'aspect positionnel […] sont abordés dès la période 1 : les élèves comparent, dénombrent et constituent des collections organisées en groupes de dix unités et en unités isolées.") },
  "nombres-livret-cp-59": { periode: 2, raison: cite("CP", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à cinquante-neuf.") },
  "nombres-livret-cp-100": { periode: 3, raison: cite("CP", "Au plus tard en période 3, les élèves travaillent avec des quantités et des nombres allant jusqu'à cent.") },
  // Les nombres de la séquence du guide — 71 et 68 — vont jusqu'à cent.
  "comparer-nombres-cp": { periode: 3, raison: cite("CP", "Au plus tard en période 3, les élèves travaillent avec des quantités et des nombres allant jusqu'à cent.") },
  "groupements-ce1": { periode: 1, raison: cite("CE1", "La centaine est abordée dès le début de la période 1.") },
  "nombres-livret-ce1": { periode: 2, raison: cite("CE1", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à mille.") },
  "comparer-nombres-ce1": { periode: 2, raison: cite("CE1", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à mille.") },
  "groupements-ce2": { periode: 1, raison: cite("CE2", "Des nombres supérieurs à mille sont rencontrés dès le début de la période 1.") },
  "nombres-livret-ce2": { periode: 2, raison: cite("CE2", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à 10 000.") },
  "comparer-nombres-ce2": { periode: 2, raison: cite("CE2", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à 10 000.") },
};

/** Les autres repères de période du programme, compétence par compétence. */
const REPERES: { niveau: string; motif: RegExp; periode: number; raison: string }[] = [
  { niveau: "CP", motif: /poser et effectuer des additions en colonnes/, periode: 4,
    raison: cite("CP", "Au CP, l'addition posée n'est introduite qu'en période 4 ou 5.") },
  { niveau: "CP", motif: /monnaie|pieces|billets|somme d.argent|achats/, periode: 2,
    raison: cite("CP", "La monnaie est introduite en période 2 ou 3.") },
  { niveau: "CE1", motif: /comparer des fractions/, periode: 4,
    raison: cite("CE1", "Dès la période 4, les élèves apprennent à comparer des fractions dans des cas simples.") },
  // Les fractions unitaires et leur écriture d'abord ; la suite — les fractions non unitaires, les additions — n'a pas de période.
  { niveau: "CE1", motif: /fractions 1\/2|les mots .{0,3}denominateur/, periode: 2,
    raison: cite("CE1", "Le travail sur les fractions commence dès la période 2 par l'introduction des fractions unitaires (de numérateur égal à 1) d'un tout et de leur écriture fractionnaire.") },
  { niveau: "CE1", motif: /additions et des soustractions en colonnes/, periode: 3,
    raison: cite("CE1", "Un algorithme de la soustraction posée est introduit en période 3 au plus tard.") },
  { niveau: "CE1", motif: /ecriture a virgule/, periode: 3,
    raison: cite("CE1", "L'écriture à virgule est utilisée à partir de la période 3.") },
  { niveau: "CE1", motif: /centimes?/, periode: 2,
    raison: cite("CE1", "Les centimes d'euro sont introduits au plus tard en période 2.") },
  { niveau: "CE2", motif: /unite de longueur en fractions/, periode: 3,
    raison: cite("CE2", "À partir de la période 3, le travail sur les fractions d'un tout permet de considérer une fraction d'une unité de longueur.") },
  { niveau: "CE2", motif: /poser et effectuer des multiplications/, periode: 4,
    raison: cite("CE2", "L'algorithme de la multiplication posée est introduit en période 4 au plus tard.") },
  { niveau: "CE2", motif: /additions de montants en euro/, periode: 2,
    raison: cite("CE2", "L'addition posée de montants en euro utilisant l'écriture à virgule est introduite au plus tard en période 2.") },
  { niveau: "CE2", motif: /soustractions de montants en euro/, periode: 4,
    raison: cite("CE2", "La soustraction posée de montants en euro utilisant l'écriture à virgule est introduite au plus tard en période 4.") },
];

const plat = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Un niveau lu tel qu'on l'écrit : « ce1 » devient « CE1 » ; ce qui n'en est pas un, rien. */
export function niveauDeProgrammation(niveau: string | null | undefined): string {
  const n = (niveau ?? "").trim().toUpperCase();
  return (NIVEAUX_DE_PROGRAMMATION as readonly string[]).includes(n) ? n : "";
}

/**
 * La programmation proposée pour une séquence : le niveau de sa compétence,
 * et la période que le programme fixe pour sa démarche ou sa compétence.
 * Rien quand on ne sait ni l'un ni l'autre.
 */
export function programmationProposee(
  c: { niveau?: string | null; competenceTitre?: string | null } | null, demarcheId = "",
): ProgrammationProposee | null {
  if (!c) return null;
  const niveau = niveauDeProgrammation(c.niveau);
  const parDemarche = PAR_DEMARCHE[demarcheId];
  if (parDemarche) return { niveau, ...parDemarche };
  const titre = plat(c.competenceTitre);
  const repere = REPERES.find((r) => r.niveau === niveau && r.motif.test(titre));
  if (repere) return { niveau, periode: repere.periode, raison: repere.raison };
  return niveau ? { niveau, periode: null, raison: "" } : null;
}

/** Ce que la programmation dit d'une séquence, en quelques mots : « CE1, période 2 » ; « Période 2 » sans niveau. */
export function libelleDeProgrammation(s: { niveau?: string | null; periode?: number | null }): string {
  const niveau = niveauDeProgrammation(s.niveau);
  if (niveau && s.periode) return `${niveau}, période ${s.periode}`;
  if (niveau) return niveau;
  return s.periode ? `Période ${s.periode}` : "";
}
