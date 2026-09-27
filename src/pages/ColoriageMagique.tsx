import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { printHTML, escapeHtml } from "../print";
import {
  consigne, couleurDe, fabriquerColoriage, MOTIFS, OPERATIONS, PLAFONDS, REGLAGES_PAR_DEFAUT,
  casesAColorier, type Coloriage, type Operation,
} from "../coloriageMagique";

// ── Fabriquer › Mathématiques › Coloriage magique ─────────────────────────
//
// On calcule, le résultat dit la couleur, l'image apparaît. L'intérêt n'est
// pas le dessin : c'est qu'une erreur se voie. Une case de la mauvaise
// couleur crève les yeux au milieu d'un poisson, là où une colonne de calculs
// faux passe inaperçue — l'élève se corrige seul.

/** La grille, à l'écran comme au papier. Le corrigé remplit les couleurs. */
function Grille({ c, corrige }: { c: Coloriage; corrige: boolean }) {
  return (
    <table className="cm-grille">
      <tbody>
        {c.lignes.map((ligne, y) => (
          <tr key={y}>
            {ligne.map((caseC, x) => {
              const couleur = corrige && caseC.couleur ? couleurDe(caseC.couleur)?.hex : undefined;
              return (
                <td key={x} style={couleur ? { background: couleur, color: "#fff" } : undefined}>
                  {caseC.calcul}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Legende({ c }: { c: Coloriage }) {
  return (
    <div className="cm-legende">
      {c.legende.map(({ couleur, resultat }) => (
        <div key={couleur.id} className="cm-legende-ligne">
          <span className="cm-pastille" style={{ background: couleur.hex }} />
          <b>{resultat}</b> <span>{couleur.nom}</span>
        </div>
      ))}
    </div>
  );
}

export function ColoriageMagiqueTab() {
  const [r, maj] = useReglages("coloriage", REGLAGES_PAR_DEFAUT);
  const [graine, setGraine] = React.useState(() => Math.floor(Math.random() * 1e9));
  const [corrige, setCorrige] = React.useState(false);
  const c = React.useMemo(() => fabriquerColoriage(r, graine), [r, graine]);
  const multiplication = r.operation === "multiplication";

  const imprimer = (avecCorrige: boolean) => {
    const cases = c.lignes.map((ligne) => `<tr>${ligne.map((x) => {
      const fond = avecCorrige && x.couleur ? couleurDe(x.couleur)?.hex : "";
      return `<td${fond ? ` style="background:${fond};color:#fff"` : ""}>${escapeHtml(x.calcul)}</td>`;
    }).join("")}</tr>`).join("");
    const legende = c.legende.map(({ couleur, resultat }) =>
      `<span class="lg"><i style="background:${couleur.hex}"></i> <b>${resultat}</b> ${escapeHtml(couleur.nom)}</span>`).join("");
    printHTML(r.titre || "Coloriage magique",
      `<h1>${escapeHtml(r.titre || "Coloriage magique")}</h1>
       <p class="consigne">${escapeHtml(consigne(r))}</p>
       <div class="legende">${legende}</div>
       <table class="grille"><tbody>${cases}</tbody></table>
       <p class="nom">Nom : ...............................................</p>`,
      `.consigne { font-size: 14px; margin-bottom: 10px; }
       .legende { display: flex; gap: 18px; margin-bottom: 14px; font-size: 14px; }
       .lg i { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; vertical-align: -2px; }
       .grille { border-collapse: collapse; margin: 0 auto; }
       .grille td { border: 1.2px solid #222; width: 62px; height: 62px; text-align: center;
         font-size: 15px; vertical-align: middle; }
       .nom { margin-top: 22px; font-size: 13px; }`);
  };

  return (
    // Les réglages à gauche, la feuille à droite : la même disposition que
    // les autres ateliers, pour qu'on ne réapprenne pas l'écran.
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Le coloriage</h3>
        <p className="meta" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          L'élève calcule, le résultat lui dit la couleur, et le dessin apparaît. Une case
          fausse se voit tout de suite : c'est la feuille qui corrige, pas vous.
        </p>

        <Field label="Le dessin">
          <Select value={r.motif} onChange={(e) => maj({ motif: e.target.value })}>
            {MOTIFS.map((m) => (
              <option key={m.id} value={m.id}>{m.nom} — {casesAColorier(m)} calculs</option>
            ))}
          </Select>
        </Field>

        <Field label="Ce qu'on calcule">
          <Select value={r.operation} onChange={(e) => maj({ operation: e.target.value as Operation })}>
            {OPERATIONS.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
          </Select>
        </Field>

        {multiplication ? (
          <Field label="Table">
            <Select value={r.table} onChange={(e) => maj({ table: Number(e.target.value) })}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => <option key={t} value={t}>Table de {t}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="Nombres">
            <Select value={r.plafond} onChange={(e) => maj({ plafond: Number(e.target.value) })}>
              {PLAFONDS.map((p) => <option key={p} value={p}>jusqu'à {p}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Titre de la feuille">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
      </div>

      <div className="card" style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Aperçu</b>
          <label className="pb-coche" style={{ margin: 0 }}>
            <input type="checkbox" checked={corrige} onChange={(e) => setCorrige(e.target.checked)} />
            <span>Voir le corrigé</span>
          </label>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => setGraine(Math.floor(Math.random() * 1e9))}>
            🔀 Nouvelle feuille
          </button>
          <button className="btn primary sm" onClick={() => imprimer(false)}>🖨 Imprimer</button>
          <button className="btn ghost sm" onClick={() => imprimer(true)}
            title="La même feuille, coloriée : pour corriger d'un coup d'œil">
            🖨 Le corrigé
          </button>
        </div>
        <p className="meta" style={{ fontSize: 12.5, marginTop: 0 }}>{consigne(r)}</p>
        <Legende c={c} />
        <div style={{ overflowX: "auto" }}>
          <Grille c={c} corrige={corrige} />
        </div>
      </div>
    </div>
  );
}
