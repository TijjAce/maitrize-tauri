import React from "react";
import { ApercuFeuille } from "./ApercuFeuille";
import { toastAnnulable } from "./Toaster";
import { avecSeul } from "../jeuxSons";
import {
  MIN_BRANCHE, MIN_CENTRE, STYLE_CARTE_MENTALE, aDesCadres, blocsDeLaCarte, cadreDuCentre, deplacer, redimensionner, tailleSuivante,
  type Branche, type Cadre, type Poignee, type ReglagesCarte,
} from "../carteMentale";

// ── La carte mentale, modifiable sur la feuille ───────────────────────────
//
// On choisit un cadre d'un clic : on le glisse pour le déplacer, on tire ses
// poignées pour l'agrandir, A− et A+ changent la taille de son texte. Un
// double-clic réécrit un texte ; un clic sur un picto d'un cadre déjà choisi
// le retire de la feuille. La feuille reste celle qui s'imprime : on ne
// change que les réglages, et elle se refait.

/** Ce qu'on a choisi sur la feuille : le centre, ou le titre ou les idées d'une branche. */
export type ChoixCarte = { quoi: "centre" } | { quoi: "branche"; i: number; partie: "titre" | "idees" };
/** Ce qu'un double-clic réécrit. */
type CibleTexte = { quoi: "centre" } | { quoi: "titre"; i: number } | { quoi: "idee"; i: number; j: number };
/** Une zone de l'éditeur, en pixels depuis son coin haut gauche. */
interface Zone { x: number; y: number; l: number; h: number }

/** La feuille à l'échelle 1, marges de l'aperçu comprises : 256 mm, et deux fois 17 pixels. */
const LARGEUR_APERCU = (256 * 96) / 25.4 + 34;
const POIGNEES: Poignee[] = ["n", "s", "e", "o", "ne", "no", "se", "so"];
/** Le temps de voir venir un double-clic avant de retirer un picto cliqué. */
const DOUBLE_CLIC_MS = 280;

/** Ce que seul l'aperçu montre : où l'on peut cliquer. L'imprimante n'en reçoit rien. */
const STYLE_EDITION = `
  .feuille.cm [data-cm] { cursor: move; }
  .feuille.cm .cm-choisi [data-cm-image] { cursor: pointer; }
  .feuille.cm .cm-choisi [data-cm-image]:hover { outline: 2px solid #e03131; outline-offset: 1px; border-radius: 2px; }
`;

/** Un geste en cours : déplacer le cadre choisi, ou le tirer par une poignée. */
interface Geste {
  choix: ChoixCarte;
  el: HTMLElement;
  poignee: Poignee | null;
  depart: { x: number; y: number };
  cadre: Cadre;
  pxParMm: number;
  bouge: boolean;
  dernier?: Cadre;
  /** Le picto sous le pointeur, dans un cadre déjà choisi : un clic sans bouger le retire. */
  image: HTMLElement | null;
}

const memeCadre = (a: ChoixCarte, b: ChoixCarte) => a.quoi === b.quoi && (a.quoi === "centre" || (b.quoi === "branche" && a.i === b.i));
const sansCadre = ({ cadre: _cadre, ...b }: Branche): Branche => b;
const titreDe = (r: ReglagesCarte, i: number) => r.branches[i]?.titre.trim() || `branche ${i + 1}`;

