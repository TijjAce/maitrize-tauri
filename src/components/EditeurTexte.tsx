import React from "react";
import { api, Texte, texteErreur } from "../api";
import { Modal, Input, Select } from "./ui";
import { toast } from "./Toaster";
import { reformuler, STYLES, Style } from "../reformulation";

// Éditeur d'un fichier texte du plan de travail.
//
// Enregistrement automatique : on écrit comme dans un carnet, sans bouton.
// L'IA propose, l'enseignant dispose : une reformulation s'affiche à côté du
// texte, retouchable, et ne le remplace que sur demande — avec un retour
// arrière possible.

interface Proposition {
  texte: string;
  /** Le passage envoyé, tel qu'il était : pour le retrouver si l'on a tapé entre-temps. */
  source: string;
  debut: number;
  portee: "selection" | "tout";
  style: Style;
  nomsAbsents: string[];
}

type Etat = "enregistre" | "modifie" | "enregistrement" | "erreur";

export function EditeurTexte({ texte, onClose }: { texte: Texte; onClose: () => void }) {
  const [titre, setTitre] = React.useState(texte.titre);
  const [contenu, setContenu] = React.useState(texte.contenu);
  const [etat, setEtat] = React.useState<Etat>("enregistre");
  const [style, setStyle] = React.useState<Style>("reformuler");
  const [enCours, setEnCours] = React.useState(false);
  const [proposition, setProposition] = React.useState<Proposition | null>(null);
  const [avantRemplacement, setAvantRemplacement] = React.useState<string | null>(null);
  const zone = React.useRef<HTMLTextAreaElement>(null);
  const valeurs = React.useRef({ titre, contenu });
  valeurs.current = { titre, contenu };
  const enregistres = React.useRef({ titre: texte.titre, contenu: texte.contenu });

  const sauver = React.useCallback(async () => {
    const { titre: ti, contenu: co } = valeurs.current;
    if (ti === enregistres.current.titre && co === enregistres.current.contenu) return;
    setEtat("enregistrement");
    try {
      await api.texteSave({ ...texte, titre: ti.trim() || "Sans titre", contenu: co });
      enregistres.current = { titre: ti, contenu: co };
      setEtat(valeurs.current.titre === ti && valeurs.current.contenu === co ? "enregistre" : "modifie");
    } catch (e) {
      setEtat("erreur");
      toast("Enregistrement impossible : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    }
  }, [texte]);

  React.useEffect(() => {
    if (titre === enregistres.current.titre && contenu === enregistres.current.contenu) return;
    setEtat("modifie");
    const id = window.setTimeout(sauver, 700);
    return () => window.clearTimeout(id);
  }, [titre, contenu, sauver]);

  const fermer = async () => { await sauver(); onClose(); };

  const proposer = async () => {
    const el = zone.current;
    const debut = el?.selectionStart ?? 0, fin = el?.selectionEnd ?? 0;
    const selection = fin > debut ? contenu.slice(debut, fin) : "";
    const source = selection || contenu;
    if (!source.trim()) { toast("Écrivez d’abord quelques lignes.", { icone: "✍️" }); return; }
    setEnCours(true);
    setProposition(null);
    try {
      const p = await reformuler(source, style);
      setProposition({ texte: p.texte, source, debut: selection ? debut : 0, portee: selection ? "selection" : "tout",
        style, nomsAbsents: p.nomsAbsents });
    } catch (e) {
      toast("Reformulation impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setEnCours(false);
    }
  };

  /** Où se trouve le passage envoyé, dans le texte tel qu'il est maintenant. */
  const position = (p: Proposition) =>
    contenu.slice(p.debut, p.debut + p.source.length) === p.source ? p.debut : contenu.indexOf(p.source);

  const appliquer = (mode: "remplacer" | "inserer") => {
    if (!proposition) return;
    const i = position(proposition);
    let nouveau: string;
    if (i < 0) {
      // Le passage a été retouché pendant la reformulation : on ne devine pas où la mettre.
      nouveau = contenu.replace(/\s*$/, "") + "\n\n" + proposition.texte;
      toast("Le texte a changé entre-temps : la proposition est ajoutée à la fin.", { icone: "ℹ️" });
    } else if (mode === "remplacer") {
      nouveau = contenu.slice(0, i) + proposition.texte + contenu.slice(i + proposition.source.length);
    } else {
      const finPassage = i + proposition.source.length;
      nouveau = contenu.slice(0, finPassage).replace(/\s*$/, "") + "\n\n" + proposition.texte + contenu.slice(finPassage);
    }
    setAvantRemplacement(contenu);
    setContenu(nouveau);
    setProposition(null);
  };

  const libelleEtat = { enregistre: "Enregistré", modifie: "Modifications…", enregistrement: "Enregistrement…", erreur: "Non enregistré" }[etat];

  return (
    <Modal large titre="📝 Fichier texte" onClose={fermer}
      footer={<>
        <span style={{ fontSize: 12, color: etat === "erreur" ? "var(--danger, #c0392b)" : "var(--text-2)", marginRight: "auto" }}>
          {etat === "enregistre" ? "✓ " : ""}{libelleEtat}
        </span>
        <button className="btn primary" onClick={fermer}>Fermer</button>
      </>}>
      <Input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre"
        onFocus={(e) => { if (titre === "Nouveau texte") e.currentTarget.select(); }}
        style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }} aria-label="Titre du texte" />

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <Select value={style} onChange={(e) => setStyle(e.target.value as Style)} style={{ maxWidth: 230 }}
          aria-label="Type de reformulation">
          {STYLES.map((s) => <option key={s.id} value={s.id}>{s.libelle}</option>)}
        </Select>
        <button className="btn" onClick={proposer} disabled={enCours}>
          {enCours ? "✨ Reformulation…" : "✨ Proposer"}
        </button>
        {avantRemplacement !== null && !proposition && (
          <button className="btn ghost" onClick={() => { setContenu(avantRemplacement); setAvantRemplacement(null); }}>
            ↶ Revenir au texte d’avant
          </button>
        )}
        <span style={{ fontSize: 11.5, color: "var(--text-2)", marginLeft: "auto" }}>
          {STYLES.find((s) => s.id === style)?.aide} · sur la sélection, sinon tout le texte
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: proposition ? "1fr 1fr" : "1fr", gap: 12 }}>
        <textarea ref={zone} className="input" value={contenu}
          onChange={(e) => { setContenu(e.target.value); if (avantRemplacement !== null) setAvantRemplacement(null); }}
          placeholder="Écrivez ici…" aria-label="Contenu du texte"
          style={{ minHeight: "52vh", resize: "vertical", fontSize: 15, lineHeight: 1.6, padding: 12, fontFamily: "inherit" }} />
        {proposition && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
              Proposition — {STYLES.find((s) => s.id === proposition.style)?.libelle.toLowerCase()}
              {proposition.portee === "selection" ? " (passage sélectionné)" : ""}
            </div>
            <textarea className="input" value={proposition.texte}
              onChange={(e) => setProposition({ ...proposition, texte: e.target.value })}
              aria-label="Proposition de l’IA, modifiable"
              style={{ flex: 1, minHeight: "44vh", resize: "vertical", fontSize: 15, lineHeight: 1.6, padding: 12,
                fontFamily: "inherit", background: "var(--panel-2)", borderColor: "var(--accent)" }} />
            {proposition.nomsAbsents.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                Absents de la proposition : {proposition.nomsAbsents.join(", ")}.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={() => appliquer("remplacer")}>Remplacer</button>
              <button className="btn" onClick={() => appliquer("inserer")}>Insérer à la suite</button>
              <button className="btn ghost" onClick={() => setProposition(null)}>Ignorer</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 8 }}>
        🔒 Les noms de vos élèves sont remplacés par des marqueurs avant l’envoi à l’IA, puis remis sur votre ordinateur.
      </div>
    </Modal>
  );
}
