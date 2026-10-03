import React from "react";
import type { Segment } from "../surlignage";

/**
 * Une zone de texte qui met des passages en couleur.
 *
 * Un textarea ne colore pas une partie de son texte. On pose donc dessous un
 * calque au pixel près — mêmes police, marges, bordure et retours à la ligne —
 * qui reprend le texte, invisible, avec les passages surlignés ; la zone,
 * transparente, écrit par-dessus. Le calque suit son défilement, et la place
 * d'une barre de défilement quand il y en a une.
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

    return (
      <div className="surligneur">
        <div ref={fond} className={`${className} surligneur-fond`} style={{ ...style, resize: "none" }} aria-hidden="true">
          {segments.map((s, i) => (s.genre
            ? <mark key={i} className={`surligne-${s.genre}`}>{s.texte}</mark>
            : <React.Fragment key={i}>{s.texte}</React.Fragment>))}
          {/* Un texte qui finit par un retour à la ligne : le calque doit avoir cette ligne aussi. */}
          {"​"}
        </div>
        <textarea ref={poser} className={`${className} surligneur-zone`} style={style}
          onScroll={(e) => { caler(); onScroll?.(e); }} {...props} />
      </div>
    );
  },
);
