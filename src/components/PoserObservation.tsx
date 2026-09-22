import React from "react";
import { api, newId, nowIso, texteErreur, type Eleve } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import {
  AXES, axesProches, cheminDeLAxe, chercherAxes, nouvelleObservation, type Axe,
} from "../observationEleve";

// ── Décider d'observer, avant d'observer ──────────────────────────────────
//
// Un temps d'observation se décide à l'avance, sur un axe précis : sans cela
// on regarde tout, on note ce qui frappe, et l'on tire des conclusions de ce
// qui s'est trouvé visible. L'axe vient de la grille Cap école inclusive, et
// l'application propose d'abord ceux qui collent à la compétence du jour —
// c'est tout l'intérêt de partir du cahier journal.

export function PoserObservation({ eleves, contexte, competence, creneauId, date, onClose, onPose }: {
  /** Les élèves du créneau : on observe quelqu'un, pas la classe. */
  eleves: Eleve[];
  /** « Maths — atelier tri », tel qu'il s'écrira sur la fiche. */
  contexte: string;
  /** Ce qu'on travaille : c'est elle qui propose les axes. */
  competence: string;
  creneauId: string;
  date: string;
  onClose: () => void;
  onPose: () => void;
}) {
  const [choisis, setChoisis] = React.useState<string[]>(eleves.length === 1 ? [eleves[0].id] : []);
  const [axe, setAxe] = React.useState<Axe | null>(null);
  const [recherche, setRecherche] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);

  // Les axes du jour : ceux que la compétence désigne, puis la recherche.
  const proposes = React.useMemo(
    () => axesProches(`${competence} ${contexte}`), [competence, contexte]);
  const trouves = React.useMemo(
    () => (recherche.trim() ? chercherAxes(recherche, 30) : []), [recherche]);
  const liste = recherche.trim() ? trouves : (proposes.length ? proposes : AXES.slice(0, 12));

  const basculer = (id: string) =>
    setChoisis((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const poser = async () => {
    if (!choisis.length || !axe) return;
    setOccupe(true);
    try {
      const quand = nowIso();
      for (const eleveId of choisis) {
        await api.observationSave(nouvelleObservation({
          id: newId(), eleveId, date, creneauId, contexte, competence, axe, quand,
        }));
      }
      toast(`Temps d'observation posé (${choisis.length} élève${choisis.length > 1 ? "s" : ""}). Ce que vous écrirez dans le bilan viendra le nourrir.`,
        { icone: "👁", duree: 7000 });
      onPose();
      onClose();
    } catch (e) {
      toast("Observation non posée : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally { setOccupe(false); }
  };

  return (
    <Modal titre="👁 Observer un élève" onClose={onClose} large
      footer={<>
        <span className="meta" style={{ fontSize: 12 }}>
          {axe ? "" : "Choisissez un axe d'observation."}
        </span>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!choisis.length || !axe || occupe} onClick={() => { void poser(); }}>
          {occupe ? "…" : "Poser le temps d'observation"}
        </button>
      </>}>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>
        {contexte}{competence ? ` · ${competence}` : ""} — le {date.split("-").reverse().join("/")}.
        Ce que vous écrirez ensuite dans <b>« Fait · bilan »</b> viendra remplir la fiche, dans le
        dossier de l'élève.
      </p>

      <Field label="Qui observe-t-on ?">
        {eleves.length === 0 ? (
          <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>
            Aucun élève sur ce créneau : cochez-les d'abord dans le planning.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {eleves.map((e) => (
              <button key={e.id} type="button"
                className={`btn sm${choisis.includes(e.id) ? " primary" : " ghost"}`}
                onClick={() => basculer(e.id)}>{e.nom.split(" ")[0]}</button>
            ))}
          </div>
        )}
      </Field>

      <Field label="Axe d'observation">
        <Input value={recherche} onChange={(e) => setRecherche(e.target.value)}
          placeholder={proposes.length ? "Chercher un autre observable…" : "Chercher un observable…"} />
        <div className="meta" style={{ fontSize: 11.5, margin: "6px 0" }}>
          {recherche.trim() ? `${trouves.length} observable(s)`
            : proposes.length ? "D'après ce que vous travaillez sur ce créneau"
            : "Grille Cap école inclusive (Réseau Canopé)"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
          {liste.map((a) => {
            const pris = axe?.observable === a.observable && axe?.sousDomaine === a.sousDomaine;
            return (
              <button key={`${a.domaine}|${a.sousDomaine}|${a.observable}`} type="button"
                className="btn ghost" onClick={() => setAxe(a)}
                style={{
                  width: "100%", justifyContent: "flex-start", textAlign: "left", height: "auto",
                  padding: "7px 10px", background: pris ? "var(--accent-soft)" : undefined,
                  borderColor: pris ? "var(--accent)" : undefined,
                }}>
                <span style={{ display: "block", minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13 }}>{a.observable}</span>
                  <span className="meta" style={{ fontSize: 11 }}>{cheminDeLAxe(a)}</span>
                </span>
              </button>
            );
          })}
          {!liste.length && (
            <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>Aucun observable pour cette recherche.</p>
          )}
        </div>
      </Field>
    </Modal>
  );
}
