// L'histoire et la géographie au cours moyen : une séquence par thème.
//
// Bâties sur le programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai
// 2026, annexe 4), à la demande de l'enseignant (octobre 2026), comme les
// thèmes du cycle 2 que rien ne détaille : « la séquence doit apporter une
// réponse » à la question du thème. Une séance par objectif ou par attendu,
// en trois temps — la question, la recherche dans les documents, ce qu'on
// retient sur la frise, la carte ou le cahier —, les repères remobilisés,
// les mots-clés au tableau, et une évaluation sur les attendus. Le programme
// fixe la période de chaque thème d'histoire (programmation.ts) ; en
// géographie, il ne donne que des durées, et Maitrize propose les périodes
// (periodesProposees.ts). Les feuilles viennent de histoireGeoCoursMoyen.ts
// et de l'atelier « Étiquettes ».

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { htmlHistoireGeoCM, styleHistoireGeoCM, type ReglagesHistoireGeoCM } from "./histoireGeoCoursMoyen";
import { THEMES_HG_CM, themeHGCM } from "./themesHistoireGeoCM";

export const PROGRAMME_HG_C3 = "Bâtie sur le programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai 2026, annexe 4), à la demande de l'enseignant : "
  + "la question du thème, ses objectifs, ses attendus, ses repères et ses mots-clés";
/** Au CM2, ce programme ne s'applique qu'à la rentrée 2027 : la séquence le dit (page Éduscol du cycle 3, septembre 2026). */
const PROGRAMME_HG_C3_CM2 = `${PROGRAMME_HG_C3}. Ce programme s'applique au CM2 à la rentrée 2027 ; en 2026-2027, le CM2 suit encore celui de 2020 `
  + "(Éduscol, ressources d'accompagnement du cycle 3, septembre 2026)";

const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const Q = "La question", C = "Chercher", R = "Ce qu'on retient";
/** Une séance en trois temps : la question, la recherche, ce qu'on retient — sur la frise, la carte, le cahier. */
const etape = (titre: string, objectif: string, question: string, chercher: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(Q, "10 min", question), ph(C, "25 min", chercher, posture), ph(R, "10 min", retenir)]);
const evaluation = (quoi: string, repere: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 45, [
  ph("Évaluation", "35 min", `Une feuille, les consignes lues à voix haute : ${quoi}.`),
  ph(R, "10 min", `${repere} Les repères se remobilisent souvent : on y reviendra.`),
]);
const FAMILLE = "Sciences, histoire, EMC" as const;
const RECIT = "Le récit du professeur rend la période vivante : il s'appuie sur un document majeur, que les élèves questionnent ensuite.";
const DOCUMENT = "Étudier un document : qui l'a fait, quand, pour qui ? Prélever des informations, les mettre en relation avec ce qu'on sait.";
const ECRIRE = "Écrire en histoire-géographie chaque jour : quelques phrases au cahier, l'écrit de travail distinct de l'écrit validé.";

// ── Histoire, CM1 ─────────────────────────────────────────────────────────

const MOYEN_AGE_CM1: Demarche = {
  id: "moyen-age-cm1", nom: "La vie quotidienne au Moyen Âge (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment les femmes et les hommes vivaient-ils au Moyen Âge ? » Situer le Moyen Âge (476-1492) et les XIe-XIIIe siècles sur la frise ; "
    + "le château fort et la seigneurie ; la vie des paysannes et des paysans, leur calendrier et leurs obligations ; la ville, ses marchés, ses foires, "
    + "ses artisans ; l'Église, la paroisse et l'abbaye — Cluny, ou une abbaye proche — ; l'art roman et l'art gothique — Notre-Dame de Paris, ou une "
    + "cathédrale proche. Le programme laisse le choix entre le château et la seigneurie, entre les paysans et la ville : la séquence propose les deux.",
  seances: [
    etape("Le Moyen Âge sur la frise", "situer le Moyen Âge sur une frise chronologique (476-1492) et repérer les XIe, XIIe et XIIIe siècles.",
      "Le Moyen Âge, c'est quand ? Ce que les élèves en savent déjà : des chevaliers, des châteaux, des rois.",
      "Retrouver les grandes périodes sur la frise de la classe, remobilisées du cycle 2 ; y situer le Moyen Âge, de 476 à 1492, et les trois siècles étudiés ; "
        + "compléter sa frise du thème avec les étiquettes : Cluny, Notre-Dame de Paris.",
      "Le Moyen Âge dure près de mille ans, de 476 à 1492. On étudie les XIe, XIIe et XIIIe siècles, de l'an 1001 à l'an 1300. La frise reste affichée."),
    etape("Le château fort et la seigneurie", "décrire les fonctions d'un château fort et le fonctionnement d'une seigneurie.",
      "À quoi sert un château fort ? Pourquoi est-il construit là ?",
      "Observer le plan ou la photographie d'un château fort — un château proche, si possible — ; lire le document ; relever ce qui protège, ce qui sert "
        + "à vivre, ce qui montre la puissance ; retrouver dans la seigneurie le château, le village, les champs, le moulin, l'église.",
      "Le château protège, le seigneur y vit, il montre sa puissance. La seigneurie : le territoire d'un seigneur et les personnes qui y vivent ; il les "
        + "protège, les juge, leur fait payer des taxes.", DOCUMENT),
    etape("La vie des paysannes et des paysans", "raconter la vie quotidienne des paysans : le calendrier des travaux, leurs obligations envers le seigneur et l'Église.",
      "Que fait une paysanne, un paysan, au fil de l'année ?",
      "Observer un calendrier sculpté ou peint du Moyen Âge — un portail d'église, un livre d'heures — ; relier chaque mois à son travail ; trier ce que "
        + "les paysans doivent au seigneur et à l'Église ; raconter, à l'écrit, une année dans la vie d'une famille de paysans.",
      "Les paysans, presque toute la population, travaillent la terre toute l'année. Ils doivent au seigneur la corvée, des taxes, une part des récoltes ; "
        + "à l'Église, la dîme.", ECRIRE),
    etape("La ville au Moyen Âge", "décrire les activités des villes au Moyen Âge : le marché, la foire, l'artisanat.",
      "Qu'est-ce qu'on trouve dans une ville au Moyen Âge ? Qui y vit ?",
      "Lire le document ; observer une enluminure ou un plan de ville — ses remparts, ses rues, ses échoppes — ; relever les métiers, les lieux du commerce ; "
        + "chercher les traces du Moyen Âge dans les noms de rues de la ville la plus proche.",
      "Derrière ses remparts, la ville vit de l'artisanat et du commerce : les artisans dans leurs ateliers, le marché chaque semaine, les foires "
        + "plusieurs fois par an. Ses habitants sont les bourgeois."),
    etape("L'Église au cœur de la vie", "décrire le rôle social de l'Église : l'aide aux pauvres et aux malades, l'enseignement.",
      "Pourquoi l'église est-elle au centre du village ?",
      "Lire le document ; étudier une abbaye — celle de Cluny, fondée en 910, ou une abbaye proche — ; relever ce que fait l'Église pour les pauvres, "
        + "les malades, et pour enseigner ; situer la paroisse de l'école.",
      "L'Église encadre la vie de chacun, de la naissance à la mort, dans sa paroisse. Elle accueille les pauvres, soigne les malades à l'Hôtel-Dieu, "
        + "enseigne dans les écoles des monastères et des cathédrales."),
    etape("Art roman, art gothique", "différencier l'art roman de l'art gothique.",
      "Deux églises, deux photographies : qu'est-ce qui les distingue ?",
      "Comparer une église romane et une cathédrale gothique — Notre-Dame de Paris, commencée en 1163, ou une cathédrale proche — ; trier les "
        + "caractéristiques : les murs, les fenêtres, les voûtes, la hauteur, la lumière ; si possible, visiter une église de la commune.",
      "L'art roman (XIe-XIIe siècles) : des murs épais, de petites fenêtres, des voûtes en berceau. L'art gothique (à partir du XIIe siècle) : des "
        + "arcs-boutants, des croisées d'ogives, de grands vitraux ; des édifices hauts et lumineux."),
    evaluation("décrire la vie au Moyen Âge — le château, les paysans, l'Église — et différencier l'art roman de l'art gothique",
      "La frise du Moyen Âge reste affichée, avec Cluny et Notre-Dame."),
  ],
};

const MONARCHIE_CM1: Demarche = {
  id: "monarchie-cm1", nom: "La monarchie en France aux XVIe et XVIIe siècles (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment le roi incarne-t-il le pouvoir aux XVIe et XVIIe siècles ? » Trois règnes sur la frise — François Ier (1515-1547), Henri IV "
    + "(1589-1610), Louis XIV (1643-1715) — ; François Ier, roi mécène de la Renaissance, et Léonard de Vinci ; Henri IV, qui pacifie le royaume par "
    + "l'édit de Nantes (1598) ; Louis XIV et Versailles, le pouvoir absolu ; les femmes à la Cour ; la société d'ordres, faite surtout de paysans. "
    + "Le programme date de 1515 le début du séjour de Léonard de Vinci en France : François Ier, roi cette année-là, l'invite, et Léonard s'installe "
    + "au Clos Lucé, près d'Amboise, en 1516.",
  seances: [
    etape("Trois rois sur la frise", "situer sur une frise chronologique les règnes de François Ier, d'Henri IV et de Louis XIV.",
      "Après le Moyen Âge, qui gouverne la France ? Comment devient-on roi ?",
      "Prolonger la frise de la classe après 1492 ; y placer les trois règnes ; compléter sa frise du thème : les règnes, Léonard de Vinci, l'édit de "
        + "Nantes, la Cour à Versailles ; observer un portrait de chaque roi.",
      "François Ier règne de 1515 à 1547, Henri IV de 1589 à 1610, Louis XIV de 1643 à 1715. Ce sont des monarques : le pouvoir se transmet dans la famille."),
    etape("François Ier, roi de la Renaissance", "expliquer avec l'exemple de François Ier et de Léonard de Vinci le rôle d'un roi dans la diffusion de la Renaissance.",
      "Pourquoi La Joconde, peinte en Italie, est-elle au Louvre ?",
      "Lire le document ; observer des œuvres et des inventions de Léonard de Vinci, et le château de Chambord ; relever ce que fait le roi pour les "
        + "artistes : il les invite, les paie, leur commande des œuvres.",
      "François Ier est un mécène : il protège et paie les artistes de la Renaissance, comme Léonard de Vinci, et fait construire des châteaux. "
        + "La Renaissance se diffuse en France.", RECIT),
    etape("Henri IV et la paix du royaume", "expliquer comment Henri IV pacifie le royaume de France dans le contexte des guerres de religion.",
      "Comment ramener la paix quand deux religions se font la guerre ?",
      "Lire le document ; observer une représentation du massacre de la Saint-Barthélemy ; relever les étapes : les guerres, la conversion du roi, "
        + "l'édit de Nantes ; expliquer, en quelques phrases, ce que l'édit change pour les protestants.",
      "Pendant les guerres de religion, catholiques et protestants s'affrontent. Henri IV, protestant devenu catholique, signe l'édit de Nantes en 1598 : "
        + "les protestants peuvent pratiquer leur religion ; la paix revient.", ECRIRE),
    etape("Versailles, le pouvoir absolu", "expliquer comment le château de Versailles exprime le pouvoir absolu du roi.",
      "Pourquoi un roi fait-il construire un château aussi grand ?",
      "Lire le document ; observer le plan de Versailles, la galerie des Glaces, un portrait de Louis XIV en majesté ; relever tout ce qui montre la "
        + "gloire du roi : l'architecture, les jardins, le soleil, la vie de la Cour réglée par l'étiquette.",
      "Louis XIV a tous les pouvoirs : c'est la monarchie absolue ; il dit tenir son pouvoir de Dieu. Versailles, où la Cour s'installe en 1682, "
        + "montre sa gloire ; les nobles y vivent sous son regard.", DOCUMENT),
    etape("Les femmes à la Cour de Versailles", "décrire le rôle des femmes à la Cour de Versailles.",
      "Quelle place les femmes ont-elles à la Cour ?",
      "Relire la fin du document ; observer des portraits — la reine, Madame de Maintenon — ; relever ce que font les femmes à la Cour : elles servent "
        + "la reine, organisent des fêtes, écrivent, protègent des artistes, conseillent le roi, fondent une école.",
      "À la Cour, la reine et les princesses ont leur maison et leurs dames d'honneur. Des femmes ont de l'influence : Madame de Maintenon conseille le "
        + "roi et fonde à Saint-Cyr une école pour les jeunes filles nobles et pauvres."),
    etape("La société d'ordres", "décrire l'organisation de la société d'ordres, majoritairement composée de paysans.",
      "Tout le monde a-t-il les mêmes droits sous l'Ancien Régime ?",
      "Observer une caricature des trois ordres ; trier les étiquettes : ceux qui prient, ceux qui combattent, ceux qui travaillent ; comparer le "
        + "nombre de personnes dans chaque ordre et ce que chacun paie.",
      "La société est divisée en trois ordres : le clergé, la noblesse, le tiers état. Le clergé et la noblesse ont des privilèges ; le tiers état, "
        + "surtout des paysans, est presque toute la population et paie presque tous les impôts."),
    evaluation("situer les trois règnes, expliquer le rôle de François Ier, d'Henri IV et de Louis XIV, et décrire la société d'ordres",
      "La frise des trois rois reste affichée."),
  ],
};

