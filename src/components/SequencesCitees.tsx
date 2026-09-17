import React from "react";
import type { Seance, Sequence } from "../api";
import { Input, Modal } from "./ui";
import { texteDeSeance, type CitationSequence } from "../sequencesCitees";

// ── Séquences citées dans le prévu ─────────────────────────────────────────
//
// Sous le prévu, chaque séquence citée : sa séance (objectifs, déroulement)
// ou, sans séance précisée, ses objectifs et la liste de ses séances.

/** Les séquences repliées, gardées pendant la séance de travail. */
const repliees = new Set<string>();

function SequenceCitee({ citation, seances, onOuvrir, onVoirSeance }: {
  citation: CitationSequence; seances: Seance[];
  onOuvrir: (s: Sequence) => void; onVoirSeance: (s: Seance) => void;
}) {
  const { sequence: s, seance } = citation;
  const cle = `${s.id}|${seance?.id ?? ""}`;
  const [replie, setReplie] = React.useState(() => repliees.has(cle));
  const [entier, setEntier] = React.useState(false);
  const basculer = () => {
    const suite = !replie;
    setReplie(suite);
    if (suite) repliees.add(cle); else repliees.delete(cle);
  };
  const objectifs = (seance?.objectifs || s.objectifs || "").trim();
  const deroulement = seance ? texteDeSeance(seance.deroulement) : "";
  const long = deroulement.split("\n").length > 4 || deroulement.length > 320;
  const siennes = seances.filter((x) => x.sequenceId === s.id).sort((a, b) => a.numero - b.numero);
  return (
    <div className="sequence-app">
      <div className="regle-app-tete">
        <button className="regle-app-titre" onClick={basculer} aria-expanded={!replie} title={replie ? "Afficher" : "Replier"}>
          <span aria-hidden="true" className="regle-app-fleche">{replie ? "▸" : "▾"}</span>
          📚 {s.titre}{seance ? ` — séance ${seance.numero}${seance.titre ? ` : ${seance.titre}` : ""}` : ""}
        </button>
        <span className="regle-app-infos">{[s.matiere, s.periode ? `période ${s.periode}` : ""].filter(Boolean).join(" · ")}</span>
        {seance && <button className="btn ghost sm" onClick={() => onVoirSeance(seance)} title="Voir toute la séance">👁</button>}
        <button className="btn ghost sm" onClick={() => onOuvrir(s)} title="Ouvrir la séquence">↗</button>
      </div>
      {!replie && <>
        {objectifs && <div className="regle-app-texte"><b>Objectifs :</b> {objectifs}</div>}
        {deroulement && <>
          <div className={`regle-app-texte${long && !entier ? " coupee" : ""}`}><b>Déroulement :</b>{"\n"}{deroulement}</div>
          {long && <button className="lien regle-app-suite" onClick={() => setEntier(!entier)}>{entier ? "Réduire" : "Lire tout le déroulement"}</button>}
        </>}
        {!seance && siennes.length > 0 && (
          <div className="regle-app-texte">
            {siennes.map((x) => (
              <div key={x.id}>
                <button className="lien" onClick={() => onVoirSeance(x)}>Séance {x.numero}{x.titre ? ` : ${x.titre}` : ""}</button>
              </div>
            ))}
          </div>
        )}
        {seance && !objectifs && !deroulement && <div className="regle-app-vide">Cette séance n'a pas encore de déroulement.</div>}
      </>}
    </div>
  );
}

export function SequencesCitees({ citations, seances, onOuvrir, onVoirSeance }: {
  citations: CitationSequence[]; seances: Seance[];
  onOuvrir: (s: Sequence) => void; onVoirSeance: (s: Seance) => void;
}) {
  if (!citations.length) return null;
  return (
    <div className="regles-app" aria-label="Séquences citées">
      {citations.map((c) => (
        <SequenceCitee key={`${c.sequence.id}|${c.seance?.id ?? ""}`} citation={c} seances={seances} onOuvrir={onOuvrir} onVoirSeance={onVoirSeance} />
      ))}
    </div>
  );
}

/** Choisir une séquence, ou l'une de ses séances, à poser dans le prévu. */
export function ChoixSequence({ sequences, seances, matiere, onClose, onChoisir }: {
  sequences: Sequence[]; seances: Seance[];
  /** L'intitulé du créneau : les séquences de cette matière viennent en tête. */
  matiere?: string;
  onClose: () => void;
  onChoisir: (s: Sequence, seance: Seance | null) => void;
}) {
  const [q, setQ] = React.useState("");
  const [ouverte, setOuverte] = React.useState<string | null>(null);
  const cle = (t: string) => (t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cherche = cle(q.trim());
  const proche = cle(matiere ?? "");
  const liste = sequences
    .filter((s) => !cherche || cle(`${s.titre} ${s.matiere}`).includes(cherche)
      || seances.some((x) => x.sequenceId === s.id && cle(x.titre).includes(cherche)))
    .sort((a, b) => {
      const pa = proche && cle(a.matiere) && proche.includes(cle(a.matiere)) ? 0 : 1;
      const pb = proche && cle(b.matiere) && proche.includes(cle(b.matiere)) ? 0 : 1;
      return pa - pb || (b.dateCreation ?? "").localeCompare(a.dateCreation ?? "");
    });
  return (
    <Modal titre="Poser une séquence dans le prévu" onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Annuler</button>}>
      <Input autoFocus placeholder="Chercher une séquence ou une séance…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="choix-sequence-liste">
        {!liste.length && <div style={{ fontSize: 13, color: "var(--text-2)", padding: 8 }}>Aucune séquence.</div>}
        {liste.map((s) => {
          const siennes = seances.filter((x) => x.sequenceId === s.id).sort((a, b) => a.numero - b.numero);
          const deplie = ouverte === s.id || (Boolean(cherche) && siennes.some((x) => cle(x.titre).includes(cherche)));
          return (
            <div key={s.id} className="choix-sequence">
              <div className="choix-sequence-tete">
                <button className="btn ghost sm" onClick={() => setOuverte(deplie ? null : s.id)} aria-expanded={deplie}
                  disabled={!siennes.length} title={siennes.length ? "Voir les séances" : "Aucune séance"}>{deplie ? "▾" : "▸"}</button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{s.titre || "Sans titre"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {[s.matiere, s.periode ? `période ${s.periode}` : "", `${siennes.length} séance${siennes.length > 1 ? "s" : ""}`].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <button className="btn sm" onClick={() => onChoisir(s, null)}>Choisir la séquence</button>
              </div>
              {deplie && siennes.map((x) => (
                <div key={x.id} className="choix-sequence-seance">
                  <span style={{ flex: 1, minWidth: 0 }}>Séance {x.numero}{x.titre ? ` : ${x.titre}` : ""}</span>
                  <button className="btn sm primary" onClick={() => onChoisir(s, x)}>Choisir</button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
