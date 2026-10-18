// Gabarits de tableaux de langage assisté : modèle et règles.
//
// La logique vit ici plutôt que dans l'écran, pour que les règles qui font la
// valeur d'un TLA — les places ne bougent pas, la grille ne se renumérote pas
// — soient vérifiables par des tests plutôt que par l'œil.

import { CaseTla, Gabarit, GabaritImprime, LicenceImageTla, ModeCouleurTla, NatureMot, PaletteTla, PictoArasaac, PlaceDuMot, caseVide, newId } from "./api";
import { Squelette, plan, NATURE_DU_ROLE } from "./squelettes";
import { estMonPicto, origineDe } from "./mesPictos";

export const NATURES: { id: NatureMot; label: string; couleur: string }[] = [
  { id: "personne", label: "Personne", couleur: "#fff2b8" },
  { id: "verbe", label: "Verbe", couleur: "#d9f0d4" },
  { id: "adjectif", label: "Descriptif", couleur: "#d6e6f7" },
  { id: "social", label: "Social", couleur: "#fadeeb" },
  { id: "petit mot", label: "Petit mot", couleur: "#f0f0f0" },
  { id: "nom", label: "Nom", couleur: "#fce6ca" },
  // Qui, quoi, où, quand, pourquoi : poser une question a sa couleur, comme dans la plupart des classeurs de communication.
  { id: "question", label: "Question", couleur: "#e9ddf6" },
];

export const couleurNature = (n: NatureMot) =>
  NATURES.find((x) => x.id === n)?.couleur ?? "#fce6ca";

// ── Les couleurs, au choix ─────────────────────────────────────────────────
//
// La couleur dit la nature du mot d'un coup d'œil, mais elle n'aide pas tous
// les élèves : certains s'y perdent, d'autres voient mieux le pictogramme sur
// un fond blanc. Les réglages fixent donc les couleurs par défaut — sur le
// fond de la case, sur son cadre, ou nulle part —, et chaque tableau peut
// avoir les siennes, celles de l'orthophoniste par exemple.

/** Le réglage qui garde les couleurs par défaut des tableaux. */
export const CLE_COULEURS_TLA = "tla:couleurs";

const naturesEn = (couleurs: Record<string, string>) =>
  Object.fromEntries(NATURES.map((n) => [n.id, couleurs[n.id]])) as Record<NatureMot, string>;

/** Les couleurs prêtes : des fonds pâles, des cadres vifs, ou rien. */
export const PALETTES: { id: string; label: string; palette: PaletteTla }[] = [
  { id: "pastel", label: "Fonds pâles", palette: { mode: "fond", couleurs: naturesEn(Object.fromEntries(NATURES.map((n) => [n.id, n.couleur]))) } },
  { id: "vives", label: "Cadres vifs", palette: { mode: "bordure", couleurs: naturesEn({
    personne: "#e3b800", verbe: "#2e9b3e", adjectif: "#2f6fd0", social: "#d6408f",
    "petit mot": "#8a8f98", nom: "#e07b12", question: "#8a4fd8",
  }) } },
  { id: "aucune", label: "Sans couleur", palette: { mode: "aucune", couleurs: naturesEn(Object.fromEntries(NATURES.map((n) => [n.id, n.couleur]))) } },
];

export const PALETTE_DEFAUT: PaletteTla = PALETTES[0].palette;

export const MODES_COULEUR: { id: ModeCouleurTla; label: string }[] = [
  { id: "fond", label: "Le fond de la case" },
  { id: "bordure", label: "Le cadre de la case" },
  { id: "aucune", label: "Nulle part — sans couleur" },
];

const HEX = /^#[0-9a-f]{6}$/i;
/** Une couleur bien écrite (« #rrggbb »), en minuscules ; rien sinon. */
export const couleurSure = (c: unknown): string | undefined =>
  typeof c === "string" && HEX.test(c.trim()) ? c.trim().toLowerCase() : undefined;