const EXPLORATIONS_CM1: Demarche = {
  id: "explorations-cm1", nom: "Explorations et conquêtes par les Européens, du XVe au XVIIe siècle (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Pourquoi les Européens explorent-ils le monde et comment cela mène-t-il à la première colonisation ? » Les inventions qui permettent la "
    + "navigation au grand large ; Christophe Colomb (1492) et l'expédition de Magellan (1519-1522) ; les premiers empires coloniaux en Amérique, sur "
    + "la carte ; les conséquences de la conquête pour les Amérindiens ; la traite des esclaves et la vie dans les plantations, le « Code noir » (1685) ; "
    + "les denrées venues des colonies : la tomate, le chocolat, le haricot, la pomme de terre, le sucre de canne.",
  seances: [
    etape("Naviguer au grand large", "mémoriser le nom de plusieurs inventions permettant la navigation au grand large.",
      "Pourquoi les marins du Moyen Âge restaient-ils près des côtes ?",
      "Observer une caravelle, une boussole, un astrolabe, une carte ancienne ; relier chaque invention à ce qu'elle permet ; chercher pourquoi les "
        + "Européens veulent aller plus loin : les épices, l'or, la soie d'Asie.",
      "La caravelle, la boussole, l'astrolabe, le gouvernail d'étambot et les cartes permettent de s'aventurer en haute mer. Les Européens cherchent "
        + "une route vers l'Asie et ses richesses."),
    etape("Les grands voyages", "raconter les voyages de Christophe Colomb et de Magellan, et les situer sur la frise et sur la carte.",
      "Où va Christophe Colomb ? Où arrive-t-il vraiment ?",
      "Lire le document ; tracer les deux voyages sur le planisphère de la classe ; compléter la frise du thème : 1492, 1519-1522, la conquête des "
        + "Aztèques, Jacques Cartier, le Code noir.",
      "1492 : Christophe Colomb débarque en Amérique. 1519-1522 : l'expédition de Magellan fait le premier tour du monde : on peut faire le tour de la "
        + "Terre par la mer.", RECIT),
    etape("Les premiers empires coloniaux", "localiser les grands empires coloniaux sur une carte.",
      "Qui se partage l'Amérique après les voyages de découverte ?",
      "Relier chaque pays d'Europe aux territoires qu'il domine ; colorier les empires sur la carte de l'Amérique ; coller les étiquettes des lieux "
        + "sur le planisphère de la classe.",
      "L'Espagne domine le Mexique, le Pérou, une grande partie de l'Amérique ; le Portugal, le Brésil ; la France, la Nouvelle-France et des îles des "
        + "Antilles ; l'Angleterre, la côte est de l'Amérique du Nord : ce sont des empires coloniaux."),
    etape("La conquête et les Amérindiens", "citer des conséquences de la conquête sur les populations amérindiennes.",
      "Qui vivait en Amérique avant l'arrivée des Européens ? Que leur arrive-t-il ?",
      "Lire le document ; observer des représentations de Tenochtitlan, la capitale des Aztèques, et de la conquête ; relever les conséquences : la "
        + "guerre, le travail forcé, les maladies, la disparition de la plus grande partie des Amérindiens.",
      "La conquête bouleverse la vie des Amérindiens : guerres, travail forcé dans les mines et les champs, maladies venues d'Europe. En un siècle, la "
        + "plus grande partie d'entre eux meurt. Des religieux, comme Las Casas, dénoncent ces violences.", DOCUMENT),
    etape("La traite et l'esclavage", "décrire les conditions de vie des esclaves dans une plantation.",
      "Qui travaille dans les plantations de sucre des Antilles ?",
      "Lire le document ; tracer le commerce triangulaire sur le planisphère ; observer le plan d'un navire négrier et une gravure de plantation ; "
        + "relever les conditions de vie des esclaves ; écrire quelques phrases sur la vie d'un esclave dans une plantation.",
      "Le commerce triangulaire relie l'Europe, l'Afrique et l'Amérique : des millions d'Africains sont déportés et réduits en esclavage. Dans les "
        + "plantations, ils travaillent de force. En 1685, le Code noir de Louis XIV fait de l'esclave un bien.", ECRIRE),
    etape("Des denrées venues d'Amérique", "nommer quelques denrées issues de ces colonies.",
      "D'où viennent la tomate, le chocolat, la pomme de terre ?",
      "Trier les aliments : venus d'Amérique, ou connus en Europe avant 1492 ; chercher ce qu'on en fait aujourd'hui ; relier le sucre de canne aux "
        + "plantations des Antilles.",
      "La tomate, le cacao du chocolat, le haricot, la pomme de terre, le maïs viennent d'Amérique. Le sucre de canne est produit en grand dans les "
        + "plantations des colonies, par des esclaves."),
    evaluation("nommer des inventions de navigation, situer les grands voyages, citer des conséquences de la conquête, décrire la vie des esclaves et nommer des denrées",
      "La frise des explorations reste affichée ; le commerce triangulaire reste tracé sur le planisphère."),
  ],
};

const REVOLUTION_CM1: Demarche = {
  id: "revolution-1789-cm1", nom: "1789, une année révolutionnaire en France (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment l'année 1789 met-elle fin à la monarchie absolue et à la société d'ordres ? » Le royaume en 1789 : les dettes, la faim, les "
    + "privilèges ; les idées des Lumières, et une ou un philosophe — Montesquieu, Voltaire, Rousseau, Diderot, Émilie du Châtelet — ; les cahiers de "
    + "doléances et les États généraux au printemps, la prise de la Bastille le 14 juillet, l'abolition des privilèges dans la nuit du 4 août, la "
    + "Déclaration des droits de l'homme et du citoyen le 26 août, la marche des femmes sur Versailles les 5 et 6 octobre, sur la frise de l'année.",
  seances: [
    etape("Le royaume en 1789", "décrire le contexte social, économique et intellectuel du royaume en 1789.",
      "Pourquoi les Français sont-ils mécontents en 1789 ?",
      "Lire le document ; observer une caricature des trois ordres ; lire des extraits de cahiers de doléances ; relever les problèmes : les dettes "
        + "du roi, le prix du pain, les impôts du tiers état, les privilèges.",
      "En 1789, le roi manque d'argent, le peuple a faim, le tiers état paie presque tous les impôts. Louis XVI réunit les États généraux ; on écrit "
        + "les cahiers de doléances.", DOCUMENT),
    etape("Les idées des Lumières", "citer des idées des Lumières, et un ou une philosophe.",
      "Qui critique la monarchie absolue et la société d'ordres, avant 1789 ?",
      "Relier chaque philosophe à son idée ; feuilleter des planches de l'Encyclopédie ; choisir un ou une philosophe et écrire ce qu'il ou elle défend.",
      "Les Lumières défendent la raison, la liberté, l'égalité, la tolérance, la séparation des pouvoirs, le savoir pour tous. Leurs idées inspirent "
        + "la Révolution.", ECRIRE),
    etape("De la Bastille à la fin des privilèges", "compléter une frise chronologique avec les évènements marquants de l'année 1789.",
      "Que se passe-t-il en France entre mai et octobre 1789 ?",
      "Écouter le récit de l'été 1789 ; remettre les évènements dans l'ordre ; compléter la frise de l'année : le printemps des cahiers et des États "
        + "généraux, le 14 juillet, la nuit du 4 août, le 26 août, les 5 et 6 octobre.",
      "Le 14 juillet 1789, le peuple de Paris prend la Bastille. Dans la nuit du 4 août, les députés abolissent les privilèges : c'est la fin de la "
        + "société d'ordres.", RECIT),
    etape("La Déclaration des droits de l'homme et du citoyen", "citer les principaux droits énoncés dans la Déclaration des droits de l'homme et du citoyen.",
      "Quels droits les députés proclament-ils le 26 août 1789 ?",
      "Lire les extraits de la Déclaration ; relever les droits — la liberté, l'égalité, la propriété, la sûreté, la résistance à l'oppression, la "
        + "liberté d'opinion et d'expression — ; chercher ce qui change par rapport à l'Ancien Régime.",
      "La Déclaration du 26 août 1789 proclame que les hommes naissent libres et égaux en droits, et que le pouvoir appartient à la Nation : c'est la "
        + "fin de la monarchie absolue.", DOCUMENT),
    etape("Les femmes en 1789", "raconter la vie et l'action d'une femme ou de femmes au cours de l'année 1789.",
      "Les femmes ont-elles participé à la Révolution ?",
      "Lire le document ; observer une gravure de la marche des femmes sur Versailles ; raconter, à l'écrit, les journées des 5 et 6 octobre ; "
        + "chercher ce que demandent les femmes.",
      "Les 5 et 6 octobre 1789, les femmes de Paris marchent sur Versailles pour réclamer du pain et ramènent le roi à Paris. Des femmes demandent "
        + "l'instruction des filles et le droit de travailler.", ECRIRE),
    evaluation("décrire le royaume en 1789, citer des idées des Lumières, compléter la frise de 1789, raconter l'action des femmes et citer des droits de la Déclaration",
      "La frise de l'année 1789 reste affichée ; la Déclaration aussi."),
  ],
};

// ── Histoire, CM2 ─────────────────────────────────────────────────────────

const REPUBLIQUE_EMPIRE_CM2: Demarche = {
  id: "republique-empire-cm2", nom: "De la République à l'Empire, 1792-1815 (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment la République et l'Empire ont-ils transformé la vie des Français et des Françaises ? » Participer à la vie politique depuis 1789 : "
    + "les clubs, les journaux, les pétitions — celle de 319 femmes menées par Pauline Léon, en mars 1792 — ; la guerre, La Marseillaise (avril 1792), "
    + "la chute du roi et la naissance de la République (septembre 1792) ; le combat pour l'abolition de l'esclavage (1794), son rétablissement (1802) ; "
    + "Bonaparte, du général à l'empereur sacré le 2 décembre 1804 ; ses réformes — le Code civil, les lycées, les préfets — et la remise en cause de "
    + "certains acquis de la Révolution.",
  seances: [
    etape("Participer à la vie politique", "raconter comment les Français et les Françaises participent à la vie politique depuis 1789.",
      "Comment devient-on citoyen pendant la Révolution ?",
      "Remobiliser la frise de 1789 ; lire le document ; observer une séance de club, une pétition, un journal de l'époque ; relever qui vote, qui "
        + "s'exprime, et comment les femmes agissent sans voter.",
      "Depuis 1789, les Français lisent les journaux, discutent dans les clubs, écrivent des pétitions ; en 1792, tous les hommes votent. Les femmes ne "
        + "votent pas, mais agissent : en mars 1792, 319 femmes demandent à défendre la patrie.", DOCUMENT),
    etape("La chute du roi, la naissance de la République", "raconter la chute du roi et la naissance de la République.",
      "Comment la France passe-t-elle d'un roi à une République ?",
      "Écouter le récit — la fuite à Varennes, la guerre, le 10 août 1792 — ; lire le document ; chanter le premier couplet de La Marseillaise et "
        + "chercher son origine ; compléter la frise du thème.",
      "En guerre, la France se méfie du roi. Le 10 août 1792, il est renversé ; en septembre 1792, la République naît. La Marseillaise, composée en "
        + "avril 1792, devient le chant des soldats de la République.", RECIT),
    etape("Le combat pour l'abolition de l'esclavage", "raconter le combat pour l'abolition de l'esclavage.",
      "Les droits de l'homme valent-ils pour les esclaves des colonies ?",
      "Lire le document ; observer un portrait de Toussaint Louverture ; placer sur la frise 1794 et 1802 ; raconter, à l'écrit, les étapes du combat.",
      "Révoltés à Saint-Domingue en 1791, soutenus par des abolitionnistes, les esclaves obtiennent l'abolition de l'esclavage en 1794. Napoléon "
        + "Bonaparte la rétablit en 1802 ; elle ne sera définitive qu'en 1848.", ECRIRE),
    etape("Bonaparte devient empereur", "expliquer comment Bonaparte devient empereur.",
      "Comment un général devient-il empereur ?",
      "Remettre dans l'ordre les étapes de son ascension ; observer Le Sacre de Napoléon, de David : qui est là, qui couronne qui ; compléter la frise.",
      "Général victorieux, Bonaparte prend le pouvoir par un coup d'État en 1799, devient Premier consul, puis consul à vie. Le 2 décembre 1804, il est "
        + "sacré empereur : Napoléon Ier.", DOCUMENT),
    etape("Les réformes de Napoléon", "nommer des réformes menées par Napoléon Bonaparte.",
      "Qu'est-ce que Napoléon a laissé, qui existe encore aujourd'hui ?",
      "Trier : ce que Napoléon crée, ce qu'il remet en cause ; chercher ce qui existe encore — le Code civil, les lycées, les préfets ; relever ce qui "
        + "trahit la Révolution : l'esclavage rétabli, la presse censurée, le pouvoir d'un seul.",
      "Napoléon crée le Code civil (1804), les lycées, les préfets ; mais il gouverne seul, censure la presse et rétablit l'esclavage."),
    evaluation("raconter la naissance de la République et le combat pour l'abolition de l'esclavage, expliquer comment Bonaparte devient empereur et nommer ses réformes",
      "La frise de 1789 à 1815 reste affichée."),
  ],
};

const VERS_REPUBLIQUE_CM2: Demarche = {
  id: "vers-republique-cm2", nom: "Vers une France républicaine : la IIe et la IIIe République, 1848-1914 (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment la France est-elle devenue une République ? » 1848 : la IIe République, le suffrage universel masculin et l'abolition définitive "
    + "de l'esclavage ; la IIIe République et ses grandes lois — la liberté de la presse, les lois Ferry sur l'École (1882-1886), la séparation des "
    + "Églises et de l'État le 9 décembre 1905 — ; les symboles de la République, en remobilisant l'enseignement moral et civique ; l'empire colonial "
    + "français au début du XXe siècle, sur le planisphère.",
  seances: [
    etape("1848, la IIe République", "nommer les grandes décisions de 1848 : le suffrage universel masculin et l'abolition de l'esclavage.",
      "Depuis quand tous les hommes votent-ils en France ?",
      "Lire le document ; observer une gravure du premier vote au suffrage universel et le tableau de l'abolition de l'esclavage ; compléter la frise "
        + "du thème.",
      "En 1848, la IIe République donne le droit de vote à tous les hommes et abolit définitivement l'esclavage, grâce à Victor Schœlcher. Les femmes "
        + "ne votent pas encore. En 1852, Napoléon III rétablit l'Empire.", DOCUMENT),
    etape("Les grandes lois de la République", "nommer de grandes lois fondatrices de la République.",
      "Quelles lois font de la France une République démocratique ?",
      "Relier chaque loi à ce qu'elle permet ; lire un extrait des lois Ferry et de la loi de 1905 ; chercher ce qui en reste à l'école aujourd'hui : "
        + "l'école gratuite, obligatoire, laïque ; la charte de la laïcité.",
      "La IIIe République, proclamée en 1870, fonde ses libertés sur des lois : la liberté de la presse (1881), l'école gratuite, obligatoire et laïque "
        + "(1882-1886), la séparation des Églises et de l'État (1905), la laïcité."),
    etape("Les symboles de la République", "nommer les symboles de la République.",
      "Comment reconnaît-on la République autour de nous ?",
      "Chercher les symboles sur la façade de l'école et de la mairie, sur les pièces, les timbres ; relier chaque symbole à sa description ; "
        + "remobiliser ce que l'enseignement moral et civique en a dit.",
      "Cinq symboles : le drapeau tricolore, le 14 juillet, Marianne, la Marseillaise, la devise Liberté, Égalité, Fraternité. On les trouve sur les "
        + "bâtiments publics et dans les cérémonies."),
    etape("L'empire colonial français", "localiser sur un planisphère les territoires de l'empire colonial français au début du XXe siècle.",
      "Où la France a-t-elle des colonies vers 1914 ?",
      "Lire le document ; colorier l'empire colonial sur le planisphère et y coller les étiquettes des territoires ; relever ce que la République "
        + "n'applique pas dans ses colonies.",
      "Vers 1914, la France possède le deuxième empire colonial du monde, surtout en Afrique, et en Asie avec l'Indochine. Les colonisés n'ont pas les "
        + "mêmes droits que les Français.", DOCUMENT),
    evaluation("nommer des lois fondatrices et les symboles de la République, et localiser l'empire colonial", "La frise de 1848 à 1914 reste affichée."),
  ],
};

