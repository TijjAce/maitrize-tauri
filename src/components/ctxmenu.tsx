import React from "react";

export interface CtxItem {
  label: string;
  icon?: string;
  danger?: boolean;
  sep?: boolean;        // séparateur affiché AVANT cet item
  onClick?: () => void;
}

/** Ouvre le menu contextuel au curseur avec les items donnés. */
export function openCtx(e: React.MouseEvent, items: CtxItem[]) {
  e.preventDefault();
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent("maitrize:ctx", { detail: { x: e.clientX, y: e.clientY, items } }));
}

/** Hôte unique du menu contextuel (monté une fois dans App). */
export function ContextMenuHost() {
  const [state, setState] = React.useState<{ x: number; y: number; items: CtxItem[] } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onOpen = (e: Event) => setState((e as CustomEvent).detail);
    const onClose = () => setState(null);
    window.addEventListener("maitrize:ctx", onOpen);
    window.addEventListener("click", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("keydown", (ev) => { if ((ev as KeyboardEvent).key === "Escape") onClose(); });
    return () => {
      window.removeEventListener("maitrize:ctx", onOpen);
      window.removeEventListener("click", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, []);

  // Repositionne dans le viewport + focus le premier item (accessibilité clavier).
  const [pos, setPos] = React.useState({ x: 0, y: 0 });
  React.useLayoutEffect(() => {
    if (!state || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.min(state.x, window.innerWidth - r.width - 8);
    const y = Math.min(state.y, window.innerHeight - r.height - 8);
    setPos({ x, y });
    ref.current.querySelector<HTMLElement>(".ctx-item")?.focus();
  }, [state]);

  // Navigation au clavier entre les items (↑ ↓ Début Fin).
  const onKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(".ctx-item") ?? []);
    if (items.length === 0) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
  };

  if (!state) return null;
  return (
    <div ref={ref} className="ctx-menu" role="menu" aria-label="Menu contextuel" style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
      {state.items.map((it, i) => (
        <React.Fragment key={i}>
          {it.sep && <div className="ctx-sep" role="separator" />}
          <button role="menuitem" className={"ctx-item" + (it.danger ? " danger" : "")}
            onClick={() => { setState(null); it.onClick?.(); }}>
            {it.icon && <span className="ctx-ico" aria-hidden="true">{it.icon}</span>}{it.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
