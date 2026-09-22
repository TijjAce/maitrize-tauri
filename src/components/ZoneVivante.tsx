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

/** Cadence de l'animation, en millisecondes. */
export const TIC_MS = 16;
/** Caractères par tic, au rythme de croisière (~90 signes par seconde). */
export const PAR_TIC = 3;

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
 * Le texte affiché au tic suivant.
 *
 * Quand la cible change ailleurs qu'à la fin — l'agent a réagencé le
 * document —, on garde le début commun et l'on retape la suite : c'est ce
 * qui donne l'impression que le texte se réécrit sous les yeux.
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

export function ZoneVivante({ cible, onChange, minHauteur = "55vh", placeholder, style, anime = true }: {
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
    const id = window.setInterval(() => {
      const suite = prochainAffichage(afficheRef.current, cibleRef.current);
      afficheRef.current = suite;
      setAffiche(suite);
      if (suite === cibleRef.current) window.clearInterval(id);
    }, TIC_MS);
    return () => window.clearInterval(id);
  }, [cible, anime, aLaMain]);

  /** Prendre la main : tout s'affiche, et l'animation rend les clés. */
  const prendreLaMain = () => {
    if (aLaMain) return;
    setALaMain(true);
    setAffiche(cibleRef.current);
  };

  return (
    <TextareaAuto
      ref={zone}
      value={affiche}
      minHauteur={minHauteur}
      placeholder={placeholder}
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
