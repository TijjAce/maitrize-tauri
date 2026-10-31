import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ChoixPicto, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { ApercuExemple } from "../components/Exemple";
import { useQuestionsDeLaFeuille, useReponsesGuidees, type QuestionDeReglage } from "../components/AssistantDesMots";
import { QuestionsGuidees, type QuestionGuidee } from "../components/QuestionsGuidees";
import { toast } from "../components/Toaster";
import { Textarea } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import { codeActuel, hexDe } from "../codeDeLaPhrase";
import type { MotImage } from "../jeuxSons";
import { motsDeLaListe } from "../loto";
import { pictosDesMots } from "../mesPictos";
import {
  REGLAGES_PUZZLE, SORTES, STYLE_PUZZLE, THEMES_DE_PUZZLE, combienDePhrases, htmlPuzzle, motDeLImage, reglagesPuzzle,
  type PiecesDuPuzzle, type ReglagesPuzzle, type SortePiece,
} from "../phrasesPuzzle";
import { Boutons, Colonnes, bureau, imprimer } from "./AteliersSons";

// ── Fabriquer › Lecture et écriture › Les phrases en puzzle ──────────────
//
// Les sujets, les verbes et les compléments en trois listes (voir
// phrasesPuzzle.ts) ; chaque groupe de mots trouve son image dans la banque
// — le nom, ou l'infinitif du verbe — et la change d'un clic : elles seules
// à gauche. À droite, l'assistant pose ses questions une à une : les pièces
// d'un thème ou les siennes, leur taille, l'écriture, le code de la phrase,
// les images, les étiquettes des sachets, puis la feuille.

/** Chaque groupe de mots avec l'image que la banque donne à son nom, ou à l'infinitif de son verbe ; sans image, le mot seul. */
async function avecImages(textes: string[], sorte: SortePiece): Promise<MotImage[]> {
  const cles = textes.map((t) => motDeLImage(t, sorte));
  const [trouves] = await pictosDesMots([...new Set(cles.filter(Boolean))]).catch(() => [[], []] as [{ id: number; mot: string }[], string[]]);
  const parMot = new Map<string, number>();
  for (const p of trouves) if (!parMot.has(p.mot.toLowerCase())) parMot.set(p.mot.toLowerCase(), p.id);
  return textes.map((mot, i) => ({ id: parMot.get(cles[i].toLowerCase()) ?? null, mot }));
}

/** Les pièces d'un thème, avec leurs images. */
async function piecesDuTheme(id: string): Promise<PiecesDuPuzzle> {
  const t = THEMES_DE_PUZZLE.find((x) => x.id === id) ?? THEMES_DE_PUZZLE[0];
  const [sujet, verbe, complement] = await Promise.all(SORTES.map((s) => avecImages(t.pieces[s.id], s.id)));
  return { sujet, verbe, complement };
}

function PieceDeLaListe({ m, onRetirer, onImage }: { m: MotImage; onRetirer: () => void; onImage: () => void }) {
  const src = usePictoImage(m.id);
  return (
    <span className="bm-chip" title={m.id == null ? "Aucune image trouvée : le mot s'imprimera seul" : m.mot}>
      <button type="button" className="bm-image" onClick={onImage} aria-label={`Changer l'image de « ${m.mot} »`} title={`Changer l'image de « ${m.mot} »`}>
        {src ? <img src={src} alt="" /> : <span className="bm-vide" />}
      </button>
      <span className="bm-mot">{m.mot}</span>
      <button type="button" className="bm-x" aria-label={`Retirer ${m.mot}`} onClick={onRetirer}>×</button>
    </span>
  );
}

