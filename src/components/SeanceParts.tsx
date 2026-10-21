import React from "react";
import { api, MaterielItem } from "../api";
import { useFileDropZone, estImage, estDocument, typeDocument, EXTENSIONS_DOCUMENTS, fichierEnBase64 } from "../dragdrop";
import { toast } from "./Toaster";
import { ouvrirLaPieceJointe } from "./LecteurMarkdown";
import { Input, Modal, useAsync } from "./ui";
import { VignettePdf } from "./VignettePdf";
import { filDAriane } from "../dossiers";
import { chercherPdfs, lirePdfs, pdfsDuBureau } from "../materielSeance";

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

/** Ce que dit la fenêtre des PDF du bureau quand on les copie dans une séance. */
const MOTS_SEANCE = {
  titre: "Prendre un PDF sur le bureau",
  aide: "Les PDF posés sur le plan de travail. Chacun est copié dans la séance : le bureau garde le sien.",
  bouton: "＋ Ajouter", enCours: "Copie…", fait: "✓ Ajouté", echec: "PDF non copié",
};

/**
 * Les PDF du bureau, à reprendre dans une séance — ou à citer dans le cahier
 * journal : les mots changent, la liste est la même.
 *
 * La fenêtre reste ouverte après un ajout : on prend souvent plusieurs
 * fiches d'un coup, et chaque ligne dit ce qu'elle est devenue.
 */
export function ChoixPdfDuBureau({ onPrendre, onClose, mots = MOTS_SEANCE }: {
  onPrendre: (m: MaterielItem) => Promise<void> | void; onClose: () => void;
  mots?: { titre: string; aide: string; bouton: string; enCours: string; fait: string; echec: string };
}) {
  const { data: tous, loading } = useAsync(() => api.materielList(), []);
  const [recherche, setRecherche] = React.useState("");
  const [pris, setPris] = React.useState<Record<string, "encours" | "fait" | "echec">>({});
  const candidats = React.useMemo(() => chercherPdfs(pdfsDuBureau(tous ?? []), recherche), [tous, recherche]);
  const prendre = async (m: MaterielItem) => {
    setPris((p) => ({ ...p, [m.id]: "encours" }));
    try { await onPrendre(m); setPris((p) => ({ ...p, [m.id]: "fait" })); }
    catch (e) { setPris((p) => ({ ...p, [m.id]: "echec" })); toast(`${mots.echec} : ${String(e)}`, { icone: "⚠️" }); }
  };
  const chemin = (dossier: string) => filDAriane(dossier).slice(1).map((x) => x.nom).join(" › ");
  return (
    <Modal titre={mots.titre} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 10 }}>{mots.aide}</div>
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
                ? <span className="chip">{mots.fait}</span>
                : <button className="btn sm primary" disabled={etat === "encours"} onClick={() => prendre(m)}>
                    {etat === "encours" ? mots.enCours : mots.bouton}
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
              <button className="btn ghost sm" onClick={() => ouvrirLaPieceJointe(f).catch((e) => toast(String(e), { icone: "⚠️" }))} aria-label="Ouvrir">↗</button>
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

