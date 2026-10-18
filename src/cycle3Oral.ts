// L'oral au cours moyen : écouter pour comprendre, dire pour être compris,
// participer à des échanges.
//
// Bâties, en le disant, sur le programme de français du cycle 3 (2025) et ses
// exemples de réussite du CM1 et du CM2 : les livrets d'accompagnement de
// français s'arrêtent au CE2. Le programme veut des temps d'apprentissage
// dédiés à l'oral ; chaque élève y prend la parole chaque jour, échange
// chaque semaine, s'exerce dans l'année à l'exposé et au débat, et apprend à
// évaluer un oral selon des critères. Les feuilles viennent de
// oralCoursMoyen.ts et de « Comprendre un texte » (l'écoute).

import type { Demarche, PhaseCadre, SeanceCadre } from "./demarches";
import type { ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { PROGRAMME_FRANCAIS_C3 } from "./cycle3Langue";
import { REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension } from "./comprehension";
import { REGLAGES_ORAL_CM, STYLE_ORAL_CM, htmlOralCM, type ExerciceOralCM } from "./oralCoursMoyen";

const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const seance = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[]): SeanceCadre => ({ titre, objectifs, duree, phases });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;
const trois = (titre: string, objectif: string, situation: string, activite: string, retenir: string, posture = "") =>
  seance(titre, sauront(objectif), 45, [ph(T1, "10 min", situation), ph(T2, "25 min", activite, posture), ph(T3, "10 min", retenir)]);
const entrainement = (titre: string, objectif: string, activite: string, retenir: string) =>
  seance(titre, sauront(objectif), 30, [ph(T1, "5 min", "Ce qu'on a retenu, rappelé par les élèves ; l'objectif du jour."), ph(T4, "20 min", activite), ph(T3, "5 min", retenir)]);
const evaluation = (quoi: string, ensuite: string) => seance("Évaluation", sauront(`${quoi}, seuls.`), 30, [
  ph("Évaluation", "25 min", `Une feuille : ${quoi}.`),
  ph(T4, "5 min", ensuite),
]);
const MODELE = "L'adulte est le modèle oral : il reformule les propos des élèves en insistant sur le vocabulaire, la syntaxe, la prononciation, et fournit les manières de dire.";

