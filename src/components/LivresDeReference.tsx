import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, couleurHex } from "../api";
import { Empty, Input, Modal, Select } from "./ui";
import { useMemoire } from "./useMemoire";
import { toast } from "./Toaster";
import { openCtx } from "./ctxmenu";
import { preparerQuestion } from "../questionAssistant";
import {
  CONTE, DEMANDES, FILTRE_VIDE, LISTES, LIVRES, PAGE_EDUSCOL, SELECTION_MAX, STATUTS, chercherLivres, difficulteLisible, famillesDu,
  filtreSur, listeEnTexte, nomsDuLivre, questionSurLaSelection, questionSurLeLivre, referenceDuLivre, type Cycle, type FiltreLivres,
  type LivreReference,
} from "../livresDeReference";

// ── Lectures à l'école : chercher dans les listes de référence ────────────
//
// Les 908 livres des listes d'Éduscol, cycles 1, 2 et 3. On cherche un
// titre, un auteur, un éditeur ; on filtre par cycle, catégorie, difficulté,
// patrimoine ou classique. Un livre se copie, ou part à l'assistant avec une
// question toute prête — qu'on relit avant de l'envoyer. Le même panneau sert
// dans les Ressources et dans l'assistant.

const TEINTES: Record<Cycle, string> = { 1: couleurHex.green, 2: couleurHex.blue, 3: couleurHex.indigo };
const CYCLES: { c: Cycle; nom: string }[] = [
  { c: 1, nom: "Cycle 1 · maternelle" },
  { c: 2, nom: "Cycle 2 · CP, CE1, CE2" },
  { c: 3, nom: "Cycle 3 · CM1, CM2" },
];
/** Les livres montrés d'un coup : la suite vient à la demande. */
const PAR_PAGE = 80;

const ouvrir = (url: string) => { openUrl(url).catch(() => window.open(url, "_blank")); };

function copier(texte: string, message: string) {
  navigator.clipboard.writeText(texte)
    .then(() => toast(message, { icone: "📋" }))
    .catch((e) => toast("Copie impossible : " + String(e), { icone: "⚠️" }));
}

