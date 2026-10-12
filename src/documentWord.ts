// Un document de l'assistant en Word (.docx), pour le retoucher ailleurs.
//
// Un .docx est une archive de quelques fichiers XML : l'écran les écrit, et
// Rust les range dans l'archive (`enregistrer_archive`). On part du HTML de
// la feuille — celui qu'on a peut-être retouché avant d'exporter —, lu par
// un petit lecteur sans navigateur : ce que la feuille et l'éditeur écrivent
// est du HTML régulier. La taille du texte et l'aération de chaque tableau
// suivent ; les cases à cocher et les lignes à remplir restent des
// caractères qu'on peut effacer.

export interface Element { balise: string; classes: string[]; enfants: Noeud[] }
export type Noeud = { texte: string } | Element;

const VIDES = new Set(["br", "hr", "img", "input", "col", "meta", "link", "wbr", "area", "base", "source", "track", "embed", "param"]);
const ENTITES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decoderEntites(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, n: string) => {
    if (n[0] === "#") {
      const code = n[1].toLowerCase() === "x" ? parseInt(n.slice(2), 16) : parseInt(n.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : tout;
    }
    return ENTITES[n.toLowerCase()] ?? tout;
  });
}

/** L'arbre d'un HTML régulier : balises, classes et texte ; les commentaires s'oublient. */
export function arbreDepuisHtml(html: string): Element {
  const racine: Element = { balise: "#racine", classes: [], enfants: [] };
  const pile: Element[] = [racine];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)|</g;
  for (const m of html.matchAll(re)) {
    const haut = pile[pile.length - 1];
    if (m[1]) {
      const i = pile.map((e) => e.balise).lastIndexOf(m[1].toLowerCase());
      if (i > 0) pile.length = i;
    } else if (m[2]) {
      const balise = m[2].toLowerCase();
      const c = /(?:^|\s)class\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[3] ?? "");
      const el: Element = { balise, classes: (c?.[1] ?? c?.[2] ?? c?.[3] ?? "").split(/\s+/).filter(Boolean), enfants: [] };
      haut.enfants.push(el);
      if (!VIDES.has(balise) && !m[4]) pile.push(el);
    } else if (m[5] !== undefined) {
      haut.enfants.push({ texte: decoderEntites(m[5]) });
    } else if (m[0] === "<") {
      haut.enfants.push({ texte: "<" });
    }
  }
  return racine;
}

const estTexte = (n: Noeud): n is { texte: string } => "texte" in n;
const xml = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

/** La taille du texte en demi-points, selon la densité de la feuille : 11 pt aéré, 10 normal, 9,5 serré, 9 dense. */
const TAILLES: Record<string, number> = { "doc-aere": 22, "doc-normal": 20, "doc-serre": 19, "doc-dense": 18 };
/** L'aération d'un tableau : ses marges de case (en vingtièmes de point) et la taille de son texte, relative. */
const AIRS: Record<string, { marge: number; taille: number }> = {
  "air-m2": { marge: 20, taille: 0.85 }, "air-m1": { marge: 40, taille: 0.9 }, "": { marge: 70, taille: 0.95 },
  "air-1": { marge: 110, taille: 1 }, "air-2": { marge: 160, taille: 1.08 }, "air-3": { marge: 220, taille: 1.15 },
};
/** La largeur utile d'une page A4 aux marges de 15 mm, en vingtièmes de point. */
const LARGEUR_UTILE = 11906 - 2 * 850;

interface Format { gras?: boolean; italique?: boolean; souligne?: boolean; barre?: boolean; taille?: number; mono?: boolean }
interface Morceau { texte: string; f: Format; saut?: boolean }

