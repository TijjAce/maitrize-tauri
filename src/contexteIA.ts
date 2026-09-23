// Contexte pédagogique transmis à l'IA pour personnaliser ses réponses.
//
// ⚠️ CONFIDENTIALITÉ — RÈGLE STRICTE :
//   On ne transmet JAMAIS d'information personnelle sur les élèves
//   (noms, prénoms, dates de naissance, INE, photos, commentaires…).
//   Pour les élèves, seul le NOMBRE (donnée agrégée) est envoyé.
//   On transmet uniquement des données pédagogiques non nominatives :
//   niveau de classe, nombre d'élèves, titres de séquences, programmation.
import { api } from "./api";
import { lire as lireIme } from "./programmationIme";

export async function construireContexteIA(): Promise<string> {
  const [niveau, eleves, sequences, progs, annee] = await Promise.all([
    api.settingGet("niveauClasse").catch(() => null),
    api.elevesList().catch(() => []),
    api.sequencesList().catch(() => []),
    api.programmationsFinaleList().catch(() => []),
    api.settingGet("anneeCourante").catch(() => null),
  ]);

  const lignes: string[] = [];
  if (niveau) lignes.push(`Niveau de la classe : ${niveau}.`);
  // Seul le nombre est transmis — aucune donnée nominative ou personnelle.
  lignes.push(`Nombre d'élèves dans la classe : ${(eleves ?? []).length}.`);

  if ((sequences ?? []).length) {
    const titres = (sequences ?? []).slice(0, 30)
      .map((s) => `« ${s.titre || "Sans titre"} » (${s.matiere || "?"}, P${s.periode})`).join(", ");
    lignes.push(`Séquences déjà créées : ${titres}.`);
  }

  const prog = (progs ?? []).find((p) => !p.estImportee && p.niveau !== "ime" && (!annee || p.annee === annee));
  if (prog) {
    try {
      const ls = JSON.parse(prog.lignesJson) as { estDomaine: boolean; label: string }[];
      const items = ls.filter((l) => (l.label || "").trim())
        .map((l) => (l.estDomaine ? `\n- ${l.label}` : ` · ${l.label}`)).join("");
      if (items.trim()) lignes.push(`Programmation de l'année :${items}`);
    } catch { /* lignes illisibles */ }
  }

  // En IME, la programmation est par élève. On n'en transmet que les
  // intitulés travaillés, jamais qui les travaille : la règle ci-dessus vaut
  // ici comme ailleurs.
  const progIme = (progs ?? []).find((p) => p.niveau === "ime" && (!annee || p.annee === annee));
  if (!prog && progIme) {
    const vises = [...new Set(lireIme(progIme.lignesJson).objectifs
      .map((o) => o.competence.trim()).filter(Boolean))];
    if (vises.length) {
      lignes.push(`Objectifs travaillés cette année (programmation par élève) :\n- ${vises.join("\n- ")}`);
    }
  }

  return lignes.join("\n");
}