export function EditeurCarteMentale({ r, html, onChange, onChoisirBranche }: {
  r: ReglagesCarte;
  html: string;
  onChange: (maj: Partial<ReglagesCarte>) => void;
  /** Une branche choisie sur la feuille se déplie aussi dans le panneau. */
  onChoisirBranche?: (i: number) => void;
}) {
  const boite = React.useRef<HTMLDivElement>(null);
  const page = React.useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = React.useState(0.62);
  const [choix, setChoix] = React.useState<ChoixCarte | null>(null);
  const [zone, setZone] = React.useState<Zone | null>(null);
  const [saisie, setSaisie] = React.useState<{ cible: CibleTexte; valeur: string; zone: Zone; taille: number } | null>(null);
  const geste = React.useRef<Geste | null>(null);
  const retraitEnAttente = React.useRef<number | null>(null);
  // Les gestes lisent les réglages du moment, pas ceux du rendu où ils ont commencé.
  const actuel = React.useRef({ r, onChange });
  actuel.current = { r, onChange };

  // La feuille entière tient dans la largeur : rien n'est coupé à droite.
  React.useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    const ajuster = () => setZoom(Math.max(0.3, Math.min(1, (el.clientWidth - 2) / LARGEUR_APERCU)));
    ajuster();
    const suivi = new ResizeObserver(ajuster);
    suivi.observe(el);
    return () => suivi.disconnect();
  }, []);

  const elementDe = (c: ChoixCarte) =>
    page.current?.querySelector<HTMLElement>(c.quoi === "centre" ? '[data-cm="centre"]' : `[data-cm="branche"][data-i="${c.i}"]`) ?? null;
  const zoneDe = (el: Element): Zone => {
    const a = el.getBoundingClientRect(), b = boite.current!.getBoundingClientRect();
    return { x: a.left - b.left, y: a.top - b.top, l: a.width, h: a.height };
  };
  const mesurer = () => {
    page.current?.querySelectorAll(".cm-choisi").forEach((n) => n.classList.remove("cm-choisi"));
    const el = choix ? elementDe(choix) : null;
    if (!el) { setZone(null); if (choix) setChoix(null); return; }
    // Le cadre choisi montre ses pictos comme on peut les retirer.
    el.classList.add("cm-choisi");
    el.querySelectorAll<HTMLElement>("[data-cm-image]").forEach((img) => { img.title = "Cliquer pour retirer ce picto de la feuille"; });
    setZone(zoneDe(el));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useLayoutEffect(mesurer, [choix, html, zoom]);

  // ── Ce que les gestes changent ──
  const majBranche = (i: number, maj: (b: Branche) => Branche) => {
    const { r: lu, onChange: changer } = actuel.current;
    changer({ branches: lu.branches.map((b, k) => (k === i ? maj(b) : b)) });
  };
  const cadreDe = (c: ChoixCarte): Cadre => {
    const lu = actuel.current.r;
    if (c.quoi === "centre") return cadreDuCentre(lu);
    const bloc = blocsDeLaCarte(lu).find((p) => p.rang === c.i)?.bloc;
    return bloc ? { x: bloc.x, y: bloc.y, largeur: bloc.largeur, hauteur: bloc.hauteur } : cadreDuCentre(lu);
  };
  const poserCadre = (c: ChoixCarte, cadre: Cadre) => {
    if (c.quoi === "centre") actuel.current.onChange({ cadreCentre: cadre });
    else majBranche(c.i, (b) => ({ ...b, cadre }));
  };
  /** Retire de la feuille le picto cliqué ; un toast permet de revenir en arrière. */
  const retirerImage = (c: ChoixCarte, img: HTMLElement) => {
    const lu = actuel.current.r;
    const quoi = img.dataset.cmImage;
    if (quoi === "centre") {
      const avant = lu.image;
      actuel.current.onChange({ image: { id: null, mot: "" } });
      toastAnnulable("Le picto du centre est retiré de la feuille.", () => actuel.current.onChange({ image: avant }), "🖼");
    } else if (c.quoi === "branche" && quoi === "titre") {
      const avant = lu.branches[c.i]?.image;
      if (!avant) return;
      majBranche(c.i, (b) => ({ ...b, image: { id: null, mot: "" } }));
      toastAnnulable(`Le picto du titre « ${titreDe(lu, c.i)} » est retiré de la feuille.`, () => majBranche(c.i, (b) => ({ ...b, image: avant })), "🖼");
    } else if (c.quoi === "branche" && quoi === "idee") {
      const j = Number(img.closest<HTMLElement>("[data-j]")?.dataset.j);
      const m = lu.branches[c.i]?.idees[j];
      if (!m) return;
      const montrer = (seul: typeof m.seul) => majBranche(c.i, (b) => ({ ...b, idees: b.idees.map((x, k) => (k === j ? avecSeul(x, seul) : x)) }));
      montrer("mot");
      toastAnnulable(`Le picto de « ${m.mot} » est retiré de la feuille.`, () => montrer(m.seul), "🖼");
    }
  };

  // ── Les gestes ──
  React.useEffect(() => {
    const bouger = (e: MouseEvent) => {
      const g = geste.current;
      if (!g) return;
      const dx = e.clientX - g.depart.x, dy = e.clientY - g.depart.y;
      if (!g.bouge && Math.hypot(dx, dy) < 4) return;
      g.bouge = true;
      const [mx, my] = [dx / g.pxParMm, dy / g.pxParMm];
      const n = g.poignee
        ? redimensionner(g.cadre, g.poignee, mx, my, g.choix.quoi === "centre" ? MIN_CENTRE : MIN_BRANCHE)
        : deplacer(g.cadre, mx, my);
      g.dernier = n;
      // Le geste se voit sur la feuille même ; elle se refait au relâché.
      Object.assign(g.el.style, { left: `${n.x}mm`, top: `${n.y}mm`, width: `${n.largeur}mm`, height: `${n.hauteur}mm` });
      setZone(zoneDe(g.el));
    };
    const lacher = () => {
      const g = geste.current;
      geste.current = null;
      if (!g) return;
      if (g.bouge && g.dernier) { poserCadre(g.choix, g.dernier); return; }
      const image = g.image;
      if (!image) return;
      // Un double-clic sur un picto réécrit son mot : on attend de savoir avant de le retirer.
      retraitEnAttente.current = window.setTimeout(() => { retraitEnAttente.current = null; retirerImage(g.choix, image); }, DOUBLE_CLIC_MS);
    };
    window.addEventListener("mousemove", bouger);
    window.addEventListener("mouseup", lacher);
    return () => {
      window.removeEventListener("mousemove", bouger);
      window.removeEventListener("mouseup", lacher);
      if (retraitEnAttente.current) window.clearTimeout(retraitEnAttente.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const surAppui = (e: React.MouseEvent) => {
    if (e.button !== 0 || saisie) return;
    const cible = e.target as HTMLElement;
    const el = cible.closest<HTMLElement>("[data-cm]");
    if (!el || !page.current?.contains(el)) { setChoix(null); return; }
    const c: ChoixCarte = el.dataset.cm === "centre" ? { quoi: "centre" }
      : { quoi: "branche", i: Number(el.dataset.i), partie: cible.closest(".cm-titre") ? "titre" : "idees" };
    const deja = choix != null && memeCadre(choix, c);
    setChoix(c);
    if (c.quoi === "branche") onChoisirBranche?.(c.i);
    const cadre = cadreDe(c);
    geste.current = {
      choix: c, el, poignee: null, depart: { x: e.clientX, y: e.clientY }, cadre, pxParMm: el.getBoundingClientRect().width / cadre.largeur,
      bouge: false, image: deja ? cible.closest<HTMLElement>("[data-cm-image]") : null,
    };
    // Glisser déplace le cadre : il ne sélectionne pas le texte de la page.
    e.preventDefault();
  };

  const surPoignee = (e: React.MouseEvent, p: Poignee) => {
    e.stopPropagation();
    e.preventDefault();
    const el = choix ? elementDe(choix) : null;
    if (!choix || !el) return;
    const cadre = cadreDe(choix);
    geste.current = {
      choix, el, poignee: p, depart: { x: e.clientX, y: e.clientY }, cadre, pxParMm: el.getBoundingClientRect().width / cadre.largeur,
      bouge: false, image: null,
    };
  };

  const surDoubleClic = (e: React.MouseEvent) => {
    if (retraitEnAttente.current) { window.clearTimeout(retraitEnAttente.current); retraitEnAttente.current = null; }
    const cible = e.target as HTMLElement;
    const texte = cible.closest<HTMLElement>("[data-cm-texte], [data-j]");
    const el = texte?.closest<HTMLElement>("[data-cm]");
    if (!texte || !el || !page.current?.contains(el)) return;
    const lu = actuel.current.r;
    let c: CibleTexte;
    let valeur: string;
    if (el.dataset.cm === "centre") { c = { quoi: "centre" }; valeur = lu.centre; }
    else {
      const i = Number(el.dataset.i);
      if (texte.dataset.cmTexte === "titre") { c = { quoi: "titre", i }; valeur = lu.branches[i]?.titre ?? ""; }
      else { const j = Number(texte.dataset.j); c = { quoi: "idee", i, j }; valeur = lu.branches[i]?.idees[j]?.mot ?? ""; }
    }
    setSaisie({ cible: c, valeur, zone: zoneDe(texte), taille: parseFloat(getComputedStyle(texte).fontSize) * zoom });
  };

  // ── La réécriture ──
  const saisieFinie = React.useRef(false);
  React.useEffect(() => { saisieFinie.current = false; }, [saisie?.cible]);
  const finirSaisie = (garder: boolean) => {
    if (!saisie || saisieFinie.current) return;
    saisieFinie.current = true;
    const { cible: c, valeur: v } = saisie;
    setSaisie(null);
    if (!garder) return;
    if (c.quoi === "centre") actuel.current.onChange({ centre: v });
    else if (c.quoi === "titre") majBranche(c.i, (b) => ({ ...b, titre: v }));
    // Un mot vidé garde l'ancien : pour retirer une idée, c'est sa croix dans le panneau.
    else if (v.trim()) majBranche(c.i, (b) => ({ ...b, idees: b.idees.map((m, k) => (k === c.j ? { ...m, mot: v.trim() } : m)) }));
  };

  // ── Les tailles et les places ──
  const changerTaille = (sens: 1 | -1) => {
    const lu = actuel.current.r;
    const t = (k?: number) => { const v = tailleSuivante(k, sens); return v === 1 ? undefined : v; };
    if (!choix) {
      actuel.current.onChange({ tailleCentre: t(lu.tailleCentre), branches: lu.branches.map((b) => ({ ...b, tailleTitre: t(b.tailleTitre), tailleIdees: t(b.tailleIdees) })) });
    } else if (choix.quoi === "centre") actuel.current.onChange({ tailleCentre: t(lu.tailleCentre) });
    else if (choix.partie === "titre") majBranche(choix.i, (b) => ({ ...b, tailleTitre: t(b.tailleTitre) }));
    else majBranche(choix.i, (b) => ({ ...b, tailleIdees: t(b.tailleIdees) }));
  };
  const taille = !choix ? null : choix.quoi === "centre" ? r.tailleCentre ?? 1
    : (choix.partie === "titre" ? r.branches[choix.i]?.tailleTitre : r.branches[choix.i]?.tailleIdees) ?? 1;
  const tailleChangee = r.tailleCentre != null || r.branches.some((b) => b.tailleTitre != null || b.tailleIdees != null);
  const cadreChange = !choix ? aDesCadres(r) : choix.quoi === "centre" ? Boolean(r.cadreCentre) : Boolean(r.branches[choix.i]?.cadre);
  const remettre = () => {
    if (!choix) onChange({ cadreCentre: undefined, branches: r.branches.map(sansCadre) });
    else if (choix.quoi === "centre") onChange({ cadreCentre: undefined });
    else majBranche(choix.i, sansCadre);
  };
  const libelle = !choix ? "Tout le texte" : choix.quoi === "centre" ? "Le centre"
    : `${choix.partie === "titre" ? "Le titre" : "Les idées"} de « ${titreDe(r, choix.i)} »`;

  return (
    <div className="cm-editeur">
      <div className="cm-barre">
        <b className="cm-barre-quoi">{libelle}</b>
        <span className="cm-barre-taille" role="group" aria-label={`Taille du texte : ${libelle}`}>
          <button type="button" className="btn sm" onClick={() => changerTaille(-1)} title="Plus petit : le texte et ses pictos">A−</button>
          {taille != null && <span className="cm-barre-pourcent">{Math.round(taille * 100)} %</span>}
          <button type="button" className="btn sm" onClick={() => changerTaille(1)} title="Plus grand : le texte et ses pictos">A+</button>
        </span>
        {cadreChange && (
          <button type="button" className="btn ghost sm" onClick={remettre}>{choix ? "↺ Remettre ce cadre à sa place" : "↺ Remettre les cadres à leur place"}</button>
        )}
        {!choix && tailleChangee && (
          <button type="button" className="btn ghost sm"
            onClick={() => onChange({ tailleCentre: undefined, branches: r.branches.map(({ tailleTitre: _t, tailleIdees: _i, ...b }) => b) })}>
            ↺ Tailles d'origine
          </button>
        )}
        {choix && <button type="button" className="btn ghost sm" onClick={() => setChoix(null)}>✓ Fini</button>}
      </div>
      <p className="meta cm-aide">
        {choix
          ? "Glissez le cadre pour le déplacer, ses poignées pour l'agrandir. Double-cliquez un texte pour le réécrire ; cliquez un picto de ce cadre pour le retirer de la feuille."
          : "Cliquez un cadre de la feuille pour le déplacer, l'agrandir ou changer la taille de son texte. Double-cliquez un texte pour le réécrire."}
      </p>
      <div ref={boite} className="cm-editeur-feuille" onMouseDown={surAppui} onDoubleClick={surDoubleClic} onScrollCapture={mesurer}>
        <div ref={page} style={{ zoom }}>
          <ApercuFeuille html={html} style={STYLE_CARTE_MENTALE + STYLE_EDITION} />
        </div>
        {zone && choix && (
          <div className="cm-choix" style={{ left: zone.x, top: zone.y, width: zone.l, height: zone.h }}>
            {POIGNEES.map((p) => <span key={p} className={`cm-poignee cm-p-${p}`} onMouseDown={(e) => surPoignee(e, p)} />)}
          </div>
        )}
        {saisie && (
          <input className="cm-saisie" autoFocus value={saisie.valeur} aria-label="Réécrire le texte"
            style={{
              left: Math.max(0, saisie.zone.x + saisie.zone.l / 2 - Math.max(160, saisie.zone.l + 30) / 2),
              top: saisie.zone.y + saisie.zone.h / 2 - (Math.max(13, saisie.taille) * 1.25 + 12) / 2,
              width: Math.max(160, saisie.zone.l + 30), fontSize: Math.max(13, saisie.taille),
              textTransform: r.capitales ? "uppercase" : undefined,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setSaisie({ ...saisie, valeur: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); finirSaisie(true); }
              else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finirSaisie(false); }
            }}
            onBlur={() => finirSaisie(true)} />
        )}
      </div>
    </div>
  );
}
