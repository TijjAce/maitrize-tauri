import React from "react";
import { Aide } from "../components/Aide";
import { api, raccourci, texteErreur } from "../api";
import { Field, Input, Modal, Select } from "../components/ui";
import { toast, toastAnnulable } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { AtelierContext } from "../components/AtelierContext";
import { STYLE_FEUILLE as STYLE_CARTES } from "../cartesImprimables";
import {
  avecDesMotsEnPlus, motsDesEnonces, motsDesProblemesImprimable, motsDesThemes, nombreDeMots, type MotsDesProblemes,
} from "../motsDesProblemes";
import { useMemoire, useReglages } from "../components/useMemoire";
import {
  genererPartieTout, genererMultiplicatifs, blocProbleme, blocCorrige, enteteFeuille, feuilleProblemes, classesFeuille,
  decouperEnPages, lirePrenoms, retoucheDe, retoucher, schemaSvg, styleSchema, normaliserPresentation, memePresentation,
  STYLE_FEUILLE, TYPES_MULTIPLICATIFS, PLAFONDS, PRESENTATION_COMPLETE, PRESENTATION_MODELE_SEUL, nombre, contextesChoisis, retoucherPresentation,
  CATALOGUE_PRESENTATION, type CommandePresentation, type GroupePresentation,
  type Probleme, type Presentation, type Retouche, type InconnuePartieTout, type TypeMultiplicatif, type ContexteParties,
} from "../problemesBarres";
import {
  REGLAGES_NEUTRES, accueilDesProblemes, changementsEnClair, demanderALAssistantDesProblemes,
  type EtatDeLAtelier, type ReglagesDeLAtelier, type ReponseProblemes, type SorteDeProblemes,
} from "../assistantProblemes";
import { useGraine } from "../modifierFeuille";

// ── Fabriquer → Problèmes en barres ────────────────────────────────────────
//
// Deux onglets : les problèmes partie-tout (additifs) et les problèmes
// multiplicatifs. On choisit les problèmes, puis leur présentation — jusqu'au
// modèle en barres seul —, on regarde l'aperçu, on retouche ou remplace un
// problème, et l'on imprime la feuille et son corrigé.

const nouvelleGraine = () => Math.floor(Math.random() * 2 ** 31);

/** La feuille tirée : sa graine, les problèmes remplacés et ceux dont l'enseignant a choisi les nombres. */
function useTirage(structure: string) {
  // Le tirage de la feuille qu'on refait, à l'ouverture (voir `modifierFeuille`) ; sinon un nouveau.
  const [graine, setGraine] = useGraine();
  const [retirages, setRetirages] = React.useState<Record<number, number>>({});
  const [retouches, setRetouches] = React.useState<Record<number, Retouche>>({});
  // Changer la nature des problèmes rend caducs les nombres choisis à la main.
  React.useEffect(() => { setRetouches({}); }, [structure]);
  return {
    graine, retirages, retouches,
    nouvelle: () => { setGraine(nouvelleGraine()); setRetirages({}); setRetouches({}); },
    retirer: (i: number) => {
      setRetirages((r) => ({ ...r, [i]: nouvelleGraine() }));
      setRetouches(({ [i]: _, ...reste }) => reste);
    },
    retoucher: (i: number, r: Retouche) => setRetouches((t) => ({ ...t, [i]: r })),
  };
}
type Tirage = ReturnType<typeof useTirage>;

const appliquerRetouches = (problemes: Probleme[], retouches: Record<number, Retouche>, enonces: boolean) =>
  problemes.map((p, i) => (retouches[i] ? retoucher(p, retouches[i], enonces) : p));

/** La même feuille, en PDF sur le plan de travail. */
const bureau = (atelier: string, problemes: Probleme[], titre: string, presentation: Presentation) =>
  enregistrerSurLeBureau(atelier, titre.trim() || "Problèmes", feuilleProblemes(problemes, titre, presentation), STYLE_FEUILLE);

const imprimer = (atelier: string, problemes: Probleme[], titre: string, presentation: Presentation) => {
  void imprimerAtelier(atelier, titre.trim() || "Problèmes", feuilleProblemes(problemes, titre, presentation), STYLE_FEUILLE);
  toast(`La feuille s'ouvre dans le navigateur : imprimez-la ou enregistrez-la en PDF (${raccourci("P")}).`, { icone: "🖨", duree: 6000 });
};

// ── Les mots des énoncés, en images ────────────────────────────────────────
//
// « Si il y a des consignes, je puisse avoir le vocabulaire du problème en
// image pour pouvoir l'avoir en amont » (l'enseignant, 5 novembre 2026) : la
// feuille « Les mots des problèmes » des séquences (motsDesProblemes.ts),
// faite des énoncés de cette feuille-ci. Elle se range avec les étiquettes
// de mots, comme celle des séquences.

const TITRE_DES_MOTS = "Les mots des problèmes";
const SOUS_TITRE_DES_MOTS = "Les mots de ces problèmes, à découvrir avant de chercher : avec les objets, en photo ou en picto.";
const ATELIER_DES_MOTS = "etiquettes";

