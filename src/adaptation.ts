// Analyse d'une fiche d'exercice au regard des besoins d'un élève TSA.
//
// Le principe qui gouverne ce fichier : **le modèle signale, l'enseignant
// décide**. Aucun élément n'est retiré d'une fiche sans validation.
//
// La raison n'est pas la prudence de façade. Un modèle ne peut pas savoir si
// le dessin de canard à côté d'une addition est un décor ou ce qu'il faut
// compter. Se tromper là, ce n'est pas produire une fiche moins jolie : c'est
// casser l'exercice de l'enseignant. On demande donc au modèle de dire ce
// qu'il voit et pourquoi ça gêne, jamais d'agir.
//
// Les critères viennent des recommandations d'adaptation pour élèves avec
// TSA : fonctionnement visuel porté sur le détail (donc le décor capte au
// détriment de la tâche), une seule information à la fois dans la consigne,
// fiches conçues sur un même modèle, fin de tâche visible.

export type Gravite = "gene" | "surcharge" | "bloquant";

export interface Constat {
  /** Ce qui est vu, en quelques mots. */
  element: string;
  /** Famille de problème, pour trier et expliquer. */
  critere: Critere;
  gravite: Gravite;
  /** Pourquoi ça gêne cet élève-là. */
  pourquoi: string;
  /** Ce que l'enseignant peut faire. */
  suggestion: string;
  /** Zone de la page, en fractions de 0 à 1 : [x, y, largeur, hauteur]. */
  zone?: [number, number, number, number];
  /** Vrai si le modèle n'est pas sûr que l'élément soit décoratif. */
  incertain?: boolean;
}

export interface Critere {
  id: string;
  label: string;
}

/**
 * Les familles de problèmes cherchées, avec ce qui les caractérise.
 *
 * Elles servent à trois choses : construire la consigne envoyée au modèle,
 * traduire sa réponse en français lisible, et filtrer l'analyse à l'écran.
 */
export const CRITERES: { id: string; label: string; cherche: string }[] = [
  { id: "decor", label: "Décor inutile",
    cherche: "images décoratives, mascottes, bordures illustrées, fonds colorés, titres fantaisie, cliparts sans rôle dans la tâche" },
  { id: "densite", label: "Page trop chargée",
    cherche: "plusieurs exercices sur la même page, marges absentes, interlignes serrés, blocs collés les uns aux autres" },
  { id: "consigne", label: "Consigne à découper",
    cherche: "consigne qui donne plusieurs informations d'un coup, sous-entendus, sens figuré, vocabulaire abstrait, renvoi à une explication orale" },
  { id: "typo", label: "Typographie",
    cherche: "polices multiples ou fantaisie, italique, texte justifié, corps trop petit, MAJUSCULES longues" },
  { id: "reperage", label: "Repérage difficile",
    cherche: "exercices non numérotés, séparations invisibles, ordre de lecture ambigu, colonnes qui se croisent" },
  { id: "fin", label: "Fin de tâche invisible",
    cherche: "rien n'indique combien il reste à faire ni où l'exercice s'arrête" },
  { id: "reponse", label: "Place pour répondre",
    cherche: "lignes ou cases de réponse trop petites, absentes, ou dont l'emplacement n'est pas évident" },
  { id: "couleur", label: "Couleur décorative",
    cherche: "couleurs qui n'apportent aucune information, ou au contraire information portée par la seule couleur" },
];

export const GRAVITES: Record<Gravite, { label: string; couleur: string; rang: number }> = {
  bloquant: { label: "Bloquant", couleur: "#b03030", rang: 0 },
  surcharge: { label: "Surcharge", couleur: "#c2591f", rang: 1 },
  gene: { label: "Gêne", couleur: "#8a7a2f", rang: 2 },
};

/**
 * Consigne envoyée au modèle, avec l'image de la page.
 *
 * Deux exigences y sont répétées parce qu'elles sont la valeur de l'outil :
 * ne rien inventer qui ne soit visible, et signaler son doute quand un
 * élément pourrait porter l'exercice plutôt que le décorer.
 */
