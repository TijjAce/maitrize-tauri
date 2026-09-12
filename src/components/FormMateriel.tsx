import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, MaterielItem, Referentiel, CYCLES } from "../api";
import { Modal, Field, Input, Textarea, Select, useAsync } from "./ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "./CompetenceTree";
import { FileListEditor } from "./SeanceParts";
import { lireVideos, lireLien, vignetteYoutube, integrationYoutube, nomVideo, Video } from "../videos";

// Fiche d'un matériel, ouverte depuis le plan de travail.
//
// C'était une page à part entière ; depuis que les séquences et le matériel se
// rangent ensemble, il n'y a plus d'écran où l'envoyer : on l'édite sur place.

function liste(json: string): string[] { try { return JSON.parse(json || "[]"); } catch { return []; } }

export function FormMateriel({ m, onClose, onSaved }: { m: MaterielItem; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<MaterielItem>(m);
  // Les dossiers déjà employés sont proposés à la saisie : sans cela, on écrit
  // « Lecture » puis « lecture » et le rangement se dédouble.
  const { data: tous } = useAsync(() => api.materielList(), []);
  const dossiersConnus = Array.from(new Set((tous ?? []).map((x) => x.dossier).filter(Boolean))).sort();
  const up = (p: Partial<MaterielItem>) => setV((cur) => ({ ...cur, ...p }));

  const compSel: CompetenceSelectionnee | null = v.competenceId
    ? { id: v.competenceId, referentielNom: "", domaineId: "", domaineTitre: v.domaineTitre,
        sousDomaineTitre: v.sousDomaineTitre, competenceTitre: v.competenceTitre, competenceRefId: v.competenceId }
    : null;
  const choisir = (c: CompetenceSelectionnee, ref: Referentiel) => up({
    competenceId: c.competenceRefId ?? "", competenceTitre: c.competenceTitre,
    domaineTitre: c.domaineTitre, sousDomaineTitre: c.sousDomaineTitre, cycle: ref.cycle || v.cycle,
  });

  return (
    <Modal large titre={m.titre ? "Modifier le matériel" : "Nouveau matériel"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={() => api.materielSave(v).then(onSaved)}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <Field label="Cycle"><Select value={v.cycle} onChange={(e) => up({ cycle: e.target.value })}><option value="">—</option>{CYCLES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      <Field label="Description"><Textarea value={v.descriptionMateriel} onChange={(e) => up({ descriptionMateriel: e.target.value })} /></Field>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center" }}>Compétence liée
          {compSel && <button className="btn ghost sm" style={{ marginLeft: "auto", color: "var(--danger)" }}
            onClick={() => up({ competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "" })}>Effacer</button>}
        </label>
        {compSel && <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "8px 12px", borderRadius: 9, marginBottom: 8, fontSize: 13 }}>🎯 {labelCourt(compSel)}</div>}
        <CompetenceTree mode="single" selection={compSel ? [compSel] : []} onPick={choisir} />
      </div>
      <div className="row">
        <Field label="Images"><FileListEditor type="image" fichiers={liste(v.imagesJson)} onChange={(f) => up({ imagesJson: JSON.stringify(f) })} /></Field>
        <Field label="PDF"><FileListEditor type="pdf" fichiers={liste(v.pdfsJson)} onChange={(f) => up({ pdfsJson: JSON.stringify(f) })} /></Field>
      </div>
      <Field label="Dossier">
        <Input list="dossiers-materiel" placeholder="Lecture, Manipulation, Rituels…"
          value={v.dossier} onChange={(e) => up({ dossier: e.target.value })} />
        <datalist id="dossiers-materiel">
          {dossiersConnus.map((d) => <option key={d} value={d} />)}
        </datalist>
      </Field>
      <Field label="Vidéos">
        <EditeurVideos videos={lireVideos(v.videosJson)}
          onChange={(vids) => up({ videosJson: JSON.stringify(vids) })} />
      </Field>
      <Field label="Documents du coffre-fort">
        <LienCoffre ids={liste(v.coffreJson)}
          onChange={(ids) => up({ coffreJson: JSON.stringify(ids) })} />
      </Field>
    </Modal>
  );
}


// ── Vidéos ─────────────────────────────────────────────────────────────────
//
// Les vignettes viennent de YouTube et demandent donc le réseau. Hors ligne,
// la case affiche le nom plutôt qu'un cadre cassé : le lien reste utilisable,
// c'est lui qui compte.

export function Vignettes({ videos }: { videos: Video[] }) {
  const [lecture, setLecture] = React.useState<Video | null>(null);
  if (!videos.length) return null;
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {videos.map((v, i) => (
          <button key={i} onClick={() => setLecture(v)} title={nomVideo(v)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 0, cursor: "pointer",
              background: "var(--panel-2)", width: 104, overflow: "hidden", textAlign: "left" }}>
            {v.youtubeId ? (
              <img src={vignetteYoutube(v.youtubeId)} alt="" loading="lazy"
                style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 20 }}>🎬</div>
            )}
            <div style={{ fontSize: 10.5, padding: "3px 5px", color: "var(--text-2)",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {nomVideo(v)}
            </div>
          </button>
        ))}
      </div>
      {lecture && <LecteurVideo video={lecture} onClose={() => setLecture(null)} />}
    </>
  );
}

