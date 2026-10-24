import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Page } from "../App";
import { api, DUREES, formatDuree, nowIso, texteErreur, type MaterielItem, type Seance, type Sequence } from "../api";
import { Empty, Input, Modal, TextareaAuto } from "../components/ui";
import { toast } from "../components/Toaster";
import { CompetenceTree, labelCourt, type CompetenceSelectionnee } from "../components/CompetenceTree";
import { ajouterManuelle, consigneSousCompetences, estManuelle, lireSousCompetences } from "../sousCompetences";
import { pseudonymiserTout, restaurer } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import { ConsignesSeance } from "../components/Tapuscrit";
import { lireConsignes } from "../tapuscrit";
import { ReglesCitees, useLudotheque } from "../components/ReglesDesJeux";
import { sansMarqueurs } from "../jeuxCites";
import { EditeurDeroulement, type EditeurDeroulementHandle } from "../components/EditeurDeroulement";
import {
  ChoixDeSupport, FicheDuSupport, citablesDeLaSeance, useSupportsDeLaSeance, type SupportsDeLaSeanceEtat,
} from "../components/SupportsDeLaSeance";
import { FichierImg } from "../components/Deroulement";
import { VignettePdf } from "../components/VignettePdf";
import { PdfViewer } from "../components/PdfViewer";
import { MoletteEchelle } from "../components/MoletteEchelle";
import { lireFabrication, modifierDansFabriquer, seRefaitDansFabriquer } from "../modifierFeuille";
import { lirePdfs } from "../materielSeance";
import { fabriquerPourLaSeance } from "../feuillePourLaSeance";
import { elementDuRenvoi, genreDeSupport, lireRenvoi, type RenvoiDeSupport } from "../supportsDeSeance";
import {
  CHAMP_POSTURE, CHAMPS_PROPOSES, ajouterChamp, champsDesPhases, citationsDuDocument, documentDeLaSeance, ICONE_CITE, imagesDuDocument,
  lireSeance, memeNom, phasesOuLeChampEstRempli, retirerChamp, tableauDuDocument, type GenreCite,
} from "../documentSeance";
import { confirmer } from "../components/confirmer";

// ── La page d'une séance ───────────────────────────────────────────────────
//
// La séance s'écrit comme une page (demande de l'enseignant, octobre 2026) :
// son titre en grand, sa durée, sa date, ses compétences et ses consignes en
// pastilles, son objectif, puis le déroulement — ses phases en cartes, avec
// leurs images et les supports cités d'un « @ » (voir EditeurDeroulement).
// À côté : les supports de la séance, les champs des phases, ses
// compétences, le matériel à préparer et le bilan. Tout s'enregistre seul,
// peu après la frappe, et en quittant la page.

const ATTENTE_ENREGISTREMENT = 800;

/** Une séance vient de s'écrire : la séquence qu'on retrouve en quittant la page se relit. */
export const EVT_SEANCE_ENREGISTREE = "maitrize:seance-enregistree";

