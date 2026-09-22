import React from "react";
import { useNavigate } from "react-router-dom";
import { api, Creneau, Seance, Sequence, Eleve, Jeu, nouveauJeu, teinteCreneau, texteErreur, nowIso, type ObservationEleve } from "../api";
import { toast } from "./Toaster";
import { PoserObservation } from "./PoserObservation";
import { fichesANourrir } from "../observationEleve";
import { useDictee, mmss } from "../dictee";
import { natureDe } from "../heures";
import { isoJour, plusJours } from "../dates";
import {
  creneauDeLaSemainePrecedente, imagesDuTexte, ligneDeCompetence, ligneDeManuel, ligneDuManuel, poserImage,
  protegerImages, reprendrePrevu, restaurerImages, retirerImage,
} from "../cahierJournal";
import { reformuler } from "../reformulation";
import { PorterAuDossier } from "./PorterAuDossier";
import { JeuForm } from "./JeuForm";
import { ReglesDesJeux, useJeuxCites, useLudotheque } from "./ReglesDesJeux";
import { jeuxCites, nomSousLeCurseur } from "../jeuxCites";
import { ChoixSequence, SequencesCitees } from "./SequencesCitees";
import { insererLigne, ligneDeSequence, sequencesCitees, totalDesSeances } from "../sequencesCitees";
import { SeanceReadView } from "../pages/SequenceDetail";
import { ManuelDuJournal } from "./ManuelDuJournal";
import { ChoixCompetence } from "./ChoixCompetence";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { FichierImg } from "./Deroulement";

// ── Cahier journal du jour ────────────────────────────────────────────────
//
// Pour chaque créneau de l'emploi du temps : ce qui est prévu, puis ce qui a
// été fait. On l'écrit la veille, le matin ou le soir, et l'on peut revenir
// sur n'importe quel jour passé ou à venir. Au clavier ou à la voix.
//
// Tout s'enregistre seul. Seuls le prévu et le bilan sont écrits : un créneau
// déplacé entre-temps dans la grille garde sa nouvelle place.
//
// Un jeu de la ludothèque nommé dans le prévu montre sa règle juste dessous ;
// une séquence citée, ses objectifs et le déroulement de sa séance. Un manuel
// du coffre-fort se cite de même, et l'exercice qu'on y découpe se pose dans
// le prévu, à l'écran comme dans le PDF du jour. Une compétence des
// référentiels s'y pose aussi, en une ligne.

type Champ = "prevu" | "bilan";
interface Brouillon { prevu: string; bilan: string }

const LIBELLES: Record<Champ, { titre: string; aide: string }> = {
  prevu: { titre: "Prévu", aide: "Activités, supports, objectifs…" },
  bilan: { titre: "Fait · bilan", aide: "Ce qui s’est passé, ce qui reste à reprendre…" },
};

/** Ajoute une dictée à la fin d'un texte, avec la bonne séparation. */
export function ajouterDictee(texte: string, dicte: string): string {
  const d = dicte.trim();
  if (!d) return texte;
  if (!texte.trim()) return d;
  return texte.replace(/\s+$/, "") + (/[.!?…:]$/.test(texte.trim()) ? " " : ". ") + d;
}

/**
 * Écritures du cahier journal qui attendent encore leur enregistrement
 * (on n'écrit qu'après une pause de frappe).
 */
const enAttente = new Map<string, () => Promise<void>>();

/**
 * Enregistre tout de suite ce qui est tapé et pas encore écrit. Une impression
 * lancée juste après la frappe partait sans les derniers mots.
 */
export async function ecrireLeCahierJournal(): Promise<void> {
  await Promise.all([...enAttente.values()].map((ecrire) => ecrire()));
}

