// La programmation d'une séquence : le niveau et la période de l'année pour
// lesquels elle est pensée.
//
// Une séquence prend son sens à un moment de l'année : la centaine dès le
// début du CE1, les nombres jusqu'à 59 au plus tard en période 2 du CP.
// Quand le programme le dit — pour la numération, les opérations posées, les
// fractions, la monnaie, les tables d'addition ; en français, le code, la
// copie, la cursive, la dictée, l'écriture — ou la séquence d'un livret —
// l'arbre à calcul, la table de 7… —, on propose la période, et l'on cite sa
// phrase ; le niveau, lui, est celui de la compétence. Ce n'est qu'une proposition :
// l'enseignant la garde ou la change.
//
// Les repères des programmes de 2024 ont été relevés dans leur texte entier
// (octobre 2026, à la demande de l'enseignant) : ce sont les « repères annuels
// de progression », que les nouveaux programmes portent eux-mêmes. Ils ne
// fixent de période qu'à ces notions-là : la géométrie, les grandeurs hors
// monnaie, les données, la grammaire, l'oral n'en ont pas.
//
// Ce que les programmes laissent libre, d'autres textes d'Éduscol le datent
// parfois : le tableau de progression d'un livret, les guides du CP et du CE1,
// les repères annuels de 2019. Ils ne viennent qu'en dernier, et les repères de
// 2019, d'avant les programmes de 2024, le disent dans leur citation. Une
// séquence tirée d'un manuel que l'enseignant a fourni prend la période que
// ce manuel lui donne, cité de même.

/** Les niveaux pour lesquels une séquence peut être pensée. */
export const NIVEAUX_DE_PROGRAMMATION = ["PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"] as const;

export interface ProgrammationProposee {
  /** « CP », « CE1 »… ; vide quand la compétence ne le dit pas. */
  niveau: string;
  /** La période proposée, ou rien quand le programme ne la fixe pas. */
  periode: number | null;
  /** D'où vient la période : la phrase du programme, citée. */
  raison: string;
}

const PROGRAMME = "Programme de mathématiques du cycle 2 (2024)";
const cite = (classe: string, phrase: string) => `${PROGRAMME}, ${classe} : « ${phrase} »`;
const PROGRAMME_DE_FRANCAIS = "Programme de français du cycle 2 (2024)";
/** Une phrase du programme de français ; dans ses tableaux, le moment de l'année vient en tête de la ligne, avant le tiret. */
const citeLeProgrammeDeFrancais = (classe: string, phrase: string) => `${PROGRAMME_DE_FRANCAIS}, ${classe} : « ${phrase} »`;
/** Les séquences des livrets d'accompagnement disent elles-mêmes quand elles se font. */
const citeLeLivret = (classe: string, phrase: string) => `Livret d'accompagnement de mathématiques du ${classe} (Éduscol, 2025) : « ${phrase} »`;
const citeLeLivretDeFrancais = (classe: string, phrase: string) =>
  `Livret d'accompagnement de français du ${classe} (Éduscol, ${classe === "CP" ? 2025 : 2026}) : « ${phrase} »`;
/** Le programme d'histoire-géographie du cycle 3 (BO n° 22 du 28 mai 2026) : le titre du thème porte sa période. */
const citeLHistoireDuCycle3 = (classe: string, theme: string) => `Programme d'histoire-géographie du cycle 3 (2026), ${classe} : « ${theme} »`;
/** Le programme de mathématiques du cycle 3 (BO n° 16 du 17 avril 2025) : le cours moyen. */
const citeLeProgrammeDuCycle3 = (classe: string, phrase: string) => `Programme de mathématiques du cycle 3 (2025), ${classe} : « ${phrase} »`;
const GUIDE_MATHS_CP = "Guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol, 2021)";
const GUIDE_LECTURE_CP = "Guide « Pour enseigner la lecture et l'écriture au CP » (Éduscol, 2019)";
const GUIDE_LECTURE_CE1 = "Guide « Pour enseigner la lecture et l'écriture au CE1 » (Éduscol, 2019)";
const citeLeGuide = (guide: string, phrase: string) => `${guide} : « ${phrase} »`;
/** Une séquence tirée d'un manuel de l'enseignant : le manuel dit lui-même quand elle se fait. */
const citeLeManuel = (manuel: string, phrase: string) => `Manuel ${manuel} : « ${phrase} »`;
/** Les repères annuels de 2019 ont précédé les programmes de 2024 : la citation le dit. */
const citeLesReperesDe2019 = (classe: string, phrase: string) =>
  `Repères annuels de progression en mathématiques du cycle 2 (Éduscol, 2019 — d'avant les programmes de 2024), ${classe} : « ${phrase} »`;

