import React from "react";
import { api, newId, nowIso } from "../api";
import { cleDesCompetences, objectifsDesAteliers } from "../ateliersCompetences";
import { Aide, AideEnLigne } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ApercuExemple } from "../components/Exemple";
import { ChoixPicto, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { avecLesPictos, creerAvecLIA, enregistrerGenerateur, pictosPourLesMots, questionDeLIA, retoucherAvecLIA, supprimerGenerateur, useGenerateursPerso } from "../components/GenerateursPerso";
import { toast, toastAnnulable } from "../components/Toaster";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { cleImage, type PictoPose } from "../supportsVisuels";
import { USAGES, type Usage } from "../usageAtelier";
import {
  BLOCS_PERSO, BORNES_COMBIEN, CLASSES_PERSO, CONSIGNE_ORDRE_A_DECOUPER, EXEMPLE_DE_GENERATEUR, LARGEUR_PLANCHE, generateurSur, STYLE_GENERATEURS_PERSO, blocVide, ceQuiManque,
  demandeAvecPrecisions, htmlGenerateurPerso, imagesDeLaRecette, memeImagePartout, motsSansImage, nomDuBloc, placeDansLaPlanche, poserPartout,
  type Affichage, type BlocPerso, type BlocPlanche, type Echange, type GenerateurPerso, type QuestionDeLIA, type SorteAvecCombien, type SorteDeBloc,
} from "../generateursPerso";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";

// ── Fabriquer › Mes générateurs ───────────────────────────────────────────
//
// L'enseignant décrit le support qu'il veut ; l'IA de Mistral en écrit la
// recette ; il la retouche ici — les mots, les pictos, ses photos, la place
// des images sur la planche —, à la main ou en demandant à l'IA. Tout se
// garde au fur et à mesure (voir generateursPerso.ts).

/** L'image d'un mot qu'on ajoute à la main, trouvée comme celles de l'IA ; rien sinon. */
async function pictoDuMot(mot: string): Promise<number | null> {
  return (await pictosPourLesMots([mot]).catch(() => []))[0]?.id ?? null;
}

/** Un élément : son image et son mot ; un clic pour changer l'un ou l'autre, la croix pour l'enlever. */
function Element({ e, banque, onChange, onRemove }: { e: PictoPose; banque: boolean; onChange: (e: PictoPose) => void; onRemove?: () => void }) {
  const [choix, setChoix] = React.useState(false);
  const src = usePictoImage(cleImage(e));
  return (
    <span className="gp-chip">
      <button type="button" className="gp-chip-image" onClick={() => setChoix(true)} title="Changer le mot, le picto ou la photo">
        {src ? <img src={src} alt="" /> : <span className="gp-chip-vide">?</span>}
        <span>{e.mot || "…"}</span>
      </button>
      {onRemove && <button type="button" className="gp-chip-x" onClick={onRemove} title="Enlever">✕</button>}
      {choix && <ChoixPicto valeur={e} banque={banque} photos onClose={() => setChoix(false)} onValider={(p) => { onChange(p); setChoix(false); }} />}
    </span>
  );
}

/** Une liste d'éléments, et de quoi en ajouter un en tapant son mot. */
function ListeElements({ elements, banque, onChange }: { elements: PictoPose[]; banque: boolean; onChange: (l: PictoPose[]) => void }) {
  const [mot, setMot] = React.useState("");
  const ajouter = async () => {
    const m = mot.trim();
    if (!m) return;
    setMot("");
    onChange([...elements, { id: await pictoDuMot(m), mot: m }]);
  };
  return (
    <div className="gp-liste">
      {elements.map((e, i) => (
        <Element key={i} e={e} banque={banque} onChange={(x) => onChange(elements.map((y, j) => (j === i ? x : y)))} onRemove={() => onChange(elements.filter((_, j) => j !== i))} />
      ))}
      <Input value={mot} placeholder="Un mot, puis Entrée" style={{ width: 150 }} onChange={(e) => setMot(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ajouter(); } }} />
    </div>
  );
}

/** Une liste dont l'ordre compte — les étapes d'une histoire, d'une recette — : chaque élément se déplace d'un cran. */
function ListeOrdonnee({ elements, banque, onChange }: { elements: PictoPose[]; banque: boolean; onChange: (l: PictoPose[]) => void }) {
  const [mot, setMot] = React.useState("");
  const deplacer = (i: number, j: number) => { const c = [...elements]; [c[i], c[j]] = [c[j], c[i]]; onChange(c); };
  const ajouter = async () => {
    const m = mot.trim();
    if (!m) return;
    setMot("");
    onChange([...elements, { id: await pictoDuMot(m), mot: m }]);
  };
  return (
    <div className="gp-liste">
      {elements.map((e, i) => (
        <span key={i} className="gp-etape">
          <b>{i + 1}</b>
          <Element e={e} banque={banque} onChange={(x) => onChange(elements.map((y, j) => (j === i ? x : y)))} onRemove={() => onChange(elements.filter((_, j) => j !== i))} />
          {i > 0 && <button type="button" className="gp-chip-x" title="Avant" onClick={() => deplacer(i, i - 1)}>‹</button>}
          {i < elements.length - 1 && <button type="button" className="gp-chip-x" title="Après" onClick={() => deplacer(i, i + 1)}>›</button>}
        </span>
      ))}
      {elements.length < 8 && <Input value={mot} placeholder="L'étape suivante, puis Entrée" style={{ width: 190 }} onChange={(e) => setMot(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void ajouter(); } }} />}
    </div>
  );
}