const ecouter = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `ecouter-${classe.toLowerCase()}`, nom: `Écouter pour comprendre : des textes, une interview, un reportage (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Construire sa posture d'auditeur par une écoute active orientée par un but ; comprendre un message d'un tiers ou d'un média — une interview, un reportage — ; manifester sa compréhension des textes entendus ; identifier les caractéristiques des genres de discours ; manifester sa sensibilité à l'écoute. Exemples de réussite : distinguer les propos de deux locuteurs — « La personne A dit cela, la personne B n'est pas d'accord parce que… » — ; dire ce qu'on n'a pas compris : qui, quand, où, pourquoi ; relever ce qui fait un récit, un documentaire, une consigne, un poème, une scène de théâtre ; réagir à une situation comique, triste, inquiétante, ou à une découverte scientifique."
      : "Construire sa posture d'auditeur par une écoute active orientée par un but ; comprendre un message d'un tiers ou d'un média — une interview, un reportage — ; manifester sa compréhension des textes entendus ; identifier les caractéristiques des genres de discours ; manifester sa sensibilité à l'écoute. Exemples de réussite : restituer l'essentiel après une attention prolongée ; reformuler — « La personne dit : « … » ; explique que… ; demande si… » — ; redire un récit ou un documentaire entendu : les personnages, le lieu, le moment, l'essentiel ; en déduire l'implicite ; dire sa réaction : « Ce texte me fait rire… parce que… ; J'ai appris que… ».",
    seances: [
      trois("Écouter un texte lu", "écouter un texte avec un but et en redire l'essentiel.",
        "L'adulte annonce le but de l'écoute : on devra raconter, ou répondre à des questions.",
        "Écouter deux fois un récit ou un documentaire lu par l'adulte ; répondre aux questions sans le texte ; remettre les moments dans l'ordre ; redire l'essentiel à son voisin.",
        "Ce qu'on retient : j'écoute avec un but ; je me fais le film ; je retiens qui, où, quand, quoi.", MODELE),
      trois("Écouter une interview, un reportage", "comprendre un document entendu et le reformuler.",
        "Un extrait d'interview ou de reportage, d'une radio ou d'un site pour la jeunesse : qui parle ? de quoi ?",
        `Deux écoutes ; prendre des notes, des mots et non des phrases ; compléter la fiche ; reformuler — la personne explique que…${cm2 ? " ; la personne B n'est pas d'accord parce que…" : ""}`,
        "Ce qu'on retient : je reformule sans déformer ; je cite entre guillemets ce que la personne a dit."),
      entrainement("Ce que le texte me fait", "dire le genre d'un texte entendu et ce qu'il fait ressentir.",
        "Écouter des textes de genres différents — un poème, une scène, un documentaire — ; dire le genre et ce qu'on ressent, en le justifiant : ce texte me fait… parce que…",
        "Ce qu'on retient : ma réaction se justifie par ce que j'ai entendu."),
      evaluation("écouter un texte et un document, et montrer ce qu'on a compris", "Ensuite, des écoutes régulières, dans toutes les disciplines."),
    ],
  };
};

const dire = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `dire-${classe.toLowerCase()}`, nom: `Dire pour être compris : expliquer, exposer, réciter (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Réaliser une production orale, seul ou à plusieurs, claire et organisée, pour raconter, expliquer, argumenter, justifier, partager des connaissances ; faire vivre un texte par une lecture expressive devant un public ; utiliser l'oral comme outil réflexif. Exemples de réussite : expliciter un texte documentaire, un schéma, un tableau, une carte ; organiser son discours selon une structure ; interpréter un personnage, un journaliste, un spécialiste interviewé ; réciter un poème avec sa prosodie ; expliquer sa démarche dans l'ordre et la source de ses erreurs — « J'ai commencé par… puis… enfin… ; je me suis trompé sur… » — ; évaluer un oral avec les critères construits avec l'enseignant."
      : "Réaliser une production orale, seul ou à plusieurs, claire et organisée, pour raconter, expliquer, argumenter, justifier, partager des connaissances ; faire vivre un texte par une lecture expressive devant un public ; utiliser l'oral comme outil réflexif. Exemples de réussite : expliciter un texte documentaire, un schéma, un tableau, une carte avec le vocabulaire appris et les formules données — « Ce tableau montre que… » — ; réciter un poème ou un texte ; expliquer comment on a fait et repérer la source de ses erreurs — « Si je me suis trompé, c'est peut-être que… » — ; évaluer un oral avec les critères donnés.",
    seances: [
      trois("Expliquer un document à l'oral", "expliquer un tableau à quelqu'un, avec les mots du document.",
        "Un tableau projeté : comment l'expliquer à quelqu'un qui ne le voit pas ?",
        "Préparer trois phrases avec les mots du tableau et les formules ; l'expliquer à son groupe ; le groupe vérifie sur le tableau.",
        "Ce qu'on retient : je nomme le document, je dis ce qu'il montre, je compare.", MODELE),
      entrainement("Expliquer comment j'ai fait", "dire sa démarche dans l'ordre, et où l'on s'est trompé.",
        "Après un problème ou un exercice, préparer puis dire sa démarche dans l'ordre — j'ai commencé par…, puis… — et dire où l'on s'est trompé, et pourquoi.",
        "Ce qu'on retient : expliquer sa démarche aide à comprendre ses erreurs."),
      trois("Préparer un exposé", "préparer un exposé organisé, à partir de notes.",
        "Un exposé réussi, un exposé raté : quelle différence ?",
        "Choisir son sujet ; chercher ; préparer ses notes : l'introduction qui annonce le thème et le plan, trois parties, des exemples, une conclusion ; s'entraîner à voix haute.",
        "Ce qu'on retient : annoncer, organiser, illustrer, conclure."),
      trois("Présenter son exposé", "présenter un exposé devant la classe et répondre aux questions.",
        "Les orateurs se préparent ; le public prend la grille d'écoute.",
        "Présenter à partir de ses notes, sans les lire ; répondre aux questions ; recevoir, avec la grille, un point fort et un conseil.",
        "Ce qu'on retient : mon point fort, mon conseil pour le prochain oral."),
      entrainement("Réciter un poème", cm2 ? "réciter un poème en tenant compte de sa prosodie." : "réciter un poème appris, avec le ton qui convient.",
        "Apprendre un poème strophe par strophe, sur plusieurs jours ; préparer les pauses et le ton ; le réciter devant la classe.",
        "Ce qu'on retient : réciter, c'est faire entendre le poème, pas seulement le savoir."),
      ...(cm2 ? [trois("Jouer l'interview", "jouer un journaliste ou un spécialiste interviewé, en adaptant sa voix et ses mots.",
        "Une interview entendue : qui pose les questions ? qui répond ? comment ?",
        "Par deux, préparer l'interview d'un spécialiste d'un sujet étudié — en histoire, en sciences — : les questions du journaliste, les réponses du spécialiste ; la jouer devant la classe.",
        "Ce qu'on retient : j'adapte ma voix et mon vocabulaire à mon rôle.")] : []),
    ],
  };
};

