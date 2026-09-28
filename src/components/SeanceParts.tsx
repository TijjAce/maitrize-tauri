import React from "react";
import { ENTETE_TABLEAU, demarcheDe, demarchesParFamille, tableauDesPhases } from "../demarches";
import { partDeColonne } from "../print";
import { api, MaterielItem, newId, nowIso, raccourci } from "../api";
import { FichierImg } from "./Deroulement";
import { useFileDropZone, estPdf, estImage, estDocument, typeDocument, EXTENSIONS_DOCUMENTS, fichierEnBase64 } from "../dragdrop";
import { toast } from "./Toaster";
import { Input, Modal, useAsync } from "./ui";
import { VignettePdf } from "./VignettePdf";
import { filDAriane } from "../dossiers";
import { chercherPdfs, copiePourLaSeance, lirePdfs, pdfsDuBureau } from "../materielSeance";
import { ECHELLE_MAX, ECHELLE_MIN, ECHELLE_PAS, cleEchelle, lireEchelle } from "../materielAImprimer";

// ============================================================
// Tableau de déroulement — grille [[string]] éditable
// (en-tête : Phase / Durée / Description / Posture de l'enseignant)
// ============================================================
// Marqueurs image dans une case : [img:<nomFichier>] ou data:image collé.
// Le sous-type est optionnel (l'app rend ses images en "data:image;base64,…").
const RE_CELL_IMG = /\[img:([^\]]+)\]|data:image[^;,\s]*;base64,[A-Za-z0-9+/=]+/g;
// Convertit un data-URL image en File (pour l'enregistrer comme fichier).
function dataUrlToFile(url: string): File {
  const virgule = url.indexOf(",");
  const tete = url.slice(0, virgule), b64 = url.slice(virgule + 1);
  const mime = tete.match(/data:([^;]*)/)?.[1] || "";
  const ext = mime.includes("/") ? mime.split("/")[1] : "png";
  const bin = atob(b64); const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], `image.${ext}`, { type: mime.includes("/") ? mime : "image/png" });
}
/** Extrait les images (fichier ou data-URL) référencées dans une case. */
function imagesDeCellule(texte: string): { kind: "fichier" | "data"; val: string }[] {
  const out: { kind: "fichier" | "data"; val: string }[] = [];
  let m: RegExpExecArray | null; RE_CELL_IMG.lastIndex = 0;
  while ((m = RE_CELL_IMG.exec(texte)) !== null) {
    if (m[1]) out.push({ kind: "fichier", val: m[1] });
    else out.push({ kind: "data", val: m[0] });
  }
  return out;
}
/** Texte d'une case sans les marqueurs/data-URL d'image (pour l'aperçu lisible). */
function texteSansImages(texte: string): string {
  return texte.replace(RE_CELL_IMG, "").replace(/\n{2,}/g, "\n").trim();
}

/** Textarea qui s'agrandit pour montrer tout son contenu (pas de troncature). */
function AutoCell({ value, onChange, header, onPasteImage }: {
  value: string; onChange: (v: string) => void; header?: boolean; onPasteImage?: (file: File) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const resize = React.useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto"; el.style.height = el.scrollHeight + "px";
  }, []);
  React.useEffect(resize, [value, resize]);
  // Une image collée (Cmd+V) est enregistrée comme fichier puis insérée en
  // marqueur — jamais collée en base64 brut dans la case.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteImage) return;
    const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (file) { e.preventDefault(); onPasteImage(file); return; }
    // Image copiée en texte (data-URL) : on la convertit aussi en fichier.
    const texte = e.clipboardData.getData("text").trim();
    if (/^data:image[^;,\s]*;base64,/.test(texte)) { e.preventDefault(); onPasteImage(dataUrlToFile(texte)); }
  };
  // Si une image est déjà présente, on n'affiche que le texte lisible dans le
  // champ (l'image est rendue en vignette en dessous), pas le data-URL géant.
  const imgs = header ? [] : imagesDeCellule(value);
  const affichage = imgs.length ? texteSansImages(value) : value;
  const onEdit = (v: string) => {
    // On réinjecte les images existantes après le texte édité.
    const suffixe = imgs.map((i) => i.kind === "fichier" ? `[img:${i.val}]` : i.val).join("\n");
    onChange(suffixe ? (v.trimEnd() + "\n" + suffixe).trim() : v);
  };
  return (
    <textarea ref={ref} rows={1} value={affichage} onPaste={handlePaste}
      onChange={(e) => { onEdit(e.target.value); resize(); }}
      placeholder={header ? "En-tête" : ""}
      style={{
        width: "100%", border: "none", borderRadius: 0, padding: "6px 8px",
        background: "transparent", color: "var(--text)", font: "inherit",
        fontSize: 13, fontWeight: header ? 700 : 400, resize: "none", overflow: "hidden",
        lineHeight: 1.4, minHeight: imgs.length ? 0 : 32, outline: "none", display: "block",
      }} />
  );
}

