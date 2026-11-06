// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { api, MATIERES, NIVEAUX_SCOLAIRES, nouvelEspace, nouvelOutil, type Espace, type Jeu, type MaterielItem, type OutilClasse, type Sequence } from "../api";
import { EVT_MES_PICTOS, changerMonPicto, lireMesPictos, type MonPicto } from "../mesPictos";
import {
  ESPACES_DE_LA_CLASSE, GENRES_MONTRES, MENU_DE_L_ENSEIGNANT, TOUS_LES_NIVEAUX, cleDeLElement, espacesMontres, menuDeLElement, supportsDeLaSequence,
} from "../supportsDeTravail";
import { elementsDuBureau, genreDeSupport } from "../supportsDeSeance";
import { lirePdfs } from "../materielSeance";
import { etiquetteDeMatiere } from "../pictosMatieres";
import { usePictoImage } from "./ChoixPicto";
import { useLudotheque } from "./ReglesDesJeux";
import { toast, toastAnnulable } from "./Toaster";
import { poserLesEspacesDansLaSalle } from "../espacesDansLaSalle";

// ── Réglages › Personnalisation › Mes photos, supports de travail ─────────
//
// Les photos prises avec le dictaphone, chacune avec ce qui en fait un
// support de travail (voir supportsDeTravail) : son nom, sa matière, son
// niveau, le jeu dont elle prend les règles, le matériel, l'outil,
// l'affichage du plan de travail ou l'espace de la classe qu'elle montre, la
// séquence où elle sert. Tout s'enregistre aussitôt, et passe à l'autre
// ordinateur avec la photo.
//
// « Rajoute ça, un champ exprès pour matériel pour l'enseignant et espace de
// classe » (l'enseignant, 5 novembre 2026, sur le menu « Le matériel, l'outil,
// l'affichage ou l'espace ») : sa classe n'avait encore ni outil pour
// l'enseignant ni espace, et le menu ne les montrait donc jamais. Ils ont leur
// menu, sous le premier ; il crée aussi l'outil ou l'espace d'après la photo,
// à son nom, et la photo lui sert aussitôt d'image.

type Champs = Partial<Pick<MonPicto, "mot" | "matiere" | "niveau" | "jeuId" | "elementId" | "sequenceId">>;

/**
 * Ce qu'une photo peut montrer, groupe par groupe, menu par menu : le
 * matériel, les outils pour l'élève, les affichages ; puis, à part, les outils
 * pour l'enseignant et les espaces de la classe.
 */
type ElementsMontres = { genre: string; nom: string; elements: { cle: string; titre: string }[] }[];
type MenusMontres = Record<"eleve" | "enseignant", ElementsMontres>;

/** Ce que le menu de l'enseignant crée d'après la photo, quand on le choisit. */
const NOUVEAUX = [
  { valeur: "+enseignant", nom: "＋ Nouvel outil pour l'enseignant" },
  { valeur: "+espace", nom: "＋ Nouvel espace de la classe" },
] as const;
type Nouveau = "enseignant" | "espace";