const feuilleDesMots = async (mots: MotsDesProblemes) => {
  const f = await motsDesProblemesImprimable(mots, SOUS_TITRE_DES_MOTS);
  return { html: f.html, style: STYLE_CARTES + f.style };
};

const imprimerLesMots = async (mots: MotsDesProblemes) => {
  const f = await feuilleDesMots(mots);
  await imprimerAtelier(ATELIER_DES_MOTS, TITRE_DES_MOTS, f.html, f.style);
  toast(`Les mots s'ouvrent dans le navigateur : imprimez-les ou enregistrez-les en PDF (${raccourci("P")}).`, { icone: "🖼", duree: 6000 });
};

const lesMotsSurLeBureau = async (mots: MotsDesProblemes) => {
  const f = await feuilleDesMots(mots);
  return enregistrerSurLeBureau(ATELIER_DES_MOTS, TITRE_DES_MOTS, f.html, f.style);
};

/** La feuille des mots, telle qu'elle s'imprimera, et ses deux boutons. */
function LesMotsEnImages({ mots, onFermer }: { mots: MotsDesProblemes; onFermer: () => void }) {
  const [feuille, setFeuille] = React.useState<{ html: string; style: string } | null>(null);
  React.useEffect(() => {
    let vivant = true;
    feuilleDesMots(mots).then((f) => { if (vivant) setFeuille(f); })
      .catch((e) => { toast("Les mots ne se montrent pas : " + texteErreur(e), { icone: "⚠️" }); onFermer(); });
    return () => { vivant = false; };
  }, [mots]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal titre={TITRE_DES_MOTS} onClose={onFermer} large footer={<>
      <button className="btn" onClick={onFermer}>Fermer</button>
      <AtelierContext.Provider value={ATELIER_DES_MOTS}>
        <BoutonBureau className="btn" disabled={!feuille} onEnregistrer={() => lesMotsSurLeBureau(mots)} />
      </AtelierContext.Provider>
      <button className="btn primary" disabled={!feuille} onClick={() => { void imprimerLesMots(mots); }}>🖨 Imprimer</button>
    </>}>
      {feuille
        ? <div className="pb-mots-apercu"><style>{feuille.style}</style><div dangerouslySetInnerHTML={{ __html: feuille.html }} /></div>
        : <p style={{ color: "var(--text-2)" }}>Les images se chargent…</p>}
    </Modal>
  );
}

// ── Partie-tout ────────────────────────────────────────────────────────────

