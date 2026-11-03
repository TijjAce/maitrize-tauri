import React from "react";
import { STYLE_FEUILLE } from "../cartesImprimables";
import type { Images } from "../supportsVisuels";
import {
  AFFICHE, BLEU, PLACE_MIN, ROUGE, STYLE_AFFICHAGE, STYLE_VISIBILEO, courbeVers, elementsDeLAffiche, htmlDeLElement, placeSure, placesDeLAffiche,
  traitDeFleche, type Affichage, type CouleurFleche, type Fleche, type Place, type Point, type ReglagesVisibileo,
} from "../visibileo";

// ── L'affiche du Visibiléo, à l'écran ─────────────────────────────────────
//
// « Il faut également pouvoir avoir une visualisation de l'affichage, avec des
// flèches qui peuvent être courbes » (l'enseignant, 3 novembre 2026). On glisse
// une pièce pour la poser, on tire son coin pour l'agrandir ; « Flèche rouge »
// ou « Flèche bleue », puis une pièce et une autre, relient la première à la
// seconde ; une flèche choisie se plie par sa poignée, s'inverse, se redresse
// ou se retire. L'affiche se montre en plein écran, pour le TNI : on y fait la
// même chose, au doigt. Ce qui se voit est ce qui s'imprime, en A3.

/** L'affiche à l'échelle 1, en pixels d'écran. */
const PX_PAR_MM = 96 / 25.4;
const LARGEUR_PX = AFFICHE.largeur * PX_PAR_MM;
const HAUTEUR_PX = AFFICHE.hauteur * PX_PAR_MM;

/** Ce que seul l'écran montre : la pièce choisie, celle d'où part une flèche, les poignées. */
const STYLE_EDITION = `
  .vb-editeur .vb-pose { cursor: grab; touch-action: none; }
  .vb-editeur .vb-pose.vb-choisie { box-shadow: 0 0 0 0.8mm #1c7ed6; border-radius: 2mm; }
  .vb-editeur .vb-pose.vb-depart { box-shadow: 0 0 0 0.8mm #f08c00; border-radius: 2mm; }
  .vb-editeur .vb-coin { position: absolute; width: 5mm; height: 5mm; border-radius: 50%; background: #fff; border: 0.6mm solid #1c7ed6;
    cursor: nwse-resize; touch-action: none; transform: translate(-50%, -50%); }
  .vb-editeur .vb-plein { position: fixed; inset: 0; z-index: 9000; background: var(--bg, #fff); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
`;

type Choix = { quoi: "piece"; id: string } | { quoi: "fleche"; i: number } | null;
/** Le geste en cours : poser une pièce, l'agrandir, ou plier une flèche. */
type Geste =
  | { quoi: "poser"; id: string; depart: Point; place: Place; bouge: boolean }
  | { quoi: "agrandir"; id: string; depart: Point; place: Place }
  | { quoi: "plier"; i: number };

