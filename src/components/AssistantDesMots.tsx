import React from "react";
import { api } from "../api";
import { corpusDe } from "../corpusProjet";
import { EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { MOTS_PAR_THEME, themesDeDepart } from "../departsEnUnClic";
import { melanger } from "../hasard";
import type { MotImage } from "../jeuxSons";
import { uneImageParMot } from "../loto";
import { motsAvecImages } from "./Exemple";
import { BoutonMesImages } from "./MesImages";
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

/** Une question de réglage : ce qu'elle demande, et ce qu'une réponse règle — elle rend ce qu'on affiche de la réponse. */
export interface QuestionDeReglage { question: QuestionGuidee; repondre: (choix: string, texte?: string) => string }

/** Le dernier message, tant que la liste est vide. */
export const FIN_SANS_MOTS = "Écrivez vos mots à gauche, ou choisissez-en : la feuille se fait sous vos yeux.";

/** Une autre façon de trouver des mots, propre à l'atelier : un clic l'ouvre — la recherche des mots d'une syllabe —, et la réponse se note. */
export interface AutreSource { id: string; libelle: string; description?: string; choisir: () => void }

/**
 * L'assistant d'un atelier à mots : ses questions d'abord quand les mots en
 * dépendent (les syllabes à retrouver), puis les mots — ceux du projet, d'un
 * autre projet, d'un thème de la banque, ses images, ceux qu'on écrit, ou ce
 * que l'atelier propose —, puis ses autres questions. Il s'ouvre tant que la
 * liste est vide.
 */
export function AssistantDesMots({ titre, question = "Avec quels mots ?", mots, onMots, banque, avant = [], reglages, autresSources = [], fin, parTheme = MOTS_PAR_THEME }: {
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
}) {
  const [ouvert, setOuvert] = React.useState(() => mots.length === 0);
  const [reponses, setReponses] = React.useState<Record<string, string>>({});
  const [suite, setSuite] = React.useState<"" | "theme" | "projet">("");
  const [occupe, setOccupe] = React.useState(false);
  const { projet, corpus, choix } = useProjetDuMoment();
  const { data: niveauClasse } = useAsync(() => api.settingGet("niveauClasse").catch(() => null), []);
  const themes = banque && niveauClasse !== undefined ? themesDeDepart(niveauClasse) : [];
  const autres = choix.map((c) => c.projet).filter((p) => p.id !== projet?.id && corpusDe(p).mots.length > 0);
  const poser = (q: string, libelle: string) => setReponses((r) => ({ ...r, [q]: libelle }));
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
      ...(themes.length ? [{ id: "theme", libelle: "🐮 Un thème", description: `${themes.map((t) => t.libelle.toLowerCase()).join(", ")} : des mots que la banque illustre` }] : []),
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
    }] : suite === "projet" ? [{
      id: "projet", puce: "Le projet", titre: "Quel projet ?",
      choix: autres.slice(0, 6).map((p) => ({ id: p.id, libelle: `📌 ${p.titre || "Sans titre"}`, description: `${corpusDe(p).mots.length} mots` })),
    }] : []),
    ...reglages.map((r) => r.question),
  ];
  const repondre = (q: string, c: string, texte?: string) => {
    if (occupe) return;
    if (q === "mots") {
      setSuite(c === "theme" ? "theme" : c === "autreProjet" ? "projet" : "");
      setReponses((r) => { const { theme: _t, projet: _p, ...reste } = r; return reste; });
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
      const t = themes.find((x) => x.categorie === c);
      if (t) void charger("theme", `${t.icone} ${t.libelle}`, () => piocher(t.categorie));
      return;
    }
    if (q === "projet") {
      const p = autres.find((x) => x.id === c);
      if (p) void charger("projet", `📌 ${p.titre || "Sans titre"}`, () => motsAvecImages(corpusDe(p).mots));
      return;
    }
    const r = [...avant, ...reglages].find((x) => x.question.id === q);
    if (r) poser(q, r.repondre(c, texte));
  };
  const revenir = (q: string) => {
    setReponses((r) => {
      const suite2 = { ...r };
      delete suite2[q];
      if (q === "mots") { delete suite2.theme; delete suite2.projet; }
      return suite2;
    });
    if (q === "mots") setSuite("");
  };
  if (!ouvert) {
    return (
      <div className="qg-ferme">
        <button type="button" className="btn ghost sm" onClick={() => setOuvert(true)}>💬 {titre}</button>
      </div>
    );
  }
  return (
    <QuestionsGuidees titre={titre} questions={questions} reponses={reponses} onRepondre={repondre} onRevenir={revenir}
      fin={occupe ? "…" : fin} onFermer={() => setOuvert(false)} />
  );
}

// ── Les questions de réglage que plusieurs ateliers posent ──

export function questionDesPlanches(maj: (n: number) => void): QuestionDeReglage {
  return {
    question: {
      id: "planches", puce: "Planches", titre: "Combien de planches ? Une par joueur.",
      choix: [2, 4, 6, 8].map((n) => ({ id: String(n), libelle: `${n} planches` })),
      autre: { placeholder: "Un autre nombre, de 1 à 12", nombre: { min: 1, max: 12 } },
    },
    repondre: (c, texte) => {
      const n = Math.max(1, Math.min(12, Number(texte ?? c) || 4));
      maj(n);
      return `${n} planche${n > 1 ? "s" : ""}`;
    },
  };
}

export function questionDesCases(maj: (n: 6 | 9) => void): QuestionDeReglage {
  return {
    question: {
      id: "cases", puce: "Cases", titre: "Combien de cases sur chaque planche ?",
      choix: [
        { id: "6", libelle: "6 cases", description: "trois par rang, sur deux rangs : de grandes images" },
        { id: "9", libelle: "9 cases", description: "trois par rang, sur trois rangs" },
      ],
    },
    repondre: (c) => { const n = c === "9" ? 9 : 6; maj(n); return `${n} cases`; },
  };
}

export function questionDesLegendes(maj: (oui: boolean) => void): QuestionDeReglage {
  return {
    question: {
      id: "legendes", puce: "L'écrit", titre: "Écrit-on le mot sous chaque image ?",
      choix: [
        { id: "non", libelle: "Non, les images seules", description: "on écoute, on ne lit pas" },
        { id: "oui", libelle: "Oui, le mot sous l'image", description: "pour qui commence à lire" },
      ],
    },
    repondre: (c) => { maj(c === "oui"); return c === "oui" ? "Le mot sous l'image" : "Les images seules"; },
  };
}

