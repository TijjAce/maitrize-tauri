// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { nouvelId } from "./modele";
import { chercherPictos, garderImage, prendrePicto, vignetteArasaac, type PictoTrouve } from "./pont";
import { annoncer } from "./Fenetre";

// ── Choisir une image : un picto d'ARASAAC, ou une photo ──────────────────
//
// Pour une case comme pour le picto d'une catégorie : on cherche un mot dans
// l'index embarqué, on touche un picto, ou l'on prend une photo.

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

export function ChoixImage({ rechercheDeDepart, image, onPrise, onSansImage, onOccupe }: {
  rechercheDeDepart: string;
  image?: string;
  /** L'image prise, ses données, et le picto trouvé quand c'en est un. */
  onPrise: (id: string, donnees: string, trouve?: PictoTrouve) => void;
  onSansImage: () => void;
  /** Pendant une recherche ou une prise : la fiche attend avant d'enregistrer. */
  onOccupe?: (occupe: boolean) => void;
}) {
  const [recherche, setRecherche] = React.useState(rechercheDeDepart);
  const [trouves, setTrouves] = React.useState<PictoTrouve[] | null>(null);
  const [occupe, setOccupeLocal] = React.useState(false);
  const photo = React.useRef<HTMLInputElement>(null);
  const setOccupe = (v: boolean) => { setOccupeLocal(v); onOccupe?.(v); };

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
      onPrise(p.image, p.donnees, t);
      setTrouves(null);
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
      onPrise(id, donnees);
    } catch (e) { annoncer(`La photo n'a pas pu être prise : ${String((e as Error)?.message ?? e)}`); }
    finally { setOccupe(false); }
  };

  return (
    <>
      <div className="rangee">
        <input className="champ" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un picto"
          onKeyDown={(e) => { if (e.key === "Enter") void chercher(); }} />
        <button className="bouton" disabled={occupe || !recherche.trim()} onClick={() => { void chercher(); }}>Chercher</button>
        <button className="bouton" disabled={occupe} onClick={() => photo.current?.click()}>📷 Photo</button>
        {image && <button className="bouton discret" onClick={onSansImage}>Sans image</button>}
        <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => { void prendrePhoto(e.target.files?.[0]); e.target.value = ""; }} />
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
    </>
  );
}