/** Vignettes des images d'une case (édition) : fichiers + data-URL collés. */
function VignettesCellule({ texte, onRemove }: { texte: string; onRemove: (i: number) => void }) {
  const imgs = imagesDeCellule(texte);
  if (imgs.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 6px 6px" }}>
      {imgs.map((img, i) => (
        <div key={i} style={{ position: "relative" }}>
          {img.kind === "fichier"
            ? <FichierImg nom={img.val} style={{ display: "block", width: "100%", maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 6 }} />
            : <img alt="Illustration" src={img.val} style={{ display: "block", width: "100%", maxWidth: 200, maxHeight: 120, objectFit: "contain", borderRadius: 6 }} />}
          <button className="btn ghost sm" title="Retirer l'image"
            style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.55)", color: "#fff", padding: "0 5px", fontSize: 11, borderRadius: 6 }}
            onClick={() => onRemove(i)} aria-label="Retirer">✕</button>
        </div>
      ))}
    </div>
  );
}

export function TableauEditor({ grid, onChange, illustrations = [] }: {
  grid: string[][]; onChange: (g: string[][]) => void; illustrations?: string[];
}) {
  const [picker, setPicker] = React.useState<{ r: number; c: number } | null>(null);
  if (grid.length === 0) {
    // Un tableau vide, ou déjà structuré par une démarche : les phases de la
    // première séance d'un guide (quatre temps, leçon de code, investigation…).
    // La séance n'a pas besoin d'être née d'un cadre pour en recevoir un.
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn sm" onClick={() => onChange([
          [...ENTETE_TABLEAU],
          ["", "", "", ""], ["", "", "", ""],
        ])}>＋ Insérer un tableau</button>
        <select className="select" value="" style={{ fontSize: 12.5, maxWidth: 360 }}
          aria-label="Structurer le tableau d'après une démarche"
          onChange={(e) => { const d = demarcheDe(e.target.value); if (d) onChange(tableauDesPhases(d.seances[0].phases)); }}>
          <option value="">🧭 Structurer d'après une démarche…</option>
          {demarchesParFamille().map((g) => (
            <optgroup key={g.famille} label={g.famille}>
              {g.demarches.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    );
  }
  const setCell = (r: number, c: number, v: string) => {
    const g = grid.map((row) => [...row]); g[r][c] = v; onChange(g);
  };
  const insererImg = (r: number, c: number, nom: string) => {
    setCell(r, c, (grid[r][c].trimEnd() + `\n[img:${nom}]`).trimStart());
    setPicker(null);
  };
  // Image collée dans une case → enregistrée comme fichier puis insérée en marqueur.
  const collerImg = async (r: number, c: number, file: File) => {
    const b64 = await fileToBase64(file);
    const nom = await api.fichierSave(file.name || "image.png", b64);
    setCell(r, c, (grid[r][c].trimEnd() + `\n[img:${nom}]`).trimStart());
  };
  const retirerImg = (r: number, c: number, idx: number) => {
    let i = 0;
    setCell(r, c, grid[r][c].replace(RE_CELL_IMG, (mm) => (i++ === idx ? "" : mm)).replace(/\n{2,}/g, "\n").trim());
  };
  const addRow = () => onChange([...grid, new Array(grid[0].length).fill("")]);
  const addCol = () => onChange(grid.map((row, i) => [...row, i === 0 ? "Colonne" : ""]));
  const delRow = (r: number) => onChange(grid.filter((_, i) => i !== r));
  const delCol = (c: number) => onChange(grid.map((row) => row.filter((_, i) => i !== c)));

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 520, borderCollapse: "separate", borderSpacing: 0 }}>
          {/* Chaque colonne à sa mesure, comme à l'impression : la description
              a la place du texte, la durée celle de « 10 min ». */}
          <colgroup>
            {(() => {
              const parts = grid[0].map((entete) => partDeColonne(entete));
              const total = parts.reduce((a, b) => a + b, 0) || 1;
              return parts.map((p, c) => <col key={c} style={{ width: `${(p / total) * 100}%` }} />);
            })()}
            <col style={{ width: 30 }} />
          </colgroup>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} style={{ verticalAlign: "top", position: "relative", padding: 0, height: 1 }}>
                    <div style={{ border: "1px solid var(--border)", background: r === 0 ? "var(--panel-2)" : "var(--bg)", minHeight: 32, height: "100%", boxSizing: "border-box" }}>
                      <AutoCell value={cell} header={r === 0} onChange={(v) => setCell(r, c, v)}
                        onPasteImage={r > 0 ? (f) => collerImg(r, c, f) : undefined} />
                      {r > 0 && <VignettesCellule texte={cell} onRemove={(i) => retirerImg(r, c, i)} />}
                    </div>
                    {r > 0 && illustrations.length > 0 && (
                      <button className="btn ghost sm" title="Insérer une illustration"
                        style={{ position: "absolute", top: 3, right: 3, padding: "0 4px", fontSize: 12, lineHeight: 1.4, opacity: 0.7 }}
                        onClick={() => setPicker(picker && picker.r === r && picker.c === c ? null : { r, c })}>🖼</button>
                    )}
                    {picker && picker.r === r && picker.c === c && (
                      <div style={{ position: "absolute", zIndex: 20, top: 24, right: 2, background: "var(--panel)", border: "1px solid var(--border)",
                        borderRadius: 8, padding: 8, boxShadow: "var(--shadow)", display: "flex", gap: 6, flexWrap: "wrap", maxWidth: 240 }}>
                        {illustrations.map((f) => (
                          <button key={f} onClick={() => insererImg(r, c, f)} title="Insérer cette image"
                            style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                            <FichierImg nom={f} style={{ width: 56, height: 42, objectFit: "cover", border: "1px solid var(--border)" }} />
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                ))}
                <td style={{ verticalAlign: "top", paddingLeft: 4 }}>
                  {r > 0 && <button className="btn ghost sm" onClick={() => delRow(r)} title="Supprimer la ligne" aria-label="Supprimer la ligne">✕</button>}
                  {r === 0 && grid[0].length > 1 && <button className="btn ghost sm" onClick={() => delCol(grid[0].length - 1)} title="Supprimer dernière colonne">⤬</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn sm" onClick={addRow}>＋ Ligne</button>
        <button className="btn sm" onClick={addCol}>＋ Colonne</button>
        <button className="btn ghost sm danger" style={{ marginLeft: "auto" }} onClick={() => onChange([])}>Supprimer le tableau</button>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 6 }}>Astuce : {illustrations.length > 0 ? "🖼 insère une illustration dans une case, ou " : ""}collez ({raccourci("V")}) une image directement dans une case — elle reste affichée comme image.</div>
    </div>
  );
}

