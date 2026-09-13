"""Ressources des cycles 1, 2 et 3 (onglet Ressources → Documents Éduscol).

Reconstruites le 13 septembre 2026 à partir des pages officielles :
« Enseigner au cycle 1 / 2 / 3 » d'éduscol, les pages de ressources
d'accompagnement de chaque discipline et le Bulletin officiel. Chaque
document garde le titre sous lequel éduscol le présente.

L'ancienne liste pointait souvent vers un autre document que son titre
(« Repères annuels — EPS cycle 2 » ouvrait les attendus de français de CM1) :
d'où une reconstruction plutôt qu'une retouche.

Les autres rubriques gardent leurs documents, sauf ceux qui ne correspondent
pas à leur titre (RETIRES) ; quelques titres vagues sont précisés (RETITRES).

Usage : python3 outils/ressources/cycles.py  (réécrit src/data/eduscol.json)
"""
import json
from pathlib import Path

E = "https://eduscol.education.gouv.fr"
D = E + "/sites/default/files/document/"
G = "https://www.education.gouv.fr/sites/default/files/document/"

# Programmes (adresses vérifiées, voir src/data/programmesOfficiels.ts)
PROG_C1_CONSOLIDE = D + "programme-cycle-1-consolide-127565.pdf"
PROG_C1_2026 = G + "annexe-programme-d-enseignement-de-l-ecole-maternelle-cycle-1-516107.pdf"
PROG_C1_LANGAGE = G + "Annexe%201%20%E2%80%93%20Programme%20d%E2%80%98enseignement%20pour%20le%20d%C3%A9veloppement%20et%20la%20structuration%20du%20langage%20oral%20et%20%C3%A9crit%20du%20cycle%201-403812.pdf"
PROG_C1_MATHS = G + "Annexe%202%20%E2%80%93%20Programme%20d%E2%80%99enseignement%20pour%20l%E2%80%99acquisition%20des%20premiers%20outils%20math%C3%A9matiques%20du%20cycle%201-403815.pdf"
EVAR_MATERNELLE = G + "Programme%20d%E2%80%99%C3%A9ducation%20%C3%A0%20la%20vie%20affective%20et%20relationnelle%20%C3%A0%20l%E2%80%99%C3%A9cole%20maternelle-405258.pdf"
EVAR_ELEMENTAIRE = G + "Programme%20d%E2%80%99%C3%A9ducation%20%C3%A0%20la%20vie%20affective%20et%20relationnelle%20%C3%A0%20l%E2%80%99%C3%A9cole%20%C3%A9l%C3%A9mentaire-405261.pdf"
EMC = G + "Annexe%20%E2%80%94%20Programme%20d%E2%80%99enseignement%20moral%20et%20civique%20du%20cours%20pr%C3%A9paratoire%20%C3%A0%20la%20classe%20terminale%20des%20voies%20g%C3%A9n%C3%A9rale%2C%20technologique%20et%20professionnelle%20et%20des%20classes%20pr%C3%A9parant%20au%20CAP-402159.pdf"
PROG_C2_2020 = "https://cache.media.education.gouv.fr/file/31/88/5/ensel714_annexe1_1312885.pdf"
PROG_C3_2023 = D + "programme-d-enseignement-du-cycle-3-2023-100806.pdf"

GUIDE_VOCABULAIRE_MAT = D + "guide-pour-enseigner-le-vocabulaire-l-ecole-maternelle-67695.pdf"
GUIDE_LECTURE_MAT = D + "guide-pour-preparer-l-apprentissage-de-la-lecture-et-de-l-ecriture-l-ecole-maternelle-67698.pdf"
GUIDE_NOMBRE_MAT = D + "guide-pour-enseigner-la-construction-du-nombre-l-ecole-maternelle-100773.pdf"
GUIDE_GRAMMAIRE = D + "guide-la-grammaire-du-francais-du-cp-la-6e-97251.pdf"
GUIDE_TERMINOLOGIE = D + "guide-la-grammaire-du-francais-terminologie-grammaticale-67998.pdf"
GUIDE_LV = D + "guide-pour-l-enseignement-des-langues-vivantes-l-ecole-67713.pdf"
VADEMECUM_SCIENCES = D + "vademecum-enseigner-les-sciences-et-la-technologie-l-ecole-primaire-100224.pdf"
VADEMECUM_PATRIMOINE = D + "vademecum-connaitre-le-patrimoine-de-proximite-67707.pdf"
VADEMECUM_CHORALE = D + "vademecum-la-chorale-l-ecole-au-college-et-au-lycee-67710.pdf"
EVAR_REPERES = D + "reperes-mise-en-oeuvre-du-programme-evarpdf-112860.pdf"
EVAR_FAQ = D + "evar-et-evars-foire-aux-questions-octobre-2025pdf-111222.pdf"
EPS_ELEMENTAIRE = D + "exemples-miseenoeuvre-eps-elementaire-127511.pdf"
GUIDE_BEP_EVAL = D + "guide-accompagnement-des-eleves-besoins-particuliers-2026-128821.pdf"
EVAL_DIAPORAMA = D + "educationnationalereperes26diaporama-de-presentation-128812.pdf"
EVAL_ACCES_ENSEIGNANT = D + "educationnationalereperes26guideportailenseignant-128818.pdf"
CARTO = D + "fichehgcartoc2c32026-127502.pdf"

P_EVAR = E + "/5916/mettre-en-oeuvre-le-programme-evarevars"
P_ARTS_PLASTIQUES = E + "/4731/ressources-d-accompagnement-des-enseignements-en-arts-plastiques-aux-cycles-2-et-3"
P_MUSIQUE = E + "/4737/ressources-d-accompagnement-des-enseignements-en-education-musicale-aux-cycles-2-et-3"
P_LV = E + "/7058/ressources-d-accompagnement-pour-les-langues-vivantes-etrangeres-et-regionales-l-ecole-elementaire"
P_EMC = E + "/7064/ressources-d-accompagnement-pour-l-enseignement-moral-et-civique-l-ecole-elementaire"
P_ETUDE_LANGUE = E + "/4809/ressources-d-accompagnement-du-programme-de-francais-aux-cycles-2-et-3-etude-de-la-langue"
P_GUIDES = E + "/6681/les-guides-fondamentaux-pour-l-enseignement"

