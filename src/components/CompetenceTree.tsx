import React from "react";
import { api, Referentiel, couleurHex } from "../api";
import { useAsync } from "./ui";
import { correspond } from "../competencesTravaillees";

// Miroir de CompetenceSelectionnee (Swift) — stocké en JSON.
export interface CompetenceSelectionnee {
  id: string;
  referentielNom: string;
  domaineId: string;
  domaineTitre: string;
  sousDomaineTitre: string;
  competenceGeneraleTitre?: string | null;
  competenceTitre: string;
  niveau?: string | null;
  competenceRefId?: string | null;
}

export function labelCourt(c: CompetenceSelectionnee): string {
  return (c.niveau ? `[${c.niveau}] ` : "") + c.competenceTitre;
}

interface RefComp { id: string; texte: string; niveau?: string }
interface RefCG { id: string; titre: string; competences?: RefComp[] }
interface RefSous { id: string; titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines: RefSous[] }
interface RefData { titre: string; domaines: RefDom[] }

function parse(r: Referentiel): RefData | null {
  try { return JSON.parse(r.donnees); } catch { return null; }
}

// Palette stable pour colorer les domaines (par position).
const PALETTE_DOM = ["blue", "green", "orange", "purple", "red", "teal", "pink", "cyan", "indigo", "brown"];

/** Texte sur lequel porte la recherche : niveau, intitulé et tout le chemin. */
const texteCherche = (dom: RefDom, sd: RefSous, cg: RefCG | null, comp: RefComp) =>
  `${comp.niveau ?? ""} ${comp.texte} ${cg?.titre ?? ""} ${sd.titre} ${dom.titre}`;

function compter(data: RefData | null, recherche: string): number {
  if (!data) return 0;
  let n = 0;
  for (const dom of data.domaines) for (const sd of dom.sousDomaines) {
    for (const c of sd.competences ?? []) if (correspond(texteCherche(dom, sd, null, c), recherche)) n++;
    for (const cg of sd.competencesGenerales ?? []) for (const c of cg.competences ?? []) if (correspond(texteCherche(dom, sd, cg, c), recherche)) n++;
  }
  return n;
}

/**
 * Arbre dépliable. `mode` simple → onPick(comp, ref) ; multi → cochage dans `selection`.
 * Avec `recherche`, seules les compétences qui contiennent tous les mots cherchés
 * restent, dépliées.
 */
