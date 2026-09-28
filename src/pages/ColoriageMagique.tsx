import React from "react";
import { api } from "../api";
import { Field, Input, Modal, Select, useAsync } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { escapeHtml } from "../print";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import {
  COULEURS, GRAPHIES, MOTIFS, OPERATIONS, PLAFONDS, POLICES_CURSIVES_CONNUES, REGLAGES_PAR_DEFAUT, SONS_COLORIAGE, TAILLES_MOTIF,
  basculerCase, casesAColorier, consigne, couleurDe, couleursDuMotif, ecrireMotifsPerso, fabriquerColoriage, lettreSousGraphie,
  lireMotifsPerso, motifDepuisImage, type CaseColoriage, type Coloriage, type Graphie, type Matiere, type Motif, type Operation,
} from "../coloriageMagique";

// ── Fabriquer › Mathématiques › Coloriage magique ─────────────────────────
//
// On calcule, on lit ou l'on reconnaît une lettre ; la réponse dit la couleur,
// l'image apparaît. L'intérêt n'est pas le dessin : c'est qu'une erreur se
// voie. Une case de la mauvaise couleur crève les yeux au milieu d'un poisson,
// là où une colonne de calculs faux passe inaperçue — l'élève se corrige seul.
//
// L'écran se lit en trois temps : le dessin, ce qu'on travaille, les
// réglages de ce qu'on travaille. Le dessin se choisit dans une galerie de
// vignettes, ou se tire d'une photo prise au téléphone.

const CLE_MOTIFS_PERSO = "coloriage:motifs";

/** Ce qu'une case porte, avec sa graphie et sa police quand il y en a. */
function styleDeCase(x: CaseColoriage, policeCursive: string): React.CSSProperties {
  if (!x.graphie) return {};
  const cursive = x.graphie === "cursive" || x.graphie === "cursiveMajuscule";
  return {
    fontFamily: cursive ? `"${policeCursive}", "Snell Roundhand", cursive` : x.police ? `"${x.police}", Arial, sans-serif` : undefined,
    fontSize: cursive ? 26 : 22,
    fontWeight: x.graphie === "majuscule" ? 700 : 500,
  };
}

