import React from "react";
import { api, Creneau, Eleve, newId, texteErreur } from "../api";
import { Field, Modal, Textarea } from "./ui";
import { toast } from "./Toaster";
import { ChoixTypeObservation } from "./TypeObservation";
import { DicteeAtelier } from "./DicteeAtelier";
import { dateObservation, elevesCites } from "../cahierJournal";
import { basculerLien, ecrireLiens, LienObjectif, REUSSITES, Reussite } from "../objectifsPpi";

// ── Du cahier journal au dossier de l'élève ────────────────────────────────
//
// Le bilan d'un créneau, ou le passage sélectionné, devient une observation
// dans le dossier des élèves cochés, datée du créneau. Rien ne part sans que
// l'enseignant ait relu le texte et choisi les élèves.

const prenom = (e: Eleve) => e.nom.split(/\s+/)[0] ?? e.nom;

/** Un objectif du PPI, tel que la page PPI l'enregistre. */
interface ObjectifPpi { id: string; domaine: string; intitule: string }

const objectifsDuPpi = (json: string | null): ObjectifPpi[] => {
  try {
    const d = json ? JSON.parse(json) : null;
    return Array.isArray(d?.objectifs)
      ? d.objectifs
          .filter((o: any) => o?.id && String(o.intitule ?? "").trim())
          .map((o: any) => ({ id: String(o.id), domaine: String(o.domaine ?? ""), intitule: String(o.intitule) }))
      : [];
  } catch {
    return [];
  }
};

/**
 * Les objectifs du PPI travaillés par cette observation.
 *
 * Cocher ici, c'est ce qui remplit le suivi tout seul : au bilan, l'objectif
 * porte ses preuves datées au lieu d'un souvenir. Trois appréciations
 * suffisent — davantage ferait hésiter au moment où l'on est pressé.
 */
function ObjectifsTravailles({ eleve, objectifs, liens, onChange }: {
  eleve: Eleve; objectifs: ObjectifPpi[];
  liens: LienObjectif[]; onChange: (l: LienObjectif[]) => void;
}) {
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>{prenom(eleve)}</div>
      {objectifs.map((o) => {
        const choisi = liens.find((l) => l.id === o.id);
        return (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 160, fontSize: 13, opacity: choisi ? 1 : 0.75 }}>
              {o.domaine && <span style={{ color: "var(--text-2)" }}>{o.domaine} · </span>}
              {o.intitule}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {REUSSITES.map((r) => (
                <button key={r.k} type="button" title={r.label}
                  aria-pressed={choisi?.reussite === r.k}
                  onClick={() => onChange(basculerLien(liens, o.id, r.k as Reussite))}
                  style={{
                    border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, padding: "4px 8px",
                    background: choisi?.reussite === r.k ? r.couleur : "var(--panel-2)",
                    filter: choisi?.reussite === r.k ? "none" : "grayscale(1)",
                    opacity: choisi?.reussite === r.k ? 1 : 0.7,
                  }}>
                  {r.icone}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

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
  // Les objectifs du PPI des élèves cochés, et ce qu'on coche pour chacun.
  const [objectifs, setObjectifs] = React.useState<Record<string, ObjectifPpi[]>>({});
  const [liens, setLiens] = React.useState<Record<string, LienObjectif[]>>({});

  React.useEffect(() => {
    let vivant = true;
    for (const id of choisis) {
      if (objectifs[id]) continue;
      api.documentEleveGet(id, "ppi")
        .then((v) => { if (vivant) setObjectifs((o) => ({ ...o, [id]: objectifsDuPpi(v) })); })
        .catch(() => { if (vivant) setObjectifs((o) => ({ ...o, [id]: [] })); });
    }
    return () => { vivant = false; };
  }, [choisis, objectifs]);

  const proposes = touteLaClasse ? eleves : eleves.filter((e) => presents.includes(e.id));
  const basculer = (id: string) => setChoisis((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const jour = new Date(`${creneau.date.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  // Seuls les élèves cochés qui ont vraiment des objectifs : sinon la fenêtre
  // s'allonge d'une section vide à chaque bilan.
  const avecObjectifs = eleves.filter((e) => choisis.includes(e.id) && (objectifs[e.id]?.length ?? 0) > 0);

  const enregistrer = async () => {
    setOccupe(true);
    try {
      for (const eleveId of choisis) {
        await api.commentaireSave({
          id: newId(), date: dateObservation(creneau), texte: observation.trim(), type, eleveId,
          objectifs: ecrireLiens(liens[eleveId] ?? []),
        });
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
      {avecObjectifs.length > 0 && (
        <Field label="Objectifs du PPI travaillés (facultatif)">
          <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
            ✅ réussi seul · 🤝 avec aide · 🔁 pas encore. Ce qui est coché ici se retrouve sous
            l'objectif, daté, dans le PPI de l'élève.
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {avecObjectifs.map((e) => (
              <ObjectifsTravailles key={e.id} eleve={e} objectifs={objectifs[e.id] ?? []}
                liens={liens[e.id] ?? []}
                onChange={(l) => setLiens((x) => ({ ...x, [e.id]: l }))} />
            ))}
          </div>
        </Field>
      )}
    </Modal>
  );
}
