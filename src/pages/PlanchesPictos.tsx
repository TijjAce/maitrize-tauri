import React from "react";
import { Field, Input } from "../components/ui";
import { useMemoire } from "../components/useMemoire";
import { CasePicto } from "../components/CasePicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { usePictoImages } from "../components/ChoixPicto";
import { Boutons, Coche } from "./AteliersLangage";
import { idsDes, pictoVide } from "../supportsVisuels";
import {
  EXEMPLAIRES_PLANCHE_MAX, PICTOS_PLANCHE_MAX, STYLE_PLANCHE, TAILLES_PLANCHE_MM, htmlPlanche, libelleTaille, nombreDeCartes,
  normaliserPlanche, pictosDeLaPlanche, type ReglagesPlanche,
} from "../planchesPictos";

// ── Planches de pictos ─────────────────────────────────────────────────────
//
// Un picto, ou la photo d'un objet, imprimé à toutes les tailles d'un coup :
// on découpe ensuite la carte qu'il faut pour le classeur de communication,
// l'emploi du temps ou la porte de la classe.

export function PlanchesPictosTab({ banque }: { banque: boolean }) {
  const [r, ecrire] = useMemoire<ReglagesPlanche>("planches", normaliserPlanche);
  const maj = (m: Partial<ReglagesPlanche>) => ecrire(normaliserPlanche({ ...r, ...m }));
  const images = usePictoImages(idsDes(r.pictos));
  const html = React.useMemo(() => htmlPlanche(r, images), [r, images]);
  const pictos = pictosDeLaPlanche(r);
  const n = nombreDeCartes(r);
  const titre = pictos.length === 1 && pictos[0].mot.trim() ? `${pictos[0].mot.trim()}, à toutes les tailles` : "Planches de pictos";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
      <div className="card">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-2)" }}>
          Un picto, ou la photo d'un objet, à toutes les tailles d'un coup : pour le classeur de communication, l'emploi du temps,
          la porte de la classe… La taille est le côté de la carte à découper.
        </p>
        <Field label={pictos.length > 1 ? `Les pictos (${pictos.length}), chacun sur sa planche` : "Le picto"}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {r.pictos.map((p, i) => (
              <div key={i} style={{ position: "relative" }}>
                <CasePicto valeur={p} banque={banque} titre={`Picto ${i + 1}`} taille={56}
                  onChange={(nouveau) => maj({ pictos: r.pictos.map((x, j) => (j === i ? nouveau : x)) })} />
                {r.pictos.length > 1 && (
                  <button className="btn ghost sm sv-retirer" aria-label={`Retirer le picto ${i + 1}`}
                    onClick={() => maj({ pictos: r.pictos.filter((_, j) => j !== i) })}>✕</button>
                )}
              </div>
            ))}
            {r.pictos.length < PICTOS_PLANCHE_MAX && (
              <button className="btn sm" onClick={() => maj({ pictos: [...r.pictos, pictoVide()] })}>＋ Un picto</button>
            )}
          </div>
        </Field>
        <Field label="Les tailles : le côté de la carte">
          <div className="gb-sons">
            {TAILLES_PLANCHE_MM.map((mm) => {
              const on = r.tailles.includes(mm);
              return (
                <button key={mm} type="button" className={`gb-son${on ? " on" : ""}`} aria-pressed={on}
                  onClick={() => maj({ tailles: on ? r.tailles.filter((t) => t !== mm) : [...r.tailles, mm] })}>{libelleTaille(mm)}</button>
              );
            })}
            {r.tailles.length < TAILLES_PLANCHE_MM.length && (
              <button type="button" className="btn ghost sm" onClick={() => maj({ tailles: [...TAILLES_PLANCHE_MM] })}>Toutes</button>
            )}
          </div>
        </Field>
        <Field label="De chaque taille">
          <Input type="number" min={1} max={EXEMPLAIRES_PLANCHE_MAX} value={r.exemplaires} style={{ width: 80 }}
            onChange={(e) => maj({ exemplaires: Number(e.target.value) || 1 })} />
        </Field>
        <Coche on={r.mot} libelle="Écrire le mot sous le picto" onChange={(mot) => maj({ mot })} />
        <Coche on={r.capitales} libelle="Le mot en capitales" onChange={(capitales) => maj({ capitales })} />
        <Coche on={r.cadre} libelle="Un cadre arrondi, plutôt que des pointillés" onChange={(cadre) => maj({ cadre })} />
        <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
          {n ? `${n} carte${n > 1 ? "s" : ""}, de ${libelleTaille(r.tailles[0])} à ${libelleTaille(r.tailles[r.tailles.length - 1])}.`
            : !pictos.length ? "Choisissez un picto." : "Cochez au moins une taille."}
        </div>
        <Boutons atelier="planchesPictos" titre={titre} html={html} style={STYLE_PLANCHE} peut={n > 0} />
      </div>
      <ApercuFeuille html={html} style={STYLE_PLANCHE} />
    </div>
  );
}
