import { ETAPES_DE_L_AGENT, partFaite, type AvancementDeLAgent } from "../agentSynthese";

/**
 * L'agent de synthèse au travail : un petit chat avance sur la barre, laisse
 * une empreinte à chaque source lue, et dit ce qu'il lit ; dessous, les
 * étapes faites et ce que chacune a trouvé (demande de l'enseignant,
 * octobre 2026). Voir agentSynthese.ts.
 */
export function AgentDeSynthese({ avancement, redaction, prenom, fini, onArreter, onFermer }: {
  avancement: AvancementDeLAgent;
  /** De 0 à 1 : où en est la rédaction, le temps que Mistral réponde. */
  redaction: number;
  prenom: string;
  /** Le mot de la fin, quand l'agent a fini (ou s'est arrêté) ; vide pendant qu'il travaille. */
  fini: string;
  onArreter: () => void;
  onFermer: () => void;
}) {
  const total = ETAPES_DE_L_AGENT.length;
  const part = partFaite(avancement.etape, redaction);
  const enCours = avancement.etape < total ? ETAPES_DE_L_AGENT[avancement.etape] : null;
  return (
    <div className={`agent${fini ? " agent-fini" : ""}`}>
      <div className="agent-piste" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(part * 100)}
        aria-label={`L'agent de synthèse : ${Math.round(part * 100)} %`}>
        <div className="agent-barre"><div className="agent-rempli" style={{ width: `${part * 100}%` }} /></div>
        {ETAPES_DE_L_AGENT.slice(0, Math.min(avancement.etape, total - 1)).map((e, i) => (
          <span key={e.id} className="agent-empreinte" style={{ left: `${partFaite(i + 1) * 100}%` }} aria-hidden="true">🐾</span>
        ))}
        <span className="agent-chat" style={{ left: `${part * 100}%` }} aria-hidden="true">🐈</span>
      </div>
      <div className="agent-ligne">
        <span className="agent-dit">
          {fini || (enCours ? `Le chat ${enCours.enCours}${enCours.id === "redaction" ? ` de ${prenom}` : ""}…` : "")}
        </span>
        {fini
          ? <button type="button" className="btn ghost sm" onClick={onFermer}>Fermer</button>
          : <button type="button" className="btn ghost sm" onClick={onArreter}>Arrêter</button>}
      </div>
      <ol className="agent-etapes">
        {ETAPES_DE_L_AGENT.map((e, i) => {
          const fait = i < avancement.etape;
          const n = avancement.trouves[e.id];
          return (
            <li key={e.id} className={fait ? "fait" : i === avancement.etape && !fini ? "en-cours" : ""}>
              <span aria-hidden="true">{fait ? "✓" : i === avancement.etape && !fini ? "•" : "·"}</span>
              {e.libelle}
              {fait && e.id !== "redaction" && <small>{n ? n : "rien"}</small>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
