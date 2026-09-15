import React from "react";
import { createPortal } from "react-dom";
import { api } from "../api";
import { EVT_DONNEES_DISTANTES, Field, Input, Select, Textarea, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML } from "../print";
import { useMemoire } from "../components/useMemoire";
import { ChoixPicto, chargerImages, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import {
  COMPORTEMENTS_MAX, DUREES_MINUTEUR, ETAPES_SCENARIO_MAX, JETONS_MAX, MINUTES_MAX, PAGE_PAYSAGE,
  STYLE_SUPPORTS, TITRES_ETAPES,
  demarrer, dePrenom, dureeMs, estEnMarche, estFini, feuilleDabord, feuilleJetons, feuilleScenario, fractionAffichee, graduations,
  idsDes, mettreEnPause, minuteurPret, normaliserDabord, normaliserJetons, normaliserMinuteur, normaliserScenario,
  pageDuScenario, pictoVide, prolonger, restantA, secteurRestant, tempsLisible,
  type EtatMinuteur, type FormeJeton, type Images, type PictoPose, type ReglagesMinuteur, type ReglagesScenario,
} from "../supportsVisuels";

// ── Supports visuels ───────────────────────────────────────────────────────
//
// Des outils de structuration à imprimer et plastifier — économie de jetons,
// « d'abord / ensuite », scénario social — et un minuteur visuel à afficher.
// Chaque support se règle à gauche et se voit à droite tel qu'il sortira.

export const SUPPORTS = ["jetons", "dabord", "scenario", "minuteur"] as const;
type Support = typeof SUPPORTS[number];
const lireSupport = (brut: unknown): Support => (SUPPORTS.includes(brut as Support) ? (brut as Support) : "jetons");

/** Pour la palette : le support à montrer quand l'onglet s'ouvrira. */
export function retenirSupport(onglet: string): boolean {
  if (!SUPPORTS.includes(onglet as Support)) return false;
  try { localStorage.setItem("fabriquer:supports:onglet", JSON.stringify(onglet)); } catch { /* stockage indisponible */ }
  return true;
}

export function SupportsVisuelsTab({ banque }: { banque: boolean }) {
  const [support, setSupport] = useMemoire<Support>("supports:onglet", lireSupport);
  useOngletDemande("jeux", SUPPORTS, setSupport);
  return (
    <>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={support === "jetons" ? "active" : ""} onClick={() => setSupport("jetons")}>🪙 Économie de jetons</button>
        <button className={support === "dabord" ? "active" : ""} onClick={() => setSupport("dabord")}>➡️ D'abord / ensuite</button>
        <button className={support === "scenario" ? "active" : ""} onClick={() => setSupport("scenario")}>📖 Scénario social</button>
        <button className={support === "minuteur" ? "active" : ""} onClick={() => setSupport("minuteur")}>⏱ Minuteur visuel</button>
      </div>
      {support === "jetons" ? <Jetons banque={banque} />
        : support === "dabord" ? <Dabord banque={banque} />
        : support === "scenario" ? <Scenario banque={banque} />
        : <Minuteur banque={banque} />}
    </>
  );
}

// ── Pièces communes ────────────────────────────────────────────────────────

/**
 * Les réglages d'un support, gardés sur cet ordinateur : `maj` en change une
 * partie (deux changements à la suite s'additionnent), `remplacer` le tout.
 */
function useSupport<T extends object>(cle: string, lire: (brut: unknown) => T): [T, (m: Partial<T>) => void, (v: T) => void] {
  const [valeur, ecrire] = useMemoire<T>(`supports:${cle}`, lire);
  const ref = React.useRef(valeur);
  ref.current = valeur;
  const maj = React.useCallback((m: Partial<T>) => {
    ref.current = { ...ref.current, ...m };
    ecrire(ref.current);
  }, [ecrire]);
  return [valeur, maj, ecrire];
}

/** Une case où poser un pictogramme : l'image et son mot, ou une invitation à en choisir un. */
function CasePicto({ valeur, onChange, banque, titre, taille = 76 }: {
  valeur: PictoPose; onChange: (p: PictoPose) => void; banque: boolean; titre: string; taille?: number;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const src = usePictoImage(valeur.id);
  const vide = valeur.id == null && !valeur.mot.trim();
  return (
    <>
      <button type="button" className="sv-case-picto" onClick={() => setOuvert(true)} title={titre} aria-label={`${titre} : ${valeur.mot || "à choisir"}`}
        style={{ width: taille + 16 }}>
        {src ? <img src={src} alt="" style={{ width: taille, height: taille }} />
          : <span className="sv-case-vide" style={{ width: taille, height: taille }}>{vide ? "＋" : "🖼"}</span>}
        <span className="sv-case-mot">{valeur.mot.trim() || (vide ? "Choisir" : "")}</span>
      </button>
      {ouvert && (
        <ChoixPicto valeur={valeur} banque={banque} titre={titre} onClose={() => setOuvert(false)}
          onValider={(p) => { onChange(p); setOuvert(false); }} />
      )}
    </>
  );
}

function Coche({ valeur, onChange, children }: { valeur: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="pb-coche">
      <input type="checkbox" checked={valeur} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

interface Modele<T> { nom: string; reglages: T }

/**
 * Les supports enregistrés sous un nom (« Tableau d'Adam ») : gardés dans les
 * réglages de l'application, donc retrouvés sur l'autre ordinateur.
 */
function Modeles<T>({ type, valeur, set, normaliser, exemple }: {
  type: string; valeur: T; set: (v: T) => void; normaliser: (brut: unknown) => T; exemple: string;
}) {
  const cle = `fabriquer:supports-enregistres:${type}`;
  const [liste, setListe] = React.useState<Modele<T>[]>([]);
  const [nom, setNom] = React.useState<string | null>(null);
  React.useEffect(() => {
    const lire = () => api.settingGet(cle).then((brut) => {
      try {
        const lu = brut ? JSON.parse(brut) : [];
        setListe(Array.isArray(lu)
          ? lu.filter((x) => x && typeof x.nom === "string").map((x) => ({ nom: x.nom, reglages: normaliser(x.reglages) }))
          : []);
      } catch { setListe([]); }
    }).catch(() => {});
    void lire();
    // Un support enregistré sur l'autre ordinateur arrive avec la synchronisation.
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  const ecrire = (suite: Modele<T>[]) => {
    setListe(suite);
    api.settingSet(cle, JSON.stringify(suite)).catch((e) => toast(`Enregistrement impossible : ${e}`, { icone: "⚠️" }));
  };
  const actuel = JSON.stringify(valeur);
  const courant = liste.find((x) => JSON.stringify(x.reglages) === actuel);
  const valider = () => {
    const n = (nom ?? "").trim();
    if (!n) return;
    ecrire([...liste.filter((x) => x.nom !== n), { nom: n, reglages: valeur }].sort((a, b) => a.nom.localeCompare(b.nom, "fr")));
    setNom(null);
    toast(`« ${n} » enregistré.`, { icone: "💾" });
  };
  return (
    <Field label="Mes supports enregistrés">
      <div style={{ display: "flex", gap: 6 }}>
        <Select value={courant?.nom ?? ""} style={{ flex: 1 }} onChange={(e) => {
          const x = liste.find((y) => y.nom === e.target.value);
          if (x) set(normaliser(x.reglages));
        }}>
          <option value="">{liste.length ? "Reprendre…" : "Aucun pour l'instant"}</option>
          {liste.map((x) => <option key={x.nom} value={x.nom}>{x.nom}</option>)}
        </Select>
        <button className="btn sm" onClick={() => setNom(courant?.nom ?? "")} title="Enregistrer ce support sous un nom">💾</button>
        {courant && (
          <button className="btn sm" title={`Supprimer « ${courant.nom} »`} onClick={async () => {
            if (await confirmer(`Supprimer « ${courant.nom} » ?`, { oui: "Supprimer", danger: true })) {
              ecrire(liste.filter((x) => x.nom !== courant.nom));
            }
          }}>🗑</button>
        )}
      </div>
      {nom !== null && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <Input autoFocus value={nom} placeholder={exemple} style={{ flex: 1 }}
            onFocus={(e) => e.target.select()} onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setNom(null); }} />
          <button className="btn sm primary" onClick={valider} disabled={!nom.trim()}>Enregistrer</button>
        </div>
      )}
    </Field>
  );
}

/** Réglages à gauche, aperçu fidèle à droite, et le bouton pour imprimer. */
function Atelier({ reglages, pictos, titre, feuille, page, aide }: {
  reglages: React.ReactNode;
  pictos: (PictoPose | null | undefined)[];
  titre: string;
  feuille: (images: Images) => string;
  page: string;
  aide: React.ReactNode;
}) {
  const ids = idsDes(pictos);
  const images = usePictoImages(ids);
  const imprimer = async () => {
    printHTML(titre, feuille(await chargerImages(ids)), STYLE_SUPPORTS + page);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-2)" }}>{aide}</p>
        {reglages}
      </div>
      <div className="card" style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Aperçu</h3>
          <div style={{ flex: 1 }} />
          <button className="btn sm primary" onClick={imprimer}>🖨 Imprimer</button>
        </div>
        <style>{STYLE_SUPPORTS}</style>
        <div className="sv-apercu" dangerouslySetInnerHTML={{ __html: feuille(images) }} />
      </div>
    </div>
  );
}

// ── Économie de jetons ─────────────────────────────────────────────────────

const FORMES: [FormeJeton, string][] = [["etoile", "⭐ Étoiles"], ["rond", "● Ronds"], ["sourire", "🙂 Sourires"], ["picto", "🖼 Un pictogramme"]];

function Jetons({ banque }: { banque: boolean }) {
  const [r, maj, setR] = useSupport("jetons", normaliserJetons);
  const comportements = r.comportements;
  return (
    <Atelier titre={r.prenom.trim() ? `Tableau de jetons ${dePrenom(r.prenom)}` : "Tableau de jetons"}
      pictos={[r.recompense, r.forme === "picto" ? r.jeton : null, ...comportements]}
      feuille={(images) => feuilleJetons(r, images)} page={PAGE_PAYSAGE}
      aide="L'élève gagne un jeton à chaque réussite ; quand toutes les cases sont remplies, il obtient ce qu'il a choisi. À plastifier, avec des scratchs sur les cases et les jetons."
      reglages={<>
        <Modeles type="jetons" valeur={r} set={setR} normaliser={normaliserJetons} exemple="Nom, par exemple « Tableau d'Adam »" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Prénom (facultatif)">
            <Input value={r.prenom} placeholder="Adam" onChange={(e) => maj({ prenom: e.target.value })} />
          </Field>
          <Field label="Jetons à gagner">
            <Select value={r.nombre} onChange={(e) => maj({ nombre: Number(e.target.value) })}>
              {Array.from({ length: JETONS_MAX }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Je travaille pour…">
          <CasePicto valeur={r.recompense} onChange={(recompense) => maj({ recompense })} banque={banque} titre="La récompense" taille={96} />
        </Field>
        <Field label="Les jetons">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Select value={r.forme} style={{ flex: 1 }} onChange={(e) => maj({ forme: e.target.value as FormeJeton })}>
              {FORMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            {r.forme === "picto"
              ? <CasePicto valeur={r.jeton} onChange={(jeton) => maj({ jeton })} banque={banque} titre="Le pictogramme des jetons" taille={40} />
              : <input type="color" value={r.couleur} aria-label="Couleur des jetons" className="sv-couleur"
                onChange={(e) => maj({ couleur: e.target.value })} />}
          </div>
        </Field>
        <Field label="La règle, en mots">
          <Input value={r.regle} placeholder="Je gagne un jeton quand…" onChange={(e) => maj({ regle: e.target.value })} />
        </Field>
        <Field label="La règle, en images (facultatif)">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-start" }}>
            {comportements.map((c, i) => (
              <div key={i} style={{ position: "relative" }}>
                <CasePicto valeur={c} banque={banque} titre="Ce qui fait gagner un jeton" taille={52}
                  onChange={(p) => maj({ comportements: comportements.map((x, j) => (j === i ? p : x)) })} />
                <button className="btn ghost sm sv-retirer" aria-label="Retirer cette image"
                  onClick={() => maj({ comportements: comportements.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            {comportements.length < COMPORTEMENTS_MAX && (
              <button className="btn sm" onClick={() => maj({ comportements: [...comportements, pictoVide()] })}>＋ Image</button>
            )}
          </div>
        </Field>
        <Coche valeur={r.decouper} onChange={(decouper) => maj({ decouper })}>Une page de jetons à découper</Coche>
        <Coche valeur={r.capitales} onChange={(capitales) => maj({ capitales })}>Mots en capitales</Coche>
      </>} />
  );
}

// ── D'abord / ensuite ──────────────────────────────────────────────────────

function Dabord({ banque }: { banque: boolean }) {
  const [r, maj, setR] = useSupport("dabord", normaliserDabord);
  return (
    <Atelier titre="D'abord, ensuite" pictos={r.etapes} feuille={(images) => feuilleDabord(r, images)} page={PAGE_PAYSAGE}
      aide="Ce qu'il faut faire d'abord, et ce qui vient ensuite : l'activité demandée, puis l'activité attendue."
      reglages={<>
        <Modeles type="dabord" valeur={r} set={setR} normaliser={normaliserDabord} exemple="Nom, par exemple « Travail puis tablette »" />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "4px 0 10px" }}>
          {r.etapes.map((e, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{TITRES_ETAPES[i]}</div>
              <CasePicto valeur={e} banque={banque} titre={TITRES_ETAPES[i]} taille={80}
                onChange={(p) => maj({ etapes: r.etapes.map((x, j) => (j === i ? p : x)) })} />
              {i === 2 && (
                <button className="btn ghost sm sv-retirer" aria-label="Retirer « Puis »"
                  onClick={() => maj({ etapes: r.etapes.slice(0, 2) })}>✕</button>
              )}
            </div>
          ))}
          {r.etapes.length < 3 && (
            <button className="btn sm" style={{ alignSelf: "center" }} onClick={() => maj({ etapes: [...r.etapes, pictoVide()] })}>＋ Puis</button>
          )}
        </div>
        <Field label="Sur la page">
          <Select value={r.exemplaires} onChange={(e) => maj({ exemplaires: Number(e.target.value) })}>
            <option value={1}>Une grande planche</option>
            <option value={2}>Deux planches à découper</option>
          </Select>
        </Field>
        <Coche valeur={r.titres} onChange={(titres) => maj({ titres })}>Écrire « D'abord », « Ensuite », « Puis »</Coche>
        <Coche valeur={r.capitales} onChange={(capitales) => maj({ capitales })}>Mots en capitales</Coche>
      </>} />
  );
}

// ── Scénario social ────────────────────────────────────────────────────────

function Scenario({ banque }: { banque: boolean }) {
  const [r, maj, setR] = useSupport("scenario", normaliserScenario);
  const etapes = r.etapes;
  const changer = (i: number, m: Partial<ReglagesScenario["etapes"][number]>) =>
    maj({ etapes: etapes.map((e, j) => (j === i ? { ...e, ...m } : e)) });
  const deplacer = (i: number, vers: number) => {
    if (vers < 0 || vers >= etapes.length) return;
    const suite = [...etapes];
    [suite[i], suite[vers]] = [suite[vers], suite[i]];
    maj({ etapes: suite });
  };
  return (
    <Atelier titre={r.titre.trim() || "Scénario social"} pictos={etapes.map((e) => e.picto)}
      feuille={(images) => feuilleScenario(r, images)} page={pageDuScenario(r)}
      aide="Une situation racontée pas à pas, à la première personne, avec une image par étape : ce qui se passe, ce que je fais, ce que ressentent les autres."
      reglages={<>
        <Modeles type="scenario" valeur={r} set={setR} normaliser={normaliserScenario} exemple="Nom, par exemple « La sonnerie »" />
        <Field label="Titre">
          <Input value={r.titre} placeholder="Quand je vais à la cantine" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label={`Les étapes (${etapes.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {etapes.map((e, i) => (
              <div key={i} className="sv-etape-edition">
                <CasePicto valeur={e.picto} banque={banque} titre={`Image de l'étape ${i + 1}`} taille={48}
                  onChange={(picto) => changer(i, { picto })} />
                <Textarea rows={2} value={e.texte} aria-label={`Phrase de l'étape ${i + 1}`}
                  placeholder={i === 0 ? "J'entends la sonnerie." : "Et ensuite…"}
                  onChange={(ev) => changer(i, { texte: ev.target.value })} />
                <div className="sv-etape-actions">
                  <button className="btn ghost sm" disabled={i === 0} onClick={() => deplacer(i, i - 1)} aria-label={`Monter l'étape ${i + 1}`}>↑</button>
                  <button className="btn ghost sm" disabled={i === etapes.length - 1} onClick={() => deplacer(i, i + 1)} aria-label={`Descendre l'étape ${i + 1}`}>↓</button>
                  <button className="btn ghost sm" disabled={etapes.length === 1} onClick={() => maj({ etapes: etapes.filter((_, j) => j !== i) })}
                    aria-label={`Retirer l'étape ${i + 1}`}>✕</button>
                </div>
              </div>
            ))}
            {etapes.length < ETAPES_SCENARIO_MAX && (
              <button className="btn sm" style={{ alignSelf: "flex-start" }}
                onClick={() => maj({ etapes: [...etapes, { picto: pictoVide(), texte: "" }] })}>＋ Ajouter une étape</button>
            )}
          </div>
        </Field>
        <Field label="Mise en page">
          <Select value={r.disposition} onChange={(e) => maj({ disposition: e.target.value as ReglagesScenario["disposition"] })}>
            <option value="liste">Les étapes les unes sous les autres</option>
            <option value="grille">En grille, deux par ligne</option>
            <option value="livret">En livret, une étape par page</option>
          </Select>
        </Field>
        <Coche valeur={r.grandTexte} onChange={(grandTexte) => maj({ grandTexte })}>Texte en grand</Coche>
        <Coche valeur={r.capitales} onChange={(capitales) => maj({ capitales })}>En capitales</Coche>
      </>} />
  );
}

// ── Minuteur visuel ────────────────────────────────────────────────────────
//
// L'état du minuteur vit hors des composants : il continue de tourner quand on
// change d'onglet, et sonne même si l'écran n'est plus affiché.

let etatMinuteur: EtatMinuteur | null = null;
let sonnerieActive = true;
let minuterieSonnerie: ReturnType<typeof setTimeout> | undefined;
const abonnes = new Set<() => void>();
let contexteAudio: AudioContext | null = null;

function lireEtat(total: number): EtatMinuteur {
  if (!etatMinuteur) etatMinuteur = minuteurPret(total);
  return etatMinuteur;
}

function changerEtat(e: EtatMinuteur) {
  etatMinuteur = e;
  clearTimeout(minuterieSonnerie);
  const maintenant = Date.now();
  if (estEnMarche(e, maintenant) && e.fin !== null) {
    minuterieSonnerie = setTimeout(() => {
      if (sonnerieActive) sonner();
      abonnes.forEach((f) => f());
    }, e.fin - maintenant);
  }
  abonnes.forEach((f) => f());
}

/** Le son se prépare pendant un clic : sans geste de l'utilisateur, la webview le garderait muet. */
function preparerSon() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    contexteAudio ??= new Ctx();
    void contexteAudio.resume();
  } catch { /* pas de son */ }
}

/** Trois notes douces, sans rien d'agressif pour les oreilles sensibles. */
function sonner() {
  const ctx = contexteAudio;
  if (!ctx) return;
  try {
    void ctx.resume();
    [523.25, 659.25, 783.99].forEach((frequence, i) => {
      const oscillateur = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillateur.type = "sine";
      oscillateur.frequency.value = frequence;
      const t = ctx.currentTime + 0.05 + i * 0.35;
      volume.gain.setValueAtTime(0.0001, t);
      volume.gain.exponentialRampToValueAtTime(0.22, t + 0.04);
      volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      oscillateur.connect(volume).connect(ctx.destination);
      oscillateur.start(t);
      oscillateur.stop(t + 0.95);
    });
  } catch { /* pas de son */ }
}

function useEtatMinuteur(total: number): EtatMinuteur {
  const [, rafraichir] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    abonnes.add(rafraichir);
    return () => { abonnes.delete(rafraichir); };
  }, []);
  const etat = lireEtat(total);
  const enMarche = estEnMarche(etat, Date.now());
  React.useEffect(() => {
    if (!enMarche) return;
    const t = setInterval(rafraichir, 200);
    return () => clearInterval(t);
  }, [enMarche]);
  return etat;
}

/** Le cadran : le disque coloré qui se vide, ses graduations et ses chiffres. */
function Cadran({ restant, total, r }: { restant: number; total: number; r: ReglagesMinuteur }) {
  const fraction = fractionAffichee(restant, total, r.cadran);
  const traits = graduations(r.cadran, total, r.sens);
  const pos = (angle: number, rayon: number) => [50 + rayon * Math.sin(angle), 50 - rayon * Math.cos(angle)];
  return (
    <svg viewBox="0 0 100 100" className="sv-cadran" role="img" aria-label={`Il reste ${tempsLisible(restant)}`}>
      <circle cx="50" cy="50" r="49" fill="#fff" stroke="#d5d9e3" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="38" fill="#f4f5f8" />
      <path d={secteurRestant(fraction, 38, r.sens)} fill={r.couleur} />
      {traits.map((g, i) => {
        const [x1, y1] = pos(g.angle, 39.2);
        const [x2, y2] = pos(g.angle, g.majeure ? 42.2 : 40.6);
        const [tx, ty] = pos(g.angle, 45.4);
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5b6275" strokeWidth={g.majeure ? 0.8 : 0.4} strokeLinecap="round" />
            {g.texte && (
              <text x={tx} y={ty} fontSize="4.2" fontWeight="700" fill="#3a3f4d" textAnchor="middle" dominantBaseline="central"
                fontFamily="Arial, Helvetica, sans-serif">{g.texte}</text>
            )}
          </g>
        );
      })}
      <circle cx="50" cy="50" r="3.2" fill="#fff" stroke="#5b6275" strokeWidth="0.8" />
    </svg>
  );
}

function CartePicto({ picto, titre, active }: { picto: PictoPose; titre: string; active?: boolean }) {
  const src = usePictoImage(picto.id);
  if (picto.id == null && !picto.mot.trim()) return null;
  return (
    <div className={`sv-minuteur-carte${active ? " active" : ""}`}>
      <div className="sv-minuteur-carte-titre">{titre}</div>
      {src ? <img src={src} alt="" /> : <div className="sv-minuteur-carte-vide" />}
      {picto.mot.trim() && <div className="sv-minuteur-carte-mot">{picto.mot.trim()}</div>}
    </div>
  );
}

async function pleinEcranFenetre(actif: boolean) {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setFullscreen(actif);
  } catch { /* hors de l'application, ou refusé : l'affichage couvre quand même la fenêtre */ }
}

function Minuteur({ banque }: { banque: boolean }) {
  const [r, maj, setR] = useSupport("minuteur", normaliserMinuteur);
  const etat = useEtatMinuteur(dureeMs(r));
  const [pleinEcran, setPleinEcran] = React.useState(false);
  React.useEffect(() => { sonnerieActive = r.son; }, [r.son]);

  const maintenant = Date.now();
  const restant = restantA(etat, maintenant);
  const enMarche = estEnMarche(etat, maintenant);
  const fini = estFini(etat, maintenant);
  const enPause = !enMarche && !fini && etat.restant < etat.total;
  /** Tel qu'au départ, sur la durée choisie : rien à remettre à zéro. */
  const neuf = etat.fin === null && etat.restant === dureeMs(r) && etat.total === dureeMs(r);

  /** Une nouvelle durée remet le minuteur à zéro, sans le lancer. */
  const choisirDuree = (minutes: number, secondes: number) => {
    const suite = normaliserMinuteur({ ...r, minutes, secondes });
    setR(suite);
    changerEtat(minuteurPret(dureeMs(suite)));
  };
  const lancerOuPause = () => {
    if (enMarche) changerEtat(mettreEnPause(etat, Date.now()));
    else { preparerSon(); changerEtat(demarrer(etat, Date.now())); }
  };
  const recommencer = () => changerEtat(minuteurPret(dureeMs(r)));
  const plusUneMinute = () => changerEtat(prolonger(etat, 60_000, Date.now()));

  // La fenêtre passe en plein écran avec l'affichage, et en sort avec lui.
  React.useEffect(() => {
    if (!pleinEcran) return;
    void pleinEcranFenetre(true);
    return () => { void pleinEcranFenetre(false); };
  }, [pleinEcran]);
  const fermerPleinEcran = React.useCallback(() => setPleinEcran(false), []);

  const lancerRef = React.useRef(lancerOuPause);
  lancerRef.current = lancerOuPause;
  React.useEffect(() => {
    if (!pleinEcran) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); fermerPleinEcran(); }
      else if (e.key === " ") { e.preventDefault(); lancerRef.current(); }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [pleinEcran, fermerPleinEcran]);

  const boutons = (
    <>
      <button className={`btn${enMarche ? "" : " primary"}`} onClick={lancerOuPause}>
        {enMarche ? "⏸ Pause" : fini ? "▶ Relancer" : enPause ? "▶ Reprendre" : "▶ Démarrer"}
      </button>
      <button className="btn" onClick={plusUneMinute} title="Ajouter une minute">＋1 min</button>
      <button className="btn" onClick={recommencer} disabled={neuf}>↺ Remettre à zéro</button>
    </>
  );

  const avecCartes = [r.maintenant, r.ensuite].some((p) => p.id != null || p.mot.trim());
  const affichage = (grand: boolean) => (
    <div className={`sv-minuteur${grand ? " sv-minuteur-grand" : ""}${avecCartes ? " avec-cartes" : ""}`}>
      <CartePicto picto={r.maintenant} titre="Maintenant" active={!fini} />
      <div className="sv-minuteur-centre">
        <Cadran restant={restant} total={etat.total} r={r} />
        {r.chiffres && <div className="sv-minuteur-chiffres" aria-live="off">{tempsLisible(restant)}</div>}
        {fini && <div className="sv-minuteur-fin">C'est fini ✓</div>}
      </div>
      <CartePicto picto={r.ensuite} titre="Ensuite" active={fini} />
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-2)" }}>
          Le temps qui reste se voit sans savoir lire l'heure : le disque se vide peu à peu. En plein écran, la barre d'espace
          met en pause et Échap referme.
        </p>
        <Field label="Durée">
          <div className="sv-durees">
            {DUREES_MINUTEUR.map((m) => (
              <button key={m} className={`btn sm${r.minutes === m && r.secondes === 0 ? " primary" : ""}`}
                onClick={() => choisirDuree(m, 0)}>{m} min</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8, fontSize: 13 }}>
            <DureeChamp valeur={r.minutes} max={MINUTES_MAX} onChange={(minutes) => choisirDuree(minutes, r.secondes)} libelle="Minutes" /> min
            <DureeChamp valeur={r.secondes} max={59} onChange={(secondes) => choisirDuree(r.minutes, secondes)} libelle="Secondes" /> s
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0 10px" }}>
          <Field label="Un tour de cadran">
            <Select value={r.cadran} onChange={(e) => maj({ cadran: e.target.value as ReglagesMinuteur["cadran"] })}>
              <option value="duree">La durée choisie</option>
              <option value="heure">Une heure</option>
            </Select>
          </Field>
          <Field label="Le disque se vide">
            <Select value={r.sens} onChange={(e) => maj({ sens: e.target.value as ReglagesMinuteur["sens"] })}>
              <option value="horaire">↻ Sens horaire</option>
              <option value="antihoraire">↺ Sens inverse</option>
            </Select>
          </Field>
        </div>
        <label className="pb-couleur" style={{ marginBottom: 8 }}>
          <input type="color" value={r.couleur} onChange={(e) => maj({ couleur: e.target.value })} /> Couleur du disque
        </label>
        <Coche valeur={r.chiffres} onChange={(chiffres) => maj({ chiffres })}>Écrire le temps restant en chiffres</Coche>
        <Coche valeur={r.son} onChange={(son) => maj({ son })}>Un son doux à la fin</Coche>
        <Field label="Autour du minuteur (facultatif)">
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ textAlign: "center", fontSize: 12.5 }}>
              <div style={{ marginBottom: 4 }}>Maintenant</div>
              <CasePicto valeur={r.maintenant} onChange={(maintenant) => maj({ maintenant })} banque={banque} titre="Ce qu'on fait maintenant" taille={60} />
            </div>
            <div style={{ textAlign: "center", fontSize: 12.5 }}>
              <div style={{ marginBottom: 4 }}>Ensuite</div>
              <CasePicto valeur={r.ensuite} onChange={(ensuite) => maj({ ensuite })} banque={banque} titre="Ce qui vient ensuite" taille={60} />
            </div>
          </div>
        </Field>
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {boutons}
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setPleinEcran(true)}>⛶ Plein écran</button>
        </div>
        {affichage(false)}
      </div>

      {pleinEcran && createPortal(
        <div className="sv-plein-ecran" role="dialog" aria-modal="true" aria-label="Minuteur visuel en plein écran">
          {affichage(true)}
          <div className="sv-plein-ecran-actions">
            {boutons}
            <button className="btn" onClick={fermerPleinEcran}>✕ Quitter le plein écran</button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Un nombre de minutes ou de secondes, accepté une fois la saisie finie. */
function DureeChamp({ valeur, max, onChange, libelle }: { valeur: number; max: number; onChange: (v: number) => void; libelle: string }) {
  const [texte, setTexte] = React.useState(String(valeur));
  React.useEffect(() => { setTexte(String(valeur)); }, [valeur]);
  const valider = () => {
    const n = Number.parseInt(texte, 10);
    if (Number.isFinite(n) && n >= 0 && n <= max) { if (n !== valeur) onChange(n); }
    else setTexte(String(valeur));
  };
  return (
    <Input value={texte} inputMode="numeric" aria-label={libelle} style={{ width: 64 }}
      onChange={(e) => setTexte(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={valider} onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
  );
}