// ============================================================
// Pièces jointes — photos + PDF (stockées via le backend)
// ============================================================
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Récupère une image depuis un événement de collage (fichier ou data-URL). */
export function imageDuPresse(e: React.ClipboardEvent): File | null {
  const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith("image/"));
  const f = item?.getAsFile();
  if (f) return f;
  const txt = e.clipboardData.getData("text").trim();
  if (/^data:image[^;,\s]*;base64,/.test(txt)) return dataUrlToFile(txt);
  return null;
}

// Matériel pédagogique d'une séance : PDF uniquement, chaque ajout crée un
// matériel lié à la séance (seanceId) — qui reste chez elle, sans paraître
// sur le bureau, et s'imprime à la suite du cahier journal.
export function MaterielSeance({ seanceId, cycle = "" }: { seanceId: string; cycle?: string }) {
  const [items, setItems] = React.useState<MaterielItem[]>([]);
  const pdfInput = React.useRef<HTMLInputElement>(null);

  // L'échelle de chaque PDF dans le cahier journal imprimé, en pourcentage.
  const [echelles, setEchelles] = React.useState<Record<string, number>>({});
  const reload = React.useCallback(() => {
    api.materielList().then(async (all) => {
      const miens = all.filter((m) => m.seanceId === seanceId);
      setItems(miens);
      const lues = await Promise.all(miens.map(async (m) => [m.id, Math.round(lireEchelle(await api.settingGet(cleEchelle(m.id)).catch(() => null)) * 100)] as const));
      setEchelles(Object.fromEntries(lues));
    });
  }, [seanceId]);
  const reglerEchelle = (m: MaterielItem, pourcent: number) => {
    const borne = Math.max(ECHELLE_MIN, Math.min(ECHELLE_MAX, pourcent));
    setEchelles((e) => ({ ...e, [m.id]: borne }));
    api.settingSet(cleEchelle(m.id), String(borne)).catch((e) => toast("Échelle non enregistrée : " + String(e), { icone: "⚠️" }));
  };
  React.useEffect(() => { reload(); }, [reload]);

  const creerMateriel = async (titre: string, nomFichier: string) => {
    await api.materielSave({
      id: newId(), titre, descriptionMateriel: "",
      competenceId: "", competenceTitre: "", domaineTitre: "", sousDomaineTitre: "",
      cycle, imagesJson: "[]", pdfsJson: JSON.stringify([nomFichier]), dateCreation: nowIso(), seanceId, sequenceId: null,
      dossier: "", videosJson: "[]", coffreJson: "[]",
    });
    reload();
  };
  const ajouter = async (file: File) => {
    const b64 = await fileToBase64(file);
    const nomFichier = await api.fichierSave(file.name, b64);
    await creerMateriel(file.name.replace(/\.[^.]+$/, ""), nomFichier);
  };
  const supprimer = async (m: MaterielItem) => {
    try { (JSON.parse(m.pdfsJson || "[]") as string[]).forEach((f) => api.fichierDelete(f)); } catch { /* ignore */ }
    await api.materielDelete(m.id); reload();
  };

  // Un PDF déjà sur le bureau : on le copie dans la séance, fichier compris,
  // pour que le bureau garde le sien et que supprimer l'un ne touche pas l'autre.
  const [bureauOuvert, setBureauOuvert] = React.useState(false);
  const prendreSurLeBureau = async (m: MaterielItem) => {
    const copies: string[] = [];
    for (const nom of lirePdfs(m.pdfsJson)) copies.push(await api.fichierSave(nom, await api.fichierRead(nom)));
    await api.materielSave(copiePourLaSeance(m, seanceId, copies, newId(), nowIso()));
    reload();
  };

  // Glisser-déposer natif depuis le Finder/Aperçu (un PDF ouvert dans Aperçu
  // peut être glissé directement depuis sa barre de titre).
  const { ref: dropRef, actif: dropActif } = useFileDropZone({
    accept: estPdf,
    onFiles: (fichiers) => fichiers.forEach(async (f) => {
      const nomFichier = await api.fichierSave(f.name, await fichierEnBase64(f));
      await creerMateriel(f.name.replace(/\.[^.]+$/, ""), nomFichier);
    }),
  });

  return (
    <div ref={dropRef} style={dropActif ? { outline: "2px dashed var(--accent)", borderRadius: 8, background: "var(--accent-soft)" } : undefined}>
      <input ref={pdfInput} type="file" accept="application/pdf" multiple style={{ display: "none" }}
        onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => ajouter(f)); e.target.value = ""; }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn sm" onClick={() => pdfInput.current?.click()}>📄 Ajouter un PDF</button>
        <button className="btn sm" onClick={() => setBureauOuvert(true)}>🗂 Prendre sur le bureau</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 0 10px" }}>
        Ces PDF restent dans la séance et s'impriment à la suite du cahier journal — glissez-en un depuis le Finder ou Aperçu,
        ou reprenez un PDF du plan de travail, qui y reste à sa place.
      </div>
      {bureauOuvert && <ChoixPdfDuBureau seanceId={seanceId} onPrendre={prendreSurLeBureau} onClose={() => setBureauOuvert(false)} />}
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>Aucun PDF pour cette séance.</div>
      ) : items.map((m) => (
        <div key={m.id} className="list-row" style={{ marginBottom: 6, flexWrap: "wrap" }}>
          <span>📄</span><div style={{ flex: 1, minWidth: 120 }} className="title">{m.titre}</div>
          {/* La molette : l'échelle de cette feuille dans le cahier journal imprimé. */}
          <label className="echelle-impression" title="L'échelle de cette feuille à l'impression du cahier journal : réduite pour qu'elle rentre, agrandie pour qu'elle se lise">
            <span aria-hidden="true">🔍</span>
            <input type="range" min={ECHELLE_MIN} max={ECHELLE_MAX} step={ECHELLE_PAS} value={echelles[m.id] ?? 100}
              aria-label={`Échelle à l'impression de ${m.titre}`} onChange={(e) => reglerEchelle(m, Number(e.target.value))} />
            <span className="echelle-valeur">{echelles[m.id] ?? 100} %</span>
          </label>
          <span className="chip" title="Imprimé à la suite du cahier journal">🖨 Journal</span>
          <button className="btn ghost sm" onClick={() => supprimer(m)} aria-label="Supprimer">🗑</button>
        </div>
      ))}
    </div>
  );
}

