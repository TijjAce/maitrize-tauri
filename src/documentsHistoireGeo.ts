// ── Les documents à montrer, séance par séance ────────────────────────────
//
// Pour les séquences d'histoire-géographie du cycle 2, des documents trouvés
// en ligne (recherche du 11 octobre 2026, adresses vérifiées ce jour-là) :
// ce qu'on projette en classe, ce qu'une licence libre permet d'imprimer en
// citant sa source, ce qu'Éduscol a fait pour la classe, et ce qui sert à
// préparer. Ils s'écrivent dans le matériel de la séance quand la séquence
// se crée : l'enseignant les garde, les retire, en ajoute.

/**
 * Ce qu'on peut faire d'un document :
 * - projeter : le montrer en classe, sans le reproduire ;
 * - imprimer : sa licence permet de l'imprimer, en citant la source ;
 * - classe : fait pour la classe (le kit de cartes d'Éduscol), à imprimer pour elle ;
 * - preparer : pour l'enseignant.
 */
export type UsageDocument = "projeter" | "imprimer" | "classe" | "preparer";

export interface DocumentAMontrer {
  titre: string;
  /** Qui le publie. */
  source: string;
  url: string;
  usage: UsageDocument;
  /** La licence de ce qui s'imprime. */
  licence?: string;
}

const USAGE: Record<UsageDocument, (licence?: string) => string> = {
  projeter: () => "à projeter",
  imprimer: (licence) => `libre, à imprimer${licence ? ` (${licence})` : ""}`,
  classe: () => "à imprimer pour la classe",
  preparer: () => "pour préparer",
};

/** Les documents d'une séance, tels que le matériel les écrit : une ligne chacun, son adresse au bout. */
export function texteDesDocuments(documents: DocumentAMontrer[]): string {
  if (!documents.length) return "";
  return ["Documents à montrer :", ...documents.map((d) => `• ${d.titre} (${d.source}) — ${USAGE[d.usage](d.licence)} : ${d.url}`)].join("\n");
}

// ── Les sources qui reviennent ────────────────────────────────────────────

const doc = (titre: string, source: string, url: string, usage: UsageDocument, licence?: string): DocumentAMontrer =>
  ({ titre, source, url, usage, ...(licence ? { licence } : {}) });

const EDUSCOL = "Éduscol";
const eduscol = (fichier: string) => `https://eduscol.education.gouv.fr/sites/default/files/document/${fichier}`;
const COMMONS = "Wikimedia Commons";
const commons = (page: string) => `https://commons.wikimedia.org/wiki/${page}`;
/** Chaque fichier de Commons a sa licence : la lire avant d'imprimer, et la citer. */
const PAR_IMAGE = "licence de chaque image";
const PARIS_MUSEES = "Paris Musées";
const carnavalet = (oeuvre: string) => `https://www.parismuseescollections.paris.fr/fr/musee-carnavalet/oeuvres/${oeuvre}`;
const CULTURE = "ministère de la Culture";
const NASA = "NASA";
const IGN = "IGN";
const LO = "Licence Ouverte";
const GEOCONFLUENCES = "Géoconfluences";
const geoconfluences = (page: string) => `https://geoconfluences.ens-lyon.fr/${page}`;
const PHOTOS_DE_GEOGRAPHES = "CC BY-NC-SA pour la plupart des photos";

// Le kit de cartes d'Éduscol (septembre 2026), fait pour la classe.
const PLANISPHERE_CLASSE = doc("Le planisphère de la classe, 6 feuilles A4 à assembler", `${EDUSCOL}, kit de cartes 2026`,
  eduscol("planisphere-equalearth-jbbouron-6feuilles-127484.pdf"), "classe");
const FICHE_DU_KIT = doc("La fiche du kit de cartes : quel repère, quelle classe", EDUSCOL, eduscol("fichehgcartoc2c32026-127502.pdf"), "preparer");

const REMONTER_LE_TEMPS = doc("Le quartier de l'école vu d'avion, vers 1950 et aujourd'hui (« Remonter le temps »)", IGN, "https://remonterletemps.ign.fr/", "imprimer", LO);
const VU_DU_CIEL = doc("Le lieu vu du ciel, en photographie aérienne", `${IGN}, cartes.gouv.fr`, "https://cartes.gouv.fr/explorer-les-cartes/", "imprimer", LO);
const TERRE_LA_NUIT = doc("La Terre la nuit : les lumières montrent où vivent les êtres humains", NASA,
  "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/", "imprimer", "domaine public, crédit NASA");
