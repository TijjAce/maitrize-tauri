import React from "react";
import type { ExerciceManuel, Zone } from "../manuels";

// ── La page d'un manuel, ses exercices encadrés ───────────────────────────
//
// Chaque exercice se voit là où l'enseignant l'a encadré. On clique un cadre
// pour choisir l'exercice ; le cadre choisi se déplace, et ses coins le
// redimensionnent. En mode « encadrer », on trace un cadre neuf : ce qu'il
// contient devient un exercice.

/** Une teinte par exercice : la même pour son cadre et pour sa ligne dans la liste. */
const TEINTES = ["#6366f1", "#f97316", "#10b981", "#ec4899", "#0ea5e9", "#eab308", "#8b5cf6", "#ef4444"];
export const teinteExercice = (i: number) => TEINTES[i % TEINTES.length];

type Coin = "hg" | "hd" | "bg" | "bd";
const COINS: Coin[] = ["hg", "hd", "bg", "bd"];

interface Geste {
  mode: "tracer" | "deplacer" | "coin";
  depart: { x: number; y: number };
  zone: Zone;
  courante: Zone;
  id?: string;
  coin?: Coin;
}

const dans01 = (v: number) => Math.min(1, Math.max(0, v));
const pct = (v: number) => `${(v * 100).toFixed(3)}%`;
/** Plus petit qu'un cadre : un clic, pas un tracé. */
const tropPetite = (z: Zone) => z.l < 0.02 || z.h < 0.015;

export function PageEncadree({ image, exercices, choisi, encadrer, onChoisir, onTracer, onAjuster }: {
  image: string;
  exercices: ExerciceManuel[];
  choisi: string;
  /** Vrai : un tracé sur la page fait un exercice neuf. */
  encadrer: boolean;
  onChoisir: (id: string) => void;
  onTracer: (z: Zone) => void;
  onAjuster: (id: string, z: Zone) => void;
}) {
  const cadre = React.useRef<HTMLDivElement>(null);
  const geste = React.useRef<Geste | null>(null);
  const [enCours, setEnCours] = React.useState<{ id?: string; zone: Zone } | null>(null);

  const point = (ev: React.PointerEvent) => {
    const r = cadre.current!.getBoundingClientRect();
    return { x: dans01((ev.clientX - r.left) / r.width), y: dans01((ev.clientY - r.top) / r.height) };
  };
  const saisir = (ev: React.PointerEvent, g: Geste) => {
    geste.current = g;
    // Le cadre suit le doigt même quand il sort de la page.
    try { cadre.current?.setPointerCapture(ev.pointerId); } catch { /* un pointeur déjà relâché : le geste se finit tout seul */ }
    setEnCours({ id: g.id, zone: g.zone });
  };

  const commencer = (ev: React.PointerEvent) => {
    if (!encadrer || ev.button !== 0) return;
    const p = point(ev);
    const zone = { x: p.x, y: p.y, l: 0, h: 0 };
    saisir(ev, { mode: "tracer", depart: p, zone, courante: zone });
  };

  const prendreLeCadre = (ev: React.PointerEvent, e: ExerciceManuel, coin?: Coin) => {
    if (encadrer || !e.zone || ev.button !== 0) return;
    ev.stopPropagation();
    // Le premier clic choisit l'exercice ; c'est ensuite qu'on déplace son cadre.
    if (e.id !== choisi) { onChoisir(e.id); return; }
    saisir(ev, { mode: coin ? "coin" : "deplacer", depart: point(ev), zone: e.zone, courante: e.zone, id: e.id, coin });
  };

  const bouger = (ev: React.PointerEvent) => {
    const g = geste.current;
    if (!g) return;
    const p = point(ev);
    let z: Zone;
    if (g.mode === "tracer") {
      z = { x: Math.min(g.depart.x, p.x), y: Math.min(g.depart.y, p.y), l: Math.abs(p.x - g.depart.x), h: Math.abs(p.y - g.depart.y) };
    } else if (g.mode === "deplacer") {
      z = {
        ...g.zone,
        x: Math.min(Math.max(g.zone.x + p.x - g.depart.x, 0), 1 - g.zone.l),
        y: Math.min(Math.max(g.zone.y + p.y - g.depart.y, 0), 1 - g.zone.h),
      };
    } else {
      // Le coin opposé ne bouge pas.
      const fixe = {
        x: g.coin!.endsWith("g") ? g.zone.x + g.zone.l : g.zone.x,
        y: g.coin!.startsWith("h") ? g.zone.y + g.zone.h : g.zone.y,
      };
      z = { x: Math.min(fixe.x, p.x), y: Math.min(fixe.y, p.y), l: Math.abs(p.x - fixe.x), h: Math.abs(p.y - fixe.y) };
    }
    g.courante = z;
    setEnCours({ id: g.id, zone: z });
  };

  const finir = () => {
    const g = geste.current;
    geste.current = null;
    setEnCours(null);
    if (!g || tropPetite(g.courante)) return;
    if (g.mode === "tracer") onTracer(g.courante);
    else if (g.id && JSON.stringify(g.courante) !== JSON.stringify(g.zone)) onAjuster(g.id, g.courante);
  };

  return (
    <div ref={cadre} className={`man-page-encadree${encadrer ? " trace" : ""}`}
      onPointerDown={commencer} onPointerMove={bouger} onPointerUp={finir} onPointerCancel={finir}>
      <img src={image} alt="" draggable={false} />
      {exercices.map((e, i) => {
        const zone = enCours?.id === e.id ? enCours.zone : e.zone;
        if (!zone) return null;
        const on = e.id === choisi;
        return (
          <div key={e.id} className={`man-zone${on ? " on" : ""}`}
            style={{ left: pct(zone.x), top: pct(zone.y), width: pct(zone.l), height: pct(zone.h), ["--teinte" as string]: teinteExercice(i) }}
            onPointerDown={(ev) => prendreLeCadre(ev, e)}>
            <span className="man-zone-etiquette">{e.numero || i + 1}</span>
            {on && !encadrer && COINS.map((c) => (
              <span key={c} className={`man-zone-coin ${c}`} onPointerDown={(ev) => prendreLeCadre(ev, e, c)} />
            ))}
          </div>
        );
      })}
      {enCours && !enCours.id && (
        <div className="man-zone trace"
          style={{ left: pct(enCours.zone.x), top: pct(enCours.zone.y), width: pct(enCours.zone.l), height: pct(enCours.zone.h) }} />
      )}
    </div>
  );
}
