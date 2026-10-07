import React from "react";
import { api, NIVEAUX_SCOLAIRES, type Creneau, type Eleve } from "../api";
import { Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { chargerVacances, periodeDuJour } from "../vacances";
import { ficheDeLEleve } from "../impressionAtelier";
import {
  combienDeFiches, dossierDuJour, elevesDuJour, graineDe, iconeDeLaRecette, jourEnLettres, niveauDesFiches, nomDeLaRecette, prenomDe,
  prevuAvecLesFiches, proposer, recetteDe, repartir, titreDeLaFiche, titreLibre, uneAutre, uneDePlus,
  type EleveDuJour, type FicheProposee, type NiveauFiches, type OutilsFiche,
} from "../fichesAutonomie";

// « En retard » : pour chaque élève de la journée, des fiches à faire seul,
// à son niveau (voir `fichesAutonomie`). On voit ce qui est proposé, on en
// change une, on en retire, on en ajoute ; puis tout se fabrique, se range
// sur le bureau et s'écrit au cahier journal.

interface Ligne { niveau: NiveauFiches | null; inclus: boolean; fiches: FicheProposee[] }

const hhmm = (h: string) => h.slice(0, 5);

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

export function EnRetard({ jourInitial, onClose, onFini }: {
  jourInitial: string; onClose: () => void; onFini: (jour: string) => void;
}) {
  const [jour, setJour] = React.useState(jourInitial);
  const [donnees, setDonnees] = React.useState<{ jour: string; creneaux: Creneau[]; eleves: Eleve[]; periode: number } | null>(null);
  const [tirage, setTirage] = React.useState(0);
  const [lignes, setLignes] = React.useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = React.useState<{ fait: number; total: number; quoi: string } | null>(null);

  React.useEffect(() => {
    let vivant = true;
    void (async () => {
      const [creneaux, eleves, vacances] = await Promise.all([
        api.creneauxList(jour, jour).catch((): Creneau[] => []), api.elevesList().catch((): Eleve[] => []), chargerVacances(jour).catch(() => []),
      ]);
      if (vivant) setDonnees({ jour, creneaux, eleves, periode: periodeDuJour(jour, vacances) });
    })();
    return () => { vivant = false; };
  }, [jour]);

  const journee = React.useMemo(() => (donnees ? elevesDuJour(donnees.creneaux, donnees.eleves) : null), [donnees]);
  const periode = donnees?.periode ?? 1;

  /** Ce qu'on propose à un élève, à ce niveau, pour ce tirage. */
  const propositions = React.useCallback((eleve: Eleve, creneaux: Creneau[], niveau: NiveauFiches | null): Ligne => ({
    niveau, inclus: niveau !== null,
    fiches: niveau ? proposer(niveau, periode, eleve.nonVerbal ?? false, combienDeFiches(niveau, creneaux.length), graineDe(`${eleve.id}|${jour}|${tirage}`)) : [],
  }), [periode, jour, tirage]);

  React.useEffect(() => {
    if (!journee) return;
    setLignes(Object.fromEntries(journee.presents.map(({ eleve, creneaux }) => [eleve.id, propositions(eleve, creneaux, niveauDesFiches(eleve.niveau))])));
  }, [journee, propositions]);

  const changer = (id: string, f: (l: Ligne) => Ligne) => setLignes((avant) => (avant[id] ? { ...avant, [id]: f(avant[id]) } : avant));

  /** Un élève sans niveau : on le dit ici, et sa fiche le garde. */
  const choisirNiveau = (p: EleveDuJour, niveau: string) => {
    const n = niveauDesFiches(niveau);
    setLignes((avant) => ({ ...avant, [p.eleve.id]: propositions(p.eleve, p.creneaux, n) }));
    if (niveau) api.eleveSave({ ...p.eleve, niveau }).catch(() => toast("Le niveau n'a pas pu s'enregistrer sur sa fiche.", { icone: "⚠️" }));
  };

  const total = Object.values(lignes).reduce((n, l) => n + (l.inclus ? l.fiches.length : 0), 0);

  const fabriquer = async () => {
    if (!journee || !total) return;
    const pris = new Set((await api.materielList().catch(() => [])).map((m) => m.titre.trim().toLowerCase()));
    const parCreneau = new Map<string, string[]>();
    const echecs: string[] = [];
    let fait = 0;
    for (const { eleve, creneaux } of journee.presents) {
      const l = lignes[eleve.id];
      if (!l?.inclus || !l.niveau) continue;
      const ou = repartir(l.fiches.length, creneaux.length);
      for (const [i, f] of l.fiches.entries()) {
        const recette = recetteDe(f.recette);
        if (!recette) continue;
        const c = { niveau: l.niveau, periode, prenom: prenomDe(eleve) };
        const nom = nomDeLaRecette(recette, c);
        setEnCours({ fait, total, quoi: `${c.prenom} — ${nom}` });
        try {
          const { html, style } = await recette.fabriquer(c, f.graine, OUTILS);
          const titre = titreLibre(titreDeLaFiche(nom, c.prenom, jour), pris);
          await ficheDeLEleve(recette.atelier, titre, html, style, { prenom: c.prenom, date: jourEnLettres(jour), dossier: dossierDuJour(jour) });
          const creneau = creneaux[ou[i]];
          parCreneau.set(creneau.id, [...(parCreneau.get(creneau.id) ?? []), titre]);
        } catch {
          echecs.push(`${c.prenom} : ${nom}`);
        }
        fait++;
      }
    }
    // Le prévu relu juste avant d'écrire : ce qu'on vient d'y taper reste.
    setEnCours({ fait, total, quoi: "Le cahier journal" });
    const frais = await api.creneauxList(jour, jour).catch((): Creneau[] => []);
    for (const [id, titres] of parCreneau) {
      const c = frais.find((x) => x.id === id);
      if (c) await api.creneauJournalSave(id, prevuAvecLesFiches(c.prevu ?? "", titres), c.bilan ?? "").catch(() => echecs.push(`le journal de ${hhmm(c.heureDebut)}`));
    }
    const posees = [...parCreneau.values()].reduce((n, t) => n + t.length, 0);
    setEnCours(null);
    toast(`${posees} fiche${posees > 1 ? "s" : ""} d'autonomie dans le cahier journal du ${jourEnLettres(jour)}, sur le bureau dans « Fiches d'autonomie ».`
      + (echecs.length ? ` ${echecs.length} n'${echecs.length > 1 ? "ont" : "a"} pas pu se faire : ${echecs.join(", ")}.` : ""),
    { icone: echecs.length ? "⚠️" : "⏰", duree: 12000 });
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
          {occupe ? `Fiche ${Math.min(enCours.fait + 1, enCours.total)} sur ${enCours.total}…` : `Fabriquer ${total} fiche${total > 1 ? "s" : ""}`}
        </button>
      </>}>
      <div className="row" style={{ alignItems: "center", marginBottom: 6 }}>
        <div style={{ flex: "0 0 170px" }}>
          <Input type="date" value={jour} disabled={occupe} onChange={(e) => { if (e.target.value) { setJour(e.target.value); setTirage(0); } }} />
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {jourEnLettres(jour)} · période {periode}
        </div>
      </div>
      <p className="meta" style={{ fontSize: 12.5, marginTop: 0 }}>
        Pour chaque élève de la journée, des fiches à son niveau tirées des ateliers de Fabriquer : trois en maternelle, quatre du CP au CE2,
        une au moins par créneau. Pas de fiche de lecture pour un élève non verbal. Chaque fiche porte son prénom, s'écrit au cahier journal
        de son créneau, à la suite, et s'imprime avec lui.
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
                  <span className="retard-creneaux">{p.creneaux.map((c) => `${hhmm(c.heureDebut)} ${c.matiere}`).join(" · ")}</span>
                </div>
                {l.inclus && ctx && <>
                  <ol className="retard-fiches">
                    {l.fiches.map((f, i) => {
                      const r = recetteDe(f.recette);
                      if (!r) return null;
                      return (
                        <li key={`${i}-${f.recette}-${f.graine}`}>
                          <span className="retard-nom">{iconeDeLaRecette(r)} {nomDeLaRecette(r, ctx)}</span>
                          {p.creneaux.length > 1 && <span className="retard-ou">{hhmm(p.creneaux[ou[i]].heureDebut)}</span>}
                          <button className="btn ghost sm" disabled={occupe} title="Une autre fiche"
                            onClick={() => changer(p.eleve.id, (x) => ({ ...x, fiches: x.fiches.map((y, j) => (j === i
                              ? uneAutre(y, x.fiches, ctx.niveau, periode, p.eleve.nonVerbal ?? false, graineDe(`${p.eleve.id}|${jour}|${tirage}|${i}|${y.graine}`)) : y)) }))}>🔄</button>
                          <button className="btn ghost sm" disabled={occupe} title="Retirer cette fiche"
                            onClick={() => changer(p.eleve.id, (x) => ({ ...x, fiches: x.fiches.filter((_, j) => j !== i) }))}>✕</button>
                        </li>
                      );
                    })}
                  </ol>
                  <button className="btn ghost sm" disabled={occupe} onClick={() => changer(p.eleve.id, (x) => {
                    const plus = uneDePlus(x.fiches, ctx.niveau, periode, p.eleve.nonVerbal ?? false, graineDe(`${p.eleve.id}|${jour}|${tirage}|+${x.fiches.length}`));
                    return plus ? { ...x, fiches: [...x.fiches, plus] } : x;
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
