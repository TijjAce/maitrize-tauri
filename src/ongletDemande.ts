// Ouvrir le sous-onglet d'une page, d'où qu'on soit.
//
// Les sous-onglets ne sont pas dans l'URL : on va à la page, puis on lui
// demande l'onglet par un événement, qu'elle écoute (voir `useOngletDemande`).

/** Nom de l'événement émis par la palette pour ouvrir un sous-onglet. */
export const EVT_ONGLET = "maitrize:onglet";

/** Demande l'ouverture d'un sous-onglet d'une page (depuis la palette). */
export function ouvrirOnglet(page: string, onglet: string) {
  window.dispatchEvent(new CustomEvent(EVT_ONGLET, { detail: { page, onglet } }));
}
