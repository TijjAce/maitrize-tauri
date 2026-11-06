import React from "react";
import { MODELE_COMPLET, creerLeClasseurComplet } from "./classeurComplet";
import { dupliquer, imagesDuClasseur, nouveauClasseur, type Classeur } from "./modele";
import { depuisObz, versObz } from "./obz";
import { enregistrerObz, garderClasseur, garderImage, lireImages, ouvrirObz, supprimerClasseur } from "./pont";
import { Fenetre, annoncer, confirmer, saisir } from "./Fenetre";
import { FenetreDesReglages, RoueDesReglages } from "./Reglages";

// ── Mes classeurs ─────────────────────────────────────────────────────────
//
// Ceux de cet appareil. On en crée un — complet (le classeur livré avec
// l'application, le choix d'office) ou vide —, on reprend celui de Maitrize
// (un fichier .obz reçu par AirDrop ou rangé dans Fichiers), on en renvoie un
// à Maitrize : il se pose dans les Documents de l'application, que l'app
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
  const [reglages, setReglages] = React.useState(false);
  const [occupe, setOccupe] = React.useState(false);
  const [credits, setCredits] = React.useState(false);
  const [nouveau, setNouveau] = React.useState(false);
  const fichier = React.useRef<HTMLInputElement>(null);

  const creer = async (nom: string, complet: boolean, feminin: boolean) => {
    setNouveau(false);
    setOccupe(true);
    try {
      let c: Classeur;
      if (complet) c = await creerLeClasseurComplet(nom, feminin);
      else {
        c = { ...nouveauClasseur(nom), ...(feminin ? { feminin: true } : {}) };
        await garderClasseur(c);
      }
      await onRecharger();
      onOuvrir(c);
    } catch (e) {
      annoncer(`Le classeur n'a pas pu être créé : ${String((e as Error)?.message ?? e)}`);
    } finally {
      setOccupe(false);
    }
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
        <RoueDesReglages onClick={() => setReglages(true)} />
        <h1>Mes classeurs</h1>
        <span className="espace" />
        <button className="bouton" disabled={occupe} onClick={() => fichier.current?.click()}>Reprendre un classeur (.obz)</button>
        <button className="bouton principal" disabled={occupe} onClick={() => setNouveau(true)}>＋ Nouveau classeur</button>
        <button className="bouton discret" aria-label="Crédits" onClick={() => setCredits(true)}>ⓘ</button>
        <input ref={fichier} type="file" accept=".obz,application/zip,application/octet-stream" hidden
          onChange={(e) => { void importer(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      {reglages && <FenetreDesReglages onFermer={() => setReglages(false)} />}

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

      {nouveau && <FenetreNouveau onCreer={(nom, complet, feminin) => { void creer(nom, complet, feminin); }} onFermer={() => setNouveau(false)} />}

      {credits && (
        <Fenetre titre="Crédits" onFermer={() => setCredits(false)}>
          <p>Les pictogrammes sont de Sergio Palao, pour <a href="https://arasaac.org" target="_blank" rel="noreferrer">ARASAAC</a>,
            propriété du Gouvernement d'Aragon, sous licence Creative Commons BY-NC-SA.</p>
          <p>Les classeurs reprennent les principes du PODD (Pragmatic Organisation Dynamic Display) de Gayle Porter, sans en reproduire
            les pages.</p>
          <p>Les poids des ensembles par thème s'appuient sur les fréquences de <a href="http://www.lexique.org" target="_blank" rel="noreferrer">Lexique 3.83</a> (B. New,
            C. Pallier et coll.), sous licence Creative Commons BY-SA 4.0 ; ces poids sont partagés sous la même licence.</p>
          <p>Les classeurs, leurs images et leurs photos restent sur cet appareil.</p>
        </Fenetre>
      )}
    </div>
  );
}

const CASES_DU_MODELE = MODELE_COMPLET.pages.reduce((n, p) => n + p.cases.length, 0);

/**
 * Un nouveau classeur : son nom, et ses pages — complètes d'office, ou une seule, vide ; et si l'élève parle au féminin
 * (les PODD le demandent à leur création : « contente », « je suis tombée »).
 */
function FenetreNouveau({ onCreer, onFermer }: { onCreer: (nom: string, complet: boolean, feminin: boolean) => void; onFermer: () => void }) {
  const [nom, setNom] = React.useState("");
  const [complet, setComplet] = React.useState(true);
  const [feminin, setFeminin] = React.useState(false);
  const valider = () => onCreer(nom.trim(), complet, feminin);
  return (
    <Fenetre titre="Nouveau classeur" onFermer={onFermer}
      pied={<>
        <button className="bouton" onClick={onFermer}>Annuler</button>
        <button className="bouton principal" onClick={valider}>Créer</button>
      </>}>
      <div className="nouveau">
        <input className="champ" aria-label="Nom du classeur" placeholder={complet ? MODELE_COMPLET.nom : "Mon classeur"} value={nom}
          onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
        <div className="choix-modele" role="radiogroup" aria-label="Pages du classeur">
          <button role="radio" aria-checked={complet} className={`choix${complet ? " choisi" : ""}`} onClick={() => setComplet(true)}>
            <strong>Complet</strong>
            <span className="discret">{MODELE_COMPLET.pages.length} pages · {CASES_DU_MODELE} cases</span>
          </button>
          <button role="radio" aria-checked={!complet} className={`choix${!complet ? " choisi" : ""}`} onClick={() => setComplet(false)}>
            <strong>Vide</strong>
            <span className="discret">1 page</span>
          </button>
        </div>
        <label className="coche">
          <input type="checkbox" checked={feminin} onChange={(e) => setFeminin(e.target.checked)} /> Parle au féminin
        </label>
      </div>
    </Fenetre>
  );
}
