// ── Le prévu d'un créneau de groupe, élève par élève ──────────────────────
//
// Demande de l'enseignant (2026-11-02) : « il faudrait sur le planning
// pouvoir distinguer les élèves pour que chaque élève ait son picto — son
// planning de créneaux ». Dans un créneau à plusieurs élèves, le prévu se
// partage par des lignes « Pour Prénom : … » : la part de cet élève court
// jusqu'à la part suivante, et ce qui précède la première est à tous. Seuls
// comptent les prénoms des élèves du créneau : « Pour la séance : » n'ouvre
// rien. « Pour Prénom-Un et Prénom-Deux : » ouvre une part à deux.

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const TETE = /^\s*pour\s+([^:\n]{1,60}?)\s*:\s*(.*)$/i;

/** Les élèves qu'une tête « Pour … : » nomme, tous parmi ceux du créneau ; aucun, si un seul nom n'en est pas un. */
function nommes(entete: string, prenoms: string[]): string[] {
  const voulus = entete.split(/\s*(?:,|&|\bet\b)\s*/i).map(sansAccents).filter(Boolean);
  const trouves = voulus.map((v) => prenoms.find((p) => sansAccents(p) === v));
  return voulus.length && trouves.every(Boolean) ? (trouves as string[]) : [];
}

/** Le prévu partagé : ce qui est à tous, et la part de chaque élève nommé. */
export function partsDuPrevu(prevu: string, prenoms: string[]): { commun: string; parts: Map<string, string> } {
  const commun: string[] = [];
  const parts = new Map<string, string[]>();
  let courants: string[] | null = null;
  for (const ligne of prevu.split("\n")) {
    const m = TETE.exec(ligne);
    const qui = m ? nommes(m[1], prenoms) : [];
    if (m && qui.length) {
      courants = qui;
      for (const p of qui) {
        if (!parts.has(p)) parts.set(p, []);
        if (m[2].trim()) parts.get(p)!.push(m[2]);
      }
      continue;
    }
    if (courants) for (const p of courants) parts.get(p)!.push(ligne);
    else commun.push(ligne);
  }
  return { commun: commun.join("\n").trim(), parts: new Map([...parts].map(([p, l]) => [p, l.join("\n").trim()])) };
}

/** Le prévu tel qu'un élève le vit : ce qui est à tous, puis sa part ; le prévu entier s'il n'est pas partagé. */
export function prevuDeLEleve(prevu: string, prenom: string, prenoms: string[]): string {
  const { commun, parts } = partsDuPrevu(prevu, prenoms);
  if (!parts.size) return prevu;
  const sienne = [...parts].find(([p]) => sansAccents(p) === sansAccents(prenom))?.[1] ?? "";
  return [commun, sienne].filter((x) => x.trim()).join("\n");
}
