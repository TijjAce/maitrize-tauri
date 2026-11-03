import React from "react";
import { api, texteErreur, type DocumentCoffre } from "../api";
import { Empty, Input, PageVisibleContext, Select, Textarea } from "./ui";
import { Aide } from "./Aide";
import { PdfViewer } from "./PdfViewer";
import { toast } from "./Toaster";
import { ouvrirPdf, textesDeLaPage, type DocumentPdf } from "../pdfRendu";
import { graineAuHasard, hasard } from "../hasard";
import { lireNiveaux } from "../classe";
import { isoJour } from "../dates";
import { nomsAMasquer } from "../nomsAMasquer";
import { pseudonymiser, restaurer } from "../confidentialite";
import {
  CLE_A_REVOIR, CLE_QUIZ_DES_GUIDES, PAGES_ESSAYEES_MAX, PAGES_PAR_SERIE, QUESTIONS_PAR_SERIE, apresLaReponse, avecLaSerie,
  consigneDeCorrection, consigneDeVerification, consigneDuQuiz, couvertureDuGuide, demandeDeVerification, questionsFideles, cycleDeLaClasse, debutDeLaCitation, demandeDeCorrection, demandeDuQuiz,
  avecLeursNumeros, decalageImprime, derniereSerie, estUnGuideEnPdf, fichesDues, lireARevoir, lireHistorique, lireLaCorrection, lireLesQuestions, melangee, nettoyerLaPage,
  pageInterrogeable, pagesAEssayer, pagesDejaVues, pagesDuTheme, pointsDuVerdict, progresDuQuiz, sansLaQuestion, scoreEnClair,
  type Correction, type FicheARevoir, type PageLue, type QuestionAChoix, type QuestionDuQuiz, type QuestionOuverte, type SerieFaite, type Verdict,
} from "../quizDesGuides";

// ── Ressources › Quiz des guides ──────────────────────────────────────────
//
// L'IA qui teste l'enseignant sur un guide d'Éduscol (voir quizDesGuides.ts) :
// on choisit le guide — et, si l'on veut, un thème à y réviser —, Maitrize
// en lit quelques pages, Mistral en tire cinq questions, et chaque réponse se
// corrige avec la phrase du guide qui la justifie, sa page, et de quoi
// l'ouvrir à cet endroit. Les questions manquées reviennent dans « À revoir »,
// d'un guide ou de plusieurs ; une question mal posée s'écarte.
// Au clavier : A à D (ou 1 à 4) pour répondre, Entrée pour continuer,
// ⌘ Entrée pour faire corriger la réponse écrite.

export interface GuideDuQuiz { titre: string; url: string; categorie: string; sousCategorie: string; source?: string }
type GuideCite = { titre: string; url: string };

/** Une question de la série, avec le guide d'où elle vient : une série à revoir en mêle plusieurs. */
interface QuestionDeLaSerie { guide: GuideCite; q: QuestionDuQuiz }

/** Une série prête : celle d'un guide — ses pages lues, son nombre de pages, le thème révisé — ou celle des questions à revoir. */
interface Serie { titre: string; questions: QuestionDeLaSerie[]; guide?: GuideDuQuiz; theme?: string; pages?: number[]; total?: number }

/** La réponse à une question : la proposition choisie, ce qu'on a écrit et sa correction, ou « Je ne sais pas ». */
type Reponse = { choisie: number } | { ecrite: string; correction: Correction } | { passe: true };

const octetsDe = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const aujourdhui = () => isoJour(new Date());
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Le guide au coffre-fort, rangé une fois : il y reste, à relire. */
async function guideAuCoffre(g: GuideDuQuiz, dire: (m: string) => void): Promise<DocumentCoffre> {
  const deja = (await api.coffreList()).find((d) => d.nom === g.titre);
  if (deja) return deja;
  dire("Le guide se range dans votre coffre-fort…");
  return api.coffreDownload(g.url, g.titre);
}

/** Le texte de toutes les pages d'un guide, lu une fois par visite : un thème s'y cherche partout. */
const textesLus = new Map<string, PageLue[]>();

