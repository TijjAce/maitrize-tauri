import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";
import { GRILLES, Grille, Bloc, Mise, compterRenseignes, compterTotal } from "../data/evaluationsDiagnostiques";

// ── Évaluation diagnostique ───────────────────────────────────────────────
// Un écran générique pour les deux grilles décrites dans
// data/evaluationsDiagnostiques.ts : même saisie, même enregistrement, même
// impression. Une grille par élève et par type, rangée dans son dossier.

type Valeurs = Record<string, any>;


/**
 * Feuille d'impression de la grille en colonnes : elle doit tenir sur une
 * seule page A4.
 *
 * Les 118 observables ne rentrent qu'en resserrant tout à la fois — marge de
 * page, corps du texte, interligne et cadres des rubriques. Mesuré grille
 * entièrement cochée, le pire cas : 245 mm pour 281 mm utiles, soit une
 * réserve de 36 mm qui absorbe les écarts de rendu d'un navigateur à l'autre.
 */

/**
 * Feuille d'impression de la grille S4C.
 *
 * Les 101 observables tenaient sur cinq pages avec une seule colonne
 * « Fréquence » où figurait la valeur en toutes lettres. Une colonne par
 * fréquence, comme sur la grille d'origine, se coche en un caractère et
 * laisse resserrer le tout. Mesuré grille entièrement notée : 486 mm, soit
 * deux pages, en-tête du tableau repris à chaque changement de feuille.
 */
const STYLE_COMPACT = `
  @page { size: A4 portrait; margin: 9mm; }
  body { padding: 0; font-size: 7.2pt; line-height: 1.12; }
  h1 { font-size: 13pt; margin: 0 0 1px; }
  .meta { font-size: 7pt; margin-bottom: 4px; }
  h2.dom { font-size: 8.5pt; margin: 4px 0 1px; border: 0; padding: 0;
    break-after: avoid; }
  table.s4c { width: 100%; border-collapse: collapse; margin: 0 0 3px;
    table-layout: fixed; }
  table.s4c th, table.s4c td { border: .4pt solid #cfd4e2; padding: .5px 3px;
    font-size: 7.2pt; vertical-align: middle; }
  /* Reprise de l'en-tête en haut de chaque page : sans elle, la deuxième
     feuille montre des colonnes de cases sans savoir laquelle est laquelle. */
  table.s4c thead { display: table-header-group; }
  table.s4c thead th { background: #f0f2f8; font-size: 6.8pt; line-height: 1;
    text-align: center; }
  table.s4c thead th:first-child { text-align: left; }
  table.s4c col.n { width: 13mm; }
  /* Interligne forcé sur la case : sans lui, le caractère ☒ impose sa propre
     hauteur et rallonge chacune des 101 lignes d'observable. */
  table.s4c td.cc { text-align: center; font-size: 8pt; line-height: 1; }
  table.s4c tr { break-inside: avoid; }
  /* Un sous-domaine seul en bas de page n'aide personne. */
  table.s4c tr.sd { break-after: avoid; }
  table.s4c tr.sd td { background: #eef1f8; font-weight: 700; }
  .ch { margin: 2px 0; }
  @media screen { body { max-width: 192mm; } }
`;

const STYLE_UNE_PAGE = `
  @page { size: A4 portrait; margin: 8mm; }
  body { padding: 0; font-size: 8.5pt; line-height: 1.2; }
  h1 { font-size: 14pt; margin: 0 0 1px; }
  .meta { font-size: 7.5pt; margin-bottom: 5px; }
  .grille { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; align-items: start; }
  .rub { border: .5pt solid #b9bfcc; border-radius: 3px; padding: 3px 5px 4px;
    margin-bottom: 4px; break-inside: avoid; }
  .rt { font-size: 8pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: .02em; margin-bottom: 1px; }
  /* Retrait négatif : une ligne trop longue revient sous le texte, pas sous
     la case à cocher, comme sur la grille d'origine. */
  .it { padding-left: 9px; text-indent: -9px; }
  .ch { padding-left: 0; text-indent: 0; }
  .tr { border-bottom: .5pt solid #999; display: inline-block; min-width: 55px; }
  @media screen { body { max-width: 194mm; } }
`;

const cleDoc = (grille: Grille) => `evaldiag:${grille.id}`;

export function EvaluationDiagnostiqueTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [grilleId, setGrilleId] = React.useState(GRILLES[0].id);
  const [v, setV] = React.useState<Valeurs>({});
  const [charge, setCharge] = React.useState(false);

  const grille = GRILLES.find((g) => g.id === grilleId) ?? GRILLES[0];
  const eleve = eleves?.find((e) => e.id === eleveId);

  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  React.useEffect(() => {
    if (!eleveId) return;
    setCharge(false);
    api.documentEleveGet(eleveId, cleDoc(grille)).then((s) => {
      let lu: Valeurs = {};
      try { lu = s ? JSON.parse(s) : {}; } catch { lu = {}; }
      vRef.current = lu; setV(lu); setCharge(true);
    });
  }, [eleveId, grilleId]);

  // Référence à jour : deux clics rapprochés doivent se composer, pas
  // s'écraser — le même piège que sur les autres écrans de saisie.
  const vRef = React.useRef<Valeurs>({});
  vRef.current = v;
  const persister = (next: Valeurs) => {
    vRef.current = next; setV(next);
    if (eleveId) api.documentEleveSet(eleveId, cleDoc(grille), JSON.stringify(next));
  };
  const majBloc = (blocId: string, valeur: any) => persister({ ...vRef.current, [blocId]: valeur });

  const basculerCase = (blocId: string, item: string) => {
    const bloc = { ...(vRef.current[blocId] ?? {}) };
    if (bloc[item]) delete bloc[item]; else bloc[item] = true;
    majBloc(blocId, bloc);
  };
  const noter = (blocId: string, item: string, niveau: string) => {
    const bloc = { ...(vRef.current[blocId] ?? {}) };
    if (niveau) bloc[item] = niveau; else delete bloc[item];
    majBloc(blocId, bloc);
  };
  const saisir = (blocId: string, champId: string, texte: string) => {
    majBloc(blocId, { ...(vRef.current[blocId] ?? {}), [champId]: texte });
  };

  const vider = () => {
    if (!confirm(`Effacer la grille « ${grille.nom} » de ${eleve?.nom ?? "cet élève"} ?`)) return;
    persister({});
    toast("Grille vidée.", { icone: "🗑" });
  };

  const imprimer = () => {
    const entete = `<h1>${escapeHtml(grille.nom)}</h1>
       <div class="meta">${escapeHtml(eleve?.nom ?? "")}${eleve?.niveau ? " · " + escapeHtml(eleve.niveau) : ""}
         · ${new Date().toLocaleDateString("fr-FR")}</div>`;
    const pied = `<div class="meta" style="margin-top:14px;font-style:italic">${escapeHtml(grille.source)}</div>`;

    // ── Disposition en colonnes : on rejoue la mise en page du document ──
    if (grille.disposition === "colonnes") {
      const rubrique = (b: Bloc): string => {
        const val = v[b.id] ?? {};
        const couleur = grille.mise?.[b.id]?.couleur ?? "#4b5262";
        const ligne = (coche: boolean, texte: string) =>
          `<div class="it">${coche ? "☒" : "☐"} ${escapeHtml(texte)}</div>`;
        let corps = "";
        if (b.t === "cases") corps = b.items.map((i) => ligne(!!val[i], i)).join("");
        else if (b.t === "choix") corps = b.options.map((o) => ligne(val === o, o)).join("");
        else if (b.t === "champs") corps = b.champs.map((c) =>
          `<div class="it ch">${escapeHtml(c.label)} :
             <span class="tr">${escapeHtml(String(val[c.id] ?? ""))}</span></div>`).join("");
        return `<div class="rub">
            <div class="rt" style="color:${couleur}">${escapeHtml(b.titre)}</div>
            ${corps}
          </div>`;
      };
      // Trois colonnes, comme sur le document : les rubriques ne sont pas
      // coupées en deux grâce à break-inside.
      const colonnes = [1, 2, 3].map((c) =>
        `<div>${grille.blocs.filter((b) => (grille.mise?.[b.id]?.col ?? 1) === c).map(rubrique).join("")}</div>`
      ).join("");
      printHTML(`${grille.nom} — ${eleve?.nom ?? ""}`,
        `${entete}<div class="grille">${colonnes}</div>${pied}`,
        STYLE_UNE_PAGE);
      return;
    }

    // ── Disposition en liste (grille S4C) ──
    const niveaux = grille.niveaux ?? [];
    const blocHtml = (b: Bloc): string => {
      const val = v[b.id] ?? {};
      if (b.t === "champs") {
        const lignes = b.champs.map((c) =>
          `<div class="ch"><b>${escapeHtml(c.label)} :</b> ${escapeHtml(String(val[c.id] ?? "")) || "…"}</div>`).join("");
        return `<h2 class="dom">${escapeHtml(b.titre)}</h2>${lignes}`;
      }
      if (b.t === "choix") {
        const cases = b.options.map((o) =>
          `<span style="margin-right:14px">${val === o ? "☒" : "☐"} ${escapeHtml(o)}</span>`).join("");
        return `<div style="margin:6px 0"><b>${escapeHtml(b.titre)} :</b> ${cases}</div>`;
      }
      if (b.t === "cases") {
        const items = b.items.map((i) =>
          `<li style="list-style:none">${val[i] ? "☒" : "☐"} ${escapeHtml(i)}</li>`).join("");
        return `<h2 class="dom">${escapeHtml(b.titre)}</h2><ul style="margin:4px 0;padding-left:6px;columns:2">${items}</ul>`;
      }
      // Une colonne par fréquence, comme sur la grille de Cap école inclusive :
      // la feuille imprimée se remplit à la main aussi bien qu'elle restitue
      // ce qui a été saisi dans l'application.
      const lignes = b.groupes.map((g) =>
        `<tr class="sd"><td colspan="${niveaux.length + 1}">${escapeHtml(g.nom)}</td></tr>` +
        g.items.map((i) =>
          `<tr><td>${escapeHtml(i)}</td>` +
          niveaux.map((n) => `<td class="cc">${val[i] === n ? "☒" : "☐"}</td>`).join("") +
          `</tr>`).join("")
      ).join("");
      const colgroup = `<colgroup><col>${niveaux.map(() => '<col class="n">').join("")}</colgroup>`;
      const entetes = niveaux.map((n) => `<th>${escapeHtml(n)}</th>`).join("");
      return `<h2 class="dom">${escapeHtml(b.titre)}</h2>
        <table class="s4c">${colgroup}
          <thead><tr><th>Observable</th>${entetes}</tr></thead>
          <tbody>${lignes}</tbody>
        </table>`;
    };
    printHTML(`${grille.nom} — ${eleve?.nom ?? ""}`,
      `${entete}${grille.blocs.map(blocHtml).join("")}${pied}`,
      STYLE_COMPACT);
  };

  const renseignes = compterRenseignes(grille, v);
  const total = compterTotal(grille);

  if (!eleves?.length) {
    return <div className="card"><div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>
      Ajoutez d'abord vos élèves dans l'onglet Classe.
    </div></div>;
  }

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 200 }}>
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="seg">
          {GRILLES.map((g) => (
            <button key={g.id} className={grilleId === g.id ? "active" : ""} title={g.sousTitre}
              onClick={() => setGrilleId(g.id)}>{g.nom}</button>
          ))}
        </div>
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{renseignes}/{total} renseigné(s)</span>
        {renseignes > 0 && <button className="btn ghost sm" onClick={vider}>Vider</button>}
        <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: "8px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{grille.sousTitre}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
          {grille.source}
          {grille.lien && <>
            {" · "}
            <a href={grille.lien} style={{ color: "var(--accent)", cursor: "pointer" }}
              onClick={(e) => { e.preventDefault(); openUrl(grille.lien!).catch(() => {}); }}>
              ouvrir l'outil en ligne ↗
            </a>
          </>}
        </div>
      </div>

      {!charge ? <div /> : grille.disposition === "colonnes" ? (
        <div className="card" style={{ padding: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, alignItems: "start" }}>
            {[1, 2, 3].map((col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {grille.blocs.filter((b) => (grille.mise?.[b.id]?.col ?? 1) === col).map((b) => (
                  <Rubrique key={b.id} bloc={b} valeur={v[b.id]} mise={grille.mise?.[b.id]}
                    onCase={(item) => basculerCase(b.id, item)}
                    onChoix={(o) => majBloc(b.id, v[b.id] === o ? "" : o)}
                    onTexte={(champ, texte) => saisir(b.id, champ, texte)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : grille.blocs.map((b) => (
        <BlocGrille key={b.id} bloc={b} valeur={v[b.id]} niveaux={grille.niveaux ?? []}
          onCase={(item) => basculerCase(b.id, item)}
          onChoix={(o) => majBloc(b.id, v[b.id] === o ? "" : o)}
          onNiveau={(item, n) => noter(b.id, item, n)}
          onTexte={(champ, texte) => saisir(b.id, champ, texte)} />
      ))}
    </>
  );
}

function BlocGrille({ bloc, valeur, niveaux, onCase, onChoix, onNiveau, onTexte }: {
  bloc: Bloc; valeur: any; niveaux: string[];
  onCase: (item: string) => void;
  onChoix: (option: string) => void;
  onNiveau: (item: string, niveau: string) => void;
  onTexte: (champ: string, texte: string) => void;
}) {
  const val = valeur ?? {};
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{bloc.titre}</h3>

      {bloc.t === "cases" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 4 }}>
          {bloc.items.map((i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer", padding: "2px 0" }}>
              <input type="checkbox" checked={!!val[i]} onChange={() => onCase(i)} />
              {i}
            </label>
          ))}
        </div>
      )}

      {bloc.t === "choix" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {bloc.options.map((o) => (
            <button key={o} className={"btn sm" + (valeur === o ? " primary" : "")} onClick={() => onChoix(o)}>{o}</button>
          ))}
        </div>
      )}

      {bloc.t === "echelle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {bloc.groupes.map((g) => (
            <div key={g.nom}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{g.nom}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {g.items.map((i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{i}</span>
                    <div className="seg">
                      {niveaux.map((n) => (
                        <button key={n} className={val[i] === n ? "active" : ""} style={{ fontSize: 12 }}
                          onClick={() => onNiveau(i, val[i] === n ? "" : n)}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {bloc.t === "champs" && (
        <div className="row">
          {bloc.champs.map((c) => (
            <Field key={c.id} label={c.label}>
              {c.label.length > 28
                ? <Textarea rows={3} value={val[c.id] ?? ""} onChange={(e) => onTexte(c.id, e.target.value)} />
                : <Input value={val[c.id] ?? ""} onChange={(e) => onTexte(c.id, e.target.value)} />}
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}


/**
 * Une rubrique de la grille papier : encadré, titre en capitales colorées,
 * items cochables à la suite. Volontairement compact — l'original tient sur
 * une page, et c'est ce qui le rend consultable d'un coup d'œil.
 */
function Rubrique({ bloc, valeur, mise, onCase, onChoix, onTexte }: {
  bloc: Bloc; valeur: any; mise?: Mise;
  onCase: (item: string) => void;
  onChoix: (option: string) => void;
  onTexte: (champ: string, texte: string) => void;
}) {
  const val = valeur ?? {};
  const couleur = mise?.couleur ?? "var(--text-2)";
  const caseAcocher = (coche: boolean, texte: string, onClick: () => void) => (
    <label key={texte} onClick={onClick}
      style={{ display: "flex", gap: 5, alignItems: "flex-start", fontSize: 12.5, lineHeight: 1.35,
        cursor: "pointer", padding: "1px 0" }}>
      <span style={{ color: coche ? couleur : "var(--text-2)", fontWeight: 700, flexShrink: 0 }}>
        {coche ? "☒" : "☐"}
      </span>
      <span style={{ opacity: coche ? 1 : 0.9 }}>{texte}</span>
    </label>
  );

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", background: "var(--panel)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, color: couleur,
        textTransform: "uppercase", marginBottom: 4 }}>
        {bloc.titre}
      </div>

      {bloc.t === "cases" && bloc.items.map((i) => caseAcocher(!!val[i], i, () => onCase(i)))}

      {bloc.t === "choix" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {bloc.options.map((o) => caseAcocher(valeur === o, o, () => onChoix(o)))}
        </div>
      )}

      {bloc.t === "champs" && bloc.champs.map((c) => (
        <div key={c.id} style={{ marginTop: 3 }}>
          <div style={{ fontSize: 11, color: "var(--text-2)" }}>{c.label}</div>
          <Input value={val[c.id] ?? ""} style={{ height: 26, fontSize: 12.5 }}
            onChange={(e) => onTexte(c.id, e.target.value)} />
        </div>
      ))}
    </div>
  );
}
