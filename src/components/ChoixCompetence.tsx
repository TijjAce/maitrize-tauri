import React from "react";
import { Input, Modal } from "./ui";
import { CompetenceTree, type CompetenceSelectionnee } from "./CompetenceTree";

// Choisir une compétence, vite : on cherche, on clique, c'est posé.
//
// Les autres écrans en cochent plusieurs, puis valident. Ici, dans le cahier
// journal, une compétence se note au vol entre deux activités : le clic vaut
// validation, et la fenêtre se referme.

export function ChoixCompetence({ onClose, onChoisir, titre = "🎯 Poser une compétence" }: {
  onClose: () => void;
  onChoisir: (c: CompetenceSelectionnee) => void;
  titre?: string;
}) {
  const [recherche, setRecherche] = React.useState("");
  return (
    <Modal titre={titre} onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Annuler</button>}>
      <Input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)}
        placeholder="Chercher une compétence (ex. : nombres jusqu'à 30, attendre son tour…)"
        aria-label="Chercher une compétence" />
      <div style={{ maxHeight: "52vh", overflowY: "auto", marginTop: 8 }}>
        <CompetenceTree mode="single" selection={[]} recherche={recherche} onPick={(c) => onChoisir(c)} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 6 }}>
        Un clic sur une compétence l'écrit dans le prévu, avec son référentiel.
      </div>
    </Modal>
  );
}
