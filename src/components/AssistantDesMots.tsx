import React from "react";
import { api, type CategorieArasaac } from "../api";
import { corpusDe } from "../corpusProjet";
import { EXCLUES_PAR_DEFAUT, libelleCategorie } from "../data/categoriesArasaac";
import { MOTS_PAR_THEME, themesDeDepart } from "../departsEnUnClic";
import { melanger } from "../hasard";
import { MODES_IMAGES, MODE_IMAGES_DEFAUT, feuillesAvecImages } from "../imagesSelonMode";
import type { MotImage } from "../jeuxSons";
import { uneImageParMot } from "../loto";
import { feuillesPubliees } from "../optionsFeuille";
import { AtelierContext } from "./AtelierContext";
import { motsAvecImages } from "./Exemple";
import { BoutonMesImages } from "./MesImages";
import { useOptionsFeuille } from "./OptionsFeuille";
import { useModeDys, useModeImages, useNombreDePhotos } from "./PresentationFeuille";
import { useProjetDuMoment } from "./ProjetDuMoment";
import { QuestionsGuidees, type QuestionGuidee } from "./QuestionsGuidees";
import { toast } from "./Toaster";
import { useAsync } from "./ui";

// L'assistant des ateliers à mots (demande de l'enseignant, 31 octobre 2026) :
// à la place de la bande « Ou partir de », il pose ses questions une à une —
// avec quels mots, et celles de l'atelier — et chaque réponse le règle (voir
// QuestionsGuidees). D'abord sur les lotos, puis « mets l'assistant partout » :
// les dominos, l'intrus, les mots en gestes, la syllabe qui manque, les
// étiquettes, les ombres. Les mots du projet restent aussi à cocher dans la
// liste des mots.
//
// Puis : « à gauche, garde-le pour les images ; à droite, laisse le mode
// guidé ; le mode dyslexique… tout ça, demandé par le chatbot ». La colonne de
// gauche ne garde que les mots et leurs images ; chaque réglage de l'atelier
// est une question, et celles de la feuille suivent — ce qu'on imprime aussi,
// la consigne aux tablettes, le mode dyslexique, les images. L'assistant reste
// ouvert : revenu dans un atelier qui a ses mots, il montre les réponses en
// place, en pastilles, qu'un clic rouvre.

/** Une question de réglage : ce qu'elle demande, ce qu'une réponse règle — elle rend ce qu'on affiche de la réponse —, et la réponse en place. */
export interface QuestionDeReglage { question: QuestionGuidee; repondre: (choix: string, texte?: string) => string; actuelle: () => string }

/** Le dernier message, tant que la liste est vide. */
export const FIN_SANS_MOTS = "Écrivez vos mots à gauche, ou choisissez-en : la feuille se fait sous vos yeux.";

/**
 * Les réponses d'un assistant : celles qu'on donne une à une ; revenu dans un
 * atelier déjà réglé (`enPlaceAuDepart`), celles qui sont en place, qu'un clic
 * rouvre. La réponse d'un réglage se lit toujours dans sa valeur en place :
 * elle suit ce qui la change ailleurs.
 */
export function useReponsesGuidees(enPlaceAuDepart: boolean, parametres: QuestionDeReglage[]) {
  const [enPlace] = React.useState(enPlaceAuDepart);
  const [rouvertes, setRouvertes] = React.useState<string[]>([]);
  const [reponses, setReponses] = React.useState<Record<string, string>>({});
  /** Ce qu'on lit de chaque réponse ; `enPlaceSans` dit ce qu'affiche, en place, une question qui n'est pas un réglage — rien : on la pose. */
  const lire = (questions: QuestionGuidee[], enPlaceSans: (id: string) => string | undefined = () => undefined): Record<string, string> => {
    const lues: Record<string, string> = {};
    for (const q of questions) {
      const r = parametres.find((x) => x.question.id === q.id);
      const lue = reponses[q.id] !== undefined ? (r ? r.actuelle() : reponses[q.id])
        : enPlace && !rouvertes.includes(q.id) ? (r ? r.actuelle() : enPlaceSans(q.id)) : undefined;
      if (lue !== undefined) lues[q.id] = lue;
    }
    return lues;
  };
  const poser = (q: string, libelle: string) => {
    setReponses((r) => ({ ...r, [q]: libelle }));
    setRouvertes((l) => l.filter((x) => x !== q));
  };
  /** Oublier des réponses : leurs questions se reposent. */
  const oublier = (...ids: string[]) => setReponses((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !ids.includes(k))));
  /** Rouvrir des questions, même en place. */
  const revenir = (...ids: string[]) => { oublier(...ids); setRouvertes((l) => [...l.filter((x) => !ids.includes(x)), ...ids]); };
  /** Répondre à un réglage : il se règle, et sa réponse se range. */
  const regler = (q: string, choix: string, texte?: string): boolean => {
    const r = parametres.find((x) => x.question.id === q);
    if (r) poser(q, r.repondre(choix, texte));
    return !!r;
  };
  return { lire, poser, oublier, revenir, regler };
}

