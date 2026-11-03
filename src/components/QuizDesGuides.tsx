import React from "react";
import { api, texteErreur, type DocumentCoffre } from "../api";
import { Empty, Input, Select, Textarea } from "./ui";
import { Aide } from "./Aide";
import { PdfViewer } from "./PdfViewer";
import { ouvrirPdf, textePage } from "../pdfRendu";
import { graineAuHasard } from "../hasard";
import { lireNiveaux } from "../classe";
import { isoJour } from "../dates";
import { nomsAMasquer } from "../nomsAMasquer";
import { pseudonymiser, restaurer } from "../confidentialite";
import {
  CLE_QUIZ_DES_GUIDES, PAGES_ESSAYEES_MAX, PAGES_PAR_SERIE, avecLaSerie, consigneDeCorrection, consigneDuQuiz, cycleDeLaClasse,
  debutDeLaCitation, demandeDeCorrection, demandeDuQuiz, derniereSerie, estUnGuideEnPdf, lireHistorique, lireLaCorrection,
  lireLesQuestions, nettoyerLaPage, pageInterrogeable, pagesAEssayer, pagesDejaVues, pointsDuVerdict, scoreEnClair,
  type Correction, type PageLue, type QuestionDuQuiz, type QuestionOuverte, type SerieFaite, type Verdict,
} from "../quizDesGuides";

// ── Ressources › Quiz des guides ──────────────────────────────────────────
//
// L'IA qui teste l'enseignant sur un guide d'Éduscol (voir quizDesGuides.ts) :
// on choisit le guide, Maitrize en lit quelques pages, Mistral en tire cinq
// questions, et chaque réponse se corrige avec la phrase du guide qui la
// justifie, sa page, et de quoi l'ouvrir à cet endroit.

export interface GuideDuQuiz { titre: string; url: string; categorie: string; sousCategorie: string; source?: string }

/** Une série prête : le guide, son PDF au coffre-fort, les pages lues et leurs questions. */
interface Serie { guide: GuideDuQuiz; coffre: DocumentCoffre; questions: QuestionDuQuiz[]; pages: number[] }

/** La réponse à une question : la proposition choisie, ou ce qu'on a écrit et sa correction. */
type Reponse = { choisie: number } | { ecrite: string; correction: Correction };

const octetsDe = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/** Le guide au coffre-fort, rangé une fois : il y reste, à relire. */
async function guideAuCoffre(g: GuideDuQuiz, dire: (m: string) => void): Promise<DocumentCoffre> {
  const deja = (await api.coffreList()).find((d) => d.nom === g.titre);
  if (deja) return deja;
  dire("Le guide se range dans votre coffre-fort…");
  return api.coffreDownload(g.url, g.titre);
}

/** Quelques pages de texte du guide, lues ici : d'abord celles que les séries d'avant n'ont pas prises. */
async function pagesDuGuide(coffre: DocumentCoffre, dejaVues: number[], graine: number): Promise<PageLue[]> {
  const pdf = await ouvrirPdf(octetsDe(await api.fichierRead(coffre.nomFichier)));
  try {
    const lues: PageLue[] = [];
    for (const numero of pagesAEssayer(pdf.numPages, dejaVues, graine).slice(0, PAGES_ESSAYEES_MAX)) {
      const texte = nettoyerLaPage(await textePage(pdf, numero).catch(() => ""));
      if (pageInterrogeable(texte)) lues.push({ numero, texte });
      if (lues.length >= PAGES_PAR_SERIE) break;
    }
    return lues.sort((a, b) => a.numero - b.numero);
  } finally {
    void pdf.destroy();
  }
}

