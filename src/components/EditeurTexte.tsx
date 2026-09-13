import { Texte } from "../api";
import { EditeurRiche } from "./EditeurRiche";
import { useTexteAutosave, LIBELLE_ENREGISTREMENT } from "./useTexteAutosave";
import { printHTML, escapeHtml } from "../print";
import { nettoyerHtml } from "../texteRiche";

// Fichier texte du plan de travail, ouvert comme dans un traitement de texte :
// grande feuille, mise en forme, reformulation par l'IA du passage sélectionné.
// Enregistrement automatique, sans bouton.

export function EditeurTexte({ texte, onClose }: { texte: Texte; onClose: () => void }) {
  const { titre, setTitre, contenu, setContenu, etat, sauver } = useTexteAutosave(texte);
  const fermer = async () => { await sauver(); onClose(); };
  const imprimer = async () => {
    await sauver();
    printHTML(titre || "Texte", `<h1>${escapeHtml(titre || "Sans titre")}</h1>${nettoyerHtml(contenu)}`);
  };

  return (
    <div className="overlay" style={{ zIndex: 120 }} onMouseDown={(e) => { if (e.target === e.currentTarget) fermer(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); fermer(); } }}>
      <div className="modal editeur-plein" role="dialog" aria-modal="true" aria-label="Fichier texte">
        <div className="modal-head" style={{ gap: 10 }}>
          <span aria-hidden style={{ fontSize: 20 }}>📝</span>
          <input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre"
            onFocus={(e) => { if (titre === "Nouveau texte") e.currentTarget.select(); }}
            style={{ fontSize: 17, fontWeight: 700, flex: 1, minWidth: 0 }} aria-label="Titre du texte" />
          <span style={{ fontSize: 12, color: etat === "erreur" ? "var(--danger, #c0392b)" : "var(--text-2)", whiteSpace: "nowrap" }}>
            {LIBELLE_ENREGISTREMENT[etat]}
          </span>
          <button className="btn sm" onClick={imprimer}>🖨 Imprimer</button>
          <button className="btn primary sm" onClick={fermer}>Fermer</button>
        </div>
        <div className="editeur-plein-corps">
          <EditeurRiche valeur={texte.contenu} onChange={setContenu}
            placeholder="Écrivez ici… Sélectionnez un passage pour le reformuler." minHauteur="60vh" />
        </div>
      </div>
    </div>
  );
}
