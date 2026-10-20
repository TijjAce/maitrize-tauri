// Les raccourcis clavier de Maitrize, tels que l'application les écoute
// (demande de l'enseignant, octobre 2026 : les voir depuis ⌘K).
//
// La liste suit le code : chaque raccourci renvoie à l'endroit qui l'écoute.
// Un raccourci ajouté ailleurs doit l'être ici aussi, sinon personne ne le
// découvre. Les touches s'écrivent comme sur le clavier de l'ordinateur :
// ⌘ ⌥ ⇧ sur Mac, Ctrl, Alt, Maj ailleurs.

import { isMac } from "./api";

export interface Raccourci {
  /** Les touches, une combinaison par entrée : « ⌘[ » ou « ⌘⌥← » font la même chose. */
  touches: string[];
  quoi: string;
}

export interface GroupeDeRaccourcis {
  ou: string;
  raccourcis: Raccourci[];
}

export function raccourcisClavier(mac = isMac): GroupeDeRaccourcis[] {
  const cmd = (t: string) => (mac ? `⌘${t}` : `Ctrl+${t}`);
  const maj = (t: string) => (mac ? `⇧${t}` : `Maj+${t}`);
  const entree = mac ? "↵" : "Entrée";
  const groupes: GroupeDeRaccourcis[] = [
    {
      ou: "Partout",
      raccourcis: [
        // CommandPalette
        { touches: [cmd("K")], quoi: "Ouvrir ou fermer la palette : chercher, aller à une page, lancer une action" },
        // Retour.tsx
        { touches: [cmd("["), mac ? "⌘⌥←" : "Ctrl+Alt+←"], quoi: "Revenir où l'on était" },
        { touches: [cmd("]"), mac ? "⌘⌥→" : "Ctrl+Alt+→"], quoi: "Aller de nouveau là où l'on allait" },
        // App.tsx : ⌘ et ⌥ ensemble, sur Mac seulement (l'écoute exige ⌘).
        ...(mac ? [{ touches: ["⌘⌥↑", "⌘⌥↓"], quoi: "Page précédente ou suivante du menu" }] : []),
        // useSegmentNav (components/ui.tsx)
        { touches: [cmd("←"), cmd("→")], quoi: "Onglet précédent ou suivant de la page" },
        { touches: ["Échap"], quoi: "Fermer une fenêtre, un menu ou la palette" },
      ],
    },
    {
      ou: "Dans la palette",
      raccourcis: [
        { touches: ["↑", "↓"], quoi: "Choisir une ligne" },
        { touches: [entree], quoi: "Lancer ce qui est choisi" },
        { touches: [mac ? "⇥" : "Tab", maj(mac ? "⇥" : "Tab")], quoi: "Rubrique suivante ou précédente : actions, pages, dossiers…" },
        { touches: ["?"], quoi: "Voir ces raccourcis" },
      ],
    },
    {
      ou: "Organisation › Progression et Programmation",
      raccourcis: [
        // useHistorique (components/ui.tsx), sur le tableau actif.
        { touches: [cmd("Z")], quoi: "Annuler la dernière modification du tableau" },
        { touches: [mac ? "⌘⇧Z" : "Ctrl+Maj+Z", cmd("Y")], quoi: "Rétablir" },
      ],
    },
    {
      ou: "Plan de travail",
      raccourcis: [
        // PlanDeTravail.tsx
        { touches: [cmd("A")], quoi: "Tout sélectionner" },
        { touches: [mac ? "⌘-clic" : "Ctrl+clic", maj("clic")], quoi: "Ajouter à la sélection" },
        { touches: ["Échap"], quoi: "Ne plus rien sélectionner" },
        { touches: [mac ? "⌫" : "Suppr"], quoi: "Supprimer la sélection, après confirmation" },
      ],
    },
    {
      ou: "CAA › Tableaux de langage",
      // Tla.tsx
      raccourcis: [{ touches: [cmd("Z")], quoi: "Annuler la dernière modification" }],
    },
    {
      ou: "CAA › Minuteur visuel, en plein écran",
      // SupportsVisuels.tsx
      raccourcis: [
        { touches: ["Espace"], quoi: "Démarrer ou mettre en pause" },
        { touches: ["Échap"], quoi: "Quitter le plein écran" },
      ],
    },
    {
      ou: "Un PDF ouvert (coffre, séance, cahier journal)",
      // PdfViewer.tsx
      raccourcis: [{ touches: [cmd("F")], quoi: "Chercher dans le document" }],
    },
    {
      ou: "Adapter une fiche › Manuels",
      // Manuels.tsx
      raccourcis: [{ touches: ["←", "→"], quoi: "Page précédente ou suivante" }],
    },
  ];
  return groupes;
}

/** Les groupes réduits aux raccourcis qui répondent à la recherche (dans ce qu'ils font, où, ou leurs touches). */
export function chercherRaccourcis(groupes: GroupeDeRaccourcis[], recherche: string): GroupeDeRaccourcis[] {
  const plier = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const mots = plier(recherche).split(/\s+/).filter(Boolean);
  if (!mots.length) return groupes;
  return groupes
    .map((g) => ({
      ...g,
      raccourcis: g.raccourcis.filter((r) => {
        const texte = plier(`${g.ou} ${r.quoi} ${r.touches.join(" ")}`);
        return mots.every((m) => texte.includes(m));
      }),
    }))
    .filter((g) => g.raccourcis.length > 0);
}