export function PartieToutTab() {
  const [r, maj] = useReglages("partieTout", {
    titre: "Problèmes partie-tout", nombre: 6, prenoms: "",
    parties: 2, inconnue: "melange" as InconnuePartieTout, max: 20,
    perso: false, toutMin: 5, toutMax: 10, partieMin: 1,
    /** Les thèmes choisis avec l'assistant (vide : tous), et ceux qu'il a écrits. */
    themes: [] as string[], themesPerso: [] as ContexteParties[],
  });
  const [presentation, setPresentation] = useMemoire("presentation:partieTout", normaliserPresentation);
  const tirage = useTirage(`${r.parties}|${r.inconnue}`);
  const problemes = React.useMemo(() => appliquerRetouches(genererPartieTout({
    nombre: r.nombre, parties: r.parties, inconnue: r.inconnue, enonces: presentation.enonce, prenoms: lirePrenoms(r.prenoms),
    contextes: contextesChoisis(r.themes, r.themesPerso),
    ...(r.perso ? { max: r.toutMax, min: r.toutMin, partMin: r.partieMin } : { max: r.max }),
  }, tirage.graine, tirage.retirages), tirage.retouches, presentation.enonce),
  [r, presentation.enonce, tirage.graine, tirage.retirages, tirage.retouches]);
  const appliquer = (rep: ReponseProblemes) => {
    maj(reglagesRetenus(rep, ["titre", "nombre", "prenoms", "parties", "inconnue", "max", "perso", "toutMin", "toutMax", "partieMin", "themes", "themesPerso"]));
    suivreLaReponse(rep, tirage);
    for (const x of rep.nombres ?? []) tirage.retoucher(x.probleme - 1, { forme: "parties", valeurs: x.valeurs, inconnue: x.inconnue });
  };

  return (
    <Atelier atelier="partieTout" titre={r.titre} setTitre={(titre) => maj({ titre })} nombre={r.nombre} setNombre={(nombre) => maj({ nombre })}
      prenoms={r.prenoms} setPrenoms={(prenoms) => maj({ prenoms })}
      presentation={presentation} setPresentation={setPresentation} problemes={problemes} tirage={tirage}
      pilote={{ sorte: "partieTout", reglages: { ...REGLAGES_NEUTRES, ...r }, appliquer }}
      intro={<>Un tout et ses parties : l'élève voit ce qui manque avant de choisir l'opération. Programmes : « résoudre des
        problèmes additifs en une étape de type parties-tout ».</>}
    >
      <Field label="Ce que l'élève cherche">
        <Select value={r.inconnue} onChange={(e) => maj({ inconnue: e.target.value as InconnuePartieTout })}>
          <option value="melange">Le tout ou une partie, en alternance</option>
          <option value="tout">Le tout</option>
          <option value="partie">Une partie</option>
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Parties">
          <Select value={r.parties} onChange={(e) => maj({ parties: Number(e.target.value) })}>
            <option value={2}>2 parties</option>
            <option value={3}>3 parties</option>
          </Select>
        </Field>
        <Field label="Nombres">
          <Select value={r.perso ? "perso" : r.max} onChange={(e) => (e.target.value === "perso"
            ? maj({ perso: true }) : maj({ perso: false, max: Number(e.target.value) }))}>
            {PLAFONDS.map((m) => <option key={m} value={m}>jusqu'à {nombre(m)}</option>)}
            <option value="perso">Personnalisés…</option>
          </Select>
        </Field>
      </div>
      {r.themes.length > 0 && (
        <div className="pb-themes">
          <span>Thèmes : {r.themes.join(", ")}</span>
          <button className="btn sm" onClick={() => maj({ themes: [] })}>Tous les thèmes</button>
        </div>
      )}
      {r.perso && (
        <div className="pb-plage">
          <NombreChamp label="Le tout, de" valeur={r.toutMin} min={2} onChange={(toutMin) => maj({ toutMin })} />
          <NombreChamp label="à" valeur={r.toutMax} min={2} onChange={(toutMax) => maj({ toutMax })} />
          <NombreChamp label="Chaque partie, au moins" valeur={r.partieMin} min={1} onChange={(partieMin) => maj({ partieMin })} />
        </div>
      )}
    </Atelier>
  );
}

// ── Multiplicatifs ─────────────────────────────────────────────────────────

export function MultiplicatifsTab() {
  const [r, maj] = useReglages("multiplicatifs", {
    titre: "Problèmes multiplicatifs", nombre: 6, prenoms: "",
    types: ["tout", "part", "nombre"] as TypeMultiplicatif[], table: 10,
    perso: false, partsMin: 2, partsMax: 5, valeurMin: 1, valeurMax: 5,
  });
  const [presentation, setPresentation] = useMemoire("presentation:multiplicatifs", normaliserPresentation);
  const types = r.types.filter((t) => TYPES_MULTIPLICATIFS.some((x) => x.id === t));
  const tirage = useTirage(types.join());
  const problemes = React.useMemo(() => appliquerRetouches(genererMultiplicatifs({
    nombre: r.nombre, types, table: r.table, enonces: presentation.enonce, prenoms: lirePrenoms(r.prenoms),
    ...(r.perso ? { parts: [r.partsMin, r.partsMax] as [number, number], valeurs: [r.valeurMin, r.valeurMax] as [number, number] } : {}),
  }, tirage.graine, tirage.retirages), tirage.retouches, presentation.enonce),
  [r, types.join(), presentation.enonce, tirage.graine, tirage.retirages, tirage.retouches]); // eslint-disable-line react-hooks/exhaustive-deps

  const appliquer = (rep: ReponseProblemes) => {
    maj(reglagesRetenus(rep, ["titre", "nombre", "prenoms", "types", "table", "perso", "partsMin", "partsMax", "valeurMin", "valeurMax"]));
    suivreLaReponse(rep, tirage);
  };

  const basculer = (t: TypeMultiplicatif) => {
    const suite = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    if (!suite.length) { toast("Gardez au moins un type de problème.", { icone: "ℹ️" }); return; }
    // Dans l'ordre de la liste : les problèmes se succèdent dans cet ordre sur la feuille.
    maj({ types: TYPES_MULTIPLICATIFS.map((x) => x.id).filter((id) => suite.includes(id)) });
  };

  return (
    <Atelier atelier="multiplicatifs" titre={r.titre} setTitre={(titre) => maj({ titre })} nombre={r.nombre} setNombre={(nombre) => maj({ nombre })}
      prenoms={r.prenoms} setPrenoms={(prenoms) => maj({ prenoms })}
      presentation={presentation} setPresentation={setPresentation} problemes={problemes} tirage={tirage}
      pilote={{ sorte: "multiplicatifs", reglages: { ...REGLAGES_NEUTRES, ...r }, appliquer }}
      intro={<>Des parts égales qui font un tout, ou une quantité plusieurs fois plus grande qu'une autre. Programmes :
        « résoudre des problèmes multiplicatifs de type parties-tout en une étape ».</>}
    >
      <Field label="Types de problèmes, en alternance sur la feuille">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TYPES_MULTIPLICATIFS.map((t) => (
            <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={types.includes(t.id)} onChange={() => basculer(t.id)} />
              <span><b>{t.libelle}</b><br /><span style={{ color: "var(--text-2)" }}>{t.exemple}</span></span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Nombres">
        <Select value={r.perso ? "perso" : r.table} onChange={(e) => (e.target.value === "perso"
          ? maj({ perso: true }) : maj({ perso: false, table: Number(e.target.value) }))}>
          <option value={5}>Tables de 2 à 5</option>
          <option value={10}>Tables de 2 à 10</option>
          <option value="perso">Personnalisés…</option>
        </Select>
      </Field>
      {r.perso && (
        <div className="pb-plage pb-plage-4">
          <NombreChamp label="Nombre de parts (ou de fois), de" valeur={r.partsMin} min={2} onChange={(partsMin) => maj({ partsMin })} />
          <NombreChamp label="à" valeur={r.partsMax} min={2} onChange={(partsMax) => maj({ partsMax })} />
          <NombreChamp label="Valeur d'une part (ou petite quantité), de" valeur={r.valeurMin} min={1} onChange={(valeurMin) => maj({ valeurMin })} />
          <NombreChamp label="à" valeur={r.valeurMax} min={1} onChange={(valeurMax) => maj({ valeurMax })} />
        </div>
      )}
    </Atelier>
  );
}

/**
 * Un nombre à saisir. Le champ garde ce qui est tapé, même vide ou encore trop
 * petit : effacer « 5 » pour écrire « 12 » ne doit pas faire réapparaître le
 * minimum sous le curseur. Seul un nombre valable est transmis.
 */
function NombreChamp({ label, valeur, min, onChange }: { label: string; valeur: number; min: number; onChange: (v: number) => void }) {
  const [texte, setTexte] = React.useState(String(valeur));
  React.useEffect(() => { setTexte((t) => (Number(t) === valeur ? t : String(valeur))); }, [valeur]);
  const lu = (t: string) => {
    const n = Math.round(Number(t));
    return t.trim() !== "" && Number.isFinite(n) && n >= min && n <= 100000 ? n : null;
  };
  return (
    <Field label={label}>
      <Input type="number" min={min} max={100000} value={texte}
        onChange={(e) => { setTexte(e.target.value); const n = lu(e.target.value); if (n !== null) onChange(n); }}
        onBlur={() => { if (lu(texte) === null) setTexte(String(valeur)); }} />
    </Field>
  );
}

// ── Mise en page commune ───────────────────────────────────────────────────

function Atelier({ atelier, intro, titre, setTitre, nombre: nombreProblemes, setNombre, prenoms, setPrenoms, presentation, setPresentation, problemes, tirage, pilote, children }: {
  /** L'onglet de Fabriquer, où l'enseignant a choisi les compétences. */
  atelier: string;
  intro: React.ReactNode;
  titre: string; setTitre: (v: string) => void;
  nombre: number; setNombre: (v: number) => void;
  prenoms: string; setPrenoms: (v: string) => void;
  presentation: Presentation; setPresentation: (p: Presentation) => void;
  problemes: Probleme[];
  tirage: Tirage;
  /** Ce que l'assistant de l'onglet lit et change : la sorte de problèmes, ses réglages, et comment les appliquer. */
  pilote: { sorte: SorteDeProblemes; reglages: ReglagesDeLAtelier; appliquer: (r: ReponseProblemes) => void };
  children: React.ReactNode;
}) {
  const [corrige, setCorrige] = React.useState(false);
  const [edite, setEdite] = React.useState<number | null>(null);
  const p = presentation;
  const enregistrees = usePresentationsEnregistrees();
  // « Tout ça, je voulais dire le tchatbot » : l'atelier n'a plus que l'assistant. Sans clé Mistral, les réglages
  // à la main reviennent ; avec elle, ils restent à portée (hors ligne, par exemple), repliés.
  const [cle, setCle] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    api.settingGet("mistralApiKey").then((k) => setCle(!!k && k.trim().length > 0)).catch(() => setCle(false));
  }, []);
  const [aLaMain, setALaMain] = React.useState(false);
  const reglagesVisibles = cle === false || aLaMain;
  // Les mots des énoncés, ceux des thèmes écrits avec l'assistant compris ; aucun sans énoncé.
  const enonces = React.useMemo(() => (p.enonce ? problemes.map((pb) => pb.enonce).filter(Boolean) : []), [problemes, p.enonce]);
  const themesEcrits = pilote.reglages.themesPerso;
  const mots = React.useMemo(() => avecDesMotsEnPlus(motsDesEnonces(enonces), motsDesThemes(themesEcrits, enonces)), [enonces, themesEcrits]);
  const [motsOuverts, setMotsOuverts] = React.useState(false);

  /** Ce que l'assistant a compris : les réglages de l'onglet, puis la présentation, l'aperçu, l'impression. */
  const appliquer = (r: ReponseProblemes) => {
    pilote.appliquer(r);
    const base = r.presentationEnregistree ? enregistrees.liste.find((x) => x.nom === r.presentationEnregistree)?.presentation
      : r.modele === "complete" ? PRESENTATION_COMPLETE : r.modele === "modele-seul" ? PRESENTATION_MODELE_SEUL : undefined;
    const suite = r.presentation ? retoucherPresentation(base ?? p, r.presentation) : base;
    if (suite && !memePresentation(suite, p)) setPresentation(suite);
    if (r.enregistrerPresentation) enregistrees.enregistrer(r.enregistrerPresentation, suite ?? p);
    if (r.voirCorrige !== undefined) setCorrige(r.voirCorrige);
    // L'impression, le bureau et les mots partent après le rendu de la feuille changée.
    if (r.imprimer || r.surLeBureau || r.motsEnImages) {
      window.setTimeout(() => {
        const etat = etatRef.current;
        if (r.imprimer) imprimer(atelier, etat.problemes, etat.titre, etat.presentation);
        if (r.surLeBureau) void bureau(atelier, etat.problemes, etat.titre, etat.presentation);
        if (r.motsEnImages) {
          if (!nombreDeMots(etat.mots)) toast("La feuille n'a pas d'énoncé : il n'y a pas de mots à montrer.", { icone: "ℹ️" });
          else if (r.motsEnImages === "voir") setMotsOuverts(true);
          else if (r.motsEnImages === "imprimer") void imprimerLesMots(etat.mots);
          else lesMotsSurLeBureau(etat.mots)
            .then((m) => toast(`« ${m.titre} » est sur le bureau, dans le plan de travail.`, { icone: "🗂", duree: 8000 }))
            .catch((e) => toast("Pas enregistré : " + texteErreur(e), { icone: "⚠️", duree: 7000 }));
        }
      }, 300);
    }
  };
  // La feuille la plus récente, pour l'impression demandée à l'assistant.
  const etatRef = React.useRef({ problemes, titre, presentation: p, mots });
  etatRef.current = { problemes, titre, presentation: p, mots };
  const listeDesMots = [...mots.choses, ...mots.actions, ...mots.question].map((x) => x.mot);
  const pages = corrige
    ? [problemes.map((pb, i) => ({ i, html: blocCorrige(pb, i, p) }))]
    : decouperEnPages(problemes.map((pb, i) => ({ i, html: blocProbleme(pb, i, p) })), p.parPage);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <AssistantDesProblemes cle={cle} intro={intro} appliquer={appliquer}
          etat={{
            sorte: pilote.sorte, reglages: pilote.reglages, problemes, presentation: p, presentationsEnregistrees: enregistrees.liste.map((x) => x.nom),
            voirCorrige: corrige, motsDesEnonces: listeDesMots,
          }} />
        {cle && (
          <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => setALaMain((v) => !v)}>
            {aLaMain ? "Masquer les réglages" : "⚙︎ Réglages à la main"}
          </button>
        )}
        {reglagesVisibles && <>
        <div className="card">
          <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
            Les problèmes
            <Aide titre="Les problèmes" vers="droite"><p>{intro}</p></Aide>
          </h3>
          {children}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nombre de problèmes">
              <Select value={nombreProblemes} onChange={(e) => setNombre(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Titre de la feuille">
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
            </Field>
          </div>
          {p.enonce && (
            <Field label="Prénoms dans les énoncés (facultatif)">
              <Input value={prenoms} placeholder="Séparés par des virgules : Léa, Tom…" onChange={(e) => setPrenoms(e.target.value)} />
            </Field>
          )}
        </div>
        <ReglagesPresentation p={p} set={setPresentation} enregistrees={enregistrees} />
        </>}
      </div>

      <div className="card" style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Aperçu</h3>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={corrige} onChange={(e) => setCorrige(e.target.checked)} /> Voir le corrigé
          </label>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={tirage.nouvelle} title="Tire d'autres nombres et d'autres situations">🔀 Nouvelle feuille</button>
          {nombreDeMots(mots) > 0 && (
            <button className="btn sm" onClick={() => setMotsOuverts(true)} title="Les mots des énoncés, chacun avec son image : à travailler avant les problèmes">🖼 Les mots</button>
          )}
          <button className="btn sm primary" onClick={() => imprimer(atelier, problemes, titre, p)}>🖨 Imprimer</button>
          <BoutonBureau onEnregistrer={() => bureau(atelier, problemes, titre, p)} />
        </div>
        <style>{STYLE_FEUILLE}</style>
        <div className="pb-apercu">
          {pages.map((page, k) => (
            <div key={k} className={`pb-apercu-page ${classesFeuille(p)}`}>
              {!corrige && k === 0 && <div dangerouslySetInnerHTML={{ __html: enteteFeuille(titre, p) }} />}
              <div className={`pb-grille pb-colonnes-${corrige ? (p.enonce ? 1 : 2) : p.colonnes}`}>
                {page.map(({ i, html }) => (
                  <div key={i} className="pb-apercu-probleme">
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                    <div className="pb-apercu-actions">
                      <button className="btn sm" onClick={() => setEdite(i)} title="Choisir les nombres de ce problème"
                        aria-label={`Modifier les nombres du problème ${i + 1}`}>✏️</button>
                      <button className="btn sm" onClick={() => tirage.retirer(i)} title="Remplacer ce problème par un autre"
                        aria-label={`Remplacer le problème ${i + 1}`}>↻</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!corrige && pages.length > 1 && (
            <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center" }}>{pages.length} pages à l'impression</div>
          )}
        </div>
      </div>

      {motsOuverts && nombreDeMots(mots) > 0 && <LesMotsEnImages mots={mots} onFermer={() => setMotsOuverts(false)} />}

      {edite !== null && problemes[edite] && (
        <EditeurProbleme probleme={problemes[edite]} numero={edite + 1} presentation={p}
          onFermer={() => setEdite(null)}
          onValider={(r) => { tirage.retoucher(edite, r); setEdite(null); }} />
      )}
    </div>
  );
}

// ── Présentation ───────────────────────────────────────────────────────────

const CLE_PRESENTATIONS = "fabriquer:presentations";
interface PresentationNommee { nom: string; presentation: Presentation }

/** Les présentations enregistrées par l'enseignant, communes aux deux onglets et à ses ordinateurs. */
function usePresentationsEnregistrees() {
  const [liste, setListe] = React.useState<PresentationNommee[]>([]);
  React.useEffect(() => {
    api.settingGet(CLE_PRESENTATIONS).then((brut) => {
      try {
        const lu = brut ? JSON.parse(brut) : [];
        setListe(Array.isArray(lu) ? lu.filter((x) => x && typeof x.nom === "string")
          .map((x) => ({ nom: x.nom, presentation: normaliserPresentation(x.presentation) })) : []);
      } catch { setListe([]); }
    }).catch(() => {});
  }, []);
  const ecrire = (suite: PresentationNommee[]) => {
    setListe(suite);
    api.settingSet(CLE_PRESENTATIONS, JSON.stringify(suite)).catch((e) => toast(`Enregistrement impossible : ${e}`, { icone: "⚠️" }));
  };
  return {
    liste,
    enregistrer: (nom: string, presentation: Presentation) =>
      ecrire([...liste.filter((x) => x.nom !== nom), { nom, presentation }].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))),
    supprimer: (nom: string) => ecrire(liste.filter((x) => x.nom !== nom)),
  };
}

const GROUPES_PRESENTATION: GroupePresentation[] = ["La feuille", "L'énoncé", "Le schéma"];

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <details className="pb-groupe" open>
      <summary>{titre}</summary>
      <div className="pb-groupe-corps">{children}</div>
    </details>
  );
}

function ReglagesPresentation({ p, set, enregistrees }: {
  p: Presentation; set: (p: Presentation) => void; enregistrees: ReturnType<typeof usePresentationsEnregistrees>;
}) {
  const maj = (m: Partial<Presentation>) => set({ ...p, ...m });
  const { liste, enregistrer, supprimer } = enregistrees;
  const [nom, setNom] = React.useState<string | null>(null);
  const courante = liste.find((x) => memePresentation(x.presentation, p));

  const coche = (cle: keyof Presentation, libelle: string, aide?: string) => (
    <label className="pb-coche">
      <input type="checkbox" checked={Boolean(p[cle])} onChange={(e) => maj({ [cle]: e.target.checked } as Partial<Presentation>)} />
      <span>{libelle}{aide && <><br /><span style={{ color: "var(--text-2)" }}>{aide}</span></>}</span>
    </label>
  );
  const choix = <K extends keyof Presentation>(cle: K, libelle: string, options: [Presentation[K], string][]) => (
    <Field label={libelle}>
      <Select value={String(p[cle])} onChange={(e) => {
        const trouve = options.find(([v]) => String(v) === e.target.value);
        if (trouve) maj({ [cle]: trouve[0] } as Partial<Presentation>);
      }}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </Select>
    </Field>
  );
  const couleur = (cle: "couleurTout" | "couleurPartie1" | "couleurPartie2" | "couleurPartie3", libelle: string) => (
    <label className="pb-couleur">
      <input type="color" value={p[cle]} onChange={(e) => maj({ [cle]: e.target.value } as Partial<Presentation>)} />
      {libelle}
    </label>
  );

  /** Une commande de la liste : une case à cocher, une liste de choix, un texte. */
  const commande = (c: CommandePresentation) => {
    if (c.options) {
      return (
        <React.Fragment key={c.cle}>
          {choix(c.cle, c.libelle, c.options as [Presentation[typeof c.cle], string][])}
          {c.aide && <p style={{ fontSize: 12, color: "var(--text-2)", margin: "-6px 0 10px" }}>{c.aide}</p>}
        </React.Fragment>
      );
    }
    if (c.sorte === "texte") {
      return (
        <Field key={c.cle} label={c.libelle}>
          <Input value={String(p[c.cle])} maxLength={30} onChange={(e) => maj({ [c.cle]: e.target.value } as Partial<Presentation>)} />
        </Field>
      );
    }
    return <React.Fragment key={c.cle}>{coche(c.cle, c.libelle, c.aide)}</React.Fragment>;
  };

  const valider = () => {
    const n = (nom ?? "").trim();
    if (!n) return;
    enregistrer(n, p);
    setNom(null);
    toast(`Présentation « ${n} » enregistrée.`, { icone: "💾" });
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>La présentation</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button className={`btn sm${memePresentation(p, PRESENTATION_COMPLETE) ? " primary" : ""}`}
          onClick={() => set(PRESENTATION_COMPLETE)}>📄 Feuille complète</button>
        <button className={`btn sm${memePresentation(p, PRESENTATION_MODELE_SEUL) ? " primary" : ""}`}
          onClick={() => set(PRESENTATION_MODELE_SEUL)}
          title="Le schéma et ses nombres, sans titre, énoncé, numéro, cadre ni mot">▭ Modèle en barres seul</button>
      </div>

      <Field label="Présentations enregistrées">
        <div style={{ display: "flex", gap: 6 }}>
          <Select value={courante?.nom ?? ""} style={{ flex: 1 }} onChange={(e) => {
            const x = liste.find((y) => y.nom === e.target.value);
            if (x) set(x.presentation);
          }}>
            <option value="">{liste.length ? "Choisir…" : "Aucune pour l'instant"}</option>
            {liste.map((x) => <option key={x.nom} value={x.nom}>{x.nom}</option>)}
          </Select>
          <button className="btn sm" onClick={() => setNom(courante?.nom ?? "")} title="Enregistrer cette présentation">💾</button>
          {courante && (
            <button className="btn sm" title={`Supprimer « ${courante.nom} »`} onClick={async () => {
              if (!(await confirmer(`Supprimer la présentation « ${courante.nom} » ?`, { oui: "Supprimer", danger: true }))) return;
              const partie = courante;
              supprimer(partie.nom);
              toastAnnulable(`Présentation « ${partie.nom} » supprimée.`, () => enregistrer(partie.nom, partie.presentation));
            }}>🗑</button>
          )}
        </div>
        {nom !== null && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Input autoFocus value={nom} placeholder="Nom, par exemple « Pour Adam »" style={{ flex: 1 }}
              onFocus={(e) => e.target.select()} onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setNom(null); }} />
            <button className="btn sm primary" onClick={valider} disabled={!nom.trim()}>Enregistrer</button>
          </div>
        )}
      </Field>

      {GROUPES_PRESENTATION.map((g) => {
        // Les commandes du groupe, d'après la liste qu'a aussi l'assistant (CATALOGUE_PRESENTATION).
        const items = CATALOGUE_PRESENTATION.filter((c) => c.groupe === g && (!c.visible || c.visible(p)));
        const blocs: React.ReactNode[] = [];
        for (let i = 0; i < items.length; i++) {
          const c = items[i];
          if (c.sorte === "couleur") {
            const couleurs = items.slice(i).filter((x) => x.sorte === "couleur");
            blocs.push(<div key={c.cle} className="pb-couleurs">{couleurs.map((x) => couleur(x.cle as "couleurTout", x.libelle))}</div>);
            i += couleurs.length - 1;
          } else if (c.paire && items[i + 1]) {
            blocs.push(<div key={c.cle} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>{commande(c)}{commande(items[i + 1])}</div>);
            i++;
          } else {
            blocs.push(<React.Fragment key={c.cle}>{commande(c)}</React.Fragment>);
          }
        }
        return <Groupe key={g} titre={g}>{blocs}</Groupe>;
      })}
    </div>
  );
}