/** La grille, à l'écran comme au papier. Le corrigé remplit les couleurs. */
function Grille({ c, corrige, policeCursive }: { c: Coloriage; corrige: boolean; policeCursive: string }) {
  const n = c.lignes.length;
  const cote = Math.max(34, Math.min(58, Math.floor(560 / Math.max(1, n))));
  return (
    <table className="cm-grille" style={{ ["--cm-cote" as string]: `${cote}px` }}>
      <tbody>
        {c.lignes.map((ligne, y) => (
          <tr key={y}>
            {ligne.map((caseC, x) => {
              const couleur = corrige && caseC.couleur ? couleurDe(caseC.couleur)?.hex : undefined;
              return (
                <td key={x} style={{ ...styleDeCase(caseC, policeCursive), ...(couleur ? { background: couleur, color: "#fff" } : {}) }}>
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

/** Ce que dit la légende : un résultat, un graphème, ou une lettre sous toutes ses formes. */
function Legende({ c, graphies, policeCursive }: { c: Coloriage; graphies: Graphie[]; policeCursive: string }) {
  return (
    <div className="cm-legende">
      {c.legende.map(({ couleur, resultat, grapheme, lettre }) => (
        <div key={couleur.id} className="cm-legende-ligne">
          <span className="cm-pastille" style={{ background: couleur.hex }} />
          {lettre !== undefined ? (
            <b className="cm-formes">
              {(graphies.length ? graphies : ["script" as Graphie]).map((g) => (
                <span key={g} style={styleDeCase({ calcul: "", couleur: "", graphie: g }, policeCursive)}>{lettreSousGraphie(lettre, g)}</span>
              ))}
            </b>
          ) : <b>{grapheme !== undefined ? grapheme : resultat}</b>}
          <span>{couleur.nom}</span>
        </div>
      ))}
    </div>
  );
}

/** Un dessin en petit : de quoi le reconnaître avant de le choisir. */
function Vignette({ m, on, onClick, onSupprimer }: { m: Motif; on: boolean; onClick: () => void; onSupprimer?: () => void }) {
  const n = m.grille.length;
  return (
    <button type="button" className={`cm-vignette${on ? " on" : ""}`} onClick={onClick} title={`${m.nom} — ${casesAColorier(m)} cases`}>
      <span className="cm-mini" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {m.grille.flatMap((ligne, y) => [...ligne].map((c, x) => (
          <i key={`${x}-${y}`} style={{ background: c === "." ? "transparent" : couleurDe(c)?.hex }} />
        )))}
      </span>
      <span className="cm-vignette-nom">{m.perso ? "✏️ " : ""}{m.nom}</span>
      <span className="cm-vignette-n">{casesAColorier(m)} cases</span>
      {onSupprimer && <span className="cm-vignette-x" role="button" aria-label={`Supprimer ${m.nom}`} onClick={(e) => { e.stopPropagation(); onSupprimer(); }}>✕</span>}
    </button>
  );
}

/** Les pixels d'une image, lus dans une toile — la seule façon en navigateur. */
async function pixelsDe(src: string, maxCote = 480): Promise<{ largeur: number; hauteur: number; pixels: Uint8ClampedArray }> {
  const img = new Image();
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error("Image illisible")); img.src = src; });
  const echelle = Math.min(1, maxCote / Math.max(img.width, img.height));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(img.width * echelle));
  toile.height = Math.max(1, Math.round(img.height * echelle));
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(img, 0, 0, toile.width, toile.height);
  const d = ctx.getImageData(0, 0, toile.width, toile.height);
  return { largeur: d.width, hauteur: d.height, pixels: d.data };
}

/**
 * Un dessin à soi, tiré d'une photo — du téléphone ou d'un fichier — et
 * retouché case par case avant d'être gardé.
 */
function DepuisPhoto({ banque, onGarder, onClose }: { banque: boolean; onGarder: (m: Motif) => void; onClose: () => void }) {
  const [image, setImage] = React.useState<{ src: string; largeur: number; hauteur: number; pixels: Uint8ClampedArray } | null>(null);
  const [taille, setTaille] = React.useState(10);
  const [seuil, setSeuil] = React.useState(0.82);
  const [palette, setPalette] = React.useState<string[]>(COULEURS.map((c) => c.id));
  const [grille, setGrille] = React.useState<string[] | null>(null);
  const [retouches, setRetouches] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const entree = React.useRef<HTMLInputElement>(null);
  const couleurs = COULEURS.filter((c) => palette.includes(c.id));

  const charger = async (src: string) => {
    try { const p = await pixelsDe(src); setImage({ src, ...p }); setRetouches(false); }
    catch (e: any) { toast(String(e?.message ?? e), { icone: "⚠️" }); }
  };
  const depuisFichier = (f: File) => {
    const lecteur = new FileReader();
    lecteur.onload = () => { void charger(String(lecteur.result)); };
    lecteur.readAsDataURL(f);
  };
  const depuisTelephone = React.useCallback(async (fichier: string) => {
    try {
      const b64 = await api.fichierRead(fichier);
      const mime = fichier.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      await charger(`data:${mime};base64,${b64}`);
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  }, []);

  // La grille suit l'image et les réglages, tant qu'on n'a pas retouché à la main.
  React.useEffect(() => {
    if (!image || retouches) return;
    setGrille(motifDepuisImage(image, taille, seuil, couleurs.length ? couleurs : COULEURS));
  }, [image, taille, seuil, palette, retouches]); // eslint-disable-line react-hooks/exhaustive-deps

  const cases = grille ? grille.join("").split("").filter((c) => c !== ".").length : 0;
  const garder = () => {
    if (!grille) return;
    onGarder({ id: `perso-${Date.now().toString(36)}`, nom: nom.trim() || "Mon dessin", grille, perso: true });
  };

  return (
    <Modal large titre="🖼 Un dessin depuis une photo" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!grille || cases < 4} onClick={garder}>✓ Garder ce dessin</button>
      </>}>
      <p className="meta" style={{ marginTop: 0, fontSize: 13, lineHeight: 1.55 }}>
        Un dessin d'élève, un pictogramme, un objet sur fond clair : la photo devient une grille de cases, chacune de la couleur de feutre la plus
        proche, le clair restant blanc. Retouchez ensuite les cases en cliquant dessus.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <PhotoTelephone label="📱 Photo depuis le téléphone" className="btn primary" onPhoto={depuisTelephone} />
        <input ref={entree} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) depuisFichier(f); e.target.value = ""; }} />
        <button type="button" className="btn" onClick={() => entree.current?.click()}>🖼 Une image de l'ordinateur</button>
        {!banque && null}
      </div>
      {image ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 14, alignItems: "start" }}>
          <div>
            <img src={image.src} alt="" style={{ width: "100%", borderRadius: 8, border: "1px solid var(--border)" }} />
            <Field label="Cases de côté">
              <div className="seg">
                {TAILLES_MOTIF.map((t) => <button key={t} className={taille === t ? "active" : ""} onClick={() => { setTaille(t); setRetouches(false); }}>{t} × {t}</button>)}
              </div>
            </Field>
            <Field label={`Ce qui reste blanc : le clair (${Math.round(seuil * 100)} %)`}>
              <input type="range" min={0.5} max={0.98} step={0.02} value={seuil} onChange={(e) => { setSeuil(Number(e.target.value)); setRetouches(false); }} style={{ width: "100%" }} aria-label="Seuil de blanc" />
            </Field>
            <Field label="Les feutres">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {COULEURS.map((c) => (
                  <button key={c.id} type="button" className={`cm-feutre${palette.includes(c.id) ? " on" : ""}`} style={{ background: c.hex }} title={c.nom}
                    onClick={() => { setPalette(palette.includes(c.id) ? palette.filter((x) => x !== c.id) : [...palette, c.id]); setRetouches(false); }} />
                ))}
              </div>
            </Field>
            <Field label="Nom du dessin"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Le chien de Léo" /></Field>
          </div>
          <div>
            {grille && (
              <>
                <div className="meta" style={{ fontSize: 12.5, marginBottom: 6 }}>
                  {cases} cases à colorier · cliquez une case pour changer sa couleur{retouches ? " (retouché)" : ""}
                  {retouches && <button type="button" className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => setRetouches(false)}>↺ Recalculer</button>}
                </div>
                <div className="cm-mini cm-mini-grande" style={{ gridTemplateColumns: `repeat(${taille}, 1fr)` }}>
                  {grille.flatMap((ligne, y) => [...ligne].map((c, x) => (
                    <i key={`${x}-${y}`} role="button" aria-label={`case ${x + 1},${y + 1}`} style={{ background: c === "." ? "#fff" : couleurDe(c)?.hex }}
                      onClick={() => { setGrille(basculerCase(grille, x, y, couleurs.length ? couleurs : COULEURS)); setRetouches(true); }} />
                  )))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="meta" style={{ fontSize: 13 }}>Prenez la photo, ou choisissez une image : la grille apparaîtra ici.</div>
      )}
    </Modal>
  );
}