const TERRE_VUE_DE_L_ESPACE = doc("La Terre entière vue de l'espace, une photographie par jour", NASA, "https://epic.gsfc.nasa.gov/", "imprimer",
  "domaine public, crédit NASA");
const BAUDOUIN = doc("Les saisons, les mois et les heures du jour et de la nuit, fresque de Paul Baudouin (1910)", PARIS_MUSEES,
  "https://www.parismuseescollections.paris.fr/en/node/244632", "imprimer", "CC0");
const TRES_RICHES_HEURES = doc("Les travaux des douze mois, Très Riches Heures du duc de Berry", COMMONS,
  commons("Category:Labors_of_the_months_in_Tres_Riches_Heures_du_Duc_de_Berry"), "imprimer", "domaine public");
const ET_AVANT_LA_FRANCE = doc("« Et avant la France ? », fiche du CM1 (2016) : sites, traces, pièges à éviter", EDUSCOL,
  eduscol("ra16c3higecm1th1avantlafrancevujc619867pdf-77106.pdf"), "preparer");
const SACRE_PHILIPPE_AUGUSTE = doc("Le sacre de Philippe Auguste, Grandes Chroniques de France (vers 1375-1380)", COMMONS,
  commons("File:Sacre_de_Philippe_Auguste.jpg"), "imprimer", "domaine public");
const VERCINGETORIX = doc("Vercingétorix jette ses armes aux pieds de Jules César, Lionel Royer (1899)", COMMONS,
  commons("File:Siege-alesia-vercingetorix-jules-cesar.jpg"), "imprimer", "domaine public");
const LAMPE_ROMAINE = doc("Une lampe à huile gallo-romaine, musée Carnavalet", PARIS_MUSEES, carnavalet("petite-lampe-a-huile"), "imprimer", "CC0");
const POP = doc("Le patrimoine protégé de la commune : monuments, objets, photographies (plateforme POP)", CULTURE, "https://pop.culture.gouv.fr/", "projeter");
const PORTRAITS_D_ECOLES = doc("« Portraits d'écoles » : la classe fait le portrait de son école (projet, inscription sur ADAGE)",
  "Cité de l'architecture et du patrimoine", "https://www.citedelarchitecture.fr/fr/article/portraits-decoles", "preparer");
const GEOCONFLUENCES_CE1 = doc("Les ressources pour le CE1, et la banque de photos de géographes (urbain, rural)", GEOCONFLUENCES,
  geoconfluences("programmes/classes/ressources-pour-le-cycle-2/ressources-de-geoconfluences-pour-traiter-les-programmes-de-geographie-en-ce1"),
  "imprimer", PHOTOS_DE_GEOGRAPHES);
const GEOCONFLUENCES_CE2 = doc("Les ressources pour le CE2, et la banque de photos de géographes (population, espaces productifs)", GEOCONFLUENCES,
  geoconfluences("programmes/classes/ressources-pour-le-cycle-2/ressources-de-geoconfluences-pour-traiter-les-programmes-de-geographie-en-ce2"),
  "imprimer", PHOTOS_DE_GEOGRAPHES);
const PLANISPHERE_ELEVE_CE1 = doc("Le planisphère de l'élève, CE1 (A4, noir et blanc)", `${EDUSCOL}, kit de cartes 2026`,
  eduscol("ce1-planisphere-eleve-nb-129316.pdf"), "classe");
const ELEMENTS_CE1 = doc("Les éléments à découper : zones climatiques, forêts, déserts, fleuves, massifs", `${EDUSCOL}, kit de cartes 2026`,
  eduscol("ce1-th1-th2-elements-separes-pour-completer-planisphere-127496.pdf"), "classe");
const FOYERS_ET_VILLES = doc("Les grands foyers de peuplement et les villes, à découper", `${EDUSCOL}, kit de cartes 2026`,
  eduscol("cp-ce1-foyers-peuplement-et-villes-129313.pdf"), "classe");

