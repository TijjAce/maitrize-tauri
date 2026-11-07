// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Input } from "./ui";
import { Aide } from "./Aide";
import {
  AMENAGEMENTS_LPI, NIVEAUX_LPI, ONGLETS_LPI, POINTS_ET_DIFFICULTES_LPI, type NiveauLpi, type OngletLpi,
} from "../data/amenagementsLPI";
import {
  amenagementsVides, appuisVides, basculerAmenagement, basculerLigne, deplacerAmenagement, estRetenu, ligneRetenue,
  lireAmenagements, lireAppuis, niveauLpiDe, poserAutre, poserLigneAutre, preciserAmenagement, retirerAmenagement,
  texteAutre, texteLigneAutre, type ChoixAmenagements, type ChoixAppuis, type SensLpi,
} from "../listeLpi";

// La liste du Livret de parcours inclusif dans un plan : mêmes onglets et mêmes rubriques que les
// écrans du LPI, pour reporter le choix sans chercher. Une rubrique se déplie, un aménagement se
// coche ; ceux qu'on retient se rangent en haut, et leur ordre se choisit.

const SOURCE = "Liste d'aménagements pédagogiques, points d'appui et difficultés au sein du LPI, ministère de l'Éducation nationale, février 2026, Éduscol, licence ouverte Etalab 2.0.";

const styleRubrique: React.CSSProperties = { border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6, background: "var(--panel)" };
const styleTitre: React.CSSProperties = { cursor: "pointer", padding: "7px 10px", fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "baseline" };
const styleCase: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 10px", fontSize: 12.5, cursor: "pointer" };
const styleFleche: React.CSSProperties = { padding: "0 6px", lineHeight: "22px" };

function Compte({ n }: { n: number }) {
  return n > 0 ? <span style={{ fontSize: 12, fontWeight: 400, color: "var(--accent)" }}>{n}</span> : null;
}

