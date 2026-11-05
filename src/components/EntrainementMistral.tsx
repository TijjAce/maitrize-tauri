import { Aide } from "./Aide";

// ── L'entraînement des modèles de Mistral ─────────────────────────────────
//
// Mistral peut se servir des demandes pour entraîner ses modèles tant qu'on
// ne s'y oppose pas ; pour l'API sous abonnement, son centre d'aide
// (septembre 2026) ne dit pas le réglage de départ. L'opposition se fait dans
// son panneau d'administration, pas par l'API : l'avertissement reste en vue
// jusqu'à ce que l'enseignant dise l'avoir faite.

export function EntrainementACouper({ onFait }: { onFait: () => void }) {
  return (
    <div role="alert" style={{ border: "1px solid var(--danger, #ef4444)", borderRadius: 10, padding: "10px 12px", margin: "0 0 14px", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <b>⚠️ Interdisez à Mistral d'entraîner ses modèles avec vos demandes</b>
        <Aide titre="L'entraînement des modèles">
          Sans votre opposition, ce que Maitrize envoie à Mistral peut servir à améliorer ses modèles : Mistral ne dit
          pas si le réglage est coupé d'office avec un abonnement. Il y a deux réglages séparés : l'un pour l'API, celle
          de Maitrize, l'autre pour Vibe. Les modèles « labs » de Mistral sont toujours entraînés : Maitrize n'en propose aucun.
        </Aide>
      </div>
      <ol style={{ margin: "6px 0 8px", paddingLeft: 20, lineHeight: 1.5 }}>
        <li>Sur admin.mistral.ai, menu Privacy : désactivez « Anonymous improvement data ».</li>
        <li>Si vous utilisez aussi Vibe : Admin › Vibe › Privacy, désactivez « Allow your interactions to be used to train our models ».</li>
      </ol>
      <button className="btn sm" onClick={onFait}>C'est fait</button>
    </div>
  );
}