const AGE_INDUSTRIEL_CM2: Demarche = {
  id: "age-industriel-cm2", nom: "L'âge industriel en France au XIXe siècle (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Quelles sont les transformations économiques et sociales en France au XIXe siècle ? » La vapeur, le charbon, la locomotive de Stephenson, le "
    + "chemin de fer et les usines ; la vie quotidienne transformée ; les progrès de la médecine — Pasteur et le vaccin contre la rage — ; les "
    + "ouvrières et les ouvriers, à la mine, à l'atelier, à l'usine, et leurs luttes — le droit de grève, la liberté syndicale — ; la vie des "
    + "bourgeoises et des bourgeois, dans une France qui reste très majoritairement rurale.",
  seances: [
    etape("La vapeur et le chemin de fer", "expliquer les progrès techniques du XIXe siècle — la vapeur, le chemin de fer, les usines — et les situer sur la frise.",
      "Comment voyageait-on et fabriquait-on avant le XIXe siècle ?",
      "Lire le document ; observer une locomotive, une usine, une mine du XIXe siècle — un musée ou une trace proche, si possible — ; compléter la "
        + "frise du thème.",
      "La machine à vapeur, qui brûle du charbon, fait tourner les usines ; le chemin de fer relie les villes. On produit plus ; les villes grandissent : "
        + "c'est l'industrialisation et l'urbanisation.", DOCUMENT),
    etape("La vie quotidienne change", "expliquer les transformations de la vie quotidienne en lien avec les progrès techniques et scientifiques.",
      "Qu'est-ce qui change dans la vie de tous les jours au XIXe siècle ?",
      "Trier : avant le XIXe siècle, à la fin du XIXe siècle ; comparer deux images d'une même rue à cent ans d'écart ; écrire comment un progrès "
        + "change la vie.",
      "L'éclairage au gaz puis à l'électricité, le train, l'eau courante, le télégraphe, la photographie transforment la vie quotidienne, d'abord en ville.",
      ECRIRE),
    etape("Les progrès de la médecine", "nommer quelques progrès de la médecine.",
      "Pourquoi vit-on plus longtemps à la fin du XIXe siècle ?",
      "Relier chaque savant à son progrès ; écouter le récit de la première vaccination contre la rage, en 1885 ; chercher les vaccins d'aujourd'hui "
        + "dans un carnet de santé imaginaire.",
      "Pasteur montre que les microbes causent des maladies et invente le vaccin contre la rage ; l'anesthésie, la désinfection, les rayons X changent "
        + "la médecine.", RECIT),
    etape("Ouvrières et ouvriers", "décrire les conditions de vie et les luttes sociales des ouvrières et des ouvriers, à la mine, à l'atelier, à l'usine.",
      "Comment vit-on quand on travaille à la mine ou à l'usine ?",
      "Lire le document ; observer des photographies de mineurs, d'enfants à l'usine, une affiche de grève ; relever les conditions de travail et les "
        + "lois obtenues : 1841, 1864, 1884.",
      "Les ouvriers travaillent douze à quinze heures par jour, pour de faibles salaires ; des enfants travaillent. Ils luttent : le droit de grève en "
        + "1864, la liberté syndicale en 1884.", DOCUMENT),
    etape("Bourgeoises et bourgeois", "décrire la vie quotidienne des bourgeoises et des bourgeois.",
      "Tout le monde vit-il de la même façon dans la France du XIXe siècle ?",
      "Lire le document ; comparer un intérieur bourgeois et un logement ouvrier ; retenir que la France reste un pays de paysans.",
      "Les bourgeois vivent dans le confort des beaux quartiers, servis par des domestiques ; la bourgeoise dirige la maison. En 1900, plus de la moitié "
        + "des Français vivent encore à la campagne."),
    evaluation("expliquer les transformations de la vie quotidienne, nommer des progrès de la médecine, décrire la vie des ouvriers et des bourgeois",
      "La frise du XIXe siècle reste affichée."),
  ],
};

const PREMIERE_GUERRE_CM2: Demarche = {
  id: "premiere-guerre-cm2", nom: "La France dans la Première Guerre mondiale, 1914-1918 (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment la Première Guerre mondiale a-t-elle bouleversé la société française ? » Situer la guerre sur la frise (1914-1918, l'armistice du "
    + "11 novembre 1918) ; le nord et l'est de la France, lieu des combats du front occidental ; la vie des poilus dans les tranchées, une grande "
    + "bataille — Verdun — ; la guerre de mouvement et la guerre de position ; la mobilisation de toute la population, des femmes, de l'économie et des "
    + "colonies ; le bilan humain — 10 millions de morts au combat, dont 1,4 million de Français — et le monument aux morts de la commune.",
  seances: [
    etape("La guerre sur la frise", "situer sur une frise chronologique la Première Guerre mondiale.",
      "Pourquoi l'appelle-t-on la Première Guerre mondiale ? Quand a-t-elle eu lieu ?",
      "Placer la guerre sur la frise de la classe ; compléter la frise du thème : la mobilisation, la Marne, Verdun, l'armistice ; repérer sur une carte "
        + "le front occidental, au nord et à l'est de la France.",
      "La Première Guerre mondiale dure de 1914 à 1918 ; l'armistice est signé le 11 novembre 1918. En France, on se bat au nord et à l'est."),
    etape("La vie des poilus", "raconter la vie sur le front : les combats et les conditions de vie.",
      "Comment vivent les soldats dans les tranchées ?",
      "Lire le document ; écouter des extraits de lettres de poilus ; observer des photographies de tranchées ; écrire une lettre de poilu à sa famille, "
        + "avec ce qu'on a appris.",
      "Dans les tranchées, les poilus vivent dans la boue, le froid, la peur, sous les obus et les gaz. Les lettres racontent la souffrance et la "
        + "camaraderie.", ECRIRE),
    etape("Une grande bataille : Verdun", "distinguer la guerre de mouvement et la guerre de position, et raconter une grande bataille.",
      "Pourquoi le front ne bouge-t-il presque plus de 1915 à 1917 ?",
      "Trier : guerre de mouvement, guerre de position ; observer la carte de la bataille de Verdun et des photographies du champ de bataille, avant et "
        + "après ; écouter le récit des dix mois de combats.",
      "1914 et 1918 : la guerre de mouvement. De la fin 1914 au printemps 1918 : la guerre de position, dans les tranchées. À Verdun, en 1916, plus de "
        + "300 000 soldats meurent en dix mois.", RECIT),
    etape("Toute la population mobilisée", "expliquer la mobilisation humaine — notamment le rôle des femmes —, économique, industrielle et culturelle.",
      "Qui fait tourner le pays quand les hommes sont au front ?",
      "Lire le document ; observer des photographies de munitionnettes, de paysannes, des affiches de propagande et d'emprunt ; relever le rôle des "
        + "femmes, des usines, des colonies.",
      "À l'arrière, les femmes remplacent les hommes aux champs, dans les usines et les transports ; l'économie produit pour la guerre ; les colonies "
        + "envoient soldats et travailleurs ; la propagande encourage à tenir.", DOCUMENT),
    etape("Le bilan humain", "mémoriser quelques éléments du bilan humain de la guerre, dont le nombre total de morts au combat.",
      "Que reste-t-il de cette guerre dans notre commune ?",
      "Lire le document ; étudier le monument aux morts de la commune — compter les noms, chercher les familles, les âges — ; préparer la cérémonie "
        + "du 11 novembre.",
      "La guerre a fait environ 10 millions de morts au combat, dont 1,4 million de Français, et des millions de blessés. Chaque commune a son monument "
        + "aux morts."),
    evaluation("situer la guerre, raconter la vie des poilus, expliquer la mobilisation de la population et citer le bilan humain",
      "La frise de la guerre reste affichée ; le nombre de morts se retient."),
  ],
};

const SECONDE_GUERRE_CM2: Demarche = {
  id: "seconde-guerre-cm2", nom: "La France pendant la Seconde Guerre mondiale, 1939-1945 (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment la France a-t-elle vécu la défaite, l'Occupation puis la Libération ? » Les étapes de la guerre en France — la « drôle de guerre », "
    + "la défaite de juin 1940, l'Occupation et la collaboration, la Libération — ; la vie sous l'Occupation ; la Résistance, l'appel du 18 juin 1940 et "
    + "Jean Moulin ; le régime de Vichy, sa politique antisémite et sa participation à l'extermination des Juifs — la rafle du Vel d'Hiv, en 1942 — ou "
    + "l'action des Justes parmi les Nations ; le bilan humain : entre 60 et 70 millions de morts dans le monde, dont 6 millions de Juifs. Des sujets "
    + "graves, à aborder avec des documents choisis pour l'âge des élèves.",
  seances: [
    etape("Les étapes de la guerre en France", "mémoriser les étapes de la Seconde Guerre mondiale en France : « drôle de guerre », défaite de juin 1940, occupation et collaboration, libération.",
      "Que s'est-il passé en France de 1939 à 1945 ?",
      "Écouter le récit du professeur ; remettre les étapes dans l'ordre ; compléter la frise du thème ; repérer sur une carte la zone occupée et la "
        + "zone libre.",
      "1939-1945 : la Seconde Guerre mondiale. La « drôle de guerre », la défaite de juin 1940, l'Occupation et la collaboration, puis la Libération, "
        + "à partir du débarquement du 6 juin 1944 ; le 8 mai 1945, l'Allemagne nazie capitule.", RECIT),
    etape("Vivre sous l'Occupation", "décrire les difficultés de la vie sous l'Occupation.",
      "Comment vit-on en France quand l'armée allemande l'occupe ?",
      "Lire le document ; observer des tickets de rationnement, une affiche de la ligne de démarcation ; recueillir, si c'est possible, un témoignage "
        + "transmis dans une famille ou par un musée.",
      "Sous l'Occupation, tout manque : tickets de rationnement, longues queues, froid ; le couvre-feu, la ligne de démarcation, la censure ; le Service "
        + "du travail obligatoire à partir de 1943.", DOCUMENT),
    etape("Résister", "identifier le rôle du général de Gaulle ou de Jean Moulin dans la Résistance.",
      "Qui refuse la défaite et l'Occupation ? Comment ?",
      "Lire le document ; écouter un extrait de l'appel du 18 juin 1940 ; observer un journal clandestin ; relever les actions des résistants ; "
        + "écrire le portrait du général de Gaulle ou de Jean Moulin.",
      "Le 18 juin 1940, de Gaulle appelle à continuer le combat et crée la France libre. En France, des femmes et des hommes résistent ; Jean Moulin unit "
        + "les mouvements de résistance en 1943.", ECRIRE),
    etape("Vichy et la persécution des Juifs", "décrire le rôle de Pétain et la politique antisémite du régime de Vichy, ou expliquer à partir d'un exemple l'action des « Justes parmi les Nations ».",
      "Qu'arrive-t-il aux Juifs de France pendant la guerre ?",
      "Lire le document, choisi et lu avec le professeur ; observer une affiche des lois antisémites, la plaque du Vel d'Hiv ; étudier l'exemple du "
        + "Chambon-sur-Lignon ou d'un Juste de la région ; s'appuyer sur les ressources du Mémorial de la Shoah, adaptées à l'âge des élèves.",
      "Le régime de Vichy, dirigé par Pétain, collabore avec l'Allemagne nazie ; il exclut les Juifs, les fait arrêter — la rafle du Vel d'Hiv, en "
        + "juillet 1942 — et participe à leur déportation vers les camps d'extermination. Des Justes en ont sauvé au péril de leur vie.",
      "Un sujet grave : des documents choisis, la parole des élèves accueillie, aucun détail qui choque sans rien apprendre."),
    etape("Le bilan humain", "mémoriser quelques éléments du bilan humain de la guerre.",
      "Combien de personnes sont mortes pendant la Seconde Guerre mondiale ?",
      "Comparer le bilan des deux guerres mondiales ; chercher les noms de 1939-1945 sur le monument aux morts de la commune ; repérer les lieux de "
        + "mémoire proches.",
      "La Seconde Guerre mondiale a fait entre 60 et 70 millions de morts dans le monde, dont 6 millions de Juifs, 60 % des Juifs d'Europe ; plus de "
        + "civils que de soldats."),
    evaluation("mémoriser les étapes de la guerre en France, décrire la vie sous l'Occupation, identifier le rôle d'un résistant et citer le bilan humain",
      "La frise de la guerre reste affichée."),
  ],
};

const DEPUIS_1945_CM2: Demarche = {
  id: "depuis-1945-cm2", nom: "La France depuis 1945 : 80 ans de transformations (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment expliquer la longue période de paix et de transformation depuis 1945 ? » Une République démocratique et sociale : le droit de vote "
    + "des femmes (1944), la Sécurité sociale (1945), la Ve République fondée en 1958 avec le général de Gaulle ; des droits pour les femmes, dont ceux "
    + "de 1965 ; une société transformée — les transports, la maison, les loisirs, Internet — ; la construction européenne, du traité de Rome (1957) à "
    + "l'euro. Le programme donne « 2000 : l'euro remplace le franc » : la monnaie unique naît en 1999 ; ses pièces et ses billets remplacent le franc "
    + "en 2002.",
  seances: [
    etape("Une République démocratique et sociale", "citer un exemple de réforme sociale, et la date de la fondation de la Ve République.",
      "Qu'est-ce qui change pour les Français après la guerre ?",
      "Lire le document ; observer l'affiche de la Sécurité sociale, une photographie des premières électrices ; compléter la frise du thème.",
      "En 1944, les femmes obtiennent le droit de vote ; en 1945, la Sécurité sociale protège contre la maladie et la vieillesse. En 1958, le général de "
        + "Gaulle fonde la Ve République, celle d'aujourd'hui.", DOCUMENT),
    etape("Des droits pour les femmes", "citer un exemple de droit des femmes.",
      "Les femmes ont-elles toujours eu les mêmes droits que les hommes ?",
      "Relier chaque date au droit obtenu ; chercher ce que la loi de 1965 change pour une femme mariée ; débattre de ce qui reste à faire pour "
        + "l'égalité, en lien avec l'enseignement moral et civique.",
      "Depuis 1944, les femmes obtiennent peu à peu les mêmes droits : voter, travailler et ouvrir un compte sans l'autorisation du mari (1965), "
        + "être payées autant que les hommes (1972)."),
    etape("La vie a changé", "décrire les transformations de la société française depuis 1945.",
      "La vie de nos grands-parents, enfants, ressemblait-elle à la nôtre ?",
      "Trier : vers 1950, aujourd'hui ; préparer des questions et interroger un grand-parent ou une personne âgée ; présenter une innovation et ce "
        + "qu'elle a changé.",
      "Depuis 1945, la société s'est transformée : la voiture, le TGV, l'avion ; la machine à laver, la télévision, Internet ; les supermarchés, les "
        + "loisirs, les vacances ; beaucoup moins de paysans. C'est la société de consommation.", ECRIRE),
    etape("La construction européenne", "raconter les grandes étapes de la construction européenne.",
      "Pourquoi des pays qui se sont fait la guerre décident-ils de s'unir ?",
      "Lire le document ; placer sur la frise 1957, 1992, 2002 ; colorier sur la carte de l'Europe les six pays fondateurs.",
      "Pour rendre la guerre impossible, six pays mettent en commun leur charbon et leur acier en 1951, puis créent la Communauté économique européenne "
        + "par le traité de Rome en 1957. En 1992, le traité de Maastricht crée l'Union européenne ; en 2002, l'euro remplace le franc.", DOCUMENT),
    evaluation("citer une réforme sociale, un droit des femmes et la date de la Ve République, décrire les transformations de la société et raconter la construction européenne",
      "La frise de 1945 à aujourd'hui reste affichée."),
  ],
};