/** La période d'une séquence, et la phrase qui la donne ; `niveau` : le repère ne vaut qu'à cette classe. */
interface ReperePeriode { periode: number; raison: string; niveau?: string }

/** La période des séquences, d'après les repères du programme ou des livrets ; plusieurs quand chaque classe a le sien. */
const PAR_DEMARCHE: Record<string, ReperePeriode | ReperePeriode[]> = {
  // L'histoire au CE2 : l'ordre et les périodes que le programme recommande ; au CP et au CE1, aucune — ses dimensions se travaillent toute l'année.
  "prehistoire-ce2": { periode: 1, niveau: "CE2", raison: "Programme d'histoire-géographie du cycle 2 (2026), CE2 : « première période »" },
  "rome-gaule-ce2": { periode: 2, niveau: "CE2", raison: "Programme d'histoire-géographie du cycle 2 (2026), CE2 : « deuxième et troisième périodes »" },
  "royaume-france-ce2": { periode: 4, niveau: "CE2", raison: "Programme d'histoire-géographie du cycle 2 (2026), CE2 : « quatrième et cinquième périodes »" },
  // L'histoire au cours moyen : l'ordre et les périodes que le programme du cycle 3 recommande, au titre de chaque thème.
  "moyen-age-cm1": { periode: 1, niveau: "CM1", raison: citeLHistoireDuCycle3("CM1", "Thème 1 : La vie quotidienne au Moyen Âge (XIe - XIIIe siècles) (première et deuxième période)") },
  "monarchie-cm1": { periode: 2, niveau: "CM1", raison: citeLHistoireDuCycle3("CM1", "Thème 2 : La monarchie en France (XVIe – XVIIe siècles) (deuxième et troisième périodes)") },
  "explorations-cm1": { periode: 4, niveau: "CM1", raison: citeLHistoireDuCycle3("CM1", "Thème 3 : Explorations et conquêtes par les Européens du XVe au XVIIe siècle (quatrième période)") },
  "revolution-1789-cm1": { periode: 5, niveau: "CM1", raison: citeLHistoireDuCycle3("CM1", "Thème 4 : 1789, une année révolutionnaire en France (cinquième période)") },
  "republique-empire-cm2": { periode: 1, niveau: "CM2", raison: citeLHistoireDuCycle3("CM2", "Thème 1 : De la République à l'Empire (1792-1815) (première période)") },
  "vers-republique-cm2": { periode: 2, niveau: "CM2",
    raison: citeLHistoireDuCycle3("CM2", "Thème 2 : Vers une France républicaine : la IIe République (1848-1852) et la IIIe République de 1870 à 1914 (deuxième période)") },
  "age-industriel-cm2": { periode: 2, niveau: "CM2", raison: citeLHistoireDuCycle3("CM2", "Thème 3 : L'âge industriel en France au XIXe siècle (deuxième période)") },
  "premiere-guerre-cm2": { periode: 3, niveau: "CM2", raison: citeLHistoireDuCycle3("CM2", "Thème 4 : La France dans la Première Guerre mondiale (1914-1918) (troisième période)") },
  "seconde-guerre-cm2": { periode: 4, niveau: "CM2", raison: citeLHistoireDuCycle3("CM2", "Thème 5 : La France pendant la Seconde Guerre mondiale (1939-1945) (quatrième période)") },
  "depuis-1945-cm2": { periode: 5, niveau: "CM2", raison: citeLHistoireDuCycle3("CM2", "Thème 6 : la France depuis 1945 : 80 ans de transformations (cinquième période)") },
  // Le CM2 du programme de 2020 : la fiche Éduscol du premier thème le met en début d'année.
  "temps-republique-cm2": { periode: 1, niveau: "CM2",
    raison: "Fiche Éduscol « Le temps de la République » (ressources d'accompagnement du cycle 3, mars 2016 ; programme de 2020) : « Le premier thème d'histoire de l'année de CM2 »" },
  "numeration-dizaine-cp": { periode: 1, raison: cite("CP", "L'aspect décimal (base dix) et l'aspect positionnel […] sont abordés dès la période 1 : les élèves comparent, dénombrent et constituent des collections organisées en groupes de dix unités et en unités isolées.") },
  "nombres-livret-cp-59": { periode: 2, raison: cite("CP", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à cinquante-neuf.") },
  // Les nombres de 10 à 20, d'après le manuel du CRPE de l'enseignant (voir demarcheDixAVingt.ts) : la période que le manuel donne à sa séance.
  "nombres-10-20-cp": { periode: 2, niveau: "CP", raison: citeLeManuel("« Réussir mon CRPE — Oral 2025-2026 » (Nathan), p. 43", "avec des élèves de CP en période 2") },
  "nombres-livret-cp-100": { periode: 3, raison: cite("CP", "Au plus tard en période 3, les élèves travaillent avec des quantités et des nombres allant jusqu'à cent.") },
  // Les nombres de la séquence du guide — 71 et 68 — vont jusqu'à cent.
  "comparer-nombres-cp": { periode: 3, raison: cite("CP", "Au plus tard en période 3, les élèves travaillent avec des quantités et des nombres allant jusqu'à cent.") },
  "groupements-ce1": { periode: 1, raison: cite("CE1", "La centaine est abordée dès le début de la période 1.") },
  "nombres-livret-ce1": { periode: 2, raison: cite("CE1", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à mille.") },
  "comparer-nombres-ce1": { periode: 2, raison: cite("CE1", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à mille.") },
  "groupements-ce2": { periode: 1, raison: cite("CE2", "Des nombres supérieurs à mille sont rencontrés dès le début de la période 1.") },
  "nombres-livret-ce2": { periode: 2, raison: cite("CE2", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à 10 000.") },
  "comparer-nombres-ce2": { periode: 2, raison: cite("CE2", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à 10 000.") },
  // La demi-droite graduée va jusqu'aux nombres de la classe : la période où le programme les met.
  "demi-droite-cp": { periode: 3, raison: cite("CP", "Au plus tard en période 3, les élèves travaillent avec des quantités et des nombres allant jusqu'à cent.") },
  "demi-droite-ce1": { periode: 2, raison: cite("CE1", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à mille.") },
  "demi-droite-ce2": { periode: 2, raison: cite("CE2", "Au plus tard en période 2, les élèves travaillent avec des quantités et des nombres allant jusqu'à 10 000.") },
  // Les ordinaux du CP : le guide les met dans les progressions des périodes 3 à 5.
  "ordinaux-cp": { periode: 3, raison: citeLeGuide(GUIDE_MATHS_CP, "Les progressions pour les périodes 3 à 5 […] Repérage d'un rang ou d'une position (jusqu'à 100).") },
  // Le calcul mental : la période que donne la séquence du livret.
  "arbre-a-calcul-cp": { periode: 3, raison: citeLeLivret("CP", "Cette séquence peut être abordée en période 3.") },
  "ajouter-9-19-29-ce1": { periode: 2, raison: citeLeLivret("CE1", "À partir de la période 2, au fur et à mesure de l'apprentissage des nombres : la séquence comprendra plusieurs séances qui respecteront les rythmes d'apprentissages des élèves.") },
  "table-de-7-ce1": { periode: 3, raison: citeLeLivret("CE1", "Période 3 : Connaitre dans les deux sens les tables de 7.") },
  // Les problèmes et les fractions : la période que donne la séquence du livret, ou le programme.
  "parties-tout-cp": { periode: 4, raison: citeLeLivret("CP", "Elle est envisagée en fin de période 3 ou en période 4, en cohérence avec l'avancée du travail mené sur la numération décimale.") },
  "parties-tout-ce1": { periode: 3, raison: citeLeLivret("CE1", "La séquence développée dans ce document, prévue en périodes 3 ou 4, s'inscrit dans la continuité du travail effectué en numération, en calcul et en résolution de problèmes.") },
  "fractions-unitaires-ce1": { periode: 2, raison: cite("CE1", "Le travail sur les fractions commence dès la période 2 par l'introduction des fractions unitaires (de numérateur égal à 1) d'un tout et de leur écriture fractionnaire.") },
  "fractions-longueurs-ce2": { periode: 3, raison: cite("CE2", "À partir de la période 3, le travail sur les fractions d'un tout permet de considérer une fraction d'une unité de longueur.") },
  // Les fractions du CE1 prolongées : la programmation du livret, et le programme pour comparer.
  "fractions-non-unitaires-ce1": { periode: 3, raison: citeLeLivret("CE1", "Séquence 3 : interpréter, représenter, lire les fractions non unitaires inférieures ou égales à 1.") },
  "comparer-fractions-ce1": { periode: 4, raison: cite("CE1", "Dès la période 4, les élèves apprennent à comparer des fractions dans des cas simples.") },
  "additionner-fractions-ce1": { periode: 4, raison: citeLeLivret("CE1", "Séquence 5 : additionner ou soustraire des fractions de même dénominateur.") },
  // La monnaie : les repères du programme.
  "monnaie-cp": { periode: 2, raison: cite("CP", "La monnaie est introduite en période 2 ou 3.") },
  "monnaie-ce1": { periode: 2, raison: cite("CE1", "Les centimes d'euro sont introduits au plus tard en période 2.") },
  "monnaie-virgule-ce1": { periode: 3, raison: cite("CE1", "L'écriture à virgule est utilisée à partir de la période 3.") },
  "monnaie-ce2": { periode: 1, raison: cite("CE2", "Cette écriture, introduite au CE1, est à nouveau utilisée dès la période 1 du CE2 dans le cadre d'exercices ou de problèmes impliquant la monnaie.") },
  // Le français : ce que disent les livrets de leurs ateliers et de leurs séances.
  "precision-vitesse-cp": { niveau: "CP", periode: 1, raison: citeLeLivretDeFrancais("CP", "À partir de la période 1 du CP et tout au long du cycle") },
  "prosodie-cp": { niveau: "CP", periode: 2, raison: citeLeLivretDeFrancais("CP", "À partir de la période 2 du CP") },
  "precision-vitesse-ce1": { niveau: "CE1", periode: 1, raison: citeLeLivretDeFrancais("CE1", "À partir de la période 1 du CE1 et tout au long du cycle") },
  "prosodie-ce1": { niveau: "CE1", periode: 1, raison: citeLeLivretDeFrancais("CE1", "À partir de la période 1 du CE1, pour les élèves des groupes ou profils 2, 3 et 4") },
  "ecriture-cursive": { niveau: "CP", periode: 1, raison: citeLeLivretDeFrancais("CP", "À partir de la période 1 et tout au long de l'année, sur les séances quotidiennes.") },
  "strategies-de-copie": { niveau: "CP", periode: 2, raison: citeLeLivretDeFrancais("CP", "À partir de la période 2, plusieurs fois par semaine.") },
  "lecture-expressive-ce2": { niveau: "CE2", periode: 1, raison: citeLeLivretDeFrancais("CE2", "Séances décrochées régulières à mener depuis la période 1 et tout au long de l'année.") },
  // Le cours moyen : les nombres, d'après le programme de 2025.
  "numeration-cm1": { niveau: "CM1", periode: 1,
    raison: citeLeProgrammeDuCycle3("CM1", "Toutefois, afin de renforcer les connaissances sur la numération relevant du cycle 2 et de privilégier en début d'année l'approfondissement de l'étude des fractions et des nombres décimaux, on se limite, pendant les deux premières périodes de l'année, aux nombres entiers s'écrivant avec au plus quatre chiffres.") },
  "grands-nombres-cm1": { niveau: "CM1", periode: 3,
    raison: citeLeProgrammeDuCycle3("CM1", "Les nombres écrits avec cinq ou six chiffres ne sont abordés qu'à partir de la période 3 ou du début de la période 4.") },
  "fractions-cm1": { niveau: "CM1", periode: 1,
    raison: citeLeProgrammeDuCycle3("CM1", "Dans la continuité du cycle 2, les élèves travaillent avec des fractions dès la période 1 et les utilisent tout au long de l'année scolaire.") },
  "fractions-decimales-cm1": { niveau: "CM1", periode: 2,
    raison: citeLeProgrammeDuCycle3("CM1", "L'étude plus générale des nombres décimaux, introduits sous la forme de fractions décimales puis exprimés avec une écriture à virgule, est menée dès la période 2 du CM1.") },
  "grands-nombres-cm2": { niveau: "CM2", periode: 3,
    raison: `${citeLeProgrammeDuCycle3("CM2", "Toutefois, afin de privilégier en début d'année le travail sur les fractions et les nombres décimaux, les nombres entiers rencontrés pendant les deux premières périodes de l'année seront ceux qui ont été étudiés au CM1 et qui s'écrivent avec au plus six chiffres.")} Les millions viennent donc en période 3.` },
  "fractions-cm2": { niveau: "CM2", periode: 1,
    raison: citeLeProgrammeDuCycle3("CM2", "Dans la continuité du CM1, les élèves travaillent avec des fractions dès la période 1 et les utilisent tout au long de l'année scolaire.") },
  "multiplication-posee-cm1": { niveau: "CM1", periode: 1,
    raison: citeLeProgrammeDuCycle3("CM1", "Des additions, des soustractions et des multiplications posées sont régulièrement utilisées dès le début de l'année, quand les nombres en jeu le justifient.") },
  "probabilites-cm2": { niveau: "CM2", periode: 2,
    raison: citeLeProgrammeDuCycle3("CM2", "Au CM2, le travail sur les probabilités est amorcé au plus tard en période 2.") },
  "decimaux-cm2": { niveau: "CM2", periode: 1,
    raison: citeLeProgrammeDuCycle3("CM2", "Au CM2, des nombres décimaux sont rencontrés dès la période 1 dans la continuité du travail mené au CM1 aussi bien par des écritures fractionnaires que des écritures à virgule.") },
};

/** Le programme range les temps — « au présent, à l'imparfait, au futur puis au passé composé » — sans leur donner de période ; la fiche d'une séquence les répartit dans cet ordre (`tempsDeLaPeriode`), le tableau aussi. */
const dansLOrdreDesTemps = (periode: number): ReperePeriode[] => ["CE1", "CE2"].map((niveau) => ({
  niveau, periode,
  raison: `${citeLeProgrammeDeFrancais("CE1", "Apprendre à conjuguer au présent, à l'imparfait, au futur puis au passé composé de l'indicatif être et avoir et les verbes du premier groupe.")} `
    + `Le programme donne l'ordre des temps, sans période : Maitrize les répartit sur l'année${niveau === "CE2" ? ", au CE2 comme au CE1" : ""} — le présent en périodes 1 et 2, l'imparfait en 3, le futur en 4, le passé composé en 5.`,
}));

/** Au CE2, les repères de 2019 ouvrent l'année sur tous les problèmes : leurs séquences commencent en période 1, l'enseignant les étale. */
const PROBLEMES_DU_DEBUT_DU_CE2: ReperePeriode = { niveau: "CE2", periode: 1,
  raison: citeLesReperesDe2019("CE2", "Dès le début de l'année, les élèves résolvent des problèmes additifs et multiplicatifs portant sur des nombres plus grands, ou des problèmes relevant de plusieurs opérations, nécessitant par exemple l'exploration d'un tableau ou d'un graphique.") };

/**
 * Relevées dans le texte des programmes de 2024 (octobre 2026) : les périodes
 * qu'aucun intitulé de compétence ne porte, et qui placent une séquence
 * entière ; puis celles que donnent les livrets, les guides Éduscol et les
 * repères annuels de 2019 aux séquences que les programmes laissent sans
 * période. Elles ne viennent qu'en dernier, quand ni la séquence d'un livret,
 * ni la compétence n'en disent rien : la soustraction posée de montants en
 * euro garde sa période 4. Un repère qui couvre plusieurs périodes
 * (« au cours des périodes 1 à 3 ») place la séquence à la première.
 */
const SINON_PAR_DEMARCHE: Record<string, ReperePeriode | ReperePeriode[]> = {
  "strategies-de-copie": { niveau: "CE1", periode: 1, raison: citeLeProgrammeDeFrancais("CE1", "À l'issue de la période 1 — Copier quatre à cinq phrases courtes.") },
  "egalites-fractions-ce2": { niveau: "CE2", periode: 1,
    raison: cite("CE2", "Au début du CE2, les élèves réinvestissent les fractions d'un tout étudiées au CE1 afin d'établir des égalités entre fractions comme 5/10 = 1/2.") },
  // Les additions et les soustractions posées du CE2, en euros comme en nombres entiers : l'addition des montants au plus tard
  // en période 2, la soustraction au plus tard en période 4 — la séquence qui fait les deux vient donc en période 2.
  "posees-ce2": { niveau: "CE2", periode: 2,
    raison: cite("CE2", "L'addition posée de montants en euro utilisant l'écriture à virgule est introduite au plus tard en période 2.") },
  "comprendre-cp": { niveau: "CP", periode: 3,
    raison: citeLeProgrammeDeFrancais("CP", "Progressivement, à partir de la 3e période de CP, les élèves sont amenés à acquérir et automatiser ces stratégies de compréhension à partir de textes qu'ils auront eux-mêmes décodés.") },
  "familles-orthographe-c2": { niveau: "CP", periode: 2,
    raison: citeLeProgrammeDeFrancais("CP", "Dès la fin de la 2e période — Écrire des mots dictés avec des lettres muettes apprises (mettre en relation des morphogrammes lexicaux et grammaticaux).") },
  "ecrire-un-texte-c2": { niveau: "CE1", periode: 1,
    raison: citeLeProgrammeDeFrancais("CE1", "Dès la période 1 — Écrire un texte court de une à trois phrases.") },
  // Les opérations et les problèmes : le livret de CE1, le guide de maths du CP, les repères de 2019.
  "multiplication-ce1": { niveau: "CE1", periode: 1,
    raison: citeLeLivret("CE1", "Périodes 1 et 2 : Connaitre et utiliser le symbole « x ». Comprendre et savoir que la multiplication est commutative.") },
  "sens-addition-soustraction-cp": { niveau: "CP", periode: 2,
    raison: citeLeGuide(GUIDE_MATHS_CP, "Symboles mathématiques — Utilisation progressive des symboles « = », « + », « − » (en période 2).") },
  "sens-multiplication-cp": { niveau: "CP", periode: 3,
    raison: citeLesReperesDe2019("CP", "À partir de la période 3, les élèves résolvent aussi quelques problèmes multiplicatifs portant sur de petits nombres et dont la résolution s'appuie sur une itération d'additions, sans aucune difficulté calculatoire mais invitant à construire en situation le sens de la multiplication.") },
  "deux-etapes-cp": { niveau: "CP", periode: 3,
    raison: citeLeGuide(GUIDE_MATHS_CP, "La résolution de problèmes arithmétiques : périodes 3 à 5 […] Certains problèmes complexes pourront être proposés pour préparer le CE1 (en commençant par travailler avec des nombres inférieurs à 20), par exemple : […] problèmes de transformation mettant en jeu deux transformations successives avec recherche de l'état final (2 étapes)") },
  "multiplicatifs-cp": { niveau: "CP", periode: 4,
    raison: citeLeGuide(GUIDE_MATHS_CP, "Problèmes multiplicatifs (avec trois nombres en jeu inférieurs à 30 – périodes 4 et 5)") },
  "deux-etapes-ce1": { niveau: "CE1", periode: 1,
    raison: citeLeLivret("CE1", "En début d'année de CE1, la résolution de problèmes additifs du type parties-tout en une ou plusieurs étapes portant sur des nombres inférieurs à 100 est entretenue.") },
  "multiplicatifs-ce1": { niveau: "CE1", periode: 3,
    raison: citeLesReperesDe2019("CE1", "À partir de la période 3, ils rencontrent de nouveaux problèmes multiplicatifs qu'ils peuvent résoudre en utilisant leurs connaissances des premières tables de multiplication (exemple de la tablette de chocolat : combien y a-t-il de carreaux dans une tablette de 3 carreaux par 6 ?).") },
  "mixtes-ce1": { niveau: "CE1", periode: 4,
    raison: citeLesReperesDe2019("CE1", "En période 4, l'étude du sens de la division est préparée par la résolution de deux types de problèmes […]. En parallèle, les élèves résolvent des problèmes à deux étapes mixant addition et soustraction, ou multiplication lorsque les nombres en jeu ne nécessitent pas la mise en œuvre d'un algorithme opératoire.") },
  "parties-tout-comparaison-ce2": PROBLEMES_DU_DEBUT_DU_CE2,
  "multiplicatifs-ce2": PROBLEMES_DU_DEBUT_DU_CE2,
  "deux-etapes-ce2": PROBLEMES_DU_DEBUT_DU_CE2,
  "mixtes-ce2": PROBLEMES_DU_DEBUT_DU_CE2,
  "problemes-donnees-ce2": PROBLEMES_DU_DEBUT_DU_CE2,
  // Le français : les guides de lecture et d'écriture du CP et du CE1, et l'ordre des temps du programme.
  "phrase-cp": { niveau: "CP", periode: 1,
    raison: citeLeGuide(GUIDE_LECTURE_CP, "Dès la première phrase de l'année, ils doivent savoir qu'elle commence par une majuscule et se termine par un point.") },
  "accents-c2": { niveau: "CP", periode: 3,
    raison: `${citeLeGuide(GUIDE_LECTURE_CP, "Dès qu'apparaîtront les lettres accentuées, on n'hésitera pas à utiliser les mots qui conviennent : accent aigu, accent grave, accent circonflexe.")} `
      + "Sa progression des correspondances graphème-phonème les fait paraître en période 3 (janvier-février) : à, â, è, ê, ë." },
  "valeur-des-lettres-c2": [
    { niveau: "CP", periode: 4,
      raison: `${citeLeGuide(GUIDE_LECTURE_CP, "Période 4 (mars-avril) — Consonnes fricatives 5 - les différents graphèmes pour les phonèmes ‘s’ et ‘j’")} : `
        + "c prononcé ‘ss’ et ç, g prononcé ‘j’ et ge — après s prononcé ‘z’ en période 2, puis c et g prononcés ‘k’ et ‘g’, am et im devant m, b, p en période 3." },
    { niveau: "CE1", periode: 1,
      raison: citeLeGuide(GUIDE_LECTURE_CE1, "Des séances régulières (tous les jours en période 1, puis trois fois par semaine en périodes 2, 3, 4, et deux fois par semaine en période 5) renforcent les habiletés de décodage. […] on invitera l'élève à se centrer sur la valeur sonore de certaines lettres en fonction de leur voisinage pour effectuer un choix pertinent, et sur la composition de certains graphèmes selon la lettre qui suit : an/am, en/em, on/om, in/im.") },
  ],
  "genre-nombre-cp": { niveau: "CP", periode: 3,
    raison: citeLeProgrammeDeFrancais("CP", "En milieu d'année — Il déchiffre tous les mots selon la progression des CGP et identifie les marques grammaticales en genre et en nombre.") },
  "sujet-verbe-c2": { niveau: "CP", periode: 3,
    raison: `${citeLeGuide(GUIDE_LECTURE_CP, "Période 3 (janvier-février) — […] -ent : terminaison muette — Pluriel des verbes du premier groupe")} : `
      + "le « -nt » qu'on n'entend pas, que la séquence fait découvrir (« les chats miaulent »)." },
  "connecteurs-ce1": { niveau: "CE1", periode: 1,
    raison: citeLeGuide(GUIDE_LECTURE_CE1, "Au cours des périodes 1 à 3, l'élève s'apercevra qu'une suite de phrases ne peut se suffire à constituer un texte cohérent ; il faudra apprendre à insérer des connecteurs pour lier les phrases entre elles et pour produire une unité de sens.") },
  "conjuguer-present-c2": dansLOrdreDesTemps(1),
  "conjuguer-imparfait-c2": dansLOrdreDesTemps(3),
  "conjuguer-futur-c2": dansLOrdreDesTemps(4),
  "conjuguer-passe-compose-c2": dansLOrdreDesTemps(5),
};

/**
 * Les repères que le programme de français écrit dans la compétence même :
 * « (en fin de période 1) », « (en milieu d'année) », « (dès la 2e période) »… —
 * cherchés sans accents, l'apostrophe droite ou courbe. « Tout au long de
 * l'année » n'en fixe aucune.
 */
const MARQUES_DE_PERIODE: [RegExp, (m: RegExpMatchArray) => number][] = [
  [/\((?:en fin de|des la|a partir de la|a l['’]issue de la|des la fin de la) periode (\d)\)/, (m) => Number(m[1])],
  [/\((?:des la|des la fin de la) (\d)e periode\)/, (m) => Number(m[1])],
  [/\((?:des le debut de l['’]annee|des les premieres semaines)\)/, () => 1],
  [/\(en milieu d['’]annee\)/, () => 3],
  [/\((?:en fin d['’]annee|a la fin de l['’]annee)\)/, () => 5],
];

/** Les autres repères de période du programme, compétence par compétence. */
const REPERES: { niveau: string; motif: RegExp; periode: number; raison: string }[] = [
  { niveau: "CP", motif: /tables d.addition/, periode: 1,
    raison: cite("CP", "Ces résultats sont réintroduits progressivement pendant les deux premières périodes du CP, mais en les écrivant désormais avec les symboles « + » et « = ».") },
  { niveau: "CP", motif: /poser et effectuer des additions en colonnes/, periode: 4,
    raison: cite("CP", "Au CP, l'addition posée n'est introduite qu'en période 4 ou 5.") },
  { niveau: "CP", motif: /monnaie|pieces|billets|somme d.argent|achats/, periode: 2,
    raison: cite("CP", "La monnaie est introduite en période 2 ou 3.") },
  { niveau: "CE1", motif: /comparer des fractions/, periode: 4,
    raison: cite("CE1", "Dès la période 4, les élèves apprennent à comparer des fractions dans des cas simples.") },
  // Les fractions unitaires et leur écriture d'abord ; la suite — les fractions non unitaires, les additions — n'a pas de période.
  { niveau: "CE1", motif: /fractions 1\/2|les mots .{0,3}denominateur/, periode: 2,
    raison: cite("CE1", "Le travail sur les fractions commence dès la période 2 par l'introduction des fractions unitaires (de numérateur égal à 1) d'un tout et de leur écriture fractionnaire.") },
  { niveau: "CE1", motif: /additions et des soustractions en colonnes/, periode: 3,
    raison: cite("CE1", "Un algorithme de la soustraction posée est introduit en période 3 au plus tard.") },
  { niveau: "CE1", motif: /ecriture a virgule/, periode: 3,
    raison: cite("CE1", "L'écriture à virgule est utilisée à partir de la période 3.") },
  { niveau: "CE1", motif: /centimes?/, periode: 2,
    raison: cite("CE1", "Les centimes d'euro sont introduits au plus tard en période 2.") },
  { niveau: "CE2", motif: /unite de longueur en fractions/, periode: 3,
    raison: cite("CE2", "À partir de la période 3, le travail sur les fractions d'un tout permet de considérer une fraction d'une unité de longueur.") },
  { niveau: "CE2", motif: /poser et effectuer des multiplications/, periode: 4,
    raison: cite("CE2", "L'algorithme de la multiplication posée est introduit en période 4 au plus tard.") },
  { niveau: "CE2", motif: /additions de montants en euro/, periode: 2,
    raison: cite("CE2", "L'addition posée de montants en euro utilisant l'écriture à virgule est introduite au plus tard en période 2.") },
  { niveau: "CE2", motif: /soustractions de montants en euro/, periode: 4,
    raison: cite("CE2", "La soustraction posée de montants en euro utilisant l'écriture à virgule est introduite au plus tard en période 4.") },
];

const plat = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Un niveau lu tel qu'on l'écrit : « ce1 » devient « CE1 » ; ce qui n'en est pas un, rien. */
export function niveauDeProgrammation(niveau: string | null | undefined): string {
  const n = (niveau ?? "").trim().toUpperCase();
  return (NIVEAUX_DE_PROGRAMMATION as readonly string[]).includes(n) ? n : "";
}

/**
 * La programmation proposée pour une séquence : le niveau de sa compétence,
 * et la période que le programme fixe pour sa démarche ou sa compétence.
 * Rien quand on ne sait ni l'un ni l'autre.
 */
export function programmationProposee(
  c: { niveau?: string | null; competenceTitre?: string | null } | null, demarcheId = "",
): ProgrammationProposee | null {
  if (!c) return null;
  const niveau = niveauDeProgrammation(c.niveau);
  const repereDe = (table: Record<string, ReperePeriode | ReperePeriode[]>) =>
    ([] as ReperePeriode[]).concat(table[demarcheId] ?? []).find((r) => !r.niveau || r.niveau === niveau);
  const parDemarche = repereDe(PAR_DEMARCHE);
  if (parDemarche) return { niveau, periode: parDemarche.periode, raison: parDemarche.raison };
  const titre = plat(c.competenceTitre);
  const repere = REPERES.find((r) => r.niveau === niveau && r.motif.test(titre));
  if (repere) return { niveau, periode: repere.periode, raison: repere.raison };
  // Le repère écrit dans la compétence : on cite la compétence entière, son moment de l'année compris.
  for (const [motif, periode] of MARQUES_DE_PERIODE) {
    if (titre.match(motif) && niveau) return { niveau, periode: periode(titre.match(motif)!), raison: citeLeProgrammeDeFrancais(niveau, (c.competenceTitre ?? "").trim()) };
  }
  const sinon = repereDe(SINON_PAR_DEMARCHE);
  if (sinon) return { niveau, periode: sinon.periode, raison: sinon.raison };
  return niveau ? { niveau, periode: null, raison: "" } : null;
}

/** Ce que la programmation dit d'une séquence, en quelques mots : « CE1, période 2 » ; « Période 2 » sans niveau. */
export function libelleDeProgrammation(s: { niveau?: string | null; periode?: number | null }): string {
  const niveau = niveauDeProgrammation(s.niveau);
  if (niveau && s.periode) return `${niveau}, période ${s.periode}`;
  if (niveau) return niveau;
  return s.periode ? `Période ${s.periode}` : "";
}
