// ── Le premier lancement ──────────────────────────────────────────────────
//
// « À la première installation de l'application, juste après avoir accepté
// les conditions d'utilisation, l'utilisateur est invité à installer les
// pictos ARASAAC et les autres (obligatoirement). Ensuite il peut, s'il veut,
// rentrer sa clé API. Puis il est invité à débuter par la création de son
// emploi du temps » (l'enseignant, 5 novembre 2026).
//
// Trois étapes, en plein écran, après la porte des conditions d'utilisation
// (voir components/PremierLancement.tsx). Le parcours remplace les
// diapositives d'accueil d'avant (réglage « onboardingVu ») : une
// installation qui les avait déjà vues ne le voit pas, elle n'a rien à
// installer de nouveau.

/** Le réglage qui retient que le premier lancement est fait : sa date, ou « deja-installee ». */
export const CLE_PREMIER_LANCEMENT = "premierLancement";

/** Ce que le lancement doit faire : montrer le parcours, le noter comme fait pour une installation d'avant, ou rien. */
export function suiteDuLancement(fait: string | null | undefined, accueilVu: string | null | undefined): "montrer" | "deja-installee" | "rien" {
  if (fait) return "rien";
  return accueilVu ? "deja-installee" : "montrer";
}

export type EtapeDuLancement = "pictos" | "cle" | "edt";

export const ETAPES_DU_LANCEMENT: { id: EtapeDuLancement; nom: string }[] = [
  { id: "pictos", nom: "Les pictogrammes" },
  { id: "cle", nom: "L'assistant IA" },
  { id: "edt", nom: "L'emploi du temps" },
];

/** Les pictogrammes sont là quand ARASAAC et chaque banque d'appoint attendue le sont : on ne passe pas sans eux. */
export const pictosInstalles = (arasaac: boolean, appoint: { banque: string; installee: boolean }[], attendues: string[]): boolean =>
  arasaac && attendues.every((b) => appoint.some((e) => e.banque === b && e.installee));
