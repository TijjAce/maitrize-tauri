import React from "react";
import { api, PictoArasaac } from "../api";
import { Field, Input, Modal } from "./ui";
import type { PictoPose } from "../supportsVisuels";

// ── Choisir un pictogramme ARASAAC ─────────────────────────────────────────
//
// La recherche propose, l'enseignant choisit en voyant l'image. Le mot écrit
// sous le pictogramme reste modifiable : « tablette » plutôt que
// « tablette tactile ».

/** L'image d'un pictogramme, chargée à la demande et gardée pour la séance. */
const cache = new Map<number, Promise<string>>();
export function chargerPicto(id: number): Promise<string> {
  let p = cache.get(id);
  if (!p) {
    p = api.arasaacImage(id).then((b) => `data:image/png;base64,${b}`);
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function usePictoImage(id: number | null | undefined): string {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    if (id == null) { setSrc(""); return; }
    let vivant = true;
    chargerPicto(id).then((s) => { if (vivant) setSrc(s); }).catch(() => { if (vivant) setSrc(""); });
    return () => { vivant = false; };
  }, [id]);
  return src;
}

/** Les images à imprimer : celles qui manquent encore sont attendues, celles qui échouent laissent une case vide. */
export async function chargerImages(ids: number[]): Promise<Record<number, string>> {
  const paires = await Promise.all(ids.map((id) => chargerPicto(id).then((s) => [id, s] as const).catch(() => null)));
  return Object.fromEntries(paires.filter((p): p is readonly [number, string] => p !== null));
}

/** Les images de plusieurs pictogrammes, pour l'aperçu. */
export function usePictoImages(ids: number[]): Record<number, string> {
  const [images, setImages] = React.useState<Record<number, string>>({});
  const cle = [...ids].sort((a, b) => a - b).join(",");
  React.useEffect(() => {
    let vivant = true;
    chargerImages(ids).then((lues) => { if (vivant) setImages(lues); });
    return () => { vivant = false; };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return images;
}

function Resultat({ picto, actif, onClick }: { picto: PictoArasaac; actif: boolean; onClick: () => void }) {
  const src = usePictoImage(picto.id);
  return (
    <button type="button" onClick={onClick} title={picto.mot}
      style={{ border: actif ? "3px solid var(--accent)" : "1px solid var(--border)", borderRadius: 8, background: "#fff",
        padding: 4, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
        : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 11, color: "#444", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {picto.mot}
      </span>
    </button>
  );
}

export function ChoixPicto({ valeur, banque, titre = "Choisir un pictogramme", onClose, onValider }: {
  valeur: PictoPose; banque: boolean; titre?: string;
  onClose: () => void; onValider: (p: PictoPose) => void;
}) {
  const [q, setQ] = React.useState(valeur.mot);
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  const [choisi, setChoisi] = React.useState<number | null>(valeur.id);
  const [mot, setMot] = React.useState(valeur.mot);

  React.useEffect(() => {
    if (!banque) return;
    const t = setTimeout(() => {
      if (q.trim().length < 2) { setResultats([]); return; }
      api.arasaacChercher(q.trim(), 48).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, banque]);

  const prendre = (p: PictoArasaac) => {
    setChoisi(p.id);
    if (!mot.trim() || resultats.some((r) => r.mot === mot)) setMot(p.mot);
  };

  return (
    <Modal titre={titre} onClose={onClose} large
      footer={<>
        {(valeur.id != null || valeur.mot) && <button className="btn" onClick={() => onValider({ id: null, mot: "" })}>Vider</button>}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={choisi == null && !mot.trim()} onClick={() => onValider({ id: choisi, mot: mot.trim() })}>
          Poser
        </button>
      </>}>
      {banque ? (
        <>
          <Field label="Chercher un pictogramme">
            <Input autoFocus placeholder="travailler, tablette, ranger, récréation…" value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))", gap: 6, maxHeight: 280, overflowY: "auto", marginBottom: 12 }}>
            {resultats.map((p) => <Resultat key={p.id} picto={p} actif={choisi === p.id} onClick={() => prendre(p)} />)}
            {q.trim().length >= 2 && !resultats.length && (
              <div style={{ gridColumn: "1/-1", fontSize: 13, color: "var(--text-2)" }}>Aucun pictogramme pour « {q} ».</div>
            )}
          </div>
        </>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0 }}>
          La banque de pictogrammes ARASAAC n'est pas encore téléchargée : l'onglet 🎲 Jeux la télécharge. En attendant,
          le support portera le mot seul.
        </p>
      )}
      <Field label="Mot écrit sous l'image">
        <Input value={mot} onChange={(e) => setMot(e.target.value)} placeholder="tablette, travail…" />
      </Field>
    </Modal>
  );
}
