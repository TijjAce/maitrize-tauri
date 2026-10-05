import React from "react";
import { api, COULEURS, MATIERES, couleurHex, couleurPourMatiere, getMatiereOverrides, matiereDuDomaine } from "../api";
import { Field, Input, Modal, Select } from "./ui";
import { useReglages } from "./useMemoire";
import { printHTML } from "../print";
import {
  FORMATS_DOS, REGLAGES_DOS, STYLE_DOS, htmlEtiquettesDos, mesures, nomAuDos, reglagesSurs,
  type EtiquetteDos, type ReglagesDos,
} from "../etiquettesDos";

// ── Pages de garde › Étiquettes de dos de classeur ────────────────────────
//
// Une étiquette par matière, domaine ou intitulé coché, à la couleur choisie
// dans les réglages ; d'autres en plus, à la couleur qu'on veut. On voit la
// planche telle qu'elle s'imprimera.

/** Ce qui se range dans l'emploi du temps sans avoir de classeur. */
const SANS_CLASSEUR = new Set(["Accueil", "Rituel", "Récréation", "Pause méridienne", "APC", "Temps calme", "Autre"]);

const hex = (m: string) => couleurHex[couleurPourMatiere(m)] ?? "#6b7280";

export function EtiquettesDos({ annee, onClose }: { annee: string; onClose: () => void }) {
  const [brut, maj] = useReglages<ReglagesDos>("etiquettesDos", REGLAGES_DOS);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  // La première fois : la classe et l'année, d'après les réglages.
  const premiere = React.useRef(!brut.haut);
  React.useEffect(() => {
    if (!premiere.current) return;
    premiere.current = false;
    api.settingsAll().then((s) => maj({ haut: [s.niveauClasse, annee].filter(Boolean).join(" · ") })).catch(() => maj({ haut: annee }));
  }, [annee, maj]);
  // Les domaines des référentiels actifs, et les intitulés de l'emploi du temps qui ont leur couleur.
  const [domaines, setDomaines] = React.useState<string[]>([]);
  React.useEffect(() => {
    let vivant = true;
    api.referentielsList().then((refs) => {
      const titres = refs.filter((x) => x.actif).flatMap((x) => {
        try { return ((JSON.parse(x.donnees)?.domaines ?? []) as { titre?: string }[]).map((d) => d.titre ?? ""); } catch { return []; }
      });
      if (vivant) setDomaines([...new Set(titres.filter((t) => t.trim() && !MATIERES.includes(t)))]);
    }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  const intitules = React.useMemo(() => Object.keys(getMatiereOverrides()).filter((m) => !MATIERES.includes(m) && !matiereDuDomaine(m))
    .sort((a, b) => a.localeCompare(b, "fr")), []);
  const groupes = [
    { titre: "Les matières", liste: MATIERES.filter((m) => !SANS_CLASSEUR.has(m)) },
    { titre: "Les domaines de vos référentiels", liste: domaines },
    { titre: "Les intitulés de votre emploi du temps", liste: intitules },
  ].filter((g) => g.liste.length);

  const etiquettes: EtiquetteDos[] = [...r.choisies.map((m) => ({ texte: nomAuDos(m), couleur: hex(m) })), ...r.autres];
  const html = htmlEtiquettesDos(etiquettes, r);
  const basculer = (m: string, on: boolean) => maj({ choisies: on ? [...r.choisies.filter((x) => x !== m), m] : r.choisies.filter((x) => x !== m) });
  const { largeur, hauteur } = mesures(r);

  return (
    <Modal large titre="🏷 Étiquettes de dos de classeur" onClose={onClose}
      footer={<>
        <span className="meta" style={{ fontSize: 12.5 }}>{etiquettes.length} étiquette{etiquettes.length > 1 ? "s" : ""} de {largeur} × {hauteur} mm</span>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Fermer</button>
        <button className="btn primary" disabled={!etiquettes.length} onClick={() => printHTML("Étiquettes de dos", html, STYLE_DOS)}>🖨 Imprimer</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 14, alignItems: "start" }}>
        <div>
          <Field label="Le classeur">
            <Select value={r.format} onChange={(e) => maj({ format: e.target.value })}>
              {FORMATS_DOS.map((f) => <option key={f.id} value={f.id}>{f.nom}{f.id !== "mesure" ? ` — ${f.largeur} × ${f.hauteur} mm` : ""}</option>)}
            </Select>
          </Field>
          {r.format === "mesure" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Largeur (mm)">
                <Input type="number" value={r.largeur} min={15} max={90} onChange={(e) => maj({ largeur: Number(e.target.value) })} />
              </Field>
              <Field label="Hauteur (mm)">
                <Input type="number" value={r.hauteur} min={60} max={255} onChange={(e) => maj({ hauteur: Number(e.target.value) })} />
              </Field>
            </div>
          )}
          <Field label="En haut de chaque étiquette">
            <Input value={r.haut} placeholder="CE1 · 2026-2027" onChange={(e) => maj({ haut: e.target.value })} />
          </Field>
          {groupes.map((g) => (
            <Field key={g.titre} label={g.titre}>
              <div className="dos-choix">
                {g.liste.map((m) => (
                  <label key={m} className="pb-coche" style={{ alignItems: "center" }}>
                    <input type="checkbox" checked={r.choisies.includes(m)} onChange={(e) => basculer(m, e.target.checked)} />
                    <span className="dos-pastille" style={{ background: hex(m) }} />
                    <span>{nomAuDos(m)}</span>
                  </label>
                ))}
              </div>
            </Field>
          ))}
          <Field label="D'autres classeurs">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {r.autres.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <Input value={e.texte} placeholder="Évaluations" style={{ flex: "1 1 140px" }}
                    onChange={(x) => maj({ autres: r.autres.map((a, k) => (k === i ? { ...a, texte: x.target.value } : a)) })} />
                  <span style={{ display: "flex", gap: 3 }}>
                    {COULEURS.map((c) => (
                      <button key={c} type="button" title={c} onClick={() => maj({ autres: r.autres.map((a, k) => (k === i ? { ...a, couleur: couleurHex[c] } : a)) })}
                        className="dos-pastille" style={{ background: couleurHex[c], cursor: "pointer", outline: e.couleur === couleurHex[c] ? "2px solid var(--text)" : "none" }} />
                    ))}
                  </span>
                  <button type="button" className="btn ghost sm" aria-label={`Retirer ${e.texte || "l'étiquette"}`} onClick={() => maj({ autres: r.autres.filter((_, k) => k !== i) })}>✕</button>
                </div>
              ))}
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }}
                onClick={() => maj({ autres: [...r.autres, { texte: "", couleur: couleurHex.gray }] })}>＋ Une étiquette</button>
            </div>
          </Field>
          <p className="meta" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Les couleurs sont celles de Réglages › Couleurs des matières : un domaine prend celle de sa matière, sauf si vous lui en avez choisi une.
          </p>
        </div>
        <div className="pb-apercu-page apercu-feuille" style={{ maxHeight: "70vh" }}>
          <style>{STYLE_DOS}</style>
          {etiquettes.length
            // Les étiquettes sont à leur taille réelle : l'aperçu les réduit de moitié pour les voir toutes.
            ? <div style={{ zoom: 0.5 }} dangerouslySetInnerHTML={{ __html: html }} />
            : <div className="meta" style={{ fontSize: 13 }}>Cochez les matières dont vous voulez l'étiquette.</div>}
        </div>
      </div>
    </Modal>
  );
}
