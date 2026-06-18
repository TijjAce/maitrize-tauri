import React from "react";
import { api, Referentiel, couleurHex } from "../api";
import { useAsync } from "./ui";

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

/** Arbre dépliable. `mode` simple → onPick(comp, ref) ; multi → cochage dans `selection`. */
export function CompetenceTree({ mode, selection, onPick, onToggle }: {
  mode: "single" | "multi";
  selection: CompetenceSelectionnee[];
  onPick?: (c: CompetenceSelectionnee, ref: Referentiel) => void;
  onToggle?: (c: CompetenceSelectionnee, ref: Referentiel) => void;
}) {
  const { data: refs } = useAsync(() => api.referentielsList(), []);
  const actifs = (refs ?? []).filter((r) => r.actif);
  const [refId, setRefId] = React.useState<string>("");
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOuverts((o) => ({ ...o, [k]: !o[k] }));

  // Sélection par défaut : 1er référentiel actif.
  React.useEffect(() => {
    if (!refId && actifs.length) setRefId(actifs[0].id);
  }, [actifs, refId]);

  const estSelectionnee = (refNom: string, comp: RefComp, sd: RefSous) =>
    selection.some((s) => s.competenceRefId === comp.id && s.referentielNom === refNom && s.sousDomaineTitre === sd.titre);

  if (actifs.length === 0) {
    return <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", padding: 12 }}>
      Aucun référentiel actif. Importez-en un dans l'onglet Référentiels.
    </div>;
  }

  const ref = actifs.find((r) => r.id === refId) ?? actifs[0];
  const data = ref ? parse(ref) : null;

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
        {actifs.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
      </select>

      <div className="comp-tree">
        {!data ? <div style={{ padding: 12, color: "var(--text-2)" }}>Référentiel illisible.</div> :
          data.domaines.map((dom, i) => {
            const couleur = couleurHex[PALETTE_DOM[i % PALETTE_DOM.length]];
            const dk = ref.id + dom.id;
            return (
              <div key={dk} className="comp-node">
                <button className="comp-row lvl0" style={{ borderLeft: `4px solid ${couleur}` }} onClick={() => toggle(dk)}>
                  <span className="comp-caret">{ouverts[dk] ? "▾" : "▸"}</span>
                  <span className="dot" style={{ background: couleur, width: 9, height: 9, borderRadius: "50%", marginRight: 8 }} />
                  {dom.titre}
                </button>
                {ouverts[dk] && dom.sousDomaines.map((sd) => {
                  const sk = dk + sd.id;
                  return (
                    <div key={sk}>
                      <button className="comp-row lvl1" onClick={() => toggle(sk)}>
                        <span className="comp-caret">{ouverts[sk] ? "▾" : "▸"}</span>{sd.titre}
                      </button>
                      {ouverts[sk] && <div className="comp-leaves">
                        {(sd.competences ?? []).map((c) => rendreComp(dom, sd, null, c, couleur))}
                        {(sd.competencesGenerales ?? []).map((cg) => (
                          <div key={cg.id}>
                            <div className="comp-cg">{cg.titre}</div>
                            {(cg.competences ?? []).map((c) => rendreComp(dom, sd, cg, c, couleur))}
                          </div>
                        ))}
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
