import React from "react";
import { dupliquer, imagesDuClasseur, nouveauClasseur, type Classeur } from "./modele";
import { depuisObz, versObz } from "./obz";
import { enregistrerObz, garderClasseur, garderImage, lireImages, ouvrirObz, supprimerClasseur } from "./pont";
import { Fenetre, annoncer, confirmer, saisir } from "./Fenetre";

// ── Mes classeurs ─────────────────────────────────────────────────────────
//
// Ceux de cet appareil. On en crée un, on reprend celui de Maitrize (un
// fichier .obz reçu par AirDrop ou rangé dans Fichiers), on en renvoie un à
// Maitrize : il se pose dans les Documents de l'application, que l'app
// Fichiers montre.

const date = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
};

/** Le fichier choisi, en base64. */
const lireFichier = (f: File): Promise<string> => new Promise((ok, ko) => {
  const lecteur = new FileReader();
  lecteur.onload = () => ok(String(lecteur.result));
  lecteur.onerror = () => ko(lecteur.error);
  lecteur.readAsDataURL(f);
});

export function Bibliotheque({ classeurs, onOuvrir, onRecharger }: {
  classeurs: Classeur[] | null; onOuvrir: (c: Classeur) => void; onRecharger: () => Promise<void>;
}) {
  const [occupe, setOccupe] = React.useState(false);
  const [credits, setCredits] = React.useState(false);
  const fichier = React.useRef<HTMLInputElement>(null);

  const creer = async () => {
    const nom = await saisir("Le nom du classeur", "", "Créer");
    if (!nom) return;
    const c = nouveauClasseur(nom);
    await garderClasseur(c);
    await onRecharger();
    onOuvrir(c);
  };

  const importer = async (f: File | undefined) => {
    if (!f) return;
    setOccupe(true);
    try {
      const fichiers = await ouvrirObz(await lireFichier(f));
      const { classeur, images } = depuisObz(fichiers, f.name.replace(/\.obz$/i, ""));
      for (const [id, donnees] of Object.entries(images)) await garderImage(id, donnees);
      await garderClasseur(classeur);
      await onRecharger();
      annoncer(`« ${classeur.nom} » repris : ${classeur.pages.length} ${classeur.pages.length > 1 ? "pages" : "page"}.`);
    } catch (e) {
      annoncer(`Ce fichier n'a pas pu être repris : ${String((e as Error)?.message ?? e)}`);
    } finally {
      setOccupe(false);
    }
  };

  const exporter = async (c: Classeur) => {
    setOccupe(true);
    try {
      const images = await lireImages(imagesDuClasseur(c));
      const nom = await enregistrerObz(c.nom, versObz(c, images));
      annoncer(`« ${nom} » est dans l'app Fichiers, dossier « MaitrizeV2 Classeur » : envoyez-le par AirDrop à l'ordinateur.`);
    } catch (e) {
      annoncer(`L'export n'a pas abouti : ${String((e as Error)?.message ?? e)}`);
    } finally {
      setOccupe(false);
    }
  };

  const renommer = async (c: Classeur) => {
    const nom = await saisir("Le nouveau nom", c.nom, "Renommer");
    if (!nom || nom === c.nom) return;
    await garderClasseur({ ...c, nom, modifieLe: new Date().toISOString() });
    await onRecharger();
  };

  const copier = async (c: Classeur) => {
    await garderClasseur(dupliquer(c, `${c.nom} (copie)`));
    await onRecharger();
  };

  const supprimer = async (c: Classeur) => {
    if (!(await confirmer(`Supprimer « ${c.nom} » de cet appareil ?`, { oui: "Supprimer", danger: true }))) return;
    await supprimerClasseur(c.id);
    await onRecharger();
    annoncer(`« ${c.nom} » est dans la corbeille de l'application.`);
  };

  return (
    <div className="bibliotheque">
      <div className="bibliotheque-tete">
        <h1>Mes classeurs</h1>
        <span className="espace" />
        <button className="bouton" disabled={occupe} onClick={() => fichier.current?.click()}>Reprendre un classeur (.obz)</button>
        <button className="bouton principal" disabled={occupe} onClick={() => { void creer(); }}>＋ Nouveau classeur</button>
        <button className="bouton discret" aria-label="Crédits" onClick={() => setCredits(true)}>ⓘ</button>
        <input ref={fichier} type="file" accept=".obz,application/zip,application/octet-stream" hidden
          onChange={(e) => { void importer(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {classeurs === null ? null : classeurs.length === 0
        ? <p className="vide-bibliotheque">Aucun classeur sur cet appareil.</p>
        : (
          <div className="cartes">
            {classeurs.map((c) => (
              <div key={c.id} className="carte">
                <button className="carte-ouvrir" onClick={() => onOuvrir(c)}>
                  <span className="carte-nom">{c.nom}</span>
                  <span className="discret">{c.pages.length} {c.pages.length > 1 ? "pages" : "page"} · {date(c.modifieLe)}</span>
                </button>
                <div className="carte-actions">
                  <button className="bouton discret" disabled={occupe} onClick={() => { void exporter(c); }}>Exporter</button>
                  <button className="bouton discret" onClick={() => { void copier(c); }}>Dupliquer</button>
                  <button className="bouton discret" onClick={() => { void renommer(c); }}>Renommer</button>
                  <button className="bouton discret" onClick={() => { void supprimer(c); }}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {credits && (
        <Fenetre titre="Crédits" onFermer={() => setCredits(false)}>
          <p>Les pictogrammes sont de Sergio Palao, pour <a href="https://arasaac.org" target="_blank" rel="noreferrer">ARASAAC</a>,
            propriété du Gouvernement d'Aragon, sous licence Creative Commons BY-NC-SA.</p>
          <p>Les classeurs reprennent les principes du PODD (Pragmatic Organisation Dynamic Display) de Gayle Porter, sans en reproduire
            les pages.</p>
          <p>Les classeurs, leurs images et leurs photos restent sur cet appareil.</p>
        </Fenetre>
      )}
    </div>
  );
}
