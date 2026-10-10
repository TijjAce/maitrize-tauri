// ── Les consignes à la première personne ──────────────────────────────────
//
// Les sources s'accordent sur un point : une seule forme de consigne,
// toujours la même. L'enseignant a choisi la première personne (2026-10-10),
// celle de la grille de Cap école inclusive, des RASED et du soliloque :
// l'élève se dit ce qu'il fait — « J'entoure les mots », pas « Entoure les
// mots ». Les consignes de l'application, et celles qu'on réécrit soi-même,
// s'y mettent donc au moment de dessiner la feuille : l'impératif devient
// « je » et le verbe, « tu » devient « je », « ton » « mon », « toi » « moi ».
//
// Ce qu'on ne saurait pas convertir sans risque reste tel quel : une
// citation entre guillemets, un infinitif — les consignes pour l'adulte —,
// « on », un impératif pluriel.

/** Ce qui dit qu'un mot est un impératif à la deuxième personne : « entoure », « lis », « suis ». */
export type EstImperatif = (mot: string) => boolean;

/** Les mots qui lient deux étapes : « Puis écris », « Ensuite, colle ». */
const LIENS = new Set(["puis", "ensuite", "enfin", "et", "alors", "d'abord", "après", "maintenant"]);

/** Ceux après lesquels un impératif continue la consigne : « Dessine ou colle », « Lis, puis réponds ». */
const COORDINATIONS = new Set(["puis", "et", "ou", "ensuite"]);

/** Les libellés d'une aide ou d'un exemple : « Aide : … » n'est pas l'impératif d'« aider ». */
const LIBELLES = new Set(["aide", "astuce", "attention", "rappel", "exemple", "conseil", "indice", "note"]);

/** Les verbes dont l'impératif n'est pas la forme de « je ». */
const IRREGULIERS: Record<string, string> = { va: "vais", vas: "vais", aie: "ai", sois: "suis", sache: "sais", veuille: "veux" };

/** Le « h » qui interdit l'élision : « je hache », mais « j'habille ». */
const H_ASPIRE = /^h(?:ach|aï|ait|al[eè]t|asard|âte|aus|aut|é?riss|eurt|iss|ont|ors|ou|u[eé]|url)/i;

/** Un mot qui commence comme une voyelle, pour l'élision : « j'écris », « m'aide ». */
const voyelle = (mot: string) => /^[aeiouyàâäéèêëîïôöùûüœæ]/i.test(mot) || (/^h/i.test(mot) && !H_ASPIRE.test(mot));

/** « je » devant ce mot : « je lis », « j'écris ». */
const je = (suite: string) => (voyelle(suite) ? `j'${suite}` : `je ${suite}`);

/** Le verbe de « je » pour cet impératif : le même, sauf « va », « sois », « aie ». */
const dePremiere = (imperatif: string) => IRREGULIERS[imperatif.toLowerCase()] ?? imperatif.toLowerCase();

/** Le verbe de « je » pour le verbe de « tu » : « colles » → « colle », « as » → « ai », « es » → « suis ». */
function deTuAJe(verbe: string): string {
  const v = verbe.toLowerCase();
  if (v === "as") return "ai";
  if (v === "es") return "suis";
  if (v === "vas") return "vais";
  return v.length > 2 && v.endsWith("es") ? v.slice(0, -1) : v;
}

interface Mot { debut: number; fin: number; texte: string }