/** Relit des couleurs gardées ou importées : ce qui manque ou est mal écrit reprend la couleur d'origine. */
export function lirePalette(brut: unknown): PaletteTla {
  const o = (brut && typeof brut === "object" ? brut : {}) as { mode?: unknown; couleurs?: Record<string, unknown> };
  const mode = MODES_COULEUR.some((m) => m.id === o.mode) ? (o.mode as ModeCouleurTla) : PALETTE_DEFAUT.mode;
  const couleurs = { ...PALETTE_DEFAUT.couleurs };
  for (const n of NATURES) {
    const c = couleurSure(o.couleurs?.[n.id]);
    if (c) couleurs[n.id] = c;
  }
  return { mode, couleurs };
}

/**
 * Ce que montre une case : son fond, et son cadre de couleur s'il en a un.
 * La couleur forcée d'une case l'emporte toujours — même sur un tableau sans
 * couleur : c'est qu'on a voulu faire ressortir ce mot-là.
 */
export function apparence(c: CaseTla, palette: PaletteTla): { fond: string; bord: string } {
  const forcee = couleurSure(c.couleur);
  const teinte = forcee ?? palette.couleurs[c.nature] ?? palette.couleurs.nom;
  if (palette.mode === "bordure") return { fond: "#ffffff", bord: teinte };
  if (palette.mode === "aucune" && !forcee) return { fond: "#ffffff", bord: "" };
  return { fond: teinte, bord: "" };
}

/**
 * Le gabarit tel que l'impression le reçoit : chaque case avec son fond et
 * son cadre, et le fichier de l'image — celui de Mes pictos, cherché au
 * moment d'imprimer, pour une photo prise au téléphone. Une image de Mes
 * pictos qui n'existe plus laisse la case avec son mot seul.
 */
export function pourImpression(
  g: Gabarit, palette: PaletteTla, fichierDeMonPicto: (id: number) => string | undefined, mentions = "",
): GabaritImprime {
  const { couleurs: _sesCouleurs, ...reste } = g;
  return {
    ...reste,
    ...(mentions ? { mentions } : {}),
    cases: g.cases.map((c) => ({
      ...c,
      fichier: c.pictoId !== null && estMonPicto(c.pictoId) ? fichierDeMonPicto(c.pictoId) ?? "" : c.fichier,
      ...apparence(c, palette),
    })),
  };
}

// ── Le classeur à pages liées ──────────────────────────────────────────────
//
// Sur le principe des classeurs de communication — le PODD de Gayle Porter —,
// une case peut ouvrir une autre page : « je veux » mène aux aliments, aux
// jeux, aux lieux. Maitrize ne reprend pas les pages du PODD, protégées : on
// construit ses propres tableaux avec ARASAAC et Mes pictos, et on les relie.
// Le classeur d'un tableau, c'est son accueil et toutes les pages qu'on
// atteint de case en case ; il s'imprime d'un coup, chaque case liée portant
// le numéro de sa page, et s'exporte au format ouvert OBZ.

/** Les tableaux qui ont une case vers celui-ci. */
export const tableauxQuiMenentA = (g: Gabarit, tous: Gabarit[]): Gabarit[] =>
  tous.filter((x) => x.id !== g.id && x.cases.some((c) => c.lien === g.id));

/**
 * L'accueil du classeur d'un tableau. Parmi les pages qui mènent à lui, de
 * proche en proche, c'est celle d'où l'on atteint le plus de pages, et au plus
 * court — le carrefour — ; à égalité, la plus ancienne : un classeur grandit
 * depuis son accueil. Les cases « retour », qui ramènent à l'accueil, ne le
 * déplacent pas.
 */
export function accueilDu(g: Gabarit, tous: Gabarit[]): Gabarit {
  // Les pages d'où l'on peut arriver à celle-ci, elle comprise.
  const candidates = [g];
  const vues = new Set([g.id]);
  for (let i = 0; i < candidates.length; i++) {
    for (const avant of tableauxQuiMenentA(candidates[i], tous)) {
      if (!vues.has(avant.id)) { vues.add(avant.id); candidates.push(avant); }
    }
  }
  /** Le nombre de pages atteintes, et la somme de leurs distances, depuis une page. */
  const portee = (depart: Gabarit) => {
    const distance = new Map([[depart.id, 0]]);
    const file = [depart];
    for (let i = 0; i < file.length; i++) {
      for (const c of file[i].cases) {
        const suite = c.lien && !distance.has(c.lien) ? tous.find((x) => x.id === c.lien) : undefined;
        if (suite) { distance.set(suite.id, distance.get(file[i].id)! + 1); file.push(suite); }
      }
    }
    return { pages: distance.size, chemins: [...distance.values()].reduce((a, b) => a + b, 0) };
  };
  const rang = (x: Gabarit) => { const i = tous.findIndex((y) => y.id === x.id); return i < 0 ? tous.length : i; };
  return candidates.map((x) => ({ x, ...portee(x) }))
    .sort((a, b) => b.pages - a.pages || a.chemins - b.chemins || rang(a.x) - rang(b.x))[0].x;
}