/** Un nombre, dans ses bornes. */
function Nombre({ label, valeur, min, max, onChange }: { label: string; valeur: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min={min} max={max} value={valeur} style={{ width: 80 }}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
    </Field>
  );
}

/** Les retouches qu'on demande souvent : un clic, et l'IA refait la recette ainsi. */
const RETOUCHES_RAPIDES: { libelle: string; consigne: string }[] = [
  { libelle: "Plus facile", consigne: "Rends les exercices plus faciles : moins d'éléments sur une feuille, des mots plus courts et plus courants, le picto avec le mot." },
  { libelle: "Plus difficile", consigne: "Rends les exercices un peu plus difficiles : plus d'éléments sur une feuille, des mots moins courants, un exercice de plus si c'est utile." },
  { libelle: "Pour des non-lecteurs", consigne: "Adapte pour des élèves qui ne lisent pas encore : des exercices avec des images plutôt que des phrases à lire, le picto avec le mot, des consignes très courtes." },
  { libelle: "D'autres mots", consigne: "Garde les mêmes exercices, mais prends d'autres mots du même thème." },
];

const AFFICHAGES: { id: Affichage; libelle: string }[] = [
  { id: "les-deux", libelle: "Le picto et le mot" }, { id: "picto", libelle: "Le picto seul" }, { id: "mot", libelle: "Le mot seul" },
];

