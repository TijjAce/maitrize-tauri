import React from "react";
import { raccourci } from "../api";
import { Field, Input, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML } from "../print";
import {
  genererPartieTout, genererMultiplicatifs, blocProbleme, blocCorrige, feuilleProblemes, classesFeuille, lirePrenoms,
  STYLE_FEUILLE, TYPES_MULTIPLICATIFS, PLAFONDS, nombre,
  type Probleme, type OptionsFeuille, type InconnuePartieTout, type TypeMultiplicatif,
} from "../problemesBarres";

// ── Fabriquer → Problèmes en barres ────────────────────────────────────────
//
// Deux onglets : les problèmes partie-tout (additifs) et les problèmes
// multiplicatifs. On règle, on regarde l'aperçu, on change un problème qui ne
// convient pas, puis on imprime la feuille et son corrigé.

const nouvelleGraine = () => Math.floor(Math.random() * 2 ** 31);

interface ReglagesCommuns extends OptionsFeuille {
  nombre: number;
  enonces: boolean;
  prenoms: string;
}

/** Réglages gardés d'une visite à l'autre sur cet ordinateur. */
function useReglages<T extends object>(cle: string, defaut: T): [T, (maj: Partial<T>) => void] {
  const [valeur, setValeur] = React.useState<T>(() => {
    try {
      const lu = localStorage.getItem(`fabriquer:${cle}`);
      return lu ? { ...defaut, ...JSON.parse(lu) } : defaut;
    } catch {
      return defaut;
    }
  });
  const maj = React.useCallback((m: Partial<T>) => setValeur((avant) => {
    const suite = { ...avant, ...m };
    try { localStorage.setItem(`fabriquer:${cle}`, JSON.stringify(suite)); } catch { /* stockage indisponible */ }
    return suite;
  }), [cle]);
  return [valeur, maj];
}

/** La feuille tirée : sa graine, les problèmes retirés un à un. */
function useTirage() {
  const [graine, setGraine] = React.useState(nouvelleGraine);
  const [retirages, setRetirages] = React.useState<Record<number, number>>({});
  return {
    graine, retirages,
    nouvelle: () => { setGraine(nouvelleGraine()); setRetirages({}); },
    retirer: (i: number) => setRetirages((r) => ({ ...r, [i]: nouvelleGraine() })),
  };
}

const imprimer = (problemes: Probleme[], options: OptionsFeuille) => {
  printHTML(options.titre.trim() || "Problèmes", feuilleProblemes(problemes, options), STYLE_FEUILLE);
  toast(`La feuille s'ouvre dans le navigateur : imprimez-la ou enregistrez-la en PDF (${raccourci("P")}).`, { icone: "🖨", duree: 6000 });
};

// ── Partie-tout ────────────────────────────────────────────────────────────

