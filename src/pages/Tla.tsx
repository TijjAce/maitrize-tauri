import React from "react";
import { api, Gabarit, CaseTla, NatureMot, PaletteTla, PictoArasaac, PlaceDuMot, caseVide, telechargerTexte } from "../api";
import { Modal, Field, Input, Select, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import {
  NATURES, CORPS_DU_MOT, PLACES_DU_MOT, apparence, couleurSure, dupliquer, nouveauGabarit, pourImpression, redimensionner,
  casesPerdues, poser, echanger, remplies, verifier, lireGabarit, tableauSurTheme,
} from "../tla";
import { chercherPictos, estMonPicto, lireMesPictos, mentionDeMesPictos, type MonPicto } from "../mesPictos";
import { EtiquetteMonPicto, usePictoImage } from "../components/ChoixPicto";
import { FenetreCouleurs, LegendeTla, garderPaletteParDefaut, usePaletteParDefaut } from "../components/CouleursTla";
import { SQUELETTES, squelettePour, placesDuTheme, motsDuNoyau } from "../squelettes";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { deposerSurLeBureau, lignesCompetencesAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";

// ── Tableaux de langage assisté ────────────────────────────────────────────
//
// Un TLA n'est pas un jeu qu'on regénère : c'est un gabarit qu'on pose une
// fois et qu'on ne bouge plus. L'enfant atteint « je » sans le chercher des
// yeux parce que « je » est toujours à la même case ; déplacer les cases
// annulerait l'automatisation que le tableau sert à construire.
//
// L'écran est donc un éditeur, pas un générateur. La banque ARASAAC ne sert
// qu'à trouver le pictogramme que l'enseignant a décidé de poser.

const CLE = "tla:gabarits";
/** Le type du glisser d'une case : seules les cases de la grille s'y déposent. */
const TYPE_CASE = "application/x-maitrize-case-tla";

export function TlaTab() {
  const [gabarits, setGabarits] = React.useState<Gabarit[]>([]);
  const [charge, setCharge] = React.useState(false);
  const [ouvert, setOuvert] = React.useState<string>("");
  const [aSupprimer, setASupprimer] = React.useState<Gabarit | null>(null);
  const [surTheme, setSurTheme] = React.useState(false);
  const [couleursParDefaut, setCouleursParDefaut] = React.useState(false);
  const paletteParDefaut = usePaletteParDefaut();
  const importInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.settingGet(CLE).then((s) => {
      try { setGabarits(s ? JSON.parse(s) : []); } catch { setGabarits([]); }
      setCharge(true);
    });
  }, []);

  // Référence à jour : deux modifications rapprochées doivent se composer et
  // non s'écraser, comme sur les autres écrans de saisie de l'application.
  const ref = React.useRef<Gabarit[]>([]);
  ref.current = gabarits;
  const enregistrer = (liste: Gabarit[]) => {
    ref.current = liste; setGabarits(liste);
    api.settingSet(CLE, JSON.stringify(liste));
  };
  const majUn = (g: Gabarit) => enregistrer(ref.current.map((x) => (x.id === g.id ? g : x)));

  const creer = () => {
    const g = nouveauGabarit();
    enregistrer([...ref.current, g]);
    setOuvert(g.id);
  };

  const importer = async (f: File) => {
    try {
      const g = lireGabarit(await f.text());
      enregistrer([...ref.current, g]);
      setOuvert(g.id);
      toast("Gabarit importé.", { icone: "📥" });
    } catch (e: any) {
      toast("Fichier illisible : " + String(e?.message ?? e), { icone: "⚠️" });
    }
  };

  const edite = gabarits.find((g) => g.id === ouvert);
  if (!charge) return <div />;

  if (edite) {
    return <Editeur gabarit={edite} onChange={majUn} onFermer={() => setOuvert("")} />;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-2)" }}>
          Un tableau de langage se construit une fois puis ne bouge plus : c'est
          la stabilité des emplacements qui permet à l'élève d'atteindre un mot
          sans le chercher. Si l'orthophoniste ou la famille en utilise déjà un,
          <b> importez-le</b> plutôt que d'en créer un autre.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={() => setSurTheme(true)}>✨ Tableau sur un thème</button>
          <button className="btn" onClick={creer}>➕ Tableau vide</button>
          <button className="btn" onClick={() => importInput.current?.click()}>📥 Importer un gabarit</button>
          <input ref={importInput} type="file" accept="application/json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setCouleursParDefaut(true)}
            title="Les couleurs que prend un tableau neuf ; aussi dans Réglages › Général › Apparence">🎨 Couleurs par défaut…</button>
        </div>
      </div>

      {!gabarits.length ? (
        <Empty icone="🗣" titre="Aucun tableau"
          sous="Créez un gabarit, ou importez celui déjà utilisé par le SESSAD." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {gabarits.map((g) => (
            <div key={g.id} className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{g.nom}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                {g.eleve && `${g.eleve} · `}{g.colonnes} × {g.lignes} · {remplies(g)} mots
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn sm" onClick={() => setOuvert(g.id)}>✏️ Ouvrir</button>
                <button className="btn sm" title="Les mêmes cases aux mêmes places, pour un autre élève" onClick={() => {
                  const copie = dupliquer(g);
                  enregistrer([...ref.current, copie]);
                  setOuvert(copie.id);
                }}>📄 Dupliquer</button>
                <button className="btn sm" onClick={() =>
                  telechargerTexte(`tla-${g.nom.replace(/\W+/g, "-").toLowerCase()}.json`, JSON.stringify(g, null, 2))
                }>📤 Exporter</button>
                <button className="btn sm" onClick={() => setASupprimer(g)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {surTheme && (
        <SurTheme onClose={() => setSurTheme(false)}
          onCree={(g) => { enregistrer([...ref.current, g]); setSurTheme(false); setOuvert(g.id); }} />
      )}

      {aSupprimer && (
        <Confirm message={`Supprimer le tableau « ${aSupprimer.nom} » ?`}
          onYes={() => { enregistrer(ref.current.filter((x) => x.id !== aSupprimer.id)); setASupprimer(null); }}
          onClose={() => setASupprimer(null)} />
      )}

      {couleursParDefaut && (
        <FenetreCouleurs titre="Couleurs par défaut des tableaux" palette={paletteParDefaut}
          explication="Tous les tableaux les prennent, sauf ceux qui ont leurs propres couleurs. Elles se règlent aussi dans Réglages › Général › Apparence."
          onChange={(p) => { void garderPaletteParDefaut(p); }} onClose={() => setCouleursParDefaut(false)} />
      )}
    </>
  );
}

// ── Éditeur ────────────────────────────────────────────────────────────────

function Editeur({ gabarit, onChange, onFermer }: {
  gabarit: Gabarit; onChange: (g: Gabarit) => void; onFermer: () => void;
}) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [caseEditee, setCaseEditee] = React.useState<number | null>(null);
  const [redim, setRedim] = React.useState<{ colonnes: number; lignes: number } | null>(null);
  const [occupe, setOccupe] = React.useState(false);
  const [fenetreCouleurs, setFenetreCouleurs] = React.useState(false);
  // Les couleurs du tableau : les siennes, sinon celles des réglages.
  const paletteParDefaut = usePaletteParDefaut();
  const palette = gabarit.couleurs ?? paletteParDefaut;

  // Annuler : les états d'avant, cinquante au plus. Le nom se corrige dans son champ, qui a son propre retour.
  const passe = React.useRef<Gabarit[]>([]);
  const [, setNbPasse] = React.useState(0);
  const actuel = React.useRef(gabarit);
  actuel.current = gabarit;
  const prevenir = React.useRef(onChange);
  prevenir.current = onChange;
  const changer = (suite: Gabarit) => {
    passe.current = [...passe.current.slice(-49), actuel.current];
    setNbPasse(passe.current.length);
    onChange(suite);
  };
  const annuler = React.useCallback(() => {
    const avant = passe.current.pop();
    if (!avant) return;
    setNbPasse(passe.current.length);
    prevenir.current(avant);
  }, []);
  // ⌘Z ou Ctrl+Z, hors des champs — qui ont le leur — et hors d'une fenêtre ouverte.
  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "z") return;
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable='true']") || document.querySelector(".modal")) return;
      e.preventDefault();
      annuler();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [annuler]);

  // Glisser une case sur une autre les échange. La case saisie vit dans une
  // référence : pendant le survol, le navigateur ne laisse pas lire les
  // données du glisser.
  const saisie = React.useRef<number | null>(null);
  const [glissee, setGlissee] = React.useState<number | null>(null);
  const [visee, setVisee] = React.useState<number | null>(null);
  const finirGlisser = () => { saisie.current = null; setGlissee(null); setVisee(null); };

  const changerTaille = (colonnes: number, lignes: number) => {
    const perdues = casesPerdues(gabarit, colonnes, lignes);
    if (perdues > 0) setRedim({ colonnes, lignes });
    else changer(redimensionner(gabarit, colonnes, lignes));
  };

  /**
   * Le tableau prêt à imprimer : ses couleurs, les compétences de l'atelier
   * sous le titre, le fichier des photos de Mes pictos, et la mention des
   * images qui ne viennent pas d'ARASAAC — celles qui s'impriment.
   */
  const preparer = async () => {
    const soucis = verifier(gabarit);
    if (soucis.length) throw new Error(soucis[0]);
    const miens: MonPicto[] = await lireMesPictos().catch((): MonPicto[] => []);
    return pourImpression(
      { ...gabarit, competences: await lignesCompetencesAtelier("tla") },
      palette,
      (id) => miens.find((p) => p.id === id)?.fichier,
      mentionDeMesPictos(gabarit.cases.filter((c) => !c.masquee).map((c) => c.pictoId)),
    );
  };

  const imprimer = async () => {
    setOccupe(true);
    try {
      await api.tlaGenerer(await preparer());
      toast("Tableau créé — le PDF s'ouvre.", { icone: "🖨" });
    } catch (e: any) { toast(String(e?.message ?? e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  const placeMot = gabarit.placeMot ?? "dessous";
  const corpsMot = gabarit.corpsMot ?? 7;
  const masquees = gabarit.cases.filter((c) => c.masquee && c.pictoId !== null).length;

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <button className="btn sm" onClick={onFermer}>← Tous les tableaux</button>
          <Field label="Nom du tableau">
            <Input value={gabarit.nom} onChange={(e) => onChange({ ...gabarit, nom: e.target.value })} />
          </Field>
          <Field label="Élève">
            <Select value={gabarit.eleve} onChange={(e) => changer({ ...gabarit, eleve: e.target.value })}>
              <option value="">— aucun —</option>
              {(eleves ?? []).map((el) => <option key={el.id} value={el.nom}>{el.nom}</option>)}
            </Select>
          </Field>
          <Field label="Grille">
            <Select value={`${gabarit.colonnes}x${gabarit.lignes}`}
              onChange={(e) => { const [c, l] = e.target.value.split("x").map(Number); changerTaille(c, l); }}>
              {SQUELETTES.map((s) => (
                <option key={s.label} value={`${s.colonnes}x${s.lignes}`}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Écart entre les cases">
            <Select value={String(gabarit.ecart)}
              onChange={(e) => changer({ ...gabarit, ecart: Number(e.target.value) })}
              title="Des cases détachées se visent du poing ; un écart nul rend la place à des cases plus grandes">
              <option value="0">Aucun — cases jointives</option>
              <option value="3">Normal</option>
              <option value="6">Large — pointage du poing</option>
            </Select>
          </Field>
          <Field label="Orientation">
            <Select value={gabarit.paysage ? "paysage" : "portrait"}
              onChange={(e) => changer({ ...gabarit, paysage: e.target.value === "paysage" })}>
              <option value="paysage">Paysage</option>
              <option value="portrait">Portrait</option>
            </Select>
          </Field>
          <div style={{ flex: 1 }} />
          <BoutonBureau className="btn" disabled={occupe} onEnregistrer={async () => {
            const chemin = await api.tlaGenerer(await preparer(), false);
            const nom = gabarit.eleve ? `${gabarit.eleve} — ${gabarit.nom}` : gabarit.nom;
            return deposerSurLeBureau("tla", nom, await api.fichierImporterDepuisChemin(chemin));
          }} />
          <button className="btn primary" disabled={occupe} onClick={imprimer}>
            {occupe ? "Création…" : "🖨 Imprimer le tableau"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
          <Field label="Couleurs">
            <Select value={gabarit.couleurs ? "propres" : "reglages"}
              onChange={(e) => {
                if (e.target.value === "propres") {
                  changer({ ...gabarit, couleurs: { mode: palette.mode, couleurs: { ...palette.couleurs } } });
                  setFenetreCouleurs(true);
                } else {
                  const { couleurs: _siennes, ...sans } = gabarit;
                  changer(sans);
                }
              }}>
              <option value="reglages">Celles des réglages</option>
              <option value="propres">Propres à ce tableau</option>
            </Select>
          </Field>
          {gabarit.couleurs && (
            <button className="btn sm" style={{ marginBottom: 2 }} onClick={() => setFenetreCouleurs(true)}>🎨 Modifier les couleurs…</button>
          )}
          <Field label="Le mot">
            <Select value={placeMot} onChange={(e) => changer({ ...gabarit, placeMot: e.target.value as PlaceDuMot })}>
              {PLACES_DU_MOT.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </Select>
          </Field>
          <Field label="Taille du mot">
            <Select value={String(corpsMot)} disabled={placeMot === "aucune"}
              onChange={(e) => changer({ ...gabarit, corpsMot: Number(e.target.value) })}>
              {CORPS_DU_MOT.map((c) => <option key={c.corps} value={c.corps}>{c.label}</option>)}
            </Select>
          </Field>
          <div style={{ flex: 1 }} />
          <button className="btn sm" style={{ marginBottom: 2 }} disabled={!passe.current.length} onClick={annuler}
            title="Annuler la dernière modification (⌘Z)">↶ Annuler</button>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
          <LegendeTla palette={palette} />
          <span style={{ color: "var(--text-2)" }}>
            · {remplies(gabarit)} / {gabarit.cases.length} cases{masquees ? ` · ${masquees} masquée${masquees > 1 ? "s" : ""}` : ""}
          </span>
        </div>
      </div>

      <div className="card">
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-2)" }}>
          Cliquez sur une case pour y poser un mot, lui donner sa couleur ou la masquer. <b>Glissez un pictogramme
          sur un autre pour les échanger</b> ; sur une case vide, il s'y déplace.
          Changer la taille de la grille ne déplace jamais les cases déjà
          posées : elles gardent leurs coordonnées.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gabarit.colonnes}, 1fr)`,
          gap: 3, background: "#c9ccd6", padding: 3, borderRadius: 6,
          maxWidth: gabarit.paysage ? "100%" : 620,
        }}>
          {gabarit.cases.map((c, i) => (
            <CaseBouton key={i} valeur={c} palette={palette} placeMot={placeMot} corpsMot={corpsMot}
              onClick={() => setCaseEditee(i)}
              glissee={glissee === i} visee={visee === i && glissee !== i}
              onDragStart={(e) => {
                e.dataTransfer.setData(TYPE_CASE, String(i));
                e.dataTransfer.effectAllowed = "move";
                saisie.current = i; setGlissee(i);
              }}
              onDragOver={(e) => {
                if (saisie.current === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (visee !== i) setVisee(i);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setVisee((v) => (v === i ? null : v));
              }}
              onDrop={(e) => {
                const depart = saisie.current;
                if (depart === null) return;
                e.preventDefault();
                finirGlisser();
                if (depart !== i) changer(echanger(gabarit, depart, i));
              }}
              onDragEnd={finirGlisser} />
          ))}
        </div>
      </div>

      {caseEditee !== null && (
        <ChoixMot valeur={gabarit.cases[caseEditee]} palette={palette}
          onClose={() => setCaseEditee(null)}
          onValider={(v) => { changer(poser(gabarit, caseEditee, v)); setCaseEditee(null); }} />
      )}

      {redim && (
        <Confirm
          message={`Réduire la grille à ${redim.colonnes} × ${redim.lignes} effacera ${casesPerdues(gabarit, redim.colonnes, redim.lignes)} case(s) déjà remplie(s). Continuer ?`}
          onYes={() => { changer(redimensionner(gabarit, redim.colonnes, redim.lignes)); setRedim(null); }}
          onClose={() => setRedim(null)} />
      )}

      {fenetreCouleurs && gabarit.couleurs && (
        <FenetreCouleurs titre="Les couleurs de ce tableau" palette={gabarit.couleurs}
          explication="Elles ne valent que pour ce tableau : les autres gardent celles des réglages."
          onChange={(p) => changer({ ...actuel.current, couleurs: p })} onClose={() => setFenetreCouleurs(false)} />
      )}
    </>
  );
}

type GlisserCase = Pick<React.HTMLAttributes<HTMLDivElement>, "onDragStart" | "onDragOver" | "onDragLeave" | "onDrop" | "onDragEnd">;

function CaseBouton({ valeur, palette, placeMot, corpsMot, onClick, glissee, visee, ...glisser }: {
  valeur: CaseTla; palette: PaletteTla; placeMot: PlaceDuMot; corpsMot: number; onClick: () => void;
  /** La case qu'on est en train de glisser. */
  glissee: boolean;
  /** La case au-dessus de laquelle on la tient : c'est avec elle qu'elle s'échangera. */
  visee: boolean;
} & GlisserCase) {
  // Un pictogramme d'ARASAAC, ou une image de Mes pictos : une photo prise au téléphone, un dessin.
  const src = usePictoImage(valeur.pictoId, true);
  const vide = valeur.pictoId === null;
  // Une case masquée s'imprimera blanche et vide ; à l'écran, on la voit encore, pâlie.
  const masquee = !vide && !!valeur.masquee;
  const { fond, bord } = apparence(valeur, palette);
  const mot = !vide && placeMot !== "aucune" && (
    <span style={{ fontSize: Math.round(10 * corpsMot / 7), color: "#333", lineHeight: 1.1, textAlign: "center", pointerEvents: "none",
      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", opacity: masquee ? 0.35 : 1 }}>
      {valeur.mot}
    </span>
  );
  // Une case glissable n'est pas un <button> : WebKit ne fait pas glisser les boutons.
  return (
    <div role="button" tabIndex={0} draggable={!vide} {...glisser}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }}
      title={vide ? "Poser un mot" : masquee ? `${valeur.mot} — masquée : elle s'imprime vide` : valeur.mot}
      aria-label={vide ? "Case vide : poser un mot" : `${valeur.mot}${masquee ? ", masquée" : ""} : changer le mot, ou glisser pour échanger`}
      style={{
        position: "relative",
        background: vide || masquee ? "#fff" : fond,
        boxShadow: !vide && !masquee && bord ? `inset 0 0 0 4px ${bord}` : undefined,
        border: "none", borderRadius: 3, aspectRatio: "1", cursor: vide ? "pointer" : "grab",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: bord ? 6 : 3, gap: 2, minHeight: 60,
        userSelect: "none", WebkitUserSelect: "none",
        opacity: glissee ? 0.35 : 1, transition: "opacity .12s",
        outline: visee ? "3px solid var(--accent)" : undefined, outlineOffset: -3,
      }}>
      {placeMot === "dessus" && mot}
      {/* Sans événements : le survol reste celui de la case, et l'image ne se glisse pas seule. */}
      {src
        ? <img src={src} alt="" draggable={false} style={{ width: "100%", flex: 1, objectFit: "contain", minHeight: 0, pointerEvents: "none", opacity: masquee ? 0.25 : 1 }} />
        : <span style={{ flex: 1, display: "flex", alignItems: "center", color: "#bbb", fontSize: 18, pointerEvents: "none" }}>{vide ? "+" : ""}</span>}
      {placeMot !== "dessus" && mot}
      {masquee && (
        <span aria-hidden="true" style={{
          position: "absolute", top: 4, left: 4, pointerEvents: "none",
          background: "#4b5563", color: "#fff", borderRadius: 999,
          fontSize: 10, lineHeight: 1, padding: "3px 6px", fontWeight: 700,
        }}>masquée</span>
      )}
      {visee && (
        <span aria-hidden="true" style={{
          position: "absolute", top: 4, right: 4, pointerEvents: "none",
          background: "var(--accent)", color: "#fff", borderRadius: 999,
          fontSize: 12, lineHeight: 1, padding: "3px 6px", fontWeight: 700,
        }}>⇄</span>
      )}
    </div>
  );
}

// ── Choix du mot d'une case ────────────────────────────────────────────────
//
// La recherche propose, l'enseignant tranche. C'est ce qui autorise ici la
// correspondance partielle, interdite dans la génération de jeux : chercher
// « terre » ramène aussi des drapeaux, mais on les voit avant de choisir.

function ChoixMot({ valeur, palette, onClose, onValider }: {
  valeur: CaseTla; palette: PaletteTla; onClose: () => void; onValider: (v: CaseTla) => void;
}) {
  const [q, setQ] = React.useState(valeur.mot);
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  const [choisi, setChoisi] = React.useState<PictoArasaac | null>(
    valeur.pictoId !== null ? { id: valeur.pictoId, mot: valeur.mot, fichier: valeur.fichier } : null,
  );
  const [mot, setMot] = React.useState(valeur.mot);
  const [nature, setNature] = React.useState<NatureMot>(valeur.nature);
  // Vide : la couleur de sa nature ; sinon, une couleur à elle.
  const [couleur, setCouleur] = React.useState(couleurSure(valeur.couleur) ?? "");
  const [masquee, setMasquee] = React.useState(!!valeur.masquee);

  // Mes pictos d'abord — les photos prises au téléphone, les dessins gardés —, puis ARASAAC.
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) { setResultats([]); return; }
      chercherPictos(q, 40).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // La nature vient des catégories ARASAAC, jamais d'une lecture du mot. Elle
  // reste modifiable : « manger » se pose parfois comme nom sur un tableau.
  // Une image de Mes pictos n'a pas de catégorie : la case garde sa nature.
  const prendre = async (p: PictoArasaac) => {
    setChoisi(p);
    if (!mot.trim() || mot === choisi?.mot) setMot(p.mot);
    if (estMonPicto(p.id)) return;
    try { setNature((await api.arasaacNature(p.id)) as NatureMot); } catch { /* on garde */ }
  };

  const poserLaCase = () => {
    if (!choisi) return;
    const propre = couleurSure(couleur);
    onValider({
      pictoId: choisi.id, fichier: choisi.fichier, mot: mot.trim(), nature,
      ...(propre ? { couleur: propre } : {}),
      ...(masquee ? { masquee: true } : {}),
    });
  };

  return (
    <Modal titre="Poser un mot" onClose={onClose} large
      footer={<>
        {valeur.pictoId !== null && (
          <button className="btn" onClick={() => onValider(caseVide())}>Vider la case</button>
        )}
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!choisi || !mot.trim()} onClick={poserLaCase}>
          Poser
        </button>
      </>}>
      <Field label="Chercher un pictogramme, ou une image de Mes pictos">
        <Input autoFocus placeholder="manger, encore, content…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
        gap: 6, maxHeight: 260, overflowY: "auto", marginTop: 6,
      }}>
        {resultats.map((p) => (
          <Resultat key={p.id} picto={p} actif={choisi?.id === p.id} onClick={() => prendre(p)} />
        ))}
        {q.trim().length >= 2 && !resultats.length && (
          <div style={{ gridColumn: "1/-1", fontSize: 13, color: "var(--text-2)" }}>
            Aucun pictogramme pour « {q} ».
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <Field label="Mot écrit sous le pictogramme">
          <Input value={mot} onChange={(e) => setMot(e.target.value)} />
        </Field>
        <Field label="Nature (couleur de la case)">
          <Select value={nature} onChange={(e) => setNature(e.target.value as NatureMot)}>
            {NATURES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </Select>
        </Field>
        <Field label="Couleur de la case">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Select value={couleur ? "propre" : "nature"}
              onChange={(e) => setCouleur(e.target.value === "propre" ? palette.couleurs[nature] : "")}>
              <option value="nature">Celle de sa nature</option>
              <option value="propre">Une couleur à elle</option>
            </Select>
            {couleur && (
              <input type="color" value={couleur} aria-label="Couleur de la case"
                style={{ width: 42, height: 32, padding: 0, border: "1px solid var(--border)", borderRadius: 6, background: "none", flex: "none" }}
                onChange={(e) => setCouleur(e.target.value)} />
            )}
          </div>
        </Field>
        <Field label="Masquer la case">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, minHeight: 32, cursor: "pointer" }}>
            <input type="checkbox" checked={masquee} onChange={(e) => setMasquee(e.target.checked)} />
            Elle s'imprime vide, mais garde sa place et son mot
          </label>
        </Field>
      </div>
    </Modal>
  );
}

function Resultat({ picto, actif, onClick }: { picto: PictoArasaac; actif: boolean; onClick: () => void }) {
  const src = usePictoImage(picto.id, true);
  return (
    <button onClick={onClick} title={picto.mot}
      style={{
        position: "relative",
        border: actif ? "2px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 8, background: "#fff", padding: 4, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}>
      <EtiquetteMonPicto id={picto.id} />
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
           : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 10, color: "#444", lineHeight: 1.1, textAlign: "center",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {picto.mot}
      </span>
    </button>
  );
}


// ── Tableau sur un thème ───────────────────────────────────────────────────
//
// Le thème ne remplit que les cases de rôle « nom ». Le reste — mots
// interrogatifs, pronoms, verbes, petits mots, adjectifs — vient du noyau et
// se pose toujours aux mêmes coordonnées. Sans cela on produirait un tableau
// de choix : une liste de noms où l'on désigne un objet, mais où l'on ne peut
// ni demander, ni questionner, ni commenter, ni refuser.

function SurTheme({ onClose, onCree }: { onClose: () => void; onCree: (g: Gabarit) => void }) {
  const { data: categories } = useAsync(() => api.arasaacCategories(), []);
  const [taille, setTaille] = React.useState("5x4");
  const [q, setQ] = React.useState("");
  const [theme, setTheme] = React.useState<string[]>([]);
  const [nom, setNom] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const [absents, setAbsents] = React.useState<string[]>([]);

  const [c, l] = taille.split("x").map(Number);
  const squelette = squelettePour(c, l);
  const places = placesDuTheme(squelette);

  const visibles = React.useMemo(() => {
    const f = q.trim().toLowerCase();
    return (categories ?? [])
      .filter((x) => x.nombre >= 6)
      .filter((x) => !f || libelleCategorie(x.nom).toLowerCase().includes(f) || x.nom.toLowerCase().includes(f))
      .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
  }, [categories, q]);

  const creer = async () => {
    setOccupe(true); setAbsents([]);
    try {
      // Le noyau se résout par correspondance exacte : un mot introuvable
      // laisse sa case vide, il ne se remplace pas par une approximation.
      const [trouves, manquants] = await api.arasaacParMots(motsDuNoyau(squelette));
      const noyau = new Map(trouves.map((p) => [p.mot, p]));
      const mots = places > 0
        ? await api.arasaacSelection(theme, EXCLUES_PAR_DEFAUT, false, places, Math.floor(Math.random() * 1e6))
        : [];
      const titre = nom.trim() || theme.map(libelleCategorie).join(" + ") || "Tableau";
      setAbsents(manquants);
      onCree(tableauSurTheme(squelette, titre, noyau, mots));
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };

  return (
    <Modal titre="Tableau sur un thème" onClose={onClose} large
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={occupe} onClick={creer}>
          {occupe ? "Construction…" : "Construire le tableau"}
        </button>
      </>}>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
        Le thème ne remplit que la colonne des noms. Les mots interrogatifs,
        les pronoms, les verbes et les adjectifs viennent du noyau et se posent
        toujours aux mêmes cases : c'est ce qui permet de <b>demander,
        questionner, commenter et refuser</b>, et pas seulement de désigner.
      </p>

      <Field label="Taille de la grille">
        <Select value={taille} onChange={(e) => setTaille(e.target.value)}>
          {SQUELETTES.map((s) => (
            <option key={s.label} value={`${s.colonnes}x${s.lignes}`}>
              {s.label}{s.documente ? " — disposition publiée" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div style={{ fontSize: 13, margin: "8px 0" }}>
        Structure : {squelette.roles.map((pile, i) => (
          <span key={i} style={{
            display: "inline-block", padding: "2px 7px", margin: "0 4px 4px 0",
            borderRadius: 4, background: "var(--panel-2)", fontSize: 12,
          }}>{pile.join(" + ")}</span>
        ))}
        <div style={{ color: "var(--text-2)", marginTop: 4 }}>
          {places} case{places > 1 ? "s" : ""} pour le thème sur {squelette.colonnes * squelette.lignes}.
          {places < 4 && " C'est peu, et c'est voulu : un tableau de langage est surtout du vocabulaire noyau. Prenez une grille plus grande s'il vous faut plus de noms."}
        </div>
      </div>

      <Field label="Nom du tableau">
        <Input placeholder="La cuisine, le bain, la récréation…" value={nom} onChange={(e) => setNom(e.target.value)} />
      </Field>

      <Field label="Thème (remplit les noms)">
        <Input placeholder="Chercher une catégorie…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginTop: 6 }}>
        {visibles.map((x) => (
          <label key={x.nom} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer",
            background: theme.includes(x.nom) ? "var(--panel-2)" : undefined,
          }}>
            <input type="checkbox" checked={theme.includes(x.nom)}
              onChange={() => setTheme((v) => v.includes(x.nom) ? v.filter((y) => y !== x.nom) : [...v, x.nom])} />
            <span style={{ flex: 1 }}>{libelleCategorie(x.nom)}</span>
            <span style={{ color: "var(--text-2)", fontSize: 12 }}>{x.nombre}</span>
          </label>
        ))}
      </div>
      {!!absents.length && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          Sans pictogramme, cases laissées libres : {absents.join(", ")}
        </div>
      )}
      <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, marginBottom: 0 }}>
        Le tableau s'ouvre ensuite dans l'éditeur : rien n'est figé, tout se
        déplace et se complète avant impression. Un TLA se range avec son
        activité — celui du repas à table, celui du bain dans la salle de bain.
      </p>
    </Modal>
  );
}
