// Les pages de l'organisation et du cahier journal, en HTML : celles qu'on
// imprime depuis Organisation, et celles que la copie du travail range dans
// le dossier « Maitrize » (voir copieDuTravail.ts). Une seule mise en page
// pour les deux : ce qu'on retrouve sur le disque est ce qu'on imprimait.

import { couleurHex, type Creneau } from "./api";
import { escapeHtml } from "./print";
import { cleCase, datesDeLaSemaine, nombreDeSemaines, type SemaineDeClasse } from "./progressionAnnuelle";
import type { SlotEdt } from "./organisation";

/** Une ligne de la programmation annuelle : un domaine, ou une activité répartie sur les cinq périodes. */
export interface LigneProgrammation {
  id: string; estDomaine: boolean; label: string; couleur?: string;
  p1: string; p2: string; p3: string; p4: string; p5: string;
  seqs?: Record<string, string[]>; // "p1".."p5" → [sequenceId]
  periodesFaites?: number[];        // périodes (1..5) marquées réalisées
}

/** Les couleurs officielles des périodes : celles des pastilles P1…P5 et des têtes de colonne. */
export const COULEUR_PERIODE: Record<number, string> = { 1: "#2e73d9", 2: "#d94033", 3: "#4d4d4d", 4: "#d97319", 5: "#269950" };

/** Une programmation à imprimer : celle de la classe (niveau vide) ou d'un niveau, et la couleur de chaque ligne. */
export interface TableauDeProgrammation {
  niveau: string;
  lignes: LigneProgrammation[];
  /** Par identifiant de ligne : la couleur de son domaine. */
  teintes: Record<string, string>;
}

/**
 * La programmation de l'année : celle de la classe puis celles des niveaux,
 * chaque domaine en bandeau de sa couleur et ses activités teintées de même,
 * comme à l'écran ; ce qui est fait est barré.
 */
export function htmlProgrammation(annee: string, tableaux: TableauDeProgrammation[]): string {
  const corps = tableaux.filter((t) => t.lignes.length > 0).map((t) => {
    const rows = t.lignes.map((l) => {
      const c = t.teintes[l.id] ?? couleurHex.blue;
      if (l.estDomaine) {
        return `<tr><td colspan="6" style="background:${c}24;border-left:4px solid ${c};font-weight:700">${escapeHtml(l.label)}</td></tr>`;
      }
      return `<tr><td style="border-left:4px solid ${c};font-weight:600">${escapeHtml(l.label)}</td>${[l.p1, l.p2, l.p3, l.p4, l.p5].map((v, i) => {
        const fait = (l.periodesFaites ?? []).includes(i + 1);
        return `<td style="background:${c}12;${fait ? "text-decoration:line-through;color:#888" : ""}">${escapeHtml(v ?? "").replace(/\n/g, "<br>")}</td>`;
      }).join("")}</tr>`;
    }).join("");
    const tete = `<tr><th>Domaine / Activité</th>${[1, 2, 3, 4, 5].map((p) => `<th style="border-top:4px solid ${COULEUR_PERIODE[p]}">P${p}</th>`).join("")}</tr>`;
    // Les mêmes largeurs d'un tableau à l'autre : les périodes s'alignent sur la page.
    const largeurs = `<colgroup><col style="width:24%">${"<col style=\"width:15.2%\">".repeat(5)}</colgroup>`;
    return `${t.niveau ? `<h2>${escapeHtml(t.niveau)}</h2>` : ""}<table style="table-layout:fixed;width:100%">${largeurs}${tete}${rows}</table>`;
  }).join("");
  return `<h1>Programmation annuelle — ${escapeHtml(annee)}</h1>${corps}`;
}

/** Un tableau d'une période : celui de la classe (niveau vide) ou d'un niveau. */
export interface TableauDePeriode {
  niveau: string;
  colonnes: { id: string; titre: string; teinte: string }[];
  cellules: Record<string, string>;
}

/** Une période de la progression : le tableau de la classe puis ceux des niveaux, semaines datées si le calendrier est là. */
export function htmlPeriode(annee: string, periode: number, tableaux: TableauDePeriode[], semainesCal: SemaineDeClasse[] = []): string {
  const corps = tableaux.filter((t) => t.colonnes.length > 0).map((t) => {
    const nb = nombreDeSemaines(semainesCal.length, t.cellules);
    const head = `<tr><th>Semaine</th>${t.colonnes.map((c) => `<th style="border-top:4px solid ${c.teinte}">${escapeHtml(c.titre)}</th>`).join("")}</tr>`;
    const rows = Array.from({ length: nb }, (_, i) => i + 1).map((n) => {
      const s = semainesCal[n - 1];
      return `<tr><td><b>S${n}</b>${s ? `<br><small>${escapeHtml(datesDeLaSemaine(s))}</small>` : ""}</td>${t.colonnes.map((c) =>
        `<td>${escapeHtml(t.cellules[cleCase(n, c.id)] ?? "").replace(/\n/g, "<br>")}</td>`).join("")}</tr>`;
    }).join("");
    return `${t.niveau ? `<h2>${escapeHtml(t.niveau)}</h2>` : ""}<table>${head}${rows}</table>`;
  }).join("");
  return `<h1>Progression — ${escapeHtml(annee)} · Période ${periode}</h1>${corps}`;
}

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** L'emploi du temps de l'année, jour par jour, dans l'ordre des heures. */
export function htmlEmploiDuTemps(annee: string, slots: SlotEdt[]): string {
  const jours = JOURS.filter((j) => slots.some((s) => s.jour === j));
  const blocs = jours.map((j) => {
    const siens = slots.filter((s) => s.jour === j).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    const lignes = siens.map((s) => `<tr><td style="white-space:nowrap">${escapeHtml(s.heureDebut)}–${escapeHtml(s.heureFin)}</td>`
      + `<td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${couleurHex[s.couleur] ?? "#999"};margin-right:6px"></span>`
      + `${escapeHtml(s.titre)}${s.nature === "reunion" ? " <small>(réunion, formation)</small>" : ""}</td></tr>`).join("");
    return `<h2>${j}</h2><table>${lignes}</table>`;
  }).join("");
  return `<h1>Emploi du temps — ${escapeHtml(annee)}</h1>${blocs || "<p>Aucun créneau.</p>"}`;
}