// ── Géographie, CM1 : la diversité des modes de vie dans le monde ─────────

const SE_NOURRIR_CM1: Demarche = {
  id: "se-nourrir-cm1", nom: "Se nourrir (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment se nourrit-on dans le monde ? » La provenance de ce que mangent les élèves, sur le planisphère ; la différence entre produits "
    + "agricoles et produits transformés ; la chaîne de production d'un aliment — un yaourt — ; les pratiques alimentaires d'un pays riche et d'un pays "
    + "en développement : deux pays à ration très riche sur deux continents — les États-Unis, la France —, deux pays à ration insuffisante — Madagascar, "
    + "Haïti —, la malnutrition et la sous-nutrition. Le programme lui donne une ou deux périodes.",
  seances: [
    etape("Ce que nous mangeons", "identifier la provenance des principaux aliments que nous consommons.",
      "D'où viennent les aliments de la cantine ?",
      "Relever les menus de la semaine et les étiquettes des emballages ; relier chaque aliment à sa provenance ; localiser les lieux sur le planisphère "
        + "de la classe avec les étiquettes.",
      "Une partie de ce que nous mangeons vient de France ; une autre vient de loin, d'autres continents : la banane, le cacao, le café, le riz."),
    etape("Produit agricole, produit transformé", "décrire la différence entre produits agricoles et produits transformés.",
      "Le yaourt pousse-t-il dans un champ ?",
      "Trier les aliments ; retrouver, pour chaque produit transformé, le produit agricole d'où il vient ; lire la liste des ingrédients d'un biscuit.",
      "Le produit agricole sort de la ferme : le lait, le blé, la pomme. Le produit transformé est fabriqué à partir de lui, souvent en usine : le "
        + "yaourt, le pain, la compote."),
    etape("La chaîne de production d'un aliment", "décrire la chaîne de production d'un aliment consommé.",
      "Comment le lait de la ferme devient-il le yaourt du réfrigérateur ?",
      "Remettre dans l'ordre les étapes de la production d'un yaourt ; en faire un schéma fléché ; si c'est possible, visiter une ferme ou une laiterie, "
        + "ou suivre un autre aliment : un biscuit, un fruit.",
      "Une chaîne de production : la ferme, la collecte, l'usine, l'emballage, le transport, le magasin, le consommateur. Chaque étape a ses métiers.",
      "Une production graphique : le schéma fléché de la chaîne, avec sa légende."),
    etape("Manger dans le monde", "décrire les différences des pratiques alimentaires entre un pays riche et un pays en développement.",
      "Mange-t-on partout à sa faim ?",
      "Lire le document ; comparer les photographies des repas d'une semaine de deux familles, dans deux pays ; localiser les quatre pays repères sur "
        + "le planisphère.",
      "Aux États-Unis ou en France, on mange à sa faim, souvent trop. À Madagascar ou en Haïti, beaucoup ne mangent pas assez : c'est la sous-nutrition ; "
        + "d'autres mangent mal : c'est la malnutrition.", DOCUMENT),
    evaluation("décrire les différences d'alimentation dans le monde, distinguer produits agricoles et transformés, et décrire une chaîne de production",
      "Les quatre pays repères restent sur le planisphère."),
  ],
};

const INEGALITES_CM1: Demarche = {
  id: "inegalites-monde-cm1", nom: "Les inégalités dans le monde (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment décrire les inégalités de niveau de vie dans le monde ? » Localiser et nommer les aires régionales — l'Afrique subsaharienne, le "
    + "Maghreb, l'Amérique du Nord, l'Amérique du Sud, l'Asie du Sud-Est, l'Asie de l'Est, l'Europe, l'Océanie — ; l'inégal accès à l'eau, ou à la "
    + "santé, ou à l'éducation — la séquence propose l'eau et l'école — ; comparer deux familles de deux pays. Le programme lui donne une ou deux périodes.",
  seances: [
    etape("Les aires régionales", "localiser et nommer sur un planisphère les aires régionales.",
      "Comment découper le monde en grandes régions ?",
      "Remobiliser les continents ; relier chaque aire régionale à des pays qui en font partie ; colorier les aires sur un planisphère et y coller les "
        + "étiquettes.",
      "Huit aires régionales : l'Afrique subsaharienne, le Maghreb, l'Amérique du Nord, l'Amérique du Sud, l'Asie du Sud-Est, l'Asie de l'Est, l'Europe, "
        + "l'Océanie."),
    etape("L'accès à l'eau potable", "identifier une manifestation des inégalités de niveau de vie : l'accès à l'eau.",
      "Tout le monde a-t-il de l'eau potable au robinet ?",
      "Lire le document ; observer des photographies de la corvée d'eau ; lire une carte de l'accès à l'eau potable par pays et repérer les aires "
        + "régionales les moins favorisées.",
      "Plus de deux milliards de personnes n'ont pas d'eau potable sûre chez elles, surtout en Afrique subsaharienne. L'eau sale rend malade.", DOCUMENT),
    etape("Aller à l'école dans le monde", "identifier une autre manifestation des inégalités : l'accès à l'éducation.",
      "Tous les enfants du monde vont-ils à l'école ?",
      "Lire le document ; comparer des photographies de classes dans plusieurs pays ; chercher sur une carte où les enfants vont le moins à l'école.",
      "Environ 250 millions d'enfants et de jeunes ne vont pas à l'école, surtout en Afrique subsaharienne et en Asie du Sud ; les filles plus souvent "
        + "que les garçons."),
    etape("Comparer deux familles", "identifier les manifestations des inégalités de niveau de vie dans le monde en comparant deux familles.",
      "Comment vit une famille ailleurs dans le monde ?",
      "Observer les photographies de deux familles de deux pays — leur logement, leur eau, leur cuisine, leur école — ; compléter le tableau ; écrire "
        + "une phrase qui compare leur niveau de vie.",
      "Le niveau de vie se lit dans le logement, l'accès à l'eau, à l'école, à la santé, les revenus : les inégalités sont fortes entre les aires "
        + "régionales, et à l'intérieur d'un même pays.", ECRIRE),
    evaluation("localiser et nommer les aires régionales et décrire une inégalité de niveau de vie", "Les aires régionales restent sur le planisphère."),
  ],
};

const SE_DEPLACER_CM1: Demarche = {
  id: "se-deplacer-cm1", nom: "Se déplacer (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment se déplace-t-on dans le monde ? » Les déplacements des élèves de la classe, dont la marche, à la journée, à la semaine, en vacances ; "
    + "deux unités de mesure — la distance en kilomètres, la distance en temps — ; les modes de transport et leurs infrastructures : l'avion et l'aéroport, "
    + "le bateau et le port, le train et la gare, la voiture et la route, le métro et la station, le vélo et la voie cyclable ; se déplacer ailleurs "
    + "dans le monde.",
  seances: [
    etape("Nos déplacements", "identifier la diversité de leurs modes de déplacement, à la journée, à la semaine, en vacances.",
      "Comment venons-nous à l'école ? Et le week-end, en vacances ?",
      "Remplir le tableau de ses déplacements ; faire le relevé de la classe : un diagramme des modes de transport pour venir à l'école ; mesurer un "
        + "trajet sur un plan de la commune.",
      "Nous nous déplaçons à pied, à vélo, en bus, en voiture, en train ; le mode dépend de la distance et du moment : la journée, la semaine, les vacances."),
    etape("Distance en kilomètres, distance en temps", "associer les modes de déplacement à la distance à parcourir, en kilomètres et en temps.",
      "Un lieu loin, c'est loin comment ?",
      "Lire le document ; calculer la durée d'un même trajet à pied, à vélo, en voiture ; comparer un trajet Paris-Marseille en voiture, en train, en "
        + "avion, porte à porte.",
      "Deux unités de mesure : la distance en kilomètres, la distance en temps. La seconde dépend du mode de transport et des infrastructures."),
    etape("Modes de transport et infrastructures", "nommer les principaux modes de transport de personnes et leurs infrastructures.",
      "Que faut-il construire pour que l'on puisse se déplacer ?",
      "Relier chaque mode de transport à son infrastructure ; chercher sur une photographie aérienne de la commune les routes, la gare, les pistes "
        + "cyclables ; observer le plan d'un aéroport ou d'un port.",
      "Chaque mode de transport a ses infrastructures : l'avion et l'aéroport, le bateau et le port, le train et la gare, la voiture et la route, le "
        + "métro et la station, le vélo et la voie cyclable."),
    etape("Se déplacer dans le monde", "comparer des façons de se déplacer dans d'autres régions du monde.",
      "Va-t-on à l'école de la même façon partout dans le monde ?",
      "Observer des photographies d'enfants qui vont à l'école, dans plusieurs pays ; les localiser sur le planisphère ; comparer avec nos déplacements : "
        + "la distance, la durée, le mode de transport.",
      "Selon les lieux, on marche des kilomètres, on prend le métro, le bateau, le vélo : les déplacements dépendent des distances, des infrastructures "
        + "et du niveau de vie.", ECRIRE),
    evaluation("associer modes de transport et infrastructures, et distinguer distance en kilomètres et distance en temps",
      "Le relevé des déplacements de la classe reste affiché."),
  ],
};

const INTERNET_CM1: Demarche = {
  id: "internet-cm1", nom: "Communiquer dans le monde avec Internet (CM1)", famille: FAMILLE, source: PROGRAMME_HG_C3,
  resume: "« Comment communique-t-on avec Internet dans le monde ? » Les usages d'Internet, à partir des pratiques des élèves ; un réseau de câbles "
    + "continentaux et sous-marins reliant les aires régionales, et des satellites ; les principales concentrations de câbles sous-marins ; l'inégal accès "
    + "à Internet dans le monde, à partir de la carte du taux d'accès par pays, et en France, à partir de la carte du déploiement de la 5G.",
  seances: [
    etape("Nos usages d'Internet", "décrire la diversité des usages d'Internet à partir de leurs pratiques.",
      "Que faisons-nous avec Internet ?",
      "Remplir le tableau de ses usages ; faire le relevé de la classe ; classer les usages : s'informer, communiquer, se divertir, apprendre ; rappeler "
        + "les règles d'un usage prudent.",
      "On utilise Internet pour chercher, apprendre, écrire, regarder, jouer, appeler, à la maison et à l'école."),
    etape("Comment fonctionne Internet ?", "expliquer qu'Internet repose sur un réseau de câbles continentaux et sous-marins reliant les aires régionales, ainsi que sur des satellites.",
      "Comment un message va-t-il de la France au Japon en une seconde ?",
      "Lire le document ; observer la carte mondiale des câbles sous-marins ; repérer les principales concentrations de câbles et les aires qu'ils "
        + "relient ; coller les étiquettes sur le planisphère.",
      "Internet repose sur des câbles — sur les continents et au fond des océans — et sur des satellites. Les câbles sous-marins se concentrent entre "
        + "l'Amérique du Nord, l'Europe et l'Asie de l'Est.", DOCUMENT),
    etape("L'accès à Internet dans le monde", "décrire les inégalités d'accès à Internet à l'échelle mondiale.",
      "Tout le monde a-t-il accès à Internet ?",
      "Lire le document ; lire la carte du taux d'accès de la population à Internet, par pays ; nommer une aire régionale très bien reliée et une aire "
        + "faiblement reliée.",
      "Environ deux personnes sur trois utilisent Internet. Presque tout le monde est connecté en Europe et en Amérique du Nord, un peu plus d'une "
        + "personne sur trois en Afrique subsaharienne."),
    etape("L'accès à Internet en France", "décrire les inégalités d'accès à Internet à l'échelle de la France.",
      "En France, tout le monde a-t-il le même Internet ?",
      "Lire la carte du déploiement de la 5G en France ; chercher le réseau de la commune de l'école ; comparer une grande ville et un village de "
        + "montagne.",
      "En France aussi, l'accès est inégal : la fibre et la 5G dans les villes ; un réseau faible, voire des zones blanches, dans certaines campagnes et "
        + "en montagne.", ECRIRE),
    evaluation("expliquer comment Internet relie les continents, et décrire les inégalités d'accès dans le monde et en France",
      "Les câbles sous-marins restent tracés sur le planisphère."),
  ],
};

// ── Géographie, CM2 : la France, l'Union européenne ───────────────────────

const TERRITOIRE_CM2: Demarche = {
  id: "territoire-francais-cm2", nom: "L'organisation du territoire français (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Comment est organisé le territoire français ? » Les cinq principales agglomérations ; les principaux axes autoroutiers et ferroviaires, en "
    + "étoile autour de Paris ; le découpage administratif — la commune, le département, la région — ; les dix-huit régions administratives et leur "
    + "capitale ; les caractéristiques de deux régions, dont celle de l'école ; le département où vit l'élève ; un croquis du territoire, la production "
    + "graphique de l'année. Le programme lui donne deux périodes.",
  seances: [
    etape("Les grandes agglomérations et les grands axes", "localiser et nommer les cinq principales agglomérations et les principaux axes de transport.",
      "Où vivent la plupart des Français ? Comment les grandes villes sont-elles reliées ?",
      "Lire le document ; localiser sur un fond de carte Paris, Lyon, Marseille, Lille, Toulouse ; tracer les grandes autoroutes et les lignes à grande "
        + "vitesse ; coller les étiquettes.",
      "Les cinq principales agglomérations : Paris, Lyon, Marseille, Lille, Toulouse. Les grands axes partent de Paris, en étoile.", DOCUMENT),
    etape("Commune, département, région", "connaitre le découpage administratif du territoire français.",
      "Qui décide pour notre école, notre collège, notre lycée ?",
      "Lire le document ; chercher le maire de la commune, le numéro et la préfecture du département, la capitale de la région ; si c'est possible, "
        + "visiter la mairie.",
      "La France est découpée en communes, en départements — 101 — et en régions — 18, dont 5 en outre-mer. La commune s'occupe des écoles, le "
        + "département des collèges, la région des lycées."),
    etape("Les dix-huit régions", "localiser et nommer les dix-huit régions administratives et leur capitale.",
      "Combien de régions compte la France ? Où sont-elles ?",
      "Compléter le tableau des régions et de leur capitale ; colorier les régions sur un fond de carte, sans oublier les cinq régions d'outre-mer ; "
        + "jouer à retrouver une région à partir de sa capitale.",
      "Dix-huit régions : treize dans l'Hexagone, cinq en outre-mer — la Guadeloupe, la Martinique, la Guyane, La Réunion, Mayotte —, chacune avec sa "
        + "capitale régionale."),
    etape("Ma région et une autre", "décrire les principales caractéristiques d'au moins deux régions, dont celle de l'école.",
      "Qu'est-ce qui fait notre région ? En quoi est-elle différente d'une autre ?",
      "Chercher dans des documents — cartes, photographies, sites de la région — la capitale, le relief, les grandes villes, les activités de sa région "
        + "et d'une autre ; compléter le tableau ; présenter sa région à l'oral.",
      "Chaque région a sa capitale, son relief, ses villes, ses activités, ses paysages. L'élève connaît sa région et son département."),
    etape("Le croquis du territoire français", "réaliser un croquis de l'organisation du territoire français.",
      "Comment montrer sur une seule carte l'organisation du territoire ?",
      "Sur un fond de carte, réaliser un croquis : les cinq agglomérations, les grands axes, la région et le département de l'école ; construire la "
        + "légende ensemble.",
      "Un croquis a un titre, une légende, des figurés : des points pour les villes, des traits pour les axes, des couleurs pour les régions.",
      "La production graphique de l'année, que le programme demande : la légende se construit avec les élèves."),
    evaluation("localiser et nommer sur un fond de carte les repères du thème : les agglomérations, les axes, les régions et leur capitale, le département de l'élève",
      "Le croquis reste affiché ; les régions se remobilisent en rituel de localisation."),
  ],
};

