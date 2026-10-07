import React from "react";
import { api } from "../api";
import { Field, Input, Modal, Select, useAsync } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { useMemoire } from "../components/useMemoire";
import { chargerPicto, usePictoImage } from "../components/ChoixPicto";
import { chercherPictos } from "../mesPictos";
import { motDuFichier } from "../imagesPerso";
import type { PictoArasaac } from "../api";
import {
  COULEURS, FAMILLES_MOTIFS, GRAPHIES, MOTIFS, OPERATIONS, PLAFONDS, POLICES_CURSIVES_CONNUES, REGLAGES_PAR_DEFAUT, SONS_COLORIAGE, TAILLES_MOTIF,
  basculerCase, casesAColorier, consigne, couleurDe, couleursDuMotif, dimensionsDe, ecrireMotifsPerso, fabriquerColoriage, feuilleDuColoriage, lettreSousGraphie,
  lireMotifsPerso, motifDepuisImage, styleDeLaCase, type CaseColoriage, type Coloriage, type Graphie, type Matiere, type Motif, type Operation,
} from "../coloriageMagique";

// ── Fabriquer › Mathématiques › Coloriage magique ─────────────────────────
//
// On calcule, on lit ou l'on reconnaît une lettre ; la réponse dit la couleur,
// l'image apparaît. L'intérêt n'est pas le dessin : c'est qu'une erreur se
// voie. Une case de la mauvaise couleur crève les yeux au milieu d'un poisson,
// là où une colonne de calculs faux passe inaperçue — l'élève se corrige seul.
//
// L'écran se lit en trois temps, chacun dans son pli : le dessin, ce qu'on
// travaille, les réglages de ce qu'on travaille. Le dessin se choisit dans
// une galerie de vignettes, ou se tire d'une image : une photo prise au
// téléphone, un fichier, un pictogramme, une image collée ou glissée.

const CLE_MOTIFS_PERSO = "coloriage:motifs";

/** Ce qu'une case porte, avec sa graphie et sa police quand il y en a. */
const styleDeCase = (x: CaseColoriage, policeCursive: string): React.CSSProperties => styleDeLaCase(x, policeCursive);

