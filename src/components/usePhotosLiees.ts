// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { EVT_MES_PICTOS, lireMesPictos, type MonPicto } from "../mesPictos";
import { photosLiees } from "../supportsDeTravail";

// Les photos de « Mes photos » liées à un jeu de la ludothèque ou à un
// élément du plan de travail (Réglages › Personnalisation) : une seule
// lecture pour tout l'écran — le cahier journal en montre à chaque créneau —,
// refaite quand une photo arrive du téléphone ou se règle sur l'autre
// ordinateur.

let lecture: Promise<MonPicto[]> | null = null;
const lire = () => (lecture ??= lireMesPictos().then(photosLiees).catch(() => { lecture = null; return []; }));
// Posé avant ceux des écrans : la lecture d'avant est oubliée quand ils relisent.
if (typeof window !== "undefined") window.addEventListener(EVT_MES_PICTOS, () => { lecture = null; });

export function usePhotosLiees(): MonPicto[] {
  const [photos, setPhotos] = React.useState<MonPicto[]>([]);
  React.useEffect(() => {
    let vivant = true;
    const relire = () => { void lire().then((l) => { if (vivant) setPhotos(l); }); };
    relire();
    window.addEventListener(EVT_MES_PICTOS, relire);
    return () => { vivant = false; window.removeEventListener(EVT_MES_PICTOS, relire); };
  }, []);
  return photos;
}