const EAU_DOUCE_CM2: Demarche = {
  id: "eau-douce-cm2", nom: "Les usages de l'eau douce en France (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Pourquoi gérer l'eau douce en France ? » L'eau, une ressource limitée ; les grands fleuves — la Garonne, la Loire, le Maroni, le Rhin, le "
    + "Rhône, la Seine —, les principaux massifs — les Alpes, la Corse, le Jura, le Massif central, les Pyrénées, les Vosges — et deux grands lacs, dont "
    + "un lac naturel ; les différents usages de l'eau ; un conflit d'usages, à partir d'un exemple précis — le lac de Serre-Ponçon, ou un exemple "
    + "proche — ; gérer l'eau près de chez nous, dans le contexte du dérèglement climatique. Le programme lui donne deux périodes.",
  seances: [
    etape("L'eau douce, une ressource limitée", "comprendre que l'eau douce est une ressource limitée.",
      "Il y a beaucoup d'eau sur la Terre : pourquoi faudrait-il l'économiser ?",
      "Lire le document ; représenter la part de l'eau douce avec un litre d'eau et une cuillère ; remobiliser le cycle de l'eau des sciences ; chercher "
        + "d'où vient l'eau du robinet de l'école.",
      "L'eau douce est rare : environ 3 % de l'eau de la Terre, surtout gelée. Nous utilisons l'eau des rivières, des lacs et des nappes phréatiques. "
        + "Avec le dérèglement climatique, les sécheresses sont plus fréquentes.", DOCUMENT),
    etape("Fleuves, massifs et lacs", "localiser et nommer les grands fleuves, les principaux massifs et deux grands lacs français.",
      "D'où viennent les fleuves ? Où vont-ils ?",
      "Relier chaque fleuve à une ville qu'il traverse ; repasser les fleuves en bleu et colorier les massifs sur un fond de carte ; coller les étiquettes ; "
        + "situer le lac du Bourget, naturel, et le lac de Serre-Ponçon, de barrage.",
      "Six grands fleuves : la Seine, la Loire, la Garonne, le Rhône, le Rhin, et le Maroni en Guyane. Les massifs : les Alpes, les Pyrénées, le Massif "
        + "central, le Jura, les Vosges, la Corse ; c'est là que naissent les cours d'eau."),
    etape("Les usages de l'eau", "décrire les différents usages de l'eau en France.",
      "À quoi sert l'eau, en dehors de la maison ?",
      "Trier les usages de l'eau ; lire un graphique de la consommation d'eau par usage ; chercher les usages de l'eau dans la commune : la station de "
        + "pompage, les champs irrigués, une usine, une piscine.",
      "On utilise l'eau à la maison, pour l'agriculture — l'irrigation —, pour l'industrie et l'énergie, pour les loisirs et le transport."),
    etape("Un conflit d'usages", "expliquer, à partir d'un exemple précis, que l'eau est une ressource convoitée faisant l'objet de conflits d'usages.",
      "Que se passe-t-il quand l'eau manque et que tout le monde en a besoin ?",
      "Lire le document ; repérer chaque usager et ce qu'il demande ; jouer la réunion où l'on doit partager l'eau ; écrire ce qu'est un conflit "
        + "d'usages, avec l'exemple étudié.",
      "Quand l'eau manque, ses usagers — agriculteurs, villes, tourisme, production d'électricité — s'opposent : c'est un conflit d'usages. Il faut "
        + "partager et gérer l'eau.", ECRIRE),
    etape("Gérer l'eau près de chez nous", "identifier comment l'eau est gérée et économisée près de l'école.",
      "Qui décide du partage de l'eau, et que pouvons-nous faire ?",
      "Chercher qui gère l'eau de la commune et lire un arrêté de restriction en période de sécheresse ; relever les gestes qui économisent l'eau à "
        + "l'école ; si c'est possible, visiter une station d'épuration.",
      "L'eau se gère à plusieurs : la commune, le préfet, les agences de l'eau, chacun de nous. Économiser l'eau aide à la partager."),
    evaluation("décrire les usages de l'eau, expliquer un conflit d'usages et localiser les fleuves, les massifs et les lacs",
      "Les fleuves et les massifs restent sur la carte de la classe."),
  ],
};

const UNION_EUROPEENNE_CM2: Demarche = {
  id: "union-europeenne-cm2", nom: "L'Union européenne (CM2)", famille: FAMILLE, source: PROGRAMME_HG_C3_CM2,
  resume: "« Qu'est-ce que l'Union européenne ? » La différence entre le continent européen et la construction politique qu'est l'Union européenne, "
    + "sur un fond de carte de l'Europe dans ses limites conventionnelles ; le traité de Rome (1957), le traité de Maastricht (1992) ; dix pays membres, "
    + "dont les six fondateurs, localisés et nommés ; un aménagement réalisé avec le soutien de l'Union européenne dans la région de l'école. Le programme "
    + "lui donne une période.",
  seances: [
    etape("L'Europe, un continent", "expliquer la différence entre le continent européen et l'Union européenne.",
      "La Suisse est-elle en Europe ? Est-elle dans l'Union européenne ?",
      "Repérer les limites conventionnelles de l'Europe sur un fond de carte ; trier les pays : dans l'Union européenne, ou hors de l'Union ; colorier "
        + "l'Union européenne.",
      "L'Europe est un continent, limité à l'est, par convention, par les monts Oural et le Caucase. L'Union européenne est une construction politique "
        + "de 27 de ses États."),
    etape("Qu'est-ce que l'Union européenne ?", "expliquer ce qu'est l'Union européenne, ses traités et ses symboles.",
      "Pourquoi un drapeau bleu à étoiles flotte-t-il à côté du drapeau français ?",
      "Lire le document ; observer le drapeau, une pièce d'euro, une photographie du Parlement européen à Strasbourg ; placer 1957 et 1992 sur la frise.",
      "L'Union européenne unit 27 États par des traités — Rome en 1957, Maastricht en 1992. Elle a un Parlement élu, un drapeau, une devise ; une "
        + "vingtaine de ses pays partagent l'euro.", DOCUMENT),
    etape("Les pays de l'Union", "localiser et nommer dix pays membres de l'Union européenne, dont les six pays fondateurs.",
      "Quels sont les pays de l'Union européenne ?",
      "Relier chaque pays fondateur à sa capitale ; compléter le tableau de dix pays et de leur capitale ; les colorier sur la carte de l'Europe et y "
        + "coller les étiquettes.",
      "Six pays fondateurs : l'Allemagne, la Belgique, la France, l'Italie, le Luxembourg, les Pays-Bas ; aujourd'hui, 27 pays, dont l'Espagne, le "
        + "Portugal, la Pologne, la Grèce, la Suède."),
    etape("L'Union européenne près de chez nous", "identifier un aménagement réalisé avec le soutien de l'Union européenne dans la région de l'école.",
      "L'Union européenne, est-ce seulement loin, à Bruxelles et à Strasbourg ?",
      "Chercher un panneau « projet cofinancé par l'Union européenne » près de l'école, ou sur le site de la région ; compléter la fiche du projet ; le "
        + "présenter à la classe.",
      "L'Union européenne aide à financer des aménagements dans notre région : des routes, des gares, des équipements, des rénovations."),
    evaluation("expliquer la différence entre l'Europe et l'Union européenne, et localiser et nommer dix pays membres dont les six fondateurs",
      "La carte de l'Union européenne reste affichée."),
  ],
};

// ── Le CM2 du programme de 2020, encore en vigueur en 2026-2027 ───────────
//
// La page Éduscol du cycle 3 (septembre 2026) : le programme de 2026 entre en
// vigueur au CM2 à la rentrée 2027 ; cette année, le CM2 suit encore celui de
// 2020, dont Éduscol garde les fiches « S'approprier les différents thèmes du
// programme » (mars 2016). À la demande de l'enseignant (octobre 2026), une
// séquence par thème, d'après sa fiche : sa problématique, ses sous-thèmes,
// ses pistes de mise en œuvre, ses repères, et ses écueils évités. Elles ne
// sont la séquence d'aucune compétence du référentiel, qui suit le programme
// de 2026 : le dossier CM2 les range à part, et celles d'histoire se
// proposent à côté des compétences de 2026 qui en sont proches (`visee`).

const EDUSCOL_2020 = (discipline: "histoire" | "géographie", theme: string) =>
  `Éduscol, ressources d'accompagnement du cycle 3 (mars 2016) — « S'approprier les différents thèmes du programme », ${discipline}, CM2, `
  + `« ${theme} » : problématique, sous-thèmes, mise en œuvre et repères ; programme de 2020, encore en vigueur au CM2 en 2026-2027`;

const TEMPS_REPUBLIQUE_CM2: Demarche = {
  id: "temps-republique-cm2", nom: "Le temps de la République — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("histoire", "Thème 1 - Le temps de la République"),
  visee: { intitule: /lois fondatrices de la République|symboles de la République|participent à la vie politique/i, niveaux: ["CM2"] },
  resume: "« Comment les Français se sont-ils unis autour de la République ? » La problématique de la fiche Éduscol : quand la France est devenue une "
    + "République, le rôle qu'y joue l'école, ce qu'est la citoyenneté. 1892, la République fête ses cent ans ; ses symboles ; l'école primaire au temps "
    + "de Jules Ferry, d'hier à aujourd'hui ; des républiques, une démocratie : des libertés, des droits et des devoirs. Repères : 1880, le 14 juillet "
    + "fête nationale ; 1881-1882, les lois scolaires de Jules Ferry ; 1905, la séparation des Églises et de l'État ; 1944, le droit de vote des femmes. "
    + "Écueils que la fiche signale : la liste détaillée des régimes, un traitement trop abstrait, une République idéalisée.",
  seances: [
    etape("1892 : la République fête ses cent ans", "expliquer que la République, née en 1792, ne s'installe durablement qu'à partir de 1870.",
      "Une affiche du centenaire de 1892 : qu'est-ce qu'on y fête ? Depuis quand la France est-elle une République ?",
      "Observer l'affiche du centenaire — Marianne, les symboles de la Révolution étudiée au CM1 — ; lire le document ; observer les portraits des "
        + "souverains du XIXe siècle, sans en dresser la liste ; compléter la frise.",
      "La République naît en 1792 ; rois et empereurs reviennent ; à partir de 1870, la IIIe République s'installe et unit les Français autour des "
        + "symboles de la Révolution.", RECIT),
    etape("Les symboles de la République", "nommer les symboles de la République et dire leur sens.",
      "Où voit-on la République autour de nous ?",
      "Chercher les symboles sur la façade de la mairie et de l'école, sur les pièces ; relier chaque symbole à sa description, en lien avec "
        + "l'enseignement moral et civique.",
      "Le drapeau tricolore, La Marseillaise, le 14 juillet, Marianne, la devise : des symboles qui rassemblent les Français."),
    etape("L'école au temps de Jules Ferry", "expliquer le rôle de l'école primaire de Jules Ferry dans la République.",
      "Comment allait-on à l'école vers 1900 ?",
      "Lire le document ; observer des photographies de classes de la IIIe République — celles du Musée national de l'Éducation — et le bâtiment de "
        + "l'école ou de la mairie-école ; relever les objets, les règles, ce qu'on y apprend ; observer une carte murale de l'empire colonial.",
      "Gratuite (1881), obligatoire et laïque (1882), l'école de Jules Ferry instruit tous les enfants de 6 à 13 ans et forme des citoyens.", DOCUMENT),
    etape("L'école d'hier et d'aujourd'hui", "comparer l'école vers 1900 et l'école d'aujourd'hui.",
      "Qu'est-ce qui a changé à l'école depuis 1900 ?",
      "Trier les étiquettes ; chercher l'histoire du bâtiment de l'école — sa date, ses entrées des filles et des garçons — dans les archives de la "
        + "commune ou de la famille ; comparer les rites de l'école d'hier avec ceux de la classe.",
      "L'école a changé — la mixité, les outils, l'instruction jusqu'à 16 ans —, mais elle reste au cœur de la République."),
    etape("Des droits et des devoirs", "dire ce qu'est la citoyenneté : des libertés, des droits et des devoirs.",
      "Qu'est-ce qu'être citoyen ?",
      "Lire le document ; classer des droits et des devoirs ; débattre, avec l'enseignement moral et civique, d'un droit conquis : l'égalité entre "
        + "filles et garçons, ou le droit à l'éducation.",
      "Le citoyen a des droits et des devoirs ; ils se sont étendus : le vote des hommes en 1848, celui des femmes en 1944, la Déclaration universelle "
        + "des droits de l'homme en 1948.", ECRIRE),
    evaluation("expliquer quand la France est devenue une République, nommer ses symboles, dire le rôle de l'école et ce qu'est la citoyenneté",
      "La frise de la République reste affichée."),
  ],
};