/**
 * Les PDF du bureau, à reprendre dans la séance.
 *
 * La fenêtre reste ouverte après un ajout : on prend souvent plusieurs
 * fiches d'un coup, et chaque ligne dit ce qu'elle est devenue.
 */
function ChoixPdfDuBureau({ seanceId, onPrendre, onClose }: {
  seanceId: string; onPrendre: (m: MaterielItem) => Promise<void>; onClose: () => void;
}) {
  const { data: tous, loading } = useAsync(() => api.materielList(), [seanceId]);
  const [recherche, setRecherche] = React.useState("");
  const [pris, setPris] = React.useState<Record<string, "encours" | "fait" | "echec">>({});
  const candidats = React.useMemo(() => chercherPdfs(pdfsDuBureau(tous ?? []), recherche), [tous, recherche]);
  const prendre = async (m: MaterielItem) => {
    setPris((p) => ({ ...p, [m.id]: "encours" }));
    try { await onPrendre(m); setPris((p) => ({ ...p, [m.id]: "fait" })); }
    catch (e) { setPris((p) => ({ ...p, [m.id]: "echec" })); toast("PDF non copié : " + String(e), { icone: "⚠️" }); }
  };
  const chemin = (dossier: string) => filDAriane(dossier).slice(1).map((x) => x.nom).join(" › ");
  return (
    <Modal titre="Prendre un PDF sur le bureau" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 10 }}>
        Les PDF posés sur le plan de travail. Chacun est copié dans la séance : le bureau garde le sien.
      </div>
      <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Chercher un titre ou un dossier…"
        aria-label="Chercher un PDF du bureau" style={{ marginBottom: 10 }} />
      {loading ? <div className="meta">Chargement…</div>
        : candidats.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>
            {recherche.trim() ? "Aucun PDF du bureau ne correspond." : "Aucun PDF sur le bureau : déposez-en un sur le plan de travail."}
          </div>
        ) : candidats.map((m) => {
          const etat = pris[m.id];
          const nb = lirePdfs(m.pdfsJson).length;
          return (
            <div key={m.id} className="list-row" style={{ padding: "8px 12px" }}>
              <div style={{ width: 44, height: 56, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <VignettePdf nom={lirePdfs(m.pdfsJson)[0]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titre || "Sans titre"}</div>
                <div className="meta">{[chemin(m.dossier) || "Bureau", nb > 1 ? `${nb} PDF` : ""].filter(Boolean).join(" · ")}</div>
              </div>
              {etat === "fait"
                ? <span className="chip">✓ Ajouté</span>
                : <button className="btn sm primary" disabled={etat === "encours"} onClick={() => prendre(m)}>
                    {etat === "encours" ? "Copie…" : "＋ Ajouter"}
                  </button>}
            </div>
          );
        })}
    </Modal>
  );
}

