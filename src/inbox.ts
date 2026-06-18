// Boîte de réception : on relève (télécharge + déchiffre) ce que les amis nous
// envoient et on le garde « en attente ». L'utilisateur choisit ensuite, dans
// l'onglet Amis, de récupérer (importer) ou de jeter chaque élément.
import { api, BoiteItem } from "./api";

const LIBELLE: Record<BoiteItem["type"], string> = {
  sequence: "séquence", projet: "projet", programmation: "programmation",
};

/** Relève la boîte chez tous les amis ; renvoie les nouveaux éléments en attente. */
export async function releverBoiteAuxLettres(): Promise<BoiteItem[]> {
  // Synchronisation configurée ? (sinon on ne fait rien)
  try {
    const cfg = await api.syncConfigGet();
    if (!cfg.aSecret || !cfg.bucket || !cfg.endpoint) return [];
  } catch { return []; }

  const amis = await api.amisList().catch(() => []);
  const recus: BoiteItem[] = [];
  for (const a of amis) {
    try { recus.push(...await api.boiteRelever(a.id)); } catch { /* hors-ligne / réseau */ }
  }
  return recus;
}

/** « M. Dupont vous a envoyé une séquence « X » ». */
export function messageRecu(r: BoiteItem): string {
  const type = LIBELLE[r.type] ?? "élément";
  const article = r.type === "projet" ? "un" : "une";
  const titre = r.titre ? ` « ${r.titre} »` : "";
  return `${r.deNom || "Un ami"} vous a envoyé ${article} ${type}${titre}`;
}
