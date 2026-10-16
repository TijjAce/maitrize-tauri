import React from "react";
import { useNavigate } from "react-router-dom";
import { api, NIVEAUX_SCOLAIRES, type Creneau, type Eleve } from "../api";
import { Input, Modal, ouvrirOnglet, useAsync } from "./ui";
import { toast } from "./Toaster";
import { chargerVacances, periodeDuJour } from "../vacances";
import { ficheDeLEleve } from "../impressionAtelier";
import {
  CLE_MINUTEURS_RETARD, fabricationsDesFiches, lireMinuteursRetard, minuteurDeLaRecette,
  combienDeFiches, dossierDuJour, elevesDuJour, graineDe, iconeDeLaRecette, jourEnLettres, niveauDesFiches, nomDeLaRecette, prenomDe,
  prevuEnAutonomie, proposer, recetteDe, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus,
  type EleveDuJour, type FicheProposee, type NiveauFiches, type OutilsFiche,
  recettesDesSupports, type RecetteDeFiche, type SupportDonne,
  creneauDeLaFiche, detailDeLaSeance, estUneSeance, ligneDeLaSeance, recettesDesSeances,
} from "../fichesAutonomie";
import { lireMesPictos, imageDeMonPicto } from "../mesPictos";
import { estUnSupport } from "../supportsDeTravail";
import { dureeDuMinuteur, minuteurDeLaSeance, MINUTEURS_DES_TABLETTES } from "../journalTelephone";
import { usePictoImage } from "./ChoixPicto";
import { ligneDuPdf } from "../materielAImprimer";
import { suivisDesSequences, type SuiviSequence } from "../suiviSequences";

// « En retard » : pour chaque élève de la journée, des fiches à faire seul,
// à son niveau (voir `fichesAutonomie`). On voit ce qui est proposé, on en
// change une, on en retire, on en ajoute ; puis tout se fabrique, se range
// sur le bureau et s'écrit au cahier journal. Chaque fiche reçoit aussi le
// temps de sa sorte (Réglages › En retard) : depuis le créneau qui la cite,
// le téléphone envoie aux tablettes sa consigne et ce minuteur. Il se règle
// ici, à la fabrication, et plus après. La séance qui vient d'une séquence
// que l'élève suit ne se fabrique pas : elle s'écrit au journal, ligne 📚.

/** Le 1er août de l'année scolaire d'un jour : d'où le suivi des séquences lit les créneaux. */
const debutDeLAnnee = (jour: string) => {
  const an = Number(jour.slice(0, 4));
  return `${Number(jour.slice(5, 7)) >= 8 ? an : an - 1}-08-01`;
};

/** Une fiche proposée, et son minuteur sur les tablettes, en minutes (0 : aucun). */
type FicheDuJour = FicheProposee & { minuteur: number };
interface Ligne { niveau: NiveauFiches | null; inclus: boolean; fiches: FicheDuJour[] }

/** Les durées d'un minuteur de fiche, « sans » d'abord. */
function ChoixDuMinuteur({ valeur, onChange, disabled, libelle }: { valeur: number; onChange: (m: number) => void; disabled?: boolean; libelle: string }) {
  return (
    <select className="select retard-minuteur" value={valeur} disabled={disabled} aria-label={libelle} title={libelle}
      onChange={(e) => onChange(Number(e.target.value))}>
      <option value={0}>⏱ sans minuteur</option>
      {MINUTEURS_DES_TABLETTES.map((m) => <option key={m} value={m}>⏱ {dureeDuMinuteur(m)}</option>)}
    </select>
  );
}

const hhmm = (h: string) => h.slice(0, 5);

/** L'image d'une fiche, en grand : la photo d'un atelier de la classe, l'icône de son atelier pour les autres. */
function IconeDeLaFiche({ recette }: { recette: RecetteDeFiche }) {
  const photo = usePictoImage(recette.support?.photo ?? null, true);
  return (
    <span className="retard-icone" aria-hidden="true">
      {recette.support && photo ? <img src={photo} alt="" /> : iconeDeLaRecette(recette)}
    </span>
  );
}