/** Le lundi de la semaine d'un jour (AAAA-MM-JJ). */
export function lundiDe(jour: string): string {
  const d = new Date(`${jour.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** L'année scolaire d'un jour : « 2026-2027 » pour un jour entre le 1er août 2026 et le 31 juillet 2027. */
export function anneeScolaireDe(jour: string): string {
  const a = Number(jour.slice(0, 4)), m = Number(jour.slice(5, 7));
  return m >= 8 ? `${a}-${a + 1}` : `${a - 1}-${a}`;
}

/** Vrai si le créneau a quelque chose à dire au cahier journal : du prévu, un bilan, une séance. */
export const creneauRempli = (c: Creneau) => !!(c.prevu?.trim() || c.bilan?.trim() || c.seanceId);

/** Une semaine du cahier journal : chaque jour, ses créneaux, ce qui était prévu et le bilan. */
export function htmlSemaineDuJournal(lundi: string, creneaux: Creneau[], seanceDe: (id: string) => string | undefined): string {
  const jours = [...new Set(creneaux.map((c) => c.date.slice(0, 10)))].sort();
  const titreDuJour = (j: string) => new Date(`${j}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const blocs = jours.map((j) => {
    const siens = creneaux.filter((c) => c.date.slice(0, 10) === j).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    const lignes = siens.map((c) => {
      const seance = c.seanceId ? seanceDe(c.seanceId) : undefined;
      return `<h3>${escapeHtml(c.heureDebut)}–${escapeHtml(c.heureFin)} · ${escapeHtml(c.matiere || "Créneau")}</h3>`
        + (seance ? `<p><b>Séance :</b> ${escapeHtml(seance)}</p>` : "")
        + (c.prevu?.trim() ? `<p><b>Prévu :</b></p><p style="white-space:pre-wrap">${escapeHtml(c.prevu.trim())}</p>` : "")
        + (c.bilan?.trim() ? `<p><b>Fait, bilan :</b></p><p style="white-space:pre-wrap">${escapeHtml(c.bilan.trim())}</p>` : "");
    }).join("");
    return `<h2>${escapeHtml(titreDuJour(j))}</h2>${lignes}`;
  }).join("");
  const debut = new Date(`${lundi}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `<h1>Cahier journal — semaine du ${escapeHtml(debut)}</h1>${blocs}`;
}