export function CahierJournal({ dateIso, creneaux, seances, sequences = [], eleves, onModifier }: {
  dateIso: string; creneaux: Creneau[]; seances: Seance[]; sequences?: Sequence[]; eleves: Eleve[];
  onModifier: (c: Creneau) => void;
}) {
  const navigate = useNavigate();
  const duJour = React.useMemo(
    () => creneaux.filter((c) => c.date.slice(0, 10) === dateIso).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
    [creneaux, dateIso]);

  // Brouillons locaux : la saisie ne doit jamais être écrasée par un rechargement.
  const [brouillons, setBrouillons] = React.useState<Record<string, Brouillon>>({});
  const enregistres = React.useRef<Record<string, Brouillon>>({});
  const minuteurs = React.useRef<Record<string, number>>({});
  const [etats, setEtats] = React.useState<Record<string, "enregistrement" | "ok" | "erreur">>({});

  React.useEffect(() => {
    setBrouillons((avant) => {
      const apres = { ...avant };
      for (const c of duJour) {
        const connu = enregistres.current[c.id];
        const local = avant[c.id];
        const propre = !local || (connu && local.prevu === connu.prevu && local.bilan === connu.bilan);
        if (propre) {
          apres[c.id] = { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
          enregistres.current[c.id] = { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
        }
      }
      return apres;
    });
  }, [duJour]);

  // La liste des élèves, lisible depuis l'enregistrement — qui vit plus
  // longtemps qu'un rendu.
  const elevesRef = React.useRef(eleves);
  elevesRef.current = eleves;

  const enregistrer = React.useCallback(async (id: string, b: Brouillon) => {
    setEtats((e) => ({ ...e, [id]: "enregistrement" }));
    try {
      await api.creneauJournalSave(id, b.prevu, b.bilan);
      enregistres.current[id] = b;
      setEtats((e) => ({ ...e, [id]: "ok" }));
      // Les temps d'observation posés sur ce créneau se nourrissent du bilan,
      // au fur et à mesure qu'il s'écrit.
      const aNourrir = fichesANourrir(observations.current, id, b.bilan,
        (eleveId) => elevesRef.current.find((x) => x.id === eleveId)?.nom ?? "", nowIso());
      for (const o of aNourrir) {
        await api.observationSave(o).catch(() => {});
        observations.current = observations.current.map((x) => (x.id === o.id ? o : x));
      }
    } catch (err) {
      setEtats((e) => ({ ...e, [id]: "erreur" }));
      toast("Cahier journal non enregistré : " + texteErreur(err), { icone: "⚠️", duree: 6000 });
    }
  }, []);

  // En quittant le jour ou l'écran : on écrit ce qui attendait encore.
  const aEcrire = React.useRef(brouillons);
  aEcrire.current = brouillons;

  const modifier = (id: string, champ: Champ, valeur: string, immediat = false) => {
    const b = { ...(aEcrire.current[id] ?? { prevu: "", bilan: "" }), [champ]: valeur };
    aEcrire.current = { ...aEcrire.current, [id]: b };
    setBrouillons((avant) => ({ ...avant, [id]: b }));
    window.clearTimeout(minuteurs.current[id]);
    const ecrire = () => {
      window.clearTimeout(minuteurs.current[id]);
      if (enAttente.get(id) === ecrire) enAttente.delete(id);
      return enregistrer(id, b);
    };
    enAttente.set(id, ecrire);
    minuteurs.current[id] = window.setTimeout(ecrire, immediat ? 0 : 800);
  };
  React.useEffect(() => () => {
    for (const [id, t] of Object.entries(minuteurs.current)) {
      window.clearTimeout(t);
      enAttente.delete(id);
      const b = aEcrire.current[id], e = enregistres.current[id];
      if (b && (!e || b.prevu !== e.prevu || b.bilan !== e.bilan)) api.creneauJournalSave(id, b.prevu, b.bilan).catch(() => {});
    }
    minuteurs.current = {};
  }, [dateIso]);

  // ── Dictée : un seul micro ouvert à la fois ──
  const dictee = useDictee();
  const [cible, setCible] = React.useState<{ id: string; champ: Champ } | null>(null);
  const basculerDictee = async (id: string, champ: Champ) => {
    if (dictee.etat === "repos") {
      const erreur = await dictee.demarrer();
      if (erreur) { toast(erreur, { icone: "🎙", duree: 7000 }); return; }
      setCible({ id, champ });
      return;
    }
    if (dictee.etat !== "enregistrement" || !cible || cible.id !== id || cible.champ !== champ) return;
    const { texte, erreur } = await dictee.arreter();
    setCible(null);
    if (erreur) { toast("Dictée impossible : " + erreur, { icone: "⚠️", duree: 7000 }); return; }
    const actuel = aEcrire.current[id]?.[champ] ?? "";
    modifier(id, champ, ajouterDictee(actuel, texte), true);
  };

  // ── Le prévu de la semaine dernière ──
  const reprendre = async (c: Creneau) => {
    const jour = plusJours(new Date(`${c.date.slice(0, 10)}T12:00:00`), -7);
    const nomJour = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    try {
      const avant = creneauDeLaSemainePrecedente(c, await api.creneauxList(isoJour(jour), isoJour(jour)));
      if (!avant) {
        toast(`Rien n'était prévu sur ce créneau le ${nomJour}.`, { icone: "ℹ️" });
        return;
      }
      const actuel = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
      const suite = reprendrePrevu(actuel, avant.prevu ?? "");
      if (suite === actuel) {
        toast("Le prévu de la semaine dernière est déjà là.", { icone: "ℹ️" });
        return;
      }
      modifier(c.id, "prevu", suite, true);
      toast(actuel.trim() ? `Prévu du ${nomJour} ajouté à la suite.` : `Prévu du ${nomJour} repris.`, { icone: "↩️" });
    } catch (err) {
      toast("Semaine dernière illisible : " + texteErreur(err), { icone: "⚠️" });
    }
  };

  // ── Du bilan au dossier des élèves ──
  const zones = React.useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [versDossier, setVersDossier] = React.useState<{ creneau: Creneau; texte: string; presents: string[] } | null>(null);
  const porterAuDossier = (c: Creneau, presents: string[]) => {
    const zone = zones.current[c.id];
    const bilan = aEcrire.current[c.id]?.bilan ?? c.bilan ?? "";
    // Le passage sélectionné s'il y en a un : un bilan parle souvent de plusieurs élèves.
    const selection = zone && zone.selectionEnd > zone.selectionStart ? bilan.slice(zone.selectionStart, zone.selectionEnd) : "";
    setVersDossier({ creneau: c, texte: (selection.trim() || bilan).trim(), presents });
  };

  // ── Les jeux cités dans le prévu, et leur règle ──
  const { jeux, recharger: rechargerJeux } = useLudotheque();
  const citesDans = useJeuxCites(jeux);
  const [jeuEdite, setJeuEdite] = React.useState<{ jeu: Jeu; nouveau: boolean } | null>(null);
  // Le bouton 🎲 lit le jeu là où l'on écrivait : la zone garde sa sélection
  // quand on la quitte. Une zone jamais ouverte n'a pas de curseur à lire.
  const zonesPrevu = React.useRef<Record<string, HTMLTextAreaElement | null>>({});
  const ouvertes = React.useRef(new Set<string>());
  const ajouterJeu = (c: Creneau) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    const zone = zonesPrevu.current[c.id];
    const nom = zone && ouvertes.current.has(c.id) ? nomSousLeCurseur(prevu, zone.selectionStart, zone.selectionEnd) : "";
    const connu = nom ? jeuxCites(nom, jeux)[0] : undefined;
    setJeuEdite(connu ? { jeu: connu, nouveau: false } : { jeu: { ...nouveauJeu(), titre: nom }, nouveau: true });
  };

  // ── Les séquences citées dans le prévu ──
  const [sequencePour, setSequencePour] = React.useState<Creneau | null>(null);
  const [seanceVue, setSeanceVue] = React.useState<Seance | null>(null);
  const poserSequence = (c: Creneau, sequence: Sequence, seance: Seance | null) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    const zone = zonesPrevu.current[c.id];
    const curseur = zone && ouvertes.current.has(c.id) ? zone.selectionEnd : null;
    // « séance 3/6 » : on sait tout de suite où l'on en est dans la séquence.
    modifier(c.id, "prevu", insererLigne(prevu, ligneDeSequence(sequence, seance, totalDesSeances(sequence, seances)), curseur), true);
    setSequencePour(null);
  };

  // ── Corriger les fautes, sans rien écraser ──
  //
  // L'IA relit l'orthographe et la grammaire, sans reformuler : la
  // proposition s'affiche sous le champ, et c'est l'enseignant qui la prend.
  const [correction, setCorrection] = React.useState<
    { id: string; champ: Champ; avant: string; apres: string; zone: { debut: number; fin: number } | null } | null>(null);
  const [corrigeant, setCorrigeant] = React.useState("");

  const corriger = async (c: Creneau, champ: Champ) => {
    const zone = (champ === "bilan" ? zones : zonesPrevu).current[c.id];
    const texte = aEcrire.current[c.id]?.[champ] ?? c[champ] ?? "";
    // Un passage surligné se corrige seul ; sinon, tout le champ.
    const surligne = zone && zone.selectionEnd > zone.selectionStart
      ? { debut: zone.selectionStart, fin: zone.selectionEnd } : null;
    const source = (surligne ? texte.slice(surligne.debut, surligne.fin) : texte).trim();
    if (!source) { toast("Il n'y a rien à corriger ici.", { icone: "✨" }); return; }
    setCorrigeant(`${c.id}|${champ}`);
    setCorrection(null);
    try {
      // Les images posées dans le prévu ne partent pas à l'IA : elles reviennent après.
      const { texte: sansImages, images } = protegerImages(source);
      const p = await reformuler(sansImages, "corriger");
      const propre = restaurerImages(p.texte, images);
      if (propre.trim() === source.trim()) { toast("Rien à corriger : le texte est bon.", { icone: "✨" }); return; }
      setCorrection({ id: c.id, champ, avant: source, apres: propre, zone: surligne });
    } catch (e) {
      toast("Correction impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setCorrigeant("");
    }
  };

  const appliquerCorrection = () => {
    if (!correction) return;
    const { id, champ, avant, apres, zone } = correction;
    const texte = aEcrire.current[id]?.[champ] ?? "";
    let suite: string;
    if (zone && texte.slice(zone.debut, zone.fin).trim() === avant.trim()) {
      suite = texte.slice(0, zone.debut) + apres + texte.slice(zone.fin);
    } else if (texte.trim() === avant.trim()) {
      suite = apres;
    } else {
      // Le texte a changé pendant la correction : on ne devine pas où la mettre.
      toast("Le texte a changé entre-temps : la correction n'a pas été appliquée.", { icone: "ℹ️", duree: 7000 });
      setCorrection(null);
      return;
    }
    modifier(id, champ, suite, true);
    setCorrection(null);
  };

  // ── Les manuels cités, et leurs images ──
  const [manuelPour, setManuelPour] = React.useState<Creneau | null>(null);
  // ── Une compétence posée dans le prévu, prise dans les référentiels ──
  const [competencePour, setCompetencePour] = React.useState<Creneau | null>(null);
  // Les temps d'observation posés sur les créneaux du jour : ce sont eux qui
  // récupèrent le bilan, une fois qu'il est écrit.
  const [observerPour, setObserverPour] = React.useState<Creneau | null>(null);
  const observations = React.useRef<ObservationEleve[]>([]);
  const relireObservations = React.useCallback(() => {
    api.observationsList().then((l) => { observations.current = l; }).catch(() => {});
  }, []);
  React.useEffect(() => { relireObservations(); }, [relireObservations, dateIso]);
  const poserCompetence = (c: Creneau, comp: CompetenceSelectionnee) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    const ligne = ligneDeCompetence(comp.competenceTitre, comp.referentielNom, comp.niveau ?? "");
    if (ligne) modifier(c.id, "prevu", insererLigne(prevu, ligne, curseurDe(c)), true);
    setCompetencePour(null);
  };
  /** Où écrire dans le prévu : là où était le curseur, sinon à la fin. */
  const curseurDe = (c: Creneau) => {
    const zone = zonesPrevu.current[c.id];
    return zone && ouvertes.current.has(c.id) ? zone.selectionEnd : null;
  };
  const citerManuel = (c: Creneau, manuel: string, page: number, passage: string) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    modifier(c.id, "prevu", insererLigne(prevu, ligneDeManuel(manuel, page, passage), curseurDe(c)), true);
  };
  const poserImageDuManuel = async (c: Creneau, manuel: string, page: number, base64: string) => {
    try {
      const nom = await api.fichierSave(`manuel-p${page || 1}.png`, base64);
      const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
      // L'image se range sous la ligne qui cite déjà cette page, sinon sous une
      // nouvelle : on sait toujours d'où elle vient, sans se répéter.
      const ligne = ligneDuManuel(prevu, manuel, page) ?? ligneDeManuel(manuel, page);
      modifier(c.id, "prevu", poserImage(insererLigne(prevu, ligne, curseurDe(c)), nom, ligne), true);
    } catch (err) {
      toast("Image non ajoutée : " + texteErreur(err), { icone: "⚠️", duree: 6000 });
    }
  };

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const passe = dateIso < aujourdhui;

  if (!duJour.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "30px 18px" }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>📓</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Cahier journal</div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          Aucun créneau ce jour. Posez ceux de l’emploi du temps avec « ⚡ Générer le jour » en haut de la page,
          puis écrivez ici ce qui est prévu et ce qui a été fait.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>📓 Cahier journal</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          {passe ? "Complétez ce qui a été fait" : "Notez ce qui est prévu"} · au clavier ou 🎙 à la voix
        </div>
      </div>
      {duJour.map((c) => {
        const b = brouillons[c.id] ?? { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
        const teinte = teinteCreneau(c);
        const seance = seances.find((s) => s.id === c.seanceId);
        let ids: string[] = [];
        try { ids = JSON.parse(c.elevesJson || "[]"); } catch { ids = []; }
        const prenoms = ids.map((id) => eleves.find((e) => e.id === id)?.nom.split(" ")[0]).filter(Boolean);
        const reunion = natureDe(c) === "reunion";
        const etat = etats[c.id];
        return (
          <div key={c.id} className="card" style={{ padding: "10px 12px", borderLeft: `4px solid ${teinte}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.heureDebut}–{c.heureFin}</span>
              <span style={{ fontWeight: 600 }}>{c.matiere || "Créneau"}</span>
              {reunion && <span className="badge">🗣️ Réunion · formation</span>}
              {seance && <span style={{ fontSize: 12, color: "var(--text-2)" }}>· {seance.titre}</span>}
              {prenoms.length > 0 && <span style={{ fontSize: 12, color: "var(--text-2)" }}>👥 {prenoms.join(", ")}</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: etat === "erreur" ? "#c0392b" : "var(--text-2)" }}>
                {etat === "enregistrement" ? "Enregistrement…" : etat === "ok" ? "✓ Enregistré" : etat === "erreur" ? "Non enregistré" : ""}
              </span>
              <button className="btn ghost sm" onClick={() => onModifier(c)} title="Modifier le créneau" aria-label="Modifier le créneau">✏️</button>
            </div>
            {(["prevu", "bilan"] as Champ[]).map((champ) => {
              const actif = cible?.id === c.id && cible.champ === champ;
              const occupe = dictee.etat !== "repos" && !actif;
              return (
                <div key={champ} style={{ marginTop: champ === "bilan" ? 8 : 0 }}>
                  {/* Six boutons ne tiennent pas sur une ligne étroite : ils s'y replient. */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{LIBELLES[champ].titre}</span>
                    <button className="btn ghost sm" disabled={occupe || dictee.etat === "transcription"}
                      onClick={() => basculerDictee(c.id, champ)}
                      aria-label={actif ? "Arrêter la dictée" : `Dicter : ${LIBELLES[champ].titre}`}
                      style={actif ? { background: "#dc2626", color: "#fff", borderColor: "#dc2626" } : undefined}>
                      {actif && dictee.etat === "enregistrement" ? `⏹ ${mmss(dictee.secondes)}`
                        : actif && dictee.etat === "transcription" ? "Transcription…" : "🎙"}
                    </button>
                    <button className="btn ghost sm" disabled={corrigeant === `${c.id}|${champ}`}
                      onClick={() => { void corriger(c, champ); }}
                      title="Corriger l'orthographe et la grammaire avec l'IA, sans reformuler. Surlignez un passage pour ne corriger que lui.">
                      {corrigeant === `${c.id}|${champ}` ? "Correction…" : "✨ Corriger"}
                    </button>
                    {champ === "prevu" ? (
                      <>
                        <button className="btn ghost sm" onClick={() => reprendre(c)}
                          title="Reprendre ce qui était prévu sur ce créneau la semaine dernière">↩ Semaine dernière</button>
                        <button className="btn ghost sm" onClick={() => ajouterJeu(c)}
                          title="Ajouter à la ludothèque le jeu écrit sur la ligne du curseur, avec sa règle : elle s'affichera ici dès qu'il est cité">
                          🎲 Règle d'un jeu</button>
                        <button className="btn ghost sm" onClick={() => setSequencePour(c)} disabled={!sequences.length}
                          title={sequences.length ? "Poser une séquence ou une séance dans le prévu : ses objectifs et son déroulement s'afficheront ici" : "Aucune séquence pour l'instant"}>
                          📚 Séquence</button>
                        <button className="btn ghost sm" onClick={() => setManuelPour(c)}
                          title="Citer une page d'un manuel du coffre-fort, et y découper l'exercice : son image se pose dans le prévu et s'imprime avec le jour">
                          📖 Manuel</button>
                        <button className="btn ghost sm" onClick={() => setCompetencePour(c)}
                          title="Poser une compétence des référentiels dans le prévu">
                          🎯 Compétence</button>
                      </>
                    ) : (
                      <>
                        <button className="btn ghost sm" disabled={reunion || !ids.length}
                          onClick={() => setObserverPour(c)}
                          title={ids.length
                            ? "Poser un temps d'observation sur un axe de la grille Cap école inclusive : ce bilan viendra le nourrir"
                            : "Cochez d'abord les élèves présents sur ce créneau"}>👁 Observer</button>
                        <button className="btn ghost sm" disabled={!b.bilan.trim() || reunion} onClick={() => porterAuDossier(c, ids)}
                          title="Faire du bilan, ou du passage sélectionné, une observation dans le dossier des élèves">📋 Au dossier</button>
                      </>
                    )}
                  </div>
                  <textarea className="textarea" value={b[champ]} placeholder={LIBELLES[champ].aide}
                    ref={(el) => { (champ === "bilan" ? zones : zonesPrevu).current[c.id] = el; }}
                    rows={Math.min(8, Math.max(2, b[champ].split("\n").length))}
                    onChange={(e) => modifier(c.id, champ, e.target.value)}
                    onFocus={champ === "prevu" ? () => ouvertes.current.add(c.id) : undefined}
                    aria-label={`${LIBELLES[champ].titre} — ${c.heureDebut} ${c.matiere}`}
                    style={{ width: "100%", resize: "vertical", fontSize: 13.5, lineHeight: 1.45 }} />
                  {correction?.id === c.id && correction.champ === champ && (
                    <div className="card" style={{ marginTop: 6, padding: "8px 10px", background: "var(--panel-2)" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 4 }}>
                        ✨ Correction proposée{correction.zone ? " (passage surligné)" : ""}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.45 }}>{correction.apres}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button className="btn primary sm" onClick={appliquerCorrection}>Remplacer</button>
                        <button className="btn sm" onClick={() => setCorrection(null)}>Laisser comme ça</button>
                      </div>
                    </div>
                  )}
                  {champ === "prevu" && (
                    <>
                      <ImagesDuPrevu prevu={b.prevu} onRetirer={(nom) => modifier(c.id, "prevu", retirerImage(b.prevu, nom), true)} />
                      <ReglesDesJeux jeux={citesDans(b.prevu)} onModifier={(jeu) => setJeuEdite({ jeu, nouveau: false })} />
                      <SequencesCitees citations={sequencesCitees(b.prevu, sequences, seances)} seances={seances}
                        onOuvrir={(s) => navigate(`/sequences/${s.id}`)} onVoirSeance={setSeanceVue} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
      {sequencePour && (
        <ChoixSequence sequences={sequences} seances={seances} matiere={sequencePour.matiere}
          onClose={() => setSequencePour(null)} onChoisir={(s, seance) => poserSequence(sequencePour, s, seance)} />
      )}
      {seanceVue && (
        <SeanceReadView seance={seanceVue} onClose={() => setSeanceVue(null)}
          onEdit={() => { const sid = seanceVue.sequenceId; setSeanceVue(null); if (sid) navigate(`/sequences/${sid}`); }} />
      )}
      {jeuEdite && (
        <JeuForm j={jeuEdite.jeu} nouveau={jeuEdite.nouveau} onClose={() => setJeuEdite(null)}
          onSaved={(jeu) => {
            setJeuEdite(null);
            rechargerJeux();
            toast(`« ${jeu.titre} » est dans la ludothèque${jeu.regles.trim() ? " : sa règle s'affiche là où il est cité" : ""}.`, { icone: "🎲" });
          }} />
      )}
      {versDossier && (
        <PorterAuDossier creneau={versDossier.creneau} texte={versDossier.texte} presents={versDossier.presents}
          eleves={eleves} onClose={() => setVersDossier(null)} />
      )}
      {observerPour && (
        <PoserObservation
          eleves={(() => { let ids: string[] = [];
            try { ids = JSON.parse(observerPour.elevesJson || "[]"); } catch { ids = []; }
            return eleves.filter((e) => ids.includes(e.id)); })()}
          contexte={[observerPour.matiere, seances.find((s) => s.id === observerPour.seanceId)?.titre]
            .filter(Boolean).join(" — ")}
          competence={(() => {
            const s = seances.find((x) => x.id === observerPour.seanceId);
            return [s?.competences, s?.objectifs].filter(Boolean).join(" ").slice(0, 300);
          })()}
          creneauId={observerPour.id}
          date={dateIso}
          onClose={() => setObserverPour(null)}
          onPose={relireObservations}
        />
      )}
      {competencePour && (
        <ChoixCompetence onClose={() => setCompetencePour(null)} onChoisir={(comp) => poserCompetence(competencePour, comp)} />
      )}
      {manuelPour && (
        <ManuelDuJournal onClose={() => setManuelPour(null)}
          onCiter={(manuel, page, passage) => citerManuel(manuelPour, manuel, page, passage)}
          onImage={(manuel, page, base64) => poserImageDuManuel(manuelPour, manuel, page, base64)} />
      )}
    </div>
  );
}

/** Les images posées dans le prévu : ce qu'on y a découpé, et de quoi le retirer. */
function ImagesDuPrevu({ prevu, onRetirer }: { prevu: string; onRetirer: (nom: string) => void }) {
  const images = imagesDuTexte(prevu);
  if (!images.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
      {images.map((nom) => (
        <div key={nom} style={{ position: "relative" }}>
          <FichierImg nom={nom} alt="Image du prévu"
            style={{ maxWidth: 220, maxHeight: 150, objectFit: "contain", border: "1px solid var(--border)", background: "#fff" }} />
          <button className="btn ghost sm" onClick={() => onRetirer(nom)} aria-label="Retirer cette image du prévu"
            style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.55)", color: "#fff" }}>✕</button>
        </div>
      ))}
    </div>
  );
}
