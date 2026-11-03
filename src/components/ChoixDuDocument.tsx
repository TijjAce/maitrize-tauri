import React from "react";
import { api, texteErreur, type DocumentCoffre } from "../api";
import { Input, Modal } from "./ui";

// Le choix d'un document du coffre-fort, pour que l'Assistant IA y réponde
// (voir questionsAuDocument.ts) : la liste, une recherche, un clic.

export function ChoixDuDocument({ onChoisir, onClose }: { onChoisir: (d: DocumentCoffre) => void; onClose: () => void }) {
  const [docs, setDocs] = React.useState<DocumentCoffre[] | null>(null);
  const [erreur, setErreur] = React.useState("");
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    api.coffreList().then(setDocs).catch((e) => { setDocs([]); setErreur(texteErreur(e)); });
  }, []);
  const cherche = q.trim().toLowerCase();
  const filtres = (docs ?? []).filter((d) => !cherche || d.nom.toLowerCase().includes(cherche))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  return (
    <Modal titre="🗄️ Un document du coffre-fort" onClose={onClose}>
      <Input className="search" placeholder="Rechercher un document…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus
        style={{ width: "100%", maxWidth: "none" }} />
      <div style={{ marginTop: 10, maxHeight: "55vh", overflowY: "auto" }}>
        {docs === null ? <p className="meta">Lecture du coffre-fort…</p>
          : erreur ? <p className="meta">Le coffre-fort ne se lit pas : {erreur}</p>
          : !docs.length ? <p className="meta">Le coffre-fort est vide : ajoutez-y un PDF dans Ressources › Coffre-fort.</p>
          : !filtres.length ? <p className="meta">Aucun document ne porte ce nom.</p>
          : filtres.map((d) => (
            <button key={d.id} type="button" className="list-row" style={{ width: "100%", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
              onClick={() => onChoisir(d)}>
              <span aria-hidden>📕</span>
              <span className="title" style={{ flex: 1, minWidth: 0 }}>{d.nom}</span>
            </button>
          ))}
      </div>
    </Modal>
  );
}