export function consigneAnalyse(niveau: string): string {
  const criteres = CRITERES.map((c) => `- ${c.id} : ${c.cherche}`).join("\n");
  return `Tu examines la photo d'une fiche d'exercice scolaire${niveau ? ` de niveau ${niveau}` : ""}.
Elle va être adaptée pour un élève avec trouble du spectre de l'autisme, dont
l'attention est captée par les détails et qui traite mal plusieurs informations
à la fois.

Repère uniquement ce qui est VISIBLE sur l'image. N'invente rien. Si tu ne
vois pas de problème, renvoie une liste vide.

Familles à chercher :
${criteres}

Règle importante : une image peut être un décor OU porter l'exercice (ce qu'il
faut compter, observer, relier). Si tu n'es pas certain qu'un élément soit
décoratif, mets "incertain": true. Ne conseille jamais de retirer un élément
dont tu n'es pas sûr.

Réponds uniquement par un tableau JSON, sans texte autour :
[{"element":"...","critere":"decor","gravite":"surcharge","pourquoi":"...",
  "suggestion":"...","zone":[0.1,0.05,0.3,0.12],"incertain":false}]

- "gravite" vaut "gene", "surcharge" ou "bloquant".
- "zone" est la position sur la page en fractions de 0 à 1 : [x, y, largeur,
  hauteur], origine en haut à gauche. Omets "zone" si tu ne peux pas la situer.
- "pourquoi" et "suggestion" font une phrase courte, en français, adressée à
  l'enseignant.`;
}

/**
 * Relit la réponse du modèle.
 *
 * Un modèle encadre volontiers son JSON de texte ou de balises ; on extrait
 * donc le tableau plutôt que d'exiger une réponse parfaite. Tout ce qui n'est
 * pas exploitable est écarté en silence : mieux vaut un constat de moins
 * qu'une ligne vide affichée à l'enseignant.
 */
export function lireConstats(reponse: string): Constat[] {
  const debut = reponse.indexOf("[");
  const fin = reponse.lastIndexOf("]");
  if (debut < 0 || fin <= debut) return [];
  let brut: any;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return []; }
  if (!Array.isArray(brut)) return [];

  const connus = new Map(CRITERES.map((c) => [c.id, c]));
  return brut.flatMap((x: any): Constat[] => {
    const element = String(x?.element ?? "").trim();
    if (!element) return [];
    const critere = connus.get(String(x?.critere)) ?? { id: "decor", label: "Décor inutile" };
    const gravite: Gravite = ["gene", "surcharge", "bloquant"].includes(x?.gravite) ? x.gravite : "gene";
    return [{
      element,
      critere: { id: critere.id, label: critere.label },
      gravite,
      pourquoi: String(x?.pourquoi ?? "").trim(),
      suggestion: String(x?.suggestion ?? "").trim(),
      zone: zoneValide(x?.zone),
      incertain: x?.incertain === true,
    }];
  }).sort((a, b) => GRAVITES[a.gravite].rang - GRAVITES[b.gravite].rang);
}

/**
 * Une zone hors de la page, ou de surface nulle, ne peut pas se dessiner.
 *
 * Les modèles situent approximativement : on borne plutôt que de rejeter,
 * mais on refuse une zone qui couvrirait presque toute la page — masquer la
 * fiche entière n'aide personne, et c'est le signe que le modèle a échoué.
 */
export function zoneValide(z: any): [number, number, number, number] | undefined {
  if (!Array.isArray(z) || z.length !== 4 || z.some((v) => !Number.isFinite(Number(v)))) return undefined;
  const [x, y, l, h] = z.map(Number).map((v) => Math.max(0, Math.min(1, v)));
  if (l <= 0.01 || h <= 0.01) return undefined;
  if (l * h > 0.8) return undefined;
  return [x, y, Math.min(l, 1 - x), Math.min(h, 1 - y)];
}

/** Résumé chiffré, pour l'en-tête de l'analyse. */
export function resume(constats: Constat[]) {
  const parGravite = { bloquant: 0, surcharge: 0, gene: 0 };
  let incertains = 0;
  for (const c of constats) {
    parGravite[c.gravite]++;
    if (c.incertain) incertains++;
  }
  return { total: constats.length, ...parGravite, incertains };
}
