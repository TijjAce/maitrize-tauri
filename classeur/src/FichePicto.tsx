// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { pictoDeLaPage, type Classeur, type Page } from "./modele";
import { ChoixImage } from "./ChoixImage";
import { Fenetre } from "./Fenetre";

// ── Le picto d'une catégorie, en mode modifier ─────────────────────────────
//
// « Chaque catégorie doit pouvoir avoir un picto » (l'enseignant, 5 novembre
// 2026) : celui qu'elle montre dans la bande du haut. Sans choix, c'est celui
// de la case qui y mène, sur la page des catégories.

export function FichePicto({ classeur, page, couleur, images, onImage, onChoisir, onFermer }: {
  classeur: Classeur; page: Page; couleur: string; images: Record<string, string>;
  onImage: (id: string, donnees: string) => void;
  /** L'image choisie ; rien : reprendre celle de la case qui y mène. */
  onChoisir: (image: string | undefined) => void;
  onFermer: () => void;
}) {
  const [image, setImage] = React.useState(page.image);
  const [occupe, setOccupe] = React.useState(false);
  // Ce qu'on verrait sans choix : le picto de la case qui y mène.
  const parDefaut = pictoDeLaPage({ ...classeur, pages: classeur.pages.map((p) => (p.id === page.id ? { ...p, image: undefined } : p)) }, page.id);
  const montree = image ?? parDefaut;
  return (
    <Fenetre titre="Le picto de la catégorie" onFermer={onFermer}
      pied={<>
        {page.image && <button className="bouton" onClick={() => onChoisir(undefined)}>Comme la case qui y mène</button>}
        <span className="espace" />
        <button className="bouton" onClick={onFermer}>Annuler</button>
        <button className="bouton principal" disabled={occupe} onClick={() => onChoisir(image)}>Enregistrer</button>
      </>}>
      <div className="fiche">
        <div className="categorie-proposee apercu" style={{ background: couleur }}>
          {montree && images[montree] ? <img src={images[montree]} alt="" /> : <span className="sans-image">Sans image</span>}
          <span>{page.nom}</span>
        </div>
        <div className="fiche-champs">
          <div className="etiquette">L'image
            <ChoixImage rechercheDeDepart={page.nom} image={image}
              onPrise={(id, donnees) => { onImage(id, donnees); setImage(id); }} onSansImage={() => setImage(undefined)} onOccupe={setOccupe} />
          </div>
        </div>
      </div>
    </Fenetre>
  );
}
