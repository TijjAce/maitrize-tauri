// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Modal, Empty } from "./ui";
import { toast } from "./Toaster";
import { etapesDuReport, reportVide, texteDeLaLigne, texteDuBloc, texteDuReport, type LigneACocher } from "../reporterLpi";

// Reporter un plan dans le LPI : à garder ouvert à côté du navigateur. Les étapes sont celles du LPI,
// chaque texte se copie, et un bouton reste marqué une fois copié, pour savoir où l'on en est.

function BoutonCopier({ texte, cle, copies, onCopie, libelle = "Copier" }: {
  texte: string; cle: string; copies: Set<string>; onCopie: (cle: string) => void; libelle?: string;
}) {
  const fait = copies.has(cle);
  const copier = () => {
    navigator.clipboard.writeText(texte)
      .then(() => onCopie(cle))
      .catch(() => toast("Copie impossible : sélectionnez le texte à la main.", { icone: "⚠️" }));
  };
  return (
    <button type="button" className="btn ghost sm" style={{ flexShrink: 0, ...(fait ? { color: "var(--accent)" } : {}) }} onClick={copier}>
      {fait ? "✓ Copié" : libelle}
    </button>
  );
}

const styleLigne: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0", fontSize: 12.5 };

function Case({ ligne, cle, copies, onCopie }: { ligne: LigneACocher; cle: string; copies: Set<string>; onCopie: (cle: string) => void }) {
  return (
    <div style={styleLigne}>
      <b style={{ minWidth: 18, textAlign: "right", color: "var(--text-2)" }}>{ligne.rang ?? "•"}</b>
      <div style={{ flex: 1, minWidth: 0 }}>
        {ligne.autre ? <i>Autre : {ligne.texte}</i> : ligne.texte}
        {ligne.precision && <div style={{ fontSize: 12, color: "var(--text-2)" }}>Préciser : {ligne.precision}</div>}
      </div>
      {ligne.precision && <BoutonCopier texte={ligne.precision} cle={`${cle}|p`} copies={copies} onCopie={onCopie} />}
      {ligne.autre && <BoutonCopier texte={ligne.texte} cle={cle} copies={copies} onCopie={onCopie} />}
    </div>
  );
}

export function ReportLpi({ dispoId, nom, valeurs, onClose }: {
  dispoId: string; nom: string; valeurs: Record<string, unknown>; onClose: () => void;
}) {
  const etapes = React.useMemo(() => etapesDuReport(dispoId, valeurs), [dispoId, valeurs]);
  const [copies, setCopies] = React.useState<Set<string>>(() => new Set());
  const noter = (cle: string) => setCopies((s) => new Set(s).add(cle));

  const pied = (
    <>
      <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>
        Dans le LPI, finaliser rend le document visible par la famille et bloque sa modification.
      </span>
      {!reportVide(etapes) && (
        <BoutonCopier texte={texteDuReport(`${nom} : à reporter dans le LPI`, etapes)} cle="tout" copies={copies} onCopie={noter} libelle="Tout copier" />
      )}
    </>
  );

  return (
    <Modal titre={`Reporter le ${nom} dans le LPI`} onClose={onClose} large footer={pied}>
      {reportVide(etapes) ? (
        <Empty icone="📋" titre="Rien à reporter" sous="Ce plan est encore vide." />
      ) : etapes.map((e, i) => (
        <section key={e.titre} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 4px" }}>{i + 1}. {e.titre}</h3>
          {e.aSaisir && <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 6 }}>À saisir dans le LPI : {e.aSaisir.charAt(0).toLowerCase() + e.aSaisir.slice(1)}.</div>}
          {e.alerte && <div style={{ fontSize: 12, color: "var(--danger, var(--accent))", marginBottom: 6 }}>{e.alerte}</div>}
          {e.blocs.map((b) => (
            <div key={b.titre} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <b style={{ fontSize: 13, flex: 1 }}>{b.titre} à cocher</b>
                <BoutonCopier texte={texteDuBloc(b)} cle={`${e.titre}|${b.titre}`} copies={copies} onCopie={noter} libelle="Copier la liste" />
              </div>
              {b.alerte && <div style={{ fontSize: 12, color: "var(--danger, var(--accent))", marginBottom: 4 }}>{b.alerte}</div>}
              {b.groupes.map((g) => (
                <div key={g.chemin} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2)" }}>{g.chemin}</div>
                  {g.lignes.map((l, n) => (
                    <Case key={`${n}|${l.texte}`} ligne={l} cle={`${e.titre}|${b.titre}|${g.chemin}|${texteDeLaLigne(l)}`} copies={copies} onCopie={noter} />
                  ))}
                </div>
              ))}
            </div>
          ))}
          {e.textes.map((t) => (
            <div key={`${t.libelle}|${t.texte}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 8px", marginBottom: 4, background: "var(--panel-2)", borderRadius: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-2)" }}>{t.libelle}</div>
                <div style={{ fontSize: 12.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{t.texte}</div>
              </div>
              <BoutonCopier texte={t.texte} cle={`${e.titre}|${t.libelle}`} copies={copies} onCopie={noter} />
            </div>
          ))}
          {!e.blocs.length && !e.textes.length && !e.aSaisir && (
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Rien dans ce plan pour cette étape.</div>
          )}
        </section>
      ))}
    </Modal>
  );
}
