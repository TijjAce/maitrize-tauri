import { PALETTE_CUBES } from "../cubesNumeration";

/** Les couleurs possibles, en pastilles : celles des cubes, ou la palette qu'on donne. */
export function Pastilles({ valeur, onChange, palette = PALETTE_CUBES }: {
  valeur: string; onChange: (hex: string) => void; palette?: { nom: string; hex: string }[];
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {palette.map((c) => (
        <button key={c.hex} type="button" title={c.nom} aria-label={c.nom} aria-pressed={valeur === c.hex}
          onClick={() => onChange(c.hex)}
          style={{
            width: 20, height: 20, borderRadius: 5, background: c.hex, cursor: "pointer", padding: 0,
            border: valeur === c.hex ? "3px solid var(--text)" : "1px solid var(--border)",
          }} />
      ))}
    </div>
  );
}
