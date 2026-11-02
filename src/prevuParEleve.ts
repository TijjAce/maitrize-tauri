// ── Le prévu d'un créneau de groupe, élève par élève ──────────────────────
//
// Demande de l'enseignant (2026-11-02) : « il faudrait sur le planning
// pouvoir distinguer les élèves pour que chaque élève ait son picto — son
// planning de créneaux », puis : « quand j'écris le prénom de l'élève, je
// peux ajouter un cadre qui permet d'identifier que je parle de lui ; c'est
// toujours par élève ». Dans un créneau à plusieurs élèves, une ligne qui
// commence par le prénom d'un élève du créneau — « Lina : … », « Pour
// Lina : … », ou le prénom seul — ouvre la part de cet élève, jusqu'à la
// part suivante ; ce qui précède la première est à tous. Le cahier journal
// encadre ce prénom (voir `segmentsDuPrevu`). Seuls comptent les prénoms des
// élèves du créneau : « Pour la séance : » n'ouvre rien. « Pour Prénom-Un et
// Prénom-Deux : » ouvre une part à deux.

import type { Segment } from "./surlignage";

const sansAccents = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
/** « Pour » facultatif, les noms, puis « : » et la suite — ou rien d'autre sur la ligne. */
const TETE = /^(\s*(?:pour\s+)?)([^:\n]+?)\s*(?::\s*(.*))?$/i;

/** Les élèves qu'une tête nomme, tous parmi ceux du créneau ; aucun, si un seul nom n'en est pas un. */
function nommes(entete: string, prenoms: string[]): string[] {
  const voulus = entete.split(/\s*(?:,|&|\bet\b)\s*/i).map(sansAccents).filter(Boolean);
  const trouves = voulus.map((v) => prenoms.find((p) => sansAccents(p) === v));
  return voulus.length && trouves.every(Boolean) ? (trouves as string[]) : [];
}

/** Une ligne qui ouvre une part : qui elle nomme, ce qui la suit sur la ligne, et où sont ses noms. */
function lireLaTete(ligne: string, prenoms: string[]): { qui: string[]; reste: string; noms: [number, number] } | null {
  const m = TETE.exec(ligne);
  if (!m) return null;
  const qui = nommes(m[2], prenoms);
  return qui.length ? { qui, reste: m[3] ?? "", noms: [m[1].length, m[1].length + m[2].length] } : null;
}

/** Le prévu partagé : ce qui est à tous, et la part de chaque élève nommé. */
export function partsDuPrevu(prevu: string, prenoms: string[]): { commun: string; parts: Map<string, string> } {
  const commun: string[] = [];
  const parts = new Map<string, string[]>();
  let courants: string[] | null = null;
  for (const ligne of prevu.split("\n")) {
    const tete = lireLaTete(ligne, prenoms);
    if (tete) {
      courants = tete.qui;
      for (const p of tete.qui) {
        if (!parts.has(p)) parts.set(p, []);
        if (tete.reste.trim()) parts.get(p)!.push(tete.reste);
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

/**
 * Le prévu découpé pour le cahier journal : chaque prénom qui ouvre une part,
 * encadré. Mis bout à bout, les segments redonnent le texte au caractère près.
 */
export function segmentsDuPrevu(prevu: string, prenoms: string[]): Segment[] {
  const sortie: Segment[] = [];
  const pousser = (texte: string, genre: Segment["genre"]) => {
    if (!texte) return;
    const dernier = sortie[sortie.length - 1];
    if (dernier && dernier.genre === genre) dernier.texte += texte;
    else sortie.push({ texte, genre });
  };
  const lignes = prevu.split("\n");
  lignes.forEach((ligne, i) => {
    const tete = prenoms.length ? lireLaTete(ligne, prenoms) : null;
    if (!tete) pousser(ligne, "");
    else {
      // Chaque prénom de la tête, encadré ; ce qui les relie (« et », la virgule) ne l'est pas.
      const [a, b] = tete.noms;
      pousser(ligne.slice(0, a), "");
      let pos = a;
      const zone = ligne.slice(a, b);
      for (const p of tete.qui) {
        const ici = sansAccents(zone).indexOf(sansAccents(p), pos - a);
        if (ici < 0) continue;
        pousser(ligne.slice(pos, a + ici), "");
        pousser(ligne.slice(a + ici, a + ici + p.length), "cadre");
        pos = a + ici + p.length;
      }
      pousser(ligne.slice(pos), "");
    }
    if (i < lignes.length - 1) pousser("\n", "");
  });
  return sortie;
}