const AGE_INDUSTRIEL_2020_CM2: Demarche = {
  id: "age-industriel-2020-cm2", nom: "L'âge industriel en France — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("histoire", "Thème 2 - L'âge industriel en France"),
  visee: { intitule: /transformations de la vie quotidienne|progrès de la médecine|ouvrières et des ouvriers/i, niveaux: ["CM2"] },
  resume: "« Comment l'industrialisation a-t-elle transformé les manières de travailler et de vivre ? » La problématique de la fiche Éduscol : ce qu'est "
    + "l'industrialisation, ce qu'elle change dans la manière de produire, la vie quotidienne et la société, dans les villes et les campagnes. Quatre "
    + "sujets d'étude — énergies et machines ; le travail à la mine, à l'usine, à l'atelier, au grand magasin ; la ville industrielle ; le monde rural — "
    + "dont le programme fait choisir deux, d'après le patrimoine local : la séquence les propose tous. Repères : la révolution industrielle en "
    + "Angleterre à la fin du XVIIIe siècle, l'essor de l'industrialisation en France après 1830, la France majoritairement urbaine en 1931.",
  seances: [
    etape("Qu'est-ce que l'âge industriel ?", "situer l'âge industriel et dire ce qu'est l'industrialisation.",
      "Comment fabriquait-on avant les usines ?",
      "Comparer un atelier d'artisan et une usine du XIXe siècle ; compléter la frise : la révolution industrielle en Angleterre, l'essor en France "
        + "après 1830, la France urbaine en 1931 ; choisir avec la classe les deux sujets d'étude.",
      "L'industrialisation : produire en grand, avec des machines, dans des usines ; elle commence en Angleterre et s'étend en France après 1830."),
    etape("Sujet d'étude : énergies et machines", "expliquer comment les énergies et les machines changent la manière de produire et de se déplacer.",
      "Qu'est-ce qui fait tourner les machines ?",
      "Lire le document ; observer des machines du Musée des arts et métiers ou d'un musée proche — la machine à vapeur, la locomotive, le moteur — ; "
        + "relier chaque énergie à ses usages.",
      "Le charbon et la vapeur, puis l'électricité et le pétrole après 1880, font tourner les usines, les trains, les bateaux, les automobiles.", DOCUMENT),
    etape("Sujet d'étude : le travail à la mine, à l'usine, à l'atelier, au grand magasin", "décrire les conditions de travail à l'âge industriel, et leur diversité.",
      "Comment travaille-t-on à l'âge industriel ?",
      "Lire un ou deux documents, selon le sujet choisi ; comparer des photographies et des tableaux de mines, d'usines, d'ateliers, de grands "
        + "magasins ; s'aider d'un écomusée proche.",
      "Des journées longues, un travail dur et souvent dangereux, une discipline stricte ; les ouvriers s'unissent : grèves, syndicats en 1884.", DOCUMENT),
    etape("Sujet d'étude : la ville industrielle", "expliquer comment l'industrialisation transforme la ville.",
      "Que reste-t-il de l'âge industriel dans la ville la plus proche ?",
      "Lire le document ; chercher des traces dans une ville proche — une gare, un pont ou une halle en métal, une cité ouvrière, une usine — et les "
        + "situer sur un plan ; les visiter si c'est possible.",
      "Les villes grandissent et changent : gares, usines, quartiers ouvriers et bourgeois ; en 1931, la majorité des Français vit en ville."),
    etape("Sujet d'étude : le monde rural", "expliquer comment l'industrialisation transforme les campagnes.",
      "Les campagnes sont-elles restées à l'écart de l'industrialisation ?",
      "Lire le document ; comparer des outils agricoles d'hier et d'aujourd'hui, au musée local ; chercher, avec des travaux d'histoire locale, ce qui a "
        + "changé dans la commune : le train, les cultures, l'électricité.",
      "Les campagnes se vident — l'exode rural —, se désenclavent, se spécialisent, puis se modernisent : la France reste longtemps rurale."),
    etape("La vie quotidienne change", "expliquer les transformations de la vie quotidienne à l'âge industriel.",
      "Qu'est-ce que l'industrialisation change dans la vie de tous les jours ?",
      "Trier les étiquettes : avant le XIXe siècle, à la fin du XIXe siècle ; relier les changements au sujet d'étude choisi ; écrire comment un "
        + "progrès change la vie.",
      "L'éclairage, les transports, l'eau courante, les communications, les vêtements : la vie quotidienne change, d'abord en ville.", ECRIRE),
    evaluation("dire ce qu'est l'industrialisation, décrire le travail à l'âge industriel et ce qu'il change en ville ou à la campagne",
      "La frise de l'âge industriel reste affichée."),
  ],
};

const GUERRES_UE_CM2: Demarche = {
  id: "guerres-mondiales-ue-cm2", nom: "La France, des guerres mondiales à l'Union européenne — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("histoire", "Thème 3 - La France, des guerres mondiales à l'Union européenne"),
  visee: {
    intitule: /Première Guerre mondiale|vie sur le front|mobilisation humaine|bilan humain de la guerre|Seconde Guerre mondiale|sous l.Occupation|Résistance|Justes parmi les Nations|construction européenne/i,
    niveaux: ["CM2"],
  },
  resume: "« Comment les traumatismes des deux guerres mondiales sont-ils à l'origine de la recherche d'une paix durable en Europe ? » La problématique "
    + "de la fiche Éduscol : la France a connu deux conflits mondiaux, d'une violence extrême et massive, et cette expérience l'a conduite à s'engager "
    + "dans la construction européenne. Les traces des guerres dans la commune, des témoignages — un poilu à Verdun, un enfant juif sous l'Occupation —, "
    + "la comparaison des deux guerres, puis la construction de la paix : 1951, 1957, 1992, les droits de l'homme, la citoyenneté européenne. Écueils "
    + "que la fiche signale : traiter les deux guerres sans les relier, une chronologie trop détaillée, une place trop petite pour l'après 1945.",
  seances: [
    etape("Deux guerres mondiales sur la frise", "situer les deux guerres mondiales et la construction européenne sur une frise.",
      "Pourquoi parle-t-on de guerres « mondiales » ?",
      "Compléter la frise : 1914-1918, 1939-1945, 1951, 1957, 1992 ; situer sur un planisphère les pays en guerre.",
      "Deux guerres mondiales au XXe siècle, 1914-1918 et 1939-1945 ; puis, depuis 1951, la construction européenne."),
    etape("Les traces des guerres dans notre commune", "identifier les traces des deux guerres dans leur environnement proche.",
      "Que reste-t-il des guerres dans notre commune ?",
      "Étudier le monument aux morts : compter les noms des deux guerres, chercher les familles ; relever les plaques et les noms de rues ; lire le "
        + "document ; recueillir, si c'est possible, des archives ou des objets de famille.",
      "Chaque commune garde la mémoire de ses morts ; on s'en souvient chaque 11 novembre et chaque 8 mai.", DOCUMENT),
    etape("Combattre dans les tranchées", "raconter la vie des soldats pendant la Première Guerre mondiale, à partir d'un témoignage.",
      "Comment vivaient les poilus à Verdun ?",
      "Lire le document ; écouter le témoignage d'un poilu pendant la bataille de Verdun ; observer des objets : un casque, un masque à gaz.",
      "La guerre de position, les tranchées, Verdun en 1916 : une violence extrême et massive.", RECIT),
    etape("La France dans la Seconde Guerre mondiale", "raconter la défaite, l'Occupation, la Résistance et la persécution des Juifs, à partir d'un témoignage.",
      "Comment la France a-t-elle vécu la Seconde Guerre mondiale ?",
      "Lire les documents ; écouter le témoignage d'un enfant juif caché sous l'Occupation ; situer le débarquement du 6 juin 1944 ; présenter le "
        + "général de Gaulle, dont le parcours relie les deux guerres.",
      "La défaite de 1940, l'Occupation, la collaboration du régime de Vichy, la Résistance, la déportation des Juifs ; la Libération à partir de 1944.",
      "Un sujet grave : des documents choisis, la parole des élèves accueillie."),
    etape("Comparer les deux guerres", "comparer les deux guerres mondiales : les combats, les civils, le bilan.",
      "Qu'ont-elles en commun ? Qu'est-ce qui les distingue ?",
      "Compléter le tableau avec les documents des séances précédentes ; écrire une phrase qui compare les deux guerres.",
      "Deux guerres d'une violence extrême ; la seconde fait encore plus de morts, en majorité des civils.", ECRIRE),
    etape("Construire la paix en Europe", "expliquer que l'expérience des deux guerres a conduit la France à s'engager dans la construction européenne.",
      "Comment éviter une nouvelle guerre en Europe ?",
      "Lire les documents ; observer les cartes de l'Europe en 1957, en 1992 et aujourd'hui ; débattre d'un article de la Déclaration universelle des "
        + "droits de l'homme, en lien avec l'enseignement moral et civique.",
      "Pour rendre la guerre impossible, la France et l'Allemagne se réconcilient et construisent l'Europe : 1951, 1957, 1992 ; les citoyens européens "
        + "ont des droits communs.", DOCUMENT),
    evaluation("situer les deux guerres, expliquer leur violence et pourquoi la France s'est engagée dans la construction européenne",
      "La frise des guerres mondiales et de l'Union européenne reste affichée."),
  ],
};

const SE_DEPLACER_2020_CM2: Demarche = {
  id: "se-deplacer-2020-cm2", nom: "Se déplacer — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("géographie", "Thème 1 - Se déplacer"),
  resume: "« Quels sont les motifs, les modes et les contraintes des déplacements, au quotidien et hors du quotidien ? Quels aménagements leur sont "
    + "liés ? » Les problématiques de la fiche Éduscol, en démarche inductive : se déplacer au quotidien en France, d'après les déplacements de la "
    + "famille, puis dans un autre lieu du monde, pour comparer ; la distance en kilomètres et en temps ; se déplacer de ville en ville, en France, en "
    + "Europe et dans le monde ; un aménagement de transport, l'aéroport international. Repères : le lieu où l'on habite et l'école, un itinéraire "
    + "quotidien, quelques grandes villes françaises, européennes et mondiales.",
  seances: [
    etape("Nos déplacements quotidiens", "décrire les déplacements quotidiens de leur famille : les motifs, les modes, les distances.",
      "Comment se déplace ma famille dans une journée, dans une semaine ?",
      "Remplir le tableau de ses déplacements ; tracer son trajet sur le plan de la commune ou avec un outil de géolocalisation ; faire le relevé de la "
        + "classe.",
      "On se déplace chaque jour pour l'école, le travail, les courses, les loisirs : à pied, à vélo, en car, en voiture, en transports en commun."),
    etape("Distance en kilomètres, distance en temps", "exprimer une distance en kilomètres et en temps, selon le mode de transport.",
      "Un lieu loin, c'est loin comment ?",
      "Lire le document ; calculer la durée d'un même trajet à pied, à vélo, en voiture ; comparer des itinéraires sur un plan ou une carte.",
      "Deux mesures : la distance en kilomètres, la distance en temps, qui dépend du mode de transport et des infrastructures."),
    etape("Se déplacer au quotidien ailleurs dans le monde", "comparer les déplacements quotidiens en France et dans un autre lieu du monde.",
      "Comment les enfants vont-ils à l'école ailleurs dans le monde ?",
      "Lire le document ; regarder un ou deux extraits du film Sur le chemin de l'école ; localiser les pays sur le planisphère ; comparer avec nos "
        + "trajets.",
      "Selon les lieux, on va à l'école à pied, à cheval, en scooter, en car : les déplacements dépendent des distances, des infrastructures, de la "
        + "richesse.", DOCUMENT),
    etape("De ville en ville : les infrastructures", "identifier les infrastructures de transport et les échelles des déplacements.",
      "Que faut-il pour aller loin ?",
      "Lire le document sur l'aéroport de Roissy-Charles-de-Gaulle ; relier les modes de transport et leurs infrastructures ; lire des cartes des "
        + "autoroutes, des lignes à grande vitesse, des vols long-courriers.",
      "Aéroports, gares, ports, autoroutes : des infrastructures où l'on change de mode de transport pour aller en France, en Europe, dans le monde."),
    etape("Nos voyages, en France, en Europe, dans le monde", "localiser des déplacements hors du quotidien, à différentes échelles.",
      "Où sommes-nous déjà allés ? Comment ?",
      "Placer sur des cartes les lieux des vacances, des visites familiales, des rencontres sportives, ou le voyage d'une personne imaginée ; calculer "
        + "les distances en kilomètres et en temps ; coller les étiquettes des villes.",
      "Le tourisme, les visites, les migrations : on se déplace de plus en plus loin et de plus en plus vite ; tous ne le peuvent pas de la même façon.",
      ECRIRE),
    evaluation("décrire les motifs et les modes des déplacements, quotidiens ou plus lointains, et les infrastructures qu'ils demandent",
      "Les villes repères restent sur les cartes de la classe."),
  ],
};

const INTERNET_2020_CM2: Demarche = {
  id: "internet-2020-cm2", nom: "Communiquer d'un bout à l'autre du monde grâce à l'Internet — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("géographie", "Thème 2 - Communiquer d'un bout à l'autre du monde grâce à l'Internet"),
  resume: "« Comment l'Internet met-il les hommes et les territoires en contact ? Tous les êtres humains y ont-ils également accès ? » Les "
    + "problématiques de la fiche Éduscol, en démarche inductive : les usages des élèves et de leur famille ; un monde de réseaux — les câbles "
    + "sous-marins, les serveurs — ; un habitant connecté au monde, par un projet de classe ; des habitants inégalement connectés, dans le monde et en "
    + "France. Écueils que la fiche signale : en rester aux pratiques individuelles, une étude seulement technique, oublier l'éducation aux médias.",
  seances: [
    etape("Pourquoi utilisons-nous Internet ?", "décrire les usages d'Internet, à partir de leurs pratiques.",
      "Que faisons-nous, nous et nos familles, avec Internet ?",
      "Remplir le tableau de ses usages ; faire le relevé de la classe ; classer les usages : s'informer, communiquer, se divertir, acheter, apprendre.",
      "Internet sert à chercher, apprendre, écrire, regarder, jouer, acheter, appeler : il est partout dans la vie quotidienne."),
    etape("Un monde de réseaux", "expliquer qu'Internet repose sur un réseau bien matériel : des câbles, des serveurs, des satellites.",
      "Internet est-il magique ?",
      "Lire le document ; observer la carte mondiale des câbles sous-marins ; représenter par un schéma la mise en réseau des appareils de la classe ; "
        + "coller les étiquettes sur le planisphère.",
      "Les informations circulent par des câbles, jusque sous les océans, et par des satellites ; les grandes entreprises d'Internet sont surtout aux "
        + "États-Unis.", DOCUMENT),
    etape("Un habitant connecté au monde", "expliquer comment Internet met en contact des personnes éloignées, et s'informer avec prudence.",
      "Avec qui la classe peut-elle communiquer grâce à Internet ?",
      "Mener un projet : une correspondance avec une classe lointaine, un article pour Vikidia ou le blog de l'école ; localiser les lieux avec "
        + "lesquels la classe communique ; lire le document.",
      "Internet met en contact des personnes du monde entier ; on vérifie d'où vient une information, et on respecte le droit à l'image.", ECRIRE),
    etape("Des habitants inégalement connectés", "décrire l'inégal accès à Internet dans le monde et en France.",
      "Tout le monde a-t-il accès à Internet ?",
      "Lire le document ; lire le planisphère de la part des habitants connectés, par pays, et la carte de la couverture mobile en France ; repérer des "
        + "zones blanches.",
      "L'accès à Internet est inégal : très fort en Europe et en Amérique du Nord, plus faible en Afrique subsaharienne ; en France, des zones "
        + "blanches dans des campagnes et en montagne.", DOCUMENT),
    evaluation("expliquer comment Internet met en contact les personnes et les lieux, et décrire l'inégal accès à Internet", "Les câbles restent tracés sur le planisphère."),
  ],
};