export function QuizDesGuides({ guides }: { guides: GuideDuQuiz[] }) {
  const enPdf = React.useMemo(() => guides.filter((g) => estUnGuideEnPdf(g.url)), [guides]);
  const categories = React.useMemo(() => [...new Set(enPdf.map((g) => g.categorie))], [enPdf]);
  const [historique, setHistorique] = React.useState<SerieFaite[]>([]);
  const [categorie, setCategorie] = React.useState("");
  const [q, setQ] = React.useState("");
  const [serie, setSerie] = React.useState<Serie | null>(null);
  const [preparation, setPreparation] = React.useState<{ guide: GuideDuQuiz; message: string; erreur?: string } | null>(null);

  // Les séries faites, et d'abord les guides du cycle de la classe.
  React.useEffect(() => {
    let vivant = true;
    void Promise.all([api.settingGet(CLE_QUIZ_DES_GUIDES).catch(() => null), api.settingsAll().catch((): Record<string, string> => ({}))])
      .then(([brut, reglages]) => {
        if (!vivant) return;
        setHistorique(lireHistorique(brut));
        const cycle = cycleDeLaClasse(lireNiveaux(reglages.niveauClasse));
        if (categories.includes(cycle)) setCategorie((c) => c || cycle);
      });
    return () => { vivant = false; };
  }, [categories]);

  const commencer = async (guide: GuideDuQuiz) => {
    setSerie(null);
    const dire = (message: string) => setPreparation({ guide, message });
    try {
      dire("Ouverture du guide…");
      const coffre = await guideAuCoffre(guide, dire);
      dire("Lecture du guide…");
      const graine = graineAuHasard();
      const pages = await pagesDuGuide(coffre, pagesDejaVues(historique, guide.url), graine);
      if (!pages.length) throw new Error("ce guide n'a pas de texte lisible : c'est sans doute un document scanné.");
      dire("Mistral prépare les questions…");
      const brut = await api.mistralChat([
        { role: "system", content: consigneDuQuiz(guide.titre) },
        { role: "user", content: demandeDuQuiz(pages) },
      ], await api.modeleActif(), true);
      const questions = lireLesQuestions(brut, pages, graine);
      if (questions.length < 3) throw new Error("les questions de Mistral ne se vérifiaient pas dans le guide. Réessayez : d'autres pages seront prises.");
      setSerie({ guide, coffre, questions, pages: pages.map((p) => p.numero) });
      setPreparation(null);
    } catch (e) {
      setPreparation({ guide, message: "", erreur: texteErreur(e) });
    }
  };

  const finir = async (s: Serie, points: number) => {
    const fait: SerieFaite = { url: s.guide.url, titre: s.guide.titre, date: isoJour(new Date()), points, sur: s.questions.length, pages: s.pages };
    // Relu juste avant d'écrire : une série finie ailleurs entre-temps n'est pas perdue.
    const suite = avecLaSerie(lireHistorique(await api.settingGet(CLE_QUIZ_DES_GUIDES).catch(() => null)), fait);
    setHistorique(suite);
    await api.settingSet(CLE_QUIZ_DES_GUIDES, JSON.stringify(suite)).catch(() => {});
  };

  if (serie) {
    return <SerieEnCours key={serie.pages.join(",") + serie.questions[0]?.question} serie={serie} onFinir={(points) => finir(serie, points)}
      onEncore={() => commencer(serie.guide)} onRetour={() => setSerie(null)} />;
  }

  if (preparation) {
    return (
      <div className="card quiz-preparation">
        <h3 style={{ marginTop: 0 }}>{preparation.guide.titre}</h3>
        {preparation.erreur
          ? <>
              <p className="quiz-erreur">Le test n'a pas pu se préparer : {preparation.erreur}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" onClick={() => commencer(preparation.guide)}>Réessayer</button>
                <button className="btn" onClick={() => setPreparation(null)}>← Les guides</button>
              </div>
            </>
          : <p className="meta">⏳ {preparation.message}</p>}
      </div>
    );
  }

  const cherche = q.trim().toLowerCase();
  // Un même guide est rangé sous plusieurs cycles : il ne vient qu'une fois.
  const filtres = enPdf.filter((g) => (!categorie || g.categorie === categorie)
    && (!cherche || [g.titre, g.sousCategorie, g.source ?? ""].some((x) => x.toLowerCase().includes(cherche))))
    .filter((g, i, liste) => liste.findIndex((x) => x.url === g.url) === i);
  const auHasard = () => { if (filtres.length) void commencer(filtres[Math.floor(Math.random() * filtres.length)]); };

  return (
    <>
      <div className="toolbar">
        <Input className="search" placeholder="Rechercher un guide…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ width: "auto" }} aria-label="Catégorie des guides">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Aide titre="Le quiz des guides">
          <p>Choisissez un guide : il se range dans votre coffre-fort, et Maitrize en lit quelques pages au hasard, sur cet ordinateur.
            Mistral en tire cinq questions — quatre à choix, une ouverte — sur ce que le guide recommande et comment le faire en classe.</p>
          <p>Chaque correction cite la phrase du guide qui la justifie, avec sa page : Maitrize vérifie qu'elle y est bien, et écarte
            une question dont la citation n'y est pas. La série suivante prend d'autres pages.</p>
          <p>Les pages du guide partent chez Mistral telles quelles : c'est un texte public. Votre réponse à la question ouverte part
            sans les prénoms de vos élèves.</p>
        </Aide>
        <div className="spacer" />
        <button className="btn" onClick={auHasard} disabled={!filtres.length}>🎲 Un guide au hasard</button>
      </div>
      {filtres.length === 0 ? <Empty icone="📘" titre="Aucun guide" /> : filtres.map((g) => {
        const derniere = derniereSerie(historique, g.url);
        return (
          <div key={g.url} className="list-row">
            <span aria-hidden>📘</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title">{g.titre}</div>
              <div className="meta">{[g.categorie, g.sousCategorie].join(" · ")}</div>
            </div>
            {derniere && <span className="chip" title={`Dernière série, le ${derniere.date.split("-").reverse().join("/")}`}>{scoreEnClair(derniere.points, derniere.sur)}</span>}
            <button className="btn sm primary" onClick={() => commencer(g)}>Me tester</button>
          </div>
        );
      })}
    </>
  );
}

