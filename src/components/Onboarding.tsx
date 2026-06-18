import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface Etape { titre: string; phrase: string; ico: string; couleur: string; to?: string }

const ETAPES: Etape[] = [
  { titre: "Bienvenue dans Maitrize V2", ico: "✨", couleur: "#6366f1",
    phrase: "Une visite rapide des espaces que vous utiliserez le plus. Vous pouvez la passer à tout moment." },
  { titre: "Séquences", ico: "📚", couleur: "#6366f1", to: "/sequences",
    phrase: "Tout commence ici. Une séquence regroupe des séances autour d'un objectif. L'IA peut même vous en générer une." },
  { titre: "Planning", ico: "🗓️", couleur: "#a855f7", to: "/planning",
    phrase: "Posez vos créneaux à l'heure exacte, glissez-les, ou générez la semaine depuis votre EDT type." },
  { titre: "Élèves", ico: "👧", couleur: "#f59e0b", to: "/eleves",
    phrase: "Faites l'appel en un clic, suivez les présences, notez vos observations et vos évaluations." },
  { titre: "Réglages", ico: "⚙️", couleur: "#14b8a6", to: "/reglages",
    phrase: "Ajoutez votre clé Mistral pour l'assistant, votre niveau de classe et votre zone de vacances." },
];

export function Onboarding() {
  const nav = useNavigate();
  const [visible, setVisible] = React.useState(false);
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    api.settingGet("onboardingVu").then((v) => { if (!v) setVisible(true); });
  }, []);

  const fermer = () => { api.settingSet("onboardingVu", "1"); setVisible(false); };
  if (!visible) return null;
  const e = ETAPES[i];

  return (
    <div className="overlay" style={{ zIndex: 200 }}>
      <div className="modal" style={{ maxWidth: 460, textAlign: "center" }}>
        <div style={{ padding: "34px 28px 20px" }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", margin: "0 auto 16px",
            background: e.couleur + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{e.ico}</div>
          <h2 style={{ margin: "0 0 10px" }}>{e.titre}</h2>
          <p style={{ color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>{e.phrase}</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", margin: "20px 0" }}>
            {ETAPES.map((_, k) => <span key={k} style={{ width: 7, height: 7, borderRadius: "50%",
              background: k === i ? e.couleur : "var(--border)" }} />)}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={fermer}>Passer</button>
          <div className="spacer" />
          {i > 0 && <button className="btn" onClick={() => setI(i - 1)}>Précédent</button>}
          {e.to && <button className="btn" onClick={() => { nav(e.to!); }}>Aller voir</button>}
          {i < ETAPES.length - 1
            ? <button className="btn primary" onClick={() => setI(i + 1)}>Suivant</button>
            : <button className="btn primary" onClick={fermer}>Commencer</button>}
        </div>
      </div>
    </div>
  );
}