/** La grille, à l'écran comme au papier. Le corrigé remplit les couleurs. */
function Grille({ c, corrige, policeCursive }: { c: Coloriage; corrige: boolean; policeCursive: string }) {
  const n = Math.max(1, c.lignes.length, c.lignes[0]?.length ?? 0);
  const cote = Math.max(30, Math.min(58, Math.floor(560 / n)));
  return (
    <table className="cm-grille" style={{ ["--cm-cote" as string]: `${cote}px`, fontSize: cote >= 48 ? undefined : cote >= 40 ? 12 : 11, whiteSpace: "nowrap" }}>
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
/** Le style d'une grille en petit : ses colonnes, ses rangées, et ses proportions dans `cote` pixels. */
function styleMini(grille: string[], cote?: number): React.CSSProperties {
  const { colonnes, lignes } = dimensionsDe(grille);
  const style: React.CSSProperties = { gridTemplateColumns: `repeat(${colonnes}, 1fr)`, gridTemplateRows: `repeat(${lignes}, 1fr)` };
  if (cote) {
    style.width = colonnes >= lignes ? cote : Math.round((cote * colonnes) / lignes);
    style.height = colonnes >= lignes ? Math.round((cote * lignes) / colonnes) : cote;
  } else style.aspectRatio = `${colonnes} / ${lignes}`;
  return style;
}

function Vignette({ m, on, onClick, onSupprimer }: { m: Motif; on: boolean; onClick: () => void; onSupprimer?: () => void }) {
  return (
    <button type="button" className={`cm-vignette${on ? " on" : ""}`} onClick={onClick} title={`${m.nom} — ${casesAColorier(m)} cases`}>
      <span className="cm-mini" style={styleMini(m.grille, 56)}>
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

/** Un pictogramme à prendre pour dessin : sa vignette, son mot. */
function PictoSource({ p, onClick }: { p: PictoArasaac; onClick: () => void }) {
  const src = usePictoImage(p.id);
  return (
    <button type="button" className="tp-vignette" onClick={onClick} title={p.mot}>
      {src ? <img src={src} alt="" /> : <span className="tp-vide" />}
      <span className="tp-mot">{p.mot}</span>
    </button>
  );
}

/**
 * Un dessin à soi, tiré d'une image — une photo du téléphone, un fichier,
 * un pictogramme, une image collée ou glissée — et retouché case par case
 * avant d'être gardé.
 */
function DepuisImage({ onGarder, onClose }: { onGarder: (m: Motif) => void; onClose: () => void }) {
  const [image, setImage] = React.useState<{ src: string; largeur: number; hauteur: number; pixels: Uint8ClampedArray; picto: boolean } | null>(null);
  const [taille, setTaille] = React.useState(12);
  const [seuil, setSeuil] = React.useState(0.82);
  const [recadrer, setRecadrer] = React.useState(true);
  // Un picto au trait a le corps clair : on le remplit d'office ; une photo garde son blanc.
  const [remplissage, setRemplissage] = React.useState<string | null>(null);
  const [palette, setPalette] = React.useState<string[]>(COULEURS.map((c) => c.id));
  const [grille, setGrille] = React.useState<string[] | null>(null);
  const [retouches, setRetouches] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [survol, setSurvol] = React.useState(false);
  const [cherche, setCherche] = React.useState<string | null>(null);
  const [pictos, setPictos] = React.useState<PictoArasaac[]>([]);
  const entree = React.useRef<HTMLInputElement>(null);
  const couleurs = COULEURS.filter((c) => palette.includes(c.id));

  const charger = async (src: string, picto = false) => {
    try { const p = await pixelsDe(src); setImage({ src, ...p, picto }); setRemplissage(picto ? "5" : null); setRetouches(false); }
    catch (e: any) { toast(String(e?.message ?? e), { icone: "⚠️" }); }
  };
  const depuisFichier = (f: File) => {
    if (!f.type.startsWith("image/")) { toast(`« ${f.name} » n'est pas une image.`, { icone: "⚠️" }); return; }
    const lecteur = new FileReader();
    lecteur.onload = () => { void charger(String(lecteur.result)); };
    lecteur.readAsDataURL(f);
    setNom((n) => n || motDuFichier(f.name));
  };
  const depuisTelephone = React.useCallback(async (fichier: string) => {
    try {
      const b64 = await api.fichierRead(fichier);
      const mime = fichier.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      await charger(`data:${mime};base64,${b64}`);
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const prendrePicto = async (p: PictoArasaac) => {
    try { await charger(await chargerPicto(p.id), true); setNom((n) => n || p.mot); setCherche(null); }
    catch (e) { toast("Picto illisible : " + String(e), { icone: "⚠️" }); }
  };

  // Une image copiée ailleurs se colle ici, d'un ⌘V.
  const depuisFichierRef = React.useRef(depuisFichier);
  depuisFichierRef.current = depuisFichier;
  React.useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (!f) return;
      e.preventDefault();
      depuisFichierRef.current(f);
    };
    window.addEventListener("paste", coller);
    return () => window.removeEventListener("paste", coller);
  }, []);

  // Les pictos qui répondent à ce qu'on cherche.
  React.useEffect(() => {
    if (cherche === null || cherche.trim().length < 2) { setPictos([]); return; }
    const t = setTimeout(() => { chercherPictos(cherche.trim(), 24).then(setPictos).catch(() => setPictos([])); }, 200);
    return () => clearTimeout(t);
  }, [cherche]);

  // La grille suit l'image et les réglages, tant qu'on n'a pas retouché à la main.
  React.useEffect(() => {
    if (!image || retouches) return;
    setGrille(motifDepuisImage(image, { taille, seuilBlanc: seuil, palette: couleurs.length ? couleurs : COULEURS, recadrer, remplissage }));
  }, [image, taille, seuil, palette, recadrer, remplissage, retouches]); // eslint-disable-line react-hooks/exhaustive-deps

  const cases = grille ? grille.join("").split("").filter((c) => c !== ".").length : 0;
  const { colonnes, lignes } = dimensionsDe(grille ?? []);
  const garder = () => {
    if (!grille) return;
    onGarder({ id: `perso-${Date.now().toString(36)}`, nom: nom.trim() || "Mon dessin", grille, perso: true });
  };
  const recalculer = <T,>(f: (v: T) => void) => (v: T) => { f(v); setRetouches(false); };

  return (
    <Modal large titre="🖼 Un dessin depuis une image" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!grille || cases < 4} onClick={garder}>✓ Garder ce dessin</button>
      </>}>
      <div onDragOver={(e) => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setSurvol(true); } }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
        onDrop={(e) => {
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith("image/"));
          if (!f) return;
          e.preventDefault(); setSurvol(false); depuisFichier(f);
        }}
        style={survol ? { outline: "2px dashed var(--accent)", outlineOffset: 4, borderRadius: 8 } : undefined}>
        <p className="meta" style={{ marginTop: 0, fontSize: 13, lineHeight: 1.55 }}>
          Un dessin d'élève, un pictogramme, une image trouvée ailleurs : elle devient une grille de cases, chacune de la couleur de feutre
          qui la couvre le plus, le clair restant blanc. Retouchez ensuite les cases en cliquant dessus.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <PhotoTelephone label="📱 Photo depuis le téléphone" className="btn" onPhoto={depuisTelephone} />
          <input ref={entree} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) depuisFichier(f); e.target.value = ""; }} />
          <button type="button" className="btn" onClick={() => entree.current?.click()}>🖼 Une image de l'ordinateur</button>
          <button type="button" className="btn" aria-pressed={cherche !== null} onClick={() => setCherche(cherche === null ? "" : null)}>🧩 Un pictogramme</button>
        </div>
        <p className="meta" style={{ fontSize: 12, margin: "0 0 12px" }}>Ou collez une image (⌘V), ou glissez-la ici depuis le Finder ou le navigateur.</p>
        {cherche !== null && (
          <div style={{ marginBottom: 12 }}>
            <Input autoFocus value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder="Chercher un picto : chat, maison, vélo…" aria-label="Chercher un pictogramme" />
            <div className="tp-grille" style={{ marginTop: 8, maxHeight: 220, overflowY: "auto" }}>
              {pictos.map((p) => <PictoSource key={p.id} p={p} onClick={() => { void prendrePicto(p); }} />)}
              {cherche.trim().length >= 2 && !pictos.length && <span className="meta" style={{ fontSize: 12.5, gridColumn: "1 / -1" }}>Aucun picto pour « {cherche.trim()} ».</span>}
            </div>
          </div>
        )}
        {image ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) 1fr", gap: 14, alignItems: "start" }}>
            <div>
              <img src={image.src} alt="" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", background: "#fff" }} />
              <Field label="Cases sur le grand côté">
                <div className="seg">
                  {TAILLES_MOTIF.map((n) => <button key={n} className={taille === n ? "active" : ""} onClick={() => recalculer(setTaille)(n)}>{n}</button>)}
                </div>
              </Field>
              <label className="pb-coche">
                <input type="checkbox" checked={recadrer} onChange={(e) => recalculer(setRecadrer)(e.target.checked)} />
                <span>Retirer les marges autour du dessin</span>
              </label>
              <Field label={`Ce qui reste blanc : le clair (${Math.round(seuil * 100)} %)`}>
                <input type="range" min={0.5} max={0.98} step={0.02} value={seuil} onChange={(e) => recalculer(setSeuil)(Number(e.target.value))} style={{ width: "100%" }} aria-label="Seuil de blanc" />
              </Field>
              <Field label="Les feutres">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {COULEURS.map((c) => (
                    <button key={c.id} type="button" className={`cm-feutre${palette.includes(c.id) ? " on" : ""}`} style={{ background: c.hex }} title={c.nom}
                      onClick={() => recalculer(setPalette)(palette.includes(c.id) ? palette.filter((x) => x !== c.id) : [...palette, c.id])} />
                  ))}
                </div>
                <div className="meta" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
                  {image.picto ? "Un picto a des contours noirs : retirez le feutre noir, ils ne compteront plus — seules les couleurs feront la grille."
                    : "Sans le feutre noir, les traits noirs ne comptent pas : seules les couleurs font la grille."}
                </div>
              </Field>
              <Field label="L'intérieur clair du dessin (entouré d'un trait)">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" className={`btn sm${remplissage === null ? " primary" : ""}`} onClick={() => recalculer(setRemplissage)(null)}>Reste blanc</button>
                  {couleurs.filter((c) => c.id !== "6").map((c) => (
                    <button key={c.id} type="button" className={`cm-feutre${remplissage === c.id ? " on" : ""}`} style={{ background: c.hex, opacity: 1, width: 24, height: 24 }}
                      title={`Rempli en ${c.nom}`} aria-pressed={remplissage === c.id} onClick={() => recalculer(setRemplissage)(c.id)} />
                  ))}
                </div>
              </Field>
              <Field label="Nom du dessin"><Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Le chien de Léo" /></Field>
            </div>
            <div>
              {grille && (
                <>
                  <div className="meta" style={{ fontSize: 12.5, marginBottom: 6 }}>
                    {colonnes} × {lignes} · {cases} cases à colorier · cliquez une case pour changer sa couleur{retouches ? " (retouché)" : ""}
                    {retouches && <button type="button" className="btn ghost sm" style={{ marginLeft: 8 }} onClick={() => setRetouches(false)}>↺ Recalculer</button>}
                  </div>
                  {cases < 4 && (
                    <div className="meta" style={{ fontSize: 12.5, marginBottom: 6, color: "var(--orange)" }}>
                      Presque rien à colorier : donnez une couleur à l'intérieur clair du dessin, ou baissez « ce qui reste blanc ».
                    </div>
                  )}
                  <div className="cm-mini cm-mini-grande" style={styleMini(grille)}>
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
          <div className="meta" style={{ fontSize: 13 }}>Choisissez une image, un pictogramme, ou collez-en une : la grille apparaîtra ici.</div>
        )}
      </div>
    </Modal>
  );
}

