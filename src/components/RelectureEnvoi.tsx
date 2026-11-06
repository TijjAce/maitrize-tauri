// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Modal } from "./ui";
import { EVT_RELIRE, hoteDeRelecture, type DemandeDeRelecture } from "../relectureEnvoi";

// La fenêtre « Ce qui part chez Mistral » (voir relectureEnvoi.ts) : le texte
// exact, ses marqueurs en évidence pour voir d'un coup d'œil ce qui a été
// masqué, la consigne de Maitrize repliée. Envoyer, ou annuler.

const MARQUEUR = /(\[(?:P\d+|(?:Lieu|Date|Contact|Numéro|Santé) \d+[^\]]*)\])/u;

/** Un texte, ses marqueurs surlignés. */
function AvecMarqueurs({ texte }: { texte: string }) {
  return <>{texte.split(MARQUEUR).map((m, i) => (i % 2
    ? <mark key={i} style={{ background: "var(--accent-soft)", color: "inherit", borderRadius: 4, padding: "0 2px" }}>{m}</mark>
    : <React.Fragment key={i}>{m}</React.Fragment>))}</>;
}

const boite: React.CSSProperties = {
  whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto", fontSize: 13, lineHeight: 1.5,
  border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", margin: "4px 0 10px",
};

/** Hôte unique, monté une fois dans l'application, comme celui des confirmations. */
export function RelectureEnvoiHost() {
  const [demande, setDemande] = React.useState<DemandeDeRelecture | null>(null);
  const courante = React.useRef<DemandeDeRelecture | null>(null);
  React.useEffect(() => {
    hoteDeRelecture(true);
    const h = (e: Event) => {
      // Une nouvelle demande pendant qu'une autre est ouverte : la première est annulée.
      courante.current?.resoudre(false);
      courante.current = (e as CustomEvent<DemandeDeRelecture>).detail;
      setDemande(courante.current);
    };
    window.addEventListener(EVT_RELIRE, h);
    return () => { hoteDeRelecture(false); window.removeEventListener(EVT_RELIRE, h); };
  }, []);
  if (!demande) return null;
  const finir = (envoyer: boolean) => { demande.resoudre(envoyer); courante.current = null; setDemande(null); };
  const { messages, image } = demande.envoi;
  const consignes = messages.filter((m) => m.role === "system");
  const echanges = messages.filter((m) => m.role !== "system");
  const masques = new Set(messages.flatMap((m) => m.content.match(new RegExp(MARQUEUR.source, "gu")) ?? [])).size;
  return (
    <Modal titre="Ce qui part chez Mistral" large onClose={() => finir(false)}
      footer={<>
        <button className="btn" onClick={() => finir(false)}>Annuler</button>
        <button className="btn primary" onClick={() => finir(true)}>Envoyer</button>
      </>}>
      <p className="meta" style={{ marginTop: 0 }}>
        {masques ? `${masques} passage${masques > 1 ? "s" : ""} masqué${masques > 1 ? "s" : ""}, surligné${masques > 1 ? "s" : ""} : ils reviendront à leur place dans la réponse.` : "Aucun passage masqué."}
        {image && " Une image part aussi : ce qui est écrit dessus n'est pas masqué."}
      </p>
      {echanges.map((m, i) => (
        <div key={i}>
          <div className="meta">{m.role === "assistant" ? "Une réponse précédente" : "La demande"}</div>
          <div style={boite}><AvecMarqueurs texte={m.content} /></div>
        </div>
      ))}
      {consignes.length > 0 && (
        <details>
          <summary className="meta" style={{ cursor: "pointer" }}>La consigne de Maitrize</summary>
          {consignes.map((m, i) => <div key={i} style={boite}><AvecMarqueurs texte={m.content} /></div>)}
        </details>
      )}
    </Modal>
  );
}
