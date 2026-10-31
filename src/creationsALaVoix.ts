// Créer à la voix, par la télécommande : une séquence, une séquence toute faite, une séance (voir telecommande.ts pour ce
// qui est compris). Chaque création se demande d'abord sur le téléphone — « Créer la séquence « Les volcans » (CM1,
// période 2) ? » — et ne se fait qu'après le « oui ». Puis elle s'affiche au tableau, et « Annule » la retire, comme ⌘Z,
// le temps du bandeau.

import { api, couleurPourMatiere, nouvelleSeance, nouvelleSequence, nowIso, texteErreur, type ReponseTelecommande, type Sequence } from "./api";
import { toast, toastAnnulable } from "./components/Toaster";
import { jourDit, nommesParmi, type Compris } from "./telecommande";

/** Pose la question sur le téléphone ; `faire` attend son « oui ». */
export type Demander = (question: string, faire: () => Promise<ReponseTelecommande>) => ReponseTelecommande;
type Nav = (to: string) => void;

const CYCLES: Record<string, string> = { PS: "Cycle 1", MS: "Cycle 1", GS: "Cycle 1", CP: "Cycle 2", CE1: "Cycle 2", CE2: "Cycle 2", CM1: "Cycle 3", CM2: "Cycle 3" };

/** La période du jour, d'après les vacances de la zone ; la première, faute de mieux. */
async function periodeDuMoment(): Promise<number> {
  const { chargerVacances, periodeDuJour } = await import("./vacances");
  const jour = nowIso().slice(0, 10);
  const vacances = await chargerVacances(jour).catch(() => []);
  return periodeDuJour(jour, Array.isArray(vacances) ? vacances : []) || 1;
}

/** « Annuler » : la séquence s'en va avec ses séances ; le tableau revient au plan de travail s'il la montrait. */
function retirerLaSequence(id: string, nav: Nav) {
  return async () => {
    await api.sequenceDelete(id);
    if (window.location.hash.includes(id)) nav("/plan");
  };
}

/** « au CP », « en GS ». */
const aLaClasse = (classe: string) => `${/^[PMG]S$/.test(classe) ? "en" : "au"} ${classe}`;

/** Quelques titres, pour qu'on choisisse en les disant. */
const enListe = (titres: string[]) => `${titres.slice(0, 3).map((t) => `« ${t} »`).join(", ")}${titres.length > 3 ? "…" : ""}`;

/** Une séquence vide, à son titre, sa classe, sa période et sa matière : on la remplira ensuite. */
export async function sequenceACreer(c: Extract<Compris, { genre: "creerSequence" }>, nav: Nav, demander: Demander): Promise<ReponseTelecommande> {
  const periode = c.periode ?? await periodeDuMoment();
  const precisions = [c.matiere, c.classe, `période ${periode}`].filter(Boolean).join(", ");
  return demander(`Créer la séquence « ${c.titre} » (${precisions}) ?`, async () => {
    const s: Sequence = {
      ...nouvelleSequence(), titre: c.titre, matiere: c.matiere ?? "", niveau: c.classe ?? "", periode, cycle: c.classe ? CYCLES[c.classe] : "",
      couleur: c.matiere ? couleurPourMatiere(c.matiere) : "blue", dateMaj: nowIso(),
    };
    await api.sequenceSave(s);
    nav(`/sequences/${s.id}`);
    toastAnnulable(`Séquence « ${s.titre} » créée.`, retirerLaSequence(s.id, nav), "📚");
    return { ok: true, fait: `Séquence « ${s.titre} » créée. « Annule » la retire.` };
  });
}

/**
 * Une séquence toute faite, celle que le titre nomme à la classe dite : ses séances et ses feuilles, comme le bouton
 * « Créer la séquence » de Fabriquer. Sa période : celle qu'on a dite, celle qu'on lui a donnée dans Fabriquer, celle
 * d'un texte, celle que Maitrize propose, sinon celle du jour. Ses feuilles se fabriquent après le « oui », le temps
 * qu'il faut : la séquence s'affiche quand elle est prête.
 */