export function SupportsDeTravail() {
  const [photos, setPhotos] = React.useState<MonPicto[] | null>(null);
  const [jeux, setJeux] = React.useState<Jeu[]>([]);
  const [sequences, setSequences] = React.useState<Sequence[]>([]);
  const [bureau, setBureau] = React.useState<{ outils: OutilClasse[]; materiel: MaterielItem[]; espaces: Espace[] }>({ outils: [], materiel: [], espaces: [] });
  const montres = React.useMemo((): MenusMontres => {
    const groupe = (genre: (typeof GENRES_MONTRES)[number] | "enseignant") => ({
      genre, nom: genreDeSupport(genre).pluriel,
      elements: elementsDuBureau(genre, { ...bureau, jeux: [] }, (m) => lirePdfs(m.pdfsJson).length > 0)
        .map((e) => ({ cle: cleDeLElement(e.renvoi), titre: e.titre })),
    });
    return {
      eleve: GENRES_MONTRES.map(groupe),
      enseignant: [groupe("enseignant"), { genre: "espace", nom: ESPACES_DE_LA_CLASSE, elements: espacesMontres(bureau.espaces) }],
    };
  }, [bureau]);
  React.useEffect(() => {
    const lire = () => lireMesPictos().then((l) => setPhotos(l.filter((p) => p.origine === "photo"))).catch(() => setPhotos([]));
    void lire();
    api.jeuxList().then((l) => setJeux([...l].sort((a, b) => a.titre.localeCompare(b.titre, "fr")))).catch(() => {});
    api.sequencesList().then((l) => setSequences([...l].sort((a, b) => a.titre.localeCompare(b.titre, "fr")))).catch(() => {});
    Promise.all([
      api.outilsClasseList().catch((): OutilClasse[] => []), api.materielList().catch((): MaterielItem[] => []),
      api.espacesList().catch((): Espace[] => []),
    ]).then(([outils, materiel, espaces]) => setBureau({ outils, materiel, espaces })).catch(() => {});
    // Une photo arrivée du téléphone, ou réglée sur l'autre ordinateur.
    window.addEventListener(EVT_MES_PICTOS, lire);
    return () => window.removeEventListener(EVT_MES_PICTOS, lire);
  }, []);
  if (!photos) return null;

  const changer = async (p: MonPicto, champs: Champs) => {
    setPhotos((l) => l && l.map((x) => (x.id === p.id ? { ...x, ...champs } : x)));
    try { await changerMonPicto(p, champs); } catch (e) { toast(`Photo non enregistrée : ${e}`, { icone: "⚠️" }); }
  };

  /**
   * Un outil pour l'enseignant ou un espace de la classe, créé d'après la photo — à son nom — et qu'elle montre
   * aussitôt. Le bandeau « Annuler » (et ⌘Z) le retire et rend à la photo ce qu'elle montrait.
   */
  const creer = async (p: MonPicto, genre: Nouveau) => {
    const titre = p.mot.trim() || "Photo";
    const avant = p.elementId ?? "";
    try {
      const id = genre === "espace"
        ? (await api.espaceSave({ ...nouvelEspace(), titre })).id
        : (await api.outilClasseSave({ ...nouvelOutil("enseignant"), titre })).id;
      const recharger = () => Promise.all([api.outilsClasseList(), api.espacesList()])
        .then(([outils, espaces]) => setBureau((b) => ({ ...b, outils, espaces }))).catch(() => {});
      await recharger();
      await changer(p, { elementId: cleDeLElement({ genre, source: id }) });
      // Un espace prend aussi sa place dans le plan de classe (voir espacesDansLaSalle.ts).
      const dansLaSalle = genre === "espace" && (await poserLesEspacesDansLaSalle().catch(() => [])).some((e) => e.id === id);
      const ou = genre === "espace" ? `dans les espaces de la classe${dansLaSalle ? ", et dans l'aménagement du plan de classe" : ""}` : "dans les outils pour l'enseignant";
      toastAnnulable(`« ${titre} » ajouté au plan de travail, ${ou}.`, async () => {
        await (genre === "espace" ? api.espaceDelete(id) : api.outilClasseDelete(id));
        // La photo telle qu'elle est maintenant : un niveau changé entre-temps reste ; un autre choix fait depuis aussi.
        const actuelle = (await lireMesPictos().catch((): MonPicto[] => [])).find((x) => x.id === p.id) ?? p;
        if (actuelle.elementId === cleDeLElement({ genre, source: id })) await changer(actuelle, { elementId: avant });
        await recharger();
      }, genre === "espace" ? "🪑" : "🧑‍🏫");
    } catch (e) {
      toast(`Rien d'ajouté au plan de travail : ${e}`, { icone: "⚠️" });
    }
  };

  return (
    <>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13, lineHeight: 1.55 }}>
        Les photos prises avec le dictaphone — l'objet, le jeu de la classe — sont des supports de travail, pour l'élève qui
        n'entre pas dans l'abstraction d'un pictogramme. Donnez à chacune son nom et son niveau : « En retard » la propose alors à
        tout élève de ce niveau. Sa matière s'écrit au-dessus d'elle sur les tablettes. Un jeu de la ludothèque lui prête ses règles ;
        le matériel, l'outil, l'affichage ou l'espace de la classe qu'elle montre la prend pour image ; une séquence la montre avec
        son matériel.
      </p>
      {photos.length === 0 && (
        <p className="meta" style={{ fontSize: 13 }}>
          Aucune photo encore : dans le dictaphone, onglet Notes, « Une photo pour Mes pictos ».
        </p>
      )}
      {photos.map((p) => (
        <LigneDeSupport key={p.id} photo={p} jeux={jeux} montres={montres} sequences={sequences} onChanger={(champs) => { void changer(p, champs); }}
          onCreer={(genre) => { void creer(p, genre); }} />
      ))}
    </>
  );
}

