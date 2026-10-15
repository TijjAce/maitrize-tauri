// Les consignes qu'on écoute, sur la tablette.
//
// Un élève qui ne lit pas encore touche le haut-parleur d'une étape et
// l'entend ; « Écouter » lit toute la consigne. L'audio vient de l'ordinateur,
// préparé une fois par phrase (voix_lire, côté Rust : la synthèse vocale de
// Mistral) et glissé dans la page, à côté de l'étape. Sans lui — pas de clé
// Mistral, pas de réseau —, la tablette lit de sa propre voix : le geste est
// le même. Toucher le reste de l'étape la coche, comme avant.
//
// La page est lue comme du texte, à la façon des consignes structurées : rien
// ici ne demande un navigateur.

/** Ce qui se lit : les lignes d'une consigne, les étapes d'une aide et du déroulement. */
const ETAPES = ["cs-etape", "at-etape", "sv-s-etape"];
/** Dans une étape, le texte lui-même ; à défaut, tout, sauf le numéro. */
const TEXTES = ["cs-texte", "at-texte", "sv-s-texte"];
const NUMEROS = ["cs-num", "at-num", "sv-s-numero"];

interface Bloc { debut: number; finOuverture: number; debutFermeture: number; fin: number; classes: string[] }

/** Les éléments dont la classe porte l'une de celles-ci, dans l'ordre ; un élément dans un autre n'est pas repris. */
function blocs(html: string, voulues: string[]): Bloc[] {
  const trouves: Bloc[] = [];
  const ouverture = /<([a-z][a-z0-9]*)\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = ouverture.exec(html))) {
    const classes = (/\bclass\s*=\s*"([^"]*)"/i.exec(m[2])?.[1] ?? "").split(/\s+/).filter(Boolean);
    if (!classes.some((c) => voulues.includes(c)) || /\/\s*$/.test(m[2])) continue;
    // La fermeture qui lui répond : les ouvertures du même nom se comptent.
    const motif = new RegExp(`<(/?)${m[1]}\\b[^>]*>`, "gi");
    motif.lastIndex = m.index + m[0].length;
    let profondeur = 1;
    let f: RegExpExecArray | null;
    while ((f = motif.exec(html))) {
      if (f[1]) { if (--profondeur === 0) break; } else if (!/\/\s*>$/.test(f[0])) profondeur++;
    }
    if (!f) continue;
    trouves.push({ debut: m.index, finOuverture: m.index + m[0].length, debutFermeture: f.index, fin: f.index + f[0].length, classes });
    ouverture.lastIndex = f.index + f[0].length;
  }
  return trouves;
}

const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " };
const decoder = (t: string) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, e: string) =>
  e[0] !== "#" ? ENTITES[e.toLowerCase()] ?? tout : String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Le texte d'une étape, tel qu'on le dit : sans son numéro ni ses marques. */
export function texteDeLEtape(interieur: string): string {
  const texte = blocs(interieur, TEXTES)[0];
  let html = texte ? interieur.slice(texte.finOuverture, texte.debutFermeture) : interieur;
  if (!texte) for (const n of blocs(html, NUMEROS).reverse()) html = html.slice(0, n.debut) + html.slice(n.fin);
  return decoder(html.replace(/<[^>]*>/g, " ")).replace(/[​▸]/g, " ").replace(/\s+/g, " ").trim();
}

/** Le haut-parleur, dessiné : pas d'émoji, qui change d'allure d'une tablette à l'autre. */
const HAUT_PARLEUR = "data:image/svg+xml,"
  + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='#1d4ed8' stroke-width='2.2' "
  + "stroke-linecap='round' stroke-linejoin='round'><path d='M4 9.5h3.5L12 5.5v13l-4.5-4H4z' fill='#1d4ed8'/>"
  + "<path d='M15.5 8.8a4.6 4.6 0 0 1 0 6.4M18.2 6.2a8.2 8.2 0 0 1 0 11.6'/></svg>");

export const STYLE_VOIX = `
  .voix { flex: none; align-self: center; width: 1.9em; height: 1.9em; min-width: 9mm; min-height: 9mm; margin-left: .5em;
    border: .5mm solid #bfdbfe; border-radius: 50%; background: #eff6ff url("${HAUT_PARLEUR}") center / 62% no-repeat;
    cursor: pointer; -webkit-tap-highlight-color: transparent; padding: 0; }
  .voix.en-lecture { background-color: #fde68a; border-color: #f59e0b; }
  @media print { .voix { display: none; } }
`;

/**
 * La page, chaque étape avec son haut-parleur : le texte à dire, et l'audio
 * quand on a pu le préparer. `lire` rend l'audio d'une phrase, en mp3 base64 ;
 * il échoue sans clé ou sans réseau — après deux échecs, on n'insiste plus,
 * la tablette lira de sa voix.
 */
export async function avecLaVoix(page: string, lire: (texte: string) => Promise<string>): Promise<string> {
  let echecs = 0;
  const ajouts: { ou: number; html: string }[] = [];
  for (const b of blocs(page, ETAPES)) {
    const interieur = page.slice(b.finOuverture, b.debutFermeture);
    const texte = texteDeLEtape(interieur);
    if (!texte || b.classes.includes("at-cachee") || /\bclass="voix"/.test(interieur)) continue;
    let audio = "";
    if (echecs < 2) {
      try { audio = ` data-audio="data:audio/mpeg;base64,${await lire(texte)}"`; } catch { echecs++; }
    }
    ajouts.push({ ou: b.debutFermeture, html: `<button type="button" class="voix" aria-label="Écouter" data-lire="${echapper(texte)}"${audio}></button>` });
  }
  if (!ajouts.length) return page;
  let html = page;
  for (const a of ajouts.reverse()) html = html.slice(0, a.ou) + a.html + html.slice(a.ou);
  const tete = html.search(/<\/head>/i);
  const style = `<style>${STYLE_VOIX}</style>`;
  return tete >= 0 ? html.slice(0, tete) + style + html.slice(tete) : style + html;
}
