import { Page } from "../App";
import { PanneauCommun } from "../components/PanneauCommun";

// La page pleine largeur d'un bureau commun. Le même panneau s'ouvre à droite
// du bureau quand on le scinde en deux (Plan de travail › 🤝 Bureaux communs) :
// tout ce qui s'y fait est écrit une seule fois, dans PanneauCommun.

export default function BureauxCommuns() {
  return (
    <Page titre="Bureaux communs" sous="Des dossiers partagés avec vos collègues, par Nuage, OneDrive, Google Drive…">
      <PanneauCommun />
    </Page>
  );
}