export function EditeurAffichage({ r, images, onChange, onImprimer }: {
  r: ReglagesVisibileo;
  images: Images;
  onChange: (a: Affichage) => void;
  onImprimer: () => void;
}) {
  const cadre = React.useRef<HTMLDivElement>(null);
  const plateau = React.useRef<HTMLDivElement>(null);
  const [taille, setTaille] = React.useState({ l: 800, h: 560 });
  const [plein, setPlein] = React.useState(false);
  const [choix, setChoix] = React.useState<Choix>(null);
  const [outil, setOutil] = React.useState<CouleurFleche | null>(null);
  const [depart, setDepart] = React.useState<string | null>(null);
  // Pendant un geste, les places et les flèches bougent ici ; elles ne s'enregistrent qu'à la fin.
  const [enCours, setEnCours] = React.useState<Affichage | null>(null);
  const geste = React.useRef<Geste | null>(null);

  const affichage = enCours ?? r.affichage;
  const vu = { ...r, affichage };
  const places = placesDeLAffiche(vu);
  const elements = elementsDeLAffiche(vu);

  React.useEffect(() => {
    const el = cadre.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const o = new ResizeObserver(() => setTaille({ l: el.clientWidth, h: el.clientHeight }));
    o.observe(el);
    return () => o.disconnect();
  }, [plein]);
  // L'affiche tient dans la largeur ; en plein écran, dans la largeur et la hauteur.
  const k = plein ? Math.min(taille.l / LARGEUR_PX, taille.h / HAUTEUR_PX) : taille.l / LARGEUR_PX;

  /** Le point du pointeur, en millimètres sur l'affiche. */
  const enMm = (e: React.PointerEvent | PointerEvent): Point => {
    const b = plateau.current!.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / b.width) * AFFICHE.largeur, y: ((e.clientY - b.top) / b.height) * AFFICHE.hauteur };
  };
  const avecPlace = (a: Affichage, id: string, place: Place): Affichage => ({ ...a, places: { ...a.places, [id]: placeSure(place) ?? place } });
  const ajouterFleche = (de: string, vers: string, couleur: CouleurFleche) => {
    const f: Fleche = { de, vers, couleur, courbe: 0 };
    onChange({ ...r.affichage, fleches: [...r.affichage.fleches, f] });
    setChoix({ quoi: "fleche", i: r.affichage.fleches.length });
  };

  const surPiece = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (outil) {
      if (!depart) { setDepart(id); return; }
      if (depart !== id) ajouterFleche(depart, id, outil);
      setDepart(null);
      return;
    }
    setChoix({ quoi: "piece", id });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    geste.current = { quoi: "poser", id, depart: enMm(e), place: places[id], bouge: false };
  };
  const surCoin = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    geste.current = { quoi: "agrandir", id, depart: enMm(e), place: places[id] };
  };
  const surPoignee = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    geste.current = { quoi: "plier", i };
  };
  const bouger = (e: React.PointerEvent) => {
    const g = geste.current;
    if (!g) return;
    const p = enMm(e);
    if (g.quoi === "poser") {
      const dx = p.x - g.depart.x, dy = p.y - g.depart.y;
      if (!g.bouge && Math.hypot(dx, dy) < 1) return;
      g.bouge = true;
      setEnCours(avecPlace(r.affichage, g.id, { ...g.place, x: g.place.x + dx, y: g.place.y + dy }));
    } else if (g.quoi === "agrandir") {
      const largeur = Math.max(PLACE_MIN.largeur, g.place.largeur + p.x - g.depart.x);
      const hauteur = Math.max(PLACE_MIN.hauteur, g.place.hauteur + p.y - g.depart.y);
      setEnCours(avecPlace(r.affichage, g.id, { ...g.place, largeur, hauteur }));
    } else {
      const f = r.affichage.fleches[g.i];
      if (!f || !places[f.de] || !places[f.vers]) return;
      const courbe = courbeVers(places[f.de], places[f.vers], p);
      setEnCours({ ...r.affichage, fleches: r.affichage.fleches.map((x, k2) => (k2 === g.i ? { ...x, courbe } : x)) });
    }
  };
  const lacher = () => {
    const g = geste.current;
    geste.current = null;
    if (enCours && (g?.quoi !== "poser" || g.bouge)) onChange(enCours);
    setEnCours(null);
  };

  const flecheChoisie = choix?.quoi === "fleche" ? r.affichage.fleches[choix.i] : undefined;
  const changerFleche = (maj: Partial<Fleche> | null) => {
    if (choix?.quoi !== "fleche") return;
    onChange({
      ...r.affichage,
      fleches: maj === null ? r.affichage.fleches.filter((_, i) => i !== choix.i) : r.affichage.fleches.map((f, i) => (i === choix.i ? { ...f, ...maj } : f)),
    });
    if (maj === null) setChoix(null);
  };

  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
      if (e.key === "Escape") { setOutil(null); setDepart(null); setChoix(null); if (plein) setPlein(false); }
      if ((e.key === "Delete" || e.key === "Backspace") && choix?.quoi === "fleche") { e.preventDefault(); changerFleche(null); }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  const outilBouton = (c: CouleurFleche, libelle: string, titre: string) => (
    <button type="button" className={`btn sm${outil === c ? " primary" : ""}`} title={titre} aria-pressed={outil === c}
      onClick={() => { setOutil(outil === c ? null : c); setDepart(null); setChoix(null); }}>
      <span style={{ color: outil === c ? undefined : c === "rouge" ? ROUGE : BLEU, fontWeight: 800 }}>➜</span> {libelle}
    </button>
  );

  const choisie = choix?.quoi === "piece" ? places[choix.id] : undefined;
  return (
    <div className="vb-editeur">
      <style>{STYLE_FEUILLE + STYLE_VISIBILEO + STYLE_AFFICHAGE + STYLE_EDITION}</style>
      <div className={plein ? "vb-plein" : undefined}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          {outilBouton("rouge", `Flèche rouge — ${r.libelles.rouge}`, "Puis cliquez la pièce de départ, et celle où va la flèche")}
          {outilBouton("bleue", `Flèche bleue — ${r.libelles.bleue}`, "Puis cliquez la pièce de départ, et celle où va la flèche")}
          {flecheChoisie && <>
            <button type="button" className="btn sm" onClick={() => changerFleche({ de: flecheChoisie.vers, vers: flecheChoisie.de })}>⇄ Inverser</button>
            <button type="button" className="btn sm" disabled={!flecheChoisie.courbe} onClick={() => changerFleche({ courbe: 0 })}>⟶ Redresser</button>
            <button type="button" className="btn sm" onClick={() => changerFleche({ couleur: flecheChoisie.couleur === "rouge" ? "bleue" : "rouge" })}>
              {flecheChoisie.couleur === "rouge" ? "En bleu" : "En rouge"}</button>
            <button type="button" className="btn sm" onClick={() => changerFleche(null)}>✕ Retirer</button>
          </>}
          {outil && <span className="meta">{depart ? "… puis la pièce où va la flèche" : "Cliquez la pièce de départ"}</span>}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn sm" disabled={!Object.keys(r.affichage.places).length}
            onClick={() => onChange({ ...r.affichage, places: {} })} title="Chaque pièce reprend sa place rangée">↺ Ranger</button>
          <button type="button" className="btn sm" onClick={() => setPlein(!plein)}>{plein ? "✕ Quitter le plein écran" : "⛶ Plein écran"}</button>
          <button type="button" className="btn sm" onClick={onImprimer}>🖨 Imprimer l'affiche</button>
        </div>
        <div ref={cadre} style={{ position: "relative", width: "100%", height: plein ? "100%" : HAUTEUR_PX * k, flex: plein ? 1 : undefined, overflow: "hidden" }}
          onPointerMove={bouger} onPointerUp={lacher} onPointerCancel={lacher}
          onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("vb-affiche")) { setChoix(null); setDepart(null); } }}>
          <div className="feuille vb vb-affichage" style={{ position: "absolute", left: 0, top: 0, transform: `scale(${k})`, transformOrigin: "0 0",
            boxShadow: "0 1px 6px rgba(0,0,0,.18)" }}>
            <div ref={plateau} className="vb-affiche" style={{ width: `${AFFICHE.largeur}mm`, height: `${AFFICHE.hauteur}mm`, background: "#fff" }}>
              {elements.map((e) => (
                <div key={e.id} className={`vb-pose${choix?.quoi === "piece" && choix.id === e.id ? " vb-choisie" : ""}${depart === e.id ? " vb-depart" : ""}`}
                  style={{ left: `${places[e.id].x}mm`, top: `${places[e.id].y}mm`, width: `${places[e.id].largeur}mm`, height: `${places[e.id].hauteur}mm` }}
                  onPointerDown={surPiece(e.id)} dangerouslySetInnerHTML={{ __html: htmlDeLElement(vu, e, images) }} />
              ))}
              {choisie && choix?.quoi === "piece" && (
                <div className="vb-coin" style={{ left: `${choisie.x + choisie.largeur}mm`, top: `${choisie.y + choisie.hauteur}mm` }}
                  onPointerDown={surCoin(choix.id)} aria-label="Agrandir la pièce" />
              )}
              <svg className="vb-traits" viewBox={`0 0 ${AFFICHE.largeur} ${AFFICHE.hauteur}`} width={`${AFFICHE.largeur}mm`} height={`${AFFICHE.hauteur}mm`}>
                <defs>
                  {(["rouge", "bleue"] as CouleurFleche[]).map((c) => (
                    <marker key={c} id={`vb-pointe-${c}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                      <path d="M0 0 L10 5 L0 10 Z" fill={c === "rouge" ? ROUGE : BLEU} />
                    </marker>
                  ))}
                </defs>
                {affichage.fleches.map((f, i) => {
                  if (!places[f.de] || !places[f.vers]) return null;
                  const { d, milieu } = traitDeFleche(places[f.de], places[f.vers], f.courbe);
                  const couleur = f.couleur === "rouge" ? ROUGE : BLEU;
                  const choisieIci = choix?.quoi === "fleche" && choix.i === i;
                  return (
                    <g key={i}>
                      {choisieIci && <path d={d} stroke="#1c7ed6" strokeOpacity={0.25} strokeWidth={4.5} fill="none" strokeLinecap="round" />}
                      <path d={d} stroke={couleur} strokeWidth={1.4} fill="none" strokeLinecap="round" markerEnd={`url(#vb-pointe-${f.couleur})`} />
                      <path d={d} stroke="transparent" strokeWidth={6} fill="none" style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onPointerDown={(e) => { e.stopPropagation(); setOutil(null); setDepart(null); setChoix({ quoi: "fleche", i }); }} />
                      {choisieIci && (
                        <circle cx={milieu.x} cy={milieu.y} r={3.2} fill="#fff" stroke={couleur} strokeWidth={1}
                          style={{ pointerEvents: "all", cursor: "grab", touchAction: "none" }} onPointerDown={surPoignee(i)}>
                          <title>Tirer pour courber la flèche</title>
                        </circle>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
