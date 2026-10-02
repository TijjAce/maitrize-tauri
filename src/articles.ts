// ── « un » ou « une » ──────────────────────────────────────────────────────
//
// La banque d'images ne dit pas le genre des noms. On le devine : les noms
// courants qui trompent d'abord — les masculins en -e, les féminins sans -e —,
// puis la fin du mot. Ce n'est qu'une proposition : l'enseignant la corrige
// d'un choix, et sa correction se garde.

export type Article = "un" | "une" | "des" | "";

export const ARTICLES: { id: Article; libelle: string }[] = [
  { id: "un", libelle: "Un" },
  { id: "une", libelle: "Une" },
  { id: "des", libelle: "Des" },
  { id: "", libelle: "(rien)" },
];

const liste = (mots: string) => new Set(mots.split(/\s+/).filter(Boolean));

/** Des noms masculins que leur fin ferait prendre pour des féminins. */
const MASCULINS = liste(`
  singe légume costume volume rhume squelette parapluie incendie génie foie musée lycée scarabée trophée
  masque casque disque cirque kiosque chèque plastique élastique moustique phoque risque
  sable câble cartable meuble immeuble érable diable ensemble ongle aigle triangle rectangle angle trèfle souffle buffle
  homme bonhomme crocodile reptile hippopotame renne cygne signe peigne merle insecte crabe poulpe gorille caniche bouledogue
  dimanche automne laboratoire territoire ivoire pourboire réfectoire observatoire accessoire stade gymnase vase royaume baume domaine
  monde pôle globe cube tube microbe verbe cône trône losange mélange linge ange songe rêve fleuve élève glaive silence
  exercice service dentifrice caprice édifice bénéfice précipice indice sacrifice artifice pouce commerce espace palace
  texte conte compte doute geste reste poste groupe type principe coude sourire rire navire
  véhicule crépuscule tentacule globule module vestibule prince pirate pilote juge guide garde capitaine concierge
  camarade adulte artiste dentiste magazine beurre verre tonnerre lierre parterre chêne frêne orme charme platane saule
  organe crâne âne père frère hélicoptère cimetière cratère caractère mystère gruyère repère
  cyclone trombone satellite site gîte termite mérite liquide vide code épisode
  refuge déluge vertige prestige cierge éloge golfe paragraphe triomphe axe luxe sexe bronze trapèze
  drame gendarme uniforme terme germe calme rythme crime régime centime pétale parachute portefeuille mille
  rouge jaune squale lièvre ventre litre mètre
`);

/** Des noms féminins que leur fin ferait prendre pour des masculins. */
const FEMININS = liste(`
  main souris fourmi dent fleur nuit mer forêt croix noix voix paix toux peau eau radio photo moto télé clé clef
  sœur soeur brebis jument chanson leçon boisson prison façon maman chaleur couleur douleur odeur peur sueur vapeur
  hauteur largeur longueur humeur valeur erreur horreur terreur lueur douceur fraîcheur épaisseur profondeur grandeur
  lenteur rumeur tumeur saveur senteur liqueur faim soif fin loi foi fois paroi vis cour tour dynamo météo vidéo auto
  cuiller mort part plupart dot pizza villa véranda caméra tombola paella mozzarella tribu vertu glu chair nef perdrix oasis
  moitié amitié pitié
`);

/** Des noms féminins en -e que leur fin ferait prendre pour des masculins. */
const FEMININS_EN_E = liste(`
  cage image nage page plage rage crème affaire grammaire paire molaire aire chaire boucle
  fenêtre lettre montre huître vitre poutre rencontre ombre chambre fibre chèvre fièvre lèvre œuvre oeuvre couleuvre pieuvre
  encre ancre nacre gaufre offre vertèbre algèbre poudre foudre cendre
  police épice malice justice notice hélice table étable fable cible bible règle épingle jungle sangle tringle
  gifle moufle pantoufle
`);

/** Les fins qui font un masculin, parmi les mots en -e. */
const FINS_MASCULINES = ["age", "ège", "isme", "asme", "ème", "ôme", "ome", "gramme", "phone", "scope", "aire", "cle", "ple", "ice"];
/** Des masculins en -té, -ion : ce sont les exceptions d'une règle féminine. */
const MASCULINS_SANS_E = liste("été côté pâté thé comité traité député velouté karaté");

/**
 * L'article qu'un nom prend le plus probablement : « un » ou « une ».
 *
 * D'un mot composé ou d'une locution, c'est le premier mot qui commande
 * (« pomme de terre ») — sauf « grand-mère », où c'est le dernier.
 */
export function articleProbable(mot: string): Article {
  const propre = (mot ?? "").normalize("NFC").toLowerCase().trim().replace(/^(?:(?:une?|les?|la|des)\s+|l['’]\s*)/, "");
  if (!propre) return "";
  const parties = propre.split(/[\s-]+/);
  const m = /^(grand|grande|belle|beau|petit|petite|arrière)$/.test(parties[0]) && parties.length > 1 ? parties[parties.length - 1] : parties[0];
  if (MASCULINS.has(m) || MASCULINS_SANS_E.has(m)) return "un";
  if (FEMININS.has(m) || FEMININS_EN_E.has(m)) return "une";
  if (!m.endsWith("e")) {
    // « addition », « télévision », « région », « maison », « santé » : féminins malgré leur consonne ou leur é.
    if (/(tion|sion|xion|gion|nion|aison)$/.test(m)) return "une";
    if (m.endsWith("té") && m.length >= 5) return "une";
    return "un";
  }
  if (m.endsWith("trice")) return "une";
  if (FINS_MASCULINES.some((f) => m.endsWith(f))) return "un";
  // Une consonne puis « re » : arbre, livre, tigre, sucre, ventre, coffre.
  if (/[bcdfgptv]re$/.test(m)) return "un";
  return "une";
}

/** Sous quel nom se garde l'article qu'on a choisi pour un mot. */
export const cleDeLArticle = (mot: string) => (mot ?? "").normalize("NFC").toLowerCase().trim();

/** L'article d'un mot : celui que l'enseignant a choisi, sinon le plus probable. */
export function articleDe(mot: string, choisis: Record<string, string>): Article {
  const choisi = choisis[cleDeLArticle(mot)];
  return ARTICLES.some((a) => a.id === choisi) ? (choisi as Article) : articleProbable(mot);
}

/** L'article tel qu'il s'écrit en tête de ligne : « Un », « Une ». */
export const articleEcrit = (a: Article) => (a ? a[0].toUpperCase() + a.slice(1) : "");