// ============================================================
// Éditeur de liste de fichiers (noms stockés dans un tableau JSON)
// Utilisé par le Matériel (imagesJson / pdfsJson).
// ============================================================
export function FileListEditor({ type, fichiers, onChange }: {
  type: "image" | "pdf"; fichiers: string[]; onChange: (f: string[]) => void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const ajouter = async (file: File) => {
    const b64 = await fileToBase64(file);
    const nom = await api.fichierSave(file.name, b64);
    onChange([...fichiers, nom]);
  };
  const supprimer = async (nom: string) => { await api.fichierDelete(nom); onChange(fichiers.filter((f) => f !== nom)); };

  // Import séquentiel : évite que deux fichiers déposés en même temps ne
  // s'écrasent l'un l'autre via des `onChange([...fichiers, …])` concurrents.
  const fichiersRef = React.useRef(fichiers);
  fichiersRef.current = fichiers;
  const { ref: dropRef, actif: dropActif } = useFileDropZone({
    accept: type === "image" ? estImage : estDocument,
    onFiles: async (fichiers) => {
      for (const f of fichiers) {
        const nom = await api.fichierSave(f.name, await fichierEnBase64(f));
        fichiersRef.current = [...fichiersRef.current, nom];
        onChange(fichiersRef.current);
      }
    },
  });

  return (
    <div ref={dropRef} style={dropActif ? { outline: "2px dashed var(--accent)", borderRadius: 8, background: "var(--accent-soft)" } : undefined}>
      <input ref={input} type="file" accept={type === "image" ? "image/*" : EXTENSIONS_DOCUMENTS} multiple style={{ display: "none" }}
        onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => ajouter(f)); e.target.value = ""; }} />
      <button className="btn sm" onClick={() => input.current?.click()}>{type === "image" ? "📷 Ajouter une image" : "📄 Ajouter un document"}</button>
      {type === "image" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {fichiers.map((f) => <ImgThumb key={f} nom={f} onDelete={() => supprimer(f)} />)}
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          {fichiers.map((f) => (
            <div key={f} className="list-row" style={{ marginBottom: 6 }}>
              <span title={typeDocument(f).libelle}>{typeDocument(f).icone}</span><div style={{ flex: 1 }} className="meta">{typeDocument(f).libelle} · {f}</div>
              <button className="btn ghost sm" onClick={() => api.fichierOuvrir(f).catch((e) => toast(String(e), { icone: "⚠️" }))} aria-label="Ouvrir">↗</button>
              <button className="btn ghost sm" onClick={() => supprimer(f)} aria-label="Supprimer">🗑</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImgThumb({ nom, onDelete }: { nom: string; onDelete: () => void }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => { api.fichierRead(nom).then((b) => setSrc(`data:image;base64,${b}`)).catch(() => {}); }, [nom]);
  return (
    <div style={{ position: "relative", width: 80 }}>
      {src ? <img alt="Aperçu" src={src} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border)" }} />
        : <div style={{ width: 80, height: 80, borderRadius: 8, background: "var(--panel-2)" }} />}
      <button className="btn ghost sm" style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,.55)", color: "#fff" }} onClick={onDelete} aria-label="Supprimer">✕</button>
    </div>
  );
}