/** Le numéro imprimé de chaque page, quand le PDF le donne et qu'il diffère de son rang. */
async function etiquettesDuGuide(pdf: DocumentPdf): Promise<(string | undefined)[]> {
  const etiquettes = await pdf.getPageLabels().catch(() => null);
  return Array.from({ length: pdf.numPages }, (_, i) => {
    const e = etiquettes?.[i]?.trim();
    return e && e !== String(i + 1) ? e : undefined;
  });
}

/** Une page lue : son texte tel qu'on le lit, celui que voit la recherche du lecteur, son numéro imprimé. */
async function lirePage(pdf: DocumentPdf, numero: number, etiquette?: string): Promise<PageLue> {
  const { suivi, brut } = await textesDeLaPage(pdf, numero).catch(() => ({ suivi: "", brut: "" }));
  return { numero, texte: nettoyerLaPage(suivi), brut, ...(etiquette ? { etiquette } : {}) };
}

async function toutesLesPages(coffre: DocumentCoffre, dire: (m: string) => void, quoi: string): Promise<PageLue[]> {
  const deja = textesLus.get(coffre.nomFichier);
  if (deja) return deja;
  const pdf = await ouvrirPdf(octetsDe(await api.fichierRead(coffre.nomFichier)));
  try {
    const etiquettes = await etiquettesDuGuide(pdf);
    const toutes: PageLue[] = [];
    for (let numero = 1; numero <= pdf.numPages; numero++) {
      if (numero % 10 === 1) dire(`Recherche de « ${quoi} » dans le guide… page ${numero} sur ${pdf.numPages}`);
      toutes.push(await lirePage(pdf, numero, etiquettes[numero - 1]));
    }
    // Le numéro imprimé de chaque page, quand le PDF ne le donne pas : lu en tête ou en pied de toutes ses pages.
    const numerotees = avecLeursNumeros(toutes, decalageImprime(toutes));
    textesLus.set(coffre.nomFichier, numerotees);
    return numerotees;
  } finally {
    void pdf.destroy();
  }
}

/**
 * Quelques pages de texte du guide, lues ici, et son nombre de pages. Sans
 * thème : au hasard, d'abord celles que les séries d'avant n'ont pas prises.
 * Avec un thème : celles qui en parlent, parmi toutes.
 */
async function pagesDuGuide(coffre: DocumentCoffre, dejaVues: number[], graine: number, theme: string, dire: (m: string) => void): Promise<{ pages: PageLue[]; total: number }> {
  const sujet = theme.trim();
  if (sujet) {
    const toutes = await toutesLesPages(coffre, dire, sujet);
    const choisies = pagesDuTheme(toutes, sujet, dejaVues).slice(0, PAGES_PAR_SERIE);
    if (!choisies.length) throw new Error(`ce guide ne parle pas de « ${sujet} » dans ses pages de texte. Essayez un autre mot, ou sans thème.`);
    return { pages: toutes.filter((p) => choisies.includes(p.numero)), total: toutes.length };
  }
  const pdf = await ouvrirPdf(octetsDe(await api.fichierRead(coffre.nomFichier)));
  try {
    const etiquettes = await etiquettesDuGuide(pdf);
    const lues: PageLue[] = [];
    const essayees: PageLue[] = [];
    for (const numero of pagesAEssayer(pdf.numPages, dejaVues, graine).slice(0, PAGES_ESSAYEES_MAX)) {
      const page = await lirePage(pdf, numero, etiquettes[numero - 1]);
      essayees.push(page);
      if (pageInterrogeable(page.texte)) lues.push(page);
      if (lues.length >= PAGES_PAR_SERIE) break;
    }
    // Le numéro imprimé, lu sur toutes les pages ouvertes : il en faut deux qui s'accordent.
    const decalage = decalageImprime(essayees);
    return { pages: avecLeursNumeros(lues, decalage).sort((a, b) => a.numero - b.numero), total: pdf.numPages };
  } finally {
    void pdf.destroy();
  }
}