const MIEUX_HABITER_CM2: Demarche = {
  id: "mieux-habiter-cm2", nom: "Mieux habiter — programme 2020 (CM2)", famille: FAMILLE,
  source: EDUSCOL_2020("géographie", "Thème 3 - Mieux habiter"),
  resume: "« Comment mieux habiter par l'amélioration du cadre de vie et la gestion de l'environnement ? » La problématique de la fiche Éduscol, sur "
    + "un quartier ou une commune proches : favoriser la place de la nature en ville, recycler, habiter un écoquartier — des sous-thèmes que la fiche "
    + "laisse traiter dans l'ordre qu'on veut, et pas forcément tous. Un échange, une sortie et son diagnostic, des propositions présentées. Écueils que "
    + "la fiche signale : opposer la nature et la ville, être trop théorique, idéaliser les écoquartiers.",
  seances: [
    etape("Qu'est-ce qui rend un lieu agréable à vivre ?", "dire ce qui fait un cadre de vie agréable, à partir de leur quartier.",
      "Qu'aimons-nous là où nous habitons ? Que changerions-nous ?",
      "Échanger à partir des lieux que chacun aime fréquenter ; remobiliser le thème « Se déplacer » ; préparer la sortie : le plan du quartier, les "
        + "questions à se poser.",
      "Mieux habiter : un cadre de vie agréable, une place pour la nature, des déplacements faciles, des lieux de rencontre, un environnement respecté."),
    etape("Le diagnostic du quartier", "observer et décrire le cadre de vie d'un quartier : la nature, les déplacements, les déchets, les lieux de rencontre.",
      "Notre quartier est-il agréable à vivre ?",
      "Sortie en petits groupes, avec le plan et le tableau du diagnostic ; photographier, enregistrer ; rencontrer des habitants, un élu, un "
        + "professionnel ; de retour en classe, faire le croquis du quartier.",
      "Le diagnostic : ce qui va bien, ce qui pourrait changer.",
      "Une production graphique : le croquis du quartier, avec ses espaces verts, ses circulations douces, ses points de collecte des déchets."),
    etape("La nature en ville", "expliquer comment et pourquoi on donne une place à la nature en ville.",
      "La nature a-t-elle sa place en ville ?",
      "Lire le document ; repérer les espaces verts, les jardins, les berges sur le plan de la commune ; comparer avec ce qu'on a vu pendant la sortie.",
      "Parcs, jardins partagés, toits couverts de plantes, berges aménagées : la nature abrite des animaux, rafraîchit la ville, réunit les habitants.",
      DOCUMENT),
    etape("Trier et recycler", "décrire la chaîne du tri et du recyclage des déchets.",
      "Que deviennent nos déchets ?",
      "Trier les déchets ; remettre dans l'ordre le chemin d'une bouteille recyclée ; chercher où se trouvent le centre de tri et l'usine "
        + "d'incinération ; si c'est possible, en visiter un, ou un site de compostage.",
      "Trier permet de recycler : moins de déchets, des matières réutilisées, moins de pollution ; on suit les consignes de tri de sa commune."),
    etape("Habiter un écoquartier", "décrire un écoquartier et ce qu'il cherche à améliorer, sans l'idéaliser.",
      "Peut-on construire un quartier pour mieux y vivre ?",
      "Lire le document ; regarder une courte vidéo d'un écoquartier, proche si possible ; relever ce qui concerne l'environnement, les habitants, le "
        + "travail ; chercher aussi ce qui reste difficile.",
      "Un écoquartier limite la pollution, laisse une place à la nature, mêle les habitants et les activités ; il ne règle pas tout.", DOCUMENT),
    etape("Nos propositions pour mieux habiter", "proposer des améliorations pour mieux habiter leur quartier.",
      "Que proposons-nous pour notre quartier ?",
      "Réaliser un poster, une maquette ou un diaporama : le diagnostic et des propositions ; les présenter à une autre classe ou au conseil municipal "
        + "des enfants.",
      "Il n'y a pas une, mais des solutions pour mieux habiter ; elles sont construites par les habitants et les élus.", ECRIRE),
    evaluation("décrire comment on peut mieux habiter : la nature en ville, le tri et le recyclage, l'écoquartier", "Le croquis du quartier reste affiché."),
  ],
};

/** Les six séquences du CM2 du programme de 2020, au choix cette année. */
export const DEMARCHES_HISTOIRE_GEO_CM_2020: Demarche[] = [
  TEMPS_REPUBLIQUE_CM2, AGE_INDUSTRIEL_2020_CM2, GUERRES_UE_CM2, SE_DEPLACER_2020_CM2, INTERNET_2020_CM2, MIEUX_HABITER_CM2,
];

export const DEMARCHES_HISTOIRE_GEO_CM: Demarche[] = [
  MOYEN_AGE_CM1, MONARCHIE_CM1, EXPLORATIONS_CM1, REVOLUTION_CM1,
  REPUBLIQUE_EMPIRE_CM2, VERS_REPUBLIQUE_CM2, AGE_INDUSTRIEL_CM2, PREMIERE_GUERRE_CM2, SECONDE_GUERRE_CM2, DEPUIS_1945_CM2,
  SE_NOURRIR_CM1, INEGALITES_CM1, SE_DEPLACER_CM1, INTERNET_CM1,
  TERRITOIRE_CM2, EAU_DOUCE_CM2, UNION_EUROPEENNE_CM2,
];

/** Les séquences d'histoire du cours moyen ; les autres sont de géographie. */
export const HISTOIRE_CM = new Set(THEMES_HG_CM.filter((t) => t.histoire).map((t) => t.id));

/**
 * La séquence d'une compétence d'histoire-géographie du CM1 ou du CM2 : celle
 * de son thème. Les intitulés arrivent en minuscules, sans accents.
 */
