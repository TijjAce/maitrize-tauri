import React from "react";
import { api, Sequence, Referentiel, couleurHex, couleurPourMatiere, anneeScolaireActuelle } from "../api";
import { Modal, Field, Input, Select, Textarea, useAsync } from "./ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "./CompetenceTree";
import { FichierImg } from "./Deroulement";
import { PhotoTelephone } from "./PhotoTelephone";
import { DEMARCHES, demarcheDe, demarcheSuggeree, resumeDuCadre, seancesDuCadre } from "../demarches";
import { sequencesParCompetence, titresVisant } from "../sequencesVisees";

// Fiche d'une séquence : titre, période, compétence visée, objectifs, vignette,
// vidéo. Elle vivait dans l'ancien onglet Séquences et avait disparu avec lui :
// une séquence ne pouvait plus être renommée.

export function FormSequence({ sequence, nouvelle = false, onClose, onSaved }: {
  sequence: Sequence; nouvelle?: boolean; onClose: () => void; onSaved: (s: Sequence) => void;
}) {
  const [s, setS] = React.useState<Sequence>(sequence);
  const up = (p: Partial<Sequence>) => setS((cur) => ({ ...cur, ...p }));
  const [enCours, setEnCours] = React.useState(false);
  // Ce que les autres séquences visent déjà : l'arbre le montre, pour ne pas
  // refaire une séquence sur une compétence couverte sans le savoir.
  const { data: toutes } = useAsync(() => api.sequencesList(), []);
  const visees = React.useMemo(() => sequencesParCompetence(toutes ?? [], sequence.id), [toutes, sequence.id]);
  // Le déroulement : une démarche d'un guide, proposée au moment où l'on
  // choisit la compétence — c'est là qu'on sait ce qu'on va enseigner. On
  // décide alors de la suivre ou non ; tant qu'on n'a pas décidé, rien n'est
  // posé. Une séquence qui existe déjà a ses séances ; on ne lui en propose pas.
  const [cadre, setCadre] = React.useState("");
  const [suivi, setSuivi] = React.useState<"" | "oui" | "non">("");
  const demarche = demarcheDe(cadre);
  const poseLesSeances = nouvelle && suivi === "oui" && !!demarche;
  const save = async () => {
    setEnCours(true);
    try {
      const propre = {
        ...s, titre: s.titre.trim(), annee: s.annee || anneeScolaireActuelle(),
        nbSeancesPrevu: poseLesSeances ? demarche.seances.length : s.nbSeancesPrevu,
      };
      await api.sequenceSave(propre);
      if (poseLesSeances) {
        for (const seance of seancesDuCadre(demarche, propre.id)) await api.seanceSave(seance);
      }
      onSaved(propre);
    } finally { setEnCours(false); }
  };

  let comp: CompetenceSelectionnee | null = null;
  try { comp = s.competenceVisee ? JSON.parse(s.competenceVisee) : null; } catch { /* ignore */ }

  const choisir = (c: CompetenceSelectionnee, ref: Referentiel) => {
    up({ competenceVisee: JSON.stringify(c), matiere: c.domaineTitre, cycle: ref.cycle || s.cycle, couleur: couleurPourMatiere(c.domaineTitre) });
    // La compétence appelle un déroulement : on le propose, on ne l'impose pas.
    if (nouvelle) { setCadre(demarcheSuggeree(c.domaineTitre, ref.nom).id); setSuivi(""); }
  };
  const effacer = () => { up({ competenceVisee: "", matiere: "", cycle: "", couleur: "blue" }); setCadre(""); setSuivi(""); };

  return (
    <Modal large titre={sequence.titre && sequence.titre !== "Nouvelle séquence" ? "Modifier la séquence" : "Nouvelle séquence"} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save} disabled={!s.titre.trim() || enCours}>Enregistrer</button>
      </>}>
      <Field label="Titre">
        <Input value={s.titre} autoFocus onChange={(e) => up({ titre: e.target.value })}
          onFocus={(e) => { if (s.titre === "Nouvelle séquence") e.currentTarget.select(); }} />
      </Field>
      <div className="row">
        <Field label="Période">
          <div className="seg">
            {[1, 2, 3, 4, 5].map((p) => (
              <button key={p} type="button" className={s.periode === p ? "active" : ""} onClick={() => up({ periode: p })}>P{p}</button>
            ))}
          </div>
        </Field>
        <Field label="Année"><Input value={s.annee} placeholder="2026-2027" onChange={(e) => up({ annee: e.target.value })} /></Field>
        <Field label="Séances prévues">
          <Input type="number" min={0} max={99} value={s.nbSeancesPrevu || ""} placeholder="—"
            title="Combien de séances la séquence prévoit : le cahier journal écrira « séance 3/6 »."
            onChange={(e) => up({ nbSeancesPrevu: Math.max(0, Math.min(99, Math.round(Number(e.target.value) || 0))) })} />
        </Field>
      </div>

      <div className="field">
        <label style={{ display: "flex", alignItems: "center" }}>
          Compétence visée
          {comp && <button className="btn ghost sm" style={{ marginLeft: "auto", color: "var(--danger)" }} onClick={effacer}>Effacer</button>}
        </label>
        {comp && (
          <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "8px 12px", borderRadius: 9, marginBottom: 8, fontSize: 13 }}>
            🎯 {labelCourt(comp)} <span style={{ color: "var(--text-2)" }}>· {comp.domaineTitre}</span>
          </div>
        )}
        {comp && nouvelle && demarche && (
          <div className={`deroulement-propose${suivi === "non" ? " ecarte" : ""}`}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <b>🧭 Un déroulement peut être suivi</b>
              <span className="meta">{resumeDuCadre(demarche)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "8px 0 6px" }}>
              <Select value={cadre} onChange={(e) => { setCadre(e.target.value); setSuivi(""); }} style={{ maxWidth: 420 }}>
                {DEMARCHES.map((d) => <option key={d.id} value={d.id}>{d.nom} — {d.source}</option>)}
              </Select>
            </div>
            <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5 }}>{demarche.resume}</div>
            <ol className="deroulement-seances">
              {demarche.seances.map((sc, i) => (
                <li key={i}><b>{sc.titre}</b> <span className="meta">· {sc.duree} min · {sc.phases.map((p) => p.phase.replace(/^Temps \d – /, "")).join(" › ")}</span></li>
              ))}
            </ol>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" className={`btn sm${suivi === "oui" ? " primary" : ""}`} onClick={() => setSuivi("oui")}>
                ✓ Suivre ce déroulement
              </button>
              <button type="button" className={`btn sm${suivi === "non" ? " active" : " ghost"}`} onClick={() => setSuivi("non")}>
                Ne pas le suivre
              </button>
              <span className="meta" style={{ alignSelf: "center", fontSize: 12.5 }}>
                {suivi === "oui" ? "Les séances seront créées avec leurs phases, à compléter."
                  : suivi === "non" ? "La séquence restera vide : vous construirez les séances vous-même."
                  : "À décider avant d'enregistrer — sans réponse, rien n'est posé."}
              </span>
            </div>
          </div>
        )}
        <CompetenceTree mode="single" selection={comp ? [comp] : []} onPick={choisir}
          dejaVisee={(c) => titresVisant(visees, c)} />
        {(s.matiere || s.cycle) && (
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {s.matiere && <span className="chip"><span className="dot" style={{ background: couleurHex[s.couleur] }} />{s.matiere}</span>}
            {s.cycle && <span className="chip">{s.cycle}</span>}
          </div>
        )}
      </div>

      <Field label="Objectifs / notes"><Textarea value={s.objectifs} onChange={(e) => up({ objectifs: e.target.value })} /></Field>

      <div className="field">
        <label>Vignette (image de couverture)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {s.imageNom
            ? <FichierImg nom={s.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🖼</div>}
          <ChoixFichier accept="image/*" libelle="📷 Choisir une image" onUploaded={(nom) => up({ imageNom: nom })} />
          <PhotoTelephone onPhoto={(nom) => up({ imageNom: nom })} />
          {s.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>

      <div className="field">
        <label>Vidéo explicative (lien ou fichier)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="https://… (YouTube, lien)" value={s.video.startsWith("http") ? s.video : ""}
            onChange={(e) => up({ video: e.target.value })} />
          <ChoixFichier accept="video/*" libelle="🎬 Importer" onUploaded={(nom) => up({ video: nom })} />
        </div>
        {s.video && !s.video.startsWith("http") && (
          <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-2)" }}>
            🎬 Vidéo importée <button className="btn ghost sm" onClick={() => up({ video: "" })}>retirer</button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ChoixFichier({ accept, libelle, onUploaded }: { accept: string; libelle: string; onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const envoyer = async (file: File) => {
    setBusy(true);
    try {
      const b64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file); });
      onUploaded(await api.fichierSave(file.name, b64));
    } finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyer(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : libelle}</button>
    </>
  );
}