/** Une sorte de pièces : ses groupes de mots, un par ligne, chacun avec son image. */
function ListeDePieces({ sorte, liste, onChange, banque, couleur }: {
  sorte: (typeof SORTES)[number]; liste: MotImage[]; onChange: (l: MotImage[]) => void; banque: boolean; couleur: string;
}) {
  const [texte, setTexte] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const [aChanger, setAChanger] = React.useState<number | null>(null);
  const ajouter = async () => {
    const deja = new Set(liste.map((m) => m.mot.toLowerCase()));
    const saisies = motsDeLaListe(texte).filter((m) => !deja.has(m.toLowerCase()));
    if (!saisies.length) return;
    setOccupe(true);
    try {
      onChange([...liste, ...(banque ? await avecImages(saisies, sorte.id) : saisies.map((mot) => ({ id: null, mot })))]);
      setTexte("");
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };
  const exemple = SORTES.indexOf(sorte) === 0 ? "le fermier\nle chien" : SORTES.indexOf(sorte) === 1 ? "nourrit\nregarde" : "une vache\nle cochon";
  return (
    <div className="pz-liste">
      <div className="pz-liste-titre"><span className="pz-pastille" style={{ background: couleur }} aria-hidden="true" />{sorte.pluriel}</div>
      <div className="pz-saisie">
        <Textarea rows={2} value={texte} placeholder={exemple} aria-label={`${sorte.pluriel}, un par ligne`} onChange={(e) => setTexte(e.target.value)} />
        <button type="button" className="btn sm" disabled={occupe || !texte.trim()} onClick={() => void ajouter()}>＋ Ajouter</button>
      </div>
      {liste.length > 0 && (
        <div className="bm-liste">
          {liste.map((m, i) => (
            <PieceDeLaListe key={`${m.mot}-${i}`} m={m} onRetirer={() => onChange(liste.filter((_, k) => k !== i))} onImage={() => setAChanger(i)} />
          ))}
        </div>
      )}
      {aChanger != null && liste[aChanger] && (
        <ChoixPicto valeur={{ id: liste[aChanger].id, mot: motDeLImage(liste[aChanger].mot, sorte.id) }} banque={banque}
          titre={`L'image de « ${liste[aChanger].mot} »`} onClose={() => setAChanger(null)}
          onValider={(p) => { onChange(liste.map((x, k) => (k === aChanger ? { ...x, id: p.id } : x))); setAChanger(null); }} />
      )}
    </div>
  );
}

export function PhrasesPuzzleTab({ banque }: { banque: boolean }) {
  const [sujet, setSujet] = useMotsGardes("phrasesPuzzle:sujets");
  const [verbe, setVerbe] = useMotsGardes("phrasesPuzzle:verbes");
  const [complement, setComplement] = useMotsGardes("phrasesPuzzle:complements");
  const [brut, maj] = useReglages<ReglagesPuzzle>("phrasesPuzzle", REGLAGES_PUZZLE);
  const r = React.useMemo(() => reglagesPuzzle(brut), [brut]);
  // Le code de la phrase de la classe, tel que l'atelier « Le code de la phrase » l'a gardé.
  const code = React.useMemo(() => codeActuel(), []);
  const pieces: PiecesDuPuzzle = React.useMemo(() => ({ sujet, verbe, complement }), [sujet, verbe, complement]);
  const poserLaListe: Record<SortePiece, (l: MotImage[]) => void> = { sujet: setSujet, verbe: setVerbe, complement: setComplement };
  const vide = !sujet.length && !verbe.length && !complement.length;
  // Sans pièces, celles d'un exemple — la ferme — : ce que donnera le puzzle.
  const [exemple, setExemple] = React.useState<PiecesDuPuzzle | null>(null);
  React.useEffect(() => {
    if (!vide || exemple) return;
    let vivant = true;
    piecesDuTheme("ferme").then((p) => { if (vivant) setExemple(p); }).catch(() => {});
    return () => { vivant = false; };
  }, [vide, exemple]);
  const montrees = vide ? exemple ?? { sujet: [], verbe: [], complement: [] } : pieces;
  const tous = [...montrees.sujet, ...montrees.verbe, ...montrees.complement];
  const images = usePictoImages(tous.map((m) => m.id).filter((x): x is number => x != null));
  const html = React.useMemo(() => htmlPuzzle(montrees, images, r, code), [montrees, images, r, code]);
  const n = combienDePhrases(pieces);
  const prendre = (p: PiecesDuPuzzle) => { setSujet(p.sujet); setVerbe(p.verbe); setComplement(p.complement); };
  const fabriquer = (im: Record<number, string>) => htmlPuzzle(pieces, im, r, code);
  const idsDesPieces = [...sujet, ...verbe, ...complement].map((m) => m.id).filter((x): x is number => x != null);

  // L'assistant : les pièces, puis la taille, l'écriture, le code, les images, les sachets, et la feuille. Revenu avec des
  // pièces, les réponses sont en place, en pastilles, qu'un clic rouvre (voir AssistantDesMots).
  const [occupe, setOccupe] = React.useState(false);
  const deLaFeuille = useQuestionsDeLaFeuille();
  const dit = (oui: boolean, si: string, sinon: string) => (oui ? si : sinon);
  const reglages: QuestionDeReglage[] = [
    {
      question: {
        id: "taille", puce: "Taille", titre: "Quelle taille de pièces ?",
        choix: [
          { id: "grandes", libelle: "De grandes pièces", description: "dix par page, pour les petites mains" },
          { id: "petites", libelle: "De petites pièces", description: "dix-huit par page" },
        ],
      },
      repondre: (c) => { maj({ taille: c === "petites" ? "petites" : "grandes" }); return dit(c === "petites", "De petites pièces", "De grandes pièces"); },
      actuelle: () => dit(r.taille === "petites", "De petites pièces", "De grandes pièces"),
    },
    {
      question: {
        id: "ecriture", puce: "L'écrit", titre: "Les mots en capitales, ou en script ?",
        choix: [
          { id: "capitales", libelle: "EN CAPITALES", description: "comme en maternelle" },
          { id: "script", libelle: "en script", description: "pour qui lit déjà" },
        ],
      },
      repondre: (c) => { maj({ ecriture: c === "script" ? "script" : "capitales" }); return dit(c === "script", "En script", "En capitales"); },
      actuelle: () => dit(r.ecriture === "script", "En script", "En capitales"),
    },
    {
      question: {
        id: "code", puce: "Couleurs", titre: "Aux couleurs du code de la phrase de la classe ?",
        choix: [
          { id: "oui", libelle: "Oui", description: "les couleurs et les marques choisies dans « Le code de la phrase »" },
          { id: "non", libelle: "Non", description: "des pièces blanches, à colorier" },
        ],
      },
      repondre: (c) => { maj({ code: c === "oui" }); return dit(c === "oui", "Aux couleurs du code", "Des pièces blanches"); },
      actuelle: () => dit(r.code, "Aux couleurs du code", "Des pièces blanches"),
    },
    {
      question: {
        id: "images", puce: "Images", titre: "Avec l'image de chaque groupe de mots ?",
        choix: [
          { id: "oui", libelle: "Oui", description: "le fermier, la vache : on lit l'image avant les mots" },
          { id: "non", libelle: "Non", description: "les mots seuls" },
        ],
      },
      repondre: (c) => { maj({ images: c === "oui" }); return dit(c === "oui", "Avec les images", "Les mots seuls"); },
      actuelle: () => dit(r.images, "Avec les images", "Les mots seuls"),
    },
    {
      question: {
        id: "sachets", puce: "Sachets", titre: "Les étiquettes des sachets ?",
        choix: [{ id: "oui", libelle: "Oui", description: "SUJET, VERBE, COMPLÉMENT, à coller sur chaque sachet" }, { id: "non", libelle: "Non" }],
      },
      repondre: (c) => { maj({ sachets: c === "oui" }); return dit(c === "oui", "Avec les étiquettes des sachets", "Sans étiquettes"); },
      actuelle: () => dit(r.sachets, "Avec les étiquettes des sachets", "Sans étiquettes"),
    },
    ...deLaFeuille,
  ];
  const { lire, poser, revenir, regler } = useReponsesGuidees(!vide, reglages);
  const questions: QuestionGuidee[] = [
    {
      id: "pieces", puce: "Les pièces", titre: "Avec quelles pièces ?",
      choix: [
        ...(!vide ? [{ id: "garder", libelle: "Garder mes pièces", description: `${sujet.length} sujets, ${verbe.length} verbes, ${complement.length} compléments` }] : []),
        ...THEMES_DE_PUZZLE.map((t) => ({ id: t.id, libelle: `${t.icone} ${t.nom}`, description: `${t.pieces.sujet.slice(0, 2).join(", ")}… ${t.pieces.verbe[0]}… ${t.pieces.complement[0]}…` })),
        { id: "ecrire", libelle: "✍️ Je les écris", description: "à gauche : un groupe de mots par ligne" },
      ],
    },
    ...reglages.map((x) => x.question),
  ];
  // En place, les listes répondent à la question des pièces ; vides, elles la reposent.
  const lues = lire(questions, (id) => (id === "pieces" && !vide ? "Mes pièces" : undefined));
  const repondre = (q: string, c: string, texte?: string) => {
    if (occupe) return;
    if (q === "pieces") {
      const t = THEMES_DE_PUZZLE.find((x) => x.id === c);
      if (t) {
        setOccupe(true);
        piecesDuTheme(t.id).then((p) => { prendre(p); poser("pieces", `${t.icone} ${t.nom}`); })
          .catch((e) => toast(String(e), { icone: "⚠️" })).finally(() => setOccupe(false));
      } else if (c === "garder") poser("pieces", "Mes pièces");
      else { poser("pieces", "✍️ Je les écris"); document.querySelector<HTMLTextAreaElement>(".pz-saisie textarea")?.focus(); }
      return;
    }
    regler(q, c, texte);
  };
  const fin = occupe ? "…" : vide ? "Écrivez vos sujets, vos verbes et vos compléments à gauche : le puzzle se fait sous vos yeux."
    : n ? `C'est prêt : ${n} phrase${n > 1 ? "s" : ""} possible${n > 1 ? "s" : ""} avec ces pièces.`
      : "⚠️ Il faut au moins un sujet, un verbe et un complément.";

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les phrases en puzzle
          <Aide titre="Les phrases en puzzle" vers="droite">
            <p>{"Des pièces de puzzle pour fabriquer des phrases : un sujet, un verbe, un complément. Elles ne s'emboîtent que dans l'ordre de la phrase ; en changeant une pièce, on en fait une autre."}</p>
            <p>{"Chaque groupe de mots sur sa ligne — « le fermier », « nourrit », « une vache » — : son image vient de la banque, d'après le nom ou l'infinitif du verbe, et se change d'un clic. Des sujets au singulier et des verbes au présent : toutes les phrases se tiennent."}</p>
          </Aide>
        </h3>
        {SORTES.map((s) => (
          <ListeDePieces key={s.id} sorte={s} liste={pieces[s.id]} onChange={poserLaListe[s.id]} banque={banque} couleur={r.code ? hexDe(code, s.id) : "var(--text-2)"} />
        ))}
      </>}
      droite={
        <div className="loto-droite">
          <QuestionsGuidees titre="Préparer le puzzle des phrases" questions={questions} reponses={lues} onRepondre={repondre} onRevenir={(q) => revenir(q)} fin={fin} />
          <Boutons sousLAssistant peut={n > 0} onImprimer={() => imprimer("phrasesPuzzle", "Les phrases en puzzle", fabriquer, idsDesPieces, STYLE_PUZZLE)}
            onBureau={() => bureau("phrasesPuzzle", "Les phrases en puzzle", fabriquer, idsDesPieces, STYLE_PUZZLE)} />
          {vide ? (exemple ? <ApercuExemple onPrendre={() => prendre(exemple)}><ApercuFeuille html={html} style={STYLE_PUZZLE} /></ApercuExemple> : null)
            : <ApercuFeuille html={html} style={STYLE_PUZZLE} />}
        </div>
      }
    />
  );
}
