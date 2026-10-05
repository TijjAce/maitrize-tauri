import { teinteSequence } from "../api";
import { avancement, descriptionEtat, libelleDuSuivi, type SuiviSequence } from "../suiviSequences";

// Ce qu'on montre du suivi d'une séquence : la pastille de son état, et la
// ligne complète — état, avancement, prochaine séance — dans une liste.

/** La pastille : « 🟢 En classe », « ✏️ En préparation », « ⏸ En pause », « ✅ Terminée ». */
export function BadgeSuivi({ suivi, aujourdHui, petit = false }: { suivi: SuiviSequence; aujourdHui?: string; petit?: boolean }) {
  const d = descriptionEtat(suivi.etat);
  return (
    <span className={`suivi-etat ${suivi.etat}${petit ? " petit" : ""}`} title={aujourdHui ? libelleDuSuivi(suivi, aujourdHui) : d.nom}>
      {d.ico} {d.nom}
    </span>
  );
}

/** Une séquence dans une liste de suivi : sa couleur, son titre, où elle en est, et de quoi y aller. */
export function LigneSuivi({ suivi, aujourdHui, onOuvrir, onJournal }: {
  suivi: SuiviSequence; aujourdHui: string;
  onOuvrir: () => void;
  /** Ouvrir le cahier journal au jour qui convient : la prochaine séance, ou aujourd'hui pour en poser une. */
  onJournal?: (iso: string) => void;
}) {
  const s = suivi.sequence;
  const enClasse = suivi.etat === "classe" || suivi.etat === "pause";
  const sansSuite = enClasse && !suivi.prochain;
  return (
    <div className="list-row" style={{ cursor: "pointer", marginBottom: 6, alignItems: "center" }} onClick={onOuvrir}>
      <span className="dot" style={{ width: 10, height: 10, borderRadius: 3, flex: "none", background: teinteSequence(s) }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="title" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span>{s.titre || "Sans titre"}</span>
          <BadgeSuivi suivi={suivi} />
        </div>
        <div className="meta">
          {[s.matiere, s.periode ? `P${s.periode}` : ""].filter(Boolean).join(" · ")}
          {" · "}
          {sansSuite ? (
            <>
              {libelleDuSuivi(suivi, aujourdHui).replace(" · aucune séance posée", "")}
              {" · "}<span className="suivi-alerte">aucune séance posée</span>
            </>
          ) : libelleDuSuivi(suivi, aujourdHui)}
        </div>
        {enClasse && suivi.prevues > 0 && (
          <div className="suivi-barre" style={{ marginTop: 6, maxWidth: 260 }} aria-label={`${suivi.faites.length} séances faites sur ${suivi.prevues}`}>
            <span style={{ width: `${Math.round(avancement(suivi) * 100)}%` }} />
          </div>
        )}
      </div>
      {onJournal && enClasse && (
        <button type="button" className="btn ghost sm" onClick={(e) => { e.stopPropagation(); onJournal(suivi.prochain?.date ?? aujourdHui); }}
          title={suivi.prochain ? "Ouvrir le cahier journal à la prochaine séance" : "Ouvrir le cahier journal d'aujourd'hui pour poser la séance suivante"}>
          {suivi.prochain ? "📓 Journal" : "📅 Poser"}
        </button>
      )}
    </div>
  );
}