/** Les pages du classeur : l'accueil, puis chaque tableau où mène une case, dans l'ordre où on le rencontre, une fois chacun. */
export function pagesDuClasseur(accueil: Gabarit, tous: Gabarit[]): Gabarit[] {
  const pages = [accueil];
  const vus = new Set([accueil.id]);
  for (let i = 0; i < pages.length; i++) {
    for (const c of pages[i].cases) {
      if (!c.lien || vus.has(c.lien)) continue;
      const suite = tous.find((x) => x.id === c.lien);
      if (!suite) continue;
      vus.add(suite.id);
      pages.push(suite);
    }
  }
  return pages;
}

/**
 * La licence de l'image d'une case, pour le format ouvert : ARASAAC, une
 * banque d'appoint, un dessin de l'IA, une photo de l'enseignant, un symbole
 * Makaton importé. Rien pour une case vide.
 */
export function licenceDeLImage(pictoId: number | null): LicenceImageTla | undefined {
  if (pictoId === null) return undefined;
  switch (origineDe(pictoId)) {
    case null: return { type: "CC BY-NC-SA 4.0", auteur: "Sergio Palao, ARASAAC (Gouvernement d'Aragon)", url: "https://arasaac.org", mention: "Pictogrammes ARASAAC — usage non commercial" };
    case "sclera": return { type: "CC BY-NC 2.0 BE", auteur: "Sclera vzw", url: "https://www.sclera.be", mention: "Pictogramme Sclera — usage non commercial" };
    case "bajard": return { type: "CC BY-NC-SA 4.0", auteur: "François Bajard", url: "https://ressources-ecole-inclusive.org", mention: "Pictogramme de F. Bajard — usage non commercial" };
    case "ia": return { type: "private", auteur: "Mistral AI, à la demande de l'enseignant", url: "", mention: "Dessiné par une IA à la manière d'ARASAAC : ce n'est pas un pictogramme ARASAAC" };
    case "makaton": return { type: "private", auteur: "The Makaton Charity", url: "https://makaton.org", mention: "Symbole Makaton © The Makaton Charity, importé par l'enseignant" };
    case "photo": return { type: "private", auteur: "L'enseignant", url: "", mention: "Photo de l'enseignant" };
  }
}

/**
 * Les pages du classeur telles que l'impression et l'export les reçoivent :
 * chacune avec son numéro, et dans chaque case liée le numéro de la page
 * qu'elle ouvre ; une case qui mène hors du classeur — un tableau supprimé —
 * n'en porte pas.
 */
export function classeurPourImpression(
  pages: Gabarit[], paletteDe: (g: Gabarit) => PaletteTla, fichierDeMonPicto: (id: number) => string | undefined, mentionsDe: (g: Gabarit) => string,
): GabaritImprime[] {
  const numero = new Map(pages.map((p, i) => [p.id, i + 1]));
  return pages.map((p, i) => {
    const imprime = pourImpression({ ...p, competences: [] }, paletteDe(p), fichierDeMonPicto, mentionsDe(p));
    return {
      ...imprime, numero: i + 1, total: pages.length,
      cases: imprime.cases.map((c) => {
        const page = c.lien ? numero.get(c.lien) : undefined;
        const licence = licenceDeLImage(c.pictoId);
        return { ...c, ...(page ? { pageLiee: page } : {}), ...(licence ? { licence } : {}) };
      }),
    };
  });
}

