import React from "react";
import { Page } from "../App";
import { api } from "../api";
import { Field, Input, Empty } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";
import { nombreDePages, rendrePage, octetsDuFichier, PageRendue } from "../pdfRendu";
import { GRAVITES, Constat, consigneAnalyse, lireConstats, resume } from "../adaptation";

// ── Adapter une fiche ──────────────────────────────────────────────────────
//
// Le modèle regarde la page et dit ce qui surcharge ; il ne touche à rien.
// Un dessin à côté d'une addition peut être un décor ou ce qu'il faut
// compter : se tromper là casserait l'exercice. L'enseignant garde donc la
// décision, et l'écran montre où se trouve chaque constat pour qu'il puisse
// juger sans relire toute la fiche.

export default function Adapter() {
  const [octets, setOctets] = React.useState<Uint8Array | null>(null);
  const [nomFichier, setNomFichier] = React.useState("");
  const [pages, setPages] = React.useState(0);
  const [numero, setNumero] = React.useState(1);
  const [rendu, setRendu] = React.useState<PageRendue | null>(null);
  const [niveau, setNiveau] = React.useState("");
  const [constats, setConstats] = React.useState<Constat[] | null>(null);
  const [retenus, setRetenus] = React.useState<Set<number>>(new Set());
  const [survole, setSurvole] = React.useState<number | null>(null);
  const [occupe, setOccupe] = React.useState("");
  const entree = React.useRef<HTMLInputElement>(null);

  const charger = async (f: File) => {
    setOccupe("Lecture du PDF…");
    try {
      const o = await octetsDuFichier(f);
      const n = await nombreDePages(o);
      setOctets(o); setNomFichier(f.name); setPages(n); setNumero(1);
      setConstats(null); setRetenus(new Set());
      setRendu(await rendrePage(o, 1));
    } catch (e: any) {
      toast("PDF illisible : " + String(e?.message ?? e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  const allerPage = async (n: number) => {
    if (!octets) return;
    setNumero(n); setConstats(null); setRetenus(new Set());
    setOccupe("Rendu de la page…");
    try { setRendu(await rendrePage(octets, n)); }
    catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };

  const analyser = async () => {
    if (!rendu) return;
    setOccupe("Le modèle regarde la page…");
    try {
      const reponse = await api.mistralVision(consigneAnalyse(niveau), rendu.image);
      const lus = lireConstats(reponse);
      setConstats(lus);
      // Les constats incertains ne sont pas cochés d'office : ce sont ceux
      // où le modèle doute qu'un élément soit décoratif.
      setRetenus(new Set(lus.map((c, i) => (c.incertain ? -1 : i)).filter((i) => i >= 0)));
      if (!lus.length) toast("Rien de superflu repéré sur cette page.", { icone: "✅" });
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  const basculer = (i: number) => setRetenus((s) => {
    const n = new Set(s);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });

  const imprimerFiche = () => {
    if (!constats) return;
    const gardes = constats.filter((_, i) => retenus.has(i));
    if (!gardes.length) { toast("Cochez au moins un constat.", { icone: "⚠️" }); return; }
    const lignes = gardes.map((c) => `
      <tr>
        <td><b>${escapeHtml(c.element)}</b><div class="meta">${escapeHtml(c.critere.label)}</div></td>
        <td>${escapeHtml(c.pourquoi)}</td>
        <td>${escapeHtml(c.suggestion)}</td>
      </tr>`).join("");
    printHTML(`Adaptation — ${nomFichier}`,
      `<h1>Adaptation d'une fiche</h1>
       <div class="meta">${escapeHtml(nomFichier)} · page ${numero}${niveau ? " · " + escapeHtml(niveau) : ""}
         · ${new Date().toLocaleDateString("fr-FR")}</div>
       <table><tr><th>Élément</th><th>Pourquoi ça gêne</th><th>Ce qu'on fait</th></tr>${lignes}</table>
       <div class="meta" style="margin-top:14px;font-style:italic">
         Constats proposés par l'assistant et retenus par l'enseignant. La fiche
         d'origine n'a pas été modifiée.</div>`);
  };

  const r = constats ? resume(constats) : null;

  return (
    <Page titre="Adapter une fiche" sous="Repérer ce qui surcharge un élève avec TSA"
      actions={<>
        <input ref={entree} type="file" accept="application/pdf" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) charger(f); e.target.value = ""; }} />
        <button className="btn" onClick={() => entree.current?.click()}>📄 Ouvrir un PDF</button>
      </>}>

      {!rendu ? (
        <Empty icone="📄" titre="Aucune fiche ouverte"
          sous="Ouvrez un PDF d'exercice : l'assistant regardera la page et signalera ce qui surcharge." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 420px)", gap: 14, alignItems: "start" }}>
          <div className="card">
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <b style={{ fontSize: 13 }}>{nomFichier}</b>
              {pages > 1 && <>
                <button className="btn sm" disabled={numero <= 1 || !!occupe} onClick={() => allerPage(numero - 1)}>←</button>
                <span style={{ fontSize: 13 }}>page {numero} / {pages}</span>
                <button className="btn sm" disabled={numero >= pages || !!occupe} onClick={() => allerPage(numero + 1)}>→</button>
              </>}
            </div>
            <Apercu rendu={rendu} constats={constats ?? []} retenus={retenus} survole={survole} />
            {constats && constats.length > 0 && (
              <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
                Les cadres situent approximativement chaque constat. Fiez-vous au
                texte plutôt qu'au cadre : c'est le libellé qui dit de quoi il s'agit.
              </p>
            )}
          </div>

          <div>
            <div className="card" style={{ marginBottom: 14 }}>
              <Field label="Niveau de la fiche (facultatif)">
                <Input placeholder="CP, CE2, 6e…" value={niveau} onChange={(e) => setNiveau(e.target.value)} />
              </Field>
              <button className="btn primary" style={{ width: "100%", marginTop: 8 }}
                disabled={!!occupe} onClick={analyser}>
                {occupe || "🔎 Analyser la page"}
              </button>
              <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 10, marginBottom: 0 }}>
                L'image de la page part chez Mistral. Rien n'est modifié sur votre
                fichier : l'assistant signale, vous décidez.
              </p>
            </div>

            {constats && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                  <h3 style={{ margin: 0 }}>{r!.total} constat{r!.total > 1 ? "s" : ""}</h3>
                  {(["bloquant", "surcharge", "gene"] as const).map((g) =>
                    r![g] > 0 && <span key={g} style={{
                      fontSize: 12, padding: "1px 7px", borderRadius: 100,
                      background: GRAVITES[g].couleur, color: "#fff",
                    }}>{r![g]} {GRAVITES[g].label.toLowerCase()}</span>)}
                  <div style={{ flex: 1 }} />
                  <button className="btn sm" onClick={imprimerFiche}>🖨 Fiche d'adaptation</button>
                </div>
                {r!.incertains > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-2)", margin: "0 0 8px" }}>
                    {r!.incertains} élément{r!.incertains > 1 ? "s" : ""} pourrai{r!.incertains > 1 ? "ent" : "t"}
                    {" "}porter l'exercice plutôt que le décorer : à vous de trancher, ils ne sont pas cochés.
                  </p>
                )}
                {!constats.length ? (
                  <div style={{ fontSize: 13, color: "var(--text-2)" }}>Rien de superflu repéré sur cette page.</div>
                ) : constats.map((c, i) => (
                  <Ligne key={i} constat={c} coche={retenus.has(i)}
                    onToggle={() => basculer(i)}
                    onSurvol={(v) => setSurvole(v ? i : null)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

/** La page rendue, avec les zones signalées posées par-dessus. */
function Apercu({ rendu, constats, retenus, survole }: {
  rendu: PageRendue; constats: Constat[]; retenus: Set<number>; survole: number | null;
}) {
  return (
    <div style={{ position: "relative", lineHeight: 0, border: "1px solid var(--bord)", borderRadius: 6, overflow: "hidden" }}>
      <img src={`data:image/png;base64,${rendu.image}`} alt="" style={{ width: "100%", display: "block" }} />
      {constats.map((c, i) => c.zone && (
        <div key={i} style={{
          position: "absolute",
          left: `${c.zone[0] * 100}%`, top: `${c.zone[1] * 100}%`,
          width: `${c.zone[2] * 100}%`, height: `${c.zone[3] * 100}%`,
          border: `2px solid ${GRAVITES[c.gravite].couleur}`,
          background: retenus.has(i) ? `${GRAVITES[c.gravite].couleur}33` : "transparent",
          boxShadow: survole === i ? `0 0 0 3px ${GRAVITES[c.gravite].couleur}` : undefined,
          borderRadius: 3, pointerEvents: "none", transition: "box-shadow .15s",
        }} />
      ))}
    </div>
  );
}

function Ligne({ constat, coche, onToggle, onSurvol }: {
  constat: Constat; coche: boolean; onToggle: () => void; onSurvol: (v: boolean) => void;
}) {
  const g = GRAVITES[constat.gravite];
  return (
    <label onMouseEnter={() => onSurvol(true)} onMouseLeave={() => onSurvol(false)}
      style={{
        display: "flex", gap: 9, alignItems: "flex-start", padding: "8px 0",
        borderTop: "1px solid var(--bord)", fontSize: 13, cursor: "pointer",
      }}>
      <input type="checkbox" checked={coche} onChange={onToggle} style={{ marginTop: 3 }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <b>{constat.element}</b>
          <span style={{ fontSize: 11, padding: "0 6px", borderRadius: 100, background: g.couleur, color: "#fff" }}>
            {g.label}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-2)" }}>{constat.critere.label}</span>
          {constat.incertain && (
            <span style={{ fontSize: 11, color: "var(--text-2)", fontStyle: "italic" }}>
              — porte peut-être l'exercice
            </span>
          )}
        </span>
        {constat.pourquoi && <div style={{ color: "var(--text-2)", marginTop: 2 }}>{constat.pourquoi}</div>}
        {constat.suggestion && <div style={{ marginTop: 2 }}>→ {constat.suggestion}</div>}
      </span>
    </label>
  );
}