/** Ce qu'une réponse rapporte : une proposition juste, ou la correction de la question ouverte. */
function pointsDe(q: QuestionDuQuiz, r: Reponse | undefined): number {
  if (!r) return 0;
  if ("choisie" in r) return q.sorte === "choix" && r.choisie === q.bonne ? 1 : 0;
  return pointsDuVerdict(r.correction.verdict);
}

const VERDICTS: Record<Verdict, { icone: string; dit: string }> = {
  juste: { icone: "✓", dit: "Juste" }, "en partie": { icone: "½", dit: "En partie" }, "à revoir": { icone: "✗", dit: "À revoir" },
};

function SerieEnCours({ serie, onFinir, onEncore, onRetour }: {
  serie: Serie; onFinir: (points: number) => void; onEncore: () => void; onRetour: () => void;
}) {
  const { guide, coffre, questions } = serie;
  const [rang, setRang] = React.useState(0);
  const [reponses, setReponses] = React.useState<Record<number, Reponse>>({});
  const [fini, setFini] = React.useState(false);
  const [voir, setVoir] = React.useState<{ page: number; chercher: string } | null>(null);
  const repondre = (i: number, r: Reponse) => setReponses((s) => (s[i] ? s : { ...s, [i]: r }));
  const points = questions.reduce((n, q, i) => n + pointsDe(q, reponses[i]), 0);
  const terminer = () => { setFini(true); onFinir(points); };
  const voirDansLeGuide = (q: QuestionDuQuiz) => setVoir({ page: q.page, chercher: debutDeLaCitation(q.citation) });

  const visionneuse = voir && (
    <PdfViewer nomFichier={coffre.nomFichier} titre={guide.titre} page={voir.page} chercher={voir.chercher} onClose={() => setVoir(null)} />
  );

  if (fini) {
    return (
      <div className="card quiz">
        {visionneuse}
        <div className="quiz-tete">
          <button className="btn ghost sm" onClick={onRetour}>← Les guides</button>
          <b className="quiz-titre">{guide.titre}</b>
        </div>
        <div className="quiz-score">{scoreEnClair(points, questions.length)}</div>
        {questions.map((q, i) => {
          const p = pointsDe(q, reponses[i]);
          const verdict: Verdict = p === 1 ? "juste" : p > 0 ? "en partie" : "à revoir";
          return (
            <div key={i} className={`quiz-bilan quiz-${verdict === "juste" ? "juste" : verdict === "en partie" ? "partie" : "faux"}`}>
              <span className="quiz-bilan-icone" aria-label={VERDICTS[verdict].dit}>{VERDICTS[verdict].icone}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div>{q.question}</div>
                {verdict !== "juste" && <>
                  <div className="meta">{q.sorte === "choix" ? `La bonne réponse : ${q.propositions[q.bonne]}` : `Attendu : ${q.attendu}`}</div>
                  <Citation q={q} onVoir={() => voirDansLeGuide(q)} />
                </>}
              </div>
            </div>
          );
        })}
        <div className="quiz-pied">
          <button className="btn primary" onClick={onEncore}>🔁 Une autre série sur ce guide</button>
          <button className="btn" onClick={onRetour}>← Choisir un autre guide</button>
        </div>
      </div>
    );
  }

  const q = questions[rang];
  const r = reponses[rang];
  const derniere = rang === questions.length - 1;
  return (
    <div className="card quiz">
      {visionneuse}
      <div className="quiz-tete">
        <button className="btn ghost sm" onClick={onRetour}>← Les guides</button>
        <b className="quiz-titre">{guide.titre}</b>
        <span className="meta">Question {rang + 1} sur {questions.length}</span>
      </div>
      <p className="quiz-question">{q.question}</p>
      {q.sorte === "choix"
        ? <QuestionAChoix q={q} choisie={r && "choisie" in r ? r.choisie : null} onChoisir={(i) => repondre(rang, { choisie: i })}
            onVoir={() => voirDansLeGuide(q)} />
        : <QuestionOuverteEnCours key={rang} q={q} titre={guide.titre} correction={r && "correction" in r ? r : null}
            onCorrigee={(ecrite, correction) => repondre(rang, { ecrite, correction })} onVoir={() => voirDansLeGuide(q)} />}
      {r && (
        <div className="quiz-pied">
          {derniere
            ? <button className="btn primary" onClick={terminer}>Voir le résultat</button>
            : <button className="btn primary" onClick={() => setRang(rang + 1)}>Question suivante →</button>}
        </div>
      )}
    </div>
  );
}