/** Les pictogrammes de la banque installée sur l'ordinateur. */
const OUTILS: OutilsFiche = {
  image: async (id) => {
    try { return `data:image/png;base64,${await api.arasaacImage(id)}`; } catch { return null; }
  },
  pictos: async (mots) => {
    const [trouves] = await api.arasaacParMots(mots);
    return Object.fromEntries(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  },
};

/**
 * La photo d'un support, réduite à 900 points de côté : la fiche et sa consigne pour les tablettes — gardée avec
 * la fiche — la portent sans peser les mégaoctets d'une photo de téléphone.
 */
async function photoReduite(id: number): Promise<string> {
  const brute = await imageDeMonPicto(id);
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight, 1));
      const toile = document.createElement("canvas");
      toile.width = Math.max(1, Math.round(img.naturalWidth * echelle));
      toile.height = Math.max(1, Math.round(img.naturalHeight * echelle));
      const g = toile.getContext("2d");
      if (!g) { ok(brute); return; }
      g.fillStyle = "#fff";
      g.fillRect(0, 0, toile.width, toile.height);
      g.drawImage(img, 0, 0, toile.width, toile.height);
      ok(toile.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => ok(brute);
    img.src = brute;
  });
}

export function EnRetard({ jourInitial, onClose, onFini }: {
  jourInitial: string; onClose: () => void; onFini: (jour: string) => void;
}) {
  const nav = useNavigate();
  const [jour, setJour] = React.useState(jourInitial);
  const [donnees, setDonnees] = React.useState<{
    jour: string; creneaux: Creneau[]; eleves: Eleve[]; periode: number;
    /** Le suivi des séquences à ce jour, et les créneaux de l'année où leurs séances sont passées. */
    suivis: SuiviSequence[]; creneauxDeLAnnee: Map<string, Creneau>;
  } | null>(null);
  const [tirage, setTirage] = React.useState(0);
  const [lignes, setLignes] = React.useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = React.useState<{ fait: number; total: number; quoi: string } | null>(null);
  // Le téléphone relié, le minuteur de chaque fiche se voit, et se change pour celle-ci.
  const { data: telephone } = useAsync(() => api.telephoneEtat(), []);
  // Le temps de chaque sorte de fiche, réglé dans Réglages › En retard ; rien ne se propose avant de le connaître.
  const [minuteurs, setMinuteurs] = React.useState<Record<string, number> | null>(null);
  React.useEffect(() => {
    api.settingGet(CLE_MINUTEURS_RETARD).then((brut) => setMinuteurs(lireMinuteursRetard(brut))).catch(() => setMinuteurs({}));
  }, []);
  // Les photos réglées comme supports de travail (Réglages › Personnalisation) : des fiches de plus, pour leur niveau.
  const [supports, setSupports] = React.useState<RecetteDeFiche[] | null>(null);
  React.useEffect(() => {
    void (async () => {
      const [photos, jeux] = await Promise.all([lireMesPictos().catch(() => []), api.jeuxList().catch(() => [])]);
      const donnes: SupportDonne[] = photos.filter(estUnSupport).map((photo) => {
        const jeu = jeux.find((j) => j.id === photo.jeuId);
        return { photo, jeu: jeu?.titre ?? "", regles: jeu?.regles ?? "" };
      });
      setSupports(recettesDesSupports(donnes, photoReduite));
    })();
  }, []);
  /** Une fiche, avec le temps de sa sorte. */
  const avecSonTemps = React.useCallback((f: FicheProposee): FicheDuJour => ({ ...f, minuteur: minuteurDeLaRecette(f.recette, minuteurs ?? {}) }), [minuteurs]);

  React.useEffect(() => {
    let vivant = true;
    void (async () => {
      const [creneaux, eleves, vacances, sequences, seances, deLAnnee] = await Promise.all([
        api.creneauxList(jour, jour).catch((): Creneau[] => []), api.elevesList().catch((): Eleve[] => []), chargerVacances(jour).catch(() => []),
        api.sequencesList().catch(() => []), api.seancesList().catch(() => []), api.creneauxList(debutDeLAnnee(jour), jour).catch((): Creneau[] => []),
      ]);
      const suivis = [...suivisDesSequences(sequences, seances, deLAnnee, jour).values()];
      if (vivant) setDonnees({ jour, creneaux, eleves, periode: periodeDuJour(jour, vacances), suivis, creneauxDeLAnnee: new Map(deLAnnee.map((c) => [c.id, c])) });
    })();
    return () => { vivant = false; };
  }, [jour]);

  const journee = React.useMemo(() => (donnees ? elevesDuJour(donnees.creneaux, donnees.eleves) : null), [donnees]);
  const periode = donnees?.periode ?? 1;

  // La séance qui vient de chaque séquence que suit chaque élève de la journée.
  const seancesDe = React.useMemo(() => (donnees && journee
    ? new Map(journee.presents.map(({ eleve }) => [eleve.id, recettesDesSeances(eleve.id, donnees.suivis, donnees.creneauxDeLAnnee)]))
    : null), [donnees, journee]);
  /** Ce qu'un élève peut recevoir en plus des fiches de Fabriquer : les ateliers en photo, et ses séances. */
  const extrasDe = React.useCallback((eleveId: string): RecetteDeFiche[] => [...(supports ?? []), ...(seancesDe?.get(eleveId) ?? [])], [supports, seancesDe]);

  /** Ce qu'on propose à un élève, à ce niveau, pour ce tirage. */
  const propositions = React.useCallback((eleve: Eleve, creneaux: Creneau[], niveau: NiveauFiches | null): Ligne => ({
    niveau, inclus: niveau !== null,
    fiches: niveau
      ? proposer(niveau, periode, eleve.nonVerbal ?? false, combienDeFiches(niveau, creneaux.length), graineDe(`${eleve.id}|${jour}|${tirage}`),
        eleve.fichesExclues ?? [], extrasDe(eleve.id))
        .map(avecSonTemps)
      : [],
  }), [periode, jour, tirage, avecSonTemps, extrasDe]);

  React.useEffect(() => {
    if (!journee || !minuteurs || !supports || !seancesDe) return;
    setLignes(Object.fromEntries(journee.presents.map(({ eleve, creneaux }) => [eleve.id, propositions(eleve, creneaux, niveauDesFiches(eleve.niveau))])));
  }, [journee, minuteurs, propositions]); // eslint-disable-line react-hooks/exhaustive-deps

  const changer = (id: string, f: (l: Ligne) => Ligne) => setLignes((avant) => (avant[id] ? { ...avant, [id]: f(avant[id]) } : avant));

  /** Un élève sans niveau : on le dit ici, et sa fiche le garde. */
  const choisirNiveau = (p: EleveDuJour, niveau: string) => {
    const n = niveauDesFiches(niveau);
    setLignes((avant) => ({ ...avant, [p.eleve.id]: propositions(p.eleve, p.creneaux, n) }));
    if (niveau) api.eleveSave({ ...p.eleve, niveau }).catch(() => toast("Le niveau n'a pas pu s'enregistrer sur sa fiche.", { icone: "⚠️" }));
  };

  // Les fiches à fabriquer, et les séances qui s'écrivent seulement au journal.
  const compte = Object.values(lignes).reduce((n, l) => {
    if (l.inclus) for (const f of l.fiches) { if (estUneSeance(f.recette)) n.seances++; else n.fiches++; }
    return n;
  }, { fiches: 0, seances: 0 });
  const total = compte.fiches + compte.seances;
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;
  const aFaire = [compte.fiches ? `Fabriquer ${pluriel(compte.fiches, "fiche")}` : "", compte.seances ? `${compte.fiches ? "poser" : "Poser"} ${pluriel(compte.seances, "séance")}` : ""]
    .filter(Boolean).join(" et ") || "Fabriquer 0 fiche";

  const fabriquer = async () => {
    if (!journee || !total) return;
    const pris = new Set((await api.materielList().catch(() => [])).map((m) => m.titre.trim().toLowerCase()));
    // Les lignes à écrire au prévu de chaque créneau : 📄 pour une fiche, 📚 pour une séance.
    const parCreneau = new Map<string, string[]>();
    const poser = (creneauId: string, ligne: string) => parCreneau.set(creneauId, [...(parCreneau.get(creneauId) ?? []), ligne]);
    const echecs: string[] = [];
    let fait = 0;
    let fiches = 0;
    let seances = 0;
    for (const { eleve, creneaux } of journee.presents) {
      const l = lignes[eleve.id];
      if (!l?.inclus || !l.niveau) continue;
      const ou = repartir(l.fiches.length, creneaux.length);
      for (const [i, f] of l.fiches.entries()) {
        const recette = recetteDe(f.recette, extrasDe(eleve.id));
        if (!recette) continue;
        const c = { niveau: l.niveau, periode, prenom: prenomDe(eleve) };
        const creneau = creneaux[creneauDeLaFiche(recette, creneaux, ou[i])];
        if (recette.seance) {
          poser(creneau.id, ligneDeLaSeance(recette, c.prenom));
          seances++;
          fait++;
          continue;
        }
        const nom = nomDeLaRecette(recette, c);
        setEnCours({ fait, total, quoi: `${c.prenom} — ${nom}` });
        try {
          const { html, style, refaire } = await recette.fabriquer(c, f.graine, OUTILS);
          const titre = titreLibre(titreDeLaFiche(nom, c.prenom, jour), pris);
          await ficheDeLEleve(recette.atelier, titre, html, style, { prenom: c.prenom, date: jourEnLettres(jour), dossier: dossierDuJour(jour) },
            { memoires: refaire, graine: f.graine, ...(f.minuteur ? { minuteur: f.minuteur } : {}), ...(recette.support ? { support: recette.support } : {}) });
          poser(creneau.id, ligneDuPdf({ titre }));
          fiches++;
        } catch {
          echecs.push(`${c.prenom} : ${nom}`);
        }
        fait++;
      }
    }
    // Le prévu relu juste avant d'écrire : ce qu'on vient d'y taper reste.
    setEnCours({ fait, total, quoi: "Le cahier journal" });
    const frais = await api.creneauxList(jour, jour).catch((): Creneau[] => []);
    for (const [id, lignesDuCreneau] of parCreneau) {
      const c = frais.find((x) => x.id === id);
      if (c) await api.creneauJournalSave(id, prevuEnAutonomie(c.prevu ?? "", lignesDuCreneau), c.bilan ?? "").catch(() => echecs.push(`le journal de ${hhmm(c.heureDebut)}`));
    }
    setEnCours(null);
    toast([
      fiches ? `${pluriel(fiches, "fiche")} d'autonomie dans le cahier journal du ${jourEnLettres(jour)}, sur le bureau dans « Fiches d'autonomie ».` : "",
      seances ? `${pluriel(seances, "séance")} à suivre, posée${seances > 1 ? "s" : ""} au cahier journal${fiches ? "" : ` du ${jourEnLettres(jour)}`}.` : "",
      echecs.length ? `${echecs.length} n'${echecs.length > 1 ? "ont" : "a"} pas pu se faire : ${echecs.join(", ")}.` : "",
    ].filter(Boolean).join(" "), { icone: echecs.length ? "⚠️" : "⏰", duree: 12000 });
    onFini(jour);
  };

  const occupe = enCours !== null;

  return (
    <Modal titre="⏰ En retard : des fiches à faire seul" large onClose={() => { if (!occupe) onClose(); }}
      footer={<>
        <button className="btn ghost" disabled={occupe || !journee?.presents.length} onClick={() => setTirage((t) => t + 1)}
          title="Tirer d'autres fiches pour tout le monde">🎲 Autre tirage</button>
        <span style={{ flex: 1 }} />
        <button className="btn" disabled={occupe} onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={occupe || !total} onClick={() => void fabriquer()}>
          {occupe ? `Fiche ${Math.min(enCours.fait + 1, enCours.total)} sur ${enCours.total}…` : aFaire}
        </button>
      </>}>
      <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
        <div style={{ flex: "0 0 170px" }}>
          <Input type="date" value={jour} disabled={occupe} onChange={(e) => { if (e.target.value) { setJour(e.target.value); setTirage(0); } }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {jourEnLettres(jour)} · période {periode}
        </div>
        {telephone?.relie && (
          <button type="button" className="lien retard-minuteur-tous" disabled={occupe}
            title="Le temps de chaque sorte de fiche, qu'elle emporte à sa fabrication : le téléphone l'envoie aux tablettes avec sa consigne, depuis le créneau."
            onClick={() => { onClose(); nav("/reglages"); setTimeout(() => ouvrirOnglet("reglages", "retard"), 140); }}>⏱ Le temps de chaque fiche : Réglages › En retard</button>
        )}
      </div>
      <p className="meta" style={{ fontSize: 12.5, marginTop: 0 }}>
        Pour chaque élève de la journée, des fiches à son niveau tirées des ateliers de Fabriquer, un atelier en photo de Mes pictos s'il y en
        a un à son niveau, et la séance qui vient de chaque séquence qu'il suit : trois en maternelle, quatre du CP au CE2, une au moins par
        créneau. Pas de fiche de lecture pour un élève non verbal. Tout s'écrit à son nom au cahier journal de son créneau, à la suite, et
        s'imprime avec lui.
      </p>
      {enCours && (
        <div className="retard-avance" role="status">
          <div className="retard-barre"><span style={{ width: `${Math.round((100 * enCours.fait) / Math.max(1, enCours.total))}%` }} /></div>
          <span>{enCours.quoi}</span>
        </div>
      )}
      {!journee ? <div className="meta">Lecture de la journée…</div>
        : !journee.presents.length ? (
          <div className="empty" style={{ padding: "28px 12px" }}>
            <div className="big">🗓️</div>
            Aucun créneau de classe ce jour-là. Remplissez la journée depuis l'emploi du temps, dans le planning, puis revenez ici.
          </div>
        ) : <>
          {journee.presents.map((p) => {
            const l = lignes[p.eleve.id];
            if (!l) return null;
            const ou = repartir(l.fiches.length, p.creneaux.length);
            const ctx = l.niveau ? { niveau: l.niveau, periode, prenom: prenomDe(p.eleve) } : null;
            const extras = extrasDe(p.eleve.id);
            return (
              <div key={p.eleve.id} className={`card retard-eleve${l.inclus ? "" : " exclu"}`}>
                <div className="retard-tete">
                  <label className="pb-coche" style={{ margin: 0 }}>
                    <input type="checkbox" checked={l.inclus} disabled={occupe || !l.niveau}
                      onChange={(e) => changer(p.eleve.id, (x) => ({ ...x, inclus: e.target.checked }))} />
                    <b>{p.eleve.nom}</b>
                  </label>
                  {l.niveau
                    ? <span className="badge">{p.eleve.niveau || l.niveau}</span>
                    : <select className="select" style={{ width: "auto", padding: "3px 8px" }} value="" disabled={occupe}
                      onChange={(e) => choisirNiveau(p, e.target.value)}>
                      <option value="">Niveau à préciser…</option>
                      {NIVEAUX_SCOLAIRES.map((n) => <option key={n}>{n}</option>)}
                    </select>}
                  {p.eleve.nonVerbal && <span className="chip" title="Pas de fiche de lecture">🔇 non verbal</span>}
                  {(p.eleve.fichesExclues?.length ?? 0) > 0 && (
                    <span className="chip" title="Écartées dans sa fiche d'élève">🚫 sans {p.eleve.fichesExclues!.map((a) => fabricationsDesFiches(null).find((f) => f.atelier === a)?.nom.toLowerCase() ?? a).join(", ")}</span>
                  )}
                  <span className="retard-creneaux">{p.creneaux.map((c) => `${hhmm(c.heureDebut)} ${c.matiere}`).join(" · ")}</span>
                </div>
                {l.inclus && ctx && <>
                  <ol className="retard-fiches">
                    {l.fiches.map((f, i) => {
                      const r = recetteDe(f.recette, extras);
                      if (!r) return null;
                      return (
                        <li key={`${i}-${f.recette}-${f.graine}`}>
                          <IconeDeLaFiche recette={r} />
                          <span className="retard-nom">
                            <span className="retard-titre">{nomDeLaRecette(r, ctx)}</span>
                            {r.seance && <span className="retard-detail" title={detailDeLaSeance(r)}>{detailDeLaSeance(r)}</span>}
                          </span>
                          {p.creneaux.length > 1 && <span className="retard-ou">{hhmm(p.creneaux[creneauDeLaFiche(r, p.creneaux, ou[i])].heureDebut)}</span>}
                          {/* Une séance a son temps à elle, sa durée : il part avec elle à la tablette de l'élève. */}
                          {r.seance && minuteurDeLaSeance(r.seance.seance) > 0 && (
                            <span className="retard-duree" title="La durée de la séance : le minuteur de la tablette">⏱ {dureeDuMinuteur(minuteurDeLaSeance(r.seance.seance))}</span>
                          )}
                          {telephone?.relie && !r.seance && (
                            <ChoixDuMinuteur valeur={f.minuteur} disabled={occupe} libelle={`Le minuteur de « ${nomDeLaRecette(r, ctx)} », sur les tablettes`}
                              onChange={(m) => changer(p.eleve.id, (x) => ({ ...x, fiches: x.fiches.map((y, j) => (j === i ? { ...y, minuteur: m } : y)) }))} />
                          )}
                          <button className="btn ghost sm" disabled={occupe} title="Une autre fiche"
                            onClick={() => changer(p.eleve.id, (x) => ({ ...x, fiches: x.fiches.map((y, j) => (j === i
                              ? avecSonTemps(uneAutre(y, x.fiches, ctx.niveau, periode, p.eleve.nonVerbal ?? false, graineDe(`${p.eleve.id}|${jour}|${tirage}|${i}|${y.graine}`), p.eleve.fichesExclues ?? [], extras))
                              : y)) }))}>🔄</button>
                          <button className="btn ghost sm" disabled={occupe} title="Retirer cette fiche"
                            onClick={() => changer(p.eleve.id, (x) => ({ ...x, fiches: x.fiches.filter((_, j) => j !== i) }))}>✕</button>
                        </li>
                      );
                    })}
                  </ol>
                  <button className="btn ghost sm" disabled={occupe} onClick={() => changer(p.eleve.id, (x) => {
                    const plus = uneDePlus(x.fiches, ctx.niveau, periode, p.eleve.nonVerbal ?? false, graineDe(`${p.eleve.id}|${jour}|${tirage}|+${x.fiches.length}`), p.eleve.fichesExclues ?? [], extras);
                    return plus ? { ...x, fiches: [...x.fiches, avecSonTemps(plus)] } : x;
                  })}>＋ Une fiche</button>
                </>}
              </div>
            );
          })}
          {journee.sansCreneau.length > 0 && (
            <div className="meta" style={{ fontSize: 12.5 }}>
              Sans créneau ce jour-là : {journee.sansCreneau.map((e) => e.nom).join(", ")}.
            </div>
          )}
        </>}
    </Modal>
  );
}
