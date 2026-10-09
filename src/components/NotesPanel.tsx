import React from "react";
import { api } from "../api";
import { CLE_NOTES_RAPIDES, EVT_NOTE_AJOUTEE, EVT_OUVRIR_NOTES, avecUnPointDePlus, type NoteAjoutee } from "../notesRapides";

/// Panneau de notes rapides flottant, accessible depuis toute l'app.
/// Contenu persisté dans settings (clé `notesRapides`), sauvegarde différée.
/// Le téléphone y ajoute des points (voir notesRapides.ts) : le panneau se
/// relit à chaque ouverture, et montre ceux qui arrivent pendant qu'il est ouvert.
export function NotesPanel() {
  const [open, setOpen] = React.useState(false);
  const [texte, setTexte] = React.useState("");
  const [charge, setCharge] = React.useState(false);
  const zone = React.useRef<HTMLTextAreaElement>(null);
  const timer = React.useRef<number | null>(null);
  // Le texte tel qu'on l'a sous les yeux, et les enregistrements partis mais pas encore arrivés.
  const dernier = React.useRef("");
  const enVol = React.useRef(0);
  // Où était le curseur quand un point est arrivé : on l'y remet.
  const curseur = React.useRef<[number, number] | null>(null);

  const enregistrer = React.useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    enVol.current += 1;
    void api.settingSet(CLE_NOTES_RAPIDES, dernier.current).finally(() => { enVol.current -= 1; });
  }, []);
  const plusTard = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(enregistrer, 400);
  }, [enregistrer]);

  // À chaque ouverture, on relit : le téléphone, ou un autre ordinateur, a pu
  // écrire entre-temps. À la fermeture, ce qui restait à enregistrer part.
  React.useEffect(() => {
    if (!open) {
      if (timer.current) enregistrer();
      setCharge(false);
      return;
    }
    if (charge) return;
    let vivant = true;
    void api.settingGet(CLE_NOTES_RAPIDES).then((v) => {
      if (!vivant) return;
      dernier.current = v ?? "";
      setTexte(dernier.current);
      setCharge(true);
    });
    return () => { vivant = false; };
  }, [open, charge, enregistrer]);

  React.useEffect(() => () => { if (timer.current) enregistrer(); }, [enregistrer]);

  // Un point arrive du téléphone. L'ordinateur l'a déjà écrit ; si une frappe
  // n'est pas encore enregistrée, elle l'effacerait en partant : le point la
  // rejoint, et part avec elle.
  React.useEffect(() => {
    const ajoute = (e: Event) => {
      const { notes, texte: point } = (e as CustomEvent<NoteAjoutee>).detail;
      if (timer.current || enVol.current > 0) {
        dernier.current = avecUnPointDePlus(dernier.current, point);
        plusTard();
      } else {
        dernier.current = notes;
      }
      const z = zone.current;
      if (z && document.activeElement === z) curseur.current = [z.selectionStart, z.selectionEnd];
      setTexte(dernier.current);
    };
    const ouvrir = () => setOpen(true);
    window.addEventListener(EVT_NOTE_AJOUTEE, ajoute);
    window.addEventListener(EVT_OUVRIR_NOTES, ouvrir);
    return () => {
      window.removeEventListener(EVT_NOTE_AJOUTEE, ajoute);
      window.removeEventListener(EVT_OUVRIR_NOTES, ouvrir);
    };
  }, [plusTard]);

  React.useLayoutEffect(() => {
    const z = zone.current, c = curseur.current;
    if (z && c) { z.setSelectionRange(c[0], c[1]); curseur.current = null; }
  }, [texte]);

  const onChange = (v: string) => {
    dernier.current = v;
    setTexte(v);
    plusTard();
  };

  return (
    <>
      <button className="notes-fab" title="Notes rapides" onClick={() => setOpen((o) => !o)}>📝</button>
      {open && (
        <div className="notes-panel">
          <div className="notes-head">
            <strong>Notes rapides</strong>
            <span style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
          </div>
          <textarea ref={zone} className="textarea" style={{ flex: 1, border: "none", borderRadius: 0, resize: "none" }}
            placeholder="Vos notes, pense-bêtes, idées… Le dictaphone du téléphone peut aussi en ajouter."
            readOnly={!charge} value={texte} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </>
  );
}
