import React from "react";
import { api, newId, nowIso } from "../api";
import { Aide, AideEnLigne } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ChoixPicto, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { avecLesPictos, creerAvecLIA, enregistrerGenerateur, retoucherAvecLIA, supprimerGenerateur, useGenerateursPerso } from "../components/GenerateursPerso";
import { toast, toastAnnulable } from "../components/Toaster";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { cleImage, type PictoPose } from "../supportsVisuels";
import { USAGES, type Usage } from "../usageAtelier";
import {
  BLOCS_PERSO, BORNES_COMBIEN, CLASSES_PERSO, LARGEUR_PLANCHE, STYLE_GENERATEURS_PERSO, blocVide, ceQuiManque, htmlGenerateurPerso, imagesDeLaRecette, nomDuBloc, placeDansLaPlanche,
  type Affichage, type BlocPerso, type BlocPlanche, type GenerateurPerso, type SorteDeBloc,
} from "../generateursPerso";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";

// ── Fabriquer › Mes générateurs ───────────────────────────────────────────
//
// L'enseignant décrit le support qu'il veut ; l'IA de Mistral en écrit la
// recette ; il la retouche ici — les mots, les pictos, ses photos, la place
// des images sur la planche —, à la main ou en demandant à l'IA. Tout se
// garde au fur et à mesure (voir generateursPerso.ts).

/** Le picto d'un mot, trouvé dans la banque quand on l'ajoute à la main ; rien sinon. */
async function pictoDuMot(mot: string): Promise<number | null> {
  try {
    const [trouves] = await api.arasaacParMots([mot]);
    return trouves[0]?.id ?? null;
  } catch {
    return null;
  }
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

/** Un nombre, dans ses bornes. */
function Nombre({ label, valeur, min, max, onChange }: { label: string; valeur: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min={min} max={max} value={valeur} style={{ width: 80 }}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))} />
    </Field>
  );
}

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
        {bloc.sorte !== "planche" && <Nombre label="Sur une feuille" valeur={bloc.combien} min={BORNES_COMBIEN[bloc.sorte][0]} max={BORNES_COMBIEN[bloc.sorte][1]}
          onChange={(combien) => onChange({ ...bloc, combien })} />}
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

/** Décrire le support, et laisser l'IA en faire la recette ; ou reprendre un générateur déjà fait. */
function Creation({ generateurs, onOuvrir }: { generateurs: GenerateurPerso[]; onOuvrir: (g: GenerateurPerso) => void }) {
  const [demande, setDemande] = useReglages<{ texte: string; classe: string }>("perso:demande", { texte: "", classe: "CP" });
  const [attente, setAttente] = React.useState(false);
  const [erreur, setErreur] = React.useState("");
  const creer = async () => {
    setAttente(true);
    setErreur("");
    try {
      const g = await creerAvecLIA(demande.texte, demande.classe);
      await enregistrerGenerateur(g);
      setDemande({ texte: "" });
      onOuvrir(g);
      toast(`« ${g.nom} » est prêt : retouchez-le, puis imprimez.`, { icone: "✨" });
    } catch (e) {
      setErreur(String((e as Error)?.message ?? e));
    } finally {
      setAttente(false);
    }
  };
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
    <>
      <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        Créer un générateur
        <Aide titre="Créer un générateur avec l'IA" vers="droite"><p>Décrivez le support que vous voulez, comme à un collègue. L'IA de Mistral en écrit la recette : des exercices que Maitrize
          sait dessiner et corriger — relier, trier en colonnes, compléter, compter, entourer, des questions, des étiquettes, une planche d'images. Chaque mot reçoit son picto ;
          vous changez les mots, les pictos, mettez vos photos, placez les images. Chaque feuille est tirée au sort, avec son corrigé. Les prénoms des élèves ne partent
          pas chez Mistral : ils sont masqués avant l'envoi.</p></Aide>
      </h3>
      <Field label="Le support que vous voulez">
        <Textarea rows={5} value={demande.texte} onChange={(e) => setDemande({ texte: e.target.value })}
          placeholder="Relier chaque animal de la ferme à son petit, puis les trier : ceux qui ont des plumes, ceux qui ont des poils. Avec les pictos, pour des élèves qui ne lisent pas encore." />
      </Field>
      <Field label="Pour quelle classe">
        <Select value={demande.classe} onChange={(e) => setDemande({ classe: e.target.value })}>
          {CLASSES_PERSO.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </Field>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn primary" disabled={attente || demande.texte.trim().length < 8} onClick={() => void creer()}>
          {attente ? "L'IA écrit la recette…" : "✨ Créer avec l'IA"}
        </button>
        <button type="button" className="btn ghost sm" disabled={attente} onClick={() => void sansLIA()}>Commencer sans l'IA</button>
      </div>
      {erreur && <p className="erreur" style={{ color: "var(--danger, #d64545)", fontSize: 13 }}>{erreur}</p>}
      {generateurs.length > 0 && (
        <Field label="Vos générateurs">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {generateurs.map((g) => <button key={g.id} type="button" className="btn sm" onClick={() => onOuvrir(g)}>{g.icone} {g.nom}</button>)}
          </div>
        </Field>
      )}
    </>
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
  const images = usePictoImages(g ? imagesDeLaRecette(g) : []);
  const html = React.useMemo(() => (g ? htmlGenerateurPerso(g, graine, images) : ""), [g, graine, images]);
  const [retouche, setRetouche] = React.useState("");
  const [attente, setAttente] = React.useState(false);
  const [ajout, setAjout] = React.useState<SorteDeBloc>("relier");

  const modifier = (f: (x: GenerateurPerso) => GenerateurPerso) => setG((x) => (x ? { ...f(x), modifie: nowIso() } : x));
  const blocs = (f: (l: BlocPerso[]) => BlocPerso[]) => modifier((x) => ({ ...x, blocs: f(x.blocs) }));
  const ouvrir = (x: GenerateurPerso) => { setG(x); setChoix({ id: x.id }); };
  // Un exercice ajouté à la main prend les images du générateur pour ses mots, et les pictos de la banque pour les autres.
  const ajouterBloc = async (x: GenerateurPerso) => {
    const b = blocVide(ajout);
    const [avec] = (await avecLesPictos({ ...x, blocs: [b] }, x)).blocs;
    blocs((l) => [...l, avec ?? b]);
  };

  if (!g) {
    return <Colonnes gauche={<Creation generateurs={generateurs} onOuvrir={ouvrir} />}
      droite={<div className="gp-apercu-vide">La feuille s'affichera ici, avec son corrigé.</div>} />;
  }

  const retoucher = async () => {
    setAttente(true);
    try {
      const nouveau = await retoucherAvecLIA(g, retouche);
      setG(nouveau);
      setRetouche("");
      toast("Le générateur est retouché.", { icone: "✨" });
    } catch (e) {
      toast(String((e as Error)?.message ?? e), { icone: "⚠️" });
    } finally {
      setAttente(false);
    }
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
        </Field>
        {g.blocs.map((b, i) => (
          <BlocEditeur key={i} bloc={b} rang={i + 1} banque={banque}
            onChange={(nb) => blocs((l) => l.map((x, j) => (j === i ? nb : x)))}
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
