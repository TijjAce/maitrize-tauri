// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { useNavigate } from "react-router-dom";
import { api, type MaterielItem } from "../api";
import { Aide } from "../components/Aide";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { Empty, Select, useAsync } from "../components/ui";
import { useSuiviSequences } from "../components/useSuiviSequences";
import {
  AIDES, ECHELLE_LSU, JOURS_POUR_OBSERVER, STYLE_GRILLE_OBSERVABLES, aEteObserve, aObserver, cleDeLaGrille, echelleDe, elevesDeLaSequence,
  htmlGrilleObservables, lireGrille, niveauSuivant, observablesDeLaSequence, type Cellule, type GrilleDeLEleve,
} from "../grillesObservables";
import { PARTIE_GRILLES } from "../copieDuTravail";
import { documentImprimable } from "../print";

// ── Élèves › Évaluations › Sommative › Grilles des séquences ──────────────
//
// La grille d'observables de chaque séquence en cours (voir grillesObservables.ts) :
// l'objectif de chaque séance en ligne ; en colonne, les élèves qui ont eu
// l'une de ses séances au cahier journal, et ceux qu'on a déjà notés. Une
// séquence finie quitte la liste une semaine après sa dernière séance : sa
// grille est alors rangée dans le dossier « Maitrize » du Bureau.
// Un clic donne le niveau, puis le suivant ; le clic droit note l'aide qu'il
// a fallu. Ce qu'on coche se range dans le dossier de chaque élève. La grille
// s'imprime remplie, ou vierge pour noter à la main ; les évaluations sur
// feuille de la séquence sont à côté, et ses propres évaluations restent dans
// « Évaluations notées ».

