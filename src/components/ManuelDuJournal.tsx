import React from "react";
import { api, newId, nowIso, texteErreur, type DocumentCoffre } from "../api";
import { LecteurPdfCitable } from "./LecteurPdfCitable";
import { toast } from "./Toaster";

// ── Citer un manuel dans le cahier journal ────────────────────────────────
//
// Les manuels et fichiers de l'élève sont dans le coffre-fort (Ressources).
// D'ici, on en cite la page — « 📖 Cap Maths CE1 · p. 42 » — et l'on découpe
// l'exercice : son image se pose dans le prévu, et s'imprime avec le jour.
//
// La fenêtre reste ouverte après chaque ajout : une séance cite souvent deux
// exercices d'affilée.

const enBase64 = (f: File): Promise<string> =>
  new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = ko;
    r.readAsDataURL(f);
  });

export function ManuelDuJournal({ onClose, onCiter, onImage }: {
  onClose: () => void;
  /** Le passage surligné, ou la seule page quand rien n'est surligné. */
  onCiter: (manuel: string, page: number, passage: string) => void;
  /** L'image découpée : à enregistrer, puis à poser sous la ligne du manuel. */
  onImage: (manuel: string, page: number, base64: string) => Promise<void>;
}) {
  const [docs, setDocs] = React.useState<DocumentCoffre[] | null>(null);
  const [docId, setDocId] = React.useState("");
  const [ajoutes, setAjoutes] = React.useState(0);
  const importer = React.useRef<HTMLInputElement>(null);

  const charger = React.useCallback(async () => {
    try { setDocs(await api.coffreList()); } catch (e) { setDocs([]); toast(texteErreur(e), { icone: "⚠️" }); }
  }, []);
  React.useEffect(() => { void charger(); }, [charger]);

  const doc = (docs ?? []).find((d) => d.id === docId) ?? null;
  // Un seul manuel dans le coffre : autant l'ouvrir tout de suite.
  React.useEffect(() => { if (!docId && docs?.length === 1) setDocId(docs[0].id); }, [docs, docId]);

  const ajouterPdf = async (f: File) => {
    try {
      const nomFichier = await api.fichierSave(f.name, await enBase64(f));
      const d = await api.coffreSave({
        id: newId(), nom: f.name.replace(/\.pdf$/i, ""), nomFichier, tailleOctets: f.size, dateAjout: nowIso(),
      });
      await charger();
      setDocId(d.id);
    } catch (e) {
      toast("Import impossible : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    }
  };

  return (
    <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="modal citer-competences" role="dialog" aria-modal="true" aria-label="Citer un manuel">
        <div className="modal-head">
          <h2>📖 Citer un manuel</h2>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="citer-competences-principal" style={{ flex: 1, minHeight: 0, padding: "12px 20px", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select className="select" value={docId} onChange={(e) => setDocId(e.target.value)}
              style={{ flex: "1 1 240px", minWidth: 0 }} aria-label="Manuel du coffre-fort">
              <option value="">— Choisir un manuel du coffre-fort —</option>
              {(docs ?? []).map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
            </select>
            <input ref={importer} type="file" accept="application/pdf" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void ajouterPdf(f); e.target.value = ""; }} />
            <button className="btn sm" onClick={() => importer.current?.click()}>＋ Importer un manuel (PDF)</button>
          </div>

          {!doc ? (
            <div className="citer-competences-defile">
              <p style={{ fontSize: 13.5, color: "var(--text-2)" }}>
                {docs === null ? "Lecture du coffre-fort…"
                  : docs.length ? "Choisissez un manuel ci-dessus. Vous pourrez en citer une page, ou y découper un exercice à poser dans le prévu."
                  : "Le coffre-fort est vide. Importez le PDF d'un manuel ou d'un fichier de l'élève : il restera dans Ressources › Coffre-fort, prêt à être cité."}
              </p>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0 }}>
              <LecteurPdfCitable nomFichier={doc.nomFichier}
                onCiter={(texte, page) => { onCiter(doc.nom, page, texte); setAjoutes((n) => n + 1); }}
                onImage={async ({ base64, page }) => { await onImage(doc.nom, page, base64); setAjoutes((n) => n + 1); }} />
            </div>
          )}
        </div>

        <div className="modal-foot">
          <span style={{ fontSize: 12.5, color: "var(--text-2)", marginRight: "auto" }}>
            {doc ? "❝ Texte : surlignez le passage. 🖼 Image : tracez un cadre sur l'exercice." : ""}
            {ajoutes > 0 && ` · ${ajoutes} ajout${ajoutes > 1 ? "s" : ""} au prévu`}
          </span>
          {doc && <button className="btn" onClick={() => onCiter(doc.nom, 0, "")}>📖 Citer le manuel seul</button>}
          <button className="btn primary" onClick={onClose}>Terminé</button>
        </div>
      </div>
    </div>
  );
}