function run(m: Morceau): string {
  if (m.saut) return "<w:r><w:br/></w:r>";
  const f = m.f;
  const props = [
    f.mono && '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/>',
    f.gras && "<w:b/>", f.italique && "<w:i/>", f.barre && "<w:strike/>", f.souligne && '<w:u w:val="single"/>',
    f.taille && `<w:sz w:val="${f.taille}"/><w:szCs w:val="${f.taille}"/>`,
  ].filter(Boolean).join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(m.texte)}</w:t></w:r>`;
}

/** Les morceaux d'un texte mis en forme, sans les blancs en trop : comme le navigateur les affiche. */
function enLigne(noeuds: Noeud[], f: Format, sortie: Morceau[] = []): Morceau[] {
  for (const n of noeuds) {
    if (estTexte(n)) { sortie.push({ texte: n.texte.replace(/\s+/g, " "), f }); continue; }
    const b = n.balise;
    if (b === "br") sortie.push({ texte: "", f, saut: true });
    else if (b === "img" || b === "script" || b === "style") continue;
    else if (n.classes.includes("case")) sortie.push({ texte: n.classes.includes("cochee") ? "☑ " : "☐ ", f });
    else if (n.classes.includes("ligne")) sortie.push({ texte: "________________", f });
    else {
      const g: Format = { ...f };
      if (b === "strong" || b === "b" || b === "th") g.gras = true;
      if (b === "em" || b === "i") g.italique = true;
      if (b === "u") g.souligne = true;
      if (b === "del" || b === "s" || b === "strike") g.barre = true;
      if (b === "code") g.mono = true;
      enLigne(n.enfants, g, sortie);
    }
  }
  return sortie;
}

/** Un paragraphe : ses morceaux sans blanc au bord, et ses réglages ; rien s'il est vide. */
function paragraphe(morceaux: Morceau[], pPr = "", garderVide = false): string {
  const m = morceaux.map((x) => ({ ...x }));
  while (m.length && !m[0].saut && !m[0].texte.trim()) m.shift();
  while (m.length && !m[m.length - 1].saut && !m[m.length - 1].texte.trim()) m.pop();
  if (m.length) { if (!m[0].saut) m[0].texte = m[0].texte.trimStart(); const d = m[m.length - 1]; if (!d.saut) d.texte = d.texte.trimEnd(); }
  if (!m.length && !garderVide) return "";
  // Un blanc qui suit un blanc s'efface, d'un morceau à l'autre, comme à l'écran : « ☐ Oui », pas « ☐  Oui ».
  for (let i = 1; i < m.length; i++) {
    const avant = m[i - 1];
    if (!avant.saut && !m[i].saut && /\s$/.test(avant.texte) && /^\s/.test(m[i].texte)) m[i].texte = m[i].texte.replace(/^\s+/, "");
  }
  // Deux morceaux voisins de même mise en forme n'en font qu'un : le document reste léger.
  const fondus: Morceau[] = [];
  for (const x of m) {
    const d = fondus[fondus.length - 1];
    if (d && !d.saut && !x.saut && JSON.stringify(d.f) === JSON.stringify(x.f)) d.texte += x.texte;
    else fondus.push(x);
  }
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ""}${fondus.map(run).join("")}</w:p>`;
}

