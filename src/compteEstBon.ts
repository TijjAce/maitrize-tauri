// Le compte est bon.
//
// Une cible et quelques nombres : on ajoute, on retire, on multiplie, on
// divise, chaque nombre servant au plus une fois, jusqu'à retrouver la cible
// — ou s'en approcher. Le jeu de la télévision, à la table des élèves : on y
// calcule de tête, on cherche des chemins, on compare les siens à ceux des
// autres. Au cycle 2, des nombres jusqu'à 10 et les deux premières
// opérations ; au cycle 3, les plaques 25, 50, 75, 100 et les quatre.
//
// La cible est construite à partir des nombres : chaque problème a au moins
// une solution, et elle s'imprime dans le corrigé.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger, piocher } from "./hasard";
import { choisir, entier, fr } from "./nombres";

export type OperationCompte = "+" | "-" | "x" | "÷";
export const OPERATIONS_COMPTE: { id: OperationCompte; signe: string; libelle: string }[] = [
  { id: "+", signe: "+", libelle: "additions" }, { id: "-", signe: "−", libelle: "soustractions" },
  { id: "x", signe: "×", libelle: "multiplications" }, { id: "÷", signe: "÷", libelle: "divisions" },
];

export interface ReglagesCompte { cycle: 2 | 3; problemes: number; nombres: number; operations: OperationCompte[] }
export const REGLAGES_COMPTE_CYCLE: Record<2 | 3, Pick<ReglagesCompte, "nombres" | "operations">> = {
  2: { nombres: 4, operations: ["+", "-"] },
  3: { nombres: 5, operations: ["+", "-", "x", "÷"] },
};
export const REGLAGES_COMPTE: ReglagesCompte = { cycle: 2, problemes: 6, ...REGLAGES_COMPTE_CYCLE[2] };

export interface Compte { cible: number; nombres: number[]; solution: string[] }

const PLAQUES: Record<2 | 3, number[]> = { 2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25, 50, 75, 100] };

/** Une étape entre deux nombres, parmi les opérations permises — rien qui donne 0, 1 par 1, ou un quotient qui tombe faux. */
function etape(a: number, b: number, operations: OperationCompte[], alea: () => number): { resultat: number; texte: string } | null {
  const possibles: { resultat: number; texte: string }[] = [];
  const [g, p] = a >= b ? [a, b] : [b, a];
  if (operations.includes("+")) possibles.push({ resultat: a + b, texte: `${fr(a)} + ${fr(b)} = ${fr(a + b)}` });
  if (operations.includes("-") && g !== p) possibles.push({ resultat: g - p, texte: `${fr(g)} − ${fr(p)} = ${fr(g - p)}` });
  if (operations.includes("x") && a > 1 && b > 1 && a * b <= 999) possibles.push({ resultat: a * b, texte: `${fr(a)} × ${fr(b)} = ${fr(a * b)}` });
  if (operations.includes("÷") && p > 1 && g !== p && g % p === 0) possibles.push({ resultat: g / p, texte: `${fr(g)} ÷ ${fr(p)} = ${fr(g / p)}` });
  return possibles.length ? choisir(alea, possibles) : null;
}

/** Les problèmes de la feuille : une cible atteinte par au moins un chemin, jamais l'un des nombres, jamais deux fois la même. */
export function comptes(r: ReglagesCompte, graine: number): Compte[] {
  const alea = hasard(graine);
  const sortie: Compte[] = [];
  const cibles = new Set<number>();
  const nb = Math.max(3, Math.min(6, r.nombres));
  for (let essai = 0; essai < 800 && sortie.length < r.problemes; essai++) {
    const nombres = piocher(alea, PLAQUES[r.cycle], nb);
    const ordre = melanger(alea, nombres);
    const combien = entier(alea, 3, nb);
    let acc = ordre[0];
    const solution: string[] = [];
    let ok = true;
    for (let i = 1; i < combien; i++) {
      const e = etape(acc, ordre[i], r.operations, alea);
      if (!e) { ok = false; break; }
      acc = e.resultat;
      solution.push(e.texte);
    }
    // Une cible trop petite se lit d'un coup d'œil : au moins 10 au cycle 2, 20 au cycle 3.
    if (!ok || acc < (r.cycle === 2 ? 10 : 20) || nombres.includes(acc) || cibles.has(acc) || (r.cycle === 2 && acc > 99)) continue;
    cibles.add(acc);
    sortie.push({ cible: acc, nombres: [...nombres].sort((x, y) => x - y), solution });
  }
  return sortie;
}