export function QuizDesGuides({ guides }: { guides: GuideDuQuiz[] }) {
  const enPdf = React.useMemo(() => guides.filter((g) => estUnGuideEnPdf(g.url)), [guides]);
  const categories = React.useMemo(() => [...new Set(enPdf.map((g) => g.categorie))], [enPdf]);
  const [historique, setHistorique] = React.useState<SerieFaite[]>([]);
  const [aRevoir, setARevoir] = React.useState<FicheARevoir[]>([]);
  const [categorie, setCategorie] = React.useState("");
  const [q, setQ] = React.useState("");
  const [theme, setTheme] = React.useState("");
  const [serie, setSerie] = React.useState<Serie | null>(null);
  const [preparation, setPreparation] = React.useState<{ guide: GuideDuQuiz; theme: string; message: string; erreur?: string } | null>(null);

  // Les séries faites, les questions à revoir, et d'abord les guides du cycle de la classe.
  React.useEffect(() => {
    let vivant = true;
    void Promise.all([
      api.settingGet(CLE_QUIZ_DES_GUIDES).catch(() => null), api.settingGet(CLE_A_REVOIR).catch(() => null),
      api.settingsAll().catch((): Record<string, string> => ({})),
    ]).then(([brut, aRevoirBrut, reglages]) => {
      if (!vivant) return;
      setHistorique(lireHistorique(brut));
      setARevoir(lireARevoir(aRevoirBrut));
      const cycle = cycleDeLaClasse(lireNiveaux(reglages.niveauClasse));
      if (categories.includes(cycle)) setCategorie((c) => c || cycle);
    });
    return () => { vivant = false; };
  }, [categories]);

  const commencer = async (guide: GuideDuQuiz, sujet = "") => {
    setSerie(null);
    const leTheme = sujet.replace(/\s+/g, " ").trim();
    const dire = (message: string) => setPreparation({ guide, theme: leTheme, message });
    try {
      dire("Ouverture du guide…");
      const coffre = await guideAuCoffre(guide, dire);
      const vues = pagesDejaVues(historique, guide.url);
      let questions: QuestionDuQuiz[] = [];
      let lues: PageLue[] = [];
      let total = 0;
      // Trop peu de questions qui se vérifient : une seconde demande, sur d'autres pages, avant de renoncer.
      for (let essai = 0; essai < 2 && questions.length < 3; essai++) {
        dire(essai ? "Mistral reprend, sur d'autres pages…" : "Lecture du guide…");
        const graine = graineAuHasard();
        const lu = await pagesDuGuide(coffre, [...vues, ...lues.map((p) => p.numero)], graine, leTheme, dire);
        if (!lu.pages.length) throw new Error("ce guide n'a pas de texte lisible : c'est sans doute un document scanné.");
        lues = lu.pages;
        total = lu.total;
        if (!essai) dire("Mistral prépare les questions…");
        const brut = await api.mistralChat([
          { role: "system", content: consigneDuQuiz(guide.titre, QUESTIONS_PAR_SERIE, leTheme) },
          { role: "user", content: demandeDuQuiz(lu.pages) },
        ], await api.modeleActif(), true);
        questions = lireLesQuestions(brut, lu.pages, graine);
        // Puis Mistral relit le test, page en main : il écarte toute question qui invente un détail.
        if (questions.length >= 3) {
          dire("Relecture des questions, page en main…");
          const relu = await api.mistralChat([
            { role: "system", content: consigneDeVerification(guide.titre) },
            { role: "user", content: demandeDeVerification(lu.pages, questions) },
          ], await api.modeleActif(), true);
          questions = questionsFideles(relu, questions);
        }
      }
      if (questions.length < 3) throw new Error("les questions de Mistral ne se vérifiaient pas dans le guide. Réessayez : d'autres pages seront prises.");
      const cite = { titre: guide.titre, url: guide.url };
      setSerie({
        titre: guide.titre, guide, questions: questions.map((x) => ({ guide: cite, q: x })), pages: lues.map((p) => p.numero), total,
        ...(leTheme ? { theme: leTheme } : {}),
      });
      setPreparation(null);
    } catch (e) {
      setPreparation({ guide, theme: leTheme, message: "", erreur: texteErreur(e) });
    }
  };

  /** Les questions dont c'est le jour, d'un guide ou de plusieurs : leurs propositions dans un nouvel ordre. */
  const revoir = () => {
    const r = hasard(graineAuHasard());
    const dues = fichesDues(aRevoir, aujourdhui()).slice(0, QUESTIONS_PAR_SERIE);
    if (!dues.length) return;
    setPreparation(null);
    setSerie({ titre: "Mes questions à revoir", questions: dues.map((f) => ({ guide: f.guide, q: f.question.sorte === "choix" ? melangee(f.question, r) : f.question })) });
  };

  /** La série finie : les questions à revoir suivent les réponses — une question écartée s'en va —, et le guide garde son score. */
  const finir = async (s: Serie, points: number[], ecartees: number[]) => {
    const jour = aujourdhui();
    // Relus juste avant d'écrire : une série finie ailleurs entre-temps n'est pas perdue.
    const [historiqueBrut, aRevoirBrut] = await Promise.all([
      api.settingGet(CLE_QUIZ_DES_GUIDES).catch(() => null), api.settingGet(CLE_A_REVOIR).catch(() => null),
    ]);
    const fiches = s.questions.reduce((f, x, i) => (ecartees.includes(i)
      ? sansLaQuestion(f, x.guide.url, x.q.question)
      : apresLaReponse(f, x.guide, x.q, points[i] ?? 0, jour)), lireARevoir(aRevoirBrut));
    setARevoir(fiches);
    await api.settingSet(CLE_A_REVOIR, JSON.stringify(fiches)).catch(() => {});
    const comptees = s.questions.map((_, i) => i).filter((i) => !ecartees.includes(i));
    if (!s.guide || !comptees.length) return;
    const fait: SerieFaite = {
      url: s.guide.url, titre: s.guide.titre, date: jour, points: comptees.reduce((n, i) => n + (points[i] ?? 0), 0), sur: comptees.length,
      pages: s.pages ?? [], ...(s.total ? { total: s.total } : {}),
    };
    const suite = avecLaSerie(lireHistorique(historiqueBrut), fait);
    setHistorique(suite);
    await api.settingSet(CLE_QUIZ_DES_GUIDES, JSON.stringify(suite)).catch(() => {});
  };

  const dues = fichesDues(aRevoir, aujourdhui()).length;

  if (serie) {
    const guide = serie.guide;
    return <SerieEnCours key={`${serie.titre}|${serie.questions.map((x) => x.q.question).join("|")}`} serie={serie} dues={dues}
      onFinir={(points, ecartees) => finir(serie, points, ecartees)} onEncore={guide ? () => commencer(guide, serie.theme) : undefined}
      onRevoir={revoir} onRetour={() => setSerie(null)} />;
  }

  if (preparation) {
    return (
      <div className="card quiz-preparation">
        <h3 style={{ marginTop: 0 }}>{preparation.guide.titre}{preparation.theme && <span className="chip quiz-theme">🎯 {preparation.theme}</span>}</h3>
        {preparation.erreur
          ? <>
              <p className="quiz-erreur">Le test n'a pas pu se préparer : {preparation.erreur}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn primary" onClick={() => commencer(preparation.guide, preparation.theme)}>Réessayer</button>
                <button className="btn" onClick={() => setPreparation(null)}>← Les guides</button>
              </div>
            </>
          : <p className="meta" aria-live="polite">⏳ {preparation.message}</p>}
      </div>
    );
  }

  const cherche = q.trim().toLowerCase();
  // Un même guide est rangé sous plusieurs cycles : il ne vient qu'une fois.
  const filtres = enPdf.filter((g) => (!categorie || g.categorie === categorie)
    && (!cherche || [g.titre, g.sousCategorie, g.source ?? ""].some((x) => x.toLowerCase().includes(cherche))))
    .filter((g, i, liste) => liste.findIndex((x) => x.url === g.url) === i);
  const sujet = theme.replace(/\s+/g, " ").trim();
  const auHasard = () => { if (filtres.length) void commencer(filtres[Math.floor(Math.random() * filtres.length)], sujet); };
  const plusTard = aRevoir.length - dues;
  const progres = progresDuQuiz(historique, aRevoir);

  return (
    <>
      <div className="toolbar">
        <Input className="search" placeholder="Rechercher un guide…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ width: "auto" }} aria-label="Catégorie des guides">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="🎯 Un thème à réviser (facultatif)" aria-label="Un thème à réviser"
          style={{ maxWidth: 250 }} />
        <Aide titre="Le quiz des guides">
          <p>Choisissez un guide : il se range dans votre coffre-fort, et Maitrize en lit quelques pages au hasard, sur cet ordinateur.
            Mistral en tire cinq questions — quatre à choix, une ouverte — sur ce que le guide recommande et comment le faire en classe.</p>
          <p>Avec un thème (« la fluence », « le vocabulaire »…), Maitrize cherche dans tout le guide les pages qui en parlent, et les
            questions portent sur lui.</p>
          <p>Chaque question est vérifiée deux fois avant d'être posée. Maitrize retrouve dans la page la phrase citée, chaque chiffre,
            et les mots de la question et de la bonne réponse ; puis Mistral relit le test, page en main, et écarte toute question qui
            invente un détail. La correction montre la phrase du guide qui porte la réponse, et ouvre le guide à cet endroit.</p>
          <p>La série suivante prend d'autres pages. Une question qui vous semble encore mal posée s'écarte d'un clic : elle ne
            compte pas, et ne revient pas.</p>
          <p>Une question manquée, ou passée par « Je ne sais pas », revient dans « À revoir » : le jour même, puis trois jours et
            sept jours après chaque bonne réponse, jusqu'à ce qu'elle soit sue.</p>
          <p>Au clavier : A, B, C, D (ou 1 à 4) pour répondre, Entrée pour continuer, ⌘ Entrée pour faire corriger une réponse écrite.</p>
          <p>Les pages du guide partent chez Mistral telles quelles : c'est un texte public. Votre réponse à la question ouverte part
            sans les noms de vos élèves.</p>
        </Aide>
        <div className="spacer" />
        {dues > 0 && (
          <button className="btn primary" onClick={revoir}
            title={`${pluriel(dues, "question")} à revoir aujourd'hui${plusTard > 0 ? ` ; ${plusTard} autre${plusTard > 1 ? "s" : ""} plus tard` : ""}`}>
            🔁 À revoir ({dues})
          </button>
        )}
        <button className="btn" onClick={auHasard} disabled={!filtres.length}>🎲 Un guide au hasard</button>
      </div>
      {progres && (
        <p className="meta quiz-progres">
          {[pluriel(progres.series, "série"), `${progres.pourcentage} % de bonnes réponses`, progres.enRevision ? `${pluriel(progres.enRevision, "question")} en révision` : ""]
            .filter(Boolean).join(" · ")}
        </p>
      )}
      {filtres.length === 0 ? <Empty icone="📘" titre="Aucun guide" /> : filtres.map((g) => {
        const derniere = derniereSerie(historique, g.url);
        const couverture = couvertureDuGuide(historique, g.url);
        return (
          <div key={g.url} className="list-row">
            <span aria-hidden>📘</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="title">{g.titre}</div>
              <div className="meta">
                {[g.categorie, g.sousCategorie, couverture ? `${couverture.vues} page${couverture.vues > 1 ? "s" : ""} travaillée${couverture.vues > 1 ? "s" : ""} sur ${couverture.total}` : ""].filter(Boolean).join(" · ")}
              </div>
            </div>
            {derniere && <span className="chip" title={`Dernière série, le ${derniere.date.split("-").reverse().join("/")}`}>{scoreEnClair(derniere.points, derniere.sur)}</span>}
            <button className="btn sm primary" onClick={() => commencer(g, sujet)} title={sujet ? `Sur « ${sujet} »` : undefined}>
              {sujet ? "🎯 Me tester" : "Me tester"}
            </button>
          </div>
        );
      })}
    </>
  );
}