export function CompetenceTree({ mode, selection, onPick, onToggle, recherche = "" }: {
  mode: "single" | "multi";
  selection: CompetenceSelectionnee[];
  onPick?: (c: CompetenceSelectionnee, ref: Referentiel) => void;
  onToggle?: (c: CompetenceSelectionnee, ref: Referentiel) => void;
  recherche?: string;
}) {
  const { data: refs } = useAsync(() => api.referentielsList(), []);
  const actifs = React.useMemo(() => (refs ?? []).filter((r) => r.actif), [refs]);
  const donnees = React.useMemo(() => new Map(actifs.map((r) => [r.id, parse(r)])), [actifs]);
  const cherche = recherche.trim().length >= 2 ? recherche.trim() : "";
  const [refId, setRefId] = React.useState<string>("");
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOuverts((o) => ({ ...o, [k]: !o[k] }));

  // Sélection par défaut : 1er référentiel actif.
  React.useEffect(() => {
    if (!refId && actifs.length) setRefId(actifs[0].id);
  }, [actifs, refId]);

  // Une recherche sans résultat dans le référentiel affiché bascule sur le
  // premier qui en a : on cherche une compétence, pas un cycle.
  React.useEffect(() => {
    if (!cherche || actifs.length < 2) return;
    const courant = actifs.find((r) => r.id === refId) ?? actifs[0];
    if (compter(donnees.get(courant.id) ?? null, cherche) > 0) return;
    const autre = actifs.find((r) => compter(donnees.get(r.id) ?? null, cherche) > 0);
    if (autre) setRefId(autre.id);
  }, [cherche]); // eslint-disable-line react-hooks/exhaustive-deps

  const estSelectionnee = (refNom: string, comp: RefComp, sd: RefSous) =>
    selection.some((s) => s.competenceRefId === comp.id && s.referentielNom === refNom && s.sousDomaineTitre === sd.titre);

  if (actifs.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", padding: 12 }}>
      Aucun référentiel actif. Importez-en un dans l'onglet Référentiels.
    </div>;
  }

  const ref = actifs.find((r) => r.id === refId) ?? actifs[0];
  const data = donnees.get(ref.id) ?? null;
  const garde = (dom: RefDom, sd: RefSous, cg: RefCG | null, c: RefComp) => !cherche || correspond(texteCherche(dom, sd, cg, c), cherche);
  const nbTrouvees = cherche ? compter(data, cherche) : 0;

  const rendreComp = (dom: RefDom, sd: RefSous, cg: RefCG | null, comp: RefComp, couleur: string) => {
    const sel: CompetenceSelectionnee = {
      id: crypto.randomUUID(), referentielNom: ref.nom, domaineId: dom.id, domaineTitre: dom.titre,
      sousDomaineTitre: sd.titre, competenceGeneraleTitre: cg?.titre ?? null,
      competenceTitre: comp.texte, niveau: comp.niveau ?? null, competenceRefId: comp.id,
    };
    const checked = estSelectionnee(ref.nom, comp, sd);
    return (
      <button key={comp.id} className="comp-leaf" data-on={checked}
        style={{ borderLeft: `3px solid ${couleur}` }}
        onClick={() => (mode === "single" ? onPick?.(sel, ref) : onToggle?.(sel, ref))}>
        <span className="comp-check">{mode === "multi" ? (checked ? "☑" : "☐") : (checked ? "◉" : "○")}</span>
        {comp.niveau && <span className="badge" style={{ marginRight: 6 }}>{comp.niveau}</span>}
        <span>{comp.texte}</span>
      </button>
    );
  };

  return (
    <div>
      {/* Sélecteur de référentiel */}
      <select className="select" value={ref.id} onChange={(e) => { setRefId(e.target.value); setOuverts({}); }}
        style={{ marginBottom: 8 }}>
        {actifs.map((r) => <option key={r.id} value={r.id}>{r.nom}{cherche ? ` (${compter(donnees.get(r.id) ?? null, cherche)})` : ""}</option>)}
      </select>
      {cherche && nbTrouvees === 0 && (
        <div style={{ fontSize: 13, color: "var(--text-2)", padding: "4px 2px 10px" }}>
          Aucune compétence de ce référentiel ne contient « {cherche} ». Le nombre de résultats de chaque référentiel est indiqué dans la liste.
        </div>
      )}

      <div className="comp-tree">
        {!data ? <div style={{ padding: 12, color: "var(--text-2)" }}>Référentiel illisible.</div> :
          data.domaines.map((dom, i) => {
            const couleur = couleurHex[PALETTE_DOM[i % PALETTE_DOM.length]];
            const dk = ref.id + dom.id;
            const sousDomaines = dom.sousDomaines.filter((sd) => !cherche
              || (sd.competences ?? []).some((c) => garde(dom, sd, null, c))
              || (sd.competencesGenerales ?? []).some((cg) => (cg.competences ?? []).some((c) => garde(dom, sd, cg, c))));
            if (cherche && sousDomaines.length === 0) return null;
            const domOuvert = cherche ? true : !!ouverts[dk];
            return (
              <div key={dk} className="comp-node">
                <button className="comp-row lvl0" style={{ borderLeft: `4px solid ${couleur}` }} onClick={() => toggle(dk)} disabled={!!cherche}>
                  <span className="comp-caret">{domOuvert ? "▾" : "▸"}</span>
                  <span className="dot" style={{ background: couleur, width: 9, height: 9, borderRadius: "50%", marginRight: 8 }} />
                  {dom.titre}
                </button>
                {domOuvert && sousDomaines.map((sd) => {
                  const sk = dk + sd.id;
                  const sdOuvert = cherche ? true : !!ouverts[sk];
                  return (
                    <div key={sk}>
                      <button className="comp-row lvl1" onClick={() => toggle(sk)} disabled={!!cherche}>
                        <span className="comp-caret">{sdOuvert ? "▾" : "▸"}</span>{sd.titre}
                      </button>
                      {sdOuvert && <div className="comp-leaves">
                        {(sd.competences ?? []).filter((c) => garde(dom, sd, null, c)).map((c) => rendreComp(dom, sd, null, c, couleur))}
                        {(sd.competencesGenerales ?? []).map((cg) => {
                          const comps = (cg.competences ?? []).filter((c) => garde(dom, sd, cg, c));
                          if (cherche && comps.length === 0) return null;
                          return (
                            <div key={cg.id}>
                              <div className="comp-cg">{cg.titre}</div>
                              {comps.map((c) => rendreComp(dom, sd, cg, c, couleur))}
                            </div>
                          );
                        })}
                      </div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
