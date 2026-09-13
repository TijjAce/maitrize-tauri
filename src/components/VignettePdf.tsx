import React from "react";
import { api } from "../api";

// Vignettes de la première page des PDF posés sur le bureau.
//
// Rendre un PDF coûte : lire le fichier, le décoder, dessiner la page. On le
// fait donc une fois par fichier — les noms de fichiers ne changent jamais
// de contenu — et l'on garde le résultat d'une visite à l'autre. Une seule
// vignette se calcule à la fois : un dossier plein de PDF ne doit pas figer
// la fenêtre.

const enMemoire = new Map<string, Promise<string>>();
let file: Promise<unknown> = Promise.resolve();

function calculer(nom: string): Promise<string> {
  const cle = `vignette:${nom}`;
  try {
    const gardee = localStorage.getItem(cle);
    if (gardee) return Promise.resolve(gardee);
  } catch { /* stockage indisponible */ }
  const travail = file.then(async () => {
    const b64 = await api.fichierRead(nom);
    const binaire = atob(b64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    // pdf.js n'est chargé qu'au premier PDF affiché, pas au démarrage.
    const { vignettePdf } = await import("../pdfRendu");
    const url = await vignettePdf(octets);
    try { localStorage.setItem(cle, url); } catch { /* plein : on s'en passera */ }
    return url;
  });
  // Un échec ne doit pas bloquer les vignettes suivantes.
  file = travail.catch(() => {});
  return travail;
}

export function vignetteDe(nom: string): Promise<string> {
  let p = enMemoire.get(nom);
  if (!p) { p = calculer(nom); enMemoire.set(nom, p); }
  return p;
}

/** La première page d'un PDF, posée comme une feuille dans sa case. */
export function VignettePdf({ nom }: { nom: string }) {
  const [src, setSrc] = React.useState("");
  const [echec, setEchec] = React.useState(false);
  React.useEffect(() => {
    let vivant = true;
    setSrc(""); setEchec(false);
    vignetteDe(nom).then((u) => { if (vivant) setSrc(u); }).catch(() => { if (vivant) setEchec(true); });
    return () => { vivant = false; };
  }, [nom]);
  if (!src) return <span style={{ fontSize: 38, opacity: echec ? 1 : 0.5 }}>📄</span>;
  return (
    <img src={src} alt="" draggable={false}
      style={{ maxWidth: "78%", maxHeight: "90%", objectFit: "contain", background: "#fff",
        borderRadius: 2, boxShadow: "0 1px 2px rgba(0,0,0,.18), 0 3px 10px rgba(0,0,0,.12)" }} />
  );
}