/** La phrase du guide, sa page, et de quoi l'ouvrir à cet endroit. */
function Citation({ q, onVoir }: { q: QuestionDuQuiz; onVoir: () => void }) {
  return (
    <div className="quiz-citation">
      <blockquote>« {q.citation} »</blockquote>
      <button className="btn ghost sm" onClick={onVoir} title="Ouvrir le guide à ce passage">📄 Page {q.page} du guide</button>
    </div>
  );
}

function QuestionAChoix({ q, choisie, onChoisir, onVoir }: {
  q: Extract<QuestionDuQuiz, { sorte: "choix" }>; choisie: number | null; onChoisir: (i: number) => void; onVoir: () => void;
}) {
  const repondu = choisie !== null;
  return (
    <>
      <div className="quiz-propositions" role="group" aria-label="Les propositions">
        {q.propositions.map((p, i) => {
          const etat = !repondu ? "" : i === q.bonne ? " juste" : i === choisie ? " faux" : " pale";
          return (
            <button key={i} type="button" className={`quiz-proposition${etat}`} disabled={repondu} onClick={() => onChoisir(i)}
              aria-pressed={choisie === i}>
              <span className="quiz-lettre">{String.fromCharCode(65 + i)}</span>{p}
            </button>
          );
        })}
      </div>
      {repondu && (
        <div className={`quiz-retour ${choisie === q.bonne ? "quiz-juste" : "quiz-faux"}`}>
          <b>{choisie === q.bonne ? "✓ Juste." : `✗ La bonne réponse : ${q.propositions[q.bonne]}.`}</b>
          {q.explication && <> {q.explication}</>}
          <Citation q={q} onVoir={onVoir} />
        </div>
      )}
    </>
  );
}

/**
 * La question ouverte : on écrit sa réponse, Mistral la corrige d'après
 * l'attendu et la phrase du guide. Sans Mistral, on se corrige soi-même,
 * l'attendu sous les yeux.
 */
function QuestionOuverteEnCours({ q, titre, correction, onCorrigee, onVoir }: {
  q: QuestionOuverte; titre: string; correction: { ecrite: string; correction: Correction } | null;
  onCorrigee: (ecrite: string, c: Correction) => void; onVoir: () => void;
}) {
  const [ecrite, setEcrite] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [erreur, setErreur] = React.useState("");
  const verifier = async () => {
    setEnCours(true); setErreur("");
    try {
      // Les noms que Maitrize connaît — les élèves, les adultes notés — : une réponse sur un guide n'en a pas d'autres.
      const { texte, table } = pseudonymiser(ecrite, await nomsAMasquer());
      const brut = await api.mistralChat([
        { role: "system", content: consigneDeCorrection(titre) },
        { role: "user", content: demandeDeCorrection(q, texte) },
      ], await api.modeleActif(), true);
      const c = lireLaCorrection(restaurer(brut, table).texte);
      if (!c) throw new Error("la correction ne se lit pas.");
      onCorrigee(ecrite, c);
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setEnCours(false);
    }
  };
  if (correction) {
    const v = correction.correction.verdict;
    return (
      <>
        <div className="quiz-ecrite">{correction.ecrite}</div>
        <div className={`quiz-retour ${v === "juste" ? "quiz-juste" : v === "en partie" ? "quiz-partie" : "quiz-faux"}`}>
          <b>{VERDICTS[v].icone} {VERDICTS[v].dit}.</b>{correction.correction.retour && <> {correction.correction.retour}</>}
          <div className="meta" style={{ marginTop: 6 }}>Attendu : {q.attendu}</div>
          <Citation q={q} onVoir={onVoir} />
        </div>
      </>
    );
  }
  return (
    <>
      <Textarea value={ecrite} onChange={(e) => setEcrite(e.target.value)} rows={3} placeholder="Votre réponse, en une ou deux phrases"
        aria-label="Votre réponse" disabled={enCours} />
      <div className="quiz-pied">
        <button className="btn primary" disabled={!ecrite.trim() || enCours} onClick={verifier}>{enCours ? "⏳ Correction…" : "Vérifier"}</button>
      </div>
      {erreur && (
        <div className="quiz-retour">
          <p className="quiz-erreur" style={{ marginTop: 0 }}>Mistral n'a pas pu corriger : {erreur} Comparez vous-même :</p>
          <div className="meta">Attendu : {q.attendu}</div>
          <Citation q={q} onVoir={onVoir} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {(["juste", "en partie", "à revoir"] as Verdict[]).map((v) => (
              <button key={v} className="btn sm" onClick={() => onCorrigee(ecrite, { verdict: v, retour: "" })}>{VERDICTS[v].icone} {VERDICTS[v].dit}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
