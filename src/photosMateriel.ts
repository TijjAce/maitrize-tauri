// ── Les photographies du matériel de la classe ─────────────────────────────
//
// Une photo par matériel réel que les programmes nomment : on reconnaît
// l'objet d'un coup d'œil, avant de lire ce qu'il permet. Elles viennent de
// Wikimedia Commons, sous une licence libre (CC0, CC BY, CC BY-SA), sans
// personne de reconnaissable. Réduites à 600 px, elles sont dans
// l'application (src/assets/materiel) ; leur crédit s'affiche avec elles,
// comme la licence le demande. La monnaie, le circuit électrique, le globe
// et le calendrier n'en ont pas encore : ce qu'on a trouvé ne montrait pas des
// euros, était un dessin, un globe découpé aux noms allemands, des mois en
// anglais.

export interface PhotoMateriel {
  /** L'identifiant du matériel (voir materielDeClasse.ts), qui est aussi le nom du fichier, sans « .jpg ». */
  id: string;
  /** Ce que montre la photo. */
  titre: string;
  auteur: string;
  licence: string;
  /** Sa page sur Wikimedia Commons : l'original, son auteur, sa licence. */
  page: string;
}

export const PHOTOS_MATERIEL: PhotoMateriel[] = [
  { id: "numeration", titre: "Cubes plastiques emboîtables (« Multilink ») utilisés pour l'enseignement des mathématiques.", auteur: "Annielogue", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Multilink_cubes.JPG" },
  { id: "balance", titre: "Balance de Roberval ancienne à deux plateaux, avec ses poids, sur fond blanc.", auteur: "Nikodem Nijaki", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Balance_scale_IMGP9755.jpg" },
  { id: "massesReference", titre: "Paquet d'un kilogramme de riz (sachet transparent de riz à risotto du Tessin) : masse de référence de 1 kg.", auteur: "Schofför", licence: "CC BY-SA 2.5 CH",
    page: "https://commons.wikimedia.org/wiki/File:Riso_Ticinese_Verpackung_s.JPG" },
  { id: "longueurs", titre: "Réglettes Cuisenaire de longueurs croissantes disposées en escalier : comparer et ranger des longueurs.", auteur: "Annielogue", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Cuisenaire_staircase.JPG" },
  { id: "regles", titre: "Cinq règles graduées (plastique, métal, bois) à double graduation centimètres et pouces.", auteur: "Estabiano", licence: "CC0",
    page: "https://commons.wikimedia.org/wiki/File:School_Rulers.jpg" },
  { id: "recipients", titre: "Verre doseur en plastique transparent à graduation métrique.", auteur: "Frank C. Müller, Baden-Baden", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Messbecher_(fcm).jpg" },
  { id: "croissance", titre: "Pèse-personne à leviers et toise en bois avec ruban métrique d'un cabinet médical scolaire : mesure du poids et de la taille.", auteur: "María Laura Suriano, Museo y Archivo de la Educación « Escuela de la Barranca »", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Balanza_y_estadi%C3%B3metro_o_tall%C3%ADmetro_de_Consultorio_M%C3%A9dico_escolar_-_(M.A.B.H_Escuela_de_la_Barranca).jpg" },
  { id: "solides", titre: "Collection de solides géométriques en bois (cube, parallélépipède, cylindre, cône, sphère, pyramides…) dans son coffret, édition Vallardi (1963).", auteur: "MuMiCaserta (Museo Michelangelo, Caserta)", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Solidi_geometrici.jpg" },
  { id: "construction", titre: "Briques de construction en bois, jouet des années 1950.", auteur: "Hannes Grobe", licence: "CC BY 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Building-bricks_hg.jpg" },
  { id: "instrumentsTrace", titre: "Contenu d'une boîte d'instruments de géométrie (« Oxford Set of Mathematical Instruments ») : instruments de tracé.", auteur: "Sealman", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Oxford_Set_of_Mathematical_Instruments.jpg" },
  { id: "robot", titre: "Robot de sol programmable Bee-Bot utilisé en école maternelle (robotique éducative).", auteur: "María Laura Martín Gascón", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Bee_-_Bot.jpg" },
  { id: "horloge", titre: "Horloge murale à quartz à aiguilles : cadran blanc, chiffres noirs, trotteuse.", auteur: "Slcreza", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Casion_Clock.jpg" },
  { id: "durees", titre: "Sablier (horloge à sable).", auteur: "Thamizhpparithi Maari", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Sand_Clock.jpg" },
  { id: "thermometre", titre: "Thermomètre à liquide en verre, graduations en °C et °F, indiquant 3 °C (37 °F).", auteur: "Nino Barbieri", licence: "CC BY 2.5",
    page: "https://commons.wikimedia.org/wiki/File:-_Thermometer_-.jpg" },
  { id: "eau", titre: "Glaçons flottant dans de l'eau, dans un verre transparent.", auteur: "Cleiton Andrade", licence: "CC0",
    page: "https://commons.wikimedia.org/wiki/File:Ice_cubes_on_water.jpg" },
  { id: "vivant", titre: "Loupe tenue au-dessus d'une plante pour l'observer.", auteur: "Joan Sebastián Araújo Arena", licence: "CC BY-SA 2.0",
    page: "https://commons.wikimedia.org/wiki/File:GEDC5935_(11953561026).jpg" },
  { id: "corps", titre: "Modèle réduit de squelette humain articulé, en bronze (Europe, XVIIIe siècle, 15 cm), probablement conçu pour enseigner l'anatomie.", auteur: "Wellcome Collection", licence: "CC BY 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Model_of_a_skeleton,_Europe,_1701-1800_Wellcome_L0057348.jpg" },
  { id: "aimants", titre: "Aimant en fer à cheval couvert de limaille de fer.", auteur: "Maciej J. Mrowinski", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Horseshoe_magnet_metal_shavings.jpg" },
  { id: "objetsTechniques", titre: "Mouvement d'horloge à quartz démonté : rouages et pièces visibles.", auteur: "Medvedev", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Quartz_Clockwork_(disassembled).jpg" },
  { id: "cartes", titre: "Planisphère affiché au mur d'une salle de géographie, avec des cartes roulées posées devant.", auteur: "Ruthie (rrruthie)", licence: "CC0",
    page: "https://commons.wikimedia.org/wiki/File:Geography_class_(Unsplash).jpg" },
  { id: "musique", titre: "Détail d'un instrumentarium Orff-Schulwerk : instruments de percussion pour l'éducation musicale.", auteur: "Société Studio 49", licence: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:Intrumentarium_Orff-Schulwerkde_la_soci%C3%A9t%C3%A9_Studio_49.jpg" },
  { id: "matieres", titre: "Objets modelés en pâte à modeler (Play-Doh).", auteur: "Nevit Dilmen", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Play_dough_04799.jpg" },
  { id: "motricite", titre: "Équipement varié d'éducation physique, avec de nombreux ballons (lycée de Calhan, Colorado).", auteur: "David Shankbone", licence: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File:Calhan_Colorado_High_School_Physical_Education_equipment_by_David_Shankbone.jpg" },
];

const ADRESSES = import.meta.glob<string>("./assets/materiel/*.jpg", { eager: true, query: "?url", import: "default" });

/** La photo d'un matériel, avec l'adresse de son fichier ; rien s'il n'en a pas. */
export function photoDuMateriel(id: string): (PhotoMateriel & { adresse: string }) | null {
  const p = PHOTOS_MATERIEL.find((x) => x.id === id);
  const adresse = ADRESSES[`./assets/materiel/${id}.jpg`];
  return p && adresse ? { ...p, adresse } : null;
}

/** Le crédit, sous la photo : l'auteur, la licence, d'où elle vient. */
export const creditMateriel = (p: PhotoMateriel): string =>
  `Photo : ${p.auteur}, ${p.licence === "CC0" || /domaine public|public domain/i.test(p.licence) ? "domaine public" : `licence ${p.licence}`}, Wikimedia Commons.`;
