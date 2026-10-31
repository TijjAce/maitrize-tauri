import React from "react";

// ── Des questions posées une à une, comme une conversation ─────────────────
//
// Demande de l'enseignant (31 octobre 2026), pour remplacer la bande « Ou
// partir de » des lotos : « sous forme de chatbot qui pose les questions […]
// avec un ou plusieurs choix, puis question suivante ». Chaque question a son
// étiquette et ses choix — un clic, ou le chiffre du choix au clavier,
// répond ; quand plusieurs choix vont ensemble, on les coche puis on valide —,
// parfois « Autre » à écrire. La réponse se range en pastille, au-dessus, et
// la question suivante vient. Une réponse se change d'un clic sur sa
// pastille : on revient à sa question. L'atelier décide des questions et de
// ce que fait chaque réponse.

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
  /** Plusieurs choix à la fois : on les coche, puis « Valider » répond avec leurs identifiants, séparés par des virgules — et par un vide, si `aucun` permet de n'en cocher aucun. */
  plusieurs?: { coches: string[]; aucun?: boolean };
  /** Une réponse à écrire, quand aucun choix ne convient : un nombre, ou un texte. */
  autre?: { placeholder: string; nombre?: { min: number; max: number } };
}

export function QuestionsGuidees({ titre, questions, reponses, onRepondre, onRevenir, fin }: {
  titre: string;
  questions: QuestionGuidee[];
  /** Ce qu'on a répondu à chaque question, tel qu'on l'affiche. */
  reponses: Record<string, string>;
  onRepondre: (question: string, choix: string, texte?: string) => void;
  /** Revenir à une question pour changer sa réponse. */
  onRevenir: (question: string) => void;
  /** Le dernier message, quand tout est répondu. */
  fin?: React.ReactNode;
}) {
  const courante = questions.find((q) => reponses[q.id] === undefined);
  // Toutes les réponses, même celles qui suivent une question qu'on a rouverte.
  const repondues = questions.filter((q) => reponses[q.id] !== undefined);
  const [texte, setTexte] = React.useState("");
  // Les choix cochés d'une question à plusieurs choix : ceux de départ, puis ceux qu'on coche.
  const [coches, setCoches] = React.useState<string[]>([]);
  React.useEffect(() => { setTexte(""); setCoches(courante?.plusieurs?.coches ?? []); }, [courante?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cocher = (id: string) => setCoches((avant) => (avant.includes(id) ? avant.filter((x) => x !== id) : [...avant, id]));
  const autre = courante?.autre;
  const valeurAutre = autre?.nombre ? Number(texte) : NaN;
  const autreValable = !!autre && texte.trim() !== "" && (!autre.nombre || (Number.isInteger(valeurAutre) && valeurAutre >= autre.nombre.min && valeurAutre <= autre.nombre.max));
  const repondreAutre = () => { if (courante && autreValable) onRepondre(courante.id, "autre", texte.trim()); };
  // Le chiffre d'un choix y répond, hors d'un champ où l'on écrit.
  const auClavier = (e: React.KeyboardEvent) => {
    if (!courante || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest("input, textarea")) return;
    const n = Number(e.key);
    const c = Number.isInteger(n) && n >= 1 ? courante.choix[n - 1] : undefined;
    if (!c || c.bouton) return;
    e.preventDefault();
    if (courante.plusieurs) cocher(c.id); else onRepondre(courante.id, c.id);
  };
  return (
    <div className="qg" role="group" aria-label={titre} onKeyDown={auClavier}>
      <div className="qg-tete">
        <span className="qg-titre">💬 {titre}</span>
      </div>
      {repondues.length > 0 && (
        <div className="qg-faites">
          {repondues.map((q) => (
            <button key={q.id} type="button" className="qg-fait" title={`${q.titre} — changer cette réponse`} onClick={() => onRevenir(q.id)}>
              <span className="qg-puce">{q.puce}</span>{reponses[q.id]}
            </button>
          ))}
        </div>
      )}
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
              if (c.bouton) return <React.Fragment key={c.id}>{c.bouton({ className: "qg-carte", contenu })}</React.Fragment>;
              const coche = coches.includes(c.id);
              return courante.plusieurs
                ? <button key={c.id} type="button" className={`qg-carte${coche ? " coche" : ""}`} aria-pressed={coche} onClick={() => cocher(c.id)}>{contenu}</button>
                : <button key={c.id} type="button" className="qg-carte" onClick={() => onRepondre(courante.id, c.id)}>{contenu}</button>;
            })}
          </div>
          {courante.plusieurs && (
            <div className="qg-valider">
              <button type="button" className="btn sm primary" disabled={!coches.length && !courante.plusieurs.aucun} onClick={() => onRepondre(courante.id, coches.join(","))}>Valider</button>
            </div>
          )}
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
