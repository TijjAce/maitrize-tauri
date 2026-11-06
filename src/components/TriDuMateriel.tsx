// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { api } from "../api";
import { CLE_INVENTAIRE, EVT_INVENTAIRE, MATERIEL_REEL, ecrireInventaire, lireInventaire, type Inventaire, type MaterielReel } from "../materielDeClasse";
import { SEUIL_DU_GESTE, cartesATrier, dansLaClasse, decider, nomDeLaFamille, reprendre, sensDuGeste } from "../triDuMateriel";
import { PictoDuMateriel } from "./PictoDuMateriel";

// Le matériel de la classe, carte par carte : on la pousse à droite ou à gauche (à la souris, au doigt, à deux doigts
// sur le pavé tactile), ou l'on touche ✓ et ✕, ou les flèches du clavier. Chaque décision s'enregistre aussitôt.

interface Partante { cle: number; m: MaterielReel; sens: 1 | -1; dx: number; dy: number }

function Carte({ m, oui, non }: { m: MaterielReel; oui?: number; non?: number }) {
  return (
    <>
      <div className="tri-image">
        <PictoDuMateriel m={m} />
        <span className="tri-tampon oui" style={{ opacity: oui ?? 0 }}>Je l'ai</span>
        <span className="tri-tampon non" style={{ opacity: non ?? 0 }}>Je ne l'ai pas</span>
      </div>
      <div className="tri-texte">
        <div className="tri-famille">{nomDeLaFamille(m.famille)}</div>
        <div className="tri-nom">{m.nom}</div>
        <div className="tri-usage">{m.usage}</div>
      </div>
    </>
  );
}