/** Les documents de chaque démarche, par séance (la première est la séance 0). */
export const DOCUMENTS_HG: Record<string, Record<number, DocumentAMontrer[]>> = {
  // ── Histoire ──
  "temps-naturel-cp": {
    0: [BAUDOUIN],
    1: [TERRE_VUE_DE_L_ESPACE],
    2: [doc("Les quatre saisons, Paul Cézanne : l'hiver, et ses trois autres saisons", PARIS_MUSEES,
      "https://www.parismuseescollections.paris.fr/fr/petit-palais/oeuvres/les-quatre-saisons-l-hiver", "imprimer", "CC0")],
    3: [TRES_RICHES_HEURES,
      doc("« Les saisons — Billes de sciences » : la vidéo et ses pistes", "Fondation La main à la pâte",
        "https://fondation-lamap.org/ressource-multimedia/les-saisons-billes-de-sciences", "preparer")],
  },
  "temps-represente-cp": {
    3: [
      doc("Des sabliers, en photographies", COMMONS, commons("Category:Hourglasses"), "imprimer", PAR_IMAGE),
      doc("Des clepsydres, en photographies", COMMONS, commons("Category:Water_clocks"), "imprimer", PAR_IMAGE),
      doc("Des cadrans solaires en France", COMMONS, commons("Category:Sundials_in_France"), "imprimer", PAR_IMAGE),
      doc("Une horloge de 1775, musée Carnavalet", PARIS_MUSEES, carnavalet("horloge"), "imprimer", "CC0"),
    ],
    6: [
      TRES_RICHES_HEURES,
      doc("Un autre calendrier : le calendrier républicain (1793)", PARIS_MUSEES, carnavalet("calendrier-republicain"), "imprimer", "CC0"),
    ],
  },
  "situer-evenements-cp": {
    3: [BAUDOUIN],
    4: [doc("Les « degrés des âges » : la vie, du bébé au vieillard, en images", COMMONS, commons("Category:Steps_of_life"), "imprimer", PAR_IMAGE)],
  },
  "passe-proche-lointain-ce1": {
    0: [
      doc("Une classe d'autrefois, au Musée national de l'Éducation", COMMONS, commons("Category:Mus%C3%A9e_national_de_l%27%C3%89ducation"), "imprimer", PAR_IMAGE),
      doc("Des scènes de classe peintes par Jean Geoffroy (1880-1900)", COMMONS, commons("Category:Jean_Geoffroy"), "imprimer", PAR_IMAGE),
      doc("« La rentrée des classes » (1963), des enfants d'une ferme près de Chartres", "INA",
        "https://www.ina.fr/ina-eclaire-actu/video/caf97032696/la-rentree-des-classes", "projeter"),
      doc("« La première classe » (1962)", "INA", "https://www.ina.fr/ina-eclaire-actu/video/caf90048268/la-premiere-classe", "projeter"),
      REMONTER_LE_TEMPS,
    ],
    2: [doc("Le récit de Stéphanie : une frise du XXe siècle à partir d'un récit de vie (évaluation, 2017)", EDUSCOL,
      eduscol("ev16c2questionnerreperersituertemps784977pdf-75873.pdf"), "preparer")],
    3: [POP],
    4: [doc("Le récit de Stéphanie (2) : comparer des durées sur une frise (évaluation, 2017)", EDUSCOL,
      eduscol("ev16c2questionnersereperertempscomparer784979pdf-75876.pdf"), "preparer")],
  },
  "grandes-periodes-ce1": {
    0: [doc("Des jeux et des vidéos sur l'histoire, pour les 7-12 ans", "BnF Essentiels", "https://essentiels.bnf.fr/fr/jeunesse", "projeter")],
    1: [
      doc("Une figurine du Néolithique, musée Carnavalet (les vues marquées CC0)", PARIS_MUSEES, carnavalet("figure-feminine"), "imprimer", "CC0"),
      LAMPE_ROMAINE,
      doc("Une horloge de 1775, musée Carnavalet", PARIS_MUSEES, carnavalet("horloge"), "imprimer", "CC0"),
    ],
    2: [VERCINGETORIX, SACRE_PHILIPPE_AUGUSTE],
    4: [doc("Le récit de Samir : une frise de l'histoire de France à partir du récit d'un élève (évaluation, 2017)", EDUSCOL,
      eduscol("ev16c2questionnersitueretsesituerhistorique784981pdf-75879.pdf"), "preparer")],
  },
  "traces-passe-ce1": {
    0: [POP, REMONTER_LE_TEMPS],
    1: [
      LAMPE_ROMAINE,
      doc("Le sceau de Philippe Auguste, Archives nationales", COMMONS, commons("File:Sceau_de_Philippe_Auguste._-_Archives_Nationales_-_SC-D157.jpg"),
        "imprimer", "domaine public"),
      doc("Les alignements de Carnac", COMMONS, commons("Category:Monuments_historiques_in_Carnac_(stone_rows)"), "imprimer", PAR_IMAGE),
    ],
    3: [
      doc("« L'archéologue », dessin animé de 2 min 31, aussi en langue des signes (Les experts de l'archéologie)", "Inrap",
        "https://www.inrap.fr/l-archeologue-10800", "projeter"),
      doc("« L'archéologie à très petits pas », un livre dès 6 ans", "Inrap", "https://www.inrap.fr/l-archeologie-tres-petits-pas-8402", "preparer"),
      doc("« 1 classe, 1 monument » : suivre un monument proche toute l'année", "Centre des monuments nationaux",
        "https://www.monuments-nationaux.fr/enseignants-et-chercheurs/dispositif-1-classe-1-monument", "preparer"),
    ],
  },
  "prehistoire-ce2": {
    0: [ET_AVANT_LA_FRANCE],
    2: [
      doc("Lascaux : entrer dans la grotte, en visite virtuelle", CULTURE, "https://archeologie.culture.gouv.fr/lascaux/fr/visiter-grotte-lascaux", "projeter"),
      doc("Lascaux en trois dimensions", CULTURE, "https://archeologie.culture.gouv.fr/lascaux/fr/media/view/13589", "projeter"),
      doc("Chauvet, salle par salle", CULTURE, "https://archeologie.culture.gouv.fr/chauvet/fr/visiter-la-grotte", "projeter"),
      doc("Chauvet : chercher les animaux cachés dans la paroi (jeu)", CULTURE, "https://archeologie.culture.gouv.fr/chauvet/fr/quiz-et-jeux", "projeter"),
      doc("Les peintures de Lascaux et leurs répliques", COMMONS, commons("Category:Lascaux"), "imprimer", PAR_IMAGE),
    ],
    3: [
      doc("Les alignements de Carnac", COMMONS, commons("Category:Monuments_historiques_in_Carnac_(stone_rows)"), "imprimer", PAR_IMAGE),
      doc("La hache d'Ötzi, reconstituée", COMMONS, commons("File:ReconstructedOetziAxe.jpg"), "imprimer", "CC BY 3.0"),
    ],
  },
  "rome-gaule-ce2": {
    0: [ET_AVANT_LA_FRANCE],
    1: [LAMPE_ROMAINE],
    3: [doc("Le pont du Gard, un aqueduc romain", COMMONS, commons("Category:Pont_du_Gard"), "imprimer", PAR_IMAGE)],
    5: [
      VERCINGETORIX,
      doc("Vercingétorix : ses monnaies, le monument d'Alise-Sainte-Reine", COMMONS, commons("Category:Vercingetorix"), "imprimer", PAR_IMAGE),
      doc("Les sculpteurs à Lutèce à l'époque gallo-romaine, aquarelle", PARIS_MUSEES,
        carnavalet("les-sculpteurs-a-lutece-durant-l-epoque-gallo-romaine-projet-de-decoration"), "imprimer", "CC0"),
      doc("Le MuséoParc Alésia : les activités du cycle 2", "MuséoParc Alésia", "https://alesia.com/scolaires-enseignants/activites-cycle-2/", "preparer"),
      doc("Le MuséoParc Alésia : un livret FALC, et l'accueil des visiteurs en situation de handicap mental", "MuséoParc Alésia",
        "https://alesia.com/accessibilite/handicap-mental/", "preparer"),
      doc("Lugdunum : des dossiers pour le primaire, avec une fiche élève", "Lugdunum, musée et théâtres romains",
        "https://lugdunum.grandlyon.com/fr/ressources/ressources-pedagogiques", "preparer"),
      doc("Le musée de la Romanité : un parcours FALC, des visites adaptées", "Musée de la Romanité, Nîmes",
        "https://museedelaromanite.fr/visiter-nimes-en-situation-de-handicap-une-experience-accessible-au-musee-de-la-romanite", "preparer"),
    ],
  },
  "royaume-france-ce2": {
    0: [doc("Le royaume des Francs sous Hugues Capet, carte", COMMONS, commons("File:Le_royaume_des_Francs_sous_Hugues_Capet-fr.svg"), "imprimer", "CC BY-SA 3.0")],
    1: [doc("La France en 1030, 1180 et 1477 : le domaine royal grandit, cartes", COMMONS, commons("File:Map_France_1180-fr.svg"), "imprimer", "CC BY-SA 3.0")],
    2: [
      SACRE_PHILIPPE_AUGUSTE,
      doc("Les Grandes Chroniques de France : Hugues Capet, les sacres", "BnF Essentiels",
        "https://essentiels.bnf.fr/fr/album/7f5e7984-e3ff-451d-b0b7-dbdce53567bc-grandes-chroniques-france", "projeter"),
    ],
    3: [
      doc("Le sceau de Philippe Auguste, Archives nationales", COMMONS, commons("File:Sceau_de_Philippe_Auguste._-_Archives_Nationales_-_SC-D157.jpg"),
        "imprimer", "domaine public"),
      doc("Des sceaux des Archives nationales", COMMONS, commons("Category:Seals_in_the_Archives_Nationales_(France)"), "imprimer", PAR_IMAGE),
      doc("Le franc à cheval de Jean le Bon (1360) : la monnaie du roi", COMMONS,
        commons("File:Franc_a_cheval_de_Jean_le_Bon_5_decembre_1360_or_3730mg.jpg"), "imprimer", "domaine public"),
      doc("Les collections de la Monnaie de Paris", "Monnaie de Paris", "https://collectionspatrimoniales.monnaiedeparis.fr/fr/", "projeter"),
    ],
    4: [doc("« Le temps des rois », fiche du CM1 (2016) : Saint Louis, Blanche de Castille, les cartes du royaume", EDUSCOL,
      eduscol("ra16c3higecm1th2tempsdesrois619869pdf-77109.pdf"), "preparer")],
  },
  // ── Géographie ──
  "classe-espace-organise-cp": {
    0: [PORTRAITS_D_ECOLES],
  },
  "ecole-quartier-cp": {
    0: [
      PORTRAITS_D_ECOLES,
      doc("« Langages graphiques et appropriation de l'espace en cycle 2 », Pierre Colin (2026)", GEOCONFLUENCES,
        geoconfluences("informations-scientifiques/dossiers-thematiques/geographie-espaces-scolaires/geographie-a-l-ecole/langages-graphiques-et-appropriation-de-l-espace-cycle-2-dispositif-didactique"),
        "preparer"),
    ],
    1: [doc("Le plan cadastral : le contour de l'école et de ses bâtiments", "cadastre.data.gouv.fr", "https://cadastre.data.gouv.fr/", "imprimer", LO)],
    2: [VU_DU_CIEL, REMONTER_LE_TEMPS],
    3: [doc("Les rues du trajet, photographiées à hauteur d'œil (Panoramax)", "Panoramax", "https://panoramax.fr/", "imprimer", "Licence Ouverte ou CC BY-SA")],
  },
  "representations-monde-cp": {
    0: [TERRE_VUE_DE_L_ESPACE],
    1: [PLANISPHERE_CLASSE, FICHE_DU_KIT,
      doc("La Terre sans nuages, mise à plat (Blue Marble)", NASA, "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/", "imprimer",
        "domaine public, crédit NASA Earth Observatory")],
    2: [
      doc("Les continents, les océans, la France et l'outre-mer, à découper, en couleur", `${EDUSCOL}, kit de cartes 2026`,
        eduscol("cp-th2-coul-elements-separes-pour-completer-planisphere-127547.pdf"), "classe"),
      doc("Les mêmes, en noir et blanc", `${EDUSCOL}, kit de cartes 2026`, eduscol("cp-th2-nb-elements-separes-pour-completer-planisphere-127550.pdf"), "classe"),
    ],
    4: [FOYERS_ET_VILLES, TERRE_LA_NUIT],
    5: [doc("Le planisphère de l'élève, CP (A4) : pour le cahier ou l'évaluation", `${EDUSCOL}, kit de cartes 2026`,
      eduscol("cp-th2-planisphere-eleve-127487.pdf"), "classe")],
  },
  "terre-peuplee-ce1": {
    0: [PLANISPHERE_CLASSE, FOYERS_ET_VILLES, TERRE_LA_NUIT,
      doc("La densité de population de chaque pays, carte", "Our World in Data", "https://ourworldindata.org/grapher/population-density", "imprimer", "CC BY")],
    1: [
      doc("« Quelles sont les plus grandes villes du monde ? » (2026)", GEOCONFLUENCES, geoconfluences("actualites/veille/breves/quelles-sont-les-plus-grandes-villes-du-monde"),
        "preparer"),
      doc("Les villes photographiées depuis la Station spatiale", NASA, "https://eol.jsc.nasa.gov/", "imprimer",
        "domaine public, crédit « Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center »"),
    ],
    2: [GEOCONFLUENCES_CE1],
    3: [PLANISPHERE_ELEVE_CE1],
  },
  "lieux-de-vie-ce1": {
    0: [doc("Des paysages remarquables : montagnes, forêts, côtes, champs", COMMONS, commons("Category:Featured_pictures_of_landscapes"), "imprimer", PAR_IMAGE),
      GEOCONFLUENCES_CE1],
    1: [ELEMENTS_CE1, FICHE_DU_KIT,
      doc("Le monde coloré selon sa végétation (Natural Earth II)", "Natural Earth",
        "https://www.naturalearthdata.com/downloads/10m-raster-data/10m-natural-earth-2/", "imprimer", "domaine public")],
    2: [doc("Des savanes, en photographies", COMMONS, commons("Category:Savannas"), "imprimer", PAR_IMAGE)],
    5: [doc("Des logements du monde entier, en photographies (Dollar Street)", "Gapminder", "https://www.gapminder.org/dollar-street", "imprimer", "CC BY 4.0")],
    6: [PLANISPHERE_ELEVE_CE1],
  },
  "population-france-ce2": {
    0: [TERRE_LA_NUIT,
      doc("La grille de densité des communes (2025) : dense, intermédiaire, rurale", "Insee", "https://www.insee.fr/fr/information/8571524", "imprimer", LO),
      GEOCONFLUENCES_CE2],
    1: [doc("Les unités urbaines : de quoi placer les cinq premières agglomérations", "Insee", "https://www.insee.fr/fr/information/4802589", "imprimer", LO)],
  },
  "se-loger-ce2": {
    0: [VU_DU_CIEL, REMONTER_LE_TEMPS],
    1: [
      doc("Des paysages de France : villes, villages, campagnes", COMMONS, commons("Category:Quality_images_of_landscapes_in_France"), "imprimer", PAR_IMAGE),
      doc("Une maison de village en France, et la famille qui y vit (Dollar Street)", "Gapminder", "https://www.gapminder.org/dollar-street/families/rayez",
        "imprimer", "CC BY 4.0"),
    ],
    2: [doc("Des grands ensembles en France (pour l'architecture récente, vérifier chaque image)", COMMONS, commons("Category:Public_housing_in_France"),
      "imprimer", PAR_IMAGE)],
    4: [GEOCONFLUENCES_CE2,
      doc("Un même lieu photographié au fil des années (observatoire photographique, Bretagne)", "POPP-Breizh", "https://popp-breizh.fr/public/popp", "projeter"),
      doc("Les Journées nationales de l'architecture : des visites et des ateliers pour les élèves, en octobre", CULTURE,
        "https://journeesarchitecture.culture.gouv.fr/", "preparer")],
  },
  "travailler-ce2": {
    0: [GEOCONFLUENCES_CE2],
    1: [doc("Des champs vus du ciel, en photographie aérienne", `${IGN}, cartes.gouv.fr`, "https://cartes.gouv.fr/explorer-les-cartes/", "imprimer", LO)],
    2: [
      doc("Des zones industrielles en France", COMMONS, commons("Category:Industrial_areas_in_France"), "imprimer", PAR_IMAGE),
      doc("Des images satellites commentées, comme le bassin industriel de Lacq (Géoimage)", "CNES", "https://cnes.fr/projets/geoimage", "projeter"),
    ],
    4: [
      doc("Des stations balnéaires en France", COMMONS, commons("Category:Seaside_resorts_in_France"), "imprimer", PAR_IMAGE),
      doc("Des stations de ski en France", COMMONS, commons("Category:Ski_resorts_in_France"), "imprimer", PAR_IMAGE),
    ],
  },
};

/** Le texte des documents de chaque séance d'une démarche, sur `seances` séances ; vide sans documents. */
export function documentsDesSeances(demarcheId: string, seances: number): string[] {
  const parSeance = DOCUMENTS_HG[demarcheId] ?? {};
  return Array.from({ length: seances }, (_, s) => texteDesDocuments(parSeance[s] ?? []));
}