/** Lit une vidéo dans l'application, avec une sortie vers le navigateur. */
export function LecteurVideo({ video, onClose }: { video: Video; onClose: () => void }) {
  return (
    <Modal titre={nomVideo(video)} onClose={onClose} large
      footer={<>
        <button className="btn" onClick={() => openUrl(video.url).catch(() => window.open(video.url, "_blank"))}>
          ↗ Ouvrir dans le navigateur
        </button>
        <button className="btn primary" onClick={onClose}>Fermer</button>
      </>}>
      {video.youtubeId ? (
        <iframe src={integrationYoutube(video.youtubeId)} title="Vidéo" allowFullScreen
          style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 8 }} />
      ) : (
        <p style={{ fontSize: 13, wordBreak: "break-all" }}>{video.url}</p>
      )}
    </Modal>
  );
}

/**
 * Ajout de liens vidéo : collés, ou déposés depuis le navigateur.
 *
 * Un lien qui n'en est pas un est refusé plutôt qu'ajouté : une ligne vide
 * dans la liste devrait ensuite être retrouvée et supprimée.
 */
function EditeurVideos({ videos, onChange }: { videos: Video[]; onChange: (v: Video[]) => void }) {
  const [saisie, setSaisie] = React.useState("");
  const [erreur, setErreur] = React.useState("");

  const ajouter = (texte: string) => {
    const v = lireLien(texte);
    if (!v) { setErreur("Ce n'est pas une adresse web (elle doit commencer par http)."); return; }
    if (videos.some((x) => x.url === v.url)) { setErreur("Cette vidéo est déjà dans la liste."); return; }
    onChange([...videos, v]); setSaisie(""); setErreur("");
  };

  return (
    <div
      onDrop={(e) => { e.preventDefault(); ajouter(e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain")); }}
      onDragOver={(e) => e.preventDefault()}
      style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Input placeholder="Coller un lien YouTube, ou le déposer ici…" value={saisie}
          onChange={(e) => { setSaisie(e.target.value); setErreur(""); }}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), ajouter(saisie))} />
        <button className="btn" style={{ flex: "none" }} onClick={() => ajouter(saisie)}>Ajouter</button>
      </div>
      {erreur && <div style={{ fontSize: 12, color: "var(--danger, #b03030)", marginTop: 5 }}>{erreur}</div>}
      {videos.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {videos.map((v, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0",
              borderTop: "1px solid var(--border)", fontSize: 13 }}>
              <span style={{ fontSize: 15 }}>{v.youtubeId ? "▶️" : "🎬"}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {nomVideo(v)}
              </span>
              <button className="btn ghost sm" aria-label="Retirer"
                onClick={() => onChange(videos.filter((_, j) => j !== i))}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Rattache des documents du coffre-fort à un matériel. */
function LienCoffre({ ids, onChange }: { ids: string[]; onChange: (v: string[]) => void }) {
  const { data: docs } = useAsync(() => api.coffreList(), []);
  const tous = docs ?? [];
  const basculer = (id: string) =>
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  if (!tous.length) {
    return (
      <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
        Le coffre-fort est vide. Déposez-y des documents depuis Ressources → Coffre.
      </p>
    );
  }
  return (
    <div style={{ maxHeight: 160, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
      {tous.map((d) => (
        <label key={d.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 8px",
          fontSize: 13, cursor: "pointer", background: ids.includes(d.id) ? "var(--panel-2)" : undefined }}>
          <input type="checkbox" checked={ids.includes(d.id)} onChange={() => basculer(d.id)} />
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔐 {d.nom}</span>
        </label>
      ))}
    </div>
  );
}
