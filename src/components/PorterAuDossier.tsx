import React from "react";
import { api, Creneau, Eleve, newId, texteErreur } from "../api";
import { Field, Modal, Textarea } from "./ui";
import { toast } from "./Toaster";
import { ChoixTypeObservation } from "./TypeObservation";
import { DicteeAtelier } from "./DicteeAtelier";
import { dateObservation, elevesCites } from "../cahierJournal";

// ── Du cahier journal au dossier de l'élève ────────────────────────────────
//
// Le bilan d'un créneau, ou le passage sélectionné, devient une observation
// dans le dossier des élèves cochés, datée du créneau. Rien ne part sans que
// l'enseignant ait relu le texte et choisi les élèves.

const prenom = (e: Eleve) => e.nom.split(/\s+/)[0] ?? e.nom;

export function PorterAuDossier({ creneau, texte, eleves, presents, onClose }: {
  creneau: Creneau; texte: string; eleves: Eleve[];
  /** Élèves du créneau ; vide en classe ordinaire, où toute la classe est là. */
  presents: string[];
  onClose: () => void;
}) {
  const [observation, setObservation] = React.useState(texte);
  const [choisis, setChoisis] = React.useState<string[]>(() => elevesCites(texte, eleves, presents));
  const [type, setType] = React.useState("scolaire");
  const [touteLaClasse, setTouteLaClasse] = React.useState(presents.length === 0);
  const [repartir, setRepartir] = React.useState(false);
  const [occupe, setOccupe] = React.useState(false);

  const proposes = touteLaClasse ? eleves : eleves.filter((e) => presents.includes(e.id));
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const jour = new Date(`${creneau.date.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const enregistrer = async () => {
    setOccupe(true);
    try {
      for (const eleveId of choisis) {
        await api.commentaireSave({ id: newId(), date: dateObservation(creneau), texte: observation.trim(), type, eleveId });
      }
      const noms = eleves.filter((e) => choisis.includes(e.id)).map(prenom);
      toast(`Observation ajoutée au dossier de ${noms.join(", ")}.`, { icone: "📋" });
      onClose();
    } catch (e) {
      toast("Observation non enregistrée : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    } finally {
      setOccupe(false);
    }
  };

  // Un bilan qui parle de plusieurs élèves : l'assistant propose une
  // observation par élève, à relire avant de les enregistrer.
  if (repartir) {
    return <DicteeAtelier eleves={proposes} texteInitial={observation} titre="Répartir le bilan entre les élèves"
      onClose={onClose} onEnregistre={() => {}} />;
  }

  return (
    <Modal titre="Porter au dossier des élèves" onClose={onClose}
      footer={<>
        {proposes.length > 1 && (
          <button className="btn ghost" onClick={() => setRepartir(true)} disabled={!observation.trim()}
            title="L'assistant propose une observation par élève cité, à relire avant de l'enregistrer">
            ✨ Répartir entre les élèves…
          </button>
        )}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={occupe || !observation.trim() || !choisis.length} onClick={enregistrer}>
          📋 Ajouter au dossier{choisis.length > 1 ? ` de ${choisis.length} élèves` : ""}
        </button>
      </>}>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 10 }}>
        Datée du {jour} · {creneau.heureDebut}–{creneau.heureFin} {creneau.matiere}
      </div>
      <Field label="Observation">
        <Textarea value={observation} rows={Math.min(8, Math.max(3, observation.split("\n").length + 1))}
          onChange={(e) => setObservation(e.target.value)} />
      </Field>
      <Field label="Nature">
        <ChoixTypeObservation valeur={type} onChange={setType} />
      </Field>
      <Field label={`Élèves (${choisis.length} coché${choisis.length > 1 ? "s" : ""})`}>
        {eleves.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>Ajoutez vos élèves dans l'onglet Élèves.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 2, maxHeight: 220, overflowY: "auto" }}>
            {proposes.map((e) => (
              <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={choisis.includes(e.id)} onChange={() => basculer(e.id)} />
                {e.nom}
              </label>
            ))}
          </div>
        )}
        {presents.length > 0 && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--text-2)", marginTop: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={touteLaClasse} onChange={(e) => setTouteLaClasse(e.target.checked)} />
            Montrer aussi les élèves absents de ce créneau
          </label>
        )}
      </Field>
    </Modal>
  );
}
