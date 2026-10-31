import React from "react";

// ── Des questions posées une à une, comme une conversation ─────────────────
//
// Demande de l'enseignant (31 octobre 2026), pour remplacer la bande « Ou
// partir de » des lotos : « sous forme de chatbot qui pose les questions […]
// avec un ou plusieurs choix, puis question suivante ». Chaque question a son
// étiquette et ses choix — un clic, ou le chiffre du choix au clavier,
// répond —, parfois « Autre » à écrire. La réponse se range à droite, et la
// question suivante vient. Une réponse se change d'un clic : on revient à sa
// question. L'atelier décide des questions et de ce que fait chaque réponse.

export interface ChoixGuide {
  id: string;
  libelle: string;
  description?: string;
  /** Un bouton à soi à la place de la carte : celui qui ouvre Mes images, par exemple ; il reçoit la classe et le contenu de la carte. */
  bouton?: (carte: { className: string; contenu: React.ReactNode }) => React.ReactNode;
}

export interface QuestionGuidee {
  id: string;
  /** L'étiquette de la question, en un ou deux mots : « Les mots », « Planches ». */
  puce: string;
  titre: string;
  choix: ChoixGuide[];
  /** Une réponse à écrire, quand aucun choix ne convient : un nombre, ou un texte. */
  autre?: { placeholder: string; nombre?: { min: number; max: number } };
}

export function QuestionsGuidees({ titre, questions, reponses, onRepondre, onRevenir, fin, onFermer }: {
  titre: string;
  questions: QuestionGuidee[];
  /** Ce qu'on a répondu à chaque question, tel qu'on l'affiche. */
  reponses: Record<string, string>;
  onRepondre: (question: string, choix: string, texte?: string) => void;
  /** Revenir à une question pour changer sa réponse. */
  onRevenir: (question: string) => void;
  /** Le dernier message, quand tout est répondu. */
  fin?: React.ReactNode;
  onFermer?: () => void;
}) {
  const courante = questions.find((q) => reponses[q.id] === undefined);
  const repondues = courante ? questions.slice(0, questions.indexOf(courante)) : questions;
  const [texte, setTexte] = React.useState("");
  React.useEffect(() => { setTexte(""); }, [courante?.id]);
  const autre = courante?.autre;
  const valeurAutre = autre?.nombre ? Number(texte) : NaN;
  const autreValable = !!autre && texte.trim() !== "" && (!autre.nombre || (Number.isInteger(valeurAutre) && valeurAutre >= autre.nombre.min && valeurAutre <= autre.nombre.max));
  const repondreAutre = () => { if (courante && autreValable) onRepondre(courante.id, "autre", texte.trim()); };
  // Le chiffre d'un choix y répond, hors d'un champ où l'on écrit.
  const auClavier = (e: React.KeyboardEvent) => {
    if (!courante || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
    const n = Number(e.key);
    const c = Number.isInteger(n) && n >= 1 ? courante.choix[n - 1] : undefined;
    if (c && !c.bouton) { e.preventDefault(); onRepondre(courante.id, c.id); }
  };
  return (
    <div className="qg" role="group" aria-label={titre} onKeyDown={auClavier}>
      <div className="qg-tete">
        <span className="qg-titre">💬 {titre}</span>
        {onFermer && <button type="button" className="btn ghost sm" onClick={onFermer}>Fermer</button>}
      </div>
      {repondues.map((q) => (
        <React.Fragment key={q.id}>
          <div className="qg-bulle qg-question"><span className="qg-puce">{q.puce}</span>{q.titre}</div>
          <button type="button" className="qg-bulle qg-reponse" title="Changer cette réponse" onClick={() => onRevenir(q.id)}>{reponses[q.id]}</button>
        </React.Fragment>
      ))}
      {courante ? (
        <>
          <div className="qg-bulle qg-question"><span className="qg-puce">{courante.puce}</span>{courante.titre}</div>
          <div className="qg-choix">
            {courante.choix.map((c, i) => {
              const contenu = <>
                <span className="qg-numero" aria-hidden="true">{i + 1}</span>
                <span className="qg-libelle">{c.libelle}</span>
                {c.description && <span className="qg-description">{c.description}</span>}
              </>;
              return c.bouton
                ? <React.Fragment key={c.id}>{c.bouton({ className: "qg-carte", contenu })}</React.Fragment>
                : <button key={c.id} type="button" className="qg-carte" onClick={() => onRepondre(courante.id, c.id)}>{contenu}</button>;
            })}
          </div>
          {autre && (
            <form className="qg-autre" onSubmit={(e) => { e.preventDefault(); repondreAutre(); }}>
              <input className="input" value={texte} placeholder={autre.placeholder} aria-label={autre.placeholder}
                type={autre.nombre ? "number" : "text"} min={autre.nombre?.min} max={autre.nombre?.max} onChange={(e) => setTexte(e.target.value)} />
              <button type="submit" className="btn sm" disabled={!autreValable}>OK</button>
            </form>
          )}
        </>
      ) : fin ? <div className="qg-bulle qg-question qg-fin">{fin}</div> : null}
    </div>
  );
}