/** Les aménagements d'un plan. `onChange(undefined)` : plus rien de retenu, rien à garder. */
export function ChampAmenagements({ label, valeur, niveauEleve, onChange }: {
  label: string; valeur: unknown; niveauEleve: string | undefined;
  onChange: (v: ChoixAmenagements | undefined) => void;
}) {
  const choix = lireAmenagements(valeur);
  const [niveauChoisi, setNiveauChoisi] = React.useState<NiveauLpi | null>(null);
  const niveau = niveauChoisi ?? choix.niveau ?? niveauLpiDe(niveauEleve);
  const [onglet, setOnglet] = React.useState<OngletLpi>(ONGLETS_LPI[0]);

  const rubriques = AMENAGEMENTS_LPI[niveau];
  const onglets = ONGLETS_LPI.filter((o) => rubriques.some((r) => r.onglet === o));
  const ongletVu = onglets.includes(onglet) ? onglet : onglets[0];
  const dansRubrique = (titre: string) => choix.retenus.filter((r) => r.rubrique === titre).length;
  const dansOnglet = (o: OngletLpi) => rubriques.filter((r) => r.onglet === o).reduce((n, r) => n + dansRubrique(r.titre), 0);

  const changer = (c: ChoixAmenagements) => onChange(amenagementsVides(c) ? undefined : { ...c, niveau });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>{label}</b>
        <Aide titre="La liste du LPI" vers="droite">
          <p>Les mêmes onglets et les mêmes rubriques que dans le Livret de parcours inclusif.</p>
          <p>Mieux vaut peu d'aménagements, vraiment tenus en classe. Dans le PDF du LPI, seuls les premiers apparaissent : mettez en haut les plus importants.</p>
          <p>Chaque rubrique accepte trois aménagements écrits à la main.</p>
          <p>Source : {SOURCE}</p>
        </Aide>
        <div className="seg">
          {NIVEAUX_LPI.map((n) => (
            <button key={n.id} type="button" className={niveau === n.id ? "active" : ""} onClick={() => setNiveauChoisi(n.id)}>{n.nom}</button>
          ))}
        </div>
      </div>

      {choix.retenus.length > 0 && (
        <ol style={{ listStyle: "none", margin: "0 0 10px", padding: 0, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {choix.retenus.map((r, i) => (
            <li key={`${r.rubrique}|${r.autre ?? ""}|${r.texte}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 8px", borderTop: i ? "1px solid var(--border)" : "none", background: "var(--panel-2)" }}>
              <b style={{ fontSize: 12, minWidth: 18, textAlign: "right", paddingTop: 1 }}>{i + 1}</b>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5 }}>{r.texte}</div>
                <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4 }}>{r.rubrique}</div>
                <Input value={r.precision ?? ""} maxLength={100} placeholder="Préciser" aria-label={`Préciser : ${r.texte}`}
                  style={{ fontSize: 12 }} onChange={(e) => changer(preciserAmenagement(choix, i, e.target.value))} />
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button type="button" className="btn ghost sm" style={styleFleche} disabled={i === 0} aria-label={`Monter : ${r.texte}`}
                  onClick={() => changer(deplacerAmenagement(choix, i, -1))}>↑</button>
                <button type="button" className="btn ghost sm" style={styleFleche} disabled={i === choix.retenus.length - 1} aria-label={`Descendre : ${r.texte}`}
                  onClick={() => changer(deplacerAmenagement(choix, i, 1))}>↓</button>
                <button type="button" className="btn ghost sm" style={styleFleche} aria-label={`Retirer : ${r.texte}`}
                  onClick={() => changer(retirerAmenagement(choix, i))}>✕</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="seg" style={{ marginBottom: 8, flexWrap: "wrap" }}>
        {onglets.map((o) => (
          <button key={o} type="button" className={ongletVu === o ? "active" : ""} onClick={() => setOnglet(o)}>
            {o}{dansOnglet(o) > 0 ? ` (${dansOnglet(o)})` : ""}
          </button>
        ))}
      </div>

      {rubriques.filter((r) => r.onglet === ongletVu).map((r) => (
        <details key={`${niveau}|${r.titre}`} style={styleRubrique}>
          <summary style={styleTitre}>{r.titre} <Compte n={dansRubrique(r.titre)} /></summary>
          <div style={{ paddingBottom: 8 }}>
            {r.items.map((t) => (
              <label key={t} style={styleCase}>
                <input type="checkbox" style={{ marginTop: 2, flexShrink: 0 }} checked={estRetenu(choix, r.titre, t)}
                  onChange={() => changer(basculerAmenagement(choix, r.titre, t))} />
                <span>{t}</span>
              </label>
            ))}
            <div style={{ display: "grid", gap: 4, padding: "6px 10px 0" }}>
              {[0, 1, 2].map((rang) => (
                <Input key={rang} value={texteAutre(choix, r.titre, rang)} maxLength={200} placeholder="Autre"
                  aria-label={`Autre aménagement, ${r.titre}`} style={{ fontSize: 12 }}
                  onChange={(e) => changer(poserAutre(choix, r.titre, rang, e.target.value))} />
              ))}
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

const SENS: { id: SensLpi; nom: string; lire: (p: { appui: string; difficulte: string }) => string }[] = [
  { id: "appuis", nom: "Points d'appui", lire: (p) => p.appui },
  { id: "difficultes", nom: "Difficultés", lire: (p) => p.difficulte },
];

/** Les points d'appui et les difficultés d'un plan, par domaine et sous-domaine. */
export function ChampAppuis({ label, valeur, onChange }: {
  label: string; valeur: unknown; onChange: (v: ChoixAppuis | undefined) => void;
}) {
  const choix = lireAppuis(valeur);
  const [sensId, setSensId] = React.useState<SensLpi>("appuis");
  const sens = SENS.find((s) => s.id === sensId)!;
  const changer = (c: ChoixAppuis) => onChange(appuisVides(c) ? undefined : c);
  const domaines = [...new Set(POINTS_ET_DIFFICULTES_LPI.map((s) => s.domaine))];
  const dansSous = (titre: string) => choix[sensId].filter((l) => l.sousDomaine === titre).length;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <b style={{ fontSize: 13 }}>{label}</b>
        <Aide titre="La liste du LPI" vers="droite">
          <p>Les mêmes domaines et sous-domaines que dans le Livret de parcours inclusif.</p>
          <p>Source : {SOURCE}</p>
        </Aide>
        <div className="seg">
          {SENS.map((s) => (
            <button key={s.id} type="button" className={sensId === s.id ? "active" : ""} onClick={() => setSensId(s.id)}>
              {s.nom}{choix[s.id].length > 0 ? ` (${choix[s.id].length})` : ""}
            </button>
          ))}
        </div>
      </div>

      {choix[sensId].length > 0 && (
        <div style={{ fontSize: 12.5, marginBottom: 8, padding: "6px 8px", background: "var(--panel-2)", borderRadius: 8 }}>
          {choix[sensId].map((l) => l.texte).join(" · ")}
        </div>
      )}

      {domaines.map((d) => (
        <div key={d}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2)", margin: "8px 0 4px" }}>{d}</div>
          {POINTS_ET_DIFFICULTES_LPI.filter((s) => s.domaine === d).map((s) => (
            <details key={`${sensId}|${s.titre}`} style={styleRubrique}>
              <summary style={styleTitre}>{s.titre} <Compte n={dansSous(s.titre)} /></summary>
              <div style={{ paddingBottom: 8 }}>
                {s.paires.map((p) => {
                  const t = sens.lire(p);
                  return (
                    <label key={t} style={styleCase}>
                      <input type="checkbox" style={{ marginTop: 2, flexShrink: 0 }} checked={ligneRetenue(choix, sensId, s.titre, t)}
                        onChange={() => changer(basculerLigne(choix, sensId, s.titre, t))} />
                      <span>{t}</span>
                    </label>
                  );
                })}
                <div style={{ padding: "6px 10px 0" }}>
                  <Input value={texteLigneAutre(choix, sensId, s.titre)} maxLength={200} placeholder="Autre"
                    aria-label={`Autre, ${s.titre}`} style={{ fontSize: 12 }}
                    onChange={(e) => changer(poserLigneAutre(choix, sensId, s.titre, e.target.value))} />
                </div>
              </div>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}
