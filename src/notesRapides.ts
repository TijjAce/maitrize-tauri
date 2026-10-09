// ── Les notes rapides ─────────────────────────────────────────────────────
//
// Le panneau 📝, ouvert de partout, et ce que le téléphone y envoie : une
// dictée ou une note marquée « Notes rapides » y devient un point de plus,
// « - … », à la ligne sous ce qui est écrit. C'est l'ordinateur qui l'ajoute
// (`notes_rapides_ajouter`), d'un seul tenant ; le panneau ouvert le montre.

/** Le réglage où elles vivent ; il se partage entre les ordinateurs. */
export const CLE_NOTES_RAPIDES = "notesRapides";

/** Émis quand un point vient d'être ajouté. `detail` : `{ notes, texte }`, les notes désormais et le point. */
export const EVT_NOTE_AJOUTEE = "maitrize:note-rapide-ajoutee";
/** Émis par « Voir » sur l'annonce d'un point ajouté : le panneau s'ouvre. */
export const EVT_OUVRIR_NOTES = "maitrize:ouvrir-notes-rapides";

export interface NoteAjoutee { notes: string; texte: string }

/**
 * Les notes avec un point de plus, à la ligne sous ce qui est écrit. Une note
 * de plusieurs lignes reste un seul point : les lignes suivantes se décalent
 * sous le tiret. Le même calcul que l'ordinateur (`avec_un_point_de_plus`) :
 * le panneau s'en sert quand une frappe n'est pas encore enregistrée.
 */
export function avecUnPointDePlus(notes: string, texte: string): string {
  const lignes = (texte || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return notes;
  const point = `- ${lignes.join("\n  ")}`;
  const avant = (notes || "").trimEnd();
  return avant ? `${avant}\n${point}` : point;
}