export function demarcheHistoireGeoCM(classe: string, sd: string, cg: string): string | null {
  const theme = (motif: RegExp) => motif.test(cg);
  if (/histoire/.test(sd)) {
    if (classe === "cm1") {
      if (theme(/moyen age/)) return MOYEN_AGE_CM1.id;
      if (theme(/monarchie/)) return MONARCHIE_CM1.id;
      if (theme(/explorations/)) return EXPLORATIONS_CM1.id;
      if (theme(/1789/)) return REVOLUTION_CM1.id;
    }
    if (classe === "cm2") {
      if (theme(/republique a l.empire/)) return REPUBLIQUE_EMPIRE_CM2.id;
      if (theme(/france republicaine/)) return VERS_REPUBLIQUE_CM2.id;
      if (theme(/age industriel/)) return AGE_INDUSTRIEL_CM2.id;
      if (theme(/premiere guerre/)) return PREMIERE_GUERRE_CM2.id;
      if (theme(/seconde guerre/)) return SECONDE_GUERRE_CM2.id;
      if (theme(/depuis 1945/)) return DEPUIS_1945_CM2.id;
    }
  }
  if (/geographie/.test(sd)) {
    if (classe === "cm1") {
      if (theme(/se nourrir/)) return SE_NOURRIR_CM1.id;
      if (theme(/inegalites/)) return INEGALITES_CM1.id;
      if (theme(/se deplacer/)) return SE_DEPLACER_CM1.id;
      if (theme(/internet/)) return INTERNET_CM1.id;
    }
    if (classe === "cm2") {
      if (theme(/organisation du territoire/)) return TERRITOIRE_CM2.id;
      if (theme(/eau douce/)) return EAU_DOUCE_CM2.id;
      if (theme(/union europeenne/)) return UNION_EUROPEENNE_CM2.id;
    }
  }
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

/**
 * Une feuille du thème : la frise, un exercice, les mots du thème, ses étiquettes, l'évaluation. L'histoire va avec
 * les frises, la géographie avec les paysages, les étiquettes avec l'atelier « Étiquettes » : chacune prend ses réglages
 * — le mode dys, ce qui s'imprime.
 */
const feuilleHG = (seance: number, titre: string, theme: string, exercice: string, aCompleter?: boolean) => (): FeuilleAFabriquer => {
  const r: ReglagesHistoireGeoCM = { theme, exercice, ...(aCompleter === undefined ? {} : { aCompleter }) };
  const atelier = exercice.startsWith("etiquettes") ? "etiquettes" : HISTOIRE_CM.has(theme) ? "frise" : "paysage";
  return { seance, atelier, titre, fabriquer: (g) => ({ html: htmlHistoireGeoCM(r, g), style: STYLE_FEUILLE + styleHistoireGeoCM(r) }) };
};

/**
 * Les feuilles d'un thème, séance par séance : `ou` donne la séance de chaque
 * exercice ; la frise — à compléter, puis pour le mur —, les mots-clés et les
 * lieux vont à la séance qu'on dit ; l'évaluation, à la dernière.
 */
function feuillesDuTheme(id: string, ou: Record<string, number>, frise: number | null, lieux: number | null, derniere: number): (() => FeuilleAFabriquer)[] {
  const t = themeHGCM(id)!;
  const liste: (() => FeuilleAFabriquer)[] = [];
  if (frise !== null && t.frise) {
    liste.push(feuilleHG(frise, `${t.frise.titre} — à compléter`, id, "frise", true));
    liste.push(feuilleHG(frise, `${t.frise.titre} — pour le mur`, id, "frise", false));
  }
  liste.push(feuilleHG(0, `Les mots-clés — ${t.titre}`, id, "etiquettes-mots"));
  liste.push(feuilleHG(0, "Les mots du thème", id, "lexique"));
  for (const e of t.exercices) liste.push(feuilleHG(ou[e.id] ?? 0, e.titre, id, e.id));
  if (lieux !== null && t.lieux) liste.push(feuilleHG(lieux, `Les lieux à localiser — ${t.titre}`, id, "etiquettes-lieux"));
  liste.push(feuilleHG(derniere, `Évaluation — ${t.titre}`, id, "evaluation"));
  return liste;
}

interface PlanHG { feuilles: (() => FeuilleAFabriquer)[]; materiel: string[] }

const PLANS: Record<string, PlanHG> = {
  [MOYEN_AGE_CM1.id]: {
    feuilles: feuillesDuTheme(MOYEN_AGE_CM1.id, { chateau: 1, calendrier: 2, obligations: 2, ville: 3, eglise: 4, "roman-gothique": 5 }, 0, null, 6),
    materiel: [
      "La frise chronologique de la classe, avec les grandes périodes du cycle 2 ; la frise du thème, une par élève, et ses étiquettes",
      "Le plan ou la photographie d'un château fort, proche de l'école si possible ; le document",
      "L'image d'un calendrier du Moyen Âge : un portail sculpté, un livre d'heures ; les feuilles à relier et à trier",
      "Une enluminure ou un plan de ville du Moyen Âge ; le plan de la ville la plus proche, pour les noms de rues ; le document",
      "Des images de l'abbaye de Cluny ou d'une abbaye proche ; le document",
      "Les photographies d'une église romane et de Notre-Dame de Paris, ou d'une cathédrale proche ; la feuille à trier",
      "",
    ],
  },
  [MONARCHIE_CM1.id]: {
    feuilles: feuillesDuTheme(MONARCHIE_CM1.id, { "francois-leonard": 1, "henri-iv": 2, versailles: 3, ordres: 5 }, 0, null, 6),
    materiel: [
      "La frise de la classe ; la frise du thème et ses étiquettes ; les portraits de François Ier, d'Henri IV et de Louis XIV",
      "Des œuvres et des dessins d'inventions de Léonard de Vinci ; des photographies de Chambord ; le document",
      "Une représentation du massacre de la Saint-Barthélemy ; le document",
      "Le plan du château de Versailles, la galerie des Glaces, un portrait de Louis XIV en majesté ; le document",
      "Des portraits de femmes de la Cour : la reine, Madame de Maintenon ; le document de la séance précédente",
      "Une caricature des trois ordres ; la feuille à trier",
      "",
    ],
  },
  [EXPLORATIONS_CM1.id]: {
    feuilles: feuillesDuTheme(EXPLORATIONS_CM1.id, { inventions: 0, voyages: 1, empires: 2, "carte-empires": 2, amerindiens: 3, traite: 4, "carte-triangulaire": 4, denrees: 5 }, 1, 2, 6),
    materiel: [
      "Des images d'une caravelle, d'une boussole, d'un astrolabe, d'une carte ancienne ; la feuille à relier",
      "Le planisphère de la classe ; la frise du thème et ses étiquettes ; le document",
      "La carte des empires à compléter, une par élève ; les étiquettes des lieux pour le planisphère",
      "Des représentations de Tenochtitlan et de la conquête ; le document",
      "La carte du commerce triangulaire ; le plan d'un navire négrier, une gravure de plantation ; le document",
      "Des aliments ou leurs images : tomate, cacao, haricot, pomme de terre, maïs, sucre de canne ; la feuille à trier",
      "",
    ],
  },
  [REVOLUTION_CM1.id]: {
    feuilles: feuillesDuTheme(REVOLUTION_CM1.id, { "royaume-1789": 0, lumieres: 1, "annee-1789": 2, declaration: 3, "femmes-1789": 4 }, 2, null, 5),
    materiel: [
      "Une caricature des trois ordres ; des extraits de cahiers de doléances, de la commune si possible ; le document",
      "Des planches de l'Encyclopédie ; les portraits des philosophes ; la feuille à relier",
      "La frise de l'année 1789 et ses étiquettes ; une image de la prise de la Bastille ; les étapes à remettre dans l'ordre",
      "Le texte de la Déclaration des droits de l'homme et du citoyen, affiché ; le document",
      "Une gravure de la marche des femmes sur Versailles ; le document",
      "",
    ],
  },
  [REPUBLIQUE_EMPIRE_CM2.id]: {
    feuilles: feuillesDuTheme(REPUBLIQUE_EMPIRE_CM2.id, { "vie-politique": 0, "republique-1792": 1, abolition: 2, bonaparte: 3, reformes: 4 }, 1, null, 5),
    materiel: [
      "La frise de l'année 1789, du CM1 ; une gravure de club, une pétition, un journal révolutionnaire ; le document",
      "La frise du thème et ses étiquettes ; les paroles du premier couplet de La Marseillaise ; le document",
      "Un portrait de Toussaint Louverture ; le décret d'abolition de 1794 ; le document",
      "Le Sacre de Napoléon, de David, projeté ; les étapes à remettre dans l'ordre",
      "La feuille à trier ; une page du Code civil",
      "",
    ],
  },
  [VERS_REPUBLIQUE_CM2.id]: {
    feuilles: feuillesDuTheme(VERS_REPUBLIQUE_CM2.id, { "deuxieme-republique": 0, lois: 1, symboles: 2, "empire-colonial": 3, "carte-empire-1914": 3 }, 0, 3, 4),
    materiel: [
      "La frise du thème et ses étiquettes ; une gravure du premier vote au suffrage universel, le tableau de l'abolition de l'esclavage de 1848 ; le document",
      "Des extraits des lois Ferry et de la loi de 1905 ; la charte de la laïcité de l'école ; la feuille à relier",
      "Des photographies de la façade de l'école et de la mairie, des pièces, des timbres ; la feuille à relier",
      "Le planisphère de la classe ; la carte de l'empire à compléter, une par élève ; les étiquettes des territoires ; le document",
      "",
    ],
  },
  [AGE_INDUSTRIEL_CM2.id]: {
    feuilles: feuillesDuTheme(AGE_INDUSTRIEL_CM2.id, { vapeur: 0, "vie-quotidienne": 1, medecine: 2, ouvriers: 3, bourgeois: 4 }, 0, null, 5),
    materiel: [
      "La frise du thème et ses étiquettes ; des images d'une locomotive, d'une usine, d'une mine du XIXe siècle, ou une trace proche ; le document",
      "Deux images d'une même rue à cent ans d'écart ; la feuille à trier",
      "Le récit de la vaccination de 1885 ; la feuille à relier",
      "Des photographies de mineurs, d'enfants à l'usine, une affiche de grève ; le document",
      "L'image d'un intérieur bourgeois et celle d'un logement ouvrier ; le document",
      "",
    ],
  },
  [PREMIERE_GUERRE_CM2.id]: {
    feuilles: feuillesDuTheme(PREMIERE_GUERRE_CM2.id, { tranchees: 1, "mouvement-position": 2, "carte-front": 2, arriere: 3, "bilan-1918": 4 }, 0, null, 5),
    materiel: [
      "La frise du XXe siècle de la classe ; la frise du thème et ses étiquettes ; une carte du front occidental",
      "Des extraits de lettres de poilus, des photographies de tranchées ; le document",
      "Une carte de la bataille de Verdun ; des photographies du champ de bataille, avant et après ; la feuille à trier ; la carte du front à compléter",
      "Des photographies de munitionnettes et de paysannes ; des affiches de propagande et d'emprunt ; le document",
      "La liste des noms du monument aux morts de la commune, ou une sortie pour le voir ; le document",
      "",
    ],
  },
  [SECONDE_GUERRE_CM2.id]: {
    feuilles: feuillesDuTheme(SECONDE_GUERRE_CM2.id, { "etapes-39-45": 0, occupation: 1, "carte-1940": 1, resister: 2, "vichy-juifs": 3 }, 0, null, 5),
    materiel: [
      "La frise du XXe siècle de la classe ; la frise du thème et ses étiquettes ; une carte de la zone occupée et de la zone libre",
      "Des tickets de rationnement, une affiche de la ligne de démarcation ; le document ; la carte des deux zones à compléter",
      "L'enregistrement d'un extrait de l'appel du 18 juin 1940 ; un journal clandestin ; le document",
      "Le document, lu avec le professeur ; les ressources du Mémorial de la Shoah pour l'école ; l'exemple du Chambon-sur-Lignon ou d'un Juste de la région",
      "Le monument aux morts de la commune ; une carte des lieux de mémoire proches",
      "",
    ],
  },
  [DEPUIS_1945_CM2.id]: {
    feuilles: feuillesDuTheme(DEPUIS_1945_CM2.id, { "republique-sociale": 0, "droits-femmes": 1, "vie-change": 2, europe: 3, "carte-ue": 3 }, 0, null, 4),
    materiel: [
      "La frise du thème et ses étiquettes ; l'affiche de la Sécurité sociale ; une photographie des premières électrices, en 1945 ; le document",
      "La feuille à relier ; une loi de 1965 ou de 1972, en extrait",
      "Des photographies d'objets et de scènes de 1950 et d'aujourd'hui ; les questions préparées pour un grand-parent ; la feuille à trier",
      "La carte de l'Union européenne à compléter ; le document",
      "",
    ],
  },
  [SE_NOURRIR_CM1.id]: {
    feuilles: feuillesDuTheme(SE_NOURRIR_CM1.id, { provenance: 0, "carte-provenance": 0, "agricole-transforme": 1, "chaine-yaourt": 2, "manger-monde": 3, "carte-quatre-pays": 3 }, null, 0, 4),
    materiel: [
      "Les menus de la cantine ; des emballages et des étiquettes de produits ; le planisphère de la classe et les étiquettes des lieux ; la carte à compléter",
      "Des aliments ou leurs emballages ; la liste des ingrédients d'un biscuit ; la feuille à trier",
      "Les étapes à remettre dans l'ordre ; une grande feuille pour le schéma fléché",
      "Les photographies des repas d'une semaine de deux familles de deux pays ; la carte des quatre pays ; le document",
      "",
    ],
  },
  [INEGALITES_CM1.id]: {
    feuilles: feuillesDuTheme(INEGALITES_CM1.id, { aires: 0, "carte-aires": 0, "eau-potable": 1, "ecole-monde": 2, "deux-familles": 3 }, null, 0, 4),
    materiel: [
      "Le planisphère de la classe ; la carte des aires régionales à colorier, une par élève ; les étiquettes des aires ; la feuille à relier",
      "Des photographies de la corvée d'eau ; une carte de l'accès à l'eau potable par pays ; le document",
      "Des photographies de classes dans plusieurs pays ; une carte de la scolarisation ; le document",
      "Les photographies de deux familles de deux pays : leur logement, leur eau, leur cuisine ; le tableau à compléter",
      "",
    ],
  },
  [SE_DEPLACER_CM1.id]: {
    feuilles: feuillesDuTheme(SE_DEPLACER_CM1.id, { "mes-deplacements": 0, "km-temps": 1, infrastructures: 2 }, null, null, 4),
    materiel: [
      "Le tableau à remplir ; un plan de la commune ; une grande feuille pour le diagramme de la classe",
      "Une carte de France avec ses distances ; des horaires de train ; le document",
      "Une photographie aérienne de la commune ; le plan d'un aéroport ou d'un port ; la feuille à relier",
      "Des photographies d'enfants qui vont à l'école dans plusieurs pays ; le planisphère",
      "",
    ],
  },
  [INTERNET_CM1.id]: {
    feuilles: feuillesDuTheme(INTERNET_CM1.id, { usages: 0, fonctionnement: 1, "carte-cables": 1, acces: 2 }, null, 1, 4),
    materiel: [
      "Le tableau à remplir ; une affiche pour le relevé de la classe",
      "La carte mondiale des câbles sous-marins, projetée ; la carte des câbles à compléter ; les étiquettes des lieux ; le document",
      "La carte du taux d'accès de la population à Internet, par pays ; le document",
      "La carte du déploiement de la 5G en France, de l'autorité des télécoms ; le réseau de la commune de l'école",
      "",
    ],
  },
  [TERRITOIRE_CM2.id]: {
    feuilles: feuillesDuTheme(TERRITOIRE_CM2.id, { etoile: 0, decoupage: 1, regions: 2, "carte-regions": 2, "deux-regions": 3, "croquis-territoire": 4 }, null, 0, 5),
    materiel: [
      "Un fond de carte de la France par élève ; la carte de la classe et les étiquettes des lieux ; le document",
      "Le nom du maire, le numéro et la préfecture du département ; le document",
      "La carte des régions à compléter, avec les cinq régions d'outre-mer ; le tableau à compléter",
      "Des cartes, des photographies, le site de la région de l'école et d'une autre région ; le tableau à compléter",
      "Le croquis à compléter, un par élève ; des crayons de couleur, dont un rouge et un bleu",
      "",
    ],
  },
  [EAU_DOUCE_CM2.id]: {
    feuilles: feuillesDuTheme(EAU_DOUCE_CM2.id, { ressource: 0, fleuves: 1, "carte-fleuves": 1, "usages-eau": 2, "serre-poncon": 3 }, null, 1, 5),
    materiel: [
      "Une bouteille d'un litre et une cuillère ; le schéma du cycle de l'eau ; le document",
      "La carte des fleuves et des massifs à compléter, une par élève ; la carte de la classe et les étiquettes des lieux ; la feuille à relier",
      "Un graphique de la consommation d'eau par usage ; la feuille à trier",
      "Des photographies du lac de Serre-Ponçon, plein et pendant la sécheresse de 2022, ou un exemple proche ; le document",
      "Un arrêté préfectoral de restriction d'eau ; les informations du service des eaux de la commune",
      "",
    ],
  },
  [UNION_EUROPEENNE_CM2.id]: {
    feuilles: feuillesDuTheme(UNION_EUROPEENNE_CM2.id, { "europe-ue": 0, "carte-continent": 0, "qu-est-ce-que-ue": 1, fondateurs: 2, "dix-pays": 2, "carte-ue": 2, "projet-europeen": 3 }, null, 2, 4),
    materiel: [
      "La carte de l'Europe dans ses limites conventionnelles, une par élève ; la feuille à trier",
      "Le drapeau européen, une pièce d'euro, une photographie du Parlement européen à Strasbourg ; le document",
      "La carte de l'Union européenne à compléter ; les étiquettes des pays ; la feuille à relier et le tableau",
      "Une photographie d'un panneau « projet cofinancé par l'Union européenne » ; le site de la région ; la fiche à compléter",
      "",
    ],
  },
  [TEMPS_REPUBLIQUE_CM2.id]: {
    feuilles: feuillesDuTheme(TEMPS_REPUBLIQUE_CM2.id, { centenaire: 0, symboles: 1, "ecole-ferry": 2, "ecole-hier": 3, "droits-devoirs": 4 }, 0, null, 5),
    materiel: [
      "Une affiche du centenaire de la République (1892) ; les portraits des souverains du XIXe siècle ; la frise du thème et ses étiquettes ; le document",
      "Des photographies de la façade de la mairie et de l'école, des pièces de monnaie ; la feuille à relier",
      "Des photographies de classes de la IIIe République (Musée national de l'Éducation) ; une carte murale de l'empire colonial ; le document",
      "La feuille à trier ; l'histoire du bâtiment de l'école, d'après les archives de la commune",
      "Le document ; un article de la Déclaration universelle des droits de l'homme, affiché",
      "",
    ],
  },
  [AGE_INDUSTRIEL_2020_CM2.id]: {
    feuilles: feuillesDuTheme(AGE_INDUSTRIEL_2020_CM2.id, { energies: 1, mine: 2, "usine-magasin": 2, ville: 3, rural: 4, "vie-quotidienne": 5 }, 0, null, 6),
    materiel: [
      "L'image d'un atelier d'artisan et celle d'une usine du XIXe siècle ; la frise du thème et ses étiquettes",
      "Des images de machines (Musée des arts et métiers) ; le document",
      "Des photographies et des tableaux de mines, d'usines, de grands magasins ; les ressources d'un écomusée proche ; les documents",
      "Le plan d'une ville proche et des photographies de ses traces industrielles ; le document",
      "Des outils agricoles anciens ou leurs images ; des travaux d'histoire locale ; le document",
      "La feuille à trier",
      "",
    ],
  },
  [GUERRES_UE_CM2.id]: {
    feuilles: feuillesDuTheme(GUERRES_UE_CM2.id, { "bilan-1918": 1, tranchees: 2, "carte-front": 2, occupation: 3, "carte-1940": 3, "vichy-juifs": 3, "comparer-guerres": 4, europe: 5, "carte-ue": 5, "droits-europe": 5 }, 0, null, 6),
    materiel: [
      "La frise du thème et ses étiquettes ; un planisphère",
      "La liste des noms du monument aux morts de la commune, ou une sortie pour le voir ; des plaques, des noms de rues ; le document",
      "Le témoignage d'un poilu à Verdun ; un casque, un masque à gaz, ou leurs images ; le document ; la carte du front à compléter",
      "Le témoignage d'un enfant juif caché, adapté à l'âge des élèves ; une image du débarquement du 6 juin 1944 ; les documents ; la carte des deux zones à compléter",
      "Le tableau à compléter ; les documents des séances précédentes",
      "Des cartes de l'Europe en 1957, en 1992 et aujourd'hui ; la carte de l'Union européenne à compléter ; les documents",
      "",
    ],
  },
  [SE_DEPLACER_2020_CM2.id]: {
    feuilles: feuillesDuTheme(SE_DEPLACER_2020_CM2.id, { "mes-deplacements": 0, "km-temps": 1, ailleurs: 2, infrastructures: 3, aeroport: 3, "carte-villes-france": 4, "carte-villes-europe": 4, "carte-villes-monde": 4 }, null, 4, 5),
    materiel: [
      "Le tableau à remplir ; le plan de la commune ; un outil de géolocalisation",
      "Une carte avec ses distances ; le document",
      "Un ou deux extraits du film Sur le chemin de l'école (2013) ; le planisphère ; le document",
      "Des cartes des autoroutes, des lignes à grande vitesse, des vols long-courriers ; le document ; la feuille à relier",
      "Les cartes des villes repères — la France, l'Europe, le monde — ; les étiquettes des villes",
      "",
    ],
  },
  [INTERNET_2020_CM2.id]: {
    feuilles: feuillesDuTheme(INTERNET_2020_CM2.id, { usages: 0, fonctionnement: 1, "carte-cables": 1, "info-en-ligne": 2, acces: 3 }, null, 1, 4),
    materiel: [
      "Le tableau à remplir ; une affiche pour le relevé de la classe",
      "La carte mondiale des câbles sous-marins, projetée ; la carte des câbles à compléter ; les étiquettes ; le document",
      "Un projet de correspondance ou d'article en ligne ; le document",
      "Le planisphère des habitants connectés, par pays ; la carte de la couverture mobile en France ; le document",
      "",
    ],
  },
  [MIEUX_HABITER_CM2.id]: {
    feuilles: feuillesDuTheme(MIEUX_HABITER_CM2.id, { diagnostic: 1, "nature-ville": 2, poubelles: 3, "chemin-dechet": 3, ecoquartier: 4 }, null, null, 6),
    materiel: [
      "Le plan du quartier ou de la commune ; une affiche pour les questions de la sortie",
      "Le plan du quartier, le tableau du diagnostic, un appareil photo ou une tablette ; l'autorisation de sortie",
      "Le plan de la commune ; les photographies de la sortie ; le document",
      "Des emballages propres à trier ; les consignes de tri de la commune ; la feuille à trier et les étapes à remettre dans l'ordre",
      "Une courte vidéo d'un écoquartier ; le document",
      "Du papier pour l'affiche, ou une tablette pour le diaporama",
      "",
    ],
  },
};

export const estUneDemarcheHistoireGeoCM = (id: string) => id in PLANS;

export function planHistoireGeoCM(demarcheId: string): PlanDesFeuilles | null {
  const plan = PLANS[demarcheId];
  if (!plan) return null;
  return { feuilles: plan.feuilles.map((f) => f()), materiel: plan.materiel };
}
