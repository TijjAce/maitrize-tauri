import React from "react";
import { useNavigate } from "react-router-dom";
import { api, couleurHex, couleurPourMatiere, newId, texteErreur, type Eleve, type ProgrammationFinale, type Sequence } from "../api";
import { Empty, TextareaAuto, useAsync } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx } from "./ctxmenu";
import { ChoixCompetence } from "./ChoixCompetence";
import { printHTML, escapeHtml } from "../print";
import {
  CIBLE_MAX, CIBLE_MIN, PERIODES, basculerCible, comptes, cyclerPeriode, ecrire,
  elevesConcernes, etatDePeriode, etatDuCompte, lire, marqueEleve, marqueGroupe, motDuCompte, niveauDe,
  nouvelObjectif, objectifsDe, parDomaine, vide, type Groupe, type Objectif, type ProgrammationIme as Prog,
} from "../programmationIme";
import { poserUneSequence, reprendreDuJournal, travauxDuJournal } from "../objectifsDuJournal";
import { ChoixSequence } from "./SequencesCitees";
import { chargerVacances, periodeDuJour } from "../vacances";
import { isoJour } from "../dates";

// ── Programmer en IME ─────────────────────────────────────────────────────
//
// Une programmation de classe se lit en colonnes — un domaine, cinq périodes,
// et tout le monde suit. En IME il n'y a pas de « tout le monde » : chaque
// élève a ses objectifs, et l'on en vise une dizaine sur l'année.
//
// L'écran montre les objectifs, en tableau. Le bouton « Élèves » ouvre la
// grille qui a quoi — une ligne par compétence, une colonne par élève, avec
// son compte, parce que c'est là qu'on se trompe : on en met trois à l'un et
// vingt à l'autre (demande de l'enseignant, octobre 2026, qui a retiré la vue
// par créneau et les groupes). Ce que le cahier journal fait travailler
// arrive de lui-même : une séquence citée sur un créneau y apporte sa compétence.

const COULEUR_ETAT: Record<string, string> = {
  vide: "var(--text-2)", peu: "#d97706", bon: "var(--accent)", trop: "#dc2626",
};

const prenom = (e: Eleve) => e.nom.trim().split(/\s+/)[0] || e.nom;

// ── Les objectifs en tableau ──────────────────────────────────────────────
//
// Une ligne par objectif, rangées par domaine comme la programmation d'une
// classe : l'intitulé, pour qui, et les cinq périodes en cases. Les seize
// élèves ne s'étalent plus sous chaque objectif : la case « Élèves » ne
// montre que ceux qu'il vise, et s'ouvre pour en choisir d'autres.

const LIBELLE_PERIODE = { "": "pas travaillé", prevue: "prévu", atteinte: "atteint" } as const;

/**
 * Qui a quoi : une ligne par compétence de la programmation, une colonne par
 * élève — ✓ quand elle est la sienne, rien sinon —, et en tête de chaque
 * colonne son compte, dans la couleur de la cible. Un prénom touché ne montre
 * plus que ses objectifs dans le tableau ; touché de nouveau, tous.
 */