/** Les plis de l'écran, ouverts ou fermés : on les retrouve comme on les a laissés, sur cet ordinateur. */
interface Plis { dessin: boolean; travail: boolean; reglages: boolean }
const PLIS_OUVERTS: Plis = { dessin: true, travail: true, reglages: true };
const lirePlis = (brut: unknown): Plis => ({ ...PLIS_OUVERTS, ...(brut && typeof brut === "object" ? brut as Partial<Plis> : {}) });

const MATIERES_COLORIAGE: Record<Matiere, { icone: string; nom: string }> = {
  calcul: { icone: "🔢", nom: "Calculs" }, lettres: { icone: "🔤", nom: "Sons dans les mots" }, graphies: { icone: "🅰️", nom: "Lettres et graphies" },
};

export function ColoriageMagiqueTab() {
  const [r, maj] = useReglages("coloriage", REGLAGES_PAR_DEFAUT);
  const [plis, setPlis] = useMemoire<Plis>("coloriagePlis", lirePlis);
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
  const feuille = (avecCorrige: boolean) => feuilleDuColoriage(c, r, avecCorrige);
  const imprimer = (avecCorrige: boolean) => { const f = feuille(avecCorrige); void imprimerAtelier("coloriage", f.titre, f.corps, f.style); };
  const bureau = () => { const f = feuille(false); return enregistrerSurLeBureau("coloriage", f.titre, f.corps, f.style); };

  /** Un pli : son numéro, son titre, et ce qu'on y a choisi, lisible fermé. */
  const pli = (cle: keyof Plis, n: number, titre: string, resume: string, contenu: React.ReactNode) => (
    <details className="pli cm-pli" open={plis[cle]} onToggle={(e) => {
      const ouvert = (e.currentTarget as HTMLDetailsElement).open;
      if (ouvert !== plis[cle]) setPlis({ ...plis, [cle]: ouvert });
    }}>
      <summary><span className="cm-etape"><span>{n}</span>{titre}</span><span className="meta">{resume}</span></summary>
      {contenu}
    </details>
  );
  const nomDuSon = (id: string) => SONS_COLORIAGE.find((s) => s.id === id)?.son ?? "";
  const resumeReglages = matiere === "calcul"
    ? `${OPERATIONS.find((o) => o.id === r.operation)?.libelle ?? ""} · ${multiplication ? `table de ${r.table}` : `jusqu'à ${r.plafond}`}`
    : matiere === "lettres"
      ? r.sons.slice(0, combien).map(nomDuSon).filter(Boolean).join(", ")
      : `${r.lettres.slice(0, combien).filter(Boolean).join(", ")} · ${r.graphies.length || 1} forme${r.graphies.length > 1 ? "s" : ""}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p className="meta" style={{ fontSize: 13, lineHeight: 1.6, marginTop: 0 }}>
          L'élève calcule, lit ou reconnaît une lettre ; la réponse lui dit la couleur, et le dessin apparaît.
          Une case fausse se voit tout de suite : c'est la feuille qui corrige, pas vous.
        </p>

        {pli("dessin", 1, "Le dessin", `${c.motif.nom} · ${casesAColorier(c.motif)} cases`, (<>
          {/* Rangés par famille : avec trente dessins, on cherche d'abord un animal, une fête, un objet. */}
          {FAMILLES_MOTIFS.map((f) => (
            <React.Fragment key={f.id}>
              <div className="cm-famille">{f.nom}</div>
              <div className="cm-galerie">
                {MOTIFS.filter((m) => (m.famille ?? "objets") === f.id).map((m) => (
                  <Vignette key={m.id} m={m} on={r.motif === m.id} onClick={() => maj({ motif: m.id })} />
                ))}
              </div>
            </React.Fragment>
          ))}
          <div className="cm-famille">Mes dessins</div>
          <div className="cm-galerie">
            {motifsPerso.map((m) => (
              <Vignette key={m.id} m={m} on={r.motif === m.id} onClick={() => maj({ motif: m.id })} onSupprimer={() => supprimerPerso(m)} />
            ))}
            <button type="button" className="cm-vignette cm-vignette-plus" onClick={() => setPhoto(true)} title="Une photo, une image, un pictogramme : en grille de cases">
              <span style={{ fontSize: 26 }}>🖼</span>
              <span className="cm-vignette-nom">Depuis une image</span>
              <span className="cm-vignette-n">photo, fichier, picto</span>
            </button>
          </div>
        </>))}

        {pli("travail", 2, "Ce qu'on travaille", MATIERES_COLORIAGE[matiere].nom, (
          <div className="seg" style={{ flexWrap: "wrap", marginBottom: 10 }}>
            {(Object.keys(MATIERES_COLORIAGE) as Matiere[]).map((m) => (
              <button key={m} className={matiere === m ? "active" : ""} onClick={() => maj({ matiere: m })}>
                {MATIERES_COLORIAGE[m].icone} {MATIERES_COLORIAGE[m].nom}
              </button>
            ))}
          </div>
        ))}

        {pli("reglages", 3, matiere === "calcul" ? "Les calculs" : matiere === "lettres" ? "Les sons" : "Les lettres", resumeReglages, (<>
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
        </>))}

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

      {photo && <DepuisImage onGarder={garderPerso} onClose={() => setPhoto(false)} />}
    </div>
  );
}