/** Le texte où chercher : les balises, les entités et ce qui est entre guillemets masqués, à la même longueur. */
function masque(html: string): string {
  return html
    .replace(/<[^>]*>/g, (t) => "\u0001".repeat(t.length))
    .replace(/&(?:[a-z]+|#\d+);/gi, (t) => "\u0003".repeat(t.length))
    .replace(/«[^»]*»|“[^”]*”|"[^"]*"/g, (t) => "\u0002".repeat(t.length));
}

/** L'apostrophe écrite en entité — « n&#39;es » — redevient une apostrophe : sinon « n » et « es » seraient deux mots. */
const apostrophes = (html: string) => html.replace(/(<[^>]*>)|&#39;|&apos;|&#x27;/gi, (_t, balise?: string) => balise ?? "'");

/** Les mots du texte, avec leur place dans le HTML. */
function motsDe(html: string): Mot[] {
  const m = masque(html);
  return [...m.matchAll(/\p{L}[\p{L}'’-]*/gu)].map((x) => ({ debut: x.index, fin: x.index + x[0].length, texte: html.slice(x.index, x.index + x[0].length) }));
}

const bas = (mot: string) => mot.toLowerCase().replace(/’/g, "'");
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Remplacement { debut: number; fin: number; par: string }

/**
 * Ce qui remplace un impératif en tête de proposition — « Écris-le » →
 * « je l'écris », « Relis-toi » → « je me relis », « Ne raye pas » → « je
 * ne raye pas » — ; rien si ce n'en est pas un, ou si on ne sait pas le
 * convertir sans risque (« Donne-moi », « Écrivez »).
 */
function impératifEnJe(mots: Mot[], k: number, estImperatif: EstImperatif, texte: string): Remplacement | null {
  const mot = mots[k];
  const m = bas(mot.texte);
  if (LIBELLES.has(m) && /^[\s\u0001]*:/.test(texte.slice(mot.fin))) return null;
  // « Ne raye pas », « N'oublie pas » : « je » devant la négation.
  if (m === "ne" || m.startsWith("n'")) {
    const verbe = m === "ne" ? mots[k + 1] && bas(mots[k + 1].texte) : m.slice(2);
    if (!verbe || !estImperatif(verbe.replace(/-.*$/, ""))) return null;
    return { debut: mot.debut, fin: mot.fin, par: `je ${mot.texte.toLowerCase()}` };
  }
  const enclitique = /^(.+?)-(le|la|les|toi|en|y|lui|leur)$/i.exec(mot.texte);
  if (enclitique) {
    const [, verbe, pronom] = enclitique;
    if (!estImperatif(bas(verbe))) return null;
    const v = dePremiere(verbe);
    const p = pronom.toLowerCase();
    let par: string;
    if (p === "en" || p === "y") par = `j'${p} ${v}`;
    else if (p === "toi") par = `je ${voyelle(v) ? "m'" : "me "}${v}`;
    else if (p === "le" || p === "la") par = `je ${voyelle(v) ? "l'" : `${p} `}${v}`;
    else par = `je ${p} ${v}`;
    return { debut: mot.debut, fin: mot.fin, par };
  }
  if (!estImperatif(m)) return null;
  return { debut: mot.debut, fin: mot.fin, par: je(dePremiere(mot.texte)) };
}

/** Les clitiques entre « tu » et son verbe : « tu ne », « tu te », « tu le ». */
const CLITIQUES = new Set(["ne", "n'", "te", "t'", "le", "la", "les", "l'", "lui", "leur", "y", "en", "me", "m'"]);

/**
 * Une étape de consigne à la première personne. L'impératif en tête — après
 * un mot de liaison, ou après une ouverture : « Pour chaque ligne,
 * entoure… », « Si tu bloques, demande… » — et ceux qu'une coordination
 * relie au premier deviennent « je » et le verbe ; « tu » devient « je » ;
 * « ton », « ta », « tes », « toi », « te » deviennent « mon », « ma »,
 * « mes », « moi », « me ».
 */
export function alaPremierePersonne(source: string, estImperatif: EstImperatif): string {
  const html = apostrophes(source);
  const mots = motsDe(html);
  if (!mots.length) return html;
  const m = masque(html);
  const remplacements: Remplacement[] = [];
  const convertis = new Set<number>();
  /** Une consigne a été mise à « je » : ce qui la continue — « et écris », « , puis réponds » — l'est aussi. */
  let actif = false;

  // Un repère d'énumération — « A. Trace… », « b) Entoure… » — n'est pas un mot de la consigne.
  const repere = (x: Mot) => x.texte.length === 1 && /^[.)]/.test(m.slice(x.fin));

  /**
   * L'impératif qui ouvre une proposition commençant au mot `depuis` : après
   * les mots de liaison, ou après une ou deux ouvertures qui finissent par
   * une virgule — « Pour chaque ligne, entoure… », « Puis, à l'inverse,
   * remplace… ».
   */
  const teteDe = (depuis: number, jusque: number): [number, Remplacement] | null => {
    let k = depuis;
    while (k < jusque && (LIENS.has(bas(mots[k].texte)) || repere(mots[k]))) k++;
    let r = k < jusque ? impératifEnJe(mots, k, estImperatif, m) : null;
    for (let virgule = m.indexOf(",", mots[depuis].debut), essais = 0; !r && virgule > 0 && essais < 2; virgule = m.indexOf(",", virgule + 1), essais++) {
      const apres = mots.findIndex((x) => x.debut > virgule);
      if (apres <= depuis || apres >= jusque || apres - depuis > 10) break;
      k = apres;
      while (k < jusque && LIENS.has(bas(mots[k].texte))) k++;
      r = k < jusque ? impératifEnJe(mots, k, estImperatif, m) : null;
    }
    return r ? [k, r] : null;
  };

  // Les propositions : le début, puis après chaque deux-points ou point-virgule.
  const debuts = [0, ...mots.map((x, i) => (i > 0 && /[:;]/.test(m.slice(mots[i - 1].fin, x.debut)) ? i : -1)).filter((i) => i > 0)];
  let tete: Remplacement | null = null;
  for (const [n, d] of debuts.entries()) {
    const trouve = teteDe(d, debuts[n + 1] ?? mots.length);
    if (!trouve) continue;
    const [k, r] = trouve;
    remplacements.push(r);
    convertis.add(k);
    if (n === 0) tete = r;
    actif = true;
  }

  // Les impératifs coordonnés : « Dessine ou colle », « Lis, puis réponds », « — marque », « (coche ».
  for (let i = 1; i < mots.length; i++) {
    if (convertis.has(i)) continue;
    const entre = m.slice(mots[i - 1].fin, mots[i].debut);
    const coordonne = COORDINATIONS.has(bas(mots[i - 1].texte)) && actif;
    const apresPonctuation = /[:;—(]/.test(entre) || (/,/.test(entre) && actif);
    if (!coordonne && !apresPonctuation) continue;
    const r = impératifEnJe(mots, i, estImperatif, m);
    if (r) { remplacements.push(r); convertis.add(i); actif = true; }
  }

  // Une liste de formes conjuguées — « ils plieront, tu as plié, vous pliez » — est un exemple : on n'y touche pas.
  const personnes = new Set(mots.map((x) => bas(x.texte)).filter((x) => /^(je|tu|il|elle|on|nous|vous|ils|elles)$/.test(x)));
  const exemples = personnes.size >= 3;

  // L'inversion : « qu'aurais-tu fait ? » → « qu'aurais-je fait ? », « peux-tu » → « puis-je ».
  const INVERSIONS: Record<string, string> = { as: "ai", es: "suis", peux: "puis", vas: "vais", sais: "sais", dois: "dois", veux: "veux", fais: "fais", dis: "dis",
    aurais: "aurais", serais: "serais", ferais: "ferais", dirais: "dirais", pourrais: "pourrais", voudrais: "voudrais", devrais: "devrais" };
  mots.forEach((x, i) => {
    // « qu'aurais-tu » : l'élision reste devant le verbe.
    const inv = /^((?:\p{L}+['’])?)(\p{L}+)-t?-?tu$/iu.exec(x.texte);
    if (exemples || !inv || convertis.has(i)) return;
    const v = INVERSIONS[inv[2].toLowerCase()];
    if (!v) return;
    const verbe = /^\p{Lu}/u.test(inv[2]) ? majuscule(v) : v;
    remplacements.push({ debut: x.debut, fin: x.fin, par: `${inv[1]}${verbe}-je` });
    convertis.add(i);
  });

  // « tu » et ce qui va avec lui : « tu as » → « j'ai », « tu n'es pas » → « je ne suis pas », « tu te trompes » → « je me trompe ».
  for (let i = 0; i < mots.length; i++) {
    if (exemples || bas(mots[i].texte) !== "tu") continue;
    let j = i + 1;
    const clitiques: Mot[] = [];
    while (j < mots.length && CLITIQUES.has(bas(mots[j].texte).replace(/['’]$/, "'"))) clitiques.push(mots[j++]);
    // « t'aider », « n'es » : le clitique élidé colle au mot suivant.
    const elide = j < mots.length ? /^([nltm]')(.+)$/i.exec(bas(mots[j].texte)) : null;
    if (j >= mots.length) continue;
    const verbe = elide ? elide[2] : bas(mots[j].texte);
    const devant = [...clitiques.map((c) => bas(c.texte).replace(/^te$/, "me").replace(/^t'$/, "m'")), ...(elide ? [elide[1].replace(/^t'$/, "m'")] : [])];
    const nouveau = deTuAJe(verbe);
    // Les élisions refaites : « n'es » → « ne suis », « me aide » → « m'aide ».
    const suite = [...devant, nouveau].reduce((acc, x, n, tous) => {
      if (n === tous.length - 1) return acc + x;
      const prochain = tous[n + 1];
      const base = x.replace(/'$/, "e");
      return acc + (voyelle(prochain) && /^(ne|me|te|le|la)$/.test(base) ? `${base.charAt(0)}'` : `${base} `);
    }, "");
    remplacements.push({ debut: mots[i].debut, fin: mots[j].fin, par: (/^[A-ZÀ-Ý]/.test(mots[i].texte) ? majuscule : (s: string) => s)(je(suite)) });
    for (let n = i; n <= j; n++) convertis.add(n);
  }

  // Les possessifs et les pronoms de « tu » — pas « le ton de la voix ».
  const PRONOMS: Record<string, string> = { ton: "mon", ta: "ma", tes: "mes", toi: "moi", te: "me", "t'": "m'" };
  mots.forEach((x, i) => {
    if (exemples || convertis.has(i)) return;
    const b = bas(x.texte);
    // « le ton », « changer de ton » ; mais « de ton choix ».
    const precedent = i > 0 ? bas(mots[i - 1].texte) : "";
    if (b === "ton" && (/^(le|un|du|au|même)$/.test(precedent) || (precedent === "de" && !/^\s+\p{L}/u.test(m.slice(x.fin))))) return;
    const elide = /^t'(.+)$/.exec(b);
    if (elide) { remplacements.push({ debut: x.debut, fin: x.debut + 2, par: x.texte[0] === "T" ? "M'" : "m'" }); return; }
    const par = PRONOMS[b];
    if (par) remplacements.push({ debut: x.debut, fin: x.fin, par: /^[A-Z]/.test(x.texte) ? majuscule(par) : par });
  });

  if (!remplacements.length) return html;
  remplacements.sort((a, b) => b.debut - a.debut);
  let sortie = html;
  for (const r of remplacements) sortie = sortie.slice(0, r.debut) + r.par + sortie.slice(r.fin);
  // La majuscule, quand « je » ouvre l'étape — après son numéro ou sa lettre, s'il y en a : « 2. Je coche ».
  const premier = mots.find((x) => !repere(x));
  if (!tete || !premier || tete.debut !== premier.debut) return sortie;
  return sortie.replace(/^((?:<[^>]*>|\s|\d+[.)]\s*|\p{L}[.)]\s+)*)(\p{Ll})/u, (_t, avant: string, l: string) => avant + l.toUpperCase());
}
