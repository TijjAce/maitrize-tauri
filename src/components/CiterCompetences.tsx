import React from "react";
import { api, DocumentCoffre } from "../api";
import { toast } from "./Toaster";
import { PROGRAMMES_OFFICIELS, nomDansLeCoffre } from "../data/programmesOfficiels";

// Les programmes officiels, à enregistrer dans le coffre-fort pour les lire
// hors ligne.

const taille = (o: number) => (o >= 1e6 ? `${(o / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.round(o / 1e3)} Ko`);

/** Les programmes officiels, à enregistrer d'un clic dans le coffre-fort. */
export function ProgrammesPourLeCoffre({ docs, onAjoute, onOuvrir }: {
  docs: DocumentCoffre[];
  onAjoute: (d: DocumentCoffre) => void;
  onOuvrir?: (d: DocumentCoffre) => void;
}) {
  const [enCours, setEnCours] = React.useState<Record<string, "telechargement" | "echec">>({});
  const enregistrer = async (id: string) => {
    const p = PROGRAMMES_OFFICIELS.find((x) => x.id === id)!;
    setEnCours((s) => ({ ...s, [id]: "telechargement" }));
    try {
      const d = await api.coffreDownload(p.url, nomDansLeCoffre(p));
      setEnCours((s) => { const n = { ...s }; delete n[id]; return n; });
      onAjoute(d);
    } catch (e) {
      setEnCours((s) => ({ ...s, [id]: "echec" }));
      toast(`« ${p.discipline} » n’a pas pu être téléchargé : ${e}`, { icone: "⚠️", duree: 7000 });
    }
  };
  const cycles = [...new Set(PROGRAMMES_OFFICIELS.map((p) => p.cycle))];
  return (
    <div>
      {cycles.map((cycle) => (
        <div key={cycle}>
          <div className="programmes-coffre-cycle">{cycle}</div>
          {PROGRAMMES_OFFICIELS.filter((p) => p.cycle === cycle).map((p) => {
            const present = docs.find((d) => d.nom === nomDansLeCoffre(p));
            const etat = enCours[p.id];
            return (
              <div key={p.id} className="list-row">
                <span aria-hidden>📕</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{p.discipline}</div>
                  <div className="meta">{p.reference} · {taille(p.octets)}</div>
                </div>
                {present
                  ? (onOuvrir
                      ? <button className="btn sm" onClick={() => onOuvrir(present)}>✓ Au coffre-fort · Ouvrir</button>
                      : <span className="chip">✓ Au coffre-fort</span>)
                  : <button className="btn sm" disabled={etat === "telechargement"} onClick={() => enregistrer(p.id)}>
                      {etat === "telechargement" ? "⏳ Enregistrement…" : etat === "echec" ? "↻ Réessayer" : "⬇️ Enregistrer au coffre-fort"}
                    </button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
