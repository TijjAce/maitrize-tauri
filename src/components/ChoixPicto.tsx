import React from "react";
import { api, PictoArasaac } from "../api";
import { Field, Input, Modal } from "./ui";
import type { PictoPose } from "../supportsVisuels";
import { chargerImageAppoint } from "../pictosAppoint";
import { ETIQUETTES, chercherPictos, estMonPicto, imageDeMonPicto, origineDe } from "../mesPictos";
import { PhotoTelephone } from "./PhotoTelephone";
import { imagesSelonMode, modeImagesActif, photosChangees, type ModeImages } from "../imagesSelonMode";
import { toast } from "./Toaster";

// ── Choisir un pictogramme ARASAAC ─────────────────────────────────────────
//
// La recherche propose, l'enseignant choisit en voyant l'image. Le mot écrit
// sous le pictogramme reste modifiable : « tablette » plutôt que
// « tablette tactile ».

/** Une photo des fichiers de l'application, en data URL. */
const chargerPhoto = (nom: string) =>
  api.fichierRead(nom).then((b) => `data:${/\.png$/i.test(nom) ? "image/png" : /\.webp$/i.test(nom) ? "image/webp" : "image/jpeg"};base64,${b}`);

/**
 * L'image d'un pictogramme, chargée à la demande et gardée pour la séance :
 * un numéro ARASAAC, celui d'un picto de « Mes pictos », la référence d'une
 * banque d'appoint (« sclera:compter.png »), ou une photo des fichiers
 * (« photo:IMG-12.jpg »).
 */
const cache = new Map<string, Promise<string>>();
function chargerTelle(id: number | string): Promise<string> {
  const cle = String(id);
  let p = cache.get(cle);
  if (!p) {
    p = typeof id !== "string"
      ? estMonPicto(id) ? imageDeMonPicto(id) : api.arasaacImage(id).then((b) => `data:image/png;base64,${b}`)
      : id.startsWith("photo:") ? chargerPhoto(id.slice("photo:".length)) : chargerImageAppoint(id);
    p.catch(() => cache.delete(cle));
    cache.set(cle, p);
  }
  return p;
}

/**
 * L'image d'un pictogramme selon le choix de l'atelier ouvert dans Fabriquer
 * — photos et pictos, pictos seulement, photos seulement (voir
 * `imagesSelonMode`) ; telle quelle ailleurs. Une image que le choix écarte
 * ne se charge pas : sa case reste vide.
 */
export function chargerPicto(id: number | string, mode: ModeImages | null = modeImagesActif.lire()): Promise<string> {
  if (!mode) return chargerTelle(id);
  const cle = `${mode}|${photosChangees.version()}|${id}`;
  let p = cache.get(cle);
  if (!p) {
    p = imagesSelonMode([id], mode).then((m) => {
      const autre = m.get(id);
      if (autre == null) throw new Error("Aucune image pour ce mot dans ce choix.");
      return chargerTelle(autre);
    });
    p.catch(() => cache.delete(cle));
    cache.set(cle, p);
  }
  return p;
}

/** Ce qui fait changer une image affichée : le choix de l'atelier ouvert, et les photos de Mes pictos. */
function useChoixDesImages(): string {
  const mode = React.useSyncExternalStore(modeImagesActif.abonner, modeImagesActif.lire);
  const version = React.useSyncExternalStore(photosChangees.abonner, photosChangees.version);
  return `${mode ?? ""}|${version}`;
}

/**
 * Range une image qui ne vient pas de la banque — une photo, un dessin de
 * l'enseignant — sous un identifiant à elle (négatif) : elle se montre alors
 * partout où un pictogramme se montre.
 */
export function memoriserImage(id: number, src: string): void {
  cache.set(String(id), Promise.resolve(src));
}

export function usePictoImage(id: number | string | null | undefined): string {
  const [src, setSrc] = React.useState("");
  const choix = useChoixDesImages();
  React.useEffect(() => {
    if (id == null) { setSrc(""); return; }
    let vivant = true;
    chargerPicto(id).then((s) => { if (vivant) setSrc(s); }).catch(() => { if (vivant) setSrc(""); });
    return () => { vivant = false; };
  }, [id, choix]);
  return src;
}

/** Les images à imprimer : celles qui manquent encore sont attendues, celles qui échouent laissent une case vide. */
export async function chargerImages<T extends number | string>(ids: T[]): Promise<Record<T, string>> {
  const paires = await Promise.all(ids.map((id) => chargerPicto(id).then((s) => [id, s] as const).catch(() => null)));
  return Object.fromEntries(paires.filter((p): p is readonly [T, string] => p !== null)) as Record<T, string>;
}