/** Ce qu'une réponse rapporte : une proposition juste, la correction de la question ouverte ; rien pour « Je ne sais pas ». */
function pointsDe(q: QuestionDuQuiz, r: Reponse | undefined): number {
  if (!r || "passe" in r) return 0;
  if ("choisie" in r) return q.sorte === "choix" && r.choisie === q.bonne ? 1 : 0;
  return pointsDuVerdict(r.correction.verdict);
}

const VERDICTS: Record<Verdict, { icone: string; dit: string }> = {
  juste: { icone: "✓", dit: "Juste" }, "en partie": { icone: "½", dit: "En partie" }, "à revoir": { icone: "✗", dit: "À revoir" },
};

function SerieEnCours({ serie, dues, onFinir, onEncore, onRevoir, onRetour }: {
  serie: Serie; dues: number; onFinir: (points: number[], ecartees: number[]) => void; onEncore?: () => void; onRevoir: () => void; onRetour: () => void;
}) {
  const { questions } = serie;
  const visible = React.useContext(PageVisibleContext);
  const [rang, setRang] = React.useState(0);
  const [reponses, setReponses] = React.useState<Record<number, Reponse>>({});
  const [ecartees, setEcartees] = React.useState<number[]>([]);
  const [fini, setFini] = React.useState(false);
  const [voir, setVoir] = React.useState<{ nomFichier: string; titre: string; page: number; chercher: string } | null>(null);
  const suiteRef = React.useRef<HTMLButtonElement>(null);
  const repondre = (i: number, r: Reponse) => setReponses((s) => (s[i] ? s : { ...s, [i]: r }));
  const ecarter = (i: number) => setEcartees((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i]));
  const points = questions.map((x, i) => pointsDe(x.q, reponses[i]));
  const comptees = questions.map((_, i) => i).filter((i) => !ecartees.includes(i));
  const total = comptees.reduce((n, i) => n + points[i], 0);
  const terminer = () => { setFini(true); onFinir(points, ecartees); };
  const suivante = () => { if (rang === questions.length - 1) terminer(); else setRang(rang + 1); };
  const plusieursGuides = new Set(questions.map((x) => x.guide.url)).size > 1 || !serie.guide;

  // La réponse donnée, la main passe au bouton qui continue : Entrée enchaîne, à la souris comme au clavier.
  const repondue = !!reponses[rang];
  React.useEffect(() => { if (repondue && !voir) suiteRef.current?.focus(); }, [repondue, rang, voir]);

  // Le guide de la question, ouvert à la phrase citée : il est au coffre-fort depuis la série qui l'a posée.
  const voirDansLeGuide = async (x: QuestionDeLaSerie) => {
    const doc = (await api.coffreList().catch((): DocumentCoffre[] => [])).find((d) => d.nom === x.guide.titre);
    if (!doc) { toast("Ce guide n'est plus dans votre coffre-fort.", { icone: "⚠️" }); return; }
    setVoir({ nomFichier: doc.nomFichier, titre: x.guide.titre, page: x.q.page, chercher: x.q.cherche ?? debutDeLaCitation(x.q.citation) });
  };

  // Au clavier : A à D, ou 1 à 4, répondent ; Entrée passe à la suite. Pas pendant qu'on écrit, ni le guide ouvert, ni la page cachée.
  React.useEffect(() => {
    if (!visible || voir || fini) return;
    const touche = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const cible = e.target instanceof HTMLElement ? e.target : null;
      if (cible?.closest("input, textarea, select, a, [contenteditable='true']")) return;
      const x = questions[rang];
      if (!reponses[rang]) {
        if (x.q.sorte !== "choix") return;
        const chiffre = "123456789".indexOf(e.key);
        const i = chiffre >= 0 ? chiffre : e.key.length === 1 ? "abcdefghi".indexOf(e.key.toLowerCase()) : -1;
        if (i >= 0 && i < x.q.propositions.length) { e.preventDefault(); repondre(rang, { choisie: i }); }
        return;
      }
      // Un bouton actif reçoit déjà sa touche Entrée : on ne la double pas.
      const bouton = cible?.closest("button");
      if (e.key === "Enter" && !(bouton && !bouton.disabled)) { e.preventDefault(); suivante(); }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  });

  const visionneuse = voir && (
    <PdfViewer nomFichier={voir.nomFichier} titre={voir.titre} page={voir.page} chercher={voir.chercher} onClose={() => setVoir(null)} />
  );
  const tete = (
    <div className="quiz-tete">
      <button className="btn ghost sm" onClick={onRetour}>← Les guides</button>
      <b className="quiz-titre">{serie.titre}{serie.theme && <span className="chip quiz-theme">🎯 {serie.theme}</span>}</b>
      {!fini && <span className="meta">Question {rang + 1} sur {questions.length}</span>}
    </div>
  );

  if (fini) {
    return (
      <div className="card quiz">
        {visionneuse}
        {tete}
        <div className="quiz-score">{comptees.length ? scoreEnClair(total, comptees.length) : "—"}</div>
        {questions.map((x, i) => {
          const ecartee = ecartees.includes(i);
          const p = points[i];
          const verdict: Verdict = p === 1 ? "juste" : p > 0 ? "en partie" : "à revoir";
          const r = reponses[i];
          const choisie = r && "choisie" in r ? r.choisie : -1;
          const genre = ecartee ? "ecartee" : verdict === "juste" ? "juste" : verdict === "en partie" ? "partie" : "faux";
          return (
            <div key={i} className={`quiz-bilan quiz-${genre}`}>
              <span className="quiz-bilan-icone" aria-label={ecartee ? "Écartée" : VERDICTS[verdict].dit}>{ecartee ? "⚑" : VERDICTS[verdict].icone}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {plusieursGuides && <div className="meta">📘 {x.guide.titre}</div>}
                <div>{x.q.question}</div>
                {ecartee
                  ? <div className="meta">Écartée : elle ne compte pas, et ne reviendra pas.</div>
                  : verdict !== "juste" && <>
                    <div className="meta">{x.q.sorte === "choix" ? `La bonne réponse : ${x.q.propositions[x.q.bonne]}` : `Attendu : ${x.q.attendu}`}</div>
                    {x.q.sorte === "choix" && choisie >= 0 && x.q.pourquoi[choisie] && (
                      <div className="meta">Pourquoi pas « {x.q.propositions[choisie]} » : {x.q.pourquoi[choisie]}</div>
                    )}
                    <Citation q={x.q} onVoir={() => voirDansLeGuide(x)} />
                  </>}
              </div>
            </div>
          );
        })}
        <div className="quiz-pied">
          {onEncore && <button className="btn primary" onClick={onEncore}>🔁 Une autre série{serie.theme ? " sur ce thème" : " sur ce guide"}</button>}
          {dues > 0 && (
            <button className={onEncore ? "btn" : "btn primary"} onClick={onRevoir}>
              {onEncore ? `Revoir mes erreurs (${dues})` : `🔁 Revoir encore (${dues})`}
            </button>
          )}
          <button className="btn" onClick={onRetour}>{onEncore ? "← Choisir un autre guide" : "← Les guides"}</button>
        </div>
      </div>
    );
  }

  const x = questions[rang];
  const r = reponses[rang];
  const ecartee = ecartees.includes(rang);
  return (
    <div className="card quiz">
      {visionneuse}
      {tete}
      {plusieursGuides && <div className="meta" style={{ marginTop: -4 }}>📘 {x.guide.titre}</div>}
      <p className="quiz-question">{x.q.question}</p>
      {x.q.sorte === "choix"
        ? <QuestionAChoixEnCours q={x.q} reponse={r} onChoisir={(i) => repondre(rang, { choisie: i })}
            onPasser={() => repondre(rang, { passe: true })} onVoir={() => voirDansLeGuide(x)} />
        : <QuestionOuverteEnCours key={rang} q={x.q} titre={x.guide.titre} reponse={r}
            onCorrigee={(ecrite, correction) => repondre(rang, { ecrite, correction })} onPasser={() => repondre(rang, { passe: true })}
            onVoir={() => voirDansLeGuide(x)} />}
      {r && (
        <div className="quiz-pied">
          <button ref={suiteRef} className="btn primary" onClick={suivante}>{rang === questions.length - 1 ? "Voir le résultat" : "Question suivante →"}</button>
          <button className={`btn ghost sm quiz-ecarter${ecartee ? " on" : ""}`} onClick={() => ecarter(rang)} aria-pressed={ecartee}
            title={ecartee ? "Elle comptera de nouveau" : "Elle ne comptera pas dans le score, et ne reviendra pas"}>
            {ecartee ? "⚑ Écartée — la garder" : "⚑ Question mal posée"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * La phrase du guide, sa page, et de quoi l'ouvrir à cet endroit. La page
 * est celle qu'imprime le guide quand le PDF la donne ; sinon son rang dans
 * le fichier, dit comme tel : le numéro imprimé en bas de page peut différer.
 */
function Citation({ q, onVoir }: { q: QuestionDuQuiz; onVoir: () => void }) {
  return (
    <div className="quiz-citation">
      <blockquote>« {q.citation} »</blockquote>
      <button className="btn ghost sm" onClick={onVoir}
        title={q.etiquette ? `Ouvrir le guide à ce passage (page ${q.page} du fichier PDF)` : "Ouvrir le guide à ce passage — le numéro imprimé sur la page peut différer"}>
        📄 {q.etiquette ? `Page ${q.etiquette} du guide` : `Page ${q.page} du PDF`}
      </button>
    </div>
  );
}

function QuestionAChoixEnCours({ q, reponse, onChoisir, onPasser, onVoir }: {
  q: QuestionAChoix; reponse: Reponse | undefined; onChoisir: (i: number) => void; onPasser: () => void; onVoir: () => void;
}) {
  const choisie = reponse && "choisie" in reponse ? reponse.choisie : null;
  const repondu = !!reponse;
  const juste = choisie === q.bonne;
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
      {!repondu && <button type="button" className="btn ghost sm quiz-passer" onClick={onPasser}>Je ne sais pas</button>}
      {/* La correction s'annonce d'elle-même aux lecteurs d'écran. */}
      <div aria-live="polite">
        {repondu && (
          <div className={`quiz-retour ${juste ? "quiz-juste" : choisie === null ? "" : "quiz-faux"}`}>
            <b>{juste ? "✓ Juste." : `${choisie === null ? "" : "✗ "}La bonne réponse : ${q.propositions[q.bonne]}.`}</b>
            {q.explication && <> {q.explication}</>}
            {!juste && choisie !== null && q.pourquoi[choisie] && (
              <div className="quiz-pourquoi">Pourquoi pas « {q.propositions[choisie]} » ? {q.pourquoi[choisie]}</div>
            )}
            <Citation q={q} onVoir={onVoir} />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * La question ouverte : on écrit sa réponse, Mistral la corrige d'après
 * l'attendu et la phrase du guide (⌘ Entrée, ou « Vérifier »). Sans Mistral,
 * on se corrige soi-même, l'attendu sous les yeux. « Je ne sais pas » montre
 * l'attendu.
 */
function QuestionOuverteEnCours({ q, titre, reponse, onCorrigee, onPasser, onVoir }: {
  q: QuestionOuverte; titre: string; reponse: Reponse | undefined;
  onCorrigee: (ecrite: string, c: Correction) => void; onPasser: () => void; onVoir: () => void;
}) {
  const [ecrite, setEcrite] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [erreur, setErreur] = React.useState("");
  const verifier = async () => {
    if (!ecrite.trim() || enCours) return;
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
  let retour: React.ReactNode = null;
  if (reponse && "passe" in reponse) {
    retour = (
      <div className="quiz-retour">
        <b>Attendu :</b> {q.attendu}
        <Citation q={q} onVoir={onVoir} />
      </div>
    );
  } else if (reponse && "correction" in reponse) {
    const v = reponse.correction.verdict;
    retour = (
      <>
        <div className="quiz-ecrite">{reponse.ecrite}</div>
        <div className={`quiz-retour ${v === "juste" ? "quiz-juste" : v === "en partie" ? "quiz-partie" : "quiz-faux"}`}>
          <b>{VERDICTS[v].icone} {VERDICTS[v].dit}.</b>{reponse.correction.retour && <> {reponse.correction.retour}</>}
          <div className="meta" style={{ marginTop: 6 }}>Attendu : {q.attendu}</div>
          <Citation q={q} onVoir={onVoir} />
        </div>
      </>
    );
  }
  return (
    <>
      {!reponse && <>
        <Textarea value={ecrite} onChange={(e) => setEcrite(e.target.value)} rows={3} placeholder="Votre réponse, en une ou deux phrases"
          aria-label="Votre réponse" disabled={enCours}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void verifier(); } }} />
        <div className="quiz-pied">
          <button className="btn primary" disabled={!ecrite.trim() || enCours} onClick={verifier} title="⌘ Entrée">{enCours ? "⏳ Correction…" : "Vérifier"}</button>
          <button className="btn ghost" disabled={enCours} onClick={onPasser}>Je ne sais pas</button>
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
      </>}
      {/* La correction s'annonce d'elle-même aux lecteurs d'écran. */}
      <div aria-live="polite">{retour}</div>
    </>
  );
}