export function LivresDeReference({ onDemande, sources = true, autoFocus = false }: {
  /** Une question attend l'assistant : à la page d'y mener, ou à la fenêtre de se fermer. */
  onDemande: () => void;
  /** Les PDF d'Éduscol (à imprimer, au coffre) sous la liste. */
  sources?: boolean;
  autoFocus?: boolean;
}) {
  const [filtre, setFiltre] = useMemoire<FiltreLivres>("livresDeReference", filtreSur);
  const maj = (m: Partial<FiltreLivres>) => setFiltre(filtreSur({ ...filtre, ...m }));
  const trouves = React.useMemo(() => chercherLivres(filtre), [filtre]);
  const [limite, setLimite] = React.useState(PAR_PAGE);
  React.useEffect(() => setLimite(PAR_PAGE), [filtre]);

  const demander = (texte: string) => { preparerQuestion(texte); onDemande(); };
  // Dans une fenêtre, la recherche prend la main après la fenêtre elle-même,
  // qui la donne d'abord à son premier bouton.
  const racine = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => racine.current?.querySelector<HTMLInputElement>(".lv-filtres input")?.focus(), 0);
    return () => clearTimeout(t);
  }, [autoFocus]);
  const max = filtre.cycle ? LISTES[filtre.cycle].difficulteMax : 4;
  // Sans rien à chercher, on feuillette : les livres se rangent sous leur catégorie.
  const feuilleter = !filtre.texte.trim();
  const parGroupe = React.useMemo(() => {
    const n = new Map<string, number>();
    for (const l of trouves) n.set(`${l.cycle}|${l.categorie}`, (n.get(`${l.cycle}|${l.categorie}`) ?? 0) + 1);
    return n;
  }, [trouves]);
  const filtreActif = (Object.keys(FILTRE_VIDE) as (keyof FiltreLivres)[]).some((k) => filtre[k] !== FILTRE_VIDE[k]);

  const montres = trouves.slice(0, limite);
  return (
    <div className="lv" ref={racine}>
      <div className="lv-filtres">
        <Input placeholder="Un titre, un auteur, un illustrateur, un éditeur…" value={filtre.texte}
          onChange={(e) => maj({ texte: e.target.value })} aria-label="Chercher un livre" />
        <div className="lv-selects">
          <Select value={filtre.cycle} onChange={(e) => maj({ cycle: Number(e.target.value) as Cycle | 0 })} aria-label="Cycle">
            <option value={0}>Tous les cycles</option>
            {CYCLES.map(({ c, nom }) => <option key={c} value={c}>{nom}</option>)}
          </Select>
          <Select value={filtre.famille} onChange={(e) => maj({ famille: e.target.value })} aria-label="Catégorie">
            <option value="">Toutes les catégories</option>
            {famillesDu(filtre.cycle).map((f) => <option key={f} value={f}>{f}</option>)}
          </Select>
          <Select value={filtre.difficulte} onChange={(e) => maj({ difficulte: Number(e.target.value) })} aria-label="Difficulté">
            <option value={0}>Toutes les difficultés</option>
            {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>Difficulté {n}{n === 1 ? " · la plus accessible" : n === max ? " · la plus exigeante" : ""}</option>
            ))}
          </Select>
          <Select value={filtre.statut} onChange={(e) => maj({ statut: e.target.value as FiltreLivres["statut"] })} aria-label="Patrimoine ou classique">
            <option value="">Patrimoine, classiques et récents</option>
            <option value="PC">Patrimoine et classiques</option>
            <option value="P">Patrimoine (P)</option>
            <option value="C">Classiques (C)</option>
          </Select>
        </div>
      </div>

      <div className="lv-bilan">
        <b>{trouves.length} livre{trouves.length > 1 ? "s" : ""}</b>
        {filtreActif && <button type="button" className="lien" onClick={() => setFiltre(FILTRE_VIDE)}>tout remettre</button>}
        <div className="spacer" />
        <button type="button" className="btn ghost sm" disabled={!trouves.length}
          onClick={() => copier(listeEnTexte(trouves), `${trouves.length} référence${trouves.length > 1 ? "s" : ""} copiée${trouves.length > 1 ? "s" : ""}.`)}
          title="Une ligne par livre : titre, auteurs, éditeur, cycle, catégorie, difficulté">📋 Copier la liste</button>
        <button type="button" className="btn sm" disabled={!trouves.length || trouves.length > SELECTION_MAX}
          onClick={() => demander(questionSurLaSelection(trouves, filtre))}
          title={trouves.length > SELECTION_MAX
            ? `Affinez la recherche : l'assistant reçoit ${SELECTION_MAX} livres au plus`
            : "Ces livres partent à l'assistant, qui choisit parmi eux : vous écrivez votre demande après « Parmi ces livres, »"}>
          💬 Demander à l'assistant parmi ces livres
        </button>
      </div>

      {trouves.length === 0
        ? <Empty icone="📚" titre="Aucun livre ne correspond" sous="Essayez un autre mot, ou retirez un filtre." />
        : montres.map((l, i) => {
          const groupe = `${l.cycle}|${l.categorie}`;
          const nouveau = feuilleter && (i === 0 || groupe !== `${montres[i - 1].cycle}|${montres[i - 1].categorie}`);
          return (
            <React.Fragment key={`${groupe}|${l.titre}|${i}`}>
              {nouveau && (
                <h4 className="lv-groupe">
                  <span className="lv-pastille" style={{ background: TEINTES[l.cycle] }} />
                  Cycle {l.cycle} · {l.categorie}<span className="meta">{parGroupe.get(groupe)}</span>
                </h4>
              )}
              <Livre l={l} onDemander={demander} categorie={!feuilleter} />
            </React.Fragment>
          );
        })}
      {trouves.length > limite && (
        <button type="button" className="btn sm lv-suite" onClick={() => setLimite((n) => n + PAR_PAGE)}>
          Afficher {Math.min(PAR_PAGE, trouves.length - limite)} livres de plus (sur {trouves.length - limite})
        </button>
      )}

      {sources ? <SourcesEduscol /> : (
        <p className="meta lv-source-courte">
          D'après Éduscol, « Lectures à l'école : des listes de référence » — cycle 1 ({LISTES[1].annee}), cycles 2 et 3 ({LISTES[2].annee}).{" "}
          <button type="button" className="lien" onClick={() => ouvrir(PAGE_EDUSCOL)}>La page d'Éduscol ↗</button>
        </p>
      )}
    </div>
  );
}

