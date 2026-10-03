import React from "react";
import { useNavigate } from "react-router-dom";
import { api, couleurHex, couleurPourMatiere, newId, texteErreur, type Eleve, type ProgrammationFinale, type Sequence } from "../api";
import { Empty, Input, TextareaAuto, useAsync } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx } from "./ctxmenu";
import { ChoixCompetence } from "./ChoixCompetence";
import { printHTML, escapeHtml } from "../print";
import {
  CIBLE_MAX, CIBLE_MIN, PERIODES, basculerCible, comptes, cyclerPeriode, ecrire,
  elevesConcernes, etatDePeriode, etatDuCompte, lire, marqueEleve, marqueGroupe, motDuCompte, niveauDe,
  nouveauGroupe, nouvelObjectif, objectifsDe, objectifsDuCreneau, parDomaine, poserSurCreneau,
  retirerDuCreneau, retirerGroupe, vide, type Groupe, type Objectif, type ProgrammationIme as Prog,
} from "../programmationIme";
import { CompetenceTree, type CompetenceSelectionnee } from "./CompetenceTree";
import { JOURS_EDT, natureDuSlot, type SlotEdt } from "../organisation";
import { reprendreDuJournal, travauxDuJournal } from "../objectifsDuJournal";
import { chargerVacances, periodeDuJour } from "../vacances";
import { isoJour } from "../dates";

// ── Programmer en IME ─────────────────────────────────────────────────────
//
// Une programmation de classe se lit en colonnes — un domaine, cinq périodes,
// et tout le monde suit. En IME il n'y a pas de « tout le monde » : chaque
// élève a ses objectifs, et l'on en vise une dizaine sur l'année.
//
// L'écran montre donc d'abord les élèves et leur compte, parce que c'est là
// qu'on se trompe : on en met trois à l'un et vingt à l'autre. Les groupes
// évitent la copie — « demander de l'aide » se travaille avec quatre élèves,
// on l'écrit une fois. Et ce que le cahier journal fait travailler arrive de
// lui-même : une séquence citée sur un créneau y apporte sa compétence.

const COULEUR_ETAT: Record<string, string> = {
  vide: "var(--text-2)", peu: "#d97706", bon: "var(--accent)", trop: "#dc2626",
};

const prenom = (e: Eleve) => e.nom.trim().split(/\s+/)[0] || e.nom;

/**
 * Programmer par créneau de la semaine type.
 *
 * En IME, un créneau est déjà un groupe : « Lecture Compréhension, lundi
 * 14 h 10 » désigne deux élèves et une matière. On choisit donc le créneau,
 * puis les compétences qu'on y travaille — l'attribution aux élèves suit
 * toute seule, au lieu de se redire élève par élève.
 */