/** Une photo : son image, son nom, et ce qui en fait un support de travail. */
function LigneDeSupport({ photo, jeux, montres, sequences, onChanger, onCreer }: {
  photo: MonPicto; jeux: Jeu[]; montres: MenusMontres; sequences: Sequence[]; onChanger: (champs: Champs) => void; onCreer: (genre: Nouveau) => void;
}) {
  const src = usePictoImage(photo.id, true);
  const complet = !!photo.niveau;
  return (
    <div className="sdt-ligne">
      <div className="sdt-image">{src ? <img src={src} alt="" /> : null}</div>
      <div className="sdt-champs">
        <input key={`${photo.id}-${photo.mot}`} className="input sdt-nom" defaultValue={photo.mot} aria-label="Le nom de la photo"
          onBlur={(e) => { const mot = e.target.value.trim(); if (mot && mot !== photo.mot) onChanger({ mot }); else e.target.value = photo.mot; }}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
        {/* Les champs en grille, chacun sous son nom : la matière et le niveau côte à côte, le jeu et la séquence deux fois plus larges ; un long titre se coupe, la ligne ne déborde plus. */}
        <div className="sdt-grille">
          <label className="sdt-champ">
            <span>Matière</span>
            <select className="select" value={photo.matiere ?? ""} aria-label={`La matière de « ${photo.mot} »`} onChange={(e) => onChanger({ matiere: e.target.value })}>
              <option value="">—</option>
              {MATIERES.map((m) => <option key={m} value={m}>{etiquetteDeMatiere(m)}</option>)}
            </select>
          </label>
          <label className="sdt-champ">
            <span>Niveau</span>
            <select className="select" value={photo.niveau ?? ""} aria-label={`Le niveau de « ${photo.mot} »`} onChange={(e) => onChanger({ niveau: e.target.value })}>
              <option value="">—</option>
              <option value={TOUS_LES_NIVEAUX}>Tous les niveaux</option>
              {NIVEAUX_SCOLAIRES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <div className="sdt-champ long sdt-pile">
            <label className="sdt-champ">
              <span>Les règles du jeu</span>
              <select className="select" value={photo.jeuId ?? ""} aria-label={`Le jeu dont « ${photo.mot} » prend les règles`} onChange={(e) => onChanger({ jeuId: e.target.value })}>
                <option value="">Aucun jeu</option>
                {jeux.map((j) => <option key={j.id} value={j.id}>{j.titre}</option>)}
              </select>
            </label>
            {/* Juste sous « Les règles du jeu » : le matériel, l'outil ou l'affichage du plan de travail qu'elle montre ; elle lui sert d'image (demande de l'enseignant, 2026-11-01).
                Puis, dans leur menu à eux, un outil pour l'enseignant ou un espace de la classe (demandes de l'enseignant, 4 et 5 novembre 2026). */}
            <MenuDeLaPhoto photo={photo} menu="eleve" titre="Le matériel, l'outil ou l'affichage" groupes={montres.eleve}
              onChoisir={(v) => onChanger({ elementId: v })} />
            <MenuDeLaPhoto photo={photo} menu="enseignant" titre={MENU_DE_L_ENSEIGNANT} groupes={montres.enseignant} nouveaux={NOUVEAUX}
              onChoisir={(v) => { const n = NOUVEAUX.find((x) => x.valeur === v); if (n) onCreer(n.valeur.slice(1) as Nouveau); else onChanger({ elementId: v }); }} />
          </div>
          <label className="sdt-champ long">
            <span>La séquence</span>
            <select className="select" value={photo.sequenceId ?? ""} aria-label={`La séquence de « ${photo.mot} »`} onChange={(e) => onChanger({ sequenceId: e.target.value })}>
              <option value="">Aucune</option>
              {sequences.map((q) => <option key={q.id} value={q.id}>{q.titre}</option>)}
            </select>
          </label>
        </div>
        {!complet && <span className="meta sdt-a-completer">Un niveau, et « En retard » la propose.</span>}
      </div>
    </div>
  );
}

/**
 * Un menu de ce que la photo montre : « Aucun », ses groupes, et ce qu'il crée d'après elle. Il ne montre que ce
 * qui est à lui — l'autre menu garde le reste ; ce qu'elle montrait et qui n'est plus sur le plan de travail, il le
 * dit, plutôt que « Aucun ».
 */
function MenuDeLaPhoto({ photo, menu, titre, groupes, nouveaux = [], onChoisir }: {
  photo: MonPicto; menu: "eleve" | "enseignant"; titre: string; groupes: ElementsMontres;
  nouveaux?: readonly { valeur: string; nom: string }[]; onChoisir: (valeur: string) => void;
}) {
  const sienne = photo.elementId && menuDeLElement(photo.elementId) === menu ? photo.elementId : "";
  const perdu = !!sienne && !groupes.some((g) => g.elements.some((e) => e.cle === sienne));
  return (
    <label className="sdt-champ">
      <span>{titre}</span>
      <select className="select" value={sienne} aria-label={`${titre} que montre « ${photo.mot} »`} onChange={(e) => onChoisir(e.target.value)}>
        <option value="">Aucun</option>
        {perdu && <option value={sienne}>N'est plus sur le plan de travail</option>}
        {groupes.filter((g) => g.elements.length).map((g) => (
          <optgroup key={g.genre} label={g.nom}>
            {g.elements.map((e) => <option key={e.cle} value={e.cle}>{e.titre}</option>)}
          </optgroup>
        ))}
        {nouveaux.length > 0 && (
          <optgroup label="Ajouter au plan de travail">
            {nouveaux.map((n) => <option key={n.valeur} value={n.valeur}>{n.nom}</option>)}
          </optgroup>
        )}
      </select>
    </label>
  );
}

/**
 * Sous le matériel d'une séquence : les photos qu'on lui a rattachées dans
 * les réglages — l'objet, le jeu de la classe —, chacune avec ses règles
 * quand elle prend celles d'un jeu. Rien sans photo rattachée.
 */
export function SupportsDeLaSequence({ sequenceId }: { sequenceId: string }) {
  const { jeux } = useLudotheque();
  const [photos, setPhotos] = React.useState<MonPicto[]>([]);
  React.useEffect(() => {
    const lire = () => lireMesPictos().then((l) => setPhotos(supportsDeLaSequence(l, sequenceId))).catch(() => setPhotos([]));
    void lire();
    window.addEventListener(EVT_MES_PICTOS, lire);
    return () => window.removeEventListener(EVT_MES_PICTOS, lire);
  }, [sequenceId]);
  if (!photos.length) return null;
  return (
    <div className="card sdt-sequence">
      <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>📷 Les supports de travail</h3>
      {photos.map((p) => <SupportDeLaSequence key={p.id} photo={p} jeu={jeux.find((j) => j.id === p.jeuId)} />)}
    </div>
  );
}

function SupportDeLaSequence({ photo, jeu }: { photo: MonPicto; jeu: Jeu | undefined }) {
  const src = usePictoImage(photo.id, true);
  return (
    <div className="sdt-ligne">
      <div className="sdt-image">{src ? <img src={src} alt="" /> : null}</div>
      <div>
        <b>{photo.mot}</b>
        <span className="meta"> · {[photo.matiere ? etiquetteDeMatiere(photo.matiere) : "", photo.niveau === TOUS_LES_NIVEAUX ? "tous niveaux" : photo.niveau ?? ""].filter(Boolean).join(" · ")}</span>
        {jeu && jeu.regles.trim() && (
          <details className="sdt-regles"><summary>Les règles de « {jeu.titre} »</summary><div style={{ whiteSpace: "pre-wrap" }}>{jeu.regles.trim()}</div></details>
        )}
      </div>
    </div>
  );
}