/** `categorie` : sous chaque livre quand on cherche ; en feuilletant, le titre du groupe la donne déjà. */
function Livre({ l, onDemander, categorie }: { l: LivreReference; onDemander: (texte: string) => void; categorie: boolean }) {
  const noms = nomsDuLivre(l);
  // Six éditions conseillées font une longue ligne : deux lignes, et le reste d'un clic.
  const [ouvert, setOuvert] = React.useState(false);
  const menu = (e: React.MouseEvent) => openCtx(e, DEMANDES.map((d) => ({
    label: d.libelle, icon: d.icone, onClick: () => onDemander(questionSurLeLivre(l, d.id)),
  })));
  return (
    <div className="lv-livre" style={{ borderLeftColor: TEINTES[l.cycle] }}>
      <div className="lv-texte">
        <div className="lv-titre">{l.titre}</div>
        <div className={`lv-noms${ouvert ? " ouvert" : ""}`} title={ouvert ? undefined : [noms, l.editeur].filter(Boolean).join(" · ")}
          onClick={() => setOuvert((v) => !v)}>
          {[noms, l.editeur].filter(Boolean).join(" · ")}
        </div>
        <div className="lv-puces">
          <span className="chip" style={{ background: TEINTES[l.cycle] + "26" }}>Cycle {l.cycle}</span>
          <span className="chip" title="De la longueur du texte, du vocabulaire, des constructions et des références culturelles">{difficulteLisible(l)}</span>
          {l.statut && <span className={`chip lv-statut lv-${l.statut}`} title={STATUTS[l.statut].long}>{STATUTS[l.statut].court}</span>}
          {l.conte && <span className="chip" title={CONTE}>✱ conte traditionnel</span>}
          {categorie && <span className="lv-categorie">{l.categorie}</span>}
        </div>
      </div>
      <div className="lv-actions">
        <button type="button" className="btn ghost sm" title="Copier la référence : titre, auteurs, éditeur"
          onClick={() => copier(referenceDuLivre(l), "Référence copiée.")}>📋</button>
        <button type="button" className="btn ghost sm" onClick={menu}
          title="Une question toute prête pour l'assistant, à relire avant de l'envoyer">💬 Demander ▾</button>
      </div>
    </div>
  );
}

/** Un PDF d'Éduscol : ouvert dans le navigateur, ou gardé au coffre-fort pour le lire hors ligne. */
function PdfEduscol({ url, libelle, titre }: { url: string; libelle: string; titre: string }) {
  const [etat, setEtat] = React.useState<"" | "load" | "ok" | "err">("");
  const garder = async () => {
    setEtat("load");
    try { await api.coffreDownload(url, titre); setEtat("ok"); } catch { setEtat("err"); }
  };
  return (
    <span className="lv-pdf">
      <button type="button" className="lien" onClick={() => ouvrir(url)}>{libelle} ↗</button>
      <button type="button" className="btn ghost sm" disabled={etat === "load" || etat === "ok"} onClick={() => { void garder(); }}
        title="Le garder dans le coffre-fort des Ressources, pour le lire hors ligne">
        {etat === "load" ? "⏳ Ajout…" : etat === "ok" ? "✓ Au coffre" : etat === "err" ? "❌ Échec" : "🗄️ Coffre"}
      </button>
    </span>
  );
}

function SourcesEduscol() {
  return (
    <details className="pli lv-sources">
      <summary>Les listes d'Éduscol <span className="meta">— à imprimer, à garder au coffre, et pourquoi ces livres</span></summary>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "4px 0 8px" }}>
        D'après Éduscol, « Lectures à l'école : des listes de référence » : le cycle 1 en {LISTES[1].annee}, les cycles 2 et 3 en {LISTES[2].annee}.
        Le P signale le patrimoine (des œuvres tombées dans le domaine public), le C les classiques de la littérature de jeunesse.
        La difficulté (de 1 à 4 au cycle 1, de 1 à 3 ensuite) tient à la longueur du texte, au vocabulaire, aux constructions et aux références culturelles.
      </p>
      {CYCLES.map(({ c, nom }) => (
        <div key={c} className="lv-source">
          <span className="lv-pastille" style={{ background: TEINTES[c] }} />
          <b>{nom}</b>
          <PdfEduscol url={LISTES[c].imprimer} libelle="La liste à imprimer" titre={`Lectures à l'école — liste de référence du cycle ${c} (${LISTES[c].annee})`} />
          <PdfEduscol url={LISTES[c].criteres} libelle="Pourquoi ces livres" titre={`Lectures à l'école — critères de la sélection du cycle ${c}`} />
          {LISTES[c].notices && (
            <PdfEduscol url={LISTES[c].notices} libelle="Les notices des ouvrages" titre={`Lectures à l'école — notices des ouvrages du cycle ${c}`} />
          )}
        </div>
      ))}
      <button type="button" className="lien" style={{ fontSize: 12.5 }} onClick={() => ouvrir(PAGE_EDUSCOL)}>La page d'Éduscol ↗</button>
    </details>
  );
}

/** Depuis l'assistant : les listes dans une fenêtre, qui se ferme quand une question est prête. */
export function TrouverUnLivre({ onClose }: { onClose: () => void }) {
  return (
    <Modal large titre="📚 Albums et livres des listes de référence" onClose={onClose}
      footer={<>
        <span className="meta" style={{ fontSize: 12 }}>{LIVRES.length} livres, cycles 1, 2 et 3</span>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Fermer</button>
      </>}>
      <LivresDeReference onDemande={onClose} sources={false} autoFocus />
    </Modal>
  );
}