function ParCreneau({ annee, eleves, prog, persister }: {
  annee: string;
  eleves: Eleve[];
  prog: Prog;
  persister: (p: Prog) => void;
}) {
  const { data: edts } = useAsync(() => api.edtTypiqueList(), []);
  const [choisi, setChoisi] = React.useState("");
  const [recherche, setRecherche] = React.useState("");

  // La semaine type de l'IME d'abord, celle de la classe à défaut.
  const slots = React.useMemo(() => {
    const e = (edts ?? []).find((x) => x.annee === `${annee}·IME`)
      ?? (edts ?? []).find((x) => x.annee === annee);
    if (!e) return [];
    let lus: SlotEdt[] = [];
    try { lus = JSON.parse(e.slotsJson) as SlotEdt[]; } catch { return []; }
    return lus.filter((sl) => natureDuSlot(sl) === "classe");
  }, [edts, annee]);

  /** Les élèves de chaque créneau : ceux qu'il nomme, ou toute la classe. */
  const elevesParCreneau = React.useMemo(() => {
    const tous = eleves.map((e) => e.id);
    return Object.fromEntries(slots.map((sl) => [sl.id, sl.eleves?.length ? sl.eleves : tous]));
  }, [slots, eleves]);

  const slot = slots.find((sl) => sl.id === choisi);
  const siens = slot ? elevesParCreneau[slot.id] ?? [] : [];
  const poses = choisi ? objectifsDuCreneau(prog, choisi) : [];

  // Ce que l'arbre doit montrer coché : les compétences déjà posées ici.
  const selection: CompetenceSelectionnee[] = poses.flatMap((o) => (o.source ? [{
    id: o.id, referentielNom: o.source.referentielNom, domaineId: "", domaineTitre: "",
    sousDomaineTitre: o.source.sousDomaineTitre, competenceTitre: o.competence,
    competenceRefId: o.source.competenceRefId,
  }] : []));

  const basculer = (c: CompetenceSelectionnee) => {
    if (!slot) return;
    const origine = [c.referentielNom, c.domaineTitre, c.niveau].filter(Boolean).join(" › ");
    const source = {
      referentielNom: c.referentielNom, sousDomaineTitre: c.sousDomaineTitre,
      competenceRefId: c.competenceRefId ?? "",
    };
    const deja = poses.some((o) => o.source
      && o.source.competenceRefId === source.competenceRefId
      && o.source.referentielNom === source.referentielNom
      && o.source.sousDomaineTitre === source.sousDomaineTitre);
    persister(deja
      ? retirerDuCreneau(prog, slot.id, c.competenceTitre, origine, elevesParCreneau)
      : poserSurCreneau(prog, slot.id, siens, c.competenceTitre, origine, source));
  };

  if (!slots.length) {
    return <Empty icone="🗓" titre="Aucune semaine type"
      sous="Programmer par créneau part de votre emploi du temps : posez-le dans Organisation › Emploi du temps." />;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card" style={{ maxHeight: "72vh", overflow: "auto" }}>
        <b style={{ fontSize: 14 }}>La semaine</b>
        <p className="meta" style={{ fontSize: 12, margin: "4px 0 10px", lineHeight: 1.5 }}>
          Chaque créneau porte ses élèves : le choisir, c'est choisir le groupe.
        </p>
        {JOURS_EDT.filter((j) => slots.some((sl) => sl.jour === j)).map((jour) => (
          <div key={jour} style={{ marginBottom: 10 }}>
            <div className="meta" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: .4, marginBottom: 4 }}>
              {jour}
            </div>
            {slots.filter((sl) => sl.jour === jour)
              .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
              .map((sl) => {
                const n = (elevesParCreneau[sl.id] ?? []).length;
                const combien = objectifsDuCreneau(prog, sl.id).length;
                return (
                  <button key={sl.id} type="button"
                    className={`creneau-choix${sl.id === choisi ? " on" : ""}`}
                    onClick={() => setChoisi(sl.id === choisi ? "" : sl.id)}>
                    <span className="creneau-heure">{sl.heureDebut.slice(0, 5)}</span>
                    <span className="creneau-titre">{sl.titre || "Sans intitulé"}</span>
                    <span className="meta" style={{ fontSize: 11 }}>
                      {n} élève{n > 1 ? "s" : ""}{combien ? ` · ${combien} ✓` : ""}
                    </span>
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      <div className="card">
        {!slot ? (
          <Empty icone="👈" titre="Choisissez un créneau"
            sous="Les compétences travaillées s'y cochent, et vont à ses élèves." />
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 15 }}>{slot.titre || "Sans intitulé"}</b>
              <span className="meta" style={{ fontSize: 12.5 }}>
                {slot.jour} {slot.heureDebut.slice(0, 5)}–{slot.heureFin.slice(0, 5)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 12px" }}>
              {siens.map((id) => {
                const e = eleves.find((x) => x.id === id);
                return e ? <span key={id} className="badge">{prenom(e)}</span> : null;
              })}
              {!siens.length && <span className="meta" style={{ fontSize: 12.5 }}>Aucun élève sur ce créneau.</span>}
            </div>
            <Input value={recherche} onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher une compétence (ex. : nombres jusqu'à 30, attendre son tour…)"
              aria-label="Chercher une compétence" />
            <p className="meta" style={{ fontSize: 12, margin: "8px 0 0" }}>
              {poses.length
                ? `${poses.length} compétence${poses.length > 1 ? "s" : ""} travaillée${poses.length > 1 ? "s" : ""} sur ce créneau.`
                : "Cochez ce que vous y travaillez : chaque compétence va aux élèves du créneau."}
            </p>
            <div style={{ maxHeight: "52vh", overflowY: "auto", marginTop: 8 }}>
              <CompetenceTree mode="multi" selection={selection} recherche={recherche}
                onToggle={(c) => basculer(c)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Les objectifs en tableau ──────────────────────────────────────────────
//
// Une ligne par objectif, rangées par domaine comme la programmation d'une
// classe : l'intitulé, pour qui, et les cinq périodes en cases. Les seize
// élèves ne s'étalent plus sous chaque objectif : la case « Élèves » ne
// montre que ceux qu'il vise, et s'ouvre pour en choisir d'autres.

const LIBELLE_PERIODE = { "": "pas travaillé", prevue: "prévu", atteinte: "atteint" } as const;

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
  const [groupesOuverts, setGroupesOuverts] = React.useState(false);
  const [competencePour, setCompetencePour] = React.useState<string>("");
  const [nouveau, setNouveau] = React.useState("");
  // La liste sert à écrire un objectif, la grille à voir qui a quoi. Deux
  // questions différentes, deux vues — et c'est la seconde qui manquait.
  const [vue, setVue] = React.useState<"liste" | "creneau">("liste");

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

  const supprimer = async (o: Objectif) => {
    if (o.competence.trim() && !await confirmer(`Retirer « ${o.competence} » de la programmation ?`)) return;
    persister({ ...prog, objectifs: prog.objectifs.filter((x) => x.id !== o.id) });
  };

  const listeEleves = eleves ?? [];
  const n = comptes(prog, listeEleves.map((e) => e.id));
  const montres = filtre ? objectifsDe(prog, filtre) : prog.objectifs;

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
          <div className="seg sm" role="group" aria-label="Affichage">
            <button className={vue === "liste" ? "active" : ""} onClick={() => setVue("liste")}>▦ Tableau</button>
            <button className={vue === "creneau" ? "active" : ""} onClick={() => setVue("creneau")}>🗓 Par créneau</button>
          </div>
          <button className="btn ghost sm" onClick={() => setGroupesOuverts((v) => !v)}>
            👥 Groupes{prog.groupes.length ? ` · ${prog.groupes.length}` : ""}
          </button>
          <button className="btn ghost sm" onClick={imprimer}>🖨 Imprimer</button>
          <button className="btn primary sm" onClick={ajouter}>＋ Objectif</button>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {listeEleves.map((e) => {
            const compte = n[e.id] ?? 0;
            const actif = filtre === e.id;
            return (
              <button key={e.id} type="button" className={`btn sm${actif ? " primary" : " ghost"}`}
                onClick={() => setFiltre(actif ? "" : e.id)} title={motDuCompte(compte)}
                style={{ borderColor: actif ? undefined : COULEUR_ETAT[etatDuCompte(compte)] }}>
                {prenom(e)}
                <span style={{ marginLeft: 6, opacity: 0.85,
                  color: actif ? undefined : COULEUR_ETAT[etatDuCompte(compte)] }}>
                  {compte}/{CIBLE_MAX}
                </span>
              </button>
            );
          })}
        </div>
        {filtre && (
          <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 0" }}>
            {motDuCompte(n[filtre] ?? 0)} Seuls ses objectifs sont montrés ci-dessous.
          </p>
        )}
      </div>

      {groupesOuverts && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <b style={{ fontSize: 14 }}>Groupes</b>
            <span className="meta" style={{ fontSize: 12 }}>
              Des élèves qui partagent des objectifs : on les écrit une fois.
            </span>
            <div className="spacer" style={{ flex: 1 }} />
            <button className="btn sm" onClick={() => persister({ ...prog, groupes: [...prog.groupes, nouveauGroupe("")] })}>
              ＋ Groupe
            </button>
          </div>
          {prog.groupes.length === 0 ? (
            <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>Aucun groupe.</p>
          ) : prog.groupes.map((g) => (
            <div key={g.id} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Input value={g.nom} placeholder="Nom du groupe" style={{ maxWidth: 220 }}
                  onChange={(e) => persister({ ...prog, groupes: prog.groupes.map((x) => x.id === g.id ? { ...x, nom: e.target.value } : x) })} />
                <span className="meta" style={{ fontSize: 11.5 }}>{g.eleveIds.length} élève(s)</span>
                <div className="spacer" style={{ flex: 1 }} />
                <button className="btn ghost sm" aria-label="Supprimer le groupe"
                  onClick={async () => {
                    if (!await confirmer(`Supprimer le groupe « ${g.nom} » ? Ses objectifs restent, attribués élève par élève.`)) return;
                    persister(retirerGroupe(prog, g.id));
                  }}>🗑</button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {listeEleves.map((e) => {
                  const dedans = g.eleveIds.includes(e.id);
                  return (
                    <button key={e.id} type="button" className={`btn sm${dedans ? " primary" : " ghost"}`}
                      onClick={() => persister({
                        ...prog,
                        groupes: prog.groupes.map((x) => x.id === g.id
                          ? { ...x, eleveIds: dedans ? x.eleveIds.filter((i) => i !== e.id) : [...x.eleveIds, e.id] }
                          : x),
                      })}>{prenom(e)}</button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* La vue par créneau passe avant le vide : c'est justement par là qu'on
          commence une année, quand aucun objectif n'est encore écrit. */}
      {vue === "creneau" ? (
        <ParCreneau annee={annee} eleves={listeEleves} prog={prog} persister={persister} />
      ) : montres.length === 0 ? (
        <Empty icone="🎯" titre={filtre ? "Aucun objectif pour cet élève" : "Aucun objectif"}
          sous="« ＋ Objectif » : écrivez la compétence visée, dites pour qui, et sur quelles périodes. Une séquence citée dans le cahier journal apporte aussi la sienne." />
      ) : (
        <TableauObjectifs objectifs={montres} groupes={prog.groupes} eleves={listeEleves} sequences={sequences ?? []}
          nouveau={nouveau} majObjectif={majObjectif} supprimer={(o) => { void supprimer(o); }} citer={setCompetencePour} />
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