/** La planche : les images se glissent à leur place ; un clic en choisit une, pour la grandir, la changer ou l'enlever. */
function PlancheEditeur({ bloc, banque, onChange }: { bloc: BlocPlanche; banque: boolean; onChange: (b: BlocPlanche) => void }) {
  const cadre = React.useRef<HTMLDivElement>(null);
  const [choisi, setChoisi] = React.useState<number | null>(null);
  const [glisse, setGlisse] = React.useState<number | null>(null);
  const [ajout, setAjout] = React.useState(false);
  const [changer, setChanger] = React.useState(false);
  const images = usePictoImages(bloc.objets.map((o) => cleImage(o.element)).filter((c): c is number | string => c !== null));
  const objets = (f: (o: BlocPlanche["objets"][number], i: number) => BlocPlanche["objets"][number] | null) =>
    onChange({ ...bloc, objets: bloc.objets.map(f).filter((o): o is BlocPlanche["objets"][number] => !!o) });
  const deplacer = (e: React.PointerEvent) => {
    if (glisse === null || !cadre.current) return;
    const r = cadre.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100);
    objets((o, i) => (i === glisse ? { ...o, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : o));
  };
  const o = choisi !== null ? bloc.objets[choisi] : null;
  return (
    <>
      <div ref={cadre} className="gp-planche-editeur" style={{ aspectRatio: `${LARGEUR_PLANCHE} / ${bloc.hauteur}` }}
        onPointerMove={deplacer} onPointerUp={() => setGlisse(null)} onPointerLeave={() => setGlisse(null)}>
        {bloc.objets.map((x, i) => {
          const [gauche, haut] = placeDansLaPlanche(x, bloc);
          const cle = cleImage(x.element);
          const src = cle !== null ? images[cle] : "";
          return (
            <div key={i} className={`gp-objet-editeur${choisi === i ? " choisi" : ""}`} style={{ left: `${gauche}%`, top: `${haut}%`, width: `${(x.taille / LARGEUR_PLANCHE) * 100}%` }}
              onPointerDown={(e) => { e.preventDefault(); setGlisse(i); setChoisi(i); }} title={x.element.mot}>
              {src ? <img src={src} alt="" draggable={false} /> : <span className="gp-objet-mot">{x.element.mot}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", margin: "6px 0" }}>
        <button type="button" className="btn sm" onClick={() => setAjout(true)}>➕ Une image</button>
        <Aide titre="La planche" vers="droite"><p>Glissez une image pour la placer. Un clic la choisit : le curseur change sa taille, « Changer » met un autre picto
          ou une de vos photos. Sur la feuille, chaque image reste dans le cadre, sa ligne comprise.</p></Aide>
        {o && choisi !== null && <>
          <span style={{ fontSize: 12.5 }}>{o.element.mot || "Image"} :</span>
          <input type="range" min={8} max={60} value={o.taille} aria-label="Taille" onChange={(e) => objets((x, i) => (i === choisi ? { ...x, taille: Number(e.target.value) } : x))} />
          <button type="button" className="btn sm ghost" onClick={() => setChanger(true)}>Changer</button>
          <button type="button" className="btn sm ghost" onClick={() => { objets((x, i) => (i === choisi ? null : x)); setChoisi(null); }}>Enlever</button>
        </>}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Nombre label="Hauteur (mm)" valeur={bloc.hauteur} min={40} max={230} onChange={(hauteur) => onChange({ ...bloc, hauteur })} />
        <Coche on={bloc.legendes} libelle="Une ligne pour écrire le nom" onChange={(legendes) => onChange({ ...bloc, legendes })} />
      </div>
      {ajout && <ChoixPicto valeur={{ id: null, mot: "" }} banque={banque} photos onClose={() => setAjout(false)}
        onValider={(p) => { onChange({ ...bloc, objets: [...bloc.objets, { element: p, x: 50, y: 50, taille: 26 }] }); setChoisi(bloc.objets.length); setAjout(false); }} />}
      {changer && o && <ChoixPicto valeur={o.element} banque={banque} photos onClose={() => setChanger(false)}
        onValider={(p) => { objets((x, i) => (i === choisi ? { ...x, element: p } : x)); setChanger(false); }} />}
    </>
  );
}

/** Ce qu'on règle d'un bloc : sa consigne, son contenu, combien en montre une feuille. */
function BlocEditeur({ bloc, rang, banque, onChange, onMonter, onDescendre, onSupprimer }: {
  bloc: BlocPerso; rang: number; banque: boolean; onChange: (b: BlocPerso) => void; onMonter?: () => void; onDescendre?: () => void; onSupprimer: () => void;
}) {
  const [a, setA] = React.useState(""), [b2, setB2] = React.useState("");
  const manque = ceQuiManque(bloc);
  const contenu = (() => {
    switch (bloc.sorte) {
      case "relier": return (
        <Field label="Les paires">
          {bloc.paires.map(([x, y], i) => (
            <div key={i} className="gp-paire">
              <Element e={x} banque={banque} onChange={(e) => onChange({ ...bloc, paires: bloc.paires.map((p, j) => (j === i ? [e, p[1]] : p)) })} />
              <span>—</span>
              <Element e={y} banque={banque} onChange={(e) => onChange({ ...bloc, paires: bloc.paires.map((p, j) => (j === i ? [p[0], e] : p)) })} />
              <button type="button" className="gp-chip-x" title="Enlever la paire" onClick={() => onChange({ ...bloc, paires: bloc.paires.filter((_, j) => j !== i) })}>✕</button>
            </div>
          ))}
          <div className="gp-paire">
            <Input value={a} placeholder="à gauche" style={{ width: 120 }} onChange={(e) => setA(e.target.value)} />
            <Input value={b2} placeholder="à droite" style={{ width: 120 }} onChange={(e) => setB2(e.target.value)} />
            <button type="button" className="btn sm" disabled={!a.trim() || !b2.trim()} onClick={async () => {
              const [x, y] = [a.trim(), b2.trim()];
              setA(""); setB2("");
              onChange({ ...bloc, paires: [...bloc.paires, [{ id: await pictoDuMot(x), mot: x }, { id: await pictoDuMot(y), mot: y }]] });
            }}>Ajouter</button>
          </div>
        </Field>
      );
      case "trier": return (
        <Field label="Les colonnes">
          {bloc.categories.map((c, i) => (
            <div key={i} className="gp-colonne">
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Input value={c.nom} style={{ width: 180 }} onChange={(e) => onChange({ ...bloc, categories: bloc.categories.map((x, j) => (j === i ? { ...x, nom: e.target.value } : x)) })} />
                {bloc.categories.length > 2 && <button type="button" className="gp-chip-x" title="Enlever la colonne"
                  onClick={() => onChange({ ...bloc, categories: bloc.categories.filter((_, j) => j !== i) })}>✕</button>}
              </div>
              <ListeElements elements={c.elements} banque={banque} onChange={(elements) => onChange({ ...bloc, categories: bloc.categories.map((x, j) => (j === i ? { ...x, elements } : x)) })} />
            </div>
          ))}
          {bloc.categories.length < 4 && <button type="button" className="btn sm ghost"
            onClick={() => onChange({ ...bloc, categories: [...bloc.categories, { nom: "Nouvelle colonne", elements: [] }] })}>➕ Une colonne</button>}
        </Field>
      );
      case "completer": return (<>
        <Field label="Les phrases">
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Textarea rows={6} value={bloc.phrases.join("\n")} onChange={(e) => onChange({ ...bloc, phrases: e.target.value.split("\n") })} />
            <Aide titre="Les phrases à compléter" vers="gauche"><p>Une phrase par ligne, le mot à trouver entre crochets : « Le [chat] dort. » Chaque feuille en tire
              quelques-unes au sort ; le corrigé écrit les mots.</p></Aide>
          </div>
        </Field>
        <Coche on={bloc.banque} libelle="Les mots à placer, au-dessus des phrases" onChange={(banqueMots) => onChange({ ...bloc, banque: banqueMots })} />
      </>);
      case "compter": return (<>
        <Field label="Les images à compter"><ListeElements elements={bloc.elements} banque={banque} onChange={(elements) => onChange({ ...bloc, elements })} /></Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Nombre label="De" valeur={bloc.min} min={1} max={20} onChange={(min) => onChange({ ...bloc, min, max: Math.max(min, bloc.max) })} />
          <Nombre label="À" valeur={bloc.max} min={1} max={20} onChange={(max) => onChange({ ...bloc, max, min: Math.min(max, bloc.min) })} />
        </div>
      </>);
      case "entourer": return (<>
        <Field label="Ce qu'il faut entourer"><ListeElements elements={bloc.cibles} banque={banque} onChange={(cibles) => onChange({ ...bloc, cibles })} /></Field>
        <Field label="Les autres"><ListeElements elements={bloc.autres} banque={banque} onChange={(autres) => onChange({ ...bloc, autres })} /></Field>
      </>);
      case "questions": return (
        <Field label="Les questions">
          {bloc.questions.map((q, i) => (
            <div key={i} className="gp-question">
              <div className="gp-question-ligne">
                <Input value={q.question} placeholder="La question" onChange={(e) => onChange({ ...bloc, questions: bloc.questions.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })} />
                <button type="button" className="gp-chip-x" title="Enlever la question" onClick={() => onChange({ ...bloc, questions: bloc.questions.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <div className="gp-question-ligne">
                <span>Réponse</span>
                <Input value={q.reponse} onChange={(e) => onChange({ ...bloc, questions: bloc.questions.map((x, j) => (j === i ? { ...x, reponse: e.target.value } : x)) })} />
                <span>Choix</span>
                <Input value={q.choix.join(", ")} placeholder="aucun"
                  onChange={(e) => onChange({ ...bloc, questions: bloc.questions.map((x, j) => (j === i ? { ...x, choix: e.target.value.split(",").map((c) => c.trim()).filter(Boolean) } : x)) })} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button type="button" className="btn sm ghost" onClick={() => onChange({ ...bloc, questions: [...bloc.questions, { question: "", reponse: "", choix: [] }] })}>➕ Une question</button>
            <Aide titre="Les questions" vers="droite"><p>Pour chaque question, sa réponse. Avec des choix, séparés par des virgules, l'élève coche la bonne case ;
              sans choix, il écrit sa réponse sur une ligne. Le corrigé coche ou écrit la réponse.</p></Aide>
          </div>
        </Field>
      );
      case "etiquettes": return <Field label="Les étiquettes"><ListeElements elements={bloc.elements} banque={banque} onChange={(elements) => onChange({ ...bloc, elements })} /></Field>;
      case "planche": return <PlancheEditeur bloc={bloc} banque={banque} onChange={onChange} />;
      case "associer": return <Field label="Les mots, avec leur image"><ListeElements elements={bloc.elements} banque={banque} onChange={(elements) => onChange({ ...bloc, elements })} /></Field>;
      case "ordre": {
        const consignes = [BLOCS_PERSO.find((x) => x.sorte === "ordre")!.consigne, CONSIGNE_ORDRE_A_DECOUPER];
        return (<>
          <Field label="Les étapes, dans l'ordre"><ListeOrdonnee elements={bloc.etapes} banque={banque} onChange={(etapes) => onChange({ ...bloc, etapes })} /></Field>
          <Coche on={bloc.decouper} libelle="Les images à découper et coller" onChange={(decouper) => onChange({
            ...bloc, decouper,
            // La consigne de départ suit ; celle qu'on a écrite reste.
            consigne: consignes.includes(bloc.consigne) ? consignes[decouper ? 1 : 0] : bloc.consigne,
          })} />
        </>);
      }
      case "choisir": return (
        <Field label="Les questions">
          {bloc.items.map((it, i) => {
            const changer = (x: Partial<typeof it>) => onChange({ ...bloc, items: bloc.items.map((y, j) => (j === i ? { ...y, ...x } : y)) });
            return (
              <div key={i} className="gp-question">
                <div className="gp-question-ligne">
                  <Input value={it.question} placeholder="La question" onChange={(e) => changer({ question: e.target.value })} />
                  <button type="button" className="gp-chip-x" title="Enlever la question" onClick={() => onChange({ ...bloc, items: bloc.items.filter((_, j) => j !== i) })}>✕</button>
                </div>
                <div className="gp-question-ligne"><span>Bonne</span><Element e={it.bonne} banque={banque} onChange={(bonne) => changer({ bonne })} /></div>
                <div className="gp-question-ligne"><span>Autres</span><ListeElements elements={it.autres} banque={banque} onChange={(autres) => changer({ autres: autres.slice(0, 3) })} /></div>
              </div>
            );
          })}
          <button type="button" className="btn sm ghost" onClick={() => onChange({ ...bloc, items: [...bloc.items, { question: "", bonne: { id: null, mot: "" }, autres: [] }] })}>➕ Une question</button>
        </Field>
      );
    }
  })();
  return (
    <div className="gp-bloc-editeur">
      <div className="gp-bloc-tete">
        <b>{rang}. {nomDuBloc(bloc.sorte)}</b>
        <span style={{ flex: 1 }} />
        {onMonter && <button type="button" className="btn sm ghost" title="Monter" onClick={onMonter}>↑</button>}
        {onDescendre && <button type="button" className="btn sm ghost" title="Descendre" onClick={onDescendre}>↓</button>}
        <button type="button" className="btn sm ghost" title="Enlever cet exercice" onClick={onSupprimer}>✕</button>
      </div>
      <Field label="La consigne"><Input value={bloc.consigne} onChange={(e) => onChange({ ...bloc, consigne: e.target.value })} /></Field>
      {contenu}
      {manque && <p className="gp-manque">⚠️ Pas encore sur la feuille : {manque}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        {"combien" in bloc && (
          <Nombre label="Sur une feuille" valeur={bloc.combien} min={BORNES_COMBIEN[bloc.sorte as SorteAvecCombien][0]} max={BORNES_COMBIEN[bloc.sorte as SorteAvecCombien][1]}
            onChange={(combien) => onChange({ ...bloc, combien } as BlocPerso)} />
        )}
        {"affichage" in bloc && (
          <Field label="Ce qu'on voit">
            <Select value={bloc.affichage} onChange={(e) => onChange({ ...bloc, affichage: e.target.value as Affichage } as BlocPerso)}>
              {AFFICHAGES.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
            </Select>
          </Field>
        )}
      </div>
    </div>
  );
}

/** Des débuts de demande, à toucher quand rien n'est encore écrit. */
const IDEES: { libelle: string; texte: string }[] = [
  { libelle: "Les animaux et leurs petits", texte: "Relier chaque animal de la ferme à son petit, puis les trier : ceux qui ont des plumes, ceux qui ont des poils." },
  { libelle: "Compter jusqu'à 10", texte: "Compter des fruits et écrire combien il y en a, jusqu'à 10." },
  { libelle: "Une recette dans l'ordre", texte: "Remettre dans l'ordre les étapes de la recette des crêpes, en images à découper." },
];

/** Trois points qui battent : l'IA travaille. */
function Attente({ texte }: { texte: string }) {
  return <div className="gp-attente" role="status"><i /><i /><i /><span>{texte}</span></div>;
}

/**
 * Décrire le support ; l'IA demande ce qui lui manque, une question à la
 * fois, puis écrit la recette (demande de l'enseignant, octobre 2026). Ou
 * reprendre un générateur déjà fait.
 */
function Creation({ generateurs, onOuvrir }: { generateurs: GenerateurPerso[]; onOuvrir: (g: GenerateurPerso) => void }) {
  const [demande, setDemande] = useReglages<{ texte: string; classe: string }>("perso:demande", { texte: "", classe: "CP" });
  // Ce que l'IA a demandé, et ce que l'enseignant a répondu ; la question en cours.
  const [echanges, setEchanges] = React.useState<Echange[]>([]);
  const [question, setQuestion] = React.useState<QuestionDeLIA | null>(null);
  const [autre, setAutre] = React.useState("");
  const [attente, setAttente] = React.useState<"" | "question" | "recette">("");
  const [erreur, setErreur] = React.useState("");
  const enCours = echanges.length > 0 || question !== null || attente !== "";

  /** L'IA écrit la recette, avec tout ce qui a été précisé. */
  const ecrire = async (deja: Echange[]) => {
    setQuestion(null);
    setAttente("recette");
    try {
      const g = await creerAvecLIA(demandeAvecPrecisions(demande.texte, deja), demande.classe);
      await enregistrerGenerateur(g);
      setDemande({ texte: "" });
      setEchanges([]);
      onOuvrir(g);
      toast(`« ${g.nom} » est prêt : retouchez-le, puis imprimez.`, { icone: "✨" });
    } catch (e) {
      setErreur(String((e as Error)?.message ?? e));
    } finally {
      setAttente("");
    }
  };
  /** La question suivante ; quand l'IA en sait assez, la recette. */
  const suite = async (deja: Echange[]) => {
    setErreur("");
    setAttente("question");
    let q: QuestionDeLIA | null;
    try {
      q = await questionDeLIA(demande.texte, demande.classe, deja);
    } catch (e) {
      setErreur(String((e as Error)?.message ?? e));
      setAttente("");
      return;
    }
    if (!q) { await ecrire(deja); return; }
    setQuestion(q);
    setAutre("");
    setAttente("");
  };
  const repondre = (reponse: string) => {
    if (!question) return;
    const deja = [...echanges, { question: question.question, reponse: reponse.trim() }];
    setEchanges(deja);
    setQuestion(null);
    void suite(deja);
  };
  const modifier = () => { setEchanges([]); setQuestion(null); setErreur(""); };
  const sansLIA = async () => {
    const maintenant = nowIso();
    const g = await avecLesPictos({
      id: newId(), nom: "Mon générateur", icone: "✨", quoi: "", classe: demande.classe, moment: "entrainement", demande: demande.texte.trim(),
      blocs: [blocVide("relier")], cree: maintenant, modifie: maintenant,
    }, null);
    await enregistrerGenerateur(g);
    setDemande({ texte: "" });
    onOuvrir(g);
  };

  return (
    <div className="gp-creation">
      <div className="gp-creation-tete">
        <h3>✨ Créer un générateur</h3>
        <Aide titre="Créer un générateur avec l'IA" vers="gauche"><p>Décrivez la feuille comme à un collègue. Si la demande ne lui suffit pas, l'IA de Mistral vous
          pose une question à la fois — ce que les élèves travaillent, s'ils lisent, la forme de l'exercice —, avec des réponses à toucher ; puis elle écrit
          la recette : des exercices que Maitrize dessine et corrige. Vous retouchez les mots, les pictos, vos photos, la place des images. Les prénoms des
          élèves ne partent pas chez Mistral.</p></Aide>
      </div>

      {!enCours ? (<>
        <div className="gp-etape-titre">Pour qui ?</div>
        <div className="gp-classes" role="group" aria-label="La classe">
          {CLASSES_PERSO.map((c) => (
            <button key={c} type="button" className={demande.classe === c ? "actif" : ""} aria-pressed={demande.classe === c}
              onClick={() => setDemande({ classe: c })}>{c}</button>
          ))}
        </div>
        <div className="gp-etape-titre">La feuille que vous voulez</div>
        <Textarea rows={5} value={demande.texte} aria-label="La feuille que vous voulez" onChange={(e) => setDemande({ texte: e.target.value })}
          placeholder="Relier chaque animal de la ferme à son petit, avec les pictos, pour des élèves qui ne lisent pas encore." />
        {!demande.texte.trim() && (
          <div className="gp-idees">
            {IDEES.map((x) => <button key={x.libelle} type="button" onClick={() => setDemande({ texte: x.texte })}>{x.libelle}</button>)}
          </div>
        )}
        <div className="gp-actions">
          <button type="button" className="btn primary" disabled={demande.texte.trim().length < 8} onClick={() => void suite([])}>✨ Continuer</button>
          <button type="button" className="btn ghost sm" onClick={() => void sansLIA()}>Commencer sans l'IA</button>
        </div>
      </>) : (<>
        <div className="gp-fil">
          <div className="gp-fil-demande">
            <span className="gp-fil-classe">{demande.classe}</span>
            <span className="gp-fil-texte">{demande.texte.trim()}</span>
            {attente === "" && <button type="button" className="btn ghost sm" onClick={modifier}>Modifier</button>}
          </div>
          {echanges.map((e, i) => (
            <div key={i} className="gp-echange">
              <span className="gp-echange-q">{e.question}</span>
              <span className={`gp-echange-r${e.reponse ? "" : " passee"}`}>{e.reponse || "Passée"}</span>
            </div>
          ))}
        </div>
        {question && (
          <div className="gp-question-ia">
            <div className="gp-question-rang">Question {echanges.length + 1}</div>
            <div className="gp-question-texte">{question.question}</div>
            {question.choix.length > 0 && (
              <div className="gp-choix">
                {question.choix.map((c) => <button key={c} type="button" onClick={() => repondre(c)}>{c}</button>)}
              </div>
            )}
            <div className="gp-autre">
              <Input value={autre} placeholder={question.choix.length ? "Autre réponse…" : "Votre réponse…"} aria-label="Votre réponse"
                onChange={(e) => setAutre(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && autre.trim()) { e.preventDefault(); repondre(autre); } }} />
              <button type="button" className="btn sm" disabled={!autre.trim()} onClick={() => repondre(autre)}>Répondre</button>
            </div>
            <div className="gp-question-pied">
              <button type="button" className="btn ghost sm" onClick={() => repondre("")}>Passer</button>
              <button type="button" className="btn ghost sm" onClick={() => void ecrire(echanges)}>Créer maintenant</button>
            </div>
          </div>
        )}
        {attente === "question" && <Attente texte={echanges.length ? "L'IA regarde s'il lui manque encore quelque chose…" : "L'IA lit votre demande…"} />}
        {attente === "recette" && <Attente texte="L'IA écrit la recette, puis cherche les images…" />}
      </>)}

      {erreur && (
        <div className="gp-erreur">
          <p>{erreur}</p>
          {enCours && attente === "" && !question && <button type="button" className="btn sm" onClick={() => void suite(echanges)}>Réessayer</button>}
        </div>
      )}

      {generateurs.length > 0 && !enCours && (
        <div className="gp-mes-generateurs">
          <div className="gp-etape-titre">Vos générateurs</div>
          <div className="gp-liste-generateurs">
            {generateurs.map((g) => (
              <button key={g.id} type="button" onClick={() => onOuvrir(g)}>
                <span aria-hidden="true">{g.icone}</span> {g.nom}{g.classe ? <small> · {g.classe}</small> : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GenerateurPersoTab({ banque }: { banque: boolean }) {
  const [choix, setChoix] = useReglages<{ id: string }>("perso", { id: "" });
  const generateurs = useGenerateursPerso();
  const enregistre = generateurs.find((x) => x.id === choix.id) ?? null;
  const [g, setG] = React.useState<GenerateurPerso | null>(null);
  // Le brouillon suit le générateur choisi ; une fois ouvert, il garde ce qu'on y change.
  React.useEffect(() => { setG((x) => (x && enregistre && x.id === enregistre.id ? x : enregistre)); }, [enregistre]);
  // Ce qu'on change se garde de soi-même, un instant après.
  React.useEffect(() => {
    if (!g || !enregistre || g === enregistre) return;
    const t = window.setTimeout(() => { void enregistrerGenerateur(g); }, 600);
    return () => window.clearTimeout(t);
  }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  const [graine, setGraine] = useGraine();
  // Aucun générateur ouvert : celui d'un exemple, ce que donne une recette.
  const [exemple, setExemple] = React.useState<GenerateurPerso | null>(null);
  React.useEffect(() => {
    if (g || exemple) return;
    let vivant = true;
    avecLesPictos(generateurSur(EXEMPLE_DE_GENERATEUR), null).then((x) => { if (vivant) setExemple(x); }).catch(() => {});
    return () => { vivant = false; };
  }, [g, exemple]);
  const montre = g ?? exemple;
  const images = usePictoImages(montre ? imagesDeLaRecette(montre) : []);
  const html = React.useMemo(() => (montre ? htmlGenerateurPerso(montre, graine, images) : ""), [montre, graine, images]);
  const [retouche, setRetouche] = React.useState("");
  const [attente, setAttente] = React.useState(false);
  const [ajout, setAjout] = React.useState<SorteDeBloc>("relier");
  const [imagePour, setImagePour] = React.useState<string | null>(null);
  // Chaque générateur a ses compétences, choisies dans « La feuille » : les séquences de ces compétences proposent sa feuille.
  React.useEffect(() => { objectifsDesAteliers.publier("perso", g ? [{ id: g.id, libelle: g.nom }] : []); }, [g?.id, g?.nom]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => () => objectifsDesAteliers.publier("perso", []), []);

  const modifier = (f: (x: GenerateurPerso) => GenerateurPerso) => setG((x) => (x ? { ...f(x), modifie: nowIso() } : x));
  const sansImage = g ? motsSansImage(g) : [];
  const blocs = (f: (l: BlocPerso[]) => BlocPerso[]) => modifier((x) => ({ ...x, blocs: f(x.blocs) }));
  const ouvrir = (x: GenerateurPerso) => { setG(x); setChoix({ id: x.id }); };
  // Un exercice ajouté à la main prend les images du générateur pour ses mots, et les pictos de la banque pour les autres.
  const ajouterBloc = async (x: GenerateurPerso) => {
    const b = blocVide(ajout);
    const [avec] = (await avecLesPictos({ ...x, blocs: [b] }, x)).blocs;
    blocs((l) => [...l, avec ?? b]);
  };

  if (!g) {
    const partirDeLExemple = async () => {
      if (!exemple) return;
      const maintenant = nowIso();
      const x: GenerateurPerso = { ...exemple, id: newId(), demande: "", cree: maintenant, modifie: maintenant };
      await enregistrerGenerateur(x);
      ouvrir(x);
    };
    return <Colonnes gauche={<Creation generateurs={generateurs} onOuvrir={ouvrir} />}
      droite={exemple
        ? <ApercuExemple onPrendre={() => void partirDeLExemple()}><ApercuFeuille html={html} style={STYLE_GENERATEURS_PERSO} /></ApercuExemple>
        : <div className="gp-apercu-vide">La feuille s'affichera ici, avec son corrigé.</div>} />;
  }

  // Une retouche refait toute la recette : on peut revenir à la version d'avant.
  const retoucher = async (consigne = retouche) => {
    const avant = g;
    setAttente(true);
    try {
      const nouveau = await retoucherAvecLIA(avant, consigne);
      setG(nouveau);
      if (consigne === retouche) setRetouche("");
      toastAnnulable("Le générateur est retouché.", () => { setG({ ...avant, modifie: nowIso() }); }, "✨");
    } catch (e) {
      toast(String((e as Error)?.message ?? e), { icone: "⚠️" });
    } finally {
      setAttente(false);
    }
  };
  const dupliquer = async () => {
    const maintenant = nowIso();
    const copie: GenerateurPerso = { ...g, id: newId(), nom: `${g.nom} (copie)`.slice(0, 80), cree: maintenant, modifie: maintenant };
    const competences = await api.settingGet(cleDesCompetences("perso", g.id)).catch(() => null);
    if (competences) await api.settingSet(cleDesCompetences("perso", copie.id), competences).catch(() => {});
    await enregistrerGenerateur(copie);
    ouvrir(copie);
    toast(`« ${copie.nom} » : changez-la sans toucher à l'original.`, { icone: "⧉" });
  };
  const supprimer = async () => {
    const garde = g;
    await supprimerGenerateur(garde.id);
    setChoix({ id: "" });
    setG(null);
    toastAnnulable(`« ${garde.nom} » supprimé.`, async () => { await enregistrerGenerateur(garde); setChoix({ id: garde.id }); });
  };

  return (
    <Colonnes
      gauche={<>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, flex: 1 }}>{g.icone} {g.nom}</h3>
          <button type="button" className="btn sm ghost" onClick={() => { setChoix({ id: "" }); setG(null); }}>➕ Nouveau</button>
          <button type="button" className="btn sm ghost" onClick={() => void dupliquer()} title="Dupliquer ce générateur, pour en faire une variante">⧉</button>
          <button type="button" className="btn sm ghost" onClick={() => void supprimer()} title="Supprimer ce générateur">🗑</button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label="Le titre de la feuille"><Input value={g.nom} onChange={(e) => modifier((x) => ({ ...x, nom: e.target.value }))} /></Field>
          <Field label="Icône"><Input value={g.icone} style={{ width: 60 }} onChange={(e) => modifier((x) => ({ ...x, icone: e.target.value }))} /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Field label="Classe">
            <Select value={g.classe} onChange={(e) => modifier((x) => ({ ...x, classe: e.target.value }))}>
              <option value="">Toutes</option>
              {CLASSES_PERSO.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Moment de la séquence">
            <Select value={g.moment} onChange={(e) => modifier((x) => ({ ...x, moment: e.target.value as Usage }))}>
              {USAGES.map((u) => <option key={u.id} value={u.id}>{u.ico} {u.nom}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Ce qu'il fabrique">
          <Input value={g.quoi} onChange={(e) => modifier((x) => ({ ...x, quoi: e.target.value }))} />
        </Field>
        <Field label="Demander une retouche à l'IA">
          <div style={{ display: "flex", gap: 6 }}>
            <Input value={retouche} placeholder="Ajoute des animaux de la mer ; moins de paires pour les GS…" onChange={(e) => setRetouche(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && retouche.trim() && !attente) void retoucher(); }} />
            <button type="button" className="btn sm" disabled={attente || !retouche.trim()} onClick={() => void retoucher()}>{attente ? "…" : "✨ Retoucher"}</button>
          </div>
          <div className="gp-retouches">
            {RETOUCHES_RAPIDES.map((r) => (
              <button key={r.libelle} type="button" className="btn sm ghost" disabled={attente} title={r.consigne} onClick={() => void retoucher(r.consigne)}>{r.libelle}</button>
            ))}
          </div>
        </Field>
        {sansImage.length > 0 && (
          <p className="gp-manque">⚠️ Sans image : {sansImage.map((m, i) => (
            <React.Fragment key={m}>{i > 0 && ", "}<button type="button" className="gp-mot-sans-image" title="Choisir son image, pour toute la recette" onClick={() => setImagePour(m)}>{m}</button></React.Fragment>
          ))}</p>
        )}
        {imagePour && <ChoixPicto valeur={{ id: null, mot: imagePour }} banque={banque} photos onClose={() => setImagePour(null)}
          onValider={(p) => { if (p.id !== null || p.photo) modifier((x) => poserPartout(x, imagePour, p)); setImagePour(null); }} />}
        {g.blocs.map((b, i) => (
          <BlocEditeur key={i} bloc={b} rang={i + 1} banque={banque}
            onChange={(nb) => blocs((l) => memeImagePartout(l.map((x, j) => (j === i ? nb : x)), l[i], nb))}
            onMonter={i > 0 ? () => blocs((l) => { const c = [...l]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; }) : undefined}
            onDescendre={i < g.blocs.length - 1 ? () => blocs((l) => { const c = [...l]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; return c; }) : undefined}
            onSupprimer={() => blocs((l) => l.filter((_, j) => j !== i))} />
        ))}
        {g.blocs.length < 6 && (
          <div style={{ display: "flex", gap: 6, alignItems: "center", margin: "8px 0" }}>
            <Select value={ajout} onChange={(e) => setAjout(e.target.value as SorteDeBloc)}>
              {BLOCS_PERSO.map((b) => <option key={b.sorte} value={b.sorte}>{b.nom}</option>)}
            </Select>
            <button type="button" className="btn sm" onClick={() => void ajouterBloc(g)}>➕ Ajouter cet exercice</button>
          </div>
        )}
        <Boutons atelier="perso" titre={g.nom} html={html} style={STYLE_GENERATEURS_PERSO} peut={g.blocs.some((b) => !ceQuiManque(b))} onTirage={() => setGraine(graineAuHasard())} />
        <AideEnLigne libelle="Ce que demandait l'enseignant"><p>{g.demande || "Fait à la main."}</p></AideEnLigne>
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_GENERATEURS_PERSO} />}
    />
  );
}
