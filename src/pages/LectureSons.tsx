import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { escapeHtml } from "../print";
import { imprimerAtelier } from "../impressionAtelier";
import {
  fabriquerFiche, REGLAGES_PAR_DEFAUT, SONS, type FicheSon,
} from "../lectureSons";

// ── Fabriquer › Langage › Fiches de sons ──────────────────────────────────
//
// Une fiche par son : les syllabes à lire, les mots, ceux qu'on entoure parce
// qu'on y entend le son, ceux qu'on complète. C'est la feuille qu'on refait
// trente fois dans l'année, et qu'on refait à la main faute d'outil.
//
// L'enseignant ajoute ses mots : en IME, le vocabulaire de la classe compte
// plus que le nôtre, et ses mots passent devant.

function Apercu({ f, r }: { f: FicheSon; r: typeof REGLAGES_PAR_DEFAUT }) {
  return (
    <div className="pb-apercu-page">
      <h2 style={{ margin: "0 0 4px", fontSize: 19 }}>{f.titre}</h2>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#687087" }}>
        Prénom : ................................ Date : ..............
      </p>
      {r.syllabes && (
        <section style={{ marginBottom: 14 }}>
          <h3 className="ls-consigne">Je lis les syllabes</h3>
          <div className="ls-syllabes">{f.syllabes.map((s) => <span key={s}>{s}</span>)}</div>
        </section>
      )}
      {r.lireDesMots && (
        <section style={{ marginBottom: 14 }}>
          <h3 className="ls-consigne">Je lis les mots</h3>
          <div className="ls-mots">{f.mots.map((m) => <span key={m}>{m}</span>)}</div>
        </section>
      )}
      {r.entourer && (
        <section style={{ marginBottom: 14 }}>
          <h3 className="ls-consigne">J'entoure les mots où j'entends {f.son.son}</h3>
          <div className="ls-mots">{f.aEntourer.map(({ mot }) => <span key={mot}>{mot}</span>)}</div>
        </section>
      )}
      {r.completer && f.aCompleter.length > 0 && (
        <section style={{ marginBottom: 14 }}>
          <h3 className="ls-consigne">Je complète avec « {f.son.graphemes[0]} »</h3>
          <div className="ls-mots">{f.aCompleter.map(({ trou }, i) => <span key={i}>{trou}</span>)}</div>
        </section>
      )}
      {r.ecrire && (
        <section>
          <h3 className="ls-consigne">J'écris le son</h3>
          <div className="ls-lignes">{[0, 1, 2].map((i) => <div key={i} />)}</div>
        </section>
      )}
    </div>
  );
}

export function LectureSonsTab() {
  const [r, maj] = useReglages("lectureSons", REGLAGES_PAR_DEFAUT);
  const [graine, setGraine] = React.useState(() => Math.floor(Math.random() * 1e9));
  const f = React.useMemo(() => fabriquerFiche(r, graine), [r, graine]);

  const imprimer = () => {
    const bloc = (consigne: string, contenu: string) =>
      `<h3>${escapeHtml(consigne)}</h3><div class="ligne">${contenu}</div>`;
    const mots = (liste: string[]) => liste.map((m) => `<span>${escapeHtml(m)}</span>`).join("");
    const corps = [
      r.syllabes ? bloc("Je lis les syllabes", mots(f.syllabes)) : "",
      r.lireDesMots ? bloc("Je lis les mots", mots(f.mots)) : "",
      r.entourer ? bloc(`J'entoure les mots où j'entends ${f.son.son}`, mots(f.aEntourer.map((x) => x.mot))) : "",
      r.completer && f.aCompleter.length
        ? bloc(`Je complète avec « ${f.son.graphemes[0]} »`, mots(f.aCompleter.map((x) => x.trou))) : "",
      r.ecrire ? `<h3>J'écris le son</h3><div class="lignes"><div></div><div></div><div></div></div>` : "",
    ].join("");
    void imprimerAtelier("sons", f.titre,
      `<h1>${escapeHtml(f.titre)}</h1><p class="nom">Prénom : ........................................ Date : ........................</p>${corps}`,
      `h3 { font-size: 14px; margin: 16px 0 6px; }
       .nom { font-size: 12px; color: #555; margin: 0 0 12px; }
       .ligne { display: flex; flex-wrap: wrap; gap: 10px 22px; font-size: 21px; letter-spacing: .5px; }
       .lignes div { border-bottom: 1.2px solid #888; height: 30px; margin-bottom: 12px; }`);
  };

  const coche = (cle: keyof typeof REGLAGES_PAR_DEFAUT, libelle: string) => (
    <label className="pb-coche">
      <input type="checkbox" checked={Boolean(r[cle])}
        onChange={(e) => maj({ [cle]: e.target.checked } as Partial<typeof REGLAGES_PAR_DEFAUT>)} />
      <span>{libelle}</span>
    </label>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>La fiche de son</h3>
        <p className="meta" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          Les syllabes, les mots, ceux qu'on entoure et ceux qu'on complète. Les sons sont
          rangés dans l'ordre des méthodes syllabiques : les voyelles, les consonnes qu'on
          peut tenir en les prononçant, puis les graphèmes complexes.
        </p>

        <Field label="Le son travaillé">
          <Select value={r.son} onChange={(e) => maj({ son: e.target.value })}>
            {SONS.map((s) => (
              <option key={s.id} value={s.id}>{s.son} — {s.graphemes.join(", ")}</option>
            ))}
          </Select>
        </Field>

        <Field label="Ce que la fiche contient">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {coche("syllabes", "Je lis les syllabes")}
            {coche("lireDesMots", "Je lis les mots")}
            {coche("entourer", "J'entoure les mots où j'entends le son")}
            {coche("completer", "Je complète avec le graphème")}
            {coche("ecrire", "Lignes pour écrire le son")}
          </div>
        </Field>

        <Field label="Mes mots (facultatif)">
          <Textarea value={r.mesMots} rows={3}
            placeholder="Un mot par ligne. Ceux qui portent le son passent devant les nôtres."
            onChange={(e) => maj({ mesMots: e.target.value })} />
        </Field>

        <Field label="Titre de la feuille">
          <Input value={r.titre} placeholder={`Le son ${f.son.son} — ${f.son.graphemes.join(", ")}`}
            onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
      </div>

      <div className="card" style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>Aperçu</b>
          <div className="spacer" style={{ flex: 1 }} />
          <button className="btn sm" onClick={() => setGraine(Math.floor(Math.random() * 1e9))}>
            🔀 Nouvelle feuille
          </button>
          <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
        </div>
        <div className="pb-apercu"><Apercu f={f} r={r} /></div>
      </div>
    </div>
  );
}
