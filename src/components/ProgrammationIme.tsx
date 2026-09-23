import React from "react";
import { api, newId, texteErreur, type Eleve, type ProgrammationFinale } from "../api";
import { Empty, Input, useAsync } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx } from "./ctxmenu";
import { ChoixCompetence } from "./ChoixCompetence";
import { printHTML, escapeHtml } from "../print";
import {
  CIBLE_MAX, CIBLE_MIN, PERIODES, basculerCible, basculerPeriode, comptes, ecrire,
  elevesConcernes, etatDuCompte, lire, marqueEleve, marqueGroupe, motDuCompte, nouveauGroupe,
  nouvelObjectif, objectifsDe, retirerGroupe, vide, type Objectif, type ProgrammationIme as Prog,
} from "../programmationIme";

// ── Programmer en IME ─────────────────────────────────────────────────────
//
// Une programmation de classe se lit en colonnes — un domaine, cinq périodes,
// et tout le monde suit. En IME il n'y a pas de « tout le monde » : chaque
// élève a ses objectifs, et l'on en vise une dizaine sur l'année.
//
// L'écran montre donc d'abord les élèves et leur compte, parce que c'est là
// qu'on se trompe : on en met trois à l'un et vingt à l'autre. Les groupes
// évitent la copie — « demander de l'aide » se travaille avec quatre élèves,
// on l'écrit une fois.

const COULEUR_ETAT: Record<string, string> = {
  vide: "var(--text-2)", peu: "#d97706", bon: "var(--accent)", trop: "#dc2626",
};

const prenom = (e: Eleve) => e.nom.trim().split(/\s+/)[0] || e.nom;

export function ProgrammationIme({ annee }: { annee: string }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: progs, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const ligne = progs?.find((p) => p.annee === annee && p.niveau === "ime");
  const [prog, setProg] = React.useState<Prog>(vide());
  const [filtre, setFiltre] = React.useState("");
  const [groupesOuverts, setGroupesOuverts] = React.useState(false);
  const [competencePour, setCompetencePour] = React.useState<string>("");

  React.useEffect(() => { setProg(ligne ? lire(ligne.lignesJson) : vide()); }, [ligne?.id, ligne?.lignesJson]);

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

  const majObjectif = (id: string, fn: (o: Objectif) => Objectif) =>
    persister({ ...prog, objectifs: prog.objectifs.map((o) => (o.id === id ? fn(o) : o)) });

  const ajouter = () => {
    // Un objectif créé depuis le filtre d'un élève lui est déjà attribué :
    // c'est presque toujours ce qu'on veut.
    const pour = filtre ? [marqueEleve(filtre)] : [];
    persister({ ...prog, objectifs: [...prog.objectifs, nouvelObjectif(pour)] });
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

      {montres.length === 0 ? (
        <Empty icone="🎯" titre={filtre ? "Aucun objectif pour cet élève" : "Aucun objectif"}
          sous="« ＋ Objectif » : écrivez la compétence visée, dites pour qui, et sur quelles périodes." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {montres.map((o) => {
            const concernes = elevesConcernes(o, prog.groupes);
            return (
              <div key={o.id} className="card"
                onContextMenu={(ev) => openCtx(ev, [
                  { label: "Citer une compétence du BO…", icon: "🎯", onClick: () => setCompetencePour(o.id) },
                  { label: "Retirer de la programmation", icon: "🗑", danger: true, sep: true, onClick: () => { void supprimer(o); } },
                ])}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <Input value={o.competence} placeholder="Ce qu'on vise : « demander de l'aide », « dénombrer jusqu'à 10 »…"
                    onChange={(e) => majObjectif(o.id, (x) => ({ ...x, competence: e.target.value }))}
                    style={{ flex: 1, minWidth: 220 }} />
                  <button className="btn ghost sm" onClick={() => setCompetencePour(o.id)}
                    title="Reprendre l'intitulé exact d'un référentiel">🎯</button>
                  <button className="btn ghost sm" onClick={() => { void supprimer(o); }} aria-label="Retirer">🗑</button>
                </div>
                {o.origine && <div className="meta" style={{ fontSize: 11.5, marginBottom: 6 }}>{o.origine}</div>}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {prog.groupes.map((g) => {
                    const pris = o.pour.includes(marqueGroupe(g.id));
                    return (
                      <button key={g.id} type="button" className={`btn sm${pris ? " primary" : " ghost"}`}
                        onClick={() => majObjectif(o.id, (x) => basculerCible(x, marqueGroupe(g.id)))}>
                        👥 {g.nom}
                      </button>
                    );
                  })}
                  {listeEleves.map((e) => {
                    const direct = o.pour.includes(marqueEleve(e.id));
                    const parGroupe = !direct && concernes.includes(e.id);
                    return (
                      <button key={e.id} type="button" className={`btn sm${direct ? " primary" : " ghost"}`}
                        title={parGroupe ? "Concerné par un groupe" : undefined}
                        style={parGroupe ? { borderStyle: "dashed", opacity: 0.85 } : undefined}
                        onClick={() => majObjectif(o.id, (x) => basculerCible(x, marqueEleve(e.id)))}>
                        {prenom(e)}{parGroupe ? " ·" : ""}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="meta" style={{ fontSize: 11.5 }}>Périodes</span>
                  {PERIODES.map((p) => {
                    const prevue = o.periodes.includes(p);
                    const atteinte = o.atteintes.includes(p);
                    return (
                      <button key={p} type="button" className={`btn sm${prevue ? " primary" : " ghost"}`}
                        title={prevue ? "Cliquez encore pour marquer l'objectif atteint sur cette période" : `Travailler en P${p}`}
                        onClick={() => majObjectif(o.id, (x) => {
                          if (!x.periodes.includes(p)) return basculerPeriode(x, p);
                          // Prévue → atteinte → retirée : un seul bouton, trois états.
                          if (!x.atteintes.includes(p)) return { ...x, atteintes: [...x.atteintes, p].sort() };
                          return basculerPeriode({ ...x, atteintes: x.atteintes.filter((y) => y !== p) }, p);
                        })}>
                        {atteinte ? "✔ " : ""}P{p}
                      </button>
                    );
                  })}
                  <div className="spacer" style={{ flex: 1 }} />
                  <span className="meta" style={{ fontSize: 11.5 }}>
                    {concernes.length ? `${concernes.length} élève(s)` : "personne pour l'instant"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
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