export default function SeancePage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const nav = useNavigate();
  const [s, setS] = React.useState<Seance | null>(null);
  const [introuvable, setIntrouvable] = React.useState(false);
  const [sequence, setSequence] = React.useState<Sequence | null>(null);
  const [etat, setEtat] = React.useState<{ quoi: "" | "encours" | "ok" | "erreur"; heure?: string }>({ quoi: "" });
  const bilanAuDepart = React.useRef("");
  const sale = React.useRef(false);
  // Une séance toute neuve n'est en base qu'après sa première écriture.
  const enBase = React.useRef(false);
  const sRef = React.useRef<Seance | null>(null);
  sRef.current = s;
  const editeur = React.useRef<EditeurDeroulementHandle>(null);
  // La barre d'outils du déroulement reste sous la barre du haut, quelle que soit sa hauteur.
  const racine = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const page = racine.current;
    const barre = page?.closest(".page-scroll")?.querySelector<HTMLElement>(":scope > .topbar");
    if (!page || !barre) return;
    const poser = () => page.style.setProperty("--haut-topbar", `${barre.offsetHeight}px`);
    poser();
    const suivi = new ResizeObserver(poser);
    suivi.observe(barre);
    return () => suivi.disconnect();
  }, [s === null]);

  // La séance : en base, ou toute neuve (« ＋ Séance » de la séquence), qui ne s'écrit qu'à la première frappe.
  React.useEffect(() => {
    let actif = true;
    (async () => {
      const neuve = (location.state as { nouvelle?: Seance } | null)?.nouvelle;
      const deja = (await api.seancesList()).find((x) => x.id === id);
      const seance = deja ?? (neuve?.id === id ? neuve : null);
      if (!actif) return;
      if (!seance) { setIntrouvable(true); return; }
      enBase.current = !!deja;
      bilanAuDepart.current = seance.bilan ?? "";
      // Une séance d'avant devient un document ; elle ne s'écrit que si on y touche.
      setS({ ...seance, deroulement: documentDeLaSeance(seance) });
      const seq = seance.sequenceId ? (await api.sequencesList()).find((q) => q.id === seance.sequenceId) ?? null : null;
      if (actif) setSequence(seq);
    })().catch((e) => toast("Séance illisible : " + texteErreur(e), { icone: "⚠️" }));
    return () => { actif = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = React.useCallback((p: Partial<Seance>) => {
    sale.current = true;
    setS((cur) => (cur ? { ...cur, ...p } : cur));
  }, []);

  /** Écrit la séance ; le tableau des phases et la liste des images se tirent du document. */
  const enregistrer = React.useCallback(async () => {
    const cur = sRef.current;
    if (!cur || !sale.current) return;
    sale.current = false;
    setEtat({ quoi: "encours" });
    try {
      // Le document porte tout, le tableau d'avant compris (voir documentDeLaSeance) : le tableau s'en tire.
      await api.seanceSave({
        ...cur,
        titre: cur.titre.trim() || `Séance ${cur.numero}`,
        tableauDeroulement: JSON.stringify(tableauDuDocument(cur.deroulement) ?? []),
        imagesDeroulement: JSON.stringify(imagesDuDocument(cur.deroulement)),
        bilanDate: cur.bilan && cur.bilan !== bilanAuDepart.current ? nowIso() : cur.bilanDate,
      });
      enBase.current = true;
      window.dispatchEvent(new CustomEvent(EVT_SEANCE_ENREGISTREE, { detail: cur.id }));
      setEtat({ quoi: "ok", heure: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ") });
    } catch (e) {
      sale.current = true;
      setEtat({ quoi: "erreur" });
      toast("Séance non enregistrée : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    }
  }, []);
  React.useEffect(() => {
    if (!s || !sale.current) return;
    const t = window.setTimeout(() => { void enregistrer(); }, ATTENTE_ENREGISTREMENT);
    return () => window.clearTimeout(t);
  }, [s, enregistrer]);
  // En quittant la page, ce qui attendait s'écrit.
  React.useEffect(() => () => { void enregistrer(); }, [enregistrer]);
  /** Avant d'y poser un support : la séance neuve s'écrit, pour que le support ait une séance où vivre. */
  const assurer = React.useCallback(async () => {
    if (enBase.current) return;
    sale.current = true;
    await enregistrer();
  }, [enregistrer]);

  const cycle = sequence?.cycle ?? "";
  const supportsEtat = useSupportsDeLaSeance(id, s?.sequenceId ?? sequence?.id ?? null, cycle);
  const citables = React.useMemo(() => citablesDeLaSeance(supportsEtat)
    .map((c) => (c.poser ? { ...c, poser: async () => { await assurer(); return c.poser!(); } } : c)),
  [supportsEtat.items, supportsEtat.bureau]); // eslint-disable-line react-hooks/exhaustive-deps
  const [choixOuvert, setChoixOuvert] = React.useState(false);
  const [fiche, setFiche] = React.useState<RenvoiDeSupport | null>(null);
  const [feuilleVue, setFeuilleVue] = React.useState<MaterielItem | null>(null);
  const { jeux, recharger: rechargerJeux } = useLudotheque();

  const fabriquer = async () => {
    if (!s) return;
    sale.current = true;
    await enregistrer();
    fabriquerPourLaSeance({ seanceId: s.id, sequenceId: s.sequenceId, titre: `Séance ${s.numero}${s.titre.trim() ? ` — ${s.titre.trim()}` : ""}` }, nav);
  };
  const ouvrirCitation = (genre: GenreCite, cible: string) => {
    if (genre === "feuille") {
      const m = supportsEtat.feuilles.find((x) => x.id === cible);
      if (m) setFeuilleVue(m); else toast("Cette feuille n'est plus dans la séance.", { icone: "ℹ️" });
      return;
    }
    if (!elementDuRenvoi({ genre, source: cible }, supportsEtat.bureau)) { toast("Ce support n'est plus sur le plan de travail.", { icone: "ℹ️" }); return; }
    setFiche({ genre, source: cible });
  };

  if (introuvable) return <Page titre="Séance"><Empty icone="📄" titre="Séance introuvable" sous="Elle a peut-être été supprimée." /></Page>;
  if (!s) return <Page titre="Séance"><p className="meta">Ouverture de la séance…</p></Page>;

  const comps: CompetenceSelectionnee[] = (() => { try { return s.competences ? JSON.parse(s.competences) : []; } catch { return []; } })();
  const citations = citationsDuDocument(s.deroulement);
  const consignes = lireConsignes(s.consignes);

  return (
    <Page titre={`Séance ${s.numero}`}
      sous={sequence ? <button type="button" className="lien seance-fil" onClick={() => nav(`/sequences/${sequence.id}`)}>📚 {sequence.titre}</button> : undefined}
      actions={<>
        <span className={`seance-etat${etat.quoi === "erreur" ? " erreur" : ""}`} role="status">
          {etat.quoi === "encours" ? "Enregistrement…" : etat.quoi === "ok" ? `✓ Enregistré à ${etat.heure}` : etat.quoi === "erreur" ? "⚠️ Non enregistré" : ""}
        </span>
        {sequence && <button className="btn" onClick={() => nav(`/sequences/${sequence.id}`)}>← La séquence</button>}
      </>}>
      <div ref={racine} className="seance-page">
        <article className="seance-doc">
          <input className="seance-titre" value={s.titre} placeholder="Titre de la séance" aria-label="Titre de la séance"
            onChange={(e) => up({ titre: e.target.value })} />
          <PastillesDeLaSeance s={s} up={up} nbCompetences={comps.length} nbConsignes={consignes.length}
            sequence={sequence} cycle={cycle} />
          <label className="seance-objectif">
            <span>Objectif</span>
            <TextareaAuto className="seance-objectif-texte" rows={1} minHauteur={24} style={{ resize: "none" }} value={s.objectifs}
              placeholder="Ce que les élèves vont apprendre…" aria-label="Objectif de la séance"
              onChange={(e) => up({ objectifs: e.target.value })} />
          </label>
          <EditeurDeroulement ref={editeur} valeur={s.deroulement} onChange={(deroulement) => up({ deroulement })}
            citables={citables} onOuvrirCitation={ouvrirCitation} onAjouterSupport={() => setChoixOuvert(true)}
            onFabriquer={() => { void fabriquer(); }} />
          <ReglesCitees texte={sansMarqueurs(s.deroulement)} jeux={jeux} onJeuModifie={rechargerJeux} />
        </article>

        <aside className="seance-cote">
          <ColonneDesSupports etat={supportsEtat} citations={citations} assurer={assurer}
            onAjouter={() => setChoixOuvert(true)} onFabriquer={() => { void fabriquer(); }}
            onCiter={(c) => editeur.current?.citer(c)} onOuvrir={ouvrirCitation} onVoirFeuille={setFeuilleVue} />
          <ChampsDesPhases deroulement={s.deroulement} onChange={(deroulement) => up({ deroulement })} />
          <section className="seance-carte">
            <h4>Compétences</h4>
            {comps.length
              ? comps.map((c, i) => <span key={i} className="seance-chip" title={estManuelle(c) ? "Sous-compétence écrite à la main" : c.referentielNom}>{estManuelle(c) ? "✍️ " : ""}{labelCourt(c)}</span>)
              : <div className="seance-vide">Aucune compétence.</div>}
          </section>
          <section className="seance-carte">
            <h4>Matériel à préparer</h4>
            <TextareaAuto className="textarea seance-note" minHauteur={64} value={s.materiel} placeholder="Ce qu'il faut sortir avant la séance…"
              aria-label="Matériel à préparer" onChange={(e) => up({ materiel: e.target.value })} />
          </section>
          <section className="seance-carte">
            <h4>Bilan, après la séance</h4>
            <TextareaAuto className="textarea seance-note" minHauteur={64} value={s.bilan} placeholder="Ce qui a marché, à reprendre…"
              aria-label="Bilan de la séance" onChange={(e) => up({ bilan: e.target.value })} />
          </section>
        </aside>
      </div>

      {choixOuvert && <ChoixDeSupport bureau={supportsEtat.bureau} poses={supportsEtat.supports}
        onPoser={async (r, t) => { await assurer(); await supportsEtat.poser(r, t); }}
        onPrendrePdf={async (m) => { await assurer(); await supportsEtat.prendrePdf(m); }}
        onRecharger={supportsEtat.reload} onClose={() => setChoixOuvert(false)} />}
      {fiche && <FicheDuSupport renvoi={fiche} bureau={supportsEtat.bureau} onClose={() => setFiche(null)}
        onSaved={() => { setFiche(null); void supportsEtat.reload(); }} />}
      {feuilleVue && lirePdfs(feuilleVue.pdfsJson)[0] && (
        <PdfViewer nomFichier={lirePdfs(feuilleVue.pdfsJson)[0]} titre={feuilleVue.titre} materiel={feuilleVue} onClose={() => setFeuilleVue(null)} />
      )}
    </Page>
  );
}

// ── Les pastilles : durée, date, compétences, consignes ───────────────────

function PastillesDeLaSeance({ s, up, nbCompetences, nbConsignes, sequence, cycle }: {
  s: Seance; up: (p: Partial<Seance>) => void; nbCompetences: number; nbConsignes: number; sequence: Sequence | null; cycle: string;
}) {
  const [ouvert, setOuvert] = React.useState<"" | "date" | "competences" | "consignes">("");
  const date = s.date ? new Date(s.date.length > 10 ? s.date : `${s.date}T12:00:00`) : null;
  return (
    <div className="seance-pastilles">
      <label className="seance-pastille">
        ⏱
        <select value={s.duree} aria-label="Durée de la séance" onChange={(e) => up({ duree: +e.target.value })}>
          {DUREES.map((d) => <option key={d} value={d}>{formatDuree(d)}</option>)}
        </select>
      </label>
      <button type="button" className="seance-pastille" onClick={() => setOuvert(ouvert === "date" ? "" : "date")}>
        📅 {date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) : "Sans date"}
      </button>
      <button type="button" className={`seance-pastille${nbCompetences ? " on" : ""}`} onClick={() => setOuvert("competences")}>
        🎯 {nbCompetences ? `${nbCompetences} compétence${nbCompetences > 1 ? "s" : ""}` : "Compétences"}
      </button>
      <button type="button" className={`seance-pastille${nbConsignes ? " on" : ""}`} onClick={() => setOuvert("consignes")}>
        🗣 {nbConsignes ? `${nbConsignes} consigne${nbConsignes > 1 ? "s" : ""} pour les élèves` : "Consignes pour les élèves"}
      </button>
      {ouvert === "date" && (
        <div className="seance-date">
          <Input type="date" value={(s.date ?? "").slice(0, 10)} aria-label="Date prévue" onChange={(e) => up({ date: e.target.value || null })} />
          {s.date && <button type="button" className="btn ghost sm" onClick={() => { up({ date: null }); setOuvert(""); }}>Sans date</button>}
          <button type="button" className="btn sm" onClick={() => setOuvert("")}>OK</button>
        </div>
      )}
      {ouvert === "competences" && (
        <CompetencesDeLaSeance s={s} up={up} sequence={sequence} cycle={cycle} onClose={() => setOuvert("")} />
      )}
      {ouvert === "consignes" && (
        <Modal titre="Consignes pour les élèves" onClose={() => setOuvert("")}
          footer={<button className="btn primary" onClick={() => setOuvert("")}>Fermer</button>}>
          <ConsignesSeance valeur={s.consignes ?? ""} onChange={(consignes) => up({ consignes })} />
        </Modal>
      )}
    </div>
  );
}

/** Les compétences de la séance : celles du référentiel, et les sous-compétences écrites ou proposées par l'assistant. */
function CompetencesDeLaSeance({ s, up, sequence, cycle, onClose }: {
  s: Seance; up: (p: Partial<Seance>) => void; sequence: Sequence | null; cycle: string; onClose: () => void;
}) {
  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  const setComps = (next: CompetenceSelectionnee[]) => up({ competences: JSON.stringify(next) });
  const basculer = (c: CompetenceSelectionnee) => {
    const deja = comps.find((x) => x.id === c.id || (!!c.competenceRefId && x.competenceRefId === c.competenceRefId));
    setComps(deja ? comps.filter((x) => x !== deja) : [...comps, c]);
  };
  let competenceVisee: CompetenceSelectionnee | null = null;
  try { competenceVisee = sequence?.competenceVisee ? JSON.parse(sequence.competenceVisee) : null; } catch { /* ignore */ }
  const contexte = { domaineTitre: competenceVisee?.domaineTitre ?? sequence?.matiere ?? "", competenceVisee: competenceVisee?.competenceTitre ?? "" };
  const [saisie, setSaisie] = React.useState("");
  const ajouterSaisie = () => {
    const suite = ajouterManuelle(comps, saisie, contexte);
    if (suite === comps && saisie.trim()) toast("Cette compétence est déjà là.", { icone: "ℹ️" });
    setComps(suite); setSaisie("");
  };
  const [propositions, setPropositions] = React.useState<{ texte: string; cochee: boolean }[] | null>(null);
  const [cherche, setCherche] = React.useState(false);
  const proposer = async () => {
    setCherche(true);
    try {
      const consigne = consigneSousCompetences({
        competenceVisee: competenceVisee?.competenceTitre ?? "", domaineTitre: contexte.domaineTitre, cycle: sequence?.cycle ?? cycle,
        titreSeance: s.titre, objectifs: s.objectifs, dejaLa: comps.map((c) => c.competenceTitre),
      });
      // Le titre et l'objectif de la séance partent sans les noms connus.
      const masque = pseudonymiserTout(consigne.map((m) => m.content), await nomsAMasquer());
      const reponse = restaurer(await api.mistralChat(consigne.map((m, i) => ({ ...m, content: masque.textes[i] }))), masque.table).texte;
      const lues = lireSousCompetences(reponse);
      if (!lues.length) { toast("L'assistant n'a rien proposé de lisible ; réessayez.", { icone: "⚠️" }); return; }
      setPropositions(lues.map((texte) => ({ texte, cochee: true })));
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setCherche(false); }
  };
  const garder = () => {
    let suite = comps;
    for (const p of propositions ?? []) if (p.cochee) suite = ajouterManuelle(suite, p.texte, contexte);
    setComps(suite); setPropositions(null);
  };
  return (
    <Modal large titre="Compétences de la séance" onClose={onClose} footer={<button className="btn primary" onClick={onClose}>Fermer</button>}>
      {comps.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {comps.map((c, i) => (
            <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {estManuelle(c) ? "✍️ " : ""}{labelCourt(c)}
              <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => basculer(c)} aria-label="Retirer">✕</button>
            </span>
          ))}
        </div>
      )}
      {competenceVisee && <div className="meta" style={{ fontSize: 12.5, marginBottom: 6 }}>🎯 Vers : {labelCourt(competenceVisee)}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <Input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Écrire une sous-compétence : Reconnaître son prénom parmi trois étiquettes…"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterSaisie(); } }} style={{ flex: 1, minWidth: 220 }} aria-label="Sous-compétence à écrire" />
        <button type="button" className="btn sm" disabled={!saisie.trim()} onClick={ajouterSaisie}>＋ Ajouter</button>
        <button type="button" className="btn sm" disabled={cherche} onClick={proposer}>{cherche ? "L'assistant cherche…" : "✨ Proposer des sous-compétences"}</button>
      </div>
      {propositions && (
        <div className="deroulement-propose" style={{ marginBottom: 10 }}>
          <b>✨ Propositions de l'assistant</b>
          {propositions.map((p, i) => (
            <label key={i} className="pb-coche">
              <input type="checkbox" checked={p.cochee} onChange={(e) => setPropositions(propositions.map((x, k) => (k === i ? { ...x, cochee: e.target.checked } : x)))} />
              <span>{p.texte}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" className="btn primary sm" disabled={!propositions.some((p) => p.cochee)} onClick={garder}>
              ✓ Garder les cochées ({propositions.filter((p) => p.cochee).length})
            </button>
            <button type="button" className="btn ghost sm" onClick={() => setPropositions(null)}>Ne rien garder</button>
          </div>
        </div>
      )}
      <CompetenceTree mode="multi" selection={comps} onToggle={(c) => basculer(c)} />
    </Modal>
  );
}

// ── Les champs des phases, pour toute la séance ───────────────────────────

/**
 * Les champs qu'on veut à chaque phase — comme les colonnes de l'ancien
 * tableau : le déroulement et la posture de l'enseignant toujours, puis
 * l'organisation, la différenciation, le matériel, la trace écrite, ou un
 * champ qu'on nomme soi-même. Retirer un champ rempli se confirme.
 */
function ChampsDesPhases({ deroulement, onChange }: { deroulement: string; onChange: (d: string) => void }) {
  const [saisie, setSaisie] = React.useState<string | null>(null);
  const abandon = React.useRef(false);
  const phases = lireSeance(deroulement).phases;
  if (!phases.length) return null;
  const actifs = champsDesPhases(phases);
  const estActif = (nom: string) => actifs.some((n) => memeNom(n, nom));
  const siens = actifs.slice(1).filter((n) => !CHAMPS_PROPOSES.some((c) => memeNom(c, n)));
  const basculer = async (nom: string) => {
    if (!estActif(nom)) { onChange(ajouterChamp(deroulement, nom)); return; }
    const remplis = phasesOuLeChampEstRempli(deroulement, nom);
    if (remplis && !(await confirmer(`Retirer « ${nom} » des phases ? Ce qui y est écrit, dans ${remplis} phase${remplis > 1 ? "s" : ""}, sera effacé.`, { oui: "Retirer", danger: true }))) return;
    onChange(retirerChamp(deroulement, nom));
  };
  const ajouterLeSien = () => {
    const nom = abandon.current ? "" : (saisie ?? "").replace(/\s+/g, " ").trim();
    abandon.current = false;
    setSaisie(null);
    if (nom && !memeNom(nom, "Déroulement") && !memeNom(nom, CHAMP_POSTURE)) onChange(ajouterChamp(deroulement, nom));
  };
  const puce = (nom: string) => (
    <button key={nom} type="button" className={`seance-champ${estActif(nom) ? " on" : ""}`} aria-pressed={estActif(nom)}
      title={estActif(nom) ? "Retirer de toutes les phases" : "Ajouter à toutes les phases"} onClick={() => { void basculer(nom); }}>
      {estActif(nom) ? nom : `＋ ${nom}`}
    </button>
  );
  return (
    <section className="seance-carte">
      <h4>Les champs des phases</h4>
      <div className="seance-champs">
        <span className="seance-champ on fixe">Déroulement</span>
        <span className="seance-champ on fixe">{CHAMP_POSTURE}</span>
        {CHAMPS_PROPOSES.map(puce)}
        {siens.map(puce)}
        {saisie === null
          ? <button type="button" className="seance-champ" onClick={() => setSaisie("")}>＋ Autre…</button>
          : <input className="seance-champ seance-champ-saisie" autoFocus value={saisie} placeholder="Nom du champ" aria-label="Nom du champ à ajouter"
              onChange={(e) => setSaisie(e.target.value)} onBlur={ajouterLeSien}
              onKeyDown={(e) => { if (e.key === "Escape") abandon.current = true; if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur(); }} />}
      </div>
    </section>
  );
}

// ── Les supports, sur le côté ─────────────────────────────────────────────

function ColonneDesSupports({ etat, citations, assurer, onAjouter, onFabriquer, onCiter, onOuvrir, onVoirFeuille }: {
  etat: SupportsDeLaSeanceEtat;
  citations: ReturnType<typeof citationsDuDocument>;
  assurer: () => Promise<void>;
  onAjouter: () => void;
  onFabriquer: () => void;
  onCiter: (c: { genre: GenreCite; id: string; titre: string }) => void;
  onOuvrir: (genre: GenreCite, id: string) => void;
  onVoirFeuille: (m: MaterielItem) => void;
}) {
  const nav = useNavigate();
  const pdf = React.useRef<HTMLInputElement>(null);
  const ou = (genre: GenreCite, id: string) => {
    const phases = [...new Set(citations.filter((c) => c.genre === genre && c.id === id).map((c) => c.phase))];
    if (!phases.length) return "";
    return phases.every((p) => p === 0) ? "cité" : `cité en ${phases.filter((p) => p > 0).join(", ")}`;
  };
  const { supports, feuilles, bureau } = etat;
  return (
    <section className="seance-carte">
      <h4>Supports de la séance <button type="button" className="lien" onClick={onAjouter}>＋ Ajouter</button></h4>
      <input ref={pdf} type="file" accept="application/pdf" multiple hidden
        onChange={async (e) => {
          const f = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (!f.length) return;
          await assurer();
          for (const x of f) await etat.ajouterPdf(x).catch((err) => toast(`« ${x.name} » non ajouté : ${texteErreur(err)}`, { icone: "⚠️" }));
        }} />
      {!supports.length && !feuilles.length && <div className="seance-vide">Aucun support : « ＋ Ajouter », ou « @ » dans le déroulement.</div>}
      {supports.map((lien) => {
        const r = lireRenvoi(lien.supportJson)!;
        const e = elementDuRenvoi(r, bureau);
        const titre = e?.titre || lien.titre;
        const cite = ou(r.genre, r.source);
        return (
          <div key={lien.id} className="seance-support">
            <span className="seance-support-ico">{e?.image ? <FichierImg nom={e.image} style={{ width: 30, height: 30, objectFit: "cover" }} alt="" /> : genreDeSupport(r.genre).ico}</span>
            <div className="seance-support-texte">
              <button type="button" className="lien" disabled={!e} onClick={() => onOuvrir(r.genre, r.source)}>{titre}</button>
              <div className="meta">{[genreDeSupport(r.genre).nom, e ? e.detail : "n'est plus sur le bureau"].filter(Boolean).join(" · ")}</div>
            </div>
            <span className="seance-support-actions">
              {cite ? <span className="seance-cite">{cite}</span>
                : <button type="button" className="btn ghost sm" title="Citer dans le déroulement, à l'endroit du curseur" onClick={() => onCiter({ genre: r.genre, id: r.source, titre })}>@</button>}
              <button type="button" className="btn ghost sm" aria-label={`Retirer « ${titre} » de la séance`} title="Retirer de la séance (il reste sur le plan de travail)"
                onClick={() => { void etat.retirer(lien); }}>🗑</button>
            </span>
          </div>
        );
      })}
      {feuilles.map((m) => {
        const fab = lireFabrication(m.fabricationJson);
        const cite = ou("feuille", m.id);
        return (
          <div key={m.id} className="seance-support">
            <button type="button" className="seance-support-ico seance-support-vignette" onClick={() => onVoirFeuille(m)} aria-label={`Voir ${m.titre}`}>
              {lirePdfs(m.pdfsJson)[0] ? <VignettePdf nom={lirePdfs(m.pdfsJson)[0]} /> : ICONE_CITE.feuille}
            </button>
            <div className="seance-support-texte">
              <button type="button" className="lien" onClick={() => onVoirFeuille(m)}>{m.titre || "Feuille"}</button>
              <div className="meta">Feuille · 🖨 avec le journal</div>
              <MoletteEchelle materiel={m} repliee />
            </div>
            <span className="seance-support-actions">
              {cite ? <span className="seance-cite">{cite}</span>
                : <button type="button" className="btn ghost sm" title="Citer dans le déroulement" onClick={() => onCiter({ genre: "feuille", id: m.id, titre: m.titre || "Feuille" })}>@</button>}
              {seRefaitDansFabriquer(fab) && (
                <button type="button" className="btn ghost sm" title="Refaire la feuille dans son atelier" onClick={() => modifierDansFabriquer(m, fab, nav)}>✏️</button>
              )}
              <button type="button" className="btn ghost sm" aria-label={`Supprimer « ${m.titre} »`} onClick={() => { void etat.supprimerFeuille(m); }}>🗑</button>
            </span>
          </div>
        );
      })}
      <div className="seance-support-pied">
        <button type="button" className="btn sm" onClick={() => pdf.current?.click()}>📄 Ajouter un PDF</button>
        <button type="button" className="btn sm" onClick={onFabriquer}>✨ Fabriquer une feuille</button>
      </div>
    </section>
  );
}
