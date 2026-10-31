import React from "react";
import { useNavigate } from "react-router-dom";
import { api, type MaterielItem } from "../api";
import { Aide } from "../components/Aide";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { Empty, Select, useAsync } from "../components/ui";
import { useSuiviSequences } from "../components/useSuiviSequences";
import {
  AIDES, ECHELLE_LSU, STYLE_GRILLE_OBSERVABLES, cleDeLaGrille, echelleDe, elevesDeLaSequence, htmlGrilleObservables, niveauSuivant,
  observablesDeLaSequence, type Cellule, type GrilleDeLEleve,
} from "../grillesObservables";
import { documentImprimable } from "../print";

// ── Élèves › Évaluations › Sommative › Grilles des séquences ──────────────
//
// La grille d'observables de chaque séquence (voir grillesObservables.ts) :
// l'objectif de chaque séance en ligne ; en colonne, les élèves qui ont eu
// l'une de ses séances au cahier journal, et ceux qu'on a déjà notés.
// Un clic donne le niveau, puis le suivant ; le clic droit note l'aide qu'il
// a fallu. Ce qu'on coche se range dans le dossier de chaque élève. La grille
// s'imprime remplie, ou vierge pour noter à la main ; les évaluations sur
// feuille de la séquence sont à côté, et ses propres évaluations restent dans
// « Évaluations notées ».

const lireGrille = (brut: string | null): GrilleDeLEleve => {
  try {
    const v: unknown = JSON.parse(brut ?? "{}");
    return v && typeof v === "object" ? v as GrilleDeLEleve : {};
  } catch { return {}; }
};

export function GrillesDesSequences({ sequence: voulue }: { sequence?: string }) {
  const navigate = useNavigate();
  const { suivis, sequences, seances, creneaux, chargement } = useSuiviSequences();
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: materiel } = useAsync(() => api.materielList().catch((): MaterielItem[] => []), []);
  // Les séquences qui ont des séances : d'abord celles du cahier journal — la dernière faite en tête, puis
  // celles qui ne sont que prévues —, ensuite les autres, les plus récemment touchées d'abord.
  const avecSeances = React.useMemo(() => {
    const rang = (id: string) => (suivis.get(id)?.derniereLe ? 0 : suivis.get(id)?.prochain ? 1 : 2);
    return sequences
      .filter((s) => seances.some((x) => x.sequenceId === s.id))
      .sort((a, b) => rang(a.id) - rang(b.id)
        || (suivis.get(b.id)?.derniereLe ?? "").localeCompare(suivis.get(a.id)?.derniereLe ?? "")
        || (suivis.get(a.id)?.prochain?.date ?? "").localeCompare(suivis.get(b.id)?.prochain?.date ?? "")
        || (b.dateMaj ?? "").localeCompare(a.dateMaj ?? "") || a.titre.localeCompare(b.titre, "fr"));
  }, [sequences, seances, suivis]);
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
  const colonnes = classe.filter((e) => duJournal.has(e.id) || observables.some((o) => valeurs[e.id]?.[o.id]));
  const surFeuille = (materiel ?? []).filter((m) => m.seanceId && siennes.some((s) => s.id === m.seanceId) && /évaluation/i.test(m.titre));
  const imprimer = (vierge: boolean) => {
    if (!sequence) return;
    const sous = [sequence.niveau, sequence.periode ? `période ${sequence.periode}` : "", "grille d'observables", vierge ? "à remplir" : ""].filter(Boolean).join(" · ");
    void api.ouvrirHtml(documentImprimable(`Grille — ${sequence.titre}`,
      htmlGrilleObservables({ titre: sequence.titre, sous, observables, eleves: colonnes, valeurs, echelle, vierge }), STYLE_GRILLE_OBSERVABLES))
      .catch((e) => toast(String(e), { icone: "⚠️" }));
  };

  if (chargement || !eleves) return null;
  if (!avecSeances.length) {
    return <Empty icone="📋" titre="Aucune séquence" sous="Créez une séquence, ou une séquence toute faite : l'objectif de chacune de ses séances devient une ligne de sa grille." />;
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
          <p>Vos propres évaluations restent dans « Évaluations notées ».</p>
        </Aide>
        <div className="spacer" />
        <button type="button" className="btn sm" disabled={!sequence} onClick={() => imprimer(true)}>🖨 Grille vierge</button>
        <button type="button" className="btn sm" disabled={!sequence || !colonnes.length} onClick={() => imprimer(false)}>🖨 Imprimer la grille</button>
        {sequence && <button type="button" className="btn ghost sm" onClick={() => navigate(`/sequences/${sequence.id}`)}>Ouvrir la séquence</button>}
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
