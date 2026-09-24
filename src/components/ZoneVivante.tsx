import React from "react";
import { TextareaAuto } from "./ui";

// ── Un encadré qui s'écrit tout seul ──────────────────────────────────────
//
// Pendant une réunion, voir le texte apparaître lettre après lettre dit ce
// qu'aucun message d'attente ne dit : ça écoute, ça avance, et l'on peut
// lire au fur et à mesure. Un bloc qui tombe d'un coup toutes les
// quatre-vingt-dix secondes ne raconte pas la même chose.
//
// Trois règles tiennent l'ensemble :
//   • ce qui est visé est toujours enregistré en entier, même si l'affichage
//     est en retard : une coupure de courant ne coûte pas ce qui restait à
//     écrire ;
//   • plus le retard grandit, plus la frappe accélère — elle rattrape au lieu
//     de prendre une réunion d'avance ;
//   • dès que l'enseignant met le doigt dedans, tout s'affiche d'un coup et
//     l'animation s'arrête : on ne déplace pas le curseur de quelqu'un qui
//     écrit.

/** Cadence de l'animation, en millisecondes — une image d'écran. */
export const TIC_MS = 16;
/** Caractères par tic, au rythme de croisière (~90 signes par seconde). */
export const PAR_TIC = 3;

/**
 * Combien de caractères écrire pour le temps écoulé depuis la dernière image.
 *
 * L'animation suivait un minuteur de seize millisecondes : le navigateur les
 * respecte quand il veut, et la frappe avançait par à-coups. Elle suit
 * maintenant les images de l'écran, et le nombre de caractères se déduit du
 * temps vraiment écoulé — à soixante images comme à trente, la parole
 * s'écrit au même rythme.
 */
export function parImage(retard: number, ecoule: number, base = PAR_TIC): number {
  if (retard <= 0) return 0;
  const images = Math.max(1, Math.min(4, ecoule / TIC_MS));
  return Math.max(1, Math.min(retard, Math.round(parTic(retard, base) * images)));
}