export function PartieToutTab() {
  const [r, maj] = useReglages("partieTout", {
    titre: "Problèmes partie-tout", nombre: 6, enonces: true, prenoms: "", schema: "nombres" as OptionsFeuille["schema"],
    corrige: true, grandTexte: false, majuscules: false,
    parties: 2, inconnue: "melange" as InconnuePartieTout, max: 20,
  });
  const tirage = useTirage();
  const problemes = React.useMemo(() => genererPartieTout(
    { nombre: r.nombre, parties: r.parties, inconnue: r.inconnue, max: r.max, enonces: r.enonces, prenoms: lirePrenoms(r.prenoms) },
    tirage.graine, tirage.retirages,
  ), [r.nombre, r.parties, r.inconnue, r.max, r.enonces, r.prenoms, tirage.graine, tirage.retirages]);

  return (
    <Atelier
      intro={<>Un tout et ses parties : l'élève voit ce qui manque avant de choisir l'opération. Programmes : « résoudre des
        problèmes additifs en une étape de type parties-tout ».</>}
      reglages={r} maj={maj} problemes={problemes} tirage={tirage}
    >
      <Field label="Ce que l'élève cherche">
        <Select value={r.inconnue} onChange={(e) => maj({ inconnue: e.target.value as InconnuePartieTout })}>
          <option value="melange">Le tout ou une partie, en alternance</option>
          <option value="tout">Le tout</option>
          <option value="partie">Une partie</option>
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Parties">
          <Select value={r.parties} onChange={(e) => maj({ parties: Number(e.target.value) })}>
            <option value={2}>2 parties</option>
            <option value={3}>3 parties</option>
          </Select>
        </Field>
        <Field label="Nombres">
          <Select value={r.max} onChange={(e) => maj({ max: Number(e.target.value) })}>
            {PLAFONDS.map((m) => <option key={m} value={m}>jusqu'à {nombre(m)}</option>)}
          </Select>
        </Field>
      </div>
    </Atelier>
  );
}

// ── Multiplicatifs ─────────────────────────────────────────────────────────

export function MultiplicatifsTab() {
  const [r, maj] = useReglages("multiplicatifs", {
    titre: "Problèmes multiplicatifs", nombre: 6, enonces: true, prenoms: "", schema: "nombres" as OptionsFeuille["schema"],
    corrige: true, grandTexte: false, majuscules: false,
    types: ["tout", "part", "nombre"] as TypeMultiplicatif[], table: 10,
  });
  const tirage = useTirage();
  const types = r.types.filter((t) => TYPES_MULTIPLICATIFS.some((x) => x.id === t));
  const problemes = React.useMemo(() => genererMultiplicatifs(
    { nombre: r.nombre, types, table: r.table, enonces: r.enonces, prenoms: lirePrenoms(r.prenoms) },
    tirage.graine, tirage.retirages,
  ), [r.nombre, types.join(), r.table, r.enonces, r.prenoms, tirage.graine, tirage.retirages]); // eslint-disable-line react-hooks/exhaustive-deps

  const basculer = (t: TypeMultiplicatif) => {
    const suite = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    if (!suite.length) { toast("Gardez au moins un type de problème.", { icone: "ℹ️" }); return; }
    // Dans l'ordre de la liste : les problèmes se succèdent dans cet ordre sur la feuille.
    maj({ types: TYPES_MULTIPLICATIFS.map((x) => x.id).filter((id) => suite.includes(id)) });
  };

  return (
    <Atelier
      intro={<>Des parts égales qui font un tout, ou une quantité plusieurs fois plus grande qu'une autre. Programmes :
        « résoudre des problèmes multiplicatifs de type parties-tout en une étape ».</>}
      reglages={r} maj={maj} problemes={problemes} tirage={tirage}
    >
      <Field label="Types de problèmes, en alternance sur la feuille">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TYPES_MULTIPLICATIFS.map((t) => (
            <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={types.includes(t.id)} onChange={() => basculer(t.id)} />
              <span><b>{t.libelle}</b><br /><span style={{ color: "var(--text-2)" }}>{t.exemple}</span></span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Facteurs">
        <Select value={r.table} onChange={(e) => maj({ table: Number(e.target.value) })}>
          <option value={5}>jusqu'à 5 (tables de 2 à 5)</option>
          <option value={10}>jusqu'à 10 (tables de 2 à 10)</option>
        </Select>
      </Field>
    </Atelier>
  );
}

// ── Mise en page commune ───────────────────────────────────────────────────

function Atelier<T extends ReglagesCommuns>({ intro, reglages: r, maj, problemes, tirage, children }: {
  intro: React.ReactNode;
  reglages: T;
  maj: (m: Partial<T>) => void;
  problemes: Probleme[];
  tirage: ReturnType<typeof useTirage>;
  children: React.ReactNode;
}) {
  const [corrige, setCorrige] = React.useState(false);
  const options: OptionsFeuille = {
    titre: r.titre, schema: r.schema, corrige: r.corrige, grandTexte: r.grandTexte, majuscules: r.majuscules,
  };
  const seuls = !r.enonces;
  const blocs = problemes.map((p, i) => ({ i, html: corrige ? blocCorrige(p, i) : blocProbleme(p, i, options) }));
  const coche = (cle: "corrige" | "grandTexte" | "majuscules", libelle: string) => (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 6, cursor: "pointer" }}>
      <input type="checkbox" checked={r[cle]} onChange={(e) => maj({ [cle]: e.target.checked } as Partial<T>)} />
      {libelle}
    </label>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(270px, 350px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-2)" }}>{intro}</p>
        <Field label="Titre de la feuille">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value } as Partial<T>)} />
        </Field>
        <Field label="Forme">
          <div className="seg">
            <button className={r.enonces ? "active" : ""} onClick={() => maj({ enonces: true } as Partial<T>)}>Problèmes rédigés</button>
            <button className={!r.enonces ? "active" : ""} onClick={() => maj({ enonces: false } as Partial<T>)}>Schémas seuls</button>
          </div>
        </Field>
        {children}
        <Field label="Nombre de problèmes">
          <Select value={r.nombre} onChange={(e) => maj({ nombre: Number(e.target.value) } as Partial<T>)}>
            {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        {r.enonces && (
          <>
            <Field label="Schéma sur la feuille">
              <Select value={r.schema} onChange={(e) => maj({ schema: e.target.value as OptionsFeuille["schema"] } as Partial<T>)}>
                <option value="nombres">Avec les nombres de l'énoncé et « ? »</option>
                <option value="vide">Cases vides, à compléter par l'élève</option>
                <option value="sans">Sans schéma : un cadre pour le dessiner</option>
              </Select>
            </Field>
            <Field label="Prénoms dans les énoncés (facultatif)">
              <Input value={r.prenoms} placeholder="Séparés par des virgules : Léa, Tom…"
                onChange={(e) => maj({ prenoms: e.target.value } as Partial<T>)} />
            </Field>
            {coche("grandTexte", "Énoncés en grand")}
            {coche("majuscules", "Énoncés en capitales")}
          </>
        )}
        {coche("corrige", "Ajouter le corrigé à la fin")}
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Aperçu</h3>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={corrige} onChange={(e) => setCorrige(e.target.checked)} /> Voir le corrigé
          </label>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={tirage.nouvelle} title="Tire d'autres nombres et d'autres situations">🔀 Nouvelle feuille</button>
          <button className="btn sm primary" onClick={() => imprimer(problemes, options)}>🖨 Imprimer</button>
        </div>
        <style>{STYLE_FEUILLE}</style>
        <div className={`pb-apercu ${classesFeuille(options)}`}>
          <div className={seuls ? "pb-grille" : undefined}>
            {blocs.map(({ i, html }) => (
              <div key={i} className="pb-apercu-probleme">
                <div dangerouslySetInnerHTML={{ __html: html }} />
                <button className="btn sm pb-retirer" onClick={() => tirage.retirer(i)}
                  title="Remplacer ce problème par un autre" aria-label={`Remplacer le problème ${i + 1}`}>↻</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