function QuiAQuoi({ prog, eleves, n, filtre, onFiltre }: {
  prog: Prog; eleves: Eleve[]; n: Record<string, number>; filtre: string; onFiltre: (id: string) => void;
}) {
  const objectifs = prog.objectifs.filter((o) => o.competence.trim());
  return (
    <div className="qaq">
      {objectifs.length === 0 && <p className="meta" style={{ fontSize: 12.5, margin: "4px 0 8px" }}>Aucune compétence programmée encore.</p>}
      <table className="qaq-table">
        <thead>
          <tr>
            <th className="qaq-competence" scope="col">Compétence</th>
            {eleves.map((e) => {
              const compte = n[e.id] ?? 0;
              return (
                <th key={e.id} scope="col">
                  <button type="button" className={`qaq-eleve${filtre === e.id ? " actif" : ""}`} onClick={() => onFiltre(filtre === e.id ? "" : e.id)}
                    title={`${prenom(e)} — ${motDuCompte(compte)}`} aria-pressed={filtre === e.id}>
                    <span className="qaq-nom">{prenom(e)}</span>
                    <span className="qaq-compte" style={{ color: COULEUR_ETAT[etatDuCompte(compte)] }}>{compte}/{CIBLE_MAX}</span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {objectifs.map((o) => {
            const qui = new Set(elevesConcernes(o, prog.groupes));
            return (
              <tr key={o.id}>
                <th className="qaq-competence" scope="row" title={o.competence}>{o.competence}</th>
                {eleves.map((e) => (
                  <td key={e.id} className={`${qui.has(e.id) ? "oui" : ""}${filtre === e.id ? " filtre" : ""}`} aria-label={qui.has(e.id) ? "oui" : "non"}>
                    {qui.has(e.id) ? "✓" : ""}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TableauObjectifs({ objectifs, groupes, eleves, sequences, nouveau, majObjectif, supprimer, citer }: {
  objectifs: Objectif[];
  groupes: Groupe[];
  eleves: Eleve[];
  sequences: Sequence[];
  /** L'objectif qu'on vient d'ajouter : on y écrit tout de suite. */
  nouveau: string;
  majObjectif: (id: string, fn: (o: Objectif) => Objectif) => void;
  supprimer: (o: Objectif) => void;
  citer: (id: string) => void;
}) {
  const nav = useNavigate();
  const [choix, setChoix] = React.useState<{ id: string; ancre: DOMRect } | null>(null);
  const enChoix = choix ? objectifs.find((o) => o.id === choix.id) : undefined;
  const parId = new Map(eleves.map((e) => [e.id, e]));
  const groupeDe = new Map(groupes.map((g) => [g.id, g]));

  return (
    <div className="card" style={{ padding: 0, overflowX: "auto" }}>
      <table className="tbl prog-ime">
        <thead>
          <tr>
            <th>Objectif</th>
            <th>Élèves</th>
            {PERIODES.map((p) => <th key={p} className="prog-ime-p" title="Un clic : prévu ●, deux : atteint ✔, trois : retiré">P{p}</th>)}
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {parDomaine(objectifs).map((g) => {
            const teinte = g.domaine ? couleurHex[couleurPourMatiere(g.domaine)] ?? couleurHex.gray : couleurHex.gray;
            return (
              <React.Fragment key={g.domaine || "·libres"}>
                <tr className="prog-ime-domaine" style={{ background: `${teinte}22` }}>
                  <td colSpan={PERIODES.length + 3}>
                    <span className="prog-ime-pastille" style={{ background: teinte }} />
                    {g.domaine || "Objectifs écrits à la main"}
                    <span className="meta"> · {g.objectifs.length}</span>
                  </td>
                </tr>
                {g.objectifs.map((o) => {
                  const niveau = niveauDe(o);
                  const seqs = (o.sequences ?? []).flatMap((id) => sequences.filter((s) => s.id === id));
                  return (
                    <tr key={o.id} style={{ boxShadow: `inset 3px 0 0 ${teinte}` }}
                      onContextMenu={(ev) => openCtx(ev, [
                        { label: "Citer une compétence du BO…", icon: "🎯", onClick: () => citer(o.id) },
                        { label: "Retirer de la programmation", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(o) },
                      ])}>
                      <td className="prog-ime-objectif">
                        <TextareaAuto className="textarea prog-ime-texte" rows={1} minHauteur={30} maxHauteur="10em" style={{ resize: "none" }}
                          value={o.competence} autoFocus={o.id === nouveau} aria-label="Objectif"
                          placeholder="Ce qu'on vise : « demander de l'aide », « dénombrer jusqu'à 10 »…"
                          onChange={(e) => majObjectif(o.id, (x) => ({ ...x, competence: e.target.value }))} />
                        {(niveau || (o.origine && !niveau && !g.domaine) || seqs.length > 0) && (
                          <div className="prog-ime-meta">
                            {niveau && <span className="badge" title={o.origine}>{niveau}</span>}
                            {!g.domaine && o.origine && <span>{o.origine}</span>}
                            {seqs.map((s) => (
                              <button key={s.id} type="button" className="chip" title="Ouvrir la séquence"
                                onClick={() => nav(`/sequences/${s.id}`)}>📚 {s.titre}</button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="prog-ime-eleves">
                        <button type="button" className="prog-ime-qui" title="Choisir pour qui"
                          onClick={(e) => setChoix(choix?.id === o.id ? null : { id: o.id, ancre: e.currentTarget.getBoundingClientRect() })}>
                          {o.pour.length ? o.pour.map((m) => {
                            const g2 = m.startsWith("groupe:") ? groupeDe.get(m.slice(7)) : undefined;
                            const e2 = m.startsWith("eleve:") ? parId.get(m.slice(6)) : undefined;
                            if (g2) return <span key={m} className="prog-ime-nom">👥 {g2.nom || "Groupe"}</span>;
                            return e2 ? <span key={m} className="prog-ime-nom">{prenom(e2)}</span> : null;
                          }) : <span className="meta">Choisir…</span>}
                        </button>
                      </td>
                      {PERIODES.map((p) => {
                        const etat = etatDePeriode(o, p);
                        return (
                          <td key={p} className="prog-ime-p">
                            <button type="button" className={etat} aria-label={`P${p} : ${LIBELLE_PERIODE[etat]}`}
                              title={`P${p} : ${LIBELLE_PERIODE[etat]}`}
                              onClick={() => majObjectif(o.id, (x) => cyclerPeriode(x, p))}>
                              {etat === "atteinte" ? "✔" : etat === "prevue" ? "●" : ""}
                            </button>
                          </td>
                        );
                      })}
                      <td className="prog-ime-actions">
                        <button className="btn ghost sm" onClick={() => citer(o.id)} title="Reprendre l'intitulé exact d'un référentiel">🎯</button>
                        <button className="btn ghost sm" onClick={() => supprimer(o)} aria-label="Retirer">🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {choix && enChoix && (
        <ChoixEleves ancre={choix.ancre} objectif={enChoix} groupes={groupes} eleves={eleves}
          onBasculer={(cible) => majObjectif(enChoix.id, (x) => basculerCible(x, cible))}
          onFermer={() => setChoix(null)} />
      )}
    </div>
  );
}

/** Pour qui : les groupes, puis les élèves, à cocher — posé sous la case qui l'ouvre. */
function ChoixEleves({ ancre, objectif, groupes, eleves, onBasculer, onFermer }: {
  ancre: DOMRect; objectif: Objectif; groupes: Groupe[]; eleves: Eleve[];
  onBasculer: (cible: string) => void; onFermer: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const ailleurs = (e: MouseEvent) => {
      const cible = e.target as HTMLElement;
      // La case qui l'a ouvert le referme elle-même.
      if (!ref.current?.contains(cible) && !cible.closest(".prog-ime-qui")) onFermer();
    };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    // Posé à l'écran, il ne suit pas la page : il se referme quand elle défile.
    const defile = (e: Event) => { if (!ref.current?.contains(e.target as Node)) onFermer(); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    document.addEventListener("scroll", defile, true);
    window.addEventListener("resize", onFermer);
    return () => {
      document.removeEventListener("mousedown", ailleurs);
      document.removeEventListener("keydown", echap);
      document.removeEventListener("scroll", defile, true);
      window.removeEventListener("resize", onFermer);
    };
  }, [onFermer]);

  const concernes = elevesConcernes(objectif, groupes);
  const largeur = Math.min(380, window.innerWidth - 24);
  const gauche = Math.max(12, Math.min(ancre.left, window.innerWidth - largeur - 12));
  const place = window.innerHeight - ancre.bottom > 280
    ? { top: ancre.bottom + 6 } : { bottom: window.innerHeight - ancre.top + 6 };
  return (
    <div ref={ref} className="prog-ime-choix" role="dialog" aria-label="Pour qui" style={{ left: gauche, width: largeur, ...place }}>
      {groupes.length > 0 && <>
        <div className="meta">Groupes</div>
        <div className="prog-ime-choix-liste">
          {groupes.map((g) => {
            const pris = objectif.pour.includes(marqueGroupe(g.id));
            return (
              <button key={g.id} type="button" className={`btn sm${pris ? " primary" : " ghost"}`}
                onClick={() => onBasculer(marqueGroupe(g.id))}>👥 {g.nom || "Groupe"}</button>
            );
          })}
        </div>
      </>}
      <div className="meta">Élèves</div>
      <div className="prog-ime-choix-liste">
        {eleves.map((e) => {
          const direct = objectif.pour.includes(marqueEleve(e.id));
          const parGroupe = !direct && concernes.includes(e.id);
          return (
            <button key={e.id} type="button" className={`btn sm${direct ? " primary" : " ghost"}`}
              title={parGroupe ? "Concerné par un groupe" : undefined}
              style={parGroupe ? { borderStyle: "dashed", opacity: 0.85 } : undefined}
              onClick={() => onBasculer(marqueEleve(e.id))}>
              {prenom(e)}{parGroupe ? " ·" : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProgrammationIme({ annee }: { annee: string }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: progs, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const ligne = progs?.find((p) => p.annee === annee && p.niveau === "ime");
  const [prog, setProg] = React.useState<Prog>(vide());
  // Vrai une fois la programmation enregistrée relue : rien ne s'y ajoute avant,
  // sans quoi on l'écraserait avec une programmation vide.
  const [lue, setLue] = React.useState(false);
  const [filtre, setFiltre] = React.useState("");
  // La grille qui a quoi, fermée tant qu'on ne la demande pas.
  const [elevesOuverts, setElevesOuverts] = React.useState(false);
  const [competencePour, setCompetencePour] = React.useState<string>("");
  const [nouveau, setNouveau] = React.useState("");
  const [choixSequence, setChoixSequence] = React.useState(false);

  React.useEffect(() => {
    setProg(ligne ? lire(ligne.lignesJson) : vide());
    if (progs) setLue(true);
  }, [ligne?.id, ligne?.lignesJson, !!progs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le cahier journal de l'année : les séquences citées sur ses créneaux.
  const debutAnnee = Number(annee.slice(0, 4));
  const { data: creneaux } = useAsync(() => (Number.isFinite(debutAnnee)
    ? api.creneauxList(`${debutAnnee}-08-01`, `${debutAnnee + 1}-07-31`)
    : Promise.resolve([])), [annee]);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const { data: seances } = useAsync(() => api.seancesList(), []);
  const { data: vacances } = useAsync(() => chargerVacances(isoJour(new Date())), []);

  /** Enregistre la programmation : elle vit dans une ligne à part, marquée « ime ». */
  const persister = (suite: Prog) => {
    setProg(suite);
    const p: ProgrammationFinale = ligne
      ? { ...ligne, lignesJson: ecrire(suite) }
      : { id: newId(), annee, lignesJson: ecrire(suite), niveau: "ime", enseignant: "", estImportee: false };
    api.programmationFinaleSave(p)
      .then(() => { if (!ligne) reload(); })
      .catch((e) => toast("Programmation non enregistrée : " + texteErreur(e), { icone: "⚠️" }));
  };

  // Ce que le cahier journal a fait travailler depuis la dernière visite entre
  // dans la programmation : l'objectif naît, ou gagne ces élèves et cette période.
  const travaux = React.useMemo(() => (creneaux && sequences && seances && vacances && eleves
    ? travauxDuJournal(creneaux, sequences, seances, eleves.map((e) => e.id), (jour) => periodeDuJour(jour, vacances))
    : null), [creneaux, sequences, seances, vacances, eleves]);
  React.useEffect(() => {
    if (!lue || !travaux) return;
    const { prog: suite, ajoutes, completes } = reprendreDuJournal(prog, travaux);
    if (suite === prog) return;
    persister(suite);
    if (!ajoutes && !completes) return;
    const dit = [
      ajoutes ? `${ajoutes} objectif${ajoutes > 1 ? "s" : ""} ajouté${ajoutes > 1 ? "s" : ""}` : "",
      completes ? `${completes} complété${completes > 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");
    toast(`Repris du cahier journal : ${dit}.`, { icone: "📚" });
  }, [lue, travaux, prog]); // eslint-disable-line react-hooks/exhaustive-deps

  const majObjectif = (id: string, fn: (o: Objectif) => Objectif) =>
    persister({ ...prog, objectifs: prog.objectifs.map((o) => (o.id === id ? fn(o) : o)) });

  const ajouter = () => {
    // Un objectif créé depuis le filtre d'un élève lui est déjà attribué :
    // c'est presque toujours ce qu'on veut.
    const pour = filtre ? [marqueEleve(filtre)] : [];
    const o = nouvelObjectif(pour);
    persister({ ...prog, objectifs: [...prog.objectifs, o] });
    setNouveau(o.id);
  };

  // Une séquence qu'on a déjà : sa compétence devient l'objectif, la séquence y est citée.
  const programmerSequence = (s: Sequence) => {
    setChoixSequence(false);
    const pour = filtre ? [filtre] : [];
    const { prog: suite, ajoutes, completes } = poserUneSequence(prog, s, pour);
    if (suite === prog || (!ajoutes && !completes)) {
      toast(`« ${s.titre || "Sans titre"} » est déjà programmée${filtre ? " pour cet élève" : ""}.`, { icone: "📚" });
      return;
    }
    persister(suite);
    const dit = [
      ajoutes ? `${ajoutes} objectif${ajoutes > 1 ? "s" : ""} ajouté${ajoutes > 1 ? "s" : ""}` : "",
      completes ? `${completes} complété${completes > 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");
    toast(`${s.titre || "La séquence"} : ${dit}.${filtre ? "" : " Dites pour qui dans la colonne « Élèves »."}`, { icone: "📚" });
  };

  const supprimer = async (o: Objectif) => {
    if (o.competence.trim() && !await confirmer(`Retirer « ${o.competence} » de la programmation ?`)) return;
    persister({ ...prog, objectifs: prog.objectifs.filter((x) => x.id !== o.id) });
  };

  const listeEleves = eleves ?? [];
  const n = comptes(prog, listeEleves.map((e) => e.id));
  const montres = filtre ? objectifsDe(prog, filtre) : prog.objectifs;
  const eleveFiltre = listeEleves.find((e) => e.id === filtre);

  const imprimer = () => {
    const parEleve = listeEleves.map((e) => {
      const siens = objectifsDe(prog, e.id);
      const lignes = siens.map((o) => `<tr><td>${escapeHtml(o.competence || "—")}
        ${o.origine ? `<div class="meta">${escapeHtml(o.origine)}</div>` : ""}</td>
        ${PERIODES.map((p) => `<td style="text-align:center">${o.periodes.includes(p)
          ? (o.atteintes.includes(p) ? "✔" : "•") : ""}</td>`).join("")}</tr>`).join("");
      return `<h2>${escapeHtml(e.nom)} <span class="meta">— ${siens.length} objectif(s)</span></h2>`
        + (siens.length
          ? `<table><tr><th>Objectif</th>${PERIODES.map((p) => `<th>P${p}</th>`).join("")}</tr>${lignes}</table>`
          : `<p class="meta">Aucun objectif programmé.</p>`);
    }).join("");
    printHTML(`Programmation ${annee}`,
      `<h1>Programmation par élève — ${escapeHtml(annee)}</h1>
       <div class="meta">Cible : ${CIBLE_MIN} à ${CIBLE_MAX} objectifs par élève sur l'année · • programmé, ✔ atteint</div>
       ${parEleve}`);
  };

  if (!listeEleves.length) {
    return <Empty icone="👧" titre="Aucun élève"
      sous="La programmation IME part de vos élèves : ajoutez-les dans Élèves › Classe." />;
  }

  return (
    <>
      {/* Les élèves d'abord : c'est leur compte qu'on surveille. */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <b style={{ fontSize: 14 }}>Objectifs par élève</b>
          <span className="meta" style={{ fontSize: 12 }}>cible {CIBLE_MIN}–{CIBLE_MAX} sur l'année</span>
          <div className="spacer" style={{ flex: 1 }} />
          <button className={`btn sm${elevesOuverts ? " primary" : " ghost"}`} aria-expanded={elevesOuverts}
            onClick={() => setElevesOuverts((v) => !v)} title="Chaque élève, et les compétences qu'il a ou non">
            👧 Élèves
          </button>
          <button className="btn ghost sm" onClick={imprimer}>🖨 Imprimer</button>
          <button className="btn sm" onClick={() => setChoixSequence(true)}
            title="Programmer une de vos séquences : sa compétence devient l'objectif, la séquence y est citée">＋ Séquence</button>
          <button className="btn primary sm" onClick={ajouter}>＋ Objectif</button>
        </div>
        {elevesOuverts && <QuiAQuoi prog={prog} eleves={listeEleves} n={n} filtre={filtre} onFiltre={setFiltre} />}
        {filtre && eleveFiltre && (
          <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 0", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span><b>{prenom(eleveFiltre)}</b> — {motDuCompte(n[filtre] ?? 0)} Seuls ses objectifs sont montrés ci-dessous.</span>
            <button className="btn ghost sm" onClick={() => setFiltre("")}>✕ Tous les élèves</button>
          </p>
        )}
      </div>

      {montres.length === 0 ? (
        <Empty icone="🎯" titre={filtre ? "Aucun objectif pour cet élève" : "Aucun objectif"}
          sous="« ＋ Objectif » : écrivez la compétence visée, dites pour qui, et sur quelles périodes. Une séquence citée dans le cahier journal apporte aussi la sienne." />
      ) : (
        <TableauObjectifs objectifs={montres} groupes={prog.groupes} eleves={listeEleves} sequences={sequences ?? []}
          nouveau={nouveau} majObjectif={majObjectif} supprimer={(o) => { void supprimer(o); }} citer={setCompetencePour} />
      )}

      {choixSequence && (
        <ChoixSequence sequences={sequences ?? []} seances={seances ?? []} seancesAussi={false}
          titre={eleveFiltre ? `Programmer une séquence pour ${prenom(eleveFiltre)}` : "Programmer une séquence"}
          libelle="Programmer" onClose={() => setChoixSequence(false)} onChoisir={(s) => programmerSequence(s)} />
      )}

      {competencePour && (
        <ChoixCompetence onClose={() => setCompetencePour("")} onChoisir={(comp) => {
          majObjectif(competencePour, (x) => ({
            ...x,
            competence: comp.competenceTitre,
            origine: [comp.referentielNom, comp.domaineTitre, comp.niveau].filter(Boolean).join(" › "),
          }));
          setCompetencePour("");
        }} />
      )}
    </>
  );
}