/** Le début commun à deux textes : ce qui n'a pas à être retapé. */
export function prefixeCommun(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

/**
 * Combien de caractères écrire à ce tic.
 *
 * Le retard se rattrape en douceur : dix lignes d'avance et la frappe double,
 * une page entière et elle décuple — sans quoi une réunion d'une heure
 * finirait avec dix minutes de texte en retard.
 */
export function parTic(retard: number, base = PAR_TIC): number {
  if (retard <= 0) return 0;
  const facteur = Math.max(1, Math.ceil(retard / 200));
  return Math.min(retard, base * facteur);
}

/**
 * La nouvelle cible n'est-elle qu'une suite de ce qui est affiché ?
 *
 * C'est le partage entre ce qui s'écrit et ce qui se range. La parole qui
 * arrive s'ajoute à la fin : on la regarde s'écrire. L'agent, lui, réagence
 * tout le document — le voir se retaper en entier donne le tournis et n'a
 * rien à montrer. Ce travail-là se fait en arrière-plan : le texte est
 * simplement là, rangé, au tic suivant.
 */
export function estUneSuite(affiche: string, cible: string): boolean {
  return cible.startsWith(affiche);
}

/**
 * Le texte affiché au tic suivant.
 *
 * Quand la cible change ailleurs qu'à la fin, on garde le début commun et
 * l'on retape la suite — utile pour une correction locale, pas pour un
 * réagencement complet, que l'appelant applique d'un coup.
 */
export function prochainAffichage(affiche: string, cible: string, base = PAR_TIC): string {
  if (affiche === cible) return affiche;
  const commun = prefixeCommun(affiche, cible);
  // Ce qui a disparu s'efface d'abord, d'un coup : réécrire à l'envers
  // donnerait l'impression d'un bug, pas d'une correction.
  const depart = affiche.length > commun ? cible.slice(0, commun) : affiche;
  const reste = cible.length - depart.length;
  return cible.slice(0, depart.length + parTic(reste, base));
}

export function ZoneVivante({ cible, onChange, minHauteur = "55vh", placeholder, style, anime = true, onSelection, zoneRef }: {
  /** Le texte visé : ce qui est enregistré, et vers quoi l'affichage court. */
  cible: string;
  /** Appelé quand l'enseignant écrit lui-même dans l'encadré. */
  onChange: (valeur: string) => void;
  /** Nombre : un plancher en pixels. Chaîne : une hauteur CSS. */
  minHauteur?: number | string;
  placeholder?: string;
  style?: React.CSSProperties;
  /** Faux : le texte s'affiche sans animation (relecture d'une vieille réunion). */
  anime?: boolean;
  /** Ce que l'enseignant vient de surligner, pour le proposer à l'IA. */
  onSelection?: (choix: { texte: string; debut: number; fin: number } | null) => void;
  /** L'encadré lui-même, pour que l'appelant puisse y replacer du texte. */
  zoneRef?: React.MutableRefObject<HTMLTextAreaElement | null>;
}) {
  const [affiche, setAffiche] = React.useState(cible);
  const zone = React.useRef<HTMLTextAreaElement | null>(null);
  const cibleRef = React.useRef(cible);
  cibleRef.current = cible;
  const afficheRef = React.useRef(affiche);
  afficheRef.current = affiche;
  // Tant que l'enseignant écrit, l'animation se tait : rien ne bouge sous le
  // curseur, et ce qu'il tape est la vérité.
  const [aLaMain, setALaMain] = React.useState(false);

  React.useEffect(() => {
    if (!anime || aLaMain) { setAffiche(cible); return; }
    if (afficheRef.current === cible) return;
    // Un rangement n'est pas une frappe : il se pose, il ne se tape pas.
    if (!estUneSuite(afficheRef.current, cible)) { setAffiche(cible); return; }
    let image = 0;
    let precedent = performance.now();
    const pas = (maintenant: number) => {
      const ecoule = maintenant - precedent;
      precedent = maintenant;
      const vise = cibleRef.current;
      const affichee = afficheRef.current;
      if (affichee === vise) return;
      const combien = parImage(vise.length - affichee.length, ecoule);
      const suite = estUneSuite(affichee, vise) ? vise.slice(0, affichee.length + combien) : vise;
      afficheRef.current = suite;
      setAffiche(suite);
      if (suite !== cibleRef.current) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible, anime, aLaMain]);

  // Le texte s'écrit en bas : on y reste, sauf si l'enseignant est remonté
  // lire plus haut — on ne lui arrache pas sa lecture.
  React.useEffect(() => {
    const el = zone.current;
    if (!el || aLaMain) return;
    const enBas = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (enBas) el.scrollTop = el.scrollHeight;
  }, [affiche, aLaMain]);

  /** Prendre la main : tout s'affiche, et l'animation rend les clés. */
  const prendreLaMain = () => {
    if (aLaMain) return;
    setALaMain(true);
    setAffiche(cibleRef.current);
  };

  /** Ce qui est surligné dans l'encadré, à l'instant. */
  const lireLaSelection = () => {
    const el = zone.current;
    if (!el || !onSelection) return;
    const debut = el.selectionStart ?? 0;
    const fin = el.selectionEnd ?? 0;
    const texte = el.value.slice(debut, fin).trim();
    onSelection(texte.length >= 12 ? { texte: el.value.slice(debut, fin), debut, fin } : null);
  };

  return (
    <TextareaAuto
      ref={(el: HTMLTextAreaElement | null) => { zone.current = el; if (zoneRef) zoneRef.current = el; }}
      value={affiche}
      minHauteur={minHauteur}
      placeholder={placeholder}
      onMouseUp={lireLaSelection}
      onKeyUp={lireLaSelection}
      onSelect={lireLaSelection}
      // La feuille de l'éditeur de textes : même cadre, mêmes marges, même
      // interligne — on écrit ici comme on écrit là-bas.
      className="textarea editeur-riche-feuille"
      style={{ resize: "vertical", ...style }}
      onFocus={prendreLaMain}
      onChange={(e) => {
        prendreLaMain();
        setAffiche(e.target.value);
        onChange(e.target.value);
      }}
      onBlur={() => setALaMain(false)}
    />
  );
}