RENTREE = "en vigueur à la rentrée 2026"
PAGE = "Page éduscol : toutes les ressources"

CYCLE_1 = [
    ("Programmes & références", "Programme de l'école maternelle — version consolidée", PROG_C1_CONSOLIDE,
     "D'après le BO n° 41 du 31 octobre 2024 et le BO n° 19 du 7 mai 2026 · " + RENTREE),
    ("Programmes & références", "Programme d'enseignement de l'école maternelle (annexe du BO)", PROG_C1_2026,
     "BO n° 19 du 7 mai 2026 · arrêté du 16 avril 2026 · " + RENTREE),
    ("Programmes & références", "Programme — Développement et structuration du langage oral et écrit", PROG_C1_LANGAGE,
     "BO n° 41 du 31 octobre 2024 · repris dans le programme consolidé"),
    ("Programmes & références", "Programme — Acquisition des premiers outils mathématiques", PROG_C1_MATHS,
     "BO n° 41 du 31 octobre 2024 · repris dans le programme consolidé"),
    ("Programmes & références", "Programme d'éducation à la vie affective et relationnelle à l'école maternelle", EVAR_MATERNELLE,
     "BO n° 6 du 6 février 2025"),
    ("Programmes & références", "Enseigner au cycle 1", E + "/4341/enseigner-au-cycle-1", "Page éduscol : programmes et ressources du cycle"),
    ("Programmes & références", "Guides fondamentaux pour l'enseignement", P_GUIDES, "Page éduscol : la collection complète"),

    ("Langage", "Langage oral et écrit avant 4 ans — livret d'accompagnement", D + "2025livretaccompagnementfrancaisavant4ansv3pdf-111942.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Langage", "Langage oral et écrit à partir de 4 ans — livret d'accompagnement", D + "2025livretaccompagnementfraapartirde4anspdf-122680.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Langage", "Langage oral et écrit à partir de 5 ans — livret d'accompagnement", D + "2025livretaccompagnementfraapartirde5anspdf-123043.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Langage", "Guide « Pour enseigner le vocabulaire à l'école maternelle »", GUIDE_VOCABULAIRE_MAT, "Guide fondamental"),
    ("Langage", "Guide « Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle »", GUIDE_LECTURE_MAT, "Guide fondamental"),
    ("Langage", "Guide pour l'éveil à la diversité linguistique en maternelle", D + "guide-pour-l-eveil-la-diversite-linguistique-en-maternelle-100770.pdf", "Éduscol"),
    ("Langage", "Enrichir le vocabulaire — Rencontrer, comprendre et mémoriser le sens des mots", D + "decouvrircomprendrelesensdesmotsaucycle-1pdf-102675.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Enrichir le vocabulaire — Catégoriser : des objets aux mots", D + "fichevocabulairecategoriserau-cycle-1pdf-102678.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Enrichir le vocabulaire — Acquérir un vocabulaire précis, spécifique et adapté", D + "acquerir-et-developper-le-vocabulaire-specifique-au-cycle-1pdf-102672.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Syntaxe — Du mot-phrase à la phrase", D + "acquerir-et-developper-la-syntaxecomplexifier-ses-phrases-au-cycle-1pdf-102663.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Syntaxe — S'approprier les premières structures syntaxiques", D + "sappropier-et-comprendre-les-1eres-structures-synta-au-cycle-1pdf-102681.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Syntaxe — Diversifier l'emploi des pronoms", D + "acquerir-et-developper-la-syntaxe-diversifier-lemploi-des-pronoms-au-cycle-1pdf-102660.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Syntaxe — Types et formes de phrases", D + "acquerir-et-developper-la-syntaxecomprendre-et-employer-des-types-phrases-au-cycle-1pdf-102666.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Syntaxe — Construire le sens des temps", D + "acquerir-et-developper-la-syntaxesystemetemps-au-cycle-1pdf-102669.pdf", "Éduscol · ressource d'accompagnement"),
    ("Langage", "Le développement et la structuration du langage oral et écrit au cycle 1", E + "/4698/le-developpement-et-la-structuration-du-langage-oral-et-ecrit-au-cycle-1", PAGE),

    ("Mathématiques", "Mathématiques avant 4 ans — livret d'accompagnement", D + "2025livretaccompagnementmathavant4ans-111939.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Mathématiques", "Mathématiques à partir de 4 ans — livret d'accompagnement", D + "2025livretaccompagnementmathapartirde4anspdf-112368.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Mathématiques", "Mathématiques à partir de 5 ans — livret d'accompagnement", D + "2025livretaccompagnementmathapartirde5anspdf-123112.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("Mathématiques", "Guide « Pour enseigner la construction du nombre à l'école maternelle »", GUIDE_NOMBRE_MAT, "Guide fondamental"),
    ("Mathématiques", "Utiliser le nombre pour comparer deux quantités", D + "construire-le-nombre-pour-exprimer-les-quantites-1pdf-99096.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Utiliser le nombre pour mémoriser des quantités", D + "le-nombre-pour-memoriser-quantites-1pdf-99099.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Reconnaître et réaliser une collection de 1 à 10", D + "stabiliserconnaissancepetitsnombresrealiser-1pdf-99120.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Décomposer et composer les nombres jusqu'à dix", D + "stabiliser-connaissances-decomposer-1pdf-99117.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Utiliser le nombre pour désigner un rang, une position", D + "rang-et-position-1pdf-99105.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Résoudre des problèmes d'ajout ou de retrait", D + "resoudre-des-problemes-ajout-retrait-cycle1pdf-99108.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Résoudre des problèmes de composition de deux collections", D + "resoudre-des-problemes-composition-cycle1pdf-99111.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Résoudre des problèmes de produit et de partage", D + "resoudre-des-problemes-produitpartage-cycle1pdf-99114.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Construire des premiers savoirs et savoir-faire avec rigueur", D + "premiers-savoirs-et-savoir-faire-1pdf-99102.pdf", "Éduscol · ressource d'accompagnement"),
    ("Mathématiques", "Acquérir les premiers outils mathématiques au cycle 1", E + "/4674/acquerir-les-premiers-outils-mathematiques-cycle-1", PAGE),

    ("Activités physiques", "Créer une dynamique d'apprentissage", D + "ressc1agircreer-dynamique456441pdf-74130.pdf", "Éduscol · ressource d'accompagnement"),
    ("Activités physiques", "Agir dans l'espace, dans la durée et sur les objets", D + "ressc1agirobj1456443pdf-74133.pdf", "Éduscol · ressource d'accompagnement"),
    ("Activités physiques", "Adapter ses équilibres et ses déplacements à des environnements variés", D + "ressc1agirobj2456445pdf-74136.pdf", "Éduscol · ressource d'accompagnement"),
    ("Activités physiques", "Communiquer avec les autres à travers des actions à visée expressive ou artistique", D + "ressc1agirobj3456447pdf-74139.pdf", "Éduscol · ressource d'accompagnement"),
    ("Activités physiques", "Collaborer, coopérer, s'opposer", D + "ressc1agirobj4456449pdf-74142.pdf", "Éduscol · ressource d'accompagnement"),
    ("Activités physiques", "Agir, s'exprimer, comprendre à travers l'activité physique au cycle 1", E + "/4680/agir-s-exprimer-comprendre-travers-l-activite-physique-au-cycle-1", PAGE),

    ("Explorer le monde", "Vademecum « Enseigner les sciences et la technologie à l'école primaire »", VADEMECUM_SCIENCES, "Éduscol · vademecum"),
    ("Explorer le monde", "Connaître le corps humain", D + "ra23c1corps-humainpdf-100242.pdf", "Éduscol · ressource d'accompagnement"),
    ("Explorer le monde", "Découvrir le monde du vivant, de la matière et des objets au cycle 1", E + "/7052/decouvrir-le-monde-du-vivant-de-la-matiere-et-des-objets-au-cycle-1", PAGE),
    ("Explorer le monde", "Se repérer dans l'espace — À propos d'architecture", D + "ra21c1c1sereperertempsespaceexplorerarchitecturepdf-72279.pdf", "Éduscol · ressource d'accompagnement"),
    ("Explorer le monde", "Se repérer dans le temps et l'espace au cycle 1", E + "/4701/se-reperer-dans-le-temps-et-l-espace-au-cycle-1", PAGE),

    ("Jouer et apprendre", "Le cadre général — Jouer et apprendre", D + "ressc1jouerjouerapprendre458303pdf-74220.pdf", "Éduscol · ressource d'accompagnement"),
    ("Jouer et apprendre", "Les jeux d'exploration", D + "ressc1jouerexploration474564pdf-74223.pdf", "Éduscol · ressource d'accompagnement"),
    ("Jouer et apprendre", "Les jeux symboliques", D + "ressc1jouersymbolique474560pdf-74226.pdf", "Éduscol · ressource d'accompagnement"),
    ("Jouer et apprendre", "Les jeux de construction", D + "ressc1jouerconstruction474562pdf-74229.pdf", "Éduscol · ressource d'accompagnement"),
    ("Jouer et apprendre", "Les jeux à règles", D + "ressc1jouerregles459146pdf-74232.pdf", "Éduscol · ressource d'accompagnement"),
    ("Jouer et apprendre", "Jouer et apprendre au cycle 1", E + "/4689/jouer-et-apprendre-au-cycle-1", PAGE),

    ("Suivi et évaluation", "Suivi et évaluation des apprentissages — guide de présentation des ressources", D + "ressc1evalpresentationpdf-69729.pdf", "Éduscol"),
    ("Suivi et évaluation", "Suivi et évaluation des apprentissages — points de vigilance", D + "ressc1evalpointsvigilancepdf-69735.pdf", "Éduscol"),
    ("Suivi et évaluation", "Suivi et évaluation des apprentissages des élèves à l'école maternelle", E + "/4671/suivi-et-evaluation-des-apprentissages-des-eleves-l-ecole-maternelle", "Page éduscol : carnet de suivi, synthèse des acquis de GS"),

    ("EVAR", "EVAR avant 4 ans — livret d'accompagnement", D + "2025livretaccompagnementevaravant4anspdf-112857.pdf", "Éduscol · livret d'accompagnement du programme"),
    ("EVAR", "Repères pour la mise en œuvre du programme dans le premier degré", EVAR_REPERES, "Éduscol"),
    ("EVAR", "Éduquer à la vie affective et relationnelle à l'école maternelle — dépliant", D + "2025evar4pagesa5maternellepdf-113340.pdf", "Éduscol · 4 pages A5"),
    ("EVAR", "EVAR et EVARS — foire aux questions", EVAR_FAQ, "Éduscol · octobre 2025"),
    ("EVAR", "Mettre en œuvre le programme EVAR/EVARS", P_EVAR, PAGE),
]

CYCLE_2 = [
    ("Programmes & références", "Français — programme du cycle 2", G + "Annexe%203%20%E2%80%93%20Programme%20de%20fran%C3%A7ais%20du%20cycle%202-403818.pdf",
     "BO n° 41 du 31 octobre 2024 · CP, CE1, CE2"),
    ("Programmes & références", "Mathématiques — programme du cycle 2", G + "Annexe%204%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20du%20cycle%202-403821.pdf",
     "BO n° 41 du 31 octobre 2024 · CP, CE1, CE2"),
    ("Programmes & références", "Sciences et technologie — programme du cycle 2", G + "annexe-1-programme-de-sciences-et-technologie-du-cycle-2-519020.pdf",
     "BO n° 24 du 11 juin 2026 · nouveau en CP à la rentrée 2026, en CE1-CE2 en 2027"),
    ("Programmes & références", "Histoire-géographie — programme du cycle 2", G + "annexe-3-programme-d-histoire-geographie-cycle-2-516776.pdf",
     "BO n° 22 du 28 mai 2026 · nouveau en CP à la rentrée 2026, en CE1-CE2 en 2027"),
    ("Programmes & références", "Éducation physique et sportive — programme du cycle 2", G + "annexe-1-programme-d-education-physique-et-sportive-cycle-2-516770.pdf",
     "BO n° 22 du 28 mai 2026 · nouveau en CP à la rentrée 2026, en CE1-CE2 en 2027"),
    ("Programmes & références", "Langues vivantes étrangères et régionales — programme du cycle 2", G + "Annexe%201%20%E2%80%93%20Programme%20de%20langues%20vivantes%20%C3%A9trang%C3%A8res%20et%20r%C3%A9gionales%20pour%20le%20cycle%202%20-481187.pdf",
     "BO n° 12 du 19 mars 2026 · nouveau en CP à la rentrée 2026, en CE1-CE2 en 2027"),
    ("Programmes & références", "Enseignement moral et civique — programme du CP à la terminale", EMC,
     "BO n° 24 du 13 juin 2024 · nouveau en CE2 à la rentrée 2026"),
    ("Programmes & références", "Éducation à la vie affective et relationnelle — programme de l'école élémentaire", EVAR_ELEMENTAIRE,
     "BO n° 6 du 6 février 2025"),
    ("Programmes & références", "Programme du cycle 2 de 2020 — arts ; en CE1-CE2 : EPS, questionner le monde, langues vivantes", PROG_C2_2020,
     "BO n° 31 du 30 juillet 2020 · encore en vigueur pour ces enseignements"),
    ("Programmes & références", "Enseigner au cycle 2", E + "/4347/enseigner-au-cycle-2", "Page éduscol : tableau des programmes par classe"),
    ("Programmes & références", "Guides fondamentaux pour l'enseignement", P_GUIDES, "Page éduscol : la collection complète"),

    ("Français", "Français CP — livret d'accompagnement du programme", D + "2025livretaccompagnementfrancaiscp-112431_0.pdf", "Éduscol · livret d'accompagnement"),
    ("Français", "Français CE1 — livret d'accompagnement du programme", D + "2026livretaccompagnementfrace1pdf-123917.pdf", "Éduscol · livret d'accompagnement"),
    ("Français", "Français CE2 — livret d'accompagnement du programme", D + "livret-accompagnement-programme-francais-ce2-127643.pdf", "Éduscol · livret d'accompagnement"),
    ("Français", "Guide « Pour enseigner la lecture et l'écriture au CP »", D + "guide-pour-enseigner-la-lecture-et-l-ecriture-au-cp-67854.pdf", "Guide fondamental"),
    ("Français", "Guide « Pour enseigner la lecture et l'écriture au CE1 »", D + "guide-pour-enseigner-la-lecture-et-l-ecriture-au-ce1-67857.pdf", "Guide fondamental"),
    ("Français", "Guide « La grammaire du français du CP à la 6e »", GUIDE_GRAMMAIRE, "Guide fondamental"),
    ("Français", "Guide « La grammaire du français — Terminologie grammaticale »", GUIDE_TERMINOLOGIE, "Guide fondamental"),
    ("Français", "Ressources d'accompagnement du programme de français au cycle 2", E + "/4740/ressources-d-accompagnement-du-programme-de-francais-au-cycle-2", PAGE),
    ("Français", "Étude de la langue aux cycles 2 et 3", P_ETUDE_LANGUE, PAGE),

    ("Mathématiques", "Mathématiques CP — livret d'accompagnement du programme", D + "2025livretaccompagnementmathcppdf-111984.pdf", "Éduscol · livret d'accompagnement"),
    ("Mathématiques", "Mathématiques CE1 — livret d'accompagnement du programme", D + "2025livretaccompagnementmathce1pdf-116325.pdf", "Éduscol · livret d'accompagnement"),
    ("Mathématiques", "Mathématiques CE2 — livret d'accompagnement du programme", D + "2025livretaccompagnementmathce2pdf-122974.pdf", "Éduscol · livret d'accompagnement"),
    ("Mathématiques", "Guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP »", D + "guide-pour-enseigner-les-nombres-le-calcul-et-la-resolution-de-problemes-au-cp-68664.pdf", "Guide fondamental"),
    ("Mathématiques", "Ressources d'accompagnement du programme de mathématiques au cycle 2", E + "/4746/ressources-d-accompagnement-du-programme-de-mathematiques-au-cycle-2", PAGE),

    ("Sciences", "Vademecum « Enseigner les sciences et la technologie à l'école primaire »", VADEMECUM_SCIENCES, "Éduscol · vademecum"),
    ("Sciences", "Progression des attendus de fin de cycle 2 — la matière", D + "ra23c2progressionintercyclesmatierepdf-100515.pdf", "Éduscol · proposition de progression"),
    ("Sciences", "Progression des attendus de fin de cycle 2 — le vivant", D + "ra23c2progressionintercyclesvivantpdf-100509.pdf", "Éduscol · proposition de progression"),
    ("Sciences", "Progression des attendus de fin de cycle 2 — les objets techniques", D + "ra23c2progressionintercyclesobjetstechniquespdf-100512.pdf", "Éduscol · proposition de progression"),
    ("Sciences", "Le circuit électrique", D + "ra23c2circuitelectriquepdf-100245.pdf", "Éduscol · ressource d'accompagnement"),
    ("Sciences", "Les changements d'états de l'eau", D + "ra23c2les-changements-d-etats-de-l-eaupdf-100248.pdf", "Éduscol · ressource d'accompagnement"),
    ("Sciences", "Ressources d'accompagnement en sciences et technologie au cycle 2", E + "/7055/ressources-d-accompagnement-pour-questionner-le-monde-du-vivant-de-la-matiere-et-des-objets-sciences-et-technologie-au-cycle-2", PAGE),

    ("Histoire-Géographie", "Ressources cartographiques des cycles 2 et 3 — fiche de présentation", CARTO, "Éduscol · 2026"),
    ("Histoire-Géographie", "Planisphère pour la classe (avec pays)", D + "planisphere-equalearth-jbbouron-6feuilles-127484.pdf", "Éduscol · 2026"),
    ("Histoire-Géographie", "Planisphère pour le cahier des élèves — CP", D + "cp-th2-planisphere-eleve-127487.pdf", "Éduscol · 2026"),
    ("Histoire-Géographie", "Planisphère pour le cahier des élèves — CE1", D + "ce1-planisphere-eleve-nb-129316.pdf", "Éduscol · 2026"),
    ("Histoire-Géographie", "Ressources d'accompagnement en histoire-géographie au cycle 2", E + "/4770/ressources-d-accompagnement-pour-questionner-l-espace-et-le-temps-histoire-geographie-au-cycle-2", PAGE),

    ("EPS", "Exemples pour la mise en œuvre du programme d'EPS au cycle 2", D + "exemples-mise-en-oeuvre-programme-eps-cycle2-127346.pdf", "Éduscol · 2026"),
    ("EPS", "Exemples pour la mise en œuvre du programme d'EPS à l'école élémentaire", EPS_ELEMENTAIRE, "Éduscol · 2026"),
    ("EPS", "Ressources d'accompagnement pour l'EPS au cycle 2", E + "/4725/ressources-d-accompagnement-pour-l-education-physique-et-sportive-au-cycle-2", PAGE),

    ("Langues vivantes", "Exemples pour la mise en œuvre du programme de langues vivantes au cycle 2", D + "exemples-mise-en-oeuvre-c2-lver-126512.pdf", "Éduscol · 2026"),
    ("Langues vivantes", "Guide pour l'enseignement des langues vivantes à l'école", GUIDE_LV, "Guide"),
    ("Langues vivantes", "Ressources d'accompagnement pour les langues vivantes à l'école élémentaire", P_LV, PAGE),

    ("EMC", "Enseignement moral et civique CP — livret d'accompagnement", D + "2025livretaccompagnementemccp-111693.pdf", "Éduscol · livret d'accompagnement"),
    ("EMC", "Enseignement moral et civique CE1 — livret d'accompagnement", D + "2026livretaccompagnementemcce1-127535.pdf", "Éduscol · livret d'accompagnement"),
    ("EMC", "Ressources d'accompagnement pour l'EMC à l'école élémentaire", P_EMC, PAGE),

    ("EVAR", "EVAR CP — livret d'accompagnement", D + "2026livretaccompagnementevarcp-126299.pdf", "Éduscol · livret d'accompagnement"),
    ("EVAR", "EVAR CE1 — livret d'accompagnement", D + "2026livretaccompagnementevarce1-127397.pdf", "Éduscol · livret d'accompagnement"),
    ("EVAR", "EVAR CE2 — livret d'accompagnement", D + "2026livretaccompagnementevarce2-128761.pdf", "Éduscol · livret d'accompagnement"),
    ("EVAR", "Repères pour la mise en œuvre du programme dans le premier degré", EVAR_REPERES, "Éduscol"),
    ("EVAR", "Éduquer à la vie affective et relationnelle du CP au CE2 — dépliant", D + "2025evar4pagesa5cpce2pdf-113343.pdf", "Éduscol · 4 pages A5"),
    ("EVAR", "EVAR et EVARS — foire aux questions", EVAR_FAQ, "Éduscol · octobre 2025"),
    ("EVAR", "Mettre en œuvre le programme EVAR/EVARS", P_EVAR, PAGE),

    ("Arts", "Arts plastiques — enjeux des trois questions au programme du cycle 2", D + "ra16c2apenjeuxtroisquestions739771pdf-74727.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Arts plastiques — la dynamique des compétences", D + "3rac2c3dynamique-competences-arts-plastiques570435pdf-74724.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "L'évaluation en arts plastiques au cycle 2", D + "ev16c2earteval-ap-c2-dm613818pdf-74763.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Éducation musicale — le chant : principes de mise en œuvre", D + "ra16c2c3emchantprincipesmiseenoeuvre743233pdf-74925.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Éducation musicale — apprendre un chant", D + "ra16c2c3emchantapprendre743235pdf-74931.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Éducation musicale — l'écoute : principes de mise en œuvre", D + "ra16c2c3eart2ecouteprincipes664603pdf-74937.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "L'évaluation en éducation musicale", D + "ra16c2c3educmusicaleevalv2668674pdf-74922.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Vademecum « Connaître le patrimoine de proximité »", VADEMECUM_PATRIMOINE, "Éduscol · vademecum"),
    ("Arts", "Vademecum « La chorale à l'école, au collège et au lycée »", VADEMECUM_CHORALE, "Éduscol · vademecum"),
    ("Arts", "Ressources d'accompagnement en arts plastiques aux cycles 2 et 3", P_ARTS_PLASTIQUES, PAGE),
    ("Arts", "Ressources d'accompagnement en éducation musicale aux cycles 2 et 3", P_MUSIQUE, PAGE),

    ("Évaluations", "Évaluations de début d'année 2026 — diaporama de présentation", EVAL_DIAPORAMA, "Repères 2026 · CP, CE1, CE2, CM1"),
    ("Évaluations", "Début de CP 2026 — guide pour le professeur", D + "26cpp-128800.pdf", "Repères 2026"),
    ("Évaluations", "Début de CE1 2026 — guide pour le professeur", D + "26ce1p-128848.pdf", "Repères 2026"),
    ("Évaluations", "Début de CE2 2026 — guide pour le professeur", D + "26ce2p-128881.pdf", "Repères 2026"),
    ("Évaluations", "Guide pour l'accompagnement des élèves à besoins éducatifs particuliers", GUIDE_BEP_EVAL, "Repères 2026 · adaptations des passations"),
    ("Évaluations", "Guide pour l'accès enseignant au portail", EVAL_ACCES_ENSEIGNANT, "Repères 2026"),
    ("Évaluations", "Évaluations des acquis et besoins des élèves au CE2", E + "/5283/evaluations-des-acquis-et-besoins-des-eleves-au-ce2", "Page éduscol : cahiers, guides adaptés, fiches d'intervention"),
    ("Évaluations", "Évaluations des acquis et besoins des élèves au CP", E + "/5274/evaluations-des-acquis-et-besoins-des-eleves-au-cp", "Page éduscol : cahiers, guides adaptés"),
    ("Évaluations", "Évaluations des acquis et besoins des élèves au CE1", E + "/5289/evaluations-des-acquis-et-besoins-des-eleves-au-ce1", "Page éduscol : cahiers, guides adaptés"),
]

CYCLE_3 = [
    ("Programmes & références", "Français — programme du cycle 3", "https://www.education.gouv.fr/sites/default/files/programme-de-fran-ais-pour-le-cycle-3-439824.pdf",
     "BO n° 16 du 17 avril 2025 · CM1, et CM2 à la rentrée 2026"),
    ("Programmes & références", "Mathématiques — programme du cycle 3", "https://www.education.gouv.fr/sites/default/files/programme-de-math-matiques-pour-le-cycle-3-439827.pdf",
     "BO n° 16 du 17 avril 2025 · CM1, et CM2 à la rentrée 2026"),
    ("Programmes & références", "Sciences et technologie — programme du cycle 3", G + "annexe-2-programme-de-sciences-et-technologie-du-cycle-3-519023.pdf",
     "BO n° 24 du 11 juin 2026 · nouveau en CM1 à la rentrée 2026, en CM2 en 2027"),
    ("Programmes & références", "Histoire-géographie — programme du cycle 3", G + "annexe-4-programme-d-histoire-geographie-cycle-3-516779.pdf",
     "BO n° 22 du 28 mai 2026 · nouveau en CM1 à la rentrée 2026, en CM2 en 2027"),
    ("Programmes & références", "Éducation physique et sportive — programme du cycle 3", G + "annexe-2-programme-d-education-physique-et-sportive-cycle-3-516773.pdf",
     "BO n° 22 du 28 mai 2026 · nouveau en CM1 à la rentrée 2026, en CM2 en 2027"),
    ("Programmes & références", "Langues vivantes étrangères et régionales — programme du cours moyen", G + "Annexe%202%20%E2%80%93%20Programme%20de%20langues%20vivantes%20%C3%A9trang%C3%A8res%20et%20r%C3%A9gionales%20pour%20les%20classes%20de%20cours%20moyen%20%28cycle%203%29-481190.pdf",
     "BO n° 12 du 19 mars 2026 · nouveau en CM1 à la rentrée 2026, en CM2 en 2027"),
    ("Programmes & références", "Enseignement moral et civique — programme du CP à la terminale", EMC, "BO n° 24 du 13 juin 2024"),
    ("Programmes & références", "Éducation à la vie affective et relationnelle — programme de l'école élémentaire", EVAR_ELEMENTAIRE, "BO n° 6 du 6 février 2025"),
    ("Programmes & références", "Programme du cycle 3 en vigueur à la rentrée 2023 — arts ; en CM2 : EPS, histoire-géographie, langues vivantes, sciences", PROG_C3_2023,
     "BO n° 31 du 30 juillet 2020, sciences BO n° 25 du 22 juin 2023 · encore en vigueur pour ces enseignements"),
    ("Programmes & références", "Enseigner au cycle 3", E + "/4356/enseigner-au-cycle-3", "Page éduscol : tableau des programmes par classe"),
    ("Programmes & références", "Guides fondamentaux pour l'enseignement", P_GUIDES, "Page éduscol : la collection complète"),

    ("Français", "Exemples pour la mise en œuvre du programme de français — CM1", D + "exemplesmiseenoeuvrecm1-francaispdf-111546.pdf", "Éduscol"),
    ("Français", "Exemples pour la mise en œuvre du programme de français — CM2", D + "exemplesmiseenoeuvrecm2francaispdf-111540.pdf", "Éduscol"),
    ("Français", "Guide « La compréhension au cours moyen »", D + "guide-la-comprehension-au-cours-moyen-91725.pdf", "Guide fondamental"),
    ("Français", "Guide « La grammaire du français du CP à la 6e »", GUIDE_GRAMMAIRE, "Guide fondamental"),
    ("Français", "Guide « La grammaire du français — Terminologie grammaticale »", GUIDE_TERMINOLOGIE, "Guide fondamental"),
    ("Français", "Ressources d'accompagnement du programme de français au cycle 3", E + "/4800/ressources-d-accompagnement-du-programme-de-francais-au-cycle-3", PAGE),
    ("Français", "Étude de la langue aux cycles 2 et 3", P_ETUDE_LANGUE, PAGE),

    ("Mathématiques", "Mathématiques CM1 — livret d'accompagnement du programme", D + "2026livretaccompagnementmathematiquescm1-129268.pdf", "Éduscol · livret d'accompagnement 2026"),
    ("Mathématiques", "Mathématiques CM2 — livret d'accompagnement du programme", D + "2026-livret-accompagnement-mathematiques-cm2-128556.pdf", "Éduscol · livret d'accompagnement 2026"),
    ("Mathématiques", "Guide « Résolution de problèmes — cours moyen »", D + "guide-resolution-de-problemes-cours-moyen-90990.pdf", "Guide fondamental"),
    ("Mathématiques", "Ressources d'accompagnement du programme de mathématiques au cycle 3", E + "/5712/ressources-d-accompagnement-du-programme-de-mathematiques-au-cycle-3", PAGE),

    ("Sciences", "Vademecum « Enseigner les sciences et la technologie à l'école primaire »", VADEMECUM_SCIENCES, "Éduscol · vademecum"),
    ("Sciences", "Ressources d'accompagnement du programme de sciences et technologie au cycle 3", E + "/6878/ressources-d-accompagnement-du-programme-de-sciences-et-technologie-au-cycle-3", PAGE),

    ("Histoire-Géographie", "Ressources cartographiques des cycles 2 et 3 — fiche de présentation", CARTO, "Éduscol · 2026"),
    ("Histoire-Géographie", "Ressources d'accompagnement du programme d'histoire et géographie au cycle 3", E + "/4791/ressources-d-accompagnement-du-programme-d-histoire-et-geographie-au-cycle-3", PAGE),

    ("EPS", "Exemples pour la mise en œuvre du programme d'EPS au cycle 3", D + "exemples-mise-en-oeuvre-programme-eps-cycle3-127343.pdf", "Éduscol · 2026"),
    ("EPS", "Exemples pour la mise en œuvre du programme d'EPS à l'école élémentaire", EPS_ELEMENTAIRE, "Éduscol · 2026"),
    ("EPS", "EPS — ressources pour le cycle 3", E + "/4773/education-physique-et-sportive-ressources-pour-le-cycle-3", PAGE),

    ("Langues vivantes", "Exemples pour la mise en œuvre du programme de langues vivantes — CM1-CM2", D + "exemples-mise-en-oeuvre-cm1-cm2-lver-126515.pdf", "Éduscol · 2026"),
    ("Langues vivantes", "Guide pour l'enseignement des langues vivantes à l'école", GUIDE_LV, "Guide"),
    ("Langues vivantes", "Ressources d'accompagnement pour les langues vivantes à l'école élémentaire", P_LV, PAGE),

    ("EMC", "Enseignement moral et civique CM1 — livret d'accompagnement", D + "2025livretaccompagnementemccm1-112047.pdf", "Éduscol · livret d'accompagnement"),
    ("EMC", "Enseignement moral et civique CM2 — livret d'accompagnement", D + "2026livretaccompagnementemccm2-127538.pdf", "Éduscol · livret d'accompagnement"),
    ("EMC", "Ressources d'accompagnement pour l'EMC à l'école élémentaire", P_EMC, PAGE),

    ("EVAR", "EVAR CM2 — livret d'accompagnement", D + "2025livretaccompagnementevarcm2pdf-116355.pdf", "Éduscol · livret d'accompagnement"),
    ("EVAR", "Repères pour la mise en œuvre du programme dans le premier degré", EVAR_REPERES, "Éduscol"),
    ("EVAR", "Éduquer à la vie affective et relationnelle en CM1-CM2 — dépliant", D + "2025evar4pagesa5cm1cm2pdf-113346.pdf", "Éduscol · 4 pages A5"),
    ("EVAR", "EVAR et EVARS — foire aux questions", EVAR_FAQ, "Éduscol · octobre 2025"),
    ("EVAR", "Mettre en œuvre le programme EVAR/EVARS", P_EVAR, PAGE),

    ("Arts", "Arts plastiques — enjeux des trois questions au programme du cycle 3", D + "ra16c3apenjeuxtroisquestions743230pdf-74730.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "L'évaluation en arts plastiques au cycle 3", D + "ev16c3eartaplaeval-dm613812pdf-74766.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "La rencontre avec les œuvres dans la formation de l'élève au cycle 3", D + "new15rac2c3rencontreaveclesoeuvresapc3-dm613376pdf-74775.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Construire une séquence d'enseignement en éducation musicale au cycle 3", D + "ra16c3eartemusconstruire-sequence-dm613816pdf-74919.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Éducation musicale — le chant : principes de mise en œuvre", D + "ra16c2c3emchantprincipesmiseenoeuvre743233pdf-74925.pdf", "Éduscol · ressource d'accompagnement"),
    ("Arts", "Vademecum « Connaître le patrimoine de proximité »", VADEMECUM_PATRIMOINE, "Éduscol · vademecum"),
    ("Arts", "Vademecum « La chorale à l'école, au collège et au lycée »", VADEMECUM_CHORALE, "Éduscol · vademecum"),
    ("Arts", "Ressources d'accompagnement en arts plastiques aux cycles 2 et 3", P_ARTS_PLASTIQUES, PAGE),
    ("Arts", "Ressources d'accompagnement en éducation musicale aux cycles 2 et 3", P_MUSIQUE, PAGE),
    ("Arts", "Ressources d'accompagnement du programme d'histoire des arts au cycle 3", E + "/4785/ressources-d-accompagnement-du-programme-d-histoire-des-arts-au-cycle-3", PAGE),

    ("Évaluations", "Évaluations de début d'année 2026 — diaporama de présentation", EVAL_DIAPORAMA, "Repères 2026 · CP, CE1, CE2, CM1"),
    ("Évaluations", "Début de CM1 2026 — guide pour le professeur", D + "26cm1p-128914.pdf", "Repères 2026"),
    ("Évaluations", "Guide pour l'accompagnement des élèves à besoins éducatifs particuliers", GUIDE_BEP_EVAL, "Repères 2026 · adaptations des passations"),
    ("Évaluations", "Guide pour l'accès enseignant au portail", EVAL_ACCES_ENSEIGNANT, "Repères 2026"),
    ("Évaluations", "Début de CM1 2026 — fiche d'intervention : résoudre des problèmes", D + "2026evaluationdebutcm1mathematiquesficheinterventionresoudreproblemes-129517.pdf", "Repères 2026 · mathématiques"),
    ("Évaluations", "Début de CM1 2026 — fiche d'intervention : mémoriser des faits numériques et des procédures", D + "2026evaluationdebutcm1mathematiquesficheinterventionmemoriserfaitsnumeriquesprocedures-129508.pdf", "Repères 2026 · mathématiques"),
    ("Évaluations", "Évaluations des acquis et besoins des élèves au CM1", E + "/5280/evaluations-des-acquis-et-besoins-des-eleves-au-cm1", "Page éduscol : cahiers, guides adaptés, fiches"),
]


# Autres rubriques : documents qui ne correspondent pas à leur titre (vérifié
# sur le fichier réellement servi, le 13 septembre 2026) — retirés. Adresses
# telles qu'enregistrées, avec en commentaire le fichier vers lequel elles mènent.
RETIRES = {
    "https://eduscol.education.fr/document/24400/download",  # ra19lyceet1fraessai-exemple31160837pdf-83991.pdf — « Apprendre à apprendre » : essai de français de lycée
    "https://eduscol.education.fr/document/7862/download",  # ra21lyceegtthdavoyage-en-italiefiche5pdf-70908.pdf — « Le langage à l'école maternelle » : voyage en Italie, lycée
    "https://eduscol.education.fr/document/24418/download",  # ra19lyceegt2-1fraparcours-associepresentation1160868pdf-84009.pdf — « Les sciences cognitives » : parcours de français, lycée
    "https://eduscol.education.fr/document/60520/download",  # 24cm2es2pdf-107376.pdf — « Livret enseignant CM1 » : cahier élève CM2 2024
    "https://eduscol.education.fr/document/5470/download",  # guide-l-evaluation-des-apprentissages-et-des-acquis-au-lycee-gt-69588.pdf — guide du lycée
    "https://eduscol.education.fr/document/24430/download",  # ra19lyceegt2-1fraprolongement-artistique-culturel-groupement-textepresentation1160870pdf-84021.pdf — français, lycée
    "https://eduscol.education.fr/document/24445/download",  # ra19lyceegt2-1frasyntaxe-interrogation21188421pdf-84036.pdf — « Besoins éducatifs particuliers » : syntaxe, lycée
    "https://eduscol.education.fr/document/8117/download",  # ra21lyceep2fras-informer-circuits-informationpdf-71031.pdf — français, lycée professionnel
    "https://eduscol.education.fr/document/24460/download",  # ra19lyceegt2nde1refrarelationslogiques21196945pdf-84051.pdf — « EMI cycles 2 et 3 » : relations logiques, lycée
    "https://eduscol.education.fr/document/14002/download",  # 10-maths-cm2-attendus-eduscolpdf-74655.pdf — « Repères LV cycle 2 » : attendus de maths CM2
    "https://eduscol.education.fr/document/61194/download",  # nds-consolidee-definition-epreuve-bac-voie-gt-lv-choixpdf-107985.pdf — épreuve du bac
    "https://eduscol.education.fr/document/14008/download",  # 11-francais-6e-attendus-eduscol1114741pdf-74658.pdf — « Repères LV cycle 3 » : attendus de français 6e
}
# Titres faux dont l'adresse sert aussi ailleurs : retirés par leur titre.
RETIRES_PAR_TITRE = {
    ("Pédagogie", "Accompagner les professionnels — Cycles 2, 3, 4"),     # ouvrait une ressource d'arts plastiques
    ("Rituels", "Explorer le monde — Découvrir le monde du vivant"),      # ouvrait « Où sommes-nous ? » (se repérer)
}
RETITRES = {
    "https://eduscol.education.fr/document/17197/download": "Mathématiques cycles 2, 3, 4 — la différenciation pédagogique",  # ra16c4mathladifferentiationpedagogique547934pdf-77565.pdf
    "https://eduscol.education.fr/document/14650/download": "Anglais cycle 2 — déclinaison culturelle",  # ra16c2lvanglaisdeclinaisonculturelle601078pdf-75261.pdf
    "https://eduscol.education.fr/document/14671/download": "Anglais cycle 3 — déclinaison culturelle",  # ra16c3lvanglaisdeclinaisonculturelle583459pdf-75282.pdf
    "https://eduscol.education.fr/document/14557/download": "Anglais cycle 2 — repères de progressivité linguistique",  # ra16c2lvanglaisdeclinaisonlinguistisque601080pdf-75168.pdf
    "https://eduscol.education.fr/document/14584/download": "Anglais cycle 3 — repères de progressivité linguistique",  # ra16c3lvanglaisdeclinaisonlinguistique601082pdf-75195.pdf
    "https://eduscol.education.fr/document/14716/download": "Croiser les enseignements et les pratiques (cycles 2, 3 et 4)",  # ra16languesvivantescroiserenseignements566871pdf-75327.pdf
    "https://eduscol.education.fr/document/14551/download": "Élaborer une progression cohérente (cycles 2, 3 et 4)",  # ra16languesvivanteselaborerprogression560353pdf-75162.pdf
    "https://eduscol.education.fr/document/14548/download": "Créer un environnement propice à l'apprentissage des langues (cycles 2, 3 et 4)",  # ra16languesvivantescreerenvironnement564686pdf-75159.pdf
    "https://eduscol.education.fr/document/14782/download": "Évaluer l'oral en anglais au cycle 2 — préambule",  # ev16c2lvanglaisoralpreambule747900pdf-75393.pdf
    "https://eduscol.education.fr/document/57654/download": "Repères annuels de progression en langues vivantes — cycle 2",  # 2024lvreperes-annuels-progression-c2pdf-105057.pdf
    "https://eduscol.education.fr/document/56031/download": "Repères annuels de progression en langues vivantes — cycle 3",  # c3langues-vivantes-reperes-annuels-progression-v1pdf-104454.pdf
}


def corriger_autres(autres):
    garde = []
    for d in autres:
        if d["url"] in RETIRES or (d["categorie"], d["titre"]) in RETIRES_PAR_TITRE:
            continue
        if d["url"] in RETITRES:
            d = {**d, "titre": RETITRES[d["url"]]}
        garde.append(d)
    return garde


def entrees():
    for categorie, liste in (("Cycle 1", CYCLE_1), ("Cycle 2", CYCLE_2), ("Cycle 3", CYCLE_3)):
        vues = set()
        for sous, titre, url, source in liste:
            assert url not in vues, f"{categorie} : {url} en double"
            vues.add(url)
            yield {"titre": titre, "url": url, "categorie": categorie, "sousCategorie": sous, "source": source}


if __name__ == "__main__":
    chemin = Path(__file__).resolve().parents[2] / "src/data/eduscol.json"
    anciens = json.loads(chemin.read_text(encoding="utf-8"))
    autres = corriger_autres([d for d in anciens if d["categorie"] not in ("Cycle 1", "Cycle 2", "Cycle 3")])
    nouveaux = list(entrees())
    chemin.write_text(json.dumps(nouveaux + autres, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(nouveaux)} ressources des cycles 1 à 3, {len(autres)} autres conservées")
