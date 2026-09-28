import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import { EVT_CONSIGNE, cleConsigne, consignesParDefaut } from "../consigneAtelier";

// La consigne de la feuille, à réécrire depuis le bandeau de l'atelier.
//
// Le texte de l'atelier est proposé tel qu'il s'imprime ; l'enseignant le
// reprend avec ses mots, et la feuille — aperçu et impression — les prend.
// Vide, la consigne d'origine revient.

/** La consigne enregistrée pour un atelier, et sa mise à jour d'où qu'elle vienne. */
export function useConsigneAtelier(atelier: string): string {
  const [texte, setTexte] = React.useState("");
  React.useEffect(() => {
    if (!atelier) { setTexte(""); return; }
    let vivant = true;
    const lire = () => { api.settingGet(cleConsigne(atelier)).then((v) => { if (vivant) setTexte(v ?? ""); }).catch(() => {}); };
    lire();
    window.addEventListener(EVT_CONSIGNE, lire);
    return () => { vivant = false; window.removeEventListener(EVT_CONSIGNE, lire); };
  }, [atelier]);
  return texte;
}

export function ConsigneAtelier({ atelier }: { atelier: string }) {
  const enregistree = useConsigneAtelier(atelier);
  const [brouillon, setBrouillon] = React.useState<string | null>(null);
  const defaut = React.useSyncExternalStore(consignesParDefaut.abonner, () => consignesParDefaut.lire(atelier));
  const texte = brouillon ?? enregistree;
  // Enregistré un instant après la dernière frappe, et tout de suite quand on quitte le champ.
  const minuteur = React.useRef<number | null>(null);
  const enregistrer = React.useCallback((valeur: string) => {
    if (minuteur.current) { window.clearTimeout(minuteur.current); minuteur.current = null; }
    // Le brouillon reste affiché jusqu'à ce que la valeur enregistrée le rejoigne : pas de clignotement.
    setBrouillon(valeur);
    if (valeur.trim() === enregistree.trim()) { setBrouillon(null); return; }
    api.settingSet(cleConsigne(atelier), valeur.trim())
      .then(() => window.dispatchEvent(new Event(EVT_CONSIGNE)))
      .catch((e) => toast("Consigne non enregistrée : " + String(e), { icone: "⚠️" }));
  }, [atelier, enregistree]);
  React.useEffect(() => {
    if (brouillon !== null && brouillon.trim() === enregistree.trim()) setBrouillon(null);
  }, [enregistree, brouillon]);
  const saisir = (valeur: string) => {
    setBrouillon(valeur);
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => enregistrer(valeur), 700);
  };
  React.useEffect(() => () => { if (minuteur.current) window.clearTimeout(minuteur.current); }, []);
  const modifiee = enregistree.trim() !== "";
  return (
    <details className="comp-atelier consigne-atelier">
      <summary>
        ✏️ La consigne de la feuille
        <span className="meta" style={{ fontWeight: 400, marginLeft: 8 }}>{modifiee ? "réécrite avec vos mots" : "celle de l'atelier"}</span>
      </summary>
      <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 6px", lineHeight: 1.5 }}>
        Réécrivez la consigne avec les mots de la classe : la feuille la prend, à l'aperçu comme à l'impression. Une ligne par phrase ;
        pour une règle encadrée, la première ligne fait le titre. Vide, la consigne d'origine revient.
      </p>
      <textarea className="textarea" rows={3} value={texte} placeholder={defaut || "La consigne telle qu'elle s'imprime — ouvrez l'aperçu pour la voir."}
        aria-label="Consigne de la feuille"
        onChange={(e) => saisir(e.target.value)} onBlur={() => { if (brouillon !== null) enregistrer(brouillon); }} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        {defaut && !texte.trim() && (
          <button type="button" className="btn sm" onClick={() => setBrouillon(defaut)} title="Reprendre le texte de l'atelier pour le modifier">
            📝 Reprendre le texte d'origine
          </button>
        )}
        {(modifiee || texte.trim()) && (
          <button type="button" className="btn ghost sm" onClick={() => enregistrer("")}>↩ Revenir à la consigne d'origine</button>
        )}
      </div>
    </details>
  );
}
