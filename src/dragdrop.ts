// Glisser-déposer vers une zone précise de l'interface.
//
// Tauri propose son propre gestionnaire natif (`dragDropEnabled`), qui donne
// les chemins absolus des fichiers. Nous ne l'employons pas : **il désactive
// le glisser-déposer du web**, et l'on ne peut alors plus déposer de lien —
// seulement des fichiers. Déposer une vidéo attrapée dans le navigateur est
// justement l'un des gestes attendus sur le plan de travail.
//
// On reste donc sur le glisser-déposer standard. La contrepartie est qu'on
// reçoit des objets `File` plutôt que des chemins : le contenu est lu puis
// enregistré, au lieu d'être copié depuis le disque. Pour les tailles en jeu
// — un PDF de fiche, une photo — la différence ne se voit pas.

import React from "react";

export const estPdf = (nom: string) => /\.pdf$/i.test(nom);
export const estImage = (nom: string) => /\.(png|jpe?g|gif|webp|heic|bmp|svg)$/i.test(nom);
export const nomDeChemin = (chemin: string) => chemin.split(/[\\/]/).pop() || chemin;

/**
 * Fait d'un élément une zone acceptant le dépôt de fichiers.
 *
 * `actif` sert au retour visuel pendant le survol : sans lui, on ne sait pas
 * si l'on vise juste avant de lâcher.
 */
export function useFileDropZone(opts: {
  accept: (nom: string) => boolean;
  onFiles: (fichiers: File[]) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [actif, setActif] = React.useState(false);
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // `dragenter`/`dragleave` se déclenchent aussi en passant d'un enfant à
    // l'autre : on compte les entrées plutôt que de basculer à chaque
    // événement, sinon le surlignage clignote.
    let profondeur = 0;
    const porteDesFichiers = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");

    const entree = (e: DragEvent) => {
      if (!porteDesFichiers(e)) return;
      profondeur++; setActif(true);
    };
    const sortie = (e: DragEvent) => {
      if (!porteDesFichiers(e)) return;
      profondeur = Math.max(0, profondeur - 1);
      if (profondeur === 0) setActif(false);
    };
    const survol = (e: DragEvent) => {
      if (!porteDesFichiers(e)) return;
      e.preventDefault(); // sans quoi le dépôt est refusé par le navigateur
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const depot = (e: DragEvent) => {
      if (!porteDesFichiers(e)) return;
      e.preventDefault();
      profondeur = 0; setActif(false);
      const fichiers = Array.from(e.dataTransfer?.files ?? [])
        .filter((f) => optsRef.current.accept(f.name));
      if (fichiers.length) optsRef.current.onFiles(fichiers);
    };

    el.addEventListener("dragenter", entree);
    el.addEventListener("dragleave", sortie);
    el.addEventListener("dragover", survol);
    el.addEventListener("drop", depot);
    return () => {
      el.removeEventListener("dragenter", entree);
      el.removeEventListener("dragleave", sortie);
      el.removeEventListener("dragover", survol);
      el.removeEventListener("drop", depot);
    };
  }, []);

  return { ref, actif };
}

/** Lit un fichier déposé en base64, prêt pour `api.fichierSave`. */
export function fichierEnBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
}