const echanger = (classe: "CM1" | "CM2"): Demarche => {
  const cm2 = classe === "CM2";
  return {
    id: `echanger-${classe.toLowerCase()}`, nom: `Participer à des échanges : le débat réglé (${classe})`, famille: "Français",
    source: PROGRAMME_FRANCAIS_C3,
    resume: cm2
      ? "Prendre la parole en respectant les codes de la communication ; utiliser des structures de langage selon le but ; construire et ajuster son propos ; construire une analyse collective en interaction ; adapter son discours ; porter un regard critique sur l'oral produit. Exemples de réussite : moduler sa voix et son débit selon le but ; réagir aux propos des autres — « Je (ne) suis (pas) d'accord, car…, mais…, pourtant… ; j'ajouterais que… » — ; préparer des notes et insérer une ou deux phrases non rédigées ; tenir compte des avis — « Je comprends ce que tu veux me dire, mais… » — ; écouter un oral enregistré, le comparer à des critères et formuler un conseil : « Pense à annoncer le thème de ton exposé. Articule plus clairement. »"
      : "Prendre la parole en respectant les codes de la communication ; utiliser des structures de langage selon le but ; construire et ajuster son propos ; construire une analyse collective en interaction ; adapter son discours ; porter un regard critique sur l'oral produit. Exemples de réussite : parler de façon audible en articulant ; moduler sa voix selon qu'on s'adresse à une personne ou à un groupe ; regarder son auditoire ; intervenir sans couper la parole ; préparer son intervention par écrit et s'y appuyer ; un registre courant ; écouter un oral enregistré, le comparer à des critères ou à un enregistrement antérieur, et repérer un ou deux points à améliorer.",
    seances: [
      trois("Les règles de l'échange", "prendre la parole en respectant les règles de l'échange.",
        "Une discussion où tout le monde parle en même temps : que se passe-t-il ?",
        "Établir les règles : lever la main, attendre son tour, écouter, répondre à ce qui a été dit, parler pour être entendu de tous ; s'exercer en petits groupes sur une question simple.",
        "Ce qu'on retient : les règles de l'échange, affichées.", MODELE),
      trois("Préparer le débat", "préparer des arguments et des exemples pour un débat.",
        "La question du débat ; chacun dit son premier avis.",
        `Chercher au brouillon des arguments et des exemples ; apprendre les formules — je suis d'accord avec…, car…${cm2 ? " ; je comprends ce que tu veux dire, mais…" : ""} — ; répartir les rôles.`,
        "Ce qu'on retient : un argument, c'est une raison ; un exemple l'illustre."),
      trois("Le débat réglé", "débattre en justifiant son avis et en répondant aux autres.",
        "Les rôles en place : le président de séance, le gardien du temps, le secrétaire, les débatteurs, les observateurs.",
        "Débattre : donner son avis, le justifier, répondre aux arguments des autres ; le secrétaire note ; les observateurs écoutent avec la grille.",
        "Le bilan : les arguments de chaque avis ; ce qui a fait changer d'avis, et pourquoi."),
      entrainement("Écouter son oral", "écouter un oral enregistré, le comparer à des critères et donner un conseil.",
        "Écouter l'enregistrement d'un débat ou d'un exposé ; le comparer à la grille, ou à un enregistrement plus ancien ; repérer un ou deux points améliorés ou à améliorer ; formuler un conseil.",
        "Ce qu'on retient : un conseil précis aide à progresser."),
    ],
  };
};

export const DEMARCHES_ORAL_CM: Demarche[] = [ecouter("CM1"), dire("CM1"), echanger("CM1"), ecouter("CM2"), dire("CM2"), echanger("CM2")];

/** La séquence d'une compétence d'oral du cours moyen ; en minuscules sans accents. */
export function demarcheDeLOralCM(classe: string, cg: string): string | null {
  if (classe !== "cm1" && classe !== "cm2") return null;
  if (/ecouter pour comprendre/.test(cg)) return `ecouter-${classe}`;
  if (/dire pour etre compris/.test(cg)) return `dire-${classe}`;
  if (/echanges verbaux/.test(cg)) return `echanger-${classe}`;
  return null;
}

// ── Les feuilles ──────────────────────────────────────────────────────────