export function htmlCompteEstBon(liste: Compte[], r: ReglagesCompte): string {
  const signes = OPERATIONS_COMPTE.filter((o) => r.operations.includes(o.id)).map((o) => o.signe).join("  ");
  const tete = `<div class="titre">Le compte est bon</div>
    <div class="regle"><b>La règle</b>Avec les nombres de la carte, chacun utilisé une fois au plus, on cherche à obtenir la cible. Opérations permises : ${signes}. On écrit ses calculs, une ligne par étape. Si on n'y arrive pas, on s'approche le plus possible — et on compare les chemins trouvés.
      <span style="color:#687087">— Calcul réfléchi : chercher, essayer, expliquer.</span></div>`;
  const carte = (c: Compte, i: number) => `<div class="cb-carte"><div class="cb-num">${i + 1}</div><div class="cb-cible"><span>Cible</span>${fr(c.cible)}</div>
    <div class="cb-nombres">${c.nombres.map((n) => `<span>${fr(n)}</span>`).join("")}</div>
    <div class="cb-lignes">${Array.from({ length: c.nombres.length - 1 }, () => `<div class="cb-ligne"></div>`).join("")}</div></div>`;
  const pages: string[] = [];
  for (let i = 0; i < Math.max(1, liste.length); i += 6) {
    pages.push(`<div class="page">${tete}<div class="cb-grille">${liste.slice(i, i + 6).map((c, j) => carte(c, i + j)).join("")}</div></div>`);
  }
  const corrige = `<div class="page corrige"><div class="titre">Le compte est bon — une solution parmi d'autres</div>
    <div class="cb-corrige">${liste.map((c, i) => `<div><b>${i + 1}. Cible ${fr(c.cible)}</b> avec ${c.nombres.map((n) => fr(n)).join(", ")} : ${c.solution.map(escapeHtml).join(" ; ")}.</div>`).join("")}</div></div>`;
  return feuille(pages.join("") + corrige, "cb");
}

export const STYLE_COMPTE = `
  .feuille.cb .cb-grille { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5mm; }
  .feuille.cb .cb-carte { border: 1.5px solid #1c2233; border-radius: 3mm; padding: 3mm 4mm; position: relative; page-break-inside: avoid; }
  .feuille.cb .cb-num { position: absolute; top: 2mm; left: 3mm; font-size: 10px; color: #687087; }
  .feuille.cb .cb-cible { text-align: center; font-size: 30px; font-weight: 800; line-height: 1.1; }
  .feuille.cb .cb-cible span { display: block; font-size: 9px; letter-spacing: .5px; text-transform: uppercase; color: #687087; font-weight: 700; }
  .feuille.cb .cb-nombres { display: flex; justify-content: center; flex-wrap: wrap; gap: 2mm; margin: 2mm 0 3mm; }
  .feuille.cb .cb-nombres span { min-width: 11mm; padding: 1mm 2mm; border: 1.5px solid #1c2233; border-radius: 2mm; text-align: center; font-size: 17px; font-weight: 700; background: #f7f8fc; }
  .feuille.cb .cb-ligne { border-bottom: 1px dotted #9aa0b4; height: 7mm; }
  .feuille.cb .cb-corrige { font-size: 12.5px; line-height: 1.7; }
`;
