// ── ⌘F partout : chercher dans ce que l'écran montre ──────────────────────
//
// L'application vit dans une fenêtre sans barre de recherche : ⌘F n'y
// faisait rien, sauf dans la visionneuse du coffre-fort. L'enseignant veut
// retrouver d'un coup « le jeu des poissons » où qu'il soit (demande du
// 2026-11-01) : ⌘F ouvre une barre, chaque passage trouvé se surligne, ↵ mène
// de l'un à l'autre, « 3 sur 12 ».
//
// On compare comme dans les PDF (voir rechercheDansPdf) : sans accents, sans
// casse, l'espace entre deux mots facultatif. Le texte de l'écran arrive en
// morceaux — un nœud de texte par bout de mise en forme, la valeur d'un
// champ — : on les aplatit en un seul texte, en gardant pour chaque
// caractère son morceau et sa place, de quoi surligner exactement ce qu'on a
// trouvé, même à cheval sur deux morceaux.

import { aplatirCaractere, motifDe } from "./rechercheDansPdf";

/** Le texte des morceaux, aplati ; pour chaque caractère, son morceau et sa place dans ce morceau (de `debut` à `fin`). */
export interface MorceauxAplatis {
  texte: string;
  morceau: number[];
  debut: number[];
  fin: number[];
}

/** Aplatit les morceaux : les blancs se réduisent à un espace, d'un morceau à l'autre aussi. */
export function aplatirMorceaux(morceaux: string[]): MorceauxAplatis {
  const sortie: MorceauxAplatis = { texte: "", morceau: [], debut: [], fin: [] };
  let blanc = true;
  const ajouter = (c: string, i: number, d: number, f: number) => {
    sortie.texte += c; sortie.morceau.push(i); sortie.debut.push(d); sortie.fin.push(f);
  };
  morceaux.forEach((m, i) => {
    let k = 0;
    for (const c of m) {
      const f = k + c.length;
      if (/\s/.test(c)) {
        if (!blanc) ajouter(" ", i, k, f);
        blanc = true;
      } else {
        const plat = aplatirCaractere(c);
        for (const p of plat) ajouter(p, i, k, f);
        if (plat) blanc = false;
      }
      k = f;
    }
  });
  return sortie;
}

/** Une trouvaille : du caractère `debut` du morceau `de` jusqu'au caractère `fin` (exclu) du morceau `a`. */
export interface Trouvaille { de: number; debut: number; a: number; fin: number }

/**
 * Les passages des morceaux qui répondent à la recherche, dans l'ordre ; rien
 * sous deux lettres. `seul(i)` : le morceau `i` ne se lie pas à ses voisins —
 * la valeur d'un champ, qu'on ne surligne qu'en entier.
 */
export function chercherDansLesMorceaux(morceaux: string[], recherche: string, seul: (i: number) => boolean = () => false): Trouvaille[] {
  const q = recherche.trim();
  const motif = q.length >= 2 ? motifDe(q) : null;
  if (!motif) return [];
  const a = aplatirMorceaux(morceaux);
  const sortie: Trouvaille[] = [];
  for (const m of a.texte.matchAll(motif)) {
    if (!m[0].length || m.index === undefined) continue;
    // Le motif mange les blancs entre les mots : on ne garde pas ceux qu'il aurait pris aux bords.
    let s = m.index, e = m.index + m[0].length;
    while (s < e && a.texte[s] === " ") s++;
    while (e > s && a.texte[e - 1] === " ") e--;
    if (s >= e) continue;
    const de = a.morceau[s], fin = a.morceau[e - 1];
    if (de !== fin && (seul(de) || seul(fin))) continue;
    sortie.push({ de, debut: a.debut[s], a: fin, fin: a.fin[e - 1] });
  }
  return sortie;
}

/** « 3 sur 12 » ; « Aucun résultat » ; rien tant qu'on n'a rien cherché. */
export function ouOnEnEst(rang: number, total: number, recherche: string): string {
  if (recherche.trim().length < 2) return "";
  return total ? `${rang + 1} sur ${total}` : "Aucun résultat";
}