export function TriDuMateriel({ onSuite }: { onSuite: () => void }) {
  // L'inventaire se tient ici, et la pile se fixe à l'ouverture : les cartes ne bougent pas sous la main.
  const inventaire = React.useRef<Inventaire>({});
  const [cartes, setCartes] = React.useState<MaterielReel[] | null>(null);
  const [rang, setRang] = React.useState(0);
  const [possede, setPossede] = React.useState(0);
  const [glisse, setGlisse] = React.useState<{ dx: number; dy: number } | null>(null);
  const [partantes, setPartantes] = React.useState<Partante[]>([]);
  const compteur = React.useRef(0);

  React.useEffect(() => {
    let vivant = true;
    api.settingGet(CLE_INVENTAIRE).catch(() => null).then((v) => {
      if (!vivant) return;
      inventaire.current = lireInventaire(v);
      setPossede(dansLaClasse(inventaire.current));
      setCartes(cartesATrier(inventaire.current));
    });
    return () => { vivant = false; };
  }, []);

  const enregistrer = (inv: Inventaire) => {
    inventaire.current = inv;
    setPossede(dansLaClasse(inv));
    api.settingSet(CLE_INVENTAIRE, ecrireInventaire(inv)).then(() => window.dispatchEvent(new Event(EVT_INVENTAIRE))).catch(() => {});
  };

  const haut = cartes?.[rang];
  /** La carte du dessus est décidée : elle part d'où elle est, la suivante monte. */
  const choisir = (a: boolean, depuis?: { dx: number; dy: number }) => {
    if (!haut) return;
    enregistrer(decider(inventaire.current, haut.id, a));
    const cle = ++compteur.current;
    setPartantes((l) => [...l, { cle, m: haut, sens: a ? 1 : -1, dx: depuis?.dx ?? 0, dy: depuis?.dy ?? 0 }]);
    window.setTimeout(() => setPartantes((l) => l.filter((x) => x.cle !== cle)), 340);
    setGlisse(null);
    setRang((r) => r + 1);
  };
  const revenir = () => {
    const avant = cartes?.[rang - 1];
    if (!avant) return;
    enregistrer(reprendre(inventaire.current, avant.id));
    setRang(rang - 1);
    setGlisse(null);
  };

  // Le geste, à la souris ou au doigt.
  const depart = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const appui = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    depart.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    setGlisse({ dx: 0, dy: 0 });
  };
  const bouge = (e: React.PointerEvent) => {
    if (depart.current) setGlisse({ dx: e.clientX - depart.current.x, dy: e.clientY - depart.current.y });
  };
  const lache = (e: React.PointerEvent) => {
    const d = depart.current;
    depart.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    const sens = sensDuGeste(dx, Math.abs(dx) / Math.max(1, performance.now() - d.t));
    if (sens) choisir(sens === "oui", { dx, dy });
    else setGlisse(null);
  };

  // À deux doigts sur le pavé tactile : la carte suit, et l'élan qui continue après le geste ne décide pas la suivante.
  const molette = React.useRef({ dx: 0, minuteur: 0, verrou: false });
  const glisseDeDeuxDoigts = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const m = molette.current;
    window.clearTimeout(m.minuteur);
    m.minuteur = window.setTimeout(() => {
      const dx = m.dx;
      m.dx = 0;
      if (m.verrou) { m.verrou = false; return; }
      if (Math.abs(dx) > SEUIL_DU_GESTE) choisir(dx > 0, { dx, dy: 0 });
      else setGlisse(null);
    }, 140);
    if (m.verrou) return;
    m.dx -= e.deltaX;
    if (Math.abs(m.dx) > SEUIL_DU_GESTE * 1.5) {
      m.verrou = true;
      choisir(m.dx > 0, { dx: m.dx, dy: 0 });
      return;
    }
    setGlisse({ dx: m.dx, dy: 0 });
  };

  // Les flèches du clavier.
  const choisirRef = React.useRef(choisir);
  choisirRef.current = choisir;
  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      choisirRef.current(e.key === "ArrowRight");
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);

  if (!cartes) return <div className="tri-pile" />;
  const part = glisse ? Math.min(1, Math.abs(glisse.dx) / SEUIL_DU_GESTE) : 0;
  return (
    <>
      <h2>Le matériel de votre classe</h2>
      <p>À droite, vous l'avez. À gauche, vous ne l'avez pas. Les séances vous diront ensuite quoi sortir, et quoi vous procurer.</p>
      {haut ? (
        <>
          <div className="tri-pile" onWheel={glisseDeDeuxDoigts}>
            {/* Les cartes du dessous d'abord : celle du dessus se pose sur elles. */}
            {cartes.slice(rang + 1, rang + 3).reverse().map((m) => {
              const i = cartes.indexOf(m) - rang;
              return (
                <div key={m.id} className="tri-carte dessous" aria-hidden="true" style={{ transform: `translateY(${i * 10 - part * 6}px) scale(${1 - i * 0.04 + part * 0.03})` }}>
                  <Carte m={m} />
                </div>
              );
            })}
            <div key={haut.id} className={`tri-carte dessus${glisse ? " tenue" : ""}`} role="group" aria-label={haut.nom}
              onPointerDown={appui} onPointerMove={bouge} onPointerUp={lache} onPointerCancel={() => { depart.current = null; setGlisse(null); }}
              style={glisse ? { transform: `translate(${glisse.dx}px, ${glisse.dy * 0.35}px) rotate(${glisse.dx / 18}deg)` } : undefined}>
              <Carte m={haut} oui={glisse && glisse.dx > 0 ? part : 0} non={glisse && glisse.dx < 0 ? part : 0} />
            </div>
            {partantes.map((p) => (
              <div key={p.cle} className="tri-carte partante" aria-hidden="true"
                style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy * 0.35}px`, "--r": `${p.dx / 18}deg`, "--sens": p.sens } as React.CSSProperties}>
                <Carte m={p.m} oui={p.sens > 0 ? 1 : 0} non={p.sens < 0 ? 1 : 0} />
              </div>
            ))}
          </div>
          <div className="tri-choix">
            <button className="tri-rond non" aria-label="Je ne l'ai pas" title="Je ne l'ai pas (flèche gauche)" onClick={() => choisir(false)}>✕</button>
            <button className="tri-rond petit" aria-label="Revenir à la carte d'avant" title="Revenir à la carte d'avant" disabled={rang === 0} onClick={revenir}>↩</button>
            <button className="tri-rond oui" aria-label="Je l'ai" title="Je l'ai (flèche droite)" onClick={() => choisir(true)}>✓</button>
          </div>
          <div className="tri-bas">
            <div className="tri-avancement" aria-label={`Carte ${rang + 1} sur ${cartes.length}`}>
              <span>{rang + 1} / {cartes.length}</span>
              <div className="premier-lancement-jauge" aria-hidden="true"><div style={{ width: `${(rang / cartes.length) * 100}%` }} /></div>
            </div>
            <button className="btn ghost" onClick={onSuite}>Je finirai plus tard</button>
          </div>
        </>
      ) : (
        <div className="tri-fin">
          <div className="tri-fin-nombre">{possede}<span> / {MATERIEL_REEL.length}</span></div>
          <p>{possede > 1 ? "matériels sont" : "matériel est"} dans votre classe.</p>
          <div className="premier-lancement-boutons" style={{ justifyContent: "center" }}>
            {cartes.length > 0 && <button className="btn" onClick={revenir}>↩ Revenir</button>}
            <button className="btn primary" autoFocus onClick={onSuite}>Continuer</button>
          </div>
        </div>
      )}
    </>
  );
}
