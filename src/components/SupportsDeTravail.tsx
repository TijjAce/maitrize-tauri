import React from "react";
import { api, MATIERES, NIVEAUX_SCOLAIRES, type Jeu, type Sequence } from "../api";
import { EVT_MES_PICTOS, changerMonPicto, lireMesPictos, type MonPicto } from "../mesPictos";
import { TOUS_LES_NIVEAUX, supportsDeLaSequence } from "../supportsDeTravail";
import { etiquetteDeMatiere } from "../pictosMatieres";
import { usePictoImage } from "./ChoixPicto";
import { useLudotheque } from "./ReglesDesJeux";
import { toast } from "./Toaster";

// ── Réglages › Personnalisation › Mes photos, supports de travail ─────────
//
// Les photos prises avec le dictaphone, chacune avec ce qui en fait un
// support de travail (voir supportsDeTravail) : son nom, sa matière, son
// niveau, le jeu dont elle prend les règles, la séquence où elle sert. Tout
// s'enregistre aussitôt, et passe à l'autre ordinateur avec la photo.

type Champs = Partial<Pick<MonPicto, "mot" | "matiere" | "niveau" | "jeuId" | "sequenceId">>;

export function SupportsDeTravail() {
  const [photos, setPhotos] = React.useState<MonPicto[] | null>(null);
  const [jeux, setJeux] = React.useState<Jeu[]>([]);
  const [sequences, setSequences] = React.useState<Sequence[]>([]);
  React.useEffect(() => {
    const lire = () => lireMesPictos().then((l) => setPhotos(l.filter((p) => p.origine === "photo"))).catch(() => setPhotos([]));
    void lire();
    api.jeuxList().then((l) => setJeux([...l].sort((a, b) => a.titre.localeCompare(b.titre, "fr")))).catch(() => {});
    api.sequencesList().then((l) => setSequences([...l].sort((a, b) => a.titre.localeCompare(b.titre, "fr")))).catch(() => {});
    // Une photo arrivée du téléphone, ou réglée sur l'autre ordinateur.
    window.addEventListener(EVT_MES_PICTOS, lire);
    return () => window.removeEventListener(EVT_MES_PICTOS, lire);
  }, []);
  if (!photos) return null;

  const changer = async (p: MonPicto, champs: Champs) => {
    setPhotos((l) => l && l.map((x) => (x.id === p.id ? { ...x, ...champs } : x)));
    try { await changerMonPicto(p, champs); } catch (e) { toast(`Photo non enregistrée : ${e}`, { icone: "⚠️" }); }
  };

  return (
    <>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13, lineHeight: 1.55 }}>
        Les photos prises avec le dictaphone — l'objet, le jeu de la classe — sont des supports de travail, pour l'élève qui
        n'entre pas dans l'abstraction d'un pictogramme. Donnez à chacune son nom, sa matière et son niveau : « En retard » peut
        alors la donner à tout élève de ce niveau. Un jeu de la ludothèque lui prête ses règles ; une séquence la montre avec son matériel.
      </p>
      {photos.length === 0 && (
        <p className="meta" style={{ fontSize: 13 }}>
          Aucune photo encore : dans le dictaphone, onglet Notes, « Une photo pour Mes pictos ».
        </p>
      )}
      {photos.map((p) => (
        <LigneDeSupport key={p.id} photo={p} jeux={jeux} sequences={sequences} onChanger={(champs) => { void changer(p, champs); }} />
      ))}
    </>
  );
}

