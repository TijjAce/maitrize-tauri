import React from "react";
import { useNavigate } from "react-router-dom";
import { api, Creneau, Seance, Sequence, Eleve, Jeu, journal, nouveauJeu, teinteCreneau, texteErreur, type CommentaireEleve, type MaterielItem, type ObservationEleve } from "../api";
import { toast, toastAnnulable } from "./Toaster";
import { PoserObservation } from "./PoserObservation";
import { appliquer, porterAuDossier } from "../notesDuBilan";
import { prenomsNommes, segmentsDuBilan } from "../surlignage";
import { prenomDe } from "../veilleEleve";
import { ZoneSurlignee } from "./ZoneSurlignee";
import { enAttente } from "../journalEnAttente";
import { useDictee, mmss } from "../dictee";
import { natureDe } from "../heures";
import { isoJour, plusJours } from "../dates";
import {
  creneauDeLaSemainePrecedente, imagesDuTexte, ligneDeCompetence, ligneDeManuel, ligneDuManuel, poserImage,
  protegerImages, reprendrePrevu, restaurerImages, retirerImage,
} from "../cahierJournal";
import { reformuler } from "../reformulation";
import { JeuForm } from "./JeuForm";
import { ReglesDesJeux, useJeuxCites, useLudotheque } from "./ReglesDesJeux";
import { jeuxCites, nomSousLeCurseur, regleEcrite } from "../jeuxCites";
import { ChoixSequence, SequencesCitees } from "./SequencesCitees";
import { ChoixRituel, RituelForm, RituelsCites, useRituels } from "./Rituels";
import { IndicateurZoom, useZoomPince } from "./ZoomPince";
import { useMasquesDuJournal } from "./MasquesDuJournal";
import { TapuscritVue, useTapuscritDuJournal } from "./Tapuscrit";
import { lireConsignes } from "../tapuscrit";
import { EVT_NOUVEAU_RITUEL, ligneDeRituel, nouveauRituel, rituelsCites, type Rituel } from "../rituels";
import { zoomReelDuJournal } from "../zoomPince";
import { insererLigne, ligneDeSequence, sequencesCitees, totalDesSeances } from "../sequencesCitees";
import { SeanceReadView } from "../pages/SequenceDetail";
import { ManuelDuJournal } from "./ManuelDuJournal";
import { ChoixCompetence } from "./ChoixCompetence";
import type { CompetenceSelectionnee } from "./CompetenceTree";
import { FichierImg } from "./Deroulement";
import { useAsync } from "./ui";
import { MoletteEchelle } from "./MoletteEchelle";
import { ligneDuPdf, materielDuCreneau, pdfsCites } from "../materielAImprimer";
import { ChoixPdfDuBureau } from "./SeanceParts";
import { PdfViewer } from "./PdfViewer";
import { lirePdfs } from "../materielSeance";

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
// référentiels s'y pose aussi, en une ligne. Un PDF du bureau se cite sans
// séance : il rejoint le matériel imprimé à la suite du journal.

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
  // Le matériel des séances : annoncé sous le créneau, avec la molette de son échelle à l'impression.
  const { data: materiels } = useAsync(() => api.materielList(), []);
  // Les prénoms de la classe : ce que le bilan en nomme part dans les notes, et se voit en couleur.
  const prenomsDeLaClasse = React.useMemo(() => eleves.map((e) => prenomDe(e.nom)).filter(Boolean), [eleves]);
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

  // Les élèves et les créneaux, lisibles depuis l'enregistrement — qui vit
  // plus longtemps qu'un rendu.
  const elevesRef = React.useRef(eleves);
  elevesRef.current = eleves;
  const creneauxRef = React.useRef(duJour);
  creneauxRef.current = duJour;

  const enregistrer = React.useCallback(async (id: string, b: Brouillon) => {
    setEtats((e) => ({ ...e, [id]: "enregistrement" }));
    try {
      await api.creneauJournalSave(id, b.prevu, b.bilan);
      enregistres.current[id] = b;
      setEtats((e) => ({ ...e, [id]: "ok" }));
      // Ce que le bilan dit d'un élève va dans ses notes ; les fiches posées
      // sur ce créneau avec un axe s'en nourrissent (voir notesDuBilan.ts).
      const c = creneauxRef.current.find((x) => x.id === id);
      if (!c) return;
      try {
        const porte = await porterAuDossier(c, b.bilan, { observations: observations.current, notes: notes.current, eleves: elevesRef.current });
        observations.current = appliquer(observations.current, porte.fiches);
        notes.current = appliquer(notes.current, porte.notes, porte.notesRetirees);
        if (porte.fiches.length) setFiches(observations.current);
        if (porte.nouvelles.length) {
          const prenoms = porte.nouvelles.map((e) => elevesRef.current.find((x) => x.id === e)?.nom.split(/\s+/)[0] || "l'élève");
          // « d'Aurélien », « de Louison » : l'élision suit le premier prénom.
          const de = /^[aeiouyàâäéèêëîïôöùûü]/i.test(prenoms[0] ?? "") ? "d'" : "de ";
          toast(`Porté dans les notes ${de}${prenoms.join(", ")}.`, { icone: "📋" });
        }
      } catch (err) {
        // Le bilan est enregistré ; ce qu'il porte au dossier ne l'est pas :
        // l'écran dirait « enregistré » à tort si l'on se taisait.
        journal(`ÉCHEC dossier des élèves depuis le bilan : ${texteErreur(err)}`);
        toast("Le bilan est enregistré, mais pas ce qu'il porte au dossier des élèves.", { icone: "⚠️", duree: 7000 });
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
      // La dernière écriture, celle du départ. Elle échouait sans un mot : on
      // changeait de jour et le dernier paragraphe n'existait plus nulle part.
      if (b && (!e || b.prevu !== e.prevu || b.bilan !== e.bilan)) {
        api.creneauJournalSave(id, b.prevu, b.bilan).catch((err: unknown) => {
          journal(`ÉCHEC enregistrement du cahier journal au départ : ${texteErreur(err)}`);
          toast("Les dernières lignes du cahier journal n'ont pas pu être enregistrées.",
            { icone: "⚠️", duree: 9000 });
        });
      }
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

  // Les zones du bilan : la correction lit le passage surligné.
  const zones = React.useRef<Record<string, HTMLTextAreaElement | null>>({});

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

  // ── Ce qu'on cite sans l'imprimer : une case par bloc, par créneau ──
  const { masques, basculer: masquer } = useMasquesDuJournal();
  // Le tapuscrit de la séance sous le créneau, à l'impression : coché créneau par créneau.
  const tapuscrits = useTapuscritDuJournal();

  // ── Les rituels : posés d'un clic, cités sous le prévu ──
  const { rituels, enregistrer: enregistrerRituel } = useRituels();
  const [rituelPour, setRituelPour] = React.useState<Creneau | null>(null);
  const [rituelEdite, setRituelEdite] = React.useState<{ rituel: Rituel; nouveau: boolean } | null>(null);
  const poserRituel = (c: Creneau, r: Rituel) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    const zone = zonesPrevu.current[c.id];
    const curseur = zone && ouvertes.current.has(c.id) ? zone.selectionEnd : null;
    modifier(c.id, "prevu", insererLigne(prevu, ligneDeRituel(r), curseur), true);
    setRituelPour(null);
  };
  // « Nouveau rituel » depuis la palette ⌘K ou le bureau : le formulaire, ici.
  React.useEffect(() => {
    const h = () => setRituelEdite({ rituel: nouveauRituel(), nouveau: true });
    window.addEventListener(EVT_NOUVEAU_RITUEL, h);
    return () => window.removeEventListener(EVT_NOUVEAU_RITUEL, h);
  }, []);
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
  // ── Un PDF du bureau, cité sans séance ──
  const [pdfPour, setPdfPour] = React.useState<Creneau | null>(null);
  const citerPdf = (c: Creneau, m: MaterielItem) => {
    const prevu = aEcrire.current[c.id]?.prevu ?? c.prevu ?? "";
    if (pdfsCites(prevu, [m]).length) { toast(`« ${m.titre.trim() || "Ce PDF"} » est déjà cité dans ce créneau.`, { icone: "ℹ️" }); return; }
    modifier(c.id, "prevu", insererLigne(prevu, ligneDuPdf(m), curseurDe(c)), true);
  };
  // ── Une compétence posée dans le prévu, prise dans les référentiels ──
  const [competencePour, setCompetencePour] = React.useState<Creneau | null>(null);
  // Les temps d'observation posés sur les créneaux du jour : ce sont eux qui
  // récupèrent le bilan, une fois qu'il est écrit.
  const [observerPour, setObserverPour] = React.useState<Creneau | null>(null);
  const notes = React.useRef<CommentaireEleve[]>([]);
  const observations = React.useRef<ObservationEleve[]>([]);
  const [fiches, setFiches] = React.useState<ObservationEleve[]>([]);
  const relireObservations = React.useCallback(() => {
    api.observationsList().then((l) => { observations.current = l; setFiches(l); }).catch(() => {});
    api.commentairesList().then((l) => { notes.current = l; }).catch(() => {});
  }, []);
  // Seules les observations posées sur un axe se montrent : une fiche sans axe
  // n'observe rien, et le bilan va de toute façon aux notes des élèves.
  const observationsDuCreneau = React.useCallback(
    (creneauId: string) => fiches.filter((o) => o.creneauId === creneauId && o.axe.trim()), [fiches]);
  /** Retire une observation posée par erreur ; dix secondes pour revenir en arrière. */
  const retirerObservation = async (o: ObservationEleve) => {
    try {
      await api.observationDelete(o.id);
      relireObservations();
      toastAnnulable("Observation retirée.", async () => { await api.observationSave(o); relireObservations(); });
    } catch (err) {
      toast("Observation non retirée : " + texteErreur(err), { icone: "⚠️" });
    }
  };
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

  // Le journal se zoome au pincement, comme la grille du planning à côté ; retenu par ordinateur.
  const { zoom, majZoom, cadre } = useZoomPince("journal-zoom");

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
    <div ref={cadre} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>📓 Cahier journal</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          {passe ? "Complétez ce qui a été fait" : "Notez ce qui est prévu"} · au clavier ou 🎙 à la voix · pincer (trackpad) pour zoomer
        </div>
        <div className="spacer" />
        <IndicateurZoom zoom={zoom} onReinitialiser={() => majZoom(1)} />
      </div>
      {/* Le zoom CSS agrandit tout le journal — textes, cadres, boutons — et le texte se replie à la largeur.
          Le chiffre affiché bouge deux fois plus que la taille : 60 %, c'est un journal à 80 %. */}
      <div style={{ zoom: zoomReelDuJournal(zoom), display: "flex", flexDirection: "column", gap: 10 }}>
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
                {seance && lireConsignes(seance.consignes).length > 0 && (
                  <label className="case-impression"
                    title="Coché : les consignes de la séance, traduites en pictogrammes, s'impriment sous ce créneau dans le cahier journal">
                    <input type="checkbox" checked={tapuscrits.avec.has(c.id)}
                      onChange={(e) => { void tapuscrits.poser(c.id, e.target.checked); }} />
                    <span>🖼 consignes en pictos à l'impression</span>
                  </label>
                )}
                {prenoms.length > 0 && <span style={{ fontSize: 12, color: "var(--text-2)" }}>👥 {prenoms.join(", ")}</span>}
                <span style={{ marginLeft: "auto", fontSize: 11, color: etat === "erreur" ? "#c0392b" : "var(--text-2)" }}>
                  {etat === "enregistrement" ? "Enregistrement…" : etat === "ok" ? "✓ Enregistré" : etat === "erreur" ? "Non enregistré" : ""}
                </span>
                <button className="btn ghost sm" disabled={reunion || !ids.length}
                  onClick={() => setObserverPour(c)}
                  title={ids.length
                    ? "Poser un temps d'observation sur un axe de la grille Cap école inclusive : ce bilan viendra le nourrir"
                    : "Cochez d'abord les élèves présents sur ce créneau"}>👁 Observer</button>
                <button className="btn ghost sm" onClick={() => onModifier(c)} title="Modifier le créneau" aria-label="Modifier le créneau">✏️</button>
              </div>

              {seance && tapuscrits.avec.has(c.id) && lireConsignes(seance.consignes).length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <TapuscritVue consignes={lireConsignes(seance.consignes)} compact />
                </div>
              )}
              {/* Ce qu'on a décidé d'observer sur ce créneau : la ligne est là
                  pendant la séance, sous les yeux — c'est le seul moment où
                  elle sert. */}
              {observationsDuCreneau(c.id).map((o) => {
                const prenom = eleves.find((e) => e.id === o.eleveId)?.nom.split(" ")[0] ?? "Élève";
                return (
                  <div key={o.id} className="journal-observation">
                    <span>
                      👁 <b>{prenom}</b> — {o.axe}
                      {o.domaine && <span className="meta" style={{ fontSize: 11 }}> · {o.domaine}</span>}
                    </span>
                    <button type="button" className="journal-observation-x" title="Retirer cette observation"
                      aria-label={`Retirer l'observation de ${prenom}`} onClick={() => { void retirerObservation(o); }}>×</button>
                  </div>
                );
              })}
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
                          <button className="btn ghost sm" onClick={() => setPdfPour(c)}
                            title="Citer un PDF posé sur le plan de travail, sans passer par une séance : il se voit sous le créneau et s'imprime à la suite du cahier journal">
                            📄 PDF du bureau</button>
                          <button className="btn ghost sm" onClick={() => setRituelPour(c)}
                            title="Poser un rituel dans le prévu — la date, l'appel, le calcul mental — : son déroulement s'affichera ici. On le crée aussi là.">
                            🔁 Rituel</button>
                          <button className="btn ghost sm" onClick={() => setManuelPour(c)}
                            title="Citer une page d'un manuel du coffre-fort, et y découper l'exercice : son image se pose dans le prévu et s'imprime avec le jour">
                            📖 Manuel</button>
                          <button className="btn ghost sm" onClick={() => setCompetencePour(c)}
                            title="Poser une compétence des référentiels dans le prévu">
                            🎯 Compétence</button>
                        </>
                      ) : (
                        <span className="meta journal-indication" style={{ fontSize: 12 }}
                          title="Les phrases qui nomment un élève vont dans ses notes, au dossier — en couleur pendant que vous écrivez. Le bilan s'imprime aussi en tête du cahier journal du prochain jour de classe.">
                          {(() => {
                            const nommes = prenomsNommes(b.bilan, prenomsDeLaClasse);
                            const de = /^[aeiouyàâäéèêëîïôöùûü]/i.test(nommes[0] ?? "") ? "d'" : "de ";
                            return nommes.length
                              ? <>📋 <mark className="surligne-phrase">en couleur</mark> : va dans les notes {de}{nommes.join(", ")}</>
                              : "📋 ce qui nomme un élève va dans ses notes";
                          })()}
                          {!reunion && " · 🖨 s'imprime sur le journal du lendemain"}
                        </span>
                      )}
                    </div>
                    {(() => {
                      const proprietes = {
                        value: b[champ], placeholder: LIBELLES[champ].aide,
                        rows: Math.min(8, Math.max(2, b[champ].split("\n").length)),
                        onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => modifier(c.id, champ, e.target.value),
                        onFocus: champ === "prevu" ? () => ouvertes.current.add(c.id) : undefined,
                        "aria-label": `${LIBELLES[champ].titre} — ${c.heureDebut} ${c.matiere}`,
                        style: { width: "100%", resize: "vertical", fontSize: 13.5, lineHeight: 1.45 } as React.CSSProperties,
                      };
                      // Le bilan montre en couleur ce qui part dans les notes des élèves.
                      return champ === "bilan"
                        ? <ZoneSurlignee {...proprietes} segments={segmentsDuBilan(b.bilan, prenomsDeLaClasse)}
                            ref={(el) => { zones.current[c.id] = el; }} />
                        : <textarea className="textarea" {...proprietes} ref={(el) => { zonesPrevu.current[c.id] = el; }} />;
                    })()}
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
                        {/* Les jeux du prévu, et ceux du déroulement de la séance liée : ce sont eux qui s'impriment. */}
                        <ReglesDesJeux jeux={citesDans(seance?.deroulement ? `${b.prevu}\n${seance.deroulement}` : b.prevu)} onModifier={(jeu) => setJeuEdite({ jeu, nouveau: false })}
                          masques={masques[c.id]} onMasquer={(cle) => masquer(c.id, cle)} />
                        <SequencesCitees citations={sequencesCitees(b.prevu, sequences, seances)} seances={seances}
                          onOuvrir={(s) => navigate(`/sequences/${s.id}`)} onVoirSeance={setSeanceVue}
                          masques={masques[c.id]} onMasquer={(cle) => masquer(c.id, cle)} />
                        <RituelsCites rituels={rituelsCites(b.prevu, rituels)} onModifier={(r) => setRituelEdite({ rituel: r, nouveau: false })}
                          masques={masques[c.id]} onMasquer={(cle) => masquer(c.id, cle)} />
                        <MaterielDuJournal materiels={materielDuCreneau({ seanceId: c.seanceId, prevu: b.prevu }, sequences, seances, materiels ?? [])} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {rituelPour && <ChoixRituel onClose={() => setRituelPour(null)} onChoisir={(r) => poserRituel(rituelPour, r)} />}
      {rituelEdite && (
        <RituelForm rituel={rituelEdite.rituel} nouveau={rituelEdite.nouveau} onClose={() => setRituelEdite(null)}
          onEnregistrer={(r) => { enregistrerRituel(r); if (rituelEdite.nouveau) toast(`Rituel « ${r.titre} » créé : posez-le dans un créneau avec 🔁 Rituel.`, { icone: "🔁", duree: 7000 }); }} />
      )}
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
            toast(`« ${jeu.titre} » est dans la ludothèque${regleEcrite(jeu.regles) ? " : sa règle s'affiche là où il est cité" : ""}.`, { icone: "🎲" });
          }} />
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
      {pdfPour && (
        <ChoixPdfDuBureau onClose={() => setPdfPour(null)} onPrendre={(m) => citerPdf(pdfPour, m)}
          mots={{
            titre: "Citer un PDF du bureau",
            aide: `Les PDF posés sur le plan de travail. Cité dans le prévu de ${pdfPour.heureDebut} ${pdfPour.matiere || "ce créneau"}, `
              + "le PDF se voit sous le créneau et s'imprime à la suite du cahier journal ; il reste à sa place sur le bureau.",
            bouton: "📄 Citer", enCours: "…", fait: "✓ Cité", echec: "PDF non cité",
          }} />
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
/**
 * Le matériel qui suivra le journal à l'impression, avec la molette de son
 * échelle : c'est ici qu'on voit la feuille partir, c'est ici qu'on la règle.
 */
function MaterielDuJournal({ materiels }: { materiels: MaterielItem[] }) {
  const [vu, setVu] = React.useState<{ nom: string; titre: string; materiel: MaterielItem } | null>(null);
  if (!materiels.length) return null;
  return (
    <div className="journal-materiel">
      <div className="journal-materiel-titre">🖨 Matériel à imprimer, joint à la suite du journal</div>
      {materiels.map((m) => {
        const premier = lirePdfs(m.pdfsJson)[0];
        const titre = m.titre.trim() || "Matériel";
        return (
          <div key={m.id} className="journal-materiel-ligne">
            {premier
              ? <button type="button" className="lien journal-materiel-nom" title="Voir le PDF" onClick={() => setVu({ nom: premier, titre, materiel: m })}>📄 {titre}</button>
              : <span className="journal-materiel-nom">📄 {titre}</span>}
            <MoletteEchelle materiel={m} compact />
          </div>
        );
      })}
      {vu && <PdfViewer nomFichier={vu.nom} titre={vu.titre} materiel={vu.materiel} onClose={() => setVu(null)} />}
    </div>
  );
}

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