/** Une autre façon de trouver des mots, propre à l'atelier : un clic l'ouvre — la recherche des mots d'une syllabe —, et la réponse se note. */
export interface AutreSource { id: string; libelle: string; description?: string; choisir: () => void }

/**
 * L'assistant d'un atelier à mots : ses questions d'abord quand les mots en
 * dépendent (les syllabes à retrouver), puis les mots — ceux du projet, d'un
 * autre projet, d'un thème de la banque, ses images, ceux qu'on écrit, ou ce
 * que l'atelier propose —, puis ses réglages, puis ceux de la feuille.
 */
export function AssistantDesMots({ titre, question = "Avec quels mots ?", mots, onMots, banque, avant = [], reglages, autresSources = [], fin, parTheme = MOTS_PAR_THEME, feuille = true }: {
  titre: string;
  /** La question des mots : « Avec quels mots fait-on le loto ? ». */
  question?: string;
  mots: MotImage[]; onMots: (mots: MotImage[]) => void; banque: boolean;
  /** Les questions à poser avant celle des mots. */
  avant?: QuestionDeReglage[];
  reglages: QuestionDeReglage[];
  autresSources?: AutreSource[];
  fin: React.ReactNode;
  /** Combien de mots un thème donne : une feuille d'ordinaire, davantage pour un loto ou des dominos, qui demandent des sons qui se répondent. */
  parTheme?: number;
  /** Poser aussi les questions de la feuille (voir useQuestionsDeLaFeuille). */
  feuille?: boolean;
}) {
  const [suite, setSuite] = React.useState<"" | "theme" | "projet">("");
  const [occupe, setOccupe] = React.useState(false);
  const { projet, corpus, choix } = useProjetDuMoment();
  const { data: niveauClasse } = useAsync(() => api.settingGet("niveauClasse").catch(() => null), []);
  // Tous les thèmes de la banque, pour celui qu'on écrit : ceux qui ont assez de mots, comme dans la liste des mots.
  const { data: categories } = useAsync<CategorieArasaac[]>(() => (banque ? api.arasaacCategories() : Promise.resolve([])), [banque]);
  const deLaFeuille = useQuestionsDeLaFeuille(feuille);
  const themes = banque && niveauClasse !== undefined ? themesDeDepart(niveauClasse) : [];
  const autres = choix.map((c) => c.projet).filter((p) => p.id !== projet?.id && corpusDe(p).mots.length > 0);
  // Arrivé sans mots, l'assistant pose tout, une question après l'autre ; revenu avec des mots, les réponses sont en place.
  const { lire, poser, oublier, revenir, regler } = useReponsesGuidees(mots.length > 0, [...avant, ...reglages, ...deLaFeuille]);
  /** Remplir la liste, puis afficher la réponse : rien ne change si rien ne vient. */
  const charger = async (q: string, libelle: string, lire: () => Promise<MotImage[]>) => {
    setOccupe(true);
    try {
      const lus = await lire();
      if (!lus.length) { toast("Rien à prendre ici pour l'instant.", { icone: "ℹ️" }); return; }
      onMots(lus);
      poser(q, `${libelle} — ${lus.length} mots`);
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };
  const piocher = async (categorie: string) => {
    const vivier = await api.arasaacSelection([categorie], EXCLUES_PAR_DEFAUT, false, 0, 1);
    return melanger(Math.random, uneImageParMot(vivier).map((x) => x.picto)).slice(0, parTheme).map((p) => ({ id: p.id, mot: p.mot }));
  };

  const questionDesMots: QuestionGuidee = {
    id: "mots", puce: "Les mots", titre: question,
    choix: [
      ...autresSources.map(({ id, libelle, description }) => ({ id: `source:${id}`, libelle, description })),
      ...(mots.length ? [{ id: "garder", libelle: `Garder mes ${mots.length} mots`, description: "ceux de la liste, à gauche" }] : []),
      ...(projet && corpus.mots.length ? [{ id: "projet", libelle: `📌 Le projet « ${projet.titre} »`, description: `ses ${corpus.mots.length} mots, avec leurs images` }] : []),
      ...(autres.length ? [{ id: "autreProjet", libelle: "📁 Un autre projet", description: autres.slice(0, 3).map((p) => p.titre).join(", ") + (autres.length > 3 ? "…" : "") }] : []),
      ...(themes.length || categories?.length ? [{
        id: "theme", libelle: "🐮 Un thème",
        description: `${themes.length ? `${themes.map((t) => t.libelle.toLowerCase()).join(", ")}, ou un autre` : "celui qu'on écrit"} : des mots que la banque illustre`,
      }] : []),
      {
        id: "images", libelle: "🖼 Mes images", description: "vos photos ou vos dessins, chacun avec son mot",
        bouton: ({ className, contenu }) => (
          <BoutonMesImages className={className} disabled={occupe}
            onImages={(images) => { if (images.length) { onMots(images.map((i) => ({ id: i.id, mot: i.mot }))); poser("mots", `🖼 Mes images — ${images.length}`); } }}>
            {contenu}
          </BoutonMesImages>
        ),
      },
      { id: "ecrire", libelle: "✍️ Je les écris", description: "dans « Mes mots », à gauche : la banque leur trouve une image" },
    ],
  };
  const questions: QuestionGuidee[] = [
    ...avant.map((r) => r.question),
    questionDesMots,
    ...(suite === "theme" ? [{
      id: "theme", puce: "Le thème", titre: "Quel thème ?",
      choix: themes.map((t) => ({ id: t.categorie, libelle: `${t.icone} ${t.libelle}` })),
      autre: { placeholder: "Un autre thème de la banque : la mer, l'école, les émotions…" },
    }] : suite === "projet" ? [{
      id: "projet", puce: "Le projet", titre: "Quel projet ?",
      choix: autres.slice(0, 6).map((p) => ({ id: p.id, libelle: `📌 ${p.titre || "Sans titre"}`, description: `${corpusDe(p).mots.length} mots` })),
    }] : []),
    ...reglages.map((r) => r.question),
    ...deLaFeuille.map((r) => r.question),
  ];
  // En place, la liste répond à la question des mots ; vide, elle la repose.
  const lues = lire(questions, (id) => (id === "mots" && mots.length ? `Mes ${mots.length} mots` : undefined));
  const repondre = (q: string, c: string, texte?: string) => {
    if (occupe) return;
    if (q === "mots") {
      setSuite(c === "theme" ? "theme" : c === "autreProjet" ? "projet" : "");
      oublier("theme", "projet");
      const source = autresSources.find((x) => `source:${x.id}` === c);
      if (source) { source.choisir(); poser("mots", source.libelle); }
      else if (c === "garder") poser("mots", `Mes ${mots.length} mots`);
      else if (c === "projet" && projet) void charger("mots", `📌 Le projet « ${projet.titre} »`, () => motsAvecImages(corpus.mots));
      else if (c === "theme") poser("mots", "🐮 Un thème");
      else if (c === "autreProjet") poser("mots", "📁 Un autre projet");
      else if (c === "ecrire") {
        poser("mots", "✍️ Je les écris");
        document.querySelector<HTMLTextAreaElement>("textarea[data-saisie-mots]")?.focus();
      }
      return;
    }
    if (q === "theme") {
      if (c === "autre") {
        // Le thème qu'on écrit : celui de la banque qui porte ce nom, sinon le premier qui le contient.
        const forme = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        const cherche = forme(texte ?? "");
        const possibles = (categories ?? []).filter((x) => x.nombre >= 6);
        const trouve = possibles.find((x) => forme(libelleCategorie(x.nom)) === cherche) ?? possibles.find((x) => forme(libelleCategorie(x.nom)).includes(cherche));
        if (!trouve) { toast(`Aucun thème de la banque ne s'appelle « ${(texte ?? "").trim()} ».`, { icone: "ℹ️" }); return; }
        void charger("theme", libelleCategorie(trouve.nom), () => piocher(trouve.nom));
        return;
      }
      const t = themes.find((x) => x.categorie === c);
      if (t) void charger("theme", `${t.icone} ${t.libelle}`, () => piocher(t.categorie));
      return;
    }
    if (q === "projet") {
      const p = autres.find((x) => x.id === c);
      if (p) void charger("projet", `📌 ${p.titre || "Sans titre"}`, () => motsAvecImages(corpusDe(p).mots));
      return;
    }
    regler(q, c, texte);
  };
  const rouvrir = (q: string) => {
    if (q === "mots") { revenir("mots", "theme", "projet"); setSuite(""); } else revenir(q);
  };
  return <QuestionsGuidees titre={titre} questions={questions} reponses={lues} onRepondre={repondre} onRevenir={rouvrir} fin={occupe ? "…" : fin} />;
}

// ── Les questions de la feuille ──

/** Ce que chaque case du bloc « La feuille » ajoute à la feuille, dit pour l'assistant. */
const SUR_LA_FEUILLE = {
  consigne: { libelle: "La consigne", description: "et la règle, imprimées : sans tablettes, ou pour la maison" },
  prenom: { libelle: "Prénom et date", description: "la ligne en haut de la feuille" },
  corrige: { libelle: "La correction", description: "sa page de corrigé, ou les réponses" },
  aide: { libelle: "Les aides", description: "le rappel de la leçon, « Je peux… », « Attention… »" },
} as const;
type CaseDeLaFeuille = keyof typeof SUR_LA_FEUILLE;

/** « La consigne, la correction » : les cases cochées, en une phrase. */
const enUnePhrase = (cles: CaseDeLaFeuille[]) => cles.length
  ? cles.map((c, i) => (i ? SUR_LA_FEUILLE[c].libelle.charAt(0).toLowerCase() + SUR_LA_FEUILLE[c].libelle.slice(1) : SUR_LA_FEUILLE[c].libelle)).join(", ")
  : "Rien d'autre";

/**
 * Les questions de la feuille, après celles de l'atelier : ce qu'on imprime
 * aussi, la consigne aux tablettes, le mode dyslexique, les photos ou les
 * pictos. Les mêmes réglages que le bloc « La feuille » (voir OptionsFeuille
 * et PresentationFeuille), posés seulement quand la feuille affichée en a
 * l'usage. L'atelier vient du contexte.
 */
export function useQuestionsDeLaFeuille(oui = true): QuestionDeReglage[] {
  const duContexte = React.useContext(AtelierContext);
  const atelier = oui ? duContexte : "";
  const { options, changer } = useOptionsFeuille(atelier);
  const contenu = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.lire(atelier));
  const connue = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.connue(atelier));
  const avecImages = React.useSyncExternalStore(feuillesAvecImages.abonner, () => feuillesAvecImages.lire(atelier));
  const [dys, setDys] = useModeDys(atelier);
  const [images, setImages] = useModeImages(atelier);
  const photos = useNombreDePhotos();
  if (!atelier) return [];
  const questions: QuestionDeReglage[] = [];
  const utiles = (Object.keys(SUR_LA_FEUILLE) as CaseDeLaFeuille[]).filter((c) => contenu[c]);
  if (utiles.length) {
    questions.push({
      question: {
        id: "surLaFeuille", puce: "La feuille", titre: "Qu'imprime-t-on aussi sur la feuille ?",
        choix: utiles.map((c) => ({ id: c, ...SUR_LA_FEUILLE[c] })),
        plusieurs: { coches: utiles.filter((c) => options[c]), aucun: true },
      },
      repondre: (c) => {
        const cochees = utiles.filter((x) => c.split(",").includes(x));
        changer(Object.fromEntries(utiles.map((x) => [x, cochees.includes(x)])));
        return enUnePhrase(cochees);
      },
      actuelle: () => enUnePhrase(utiles.filter((c) => options[c])),
    });
  }
  if (contenu.tablettes) {
    const dit = (oui: boolean) => (oui ? "La consigne part aux tablettes" : "Pas de consigne aux tablettes");
    questions.push({
      question: {
        id: "tablettes", puce: "Tablettes", titre: "La consigne part-elle aux tablettes ?",
        choix: [
          { id: "oui", libelle: "📱 Oui", description: "posée dans une séance, la feuille l'envoie : le téléphone la montre aux tablettes, avec les aides du créneau" },
          { id: "non", libelle: "Non", description: "elle se dit, ou s'imprime" },
        ],
      },
      repondre: (c) => { changer({ tablettes: c === "oui" }); return dit(c === "oui"); },
      actuelle: () => dit(options.tablettes),
    });
  }
  if (connue) {
    const dit = (oui: boolean) => (oui ? "Mode dyslexique" : "Police habituelle");
    questions.push({
      question: {
        id: "dys", puce: "Dyslexie", titre: "Le mode dyslexique ?",
        choix: [
          { id: "non", libelle: "Non", description: "la police habituelle" },
          { id: "oui", libelle: "Oui", description: "des lettres bien distinctes, plus d'espace entre les lettres, les mots et les lignes, ni italique ni texte justifié" },
        ],
      },
      repondre: (c) => { setDys(c === "oui"); return dit(c === "oui"); },
      actuelle: () => dit(dys),
    });
  }
  // Comme le choix du bloc « La feuille » : dès qu'on a pris une photo et que la feuille montre des images.
  if (images !== MODE_IMAGES_DEFAUT || (photos > 0 && avecImages)) {
    const libelle = (id: string) => MODES_IMAGES.find((m) => m.id === id)?.libelle ?? MODES_IMAGES[0].libelle;
    questions.push({
      question: {
        id: "photosOuPictos", puce: "Images", titre: "Photos ou pictos ?",
        choix: MODES_IMAGES.map((m) => ({ id: m.id, libelle: m.libelle, description: m.aide })),
      },
      repondre: (c) => { const m = MODES_IMAGES.find((x) => x.id === c) ?? MODES_IMAGES[0]; setImages(m.id); return m.libelle; },
      actuelle: () => libelle(images),
    });
  }
  return questions;
}