export function ColoriageMagiqueTab() {
  const [r, maj] = useReglages("coloriage", REGLAGES_PAR_DEFAUT);
  const [graine, setGraine] = React.useState(() => Math.floor(Math.random() * 1e9));
  const [corrige, setCorrige] = React.useState(false);
  const [photo, setPhoto] = React.useState(false);
  const { data: brutPerso, reload: relirePerso } = useAsync(() => api.settingGet(CLE_MOTIFS_PERSO), []);
  const motifsPerso = React.useMemo(() => lireMotifsPerso(brutPerso), [brutPerso]);
  const c = React.useMemo(() => fabriquerColoriage(r, graine, motifsPerso), [r, graine, motifsPerso]);
  const multiplication = r.operation === "multiplication";
  const matiere: Matiere = r.matiere;
  const combien = c.legende.length;
  // Les polices cursives installées, parmi celles qu'on connaît.
  const cursivesInstallees = React.useMemo(() => {
    try { return POLICES_CURSIVES_CONNUES.filter((p) => document.fonts.check(`16px "${p}"`)); } catch { return []; }
  }, []);

  const garderPerso = async (m: Motif) => {
    const suite = [...motifsPerso, m];
    await api.settingSet(CLE_MOTIFS_PERSO, ecrireMotifsPerso(suite));
    relirePerso(); maj({ motif: m.id }); setPhoto(false);
    toast(`« ${m.nom} » gardé : ${casesAColorier(m)} cases.`, { icone: "🎨" });
  };
  const supprimerPerso = async (m: Motif) => {
    if (!(await confirmer(`Supprimer le dessin « ${m.nom} » ?`, { oui: "Supprimer", danger: true }))) return;
    await api.settingSet(CLE_MOTIFS_PERSO, ecrireMotifsPerso(motifsPerso.filter((x) => x.id !== m.id)));
    if (r.motif === m.id) maj({ motif: MOTIFS[0].id });
    relirePerso();
  };

  // La feuille — corps et style — d'où sortent l'impression et le PDF du bureau.
  const feuille = (avecCorrige: boolean) => {
    const n = c.lignes.length;
    const cote = Math.max(40, Math.min(62, Math.floor(680 / n)));
    const cases = c.lignes.map((ligne) => `<tr>${ligne.map((x) => {
      const fond = avecCorrige && x.couleur ? couleurDe(x.couleur)?.hex : "";
      const st = styleDeCase(x, r.policeCursive);
      const style = [
        fond ? `background:${fond};color:#fff` : "",
        st.fontFamily ? `font-family:${st.fontFamily}` : "", st.fontSize ? `font-size:${st.fontSize}px` : "", st.fontWeight ? `font-weight:${st.fontWeight}` : "",
      ].filter(Boolean).join(";");
      return `<td${style ? ` style="${style}"` : ""}>${escapeHtml(x.calcul)}</td>`;
    }).join("")}</tr>`).join("");
    const formes = r.graphies.length ? r.graphies : ["script" as Graphie];
    const legende = c.legende.map(({ couleur, resultat, grapheme, lettre }) => {
      const texte = lettre !== undefined
        ? formes.map((g) => { const st = styleDeCase({ calcul: "", couleur: "", graphie: g }, r.policeCursive); return `<span style="font-family:${st.fontFamily ?? "Arial"};font-size:${st.fontSize}px;font-weight:${st.fontWeight};margin-right:8px">${escapeHtml(lettreSousGraphie(lettre, g))}</span>`; }).join("")
        : `<b>${escapeHtml(grapheme !== undefined ? grapheme : String(resultat))}</b>`;
      return `<span class="lg"><i style="background:${couleur.hex}"></i> ${texte} ${escapeHtml(couleur.nom)}</span>`;
    }).join("");
    return { titre: r.titre || "Coloriage magique", corps:
      `<h1>${escapeHtml(r.titre || "Coloriage magique")}</h1>
       <p class="nom">Prénom : ........................................ Date : ........................</p>
       <p class="consigne">${escapeHtml(consigne(r))}</p>
       <div class="legende">${legende}</div>
       <table class="grille"><tbody>${cases}</tbody></table>`, style:
      `.consigne { font-size: 14px; margin-bottom: 10px; }
       .legende { display: flex; gap: 18px; flex-wrap: wrap; margin-bottom: 14px; font-size: 14px; align-items: center; }
       .lg i { display: inline-block; width: 14px; height: 14px; border: 1px solid #333; vertical-align: -2px; }
       .grille { border-collapse: collapse; margin: 0 auto; }
       .grille td { border: 1.2px solid #222; width: ${cote}px; height: ${cote}px; text-align: center;
         font-size: ${n > 8 ? 14 : 15}px; vertical-align: middle; }
       .nom { margin: 0 0 10px; font-size: 13px; color: #555; }` };
  };
  const imprimer = (avecCorrige: boolean) => { const f = feuille(avecCorrige); void imprimerAtelier("coloriage", f.titre, f.corps, f.style); };
  const bureau = () => { const f = feuille(false); return enregistrerSurLeBureau("coloriage", f.titre, f.corps, f.style); };

  const tous = [...MOTIFS, ...motifsPerso];
  const titreEtape = (n: number, texte: string) => <div className="cm-etape"><span>{n}</span>{texte}</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p className="meta" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          L'élève calcule, lit ou reconnaît une lettre ; la réponse lui dit la couleur, et le dessin apparaît.
          Une case fausse se voit tout de suite : c'est la feuille qui corrige, pas vous.
        </p>

        {titreEtape(1, "Le dessin")}
        <div className="cm-galerie">
          {tous.map((m) => (
            <Vignette key={m.id} m={m} on={r.motif === m.id} onClick={() => maj({ motif: m.id })} onSupprimer={m.perso ? () => supprimerPerso(m) : undefined} />
          ))}
          <button type="button" className="cm-vignette cm-vignette-plus" onClick={() => setPhoto(true)} title="Un dessin d'élève ou une image, en grille de cases">
            <span style={{ fontSize: 26 }}>📷</span>
            <span className="cm-vignette-nom">Depuis une photo</span>
            <span className="cm-vignette-n">téléphone ou fichier</span>
          </button>
        </div>

        {titreEtape(2, "Ce qu'on travaille")}
        <div className="seg" style={{ flexWrap: "wrap", marginBottom: 10 }}>
          <button className={matiere === "calcul" ? "active" : ""} onClick={() => maj({ matiere: "calcul" })}>🔢 Calculs</button>
          <button className={matiere === "lettres" ? "active" : ""} onClick={() => maj({ matiere: "lettres" })}>🔤 Sons dans les mots</button>
          <button className={matiere === "graphies" ? "active" : ""} onClick={() => maj({ matiere: "graphies" })}>🅰️ Lettres et graphies</button>
        </div>

        {titreEtape(3, matiere === "calcul" ? "Les calculs" : matiere === "lettres" ? "Les sons" : "Les lettres")}
        {matiere === "lettres" && (
          <Field label={`Un son par couleur — ${combien} couleur${combien > 1 ? "s" : ""} dans ce dessin`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Array.from({ length: combien }, (_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="cm-pastille" style={{ background: c.legende[i]?.couleur.hex }} />
                  <Select value={r.sons[i] ?? ""} style={{ flex: 1 }}
                    onChange={(e) => { const suite = [...r.sons]; suite[i] = e.target.value; maj({ sons: suite }); }}>
                    {SONS_COLORIAGE.map((s) => <option key={s.id} value={s.id}>{s.son} — {s.graphemes.join(", ")}</option>)}
                  </Select>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
              Un mot qui porterait deux de ces sons est écarté : il serait de deux couleurs à la fois.
            </div>
          </Field>
        )}
        {matiere === "graphies" && (
          <>
            <Field label={`Une lettre par couleur — ${combien} couleur${combien > 1 ? "s" : ""} dans ce dessin`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Array.from({ length: combien }, (_, i) => (
                  <label key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="cm-pastille" style={{ background: c.legende[i]?.couleur.hex }} />
                    <Input value={r.lettres[i] ?? ""} maxLength={1} style={{ width: 46, textAlign: "center", fontSize: 18 }} aria-label={`Lettre de la couleur ${i + 1}`}
                      onChange={(e) => { const suite = [...r.lettres]; suite[i] = e.target.value.replace(/[^a-zA-Zéèàùçâêîôû]/g, "").slice(-1); maj({ lettres: suite }); }} />
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
                Des lettres qui se ressemblent (b et d, p et q, m et n) font un bon exercice de discrimination.
              </div>
            </Field>
            <Field label="Sous quelles formes">
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {GRAPHIES.map((g) => (
                  <label key={g.id} className="pb-coche">
                    <input type="checkbox" checked={r.graphies.includes(g.id)}
                      onChange={(e) => maj({ graphies: e.target.checked ? [...r.graphies, g.id] : r.graphies.filter((x) => x !== g.id) })} />
                    <span>{g.libelle}</span>
                  </label>
                ))}
                <label className="pb-coche">
                  <input type="checkbox" checked={r.polices} onChange={(e) => maj({ polices: e.target.checked })} />
                  <span>Mêler les polices d'imprimerie (la lettre change de dessin, pas de nom)</span>
                </label>
              </div>
            </Field>
            {(r.graphies.includes("cursive") || r.graphies.includes("cursiveMajuscule")) && (
              <Field label="La police cursive">
                <Select value={cursivesInstallees.includes(r.policeCursive) || r.policeCursive === "" ? r.policeCursive : "__autre"} onChange={(e) => { if (e.target.value !== "__autre") maj({ policeCursive: e.target.value }); }}>
                  {cursivesInstallees.map((p) => <option key={p} value={p}>{p}{p === "Snell Roundhand" ? " (cursive du Mac)" : " (police d'école installée)"}</option>)}
                  <option value="__autre">Autre police installée…</option>
                </Select>
                {!cursivesInstallees.includes(r.policeCursive) && (
                  <Input value={r.policeCursive} onChange={(e) => maj({ policeCursive: e.target.value })} placeholder="Nom exact de la police installée" style={{ marginTop: 6 }} />
                )}
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6, lineHeight: 1.5 }}>
                  {cursivesInstallees.some((p) => p !== "Snell Roundhand")
                    ? "Une police d'école est installée : ses lettres ont les formes du cahier."
                    : "Aucune police d'école n'est installée : la cursive du Mac sert en attendant. Installez « Écriture A » (gratuite, ministère) ou « Belle Allure » pour les formes du cahier, puis choisissez-la ici."}
                </div>
              </Field>
            )}
          </>
        )}
        {matiere === "calcul" && (
          <>
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
          </>
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
          <button className="btn sm" onClick={() => setGraine(Math.floor(Math.random() * 1e9))}>🔀 Nouvelle feuille</button>
          <button className="btn primary sm" onClick={() => imprimer(false)}>🖨 Imprimer</button>
          <BoutonBureau onEnregistrer={bureau} />
          <button className="btn ghost sm" onClick={() => imprimer(true)} title="La même feuille, coloriée : pour corriger d'un coup d'œil">🖨 Le corrigé</button>
        </div>
        <p className="meta" style={{ fontSize: 12.5, marginTop: 0 }}>{consigne(r)}</p>
        <Legende c={c} graphies={r.graphies} policeCursive={r.policeCursive} />
        <div style={{ overflowX: "auto" }}>
          <Grille c={c} corrige={corrige} policeCursive={r.policeCursive} />
        </div>
        <div className="meta" style={{ fontSize: 12, marginTop: 8 }}>{c.motif.nom} · {casesAColorier(c.motif)} cases · {couleursDuMotif(c.motif).length} couleurs</div>
      </div>

      {photo && <DepuisPhoto banque onGarder={garderPerso} onClose={() => setPhoto(false)} />}
    </div>
  );
}