export function GrillesDesSequences({ sequence: voulue }: { sequence?: string }) {
  const navigate = useNavigate();
  const { suivis, sequences, seances, creneaux, aujourdHui, chargement } = useSuiviSequences();
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: materiel } = useAsync(() => api.materielList().catch((): MaterielItem[] => []), []);
  const { data: copie } = useAsync(() => api.copieBureauInfo().catch(() => null), []);
  // Les séquences en cours qui ont des séances, la dernière faite en tête ; celle qu'on vient de demander
  // depuis sa page, même si elle n'est pas en cours.
  const avecSeances = React.useMemo(() => sequences
    .filter((s) => seances.some((x) => x.sequenceId === s.id) && (aObserver(suivis.get(s.id), aujourdHui) || s.id === voulue))
    .sort((a, b) => (suivis.get(b.id)?.derniereLe ?? "").localeCompare(suivis.get(a.id)?.derniereLe ?? "") || a.titre.localeCompare(b.titre, "fr")),
  [sequences, seances, suivis, aujourdHui, voulue]);
  const [choisie, setChoisie] = React.useState(voulue ?? "");
  React.useEffect(() => { if (voulue) setChoisie(voulue); }, [voulue]);
  const id = avecSeances.some((s) => s.id === choisie) ? choisie : avecSeances[0]?.id ?? "";
  const sequence = avecSeances.find((s) => s.id === id);
  const siennes = React.useMemo(() => seances.filter((x) => x.sequenceId === id), [seances, id]);
  const observables = React.useMemo(() => observablesDeLaSequence(siennes), [siennes]);
  const classe = React.useMemo(() => (eleves ?? []).filter((e) => e.present !== false), [eleves]);
  const duJournal = React.useMemo(() => (sequence ? elevesDeLaSequence(sequence, creneaux, sequences, seances, classe) : new Set<string>()),
    [sequence, creneaux, sequences, seances, classe]);
  const echelle = sequence ? echelleDe(sequence) : ECHELLE_LSU;

  // Ce qui est noté, élève par élève, lu dans son dossier.
  const [valeurs, setValeurs] = React.useState<Record<string, GrilleDeLEleve>>({});
  const courantes = React.useRef(valeurs);
  courantes.current = valeurs;
  React.useEffect(() => {
    if (!id || !classe.length) { setValeurs({}); return; }
    let vivant = true;
    void Promise.all(classe.map((e) => api.documentEleveGet(e.id, cleDeLaGrille(id))
      .then((brut): [string, GrilleDeLEleve] => [e.id, lireGrille(brut)])
      .catch((): [string, GrilleDeLEleve] => [e.id, {}])))
      .then((lues) => { if (vivant) setValeurs(Object.fromEntries(lues)); });
    return () => { vivant = false; };
  }, [id, classe]);
  const noter = (eleveId: string, observable: string, c: Cellule) => {
    const sienne = { ...(courantes.current[eleveId] ?? {}) };
    if (c.n == null && !c.aide) delete sienne[observable]; else sienne[observable] = c;
    const suite = { ...courantes.current, [eleveId]: sienne };
    courantes.current = suite;
    setValeurs(suite);
    api.documentEleveSet(eleveId, cleDeLaGrille(id), JSON.stringify(sienne)).catch((e) => toast("Non enregistré : " + String(e), { icone: "⚠️" }));
  };
  // Un élève déjà noté garde sa colonne, même si son créneau a changé depuis.
  const colonnes = classe.filter((e) => duJournal.has(e.id) || aEteObserve(valeurs[e.id], observables));
  const surFeuille = (materiel ?? []).filter((m) => m.seanceId && siennes.some((s) => s.id === m.seanceId) && /évaluation/i.test(m.titre));
  const imprimer = (vierge: boolean) => {
    if (!sequence) return;
    const sous = [sequence.niveau, sequence.periode ? `période ${sequence.periode}` : "", "grille d'observables", vierge ? "à remplir" : ""].filter(Boolean).join(" · ");
    void api.ouvrirHtml(documentImprimable(`Grille — ${sequence.titre}`,
      htmlGrilleObservables({ titre: sequence.titre, sous, observables, eleves: colonnes, valeurs, echelle, vierge }), STYLE_GRILLE_OBSERVABLES))
      .catch((e) => toast(String(e), { icone: "⚠️" }));
  };

  // Les grilles rangées, dans le dossier du Bureau : tant que la copie s'y fait.
  const rangees = copie?.active
    ? <button type="button" className="btn ghost sm" title="Les grilles des séquences finies, dans le dossier « Maitrize » du Bureau"
      onClick={() => api.copieBureauOuvrir(PARTIE_GRILLES).catch((e) => toast(String(e), { icone: "⚠️" }))}>📁 Grilles rangées</button>
    : null;

  if (chargement || !eleves) return null;
  if (!avecSeances.length) {
    return (
      <>
        {rangees && <div className="toolbar"><div className="spacer" />{rangees}</div>}
        <Empty icone="📋" titre="Aucune séquence en cours"
          sous={`Une séquence s'observe de sa première séance au cahier journal jusqu'à ${JOURS_POUR_OBSERVER} jours après la dernière.`} />
      </>
    );
  }
  return (
    <div className="go-vue">
      <div className="toolbar">
        <Select value={id} onChange={(e) => setChoisie(e.target.value)} aria-label="La séquence" style={{ minWidth: 280, maxWidth: 520 }}>
          {avecSeances.map((s) => <option key={s.id} value={s.id}>{s.titre}{s.niveau ? ` — ${s.niveau}` : ""}{s.periode ? `, P${s.periode}` : ""}</option>)}
        </Select>
        <Aide titre="La grille d'observables" vers="droite">
          <p>Chaque séance dit ce que les élèves sauront à la fin : c'est une ligne de la grille. Chaque élève qui a l'une de ses séances au cahier journal — posée sur son créneau, ou citée par 📚 — a sa colonne ; une ligne 📚 à son nom ne compte que pour lui.</p>
          <p>Un clic dans une case donne le niveau, puis le suivant : {echelle.map((x) => x.libelle.toLowerCase()).join(", ")}. Le clic droit note l'aide qu'il a fallu — {AIDES.map((a) => `${a.lettre}, ${a.libelle}`).join(" ; ")} — : réussir avec de l'aide n'est pas échouer.</p>
          <p>Ce qui est noté se range dans le dossier de chaque élève. La grille s'imprime remplie, ou vierge pour noter à la main pendant la séance — avec des colonnes à nommer, tant que la séquence n'est pas au cahier journal.</p>
          <p>Seules les séquences en cours sont ici. Une semaine après sa dernière séance, une séquence finie quitte la liste : sa grille, avec les élèves observés, est rangée dans le dossier « Maitrize » du Bureau, sous « {PARTIE_GRILLES} » (Réglages › Données & synchro › Mon travail sur le Bureau).</p>
          <p>Vos propres évaluations restent dans « Évaluations notées ».</p>
        </Aide>
        <div className="spacer" />
        <button type="button" className="btn sm" disabled={!sequence} onClick={() => imprimer(true)}>🖨 Grille vierge</button>
        <button type="button" className="btn sm" disabled={!sequence || !colonnes.length} onClick={() => imprimer(false)}>🖨 Imprimer la grille</button>
        {sequence && <button type="button" className="btn ghost sm" onClick={() => navigate(`/sequences/${sequence.id}`)}>Ouvrir la séquence</button>}
        {rangees}
      </div>
      {surFeuille.length > 0 && (
        <div className="go-feuilles">
          <span className="meta">Sur feuille :</span>
          {surFeuille.map((m) => (
            <button key={m.id} type="button" className="chip" title="Ouvrir sa séance, où la feuille s'imprime" onClick={() => navigate(`/seances/${m.seanceId}`)}>📄 {m.titre}</button>
          ))}
        </div>
      )}
      {!observables.length ? (
        <Empty icone="✍️" titre="Pas encore d'observables" sous="Ses séances n'ont pas d'objectif écrit : écrivez-le dans chacune, il devient une ligne de la grille." />
      ) : !classe.length ? (
        <Empty icone="👧" titre="Aucun élève" sous="Ajoutez les élèves de la classe : chacun aura sa colonne." />
      ) : !colonnes.length ? (
        <Empty icone="📓" titre="Pas encore au cahier journal" sous="Ses colonnes sont les élèves des créneaux où l'une de ses séances est posée ou citée (📚)." />
      ) : (
        <div className="go-ecran">
          <table>
            <thead>
              <tr><th>Ce qu'on observe</th>{colonnes.map((e) => <th key={e.id}>{e.nom}</th>)}</tr>
            </thead>
            <tbody>
              {observables.map((o) => (
                <tr key={o.id}>
                  <td className="go-ecran-obs"><b>S{o.numero}</b>{o.texte}</td>
                  {colonnes.map((e) => {
                    const c = valeurs[e.id]?.[o.id] ?? {};
                    const niveau = echelle.find((x) => x.n === c.n);
                    const aide = AIDES.find((a) => a.id === c.aide);
                    return (
                      <td key={e.id} className="go-ecran-case">
                        <button type="button" title={[niveau?.libelle ?? "Pas encore observé", aide?.libelle].filter(Boolean).join(", ")}
                          aria-label={`${e.nom} — ${o.texte} : ${niveau?.libelle ?? "pas encore observé"}`}
                          onClick={() => noter(e.id, o.id, { ...c, n: niveauSuivant(c.n, echelle) })}
                          onContextMenu={(ev) => openCtx(ev, [
                            ...AIDES.map((a) => ({ label: `${a.libelle.charAt(0).toUpperCase()}${a.libelle.slice(1)}${c.aide === a.id ? " ✓" : ""}`, onClick: () => noter(e.id, o.id, { ...c, aide: a.id }) })),
                            { label: `Seul, sans aide${!c.aide ? " ✓" : ""}`, onClick: () => noter(e.id, o.id, { ...c, aide: undefined }) },
                            { label: "Effacer la case", sep: true, onClick: () => noter(e.id, o.id, {}) },
                          ])}>
                          {niveau && <><span className="go-pastille" style={{ background: niveau.couleur }} />{niveau.court}</>}
                          {aide && <em>{aide.lettre}</em>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