/** Une copie du tableau, pour un autre élève : les mêmes cases aux mêmes places, sous un nom à elle. */
export function dupliquer(g: Gabarit): Gabarit {
  return {
    ...g, id: newId(), nom: `${g.nom} (copie)`,
    cases: g.cases.map((c) => ({ ...c })),
    ...(g.couleurs ? { couleurs: { mode: g.couleurs.mode, couleurs: { ...g.couleurs.couleurs } } } : {}),
  };
}

export const PLACES_DU_MOT: { id: PlaceDuMot; label: string }[] = [
  { id: "dessous", label: "Sous l'image" },
  { id: "dessus", label: "Au-dessus de l'image" },
  { id: "aucune", label: "Pas de mot" },
];

export const CORPS_DU_MOT: { corps: number; label: string }[] = [
  { corps: 7, label: "Petit" },
  { corps: 9, label: "Moyen" },
  { corps: 12, label: "Grand" },
];

export function nouveauGabarit(colonnes = 5, lignes = 4): Gabarit {
  return {
    id: newId(), nom: "Nouveau tableau", eleve: "",
    colonnes, lignes, paysage: true, ecart: 3,
    cases: Array.from({ length: colonnes * lignes }, caseVide),
  };
}

/**
 * Change la taille de la grille **sans déplacer les cases existantes**.
 *
 * C'est la règle qui compte le plus dans tout ce fichier. Un TLA vaut par la
 * stabilité des emplacements : l'enfant atteint « je » sans regarder parce que
 * « je » est toujours au même endroit. Redimensionner en réempilant les cases
 * de gauche à droite les décalerait toutes et annulerait l'apprentissage.
 * On raisonne donc en coordonnées : la case (colonne 2, ligne 3) reste en
 * (2, 3), la grille gagne ou perd des rangs et des colonnes sur ses bords.
 */
export function redimensionner(g: Gabarit, colonnes: number, lignes: number): Gabarit {
  const cases: CaseTla[] = [];
  for (let l = 0; l < lignes; l++) {
    for (let c = 0; c < colonnes; c++) {
      const dansAncienne = c < g.colonnes && l < g.lignes;
      cases.push(dansAncienne ? g.cases[l * g.colonnes + c] : caseVide());
    }
  }
  return { ...g, colonnes, lignes, cases };
}

/** Nombre de cases remplies. */
export const remplies = (g: Gabarit) => g.cases.filter((c) => c.pictoId !== null).length;

/**
 * Cases perdues si l'on réduit la grille à cette taille.
 *
 * Rétrécir efface des cases remplies sans qu'on s'en aperçoive : l'écran doit
 * pouvoir prévenir avant, pas s'excuser après.
 */
export function casesPerdues(g: Gabarit, colonnes: number, lignes: number): number {
  let n = 0;
  for (let l = 0; l < g.lignes; l++) {
    for (let c = 0; c < g.colonnes; c++) {
      if ((c >= colonnes || l >= lignes) && g.cases[l * g.colonnes + c]?.pictoId !== null) n++;
    }
  }
  return n;
}

/** Remplace une case, sans toucher aux autres. */
export function poser(g: Gabarit, index: number, valeur: CaseTla): Gabarit {
  const cases = g.cases.slice();
  cases[index] = valeur;
  return { ...g, cases };
}

/**
 * Échange deux cases de place, sans toucher aux autres.
 *
 * C'est l'enseignant qui décide où va chaque mot, avant d'imprimer : il glisse
 * une case sur une autre. Glissé sur une case vide, le mot s'y déplace et
 * laisse sa place libre.
 */
export function echanger(g: Gabarit, a: number, b: number): Gabarit {
  if (a === b || !g.cases[a] || !g.cases[b]) return g;
  const cases = g.cases.slice();
  [cases[a], cases[b]] = [cases[b], cases[a]];
  return { ...g, cases };
}

/**
 * Contrôle qu'un gabarit est cohérent avant impression ou après import.
 *
 * Un tableau dont la grille et les cases se contredisent s'imprimerait décalé,
 * ce qui est précisément le défaut qu'on cherche à ne jamais produire.
 */