/** Les images de plusieurs pictogrammes, pour l'aperçu. */
export function usePictoImages<T extends number | string>(ids: T[]): Record<T, string> {
  const [images, setImages] = React.useState<Record<T, string>>({} as Record<T, string>);
  const cle = ids.map(String).sort().join(",");
  const choix = useChoixDesImages();
  React.useEffect(() => {
    let vivant = true;
    chargerImages(ids).then((lues) => { if (vivant) setImages(lues); });
    return () => { vivant = false; };
  }, [cle, choix]); // eslint-disable-line react-hooks/exhaustive-deps
  return images;
}

/** L'étiquette d'un picto de « Mes pictos » : « IA », « Sclera » ; rien pour un pictogramme d'ARASAAC. */
export function EtiquetteMonPicto({ id }: { id: number | string | null | undefined }) {
  const origine = origineDe(id);
  if (!origine) return null;
  const e = ETIQUETTES[origine];
  return <span className={`mp-etiquette mp-${origine}`} title={e.long}>{e.court}</span>;
}

function Resultat({ picto, actif, onClick }: { picto: PictoArasaac; actif: boolean; onClick: () => void }) {
  const src = usePictoImage(picto.id);
  const origine = origineDe(picto.id);
  return (
    <button type="button" onClick={onClick} title={origine ? `${picto.mot} — ${ETIQUETTES[origine].long}` : picto.mot}
      style={{ border: actif ? "3px solid var(--accent)" : "1px solid var(--border)", borderRadius: 8, background: "#fff", position: "relative",
        padding: 4, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <EtiquetteMonPicto id={picto.id} />
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
        : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 11, color: "#444", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {picto.mot}
      </span>
    </button>
  );
}

export function ChoixPicto({ valeur, banque, titre = "Choisir un pictogramme", onClose, onValider, photos = false }: {
  valeur: PictoPose; banque: boolean; titre?: string;
  onClose: () => void; onValider: (p: PictoPose) => void;
  /** Une photo de l'objet aussi : prise au téléphone, ou une image de l'ordinateur. */
  photos?: boolean;
}) {
  const [q, setQ] = React.useState(valeur.mot);
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  const [choisi, setChoisi] = React.useState<number | null>(valeur.id);
  const [mot, setMot] = React.useState(valeur.mot);
  const [photo, setPhoto] = React.useState(valeur.photo ?? "");
  const srcPhoto = usePictoImage(photo ? `photo:${photo}` : null);
  const prendrePhoto = (nom: string) => { setPhoto(nom); setChoisi(null); };
  // Une image de l'ordinateur rejoint les fichiers de l'application, comme une photo du téléphone.
  const importer = async (f: File) => {
    const base64 = await new Promise<string>((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onload = () => ok(String(lecteur.result).split(",")[1] ?? "");
      lecteur.onerror = () => ko(lecteur.error);
      lecteur.readAsDataURL(f);
    });
    prendrePhoto(await api.fichierSave(f.name, base64));
  };

  React.useEffect(() => {
    if (!banque) return;
    const t = setTimeout(() => {
      if (q.trim().length < 2) { setResultats([]); return; }
      chercherPictos(q.trim(), 48).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q, banque]);

  const prendre = (p: PictoArasaac) => {
    setChoisi(p.id);
    setPhoto("");
    if (!mot.trim() || resultats.some((r) => r.mot === mot)) setMot(p.mot);
  };

  return (
    <Modal titre={titre} onClose={onClose} large
      footer={<>
        {(valeur.id != null || valeur.mot) && <button className="btn" onClick={() => onValider({ id: null, mot: "" })}>Vider</button>}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={choisi == null && !mot.trim() && !photo}
          onClick={() => onValider(photo ? { id: null, mot: mot.trim(), photo } : { id: choisi, mot: mot.trim() })}>
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
      {photos && (
        <Field label="Ou une photo de l'objet">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {photo && (srcPhoto
              ? <img src={srcPhoto} alt="" style={{ width: 84, height: 84, objectFit: "contain", border: "3px solid var(--accent)", borderRadius: 8, background: "#fff" }} />
              : <span className="meta">📷 {photo}</span>)}
            <PhotoTelephone label="📱 Photographier avec le téléphone" className="btn sm" onPhoto={prendrePhoto} />
            <label className="btn sm" style={{ cursor: "pointer" }}>
              🖼 Une image de l'ordinateur
              <input type="file" accept="image/*" hidden onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) importer(f).catch((err) => toast("Image non enregistrée : " + String(err), { icone: "⚠️" }));
              }} />
            </label>
            {photo && <button type="button" className="btn ghost sm" onClick={() => setPhoto("")}>Retirer la photo</button>}
          </div>
        </Field>
      )}
      <Field label="Mot écrit sous l'image">
        <Input value={mot} onChange={(e) => setMot(e.target.value)} placeholder="tablette, travail…" />
      </Field>
    </Modal>
  );
}