const BLOCS = new Set(["p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "blockquote", "hr", "pre", "section", "article", "header", "footer"]);
const estBloc = (n: Noeud) => !estTexte(n) && BLOCS.has(n.balise);

interface Contexte { f: Format; pPr: string; niveauListe: number; /** La taille du texte de la feuille, en demi-points. */ base: number }

/** Les blocs d'une suite de nœuds : le texte entre deux blocs fait son propre paragraphe. */
function blocs(noeuds: Noeud[], ctx: Contexte): string[] {
  const sortie: string[] = [];
  let enAttente: Noeud[] = [];
  const vider = () => {
    if (enAttente.length) sortie.push(paragraphe(enLigne(enAttente, ctx.f), ctx.pPr));
    enAttente = [];
  };
  for (const n of noeuds) {
    if (!estBloc(n)) { enAttente.push(n); continue; }
    vider();
    sortie.push(...bloc(n as Element, ctx));
  }
  vider();
  return sortie.filter(Boolean);
}

function bloc(el: Element, ctx: Contexte): string[] {
  const b = el.balise;
  const titre = /^h([1-6])$/.exec(b);
  if (titre) return [paragraphe(enLigne(el.enfants, ctx.f), `<w:pStyle w:val="Titre${Math.min(4, Number(titre[1]))}"/>`)];
  if (b === "p") return [paragraphe(enLigne(el.enfants, ctx.f), ctx.pPr)];
  if (b === "hr") return ['<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="C9CEE0"/></w:pBdr></w:pPr></w:p>'];
  if (b === "pre") return enLigne(el.enfants, { ...ctx.f, mono: true }).map((m) => m.texte).join("").split("\n")
    .map((ligne) => paragraphe([{ texte: ligne, f: { ...ctx.f, mono: true } }], '<w:pStyle w:val="Code"/>', true));
  if (b === "blockquote") return blocs(el.enfants, { ...ctx, pPr: '<w:pStyle w:val="Citation"/>' });
  if (b === "ul" || b === "ol") return liste(el, ctx);
  if (b === "table") return [tableau(el, ctx)];
  if (b === "div" && el.classes.includes("saut")) return ['<w:p><w:r><w:br w:type="page"/></w:r></w:p>', ...blocs(el.enfants, ctx)];
  return blocs(el.enfants, ctx);
}

function liste(el: Element, ctx: Contexte): string[] {
  const sortie: string[] = [];
  let numero = 0;
  const retrait = 360 * (ctx.niveauListe + 1);
  for (const li of el.enfants) {
    if (estTexte(li) || li.balise !== "li") continue;
    numero++;
    const tache = li.classes.includes("tache");
    const marque = tache ? "" : el.balise === "ol" ? `${numero}. ` : "• ";
    const avant = li.enfants.filter((n) => !estBloc(n));
    const apres = li.enfants.filter(estBloc) as Element[];
    const pPr = `<w:ind w:left="${retrait}" w:hanging="${tache ? 0 : 280}"/><w:spacing w:before="0" w:after="40"/>`;
    sortie.push(paragraphe([{ texte: marque, f: ctx.f }, ...enLigne(avant, ctx.f)], pPr, true));
    for (const sous of apres) {
      if (sous.balise === "ul" || sous.balise === "ol") sortie.push(...liste(sous, { ...ctx, niveauListe: ctx.niveauListe + 1 }));
      else sortie.push(...bloc(sous, { ...ctx, pPr: `<w:ind w:left="${retrait}"/>` }));
    }
  }
  return sortie;
}

function tableau(el: Element, ctx: Contexte): string {
  const rangees: { cases: Element[]; entete: boolean }[] = [];
  const parcourir = (n: Element, entete: boolean) => {
    for (const x of n.enfants) {
      if (estTexte(x)) continue;
      if (x.balise === "tr") rangees.push({ cases: x.enfants.filter((c): c is Element => !estTexte(c) && (c.balise === "td" || c.balise === "th")), entete });
      else if (x.balise === "thead") parcourir(x, true);
      else if (x.balise === "tbody" || x.balise === "tfoot") parcourir(x, false);
    }
  };
  parcourir(el, false);
  const colonnes = Math.max(1, ...rangees.map((r) => r.cases.length));
  const air = AIRS[el.classes.find((c) => c.startsWith("air-")) ?? ""] ?? AIRS[""];
  const taille = Math.round(ctx.base * air.taille);
  const largeur = Math.floor(LARGEUR_UTILE / colonnes);
  const bord = (cote: string) => `<w:${cote} w:val="single" w:sz="4" w:space="0" w:color="C9CEE0"/>`;
  const tblPr = `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(bord).join("")}</w:tblBorders>`
    + `<w:tblLayout w:type="autofit"/><w:tblCellMar><w:top w:w="${air.marge}" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>`
    + `<w:bottom w:w="${air.marge}" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>`;
  const grille = `<w:tblGrid>${Array.from({ length: colonnes }, () => `<w:gridCol w:w="${largeur}"/>`).join("")}</w:tblGrid>`;
  const lignes = rangees.map(({ cases, entete }) => {
    const casesXml = Array.from({ length: colonnes }, (_, i) => {
      const c = cases[i];
      const th = entete || c?.balise === "th";
      const contenu = c ? blocs(c.enfants, { ...ctx, f: { ...ctx.f, taille, gras: th || ctx.f.gras }, pPr: '<w:spacing w:before="0" w:after="0"/>', niveauListe: 0 }) : [];
      return `<w:tc><w:tcPr><w:tcW w:w="${largeur}" w:type="dxa"/>${th ? '<w:shd w:val="clear" w:color="auto" w:fill="EEF0FE"/>' : ""}</w:tcPr>`
        + `${contenu.length ? contenu.join("") : "<w:p/>"}</w:tc>`;
    }).join("");
    return `<w:tr>${entete ? "<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>" : "<w:trPr><w:cantSplit/></w:trPr>"}${casesXml}</w:tr>`;
  }).join("");
  // Un paragraphe vide après le tableau : Word ne colle pas deux tableaux qui se suivent.
  return `<w:tbl>${tblPr}${grille}${lignes}</w:tbl><w:p/>`;
}

/** Le premier titre du document, pour ses propriétés ; « Document » sinon. */
function titreDe(racine: Element): string {
  const chercher = (n: Element): string => {
    for (const x of n.enfants) {
      if (estTexte(x)) continue;
      if (/^h[1-3]$/.test(x.balise)) return enLigne(x.enfants, {}).map((m) => m.texte).join("").trim();
      const t = chercher(x);
      if (t) return t;
    }
    return "";
  };
  return chercher(racine) || "Document";
}

function styles(base: number): string {
  const titre = (n: number, nom: string, taille: number, rPr: string, pPr: string) =>
    `<w:style w:type="paragraph" w:styleId="Titre${n}"><w:name w:val="${nom}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>`
    + `<w:pPr><w:keepNext/><w:keepLines/>${pPr}<w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/>${rPr}<w:sz w:val="${taille}"/><w:szCs w:val="${taille}"/></w:rPr></w:style>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:color w:val="1C2233"/><w:sz w:val="${base}"/><w:szCs w:val="${base}"/><w:lang w:val="fr-FR"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="100" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${titre(1, "heading 1", Math.round(base * 1.6), "", '<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="3" w:color="6366F1"/></w:pBdr><w:spacing w:before="0" w:after="200"/>')}
${titre(2, "heading 2", Math.round(base * 1.25), '<w:color w:val="2B2F6B"/>', '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="D9DCEA"/></w:pBdr><w:spacing w:before="280" w:after="100"/>')}
${titre(3, "heading 3", Math.round(base * 1.08), '<w:color w:val="2B2F6B"/>', '<w:spacing w:before="220" w:after="60"/>')}
${titre(4, "heading 4", base, "", '<w:spacing w:before="180" w:after="60"/>')}
<w:style w:type="paragraph" w:styleId="Citation"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="6366F1"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="EEF0FE"/><w:ind w:left="200" w:right="100"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:shd w:val="clear" w:color="auto" w:fill="F5F6FA"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:cs="Courier New"/><w:sz w:val="${Math.max(14, base - 2)}"/></w:rPr></w:style>
</w:styles>`;
}

/**
 * Les fichiers d'un .docx tiré de la feuille : leur chemin dans l'archive et
 * leur texte, prêts pour `enregistrer_archive`.
 */
export function partiesDuDocx(corps: string, aujourdhui = new Date().toISOString().slice(0, 19) + "Z"): { nom: string; contenu: string }[] {
  const racine = arbreDepuisHtml(corps);
  const densite = (function trouver(n: Element): string | undefined {
    const c = n.classes.find((x) => x in TAILLES);
    if (c) return c;
    for (const x of n.enfants) if (!estTexte(x)) { const t = trouver(x); if (t) return t; }
    return undefined;
  })(racine);
  const base = TAILLES[densite ?? "doc-normal"];
  const corpsXml = blocs(racine.enfants, { f: {}, pPr: "", niveauListe: 0, base }).join("");
  const titre = titreDe(racine);
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpsXml}`
    + `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return [
    { nom: "[Content_Types].xml", contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>` },
    { nom: "_rels/.rels", contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` },
    { nom: "word/_rels/document.xml.rels", contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nom: "docProps/core.xml", contenu: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(titre)}</dc:title><dc:creator>Maitrize</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${aujourdhui}</dcterms:created></cp:coreProperties>` },
    { nom: "word/styles.xml", contenu: styles(base) },
    { nom: "word/document.xml", contenu: document },
  ];
}