type Classe = "CM1" | "CM2";
const ecoute = (seance: number, titre: string, classe: Classe, texte: string): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_COMPREHENSION, classe, exercice: "ecoute" as const, texte };
  return { seance, atelier: "comprehension", titre, fabriquer: (g) => ({ html: htmlComprehension(reglages, g), style: STYLE_FEUILLE + STYLE_COMPREHENSION, refaire: { comprehension: reglages } }) };
};
const or = (seance: number, titre: string, classe: Classe, exercice: ExerciceOralCM): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_ORAL_CM, classe, exercice };
  return { seance, atelier: "oral", titre, fabriquer: (g) => ({ html: htmlOralCM(reglages, g), style: STYLE_FEUILLE + STYLE_ORAL_CM }) };
};

const PLANS: Record<string, { feuilles: FeuilleAFabriquer[]; materiel: string[] }> = {
  "ecouter-cm1": {
    feuilles: [ecoute(0, "J'écoute et je comprends", "CM1", "chien-gare-cm1"), or(1, "J'écoute une interview, un reportage", "CM1", "ecoute-media"),
      ecoute(2, "J'écoute un poème", "CM1", "pommier-cm1"), ecoute(3, "J'écoute un documentaire — évaluation", "CM1", "castor-cm1")],
    materiel: ["Le texte lu par l'adulte", "Un extrait d'interview ou de reportage pour la jeunesse ; de quoi l'écouter", "Des textes de genres différents, lus par l'adulte", "Le documentaire lu par l'adulte"],
  },
  "ecouter-cm2": {
    feuilles: [ecoute(0, "J'écoute et je comprends", "CM2", "horloge-cm2"), or(1, "J'écoute une interview, un reportage", "CM2", "ecoute-media"),
      ecoute(2, "J'écoute un poème", "CM2", "demain-cm2"), ecoute(3, "J'écoute un documentaire — évaluation", "CM2", "eau-cm2")],
    materiel: ["Le texte lu par l'adulte", "Un extrait d'interview ou de reportage, avec deux personnes qui parlent ; de quoi l'écouter", "Des textes de genres différents, lus par l'adulte", "Le documentaire lu par l'adulte"],
  },
  "dire-cm1": {
    feuilles: [or(0, "J'explique un tableau à l'oral", "CM1", "expliquer-document"), or(1, "J'explique comment j'ai fait", "CM1", "procedure"), or(2, "Je prépare mon exposé", "CM1", "expose"),
      or(3, "J'écoute un oral, je donne un conseil", "CM1", "grille"), or(4, "J'apprends et je récite", "CM1", "recitation")],
    materiel: ["Le tableau projeté", "Un problème ou un exercice déjà fait", "Des livres documentaires ; un ordinateur", "La grille d'écoute", "Le poème"],
  },
  "dire-cm2": {
    feuilles: [or(0, "J'explique un tableau à l'oral", "CM2", "expliquer-document"), or(1, "J'explique comment j'ai fait", "CM2", "procedure"), or(2, "Je prépare mon exposé", "CM2", "expose"),
      or(3, "J'écoute un oral, je donne un conseil", "CM2", "grille"), or(4, "J'apprends et je récite", "CM2", "recitation")],
    materiel: ["Le tableau projeté", "Un problème ou un exercice déjà fait", "Des livres documentaires ; un ordinateur", "La grille d'écoute ; un enregistreur", "Le poème", "Une interview entendue ; les sujets étudiés en histoire et en sciences"],
  },
  "echanger-cm1": {
    feuilles: [or(1, "Le débat réglé", "CM1", "debat"), or(2, "J'écoute un oral, je donne un conseil", "CM1", "grille"), or(3, "J'écoute mon oral", "CM1", "grille")],
    materiel: ["Une question simple au tableau", "La question du débat ; du papier brouillon", "Les étiquettes des rôles ; la grille d'écoute", "Un enregistreur ou une tablette"],
  },
  "echanger-cm2": {
    feuilles: [or(1, "Le débat réglé", "CM2", "debat"), or(2, "J'écoute un oral, je donne un conseil", "CM2", "grille"), or(3, "J'écoute mon oral", "CM2", "grille")],
    materiel: ["Une question simple au tableau", "La question du débat ; du papier brouillon", "Les étiquettes des rôles ; la grille d'écoute", "Un enregistreur ou une tablette"],
  },
};

export const estUneDemarcheDOralCM = (id: string) => id in PLANS;

export function planDeLOralCM(demarcheId: string, _ctx?: ContexteFeuilles): PlanDesFeuilles | null {
  const p = PLANS[demarcheId];
  if (!p) return null;
  const materiel = p.materiel.map((debut, s) => {
    const f = p.feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
  return { feuilles: p.feuilles, materiel };
}
