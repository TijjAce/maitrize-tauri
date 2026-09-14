// Heures de la semaine : temps de classe, temps de réunion ou de formation.
//
// On compte le temps couvert, pas la somme des créneaux : deux groupes pris en
// même temps (ou un créneau dupliqué) ne font pas deux heures de classe.

export type Nature = "classe" | "reunion";

export interface Plage { date: string; heureDebut: string; heureFin: string; nature?: string }

const enMinutes = (h: string) => {
  const [hh, mm] = (h || "").split(":").map(Number);
  return (hh || 0) * 60 + (mm || 0);
};

/** Nature d'un créneau, « classe » par défaut. */
export const natureDe = (p: { nature?: string }): Nature => (p.nature === "reunion" ? "reunion" : "classe");

/**
 * Nature devinée d'après un intitulé d'emploi du temps.
 *
 * Seulement des mots sans ambiguïté : « équipe » seul désigne aussi bien un jeu
 * d'équipe qu'une réunion, « projet » un projet de classe. Dans le doute,
 * c'est de la classe — l'enseignant corrige d'un clic.
 */
export function natureDepuisTitre(titre: string): Nature {
  // Bornes de mot écrites à la main : \b ignore les lettres accentuées (« Équipe »).
  return /(?:^|[^\p{L}])(r[ée]unions?|synth[èe]ses?|formations?|concertations?|conseils? (?:de (?:cycle|classe|ma[iî]tres|l[’']?[ée]cole)|d[’'][ée]cole|p[ée]dagogiques?)|ESS|[ée]quipes? (?:de suivi|[ée]ducatives?|pluridisciplinaires?)|animations? p[ée]dagogiques?)(?![\p{L}])/iu
    .test(titre) ? "reunion" : "classe";
}

/** Première et dernière heure d'une grille d'emploi du temps, par défaut. */
export const GRILLE_DEBUT = 8;
export const GRILLE_FIN = 20;

/**
 * Les heures qu'affiche une grille : de 8h à 20h, élargies si un créneau
 * commence plus tôt ou finit plus tard. Une grille fixe laissait déborder un
 * créneau en fin de journée — une synthèse jusqu'à 18h30 sortait du cadre.
 */
export function plageGrille(creneaux: { heureDebut: string; heureFin: string }[]): { debut: number; fin: number } {
  let debut = GRILLE_DEBUT, fin = GRILLE_FIN;
  for (const c of creneaux) {
    const d = enMinutes(c.heureDebut), f = enMinutes(c.heureFin);
    if (f <= d) continue;
    debut = Math.min(debut, Math.floor(d / 60));
    fin = Math.max(fin, Math.ceil(f / 60));
  }
  return { debut: Math.max(0, debut), fin: Math.min(24, fin) };
}

/** Minutes couvertes par nature, chevauchements fusionnés jour par jour. */
export function minutesParNature(plages: Plage[]): Record<Nature, number> {
  const groupes = new Map<string, [number, number][]>();
  for (const p of plages) {
    const d = enMinutes(p.heureDebut), f = enMinutes(p.heureFin);
    if (f <= d) continue;
    const cle = `${p.date.slice(0, 10)}|${natureDe(p)}`;
    (groupes.get(cle) ?? groupes.set(cle, []).get(cle)!).push([d, f]);
  }
  const total: Record<Nature, number> = { classe: 0, reunion: 0 };
  for (const [cle, intervalles] of groupes) {
    const nature = cle.split("|")[1] as Nature;
    intervalles.sort((a, b) => a[0] - b[0]);
    let [debut, fin] = intervalles[0];
    for (const [d, f] of intervalles.slice(1)) {
      if (d <= fin) fin = Math.max(fin, f);
      else { total[nature] += fin - debut; [debut, fin] = [d, f]; }
    }
    total[nature] += fin - debut;
  }
  return total;
}

/** « 24 h 30 », « 3 h », « 45 min ». */
export function duree(minutes: number): string {
  if (minutes <= 0) return "0 h";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