// ── Les questions de réglage que plusieurs ateliers posent ──

export function questionDesPlanches(planches: number, maj: (n: number) => void): QuestionDeReglage {
  const dit = (n: number) => `${n} planche${n > 1 ? "s" : ""}`;
  return {
    question: {
      id: "planches", puce: "Planches", titre: "Combien de planches ? Une par joueur.",
      choix: [2, 4, 6, 8].map((n) => ({ id: String(n), libelle: `${n} planches` })),
      autre: { placeholder: "Un autre nombre, de 1 à 12", nombre: { min: 1, max: 12 } },
    },
    repondre: (c, texte) => {
      const n = Math.max(1, Math.min(12, Number(texte ?? c) || 4));
      maj(n);
      return dit(n);
    },
    actuelle: () => dit(planches),
  };
}

export function questionDesCases(cases: number, maj: (n: 6 | 9) => void): QuestionDeReglage {
  return {
    question: {
      id: "cases", puce: "Cases", titre: "Combien de cases sur chaque planche ?",
      choix: [
        { id: "6", libelle: "6 cases", description: "trois par rang, sur deux rangs : de grandes images" },
        { id: "9", libelle: "9 cases", description: "trois par rang, sur trois rangs" },
      ],
    },
    repondre: (c) => { const n = c === "9" ? 9 : 6; maj(n); return `${n} cases`; },
    actuelle: () => `${cases === 9 ? 9 : 6} cases`,
  };
}

export function questionDesLegendes(legendes: boolean, maj: (oui: boolean) => void): QuestionDeReglage {
  const dit = (oui: boolean) => (oui ? "Le mot sous l'image" : "Les images seules");
  return {
    question: {
      id: "legendes", puce: "L'écrit", titre: "Écrit-on le mot sous chaque image ?",
      choix: [
        { id: "non", libelle: "Non, les images seules", description: "on écoute, on ne lit pas" },
        { id: "oui", libelle: "Oui, le mot sous l'image", description: "pour qui commence à lire" },
      ],
    },
    repondre: (c) => { maj(c === "oui"); return dit(c === "oui"); },
    actuelle: () => dit(legendes),
  };
}