/** Une photo : son image, son nom, et ce qui en fait un support de travail. */
function LigneDeSupport({ photo, jeux, sequences, onChanger }: {
  photo: MonPicto; jeux: Jeu[]; sequences: Sequence[]; onChanger: (champs: Champs) => void;
}) {
  const src = usePictoImage(photo.id, true);
  const complet = !!photo.matiere && !!photo.niveau;
  return (
    <div className="sdt-ligne">
      <div className="sdt-image">{src ? <img src={src} alt="" /> : null}</div>
      <div className="sdt-champs">
        <input key={`${photo.id}-${photo.mot}`} className="input sdt-nom" defaultValue={photo.mot} aria-label="Le nom de la photo"
          onBlur={(e) => { const mot = e.target.value.trim(); if (mot && mot !== photo.mot) onChanger({ mot }); else e.target.value = photo.mot; }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        <select className="select" value={photo.matiere ?? ""} aria-label={`La matière de « ${photo.mot} »`} onChange={(e) => onChanger({ matiere: e.target.value })}>
          <option value="">Matière…</option>
          {MATIERES.map((m) => <option key={m} value={m}>{etiquetteDeMatiere(m)}</option>)}
        </select>
        <select className="select" value={photo.niveau ?? ""} aria-label={`Le niveau de « ${photo.mot} »`} onChange={(e) => onChanger({ niveau: e.target.value })}>
          <option value="">Niveau…</option>
          <option value={TOUS_LES_NIVEAUX}>Tous les niveaux</option>
          {NIVEAUX_SCOLAIRES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select className="select" value={photo.jeuId ?? ""} aria-label={`Le jeu dont « ${photo.mot} » prend les règles`} onChange={(e) => onChanger({ jeuId: e.target.value })}>
          <option value="">Pas de règles de jeu</option>
          {jeux.map((j) => <option key={j.id} value={j.id}>Les règles de « {j.titre} »</option>)}
        </select>
        <select className="select" value={photo.sequenceId ?? ""} aria-label={`La séquence de « ${photo.mot} »`} onChange={(e) => onChanger({ sequenceId: e.target.value })}>
          <option value="">Aucune séquence</option>
          {sequences.map((q) => <option key={q.id} value={q.id}>{q.titre}</option>)}
        </select>
        {!complet && <span className="meta sdt-a-completer">Une matière et un niveau, et c'est un support.</span>}
      </div>
    </div>
  );
}

/**
 * Sous le matériel d'une séquence : les photos qu'on lui a rattachées dans
 * les réglages — l'objet, le jeu de la classe —, chacune avec ses règles
 * quand elle prend celles d'un jeu. Rien sans photo rattachée.
 */
export function SupportsDeLaSequence({ sequenceId }: { sequenceId: string }) {
  const { jeux } = useLudotheque();
  const [photos, setPhotos] = React.useState<MonPicto[]>([]);
  React.useEffect(() => {
    const lire = () => lireMesPictos().then((l) => setPhotos(supportsDeLaSequence(l, sequenceId))).catch(() => setPhotos([]));
    void lire();
    window.addEventListener(EVT_MES_PICTOS, lire);
    return () => window.removeEventListener(EVT_MES_PICTOS, lire);
  }, [sequenceId]);
  if (!photos.length) return null;
  return (
    <div className="card sdt-sequence">
      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>📷 Les supports de travail</h3>
      {photos.map((p) => <SupportDeLaSequence key={p.id} photo={p} jeu={jeux.find((j) => j.id === p.jeuId)} />)}
    </div>
  );
}

function SupportDeLaSequence({ photo, jeu }: { photo: MonPicto; jeu: Jeu | undefined }) {
  const src = usePictoImage(photo.id, true);
  return (
    <div className="sdt-ligne">
      <div className="sdt-image">{src ? <img src={src} alt="" /> : null}</div>
      <div>
        <b>{photo.mot}</b>
        <span className="meta"> · {[photo.matiere ? etiquetteDeMatiere(photo.matiere) : "", photo.niveau === TOUS_LES_NIVEAUX ? "tous niveaux" : photo.niveau ?? ""].filter(Boolean).join(" · ")}</span>
        {jeu && jeu.regles.trim() && (
          <details className="sdt-regles"><summary>Les règles de « {jeu.titre} »</summary><div style={{ whiteSpace: "pre-wrap" }}>{jeu.regles.trim()}</div></details>
        )}
      </div>
    </div>
  );
}