// ── Choisir les nombres d'un problème ──────────────────────────────────────

function EditeurProbleme({ probleme, numero, presentation, onFermer, onValider }: {
  probleme: Probleme; numero: number; presentation: Presentation;
  onFermer: () => void; onValider: (r: Retouche) => void;
}) {
  const [r, setR] = React.useState<Retouche>(() => retoucheDe(probleme));
  const apercu = retoucher(probleme, r, presentation.enonce);
  const champ = (label: string, valeur: number, min: number, onChange: (v: number) => void) => (
    <NombreChamp key={label} label={label} valeur={valeur} min={min} onChange={onChange} />
  );

  return (
    <Modal titre={`Problème ${numero} : choisir les nombres`} onClose={onFermer} large
      footer={<>
        <button className="btn" onClick={onFermer}>Annuler</button>
        <button className="btn primary" onClick={() => onValider(r)}>Appliquer</button>
      </>}>
      {r.forme === "parties" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${r.valeurs.length}, 1fr)`, gap: 10 }}>
            {r.valeurs.map((v, k) => champ(`Partie ${k + 1}`, v, 1, (n) => setR({ ...r, valeurs: r.valeurs.map((x, j) => (j === k ? n : x)) })))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.inconnue} onChange={(e) => setR({ ...r, inconnue: Number(e.target.value) })}>
              <option value={-1}>Le tout ({nombre(r.valeurs.reduce((s, v) => s + v, 0))})</option>
              {r.valeurs.map((v, k) => <option key={k} value={k}>La partie {k + 1} ({nombre(v)})</option>)}
            </Select>
          </Field>
        </>
      )}
      {r.forme === "parts-egales" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {champ("Nombre de parts", r.parts, 2, (parts) => setR({ ...r, parts }))}
            {champ("Valeur d'une part", r.valeur, 1, (valeur) => setR({ ...r, valeur }))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as typeof r.type })}>
              <option value="tout">Le tout ({nombre(r.parts * r.valeur)})</option>
              <option value="part">La valeur d'une part</option>
              <option value="nombre">Le nombre de parts</option>
            </Select>
          </Field>
        </>
      )}
      {r.forme === "comparaison" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {champ("Petite quantité", r.petit, 1, (petit) => setR({ ...r, petit }))}
            {champ("Combien de fois plus", r.fois, 2, (fois) => setR({ ...r, fois }))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as typeof r.type })}>
              <option value="grand">La grande quantité ({nombre(r.petit * r.fois)})</option>
              <option value="petit">La petite quantité</option>
            </Select>
          </Field>
        </>
      )}
      <div className="pb-apercu-page pb-feuille" style={{ marginTop: 6 }}>
        {presentation.enonce && apercu.enonce && <p className="pb-enonce" style={{ marginTop: 0 }}>{apercu.enonce}</p>}
        <div className="pb-schema" dangerouslySetInnerHTML={{ __html: schemaSvg(apercu.schema, "nombres", styleSchema(presentation)) }} />
      </div>
    </Modal>
  );
}

// ── L'assistant de l'atelier ───────────────────────────────────────────────

/** Les réglages que la réponse change, parmi ceux d'un onglet. */
function reglagesRetenus<K extends keyof ReglagesDeLAtelier>(rep: ReponseProblemes, cles: K[]): Partial<Pick<ReglagesDeLAtelier, K>> {
  const m: Partial<Pick<ReglagesDeLAtelier, K>> = {};
  for (const k of cles) if (rep.reglages[k] !== undefined) m[k] = rep.reglages[k] as ReglagesDeLAtelier[K];
  return m;
}

/** Une autre feuille, des problèmes remplacés : ce que la réponse demande au tirage. */
function suivreLaReponse(rep: ReponseProblemes, tirage: Tirage) {
  if (rep.nouvelleFeuille) tirage.nouvelle();
  for (const n of rep.remplacer ?? []) tirage.retirer(n - 1);
}

type Bulle = { role: "user" | "assistant"; content: string; erreur?: boolean; changements?: string[] };

/**
 * « Essaye de faire un tchatbot ici » : un fil de bulles et un champ. L'enseignant dit la feuille qu'il veut ;
 * l'assistant règle l'atelier (voir assistantProblemes.ts). Le fil ne se garde pas d'une ouverture à l'autre.
 */
function AssistantDesProblemes({ etat, appliquer, cle, intro }: {
  etat: EtatDeLAtelier; appliquer: (r: ReponseProblemes) => void; cle: boolean | null; intro: React.ReactNode;
}) {
  const [fil, setFil] = React.useState<Bulle[]>(() => [{ role: "assistant", content: accueilDesProblemes(etat.sorte) }]);
  const [saisie, setSaisie] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  // L'atelier le plus récent : la conversation part de la feuille telle qu'elle est quand on envoie.
  const etatRef = React.useRef(etat);
  etatRef.current = etat;
  const filRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight; }, [fil, occupe]);

  const envoyer = async () => {
    const texte = saisie.trim();
    if (!texte || occupe) return;
    const conversation = [...fil.filter((m) => !m.erreur).map(({ role, content }) => ({ role, content })), { role: "user" as const, content: texte }];
    setFil((f) => [...f, { role: "user", content: texte }]);
    setSaisie("");
    setOccupe(true);
    try {
      const avant = etatRef.current;
      const r = await demanderALAssistantDesProblemes(avant, conversation);
      // Ce qui bouge se dit d'après l'atelier tel qu'il est à la réponse : c'est sur lui qu'elle s'applique.
      const changements = changementsEnClair(r, etatRef.current);
      appliquer(r);
      setFil((f) => [...f, { role: "assistant", content: r.reponse, changements }]);
    } catch (e) {
      setFil((f) => [...f, { role: "assistant", content: `Je n'ai pas pu répondre : ${texteErreur(e)}`, erreur: true }]);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        L'assistant
        <Aide titre="Les problèmes" vers="droite"><p>{intro}</p></Aide>
      </h3>
      <div className="projet-assistant pb-assistant">
        <div className="projet-assistant-fil" ref={filRef} aria-live="polite">
          {fil.map((m, i) => (
            <React.Fragment key={i}>
              <div className={`projet-assistant-bulle ${m.role === "user" ? "moi" : "lui"}${m.erreur ? " erreur" : ""}`}>{m.content}</div>
              {!!m.changements?.length && <div className="pb-changements">✓ {m.changements.join(" · ")}</div>}
            </React.Fragment>
          ))}
          {cle === false && (
            <div className="projet-assistant-bulle lui erreur">Pour répondre, l'assistant a besoin de la clé Mistral : Réglages › Assistant IA. En attendant, les réglages sont ci-dessous.</div>
          )}
          {occupe && <div className="projet-assistant-bulle lui en-cours" aria-label="L'assistant écrit">…</div>}
        </div>
        <div className="projet-assistant-saisie">
          <Input value={saisie} autoComplete="off" placeholder="La feuille que vous voulez…" aria-label="Votre message à l'assistant de l'atelier"
            disabled={cle === false} onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(); } }} />
          <button type="button" className="btn primary" disabled={!saisie.trim() || occupe || cle === false} onClick={() => { void envoyer(); }}>Envoyer</button>
        </div>
      </div>
    </div>
  );
}