export async function sequenceToutefaiteACreer(c: Extract<Compris, { genre: "creerSequence" }>, nav: Nav, demander: Demander): Promise<ReponseTelecommande> {
  const stf = await import("./sequencesToutesFaites");
  const toutes = stf.sequencesToutesFaites().filter((s) => !c.classe || s.classe === c.classe);
  const trouvees = nommesParmi(c.titre, toutes.map((s) => ({ titre: s.demarche.nom, valeur: s })));
  if (!trouvees.length) return { ok: false, fait: `Aucune séquence toute faite ne parle de « ${c.titre} »${c.classe ? ` ${aLaClasse(c.classe)}` : ""}.` };
  const noms = [...new Set(trouvees.map((s) => stf.nomDansLeDossier(s.demarche.nom)))];
  if (noms.length > 1) return { ok: false, fait: `Laquelle ? ${enListe(noms)}. Dites quelques mots de son titre.` };
  if (trouvees.length > 1) return { ok: false, fait: `Pour quelle classe ? ${trouvees.map((s) => s.classe).join(", ")}. Dites par exemple « … ${aLaClasse(trouvees[0].classe)} ».` };
  const s = trouvees[0];
  const { periodeProposee } = await import("./periodesProposees");
  const choisies = stf.lirePeriodes(await api.settingGet(stf.CLE_PERIODES).catch(() => null));
  const periode = c.periode ?? choisies[s.cle] ?? stf.repereDeLaDemarche(s.demarche.id, s.classe)?.periode
    ?? periodeProposee(s.demarche.id, s.classe)?.periode ?? await periodeDuMoment();
  const competence = stf.competenceDeLaDemarche(await api.referentielsList().catch(() => []), s.demarche.id, s.classe, periode);
  // En maternelle, les feuilles faites de pictogrammes attendent leurs images (voir sequencesDeMaternelle.ts).
  const { estUneSection, feuillesEnPictos } = await import("./sequencesDeMaternelle");
  const enPictos = estUneSection(s.classe) ? feuillesEnPictos(s.demarche.id, s.classe, competence?.competenceTitre ?? "") : null;
  const images = enPictos ? await (await import("./components/ChoixPicto")).chargerImages(enPictos.ids).catch(() => ({})) : undefined;
  const tout = stf.planToutFait(s.demarche, s.classe, periode, { calculMental: true, competence: competence?.competenceTitre, images });
  const n = tout.demarche.seances.length;
  return demander(`Créer la séquence toute faite « ${s.demarche.nom} » (période ${periode}) : ${n} séances et leurs feuilles ?`, async () => {
    const [{ seanceDeLaParole }, { graineAuHasard }] = await Promise.all([import("./aidesDesSequences"), import("./hasard")]);
    void stf.creerLaSequenceToutefaite({
      tout, classe: s.classe, periode, titre: s.demarche.nom, competence, graine: graineAuHasard(),
      aides: { sequentiel: true, parole: seanceDeLaParole(tout.demarche.seances) },
      onEchec: (t, e) => toast(`« ${t} » n'a pas pu être fabriquée : ${String(e)}`, { icone: "⚠️" }),
    }).then((r) => {
      nav(`/sequences/${r.sequence.id}`);
      const total = r.feuilles + r.aides;
      toastAnnulable(`Séquence créée : ${r.seances} séances, ${total} feuille${total > 1 ? "s" : ""}.`, retirerLaSequence(r.sequence.id, nav), "📚");
    }).catch((e) => toast("Séquence non créée : " + texteErreur(e), { icone: "⚠️", duree: 8000 }));
    return { ok: true, fait: `« ${s.demarche.nom} » se crée : elle s'affichera au tableau dès qu'elle sera prête.` };
  });
}

/** La séquence à l'écran : sa page, ou celle d'une de ses séances. */
async function sequenceAffichee(sequences: Sequence[]): Promise<Sequence | undefined> {
  const [, page, id] = /^#\/(sequences|seances)\/([^/?]+)/.exec(window.location.hash) ?? [];
  if (page === "sequences") return sequences.find((s) => s.id === id);
  if (page === "seances") {
    const seance = (await api.seancesList().catch(() => [])).find((x) => x.id === id);
    return sequences.find((s) => s.id === seance?.sequenceId);
  }
  return undefined;
}

/** Une séance de plus, à la suite des séances de sa séquence : son titre, son jour, sa durée. */
export async function seanceACreer(c: Extract<Compris, { genre: "creerSeance" }>, nav: Nav, demander: Demander): Promise<ReponseTelecommande> {
  const sequences = await api.sequencesList();
  let seq: Sequence | undefined;
  if (c.sequenceId) seq = sequences.find((s) => s.id === c.sequenceId);
  else if (c.sequence) {
    const trouvees = nommesParmi(c.sequence, sequences.map((s) => ({ titre: s.titre, valeur: s })));
    if (trouvees.length > 1) return { ok: false, fait: `Quelle séquence ? ${enListe(trouvees.map((s) => s.titre))}.` };
    if (!trouvees.length) return { ok: false, fait: `Aucune séquence ne s'appelle « ${c.sequence} ».` };
    seq = trouvees[0];
  } else seq = await sequenceAffichee(sequences);
  if (!seq) return { ok: false, fait: "Dans quelle séquence ? Dites par exemple « ajoute une séance à la séquence des volcans », ou affichez-la d'abord." };
  const sequence = seq;
  const seances = await api.seancesList(sequence.id).catch(() => []);
  const numero = Math.max(0, ...seances.map((x) => x.numero)) + 1;
  const date = c.jour ? jourDit(c.jour, nowIso().slice(0, 10)) : null;
  const quand = date ? `, ${new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}` : "";
  const duree = c.duree ? `, ${c.duree} min` : "";
  return demander(`Créer la séance ${numero}${c.titre ? ` « ${c.titre} »` : ""} dans « ${sequence.titre} »${quand}${duree} ?`, async () => {
    const seance = { ...nouvelleSeance(sequence.id, numero), titre: c.titre, date, duree: c.duree ?? 45, dateMaj: nowIso() };
    await api.seanceSave(seance);
    nav(`/seances/${seance.id}`);
    toastAnnulable(`Séance ${numero} créée dans « ${sequence.titre} ».`, async () => {
      await api.seanceDelete(seance.id);
      if (window.location.hash.includes(seance.id)) nav(`/sequences/${sequence.id}`);
    }, "📚");
    return { ok: true, fait: `Séance ${numero} créée dans « ${sequence.titre} ». « Annule » la retire.` };
  });
}