export function verifier(g: Gabarit): string[] {
  const soucis: string[] = [];
  if (!g.nom.trim()) soucis.push("Le tableau n'a pas de nom.");
  if (g.colonnes < 1 || g.lignes < 1) soucis.push("La grille est vide.");
  if (g.cases.length !== g.colonnes * g.lignes) {
    soucis.push(`La grille annonce ${g.colonnes} × ${g.lignes} cases mais en contient ${g.cases.length}.`);
  }
  for (const c of g.cases) {
    if (c.pictoId !== null && !c.mot.trim()) {
      soucis.push("Une case porte un pictogramme sans mot.");
      break;
    }
  }
  return soucis;
}

/**
 * Relit un gabarit venu d'un fichier.
 *
 * L'import sert à reprendre le gabarit de l'orthophoniste ou de la maison :
 * c'est la voie normale, pas un cas limite. Un fichier abîmé doit donc être
 * refusé clairement, jamais réparé en silence — un tableau réparé de travers
 * serait pire qu'un import échoué.
 */
export function lireGabarit(json: string): Gabarit {
  const brut = JSON.parse(json);
  const g: Gabarit = {
    id: newId(),
    nom: String(brut?.nom ?? "").trim() || "Tableau importé",
    eleve: String(brut?.eleve ?? ""),
    colonnes: Number(brut?.colonnes) || 0,
    lignes: Number(brut?.lignes) || 0,
    paysage: brut?.paysage !== false,
    ecart: Number.isFinite(Number(brut?.ecart)) ? Number(brut.ecart) : 3,
    cases: Array.isArray(brut?.cases)
      ? brut.cases.map((c: any): CaseTla => {
          const couleur = couleurSure(c?.couleur);
          return {
            pictoId: c?.pictoId === null || c?.pictoId === undefined ? null : Number(c.pictoId),
            fichier: String(c?.fichier ?? ""),
            mot: String(c?.mot ?? ""),
            nature: (NATURES.some((n) => n.id === c?.nature) ? c.nature : "nom") as NatureMot,
            ...(couleur ? { couleur } : {}),
            ...(c?.masquee === true ? { masquee: true } : {}),
          };
        })
      : [],
    ...(brut?.couleurs ? { couleurs: lirePalette(brut.couleurs) } : {}),
    ...(PLACES_DU_MOT.some((p) => p.id === brut?.placeMot) ? { placeMot: brut.placeMot as PlaceDuMot } : {}),
    ...(Number.isFinite(Number(brut?.corpsMot)) && brut?.corpsMot != null
      ? { corpsMot: Math.min(16, Math.max(5, Number(brut.corpsMot))) } : {}),
  };
  const soucis = verifier(g);
  if (soucis.length) throw new Error(soucis.join(" "));
  return g;
}


/**
 * Construit un tableau à partir d'un squelette, du noyau résolu et du thème.
 *
 * Le noyau se pose aux coordonnées que le squelette lui assigne, toujours les
 * mêmes ; le thème ne remplit que les cases de rôle « nom ». C'est ce qui fait
 * la différence entre un tableau de langage et un tableau de choix : on doit
 * pouvoir demander, questionner, commenter et refuser, pas seulement désigner
 * un objet dans une liste.
 *
 * Un mot du noyau introuvable dans la banque laisse sa case vide plutôt que
 * de décaler les suivantes — la place reste réservée pour un ajout à la main.
 */
export function tableauSurTheme(
  s: Squelette,
  nom: string,
  noyau: Map<string, PictoArasaac>,
  theme: PictoArasaac[],
): Gabarit {
  const cases: CaseTla[] = [];
  let prochainNom = 0;
  for (const place of plan(s)) {
    if (place.role === "nom") {
      const p = theme[prochainNom++];
      cases.push(p
        ? { pictoId: p.id, fichier: p.fichier, mot: p.mot, nature: "nom" }
        : caseVide());
      continue;
    }
    const p = place.mot ? noyau.get(place.mot) : undefined;
    cases.push(p
      ? { pictoId: p.id, fichier: p.fichier, mot: p.mot, nature: NATURE_DU_ROLE[place.role] }
      : caseVide());
  }
  return {
    id: newId(), nom, eleve: "",
    colonnes: s.colonnes, lignes: s.lignes, paysage: true, ecart: 3, cases,
  };
}
