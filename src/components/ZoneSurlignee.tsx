// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import type { Segment } from "../surlignage";

/**
 * Une zone de texte qui met des passages en couleur, ou dans un cadre.
 *
 * Un textarea ne colore pas une partie de son texte. On pose donc dessous un
 * calque au pixel près — mêmes police, marges, bordure et retours à la ligne —
 * qui reprend le texte, invisible, avec les passages surlignés ; la zone,
 * transparente, écrit par-dessus. Le calque suit son défilement, et la place
 * d'une barre de défilement quand il y en a une.
 *
 * Les segments d'un même cadre (voir prevuParEleve.ts) forment un bloc dont
 * le contour est dessiné par `outline`, qui ne décale rien : le bloc commence
 * à une ligne et garde le retour à la ligne qui le clôt, si bien que le calque
 * a autant de lignes que la zone.
 */
export const ZoneSurlignee = React.forwardRef<HTMLTextAreaElement,
  { segments: Segment[] } & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function ZoneSurlignee({ segments, className = "textarea", style, onScroll, ...props }, refExterne) {
    const zone = React.useRef<HTMLTextAreaElement | null>(null);
    const fond = React.useRef<HTMLDivElement>(null);
    const poser = React.useCallback((el: HTMLTextAreaElement | null) => {
      zone.current = el;
      if (typeof refExterne === "function") refExterne(el);
      else if (refExterne) refExterne.current = el;
    }, [refExterne]);

    const caler = React.useCallback(() => {
      const z = zone.current, f = fond.current;
      if (!z || !f) return;
      const cs = getComputedStyle(z);
      const bordures = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
      const barre = Math.max(0, z.offsetWidth - z.clientWidth - bordures);
      f.style.paddingRight = `${parseFloat(cs.paddingRight) + barre}px`;
      f.scrollTop = z.scrollTop;
      f.scrollLeft = z.scrollLeft;
    }, []);
    React.useLayoutEffect(caler);
    React.useEffect(() => {
      const z = zone.current;
      if (!z || typeof ResizeObserver === "undefined") return;
      const o = new ResizeObserver(caler);
      o.observe(z);
      return () => o.disconnect();
    }, [caler]);

    const rendre = (s: Segment, i: number) => (s.genre
      ? <mark key={i} className={`surligne-${s.genre}${s.couleur !== undefined ? ` eleve-c${s.couleur % 8}` : ""}`}>{s.texte}</mark>
      : <React.Fragment key={i}>{s.texte}</React.Fragment>);
    const groupes: { cadre?: Segment["cadre"]; segments: Segment[] }[] = [];
    for (const s of segments) {
      const g = groupes[groupes.length - 1];
      if (g && g.cadre === s.cadre) g.segments.push(s); else groupes.push({ cadre: s.cadre, segments: [s] });
    }
    // Un texte qui finit par un retour à la ligne : le calque doit avoir cette ligne aussi. Sans lui, l'espace
    // reste sur la dernière ligne — dans son cadre, sinon elle en aurait une de plus.
    const dernier = groupes[groupes.length - 1];
    const finale = dernier?.cadre && !segments[segments.length - 1].texte.endsWith("\n") ? dernier : null;
    return (
      <div className="surligneur">
        <div ref={fond} className={`${className} surligneur-fond`} style={{ ...style, resize: "none" }} aria-hidden="true">
          {groupes.map((g, k) => (g.cadre
            ? <div key={k} className={`cadre-eleve${g.cadre.couleur !== undefined ? ` eleve-c${g.cadre.couleur % 8}` : ""}`}>
                {g.segments.map(rendre)}{g === finale ? "​" : null}
              </div>
            : <React.Fragment key={k}>{g.segments.map(rendre)}</React.Fragment>))}
          {finale ? null : "​"}
        </div>
        <textarea ref={poser} className={`${className} surligneur-zone`} style={style}
          onScroll={(e) => { caler(); onScroll?.(e); }} {...props} />
      </div>
    );
  },
);
