import React from "react";
import { COULEURS, nouvelId, type Case, type Classeur, type Page } from "./modele";
import { chercherPictos, garderImage, prendrePicto, vignetteArasaac, type PictoTrouve } from "./pont";
import { COULEUR_DE_LA_NATURE } from "./recherche";
import { Fenetre, annoncer } from "./Fenetre";

// ── La fiche d'une case, en mode modifier ────────────────────────────────
//
// Le mot, ce qui se dit, l'image — un picto d'ARASAAC ou une photo —, la
// couleur, la page qu'elle ouvre (ou une nouvelle, à son nom), cachée ou non.

export const NOUVELLE_PAGE = "__nouvelle__";

/** Une photo réduite pour le classeur : assez nette sur une tablette, légère à garder. */
async function reduire(fichier: File, cote = 480): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const r = Math.min(1, cote / Math.max(img.naturalWidth, img.naturalHeight));
    const toile = document.createElement("canvas");
    toile.width = Math.max(1, Math.round(img.naturalWidth * r));
    toile.height = Math.max(1, Math.round(img.naturalHeight * r));
    toile.getContext("2d")!.drawImage(img, 0, 0, toile.width, toile.height);
    return toile.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FicheCase({ classeur, page, valeur, images, onImage, onPoser, onFermer }: {
  classeur: Classeur; page: Page; valeur: Case | null; images: Record<string, string>;
  onImage: (id: string, donnees: string) => void;
  /** La case posée (ou rien, pour la vider) ; `nouvellePage` : le nom d'une page à créer, que la case ouvrira. */
  onPoser: (k: Case | null, nouvellePage?: string) => void;
  onFermer: () => void;
}) {
  const [mot, setMot] = React.useState(valeur?.mot ?? "");
  const [dire, setDire] = React.useState(valeur?.dire ?? "");
  const [image, setImage] = React.useState(valeur?.image);
  const [couleur, setCouleur] = React.useState<{ fond?: string; bord?: string }>({ fond: valeur?.fond, bord: valeur?.bord });
  const [lien, setLien] = React.useState(valeur?.lien ?? "");
  const [masquee, setMasquee] = React.useState(!!valeur?.masquee);
  const [recherche, setRecherche] = React.useState(valeur?.mot ?? "");
  const [trouves, setTrouves] = React.useState<PictoTrouve[] | null>(null);
  const [occupe, setOccupe] = React.useState(false);
  const photo = React.useRef<HTMLInputElement>(null);

  const chercher = async () => {
    if (!recherche.trim()) return;
    setOccupe(true);
    try { setTrouves(await chercherPictos(recherche)); }
    catch (e) { annoncer(`La recherche n'a pas abouti : ${String((e as Error)?.message ?? e)}`); }
    finally { setOccupe(false); }
  };

  const prendre = async (t: PictoTrouve) => {
    setOccupe(true);
    try {
      const p = await prendrePicto(t.id);
      onImage(p.image, p.donnees);
      setImage(p.image);
      setTrouves(null);
      if (!mot.trim()) setMot(t.mot);
      // Sans couleur choisie, celle de la nature du mot : vert pour un verbe, orange pour une chose…
      const nature = COULEURS.find((c) => c.id === COULEUR_DE_LA_NATURE[t.nature ?? 0]);
      if (!couleur.fond && nature) setCouleur({ fond: nature.fond, bord: nature.bord });
    } catch (e) { annoncer(`Le picto n'a pas pu être pris : ${String((e as Error)?.message ?? e)}`); }
    finally { setOccupe(false); }
  };

  const prendrePhoto = async (fichier: File | undefined) => {
    if (!fichier) return;
    setOccupe(true);
    try {
      const donnees = await reduire(fichier);
      const id = `photo-${nouvelId()}`;
      await garderImage(id, donnees);
      onImage(id, donnees);
      setImage(id);
    } catch (e) { annoncer(`La photo n'a pas pu être prise : ${String((e as Error)?.message ?? e)}`); }
    finally { setOccupe(false); }
  };

  const enregistrer = () => {
    const m = mot.trim();
    if (!m && !image) { onPoser(null); return; }
    const k: Case = { id: valeur?.id ?? nouvelId(), mot: m };
    if (dire.trim() && dire.trim() !== m) k.dire = dire.trim();
    if (image) k.image = image;
    if (couleur.fond) k.fond = couleur.fond;
    if (couleur.bord) k.bord = couleur.bord;
    if (lien && lien !== NOUVELLE_PAGE) k.lien = lien;
    if (masquee) k.masquee = true;
    onPoser(k, lien === NOUVELLE_PAGE ? (m || "Nouvelle page") : undefined);
  };

  const autresPages = classeur.pages.filter((p) => p.id !== page.id);
  return (
    <Fenetre titre={valeur ? "La case" : "Une nouvelle case"} onFermer={onFermer} large
      pied={<>
        {valeur && <button className="bouton danger" onClick={() => onPoser(null)}>Vider la case</button>}
        <span className="espace" />
        <button className="bouton" onClick={onFermer}>Annuler</button>
        <button className="bouton principal" disabled={occupe} onClick={enregistrer}>Enregistrer</button>
      </>}>
      <div className="fiche">
        <div className="fiche-apercu" style={{ background: couleur.fond ?? "#fff", borderColor: couleur.bord ?? "#8c8c96" }}>
          {image && images[image] ? <img src={images[image]} alt="" /> : <span className="sans-image">Sans image</span>}
          <span className="mot">{mot || "…"}</span>
        </div>
        <div className="fiche-champs">
          <label className="etiquette">Le mot
            <input className="champ" autoFocus value={mot} onChange={(e) => setMot(e.target.value)} placeholder="manger, je veux, encore…" />
          </label>
          <label className="etiquette">Ce qui se dit
            <input className="champ" value={dire} onChange={(e) => setDire(e.target.value)} placeholder="Comme le mot" />
          </label>
          <div className="etiquette">L'image
            <div className="rangee">
              <input className="champ" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un picto"
                onKeyDown={(e) => { if (e.key === "Enter") void chercher(); }} />
              <button className="bouton" disabled={occupe || !recherche.trim()} onClick={() => { void chercher(); }}>Chercher</button>
              <button className="bouton" disabled={occupe} onClick={() => photo.current?.click()}>📷 Photo</button>
              {image && <button className="bouton discret" onClick={() => setImage(undefined)}>Sans image</button>}
              <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => { void prendrePhoto(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
          {trouves && (
            trouves.length === 0
              ? <p className="discret">Aucun picto pour « {recherche} ».</p>
              : <div className="trouves">
                {trouves.map((t) => (
                  <button key={t.id} className="trouve" disabled={occupe} title={t.mot} onClick={() => { void prendre(t); }}>
                    <img src={vignetteArasaac(t.id)} alt={t.mot} loading="lazy" />
                  </button>
                ))}
              </div>
          )}
          <div className="etiquette">La couleur
            <div className="couleurs">
              <button className={`pastille${!couleur.fond ? " choisie" : ""}`} style={{ background: "#fff" }} title="Aucune"
                onClick={() => setCouleur({})}>∅</button>
              {COULEURS.map((c) => (
                <button key={c.id} className={`pastille${couleur.fond === c.fond ? " choisie" : ""}`} title={c.nom}
                  style={{ background: c.fond, borderColor: c.bord }} onClick={() => setCouleur({ fond: c.fond, bord: c.bord })} />
              ))}
            </div>
          </div>
          <label className="etiquette">Elle ouvre
            <select className="champ" value={lien} onChange={(e) => setLien(e.target.value)}>
              <option value="">Aucune page</option>
              {autresPages.map((p) => <option key={p.id} value={p.id}>La page « {p.nom} »</option>)}
              <option value={NOUVELLE_PAGE}>＋ Une nouvelle page « {mot.trim() || "…"} »</option>
            </select>
          </label>
          <label className="coche">
            <input type="checkbox" checked={masquee} onChange={(e) => setMasquee(e.target.checked)} /> Cachée à l'élève (la place reste)
          </label>
        </div>
      </div>
    </Fenetre>
  );
}
