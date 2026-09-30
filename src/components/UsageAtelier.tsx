import React from "react";
import { api } from "../api";
import { EVT_DONNEES_DISTANTES, Select } from "./ui";
import { toast } from "./Toaster";
import { EVT_USAGE, USAGES, cleUsage, descriptionDe, usagesDesReglages, type Usage } from "../usageAtelier";

// Le moment de la séquence que sert un atelier, côté écran : ce qu'on a
// rangé, pour tous les ateliers à la fois, et la rangée du bandeau qui le
// change. Le rangement est un réglage partagé : rangé ici, rangé sur
// l'autre ordinateur.

/** Les rangements des ateliers donnés, tenus à jour d'où qu'ils changent. */
export function useUsagesDesAteliers(ateliers: readonly string[]): { usages: Record<string, Usage>; changer: (atelier: string, usage: Usage) => void } {
  const cle = ateliers.join("|");
  const [usages, setUsages] = React.useState<Record<string, Usage>>(() => usagesDesReglages({}, ateliers));
  const lire = React.useCallback(() => {
    const liste = cle.split("|").filter(Boolean);
    api.settingsAll().then((r) => setUsages(usagesDesReglages(r, liste))).catch(() => {});
  }, [cle]);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_USAGE, lire);
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => { window.removeEventListener(EVT_USAGE, lire); window.removeEventListener(EVT_DONNEES_DISTANTES, lire); };
  }, [lire]);
  const changer = React.useCallback((atelier: string, usage: Usage) => {
    setUsages((u) => ({ ...u, [atelier]: usage }));
    api.settingSet(cleUsage(atelier), usage)
      .then(() => window.dispatchEvent(new Event(EVT_USAGE)))
      .catch((e) => toast("Rangement non enregistré : " + String(e), { icone: "⚠️" }));
  }, []);
  return { usages, changer };
}

/** Dans l'en-tête d'un atelier : le moment où on le range, à changer d'un choix — cela se fait une fois. */
export function UsageAtelier({ atelier }: { atelier: string }) {
  const { usages, changer } = useUsagesDesAteliers([atelier]);
  const courant = usages[atelier] ?? "entrainement";
  return (
    <label className="usage-atelier" title={`${descriptionDe(courant).aide} Rangé ici, l'atelier se retrouve dans le catalogue « par moment de la séquence ».`}>
      <span>🗂 Rangé dans</span>
      <Select value={courant} onChange={(e) => changer(atelier, e.target.value as Usage)} aria-label="Le moment de la séquence que sert cet atelier">
        {USAGES.map((u) => <option key={u.id} value={u.id}>{u.ico} {u.nom} · {u.quand}</option>)}
      </Select>
    </label>
  );
}
