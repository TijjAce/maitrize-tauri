import React from "react";
import { supprimerLeProjet } from "../suppressionsAnnulables";
import { Page } from "../App";
import { api, anneeScolaireActuelle, texteErreur } from "../api";
import { Input, useAsync, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { accueilDuProjet, appliquerLaReponse, demanderALAssistant, type Replique } from "../assistantProjet";
import { useReglages } from "../components/useMemoire";
import { decrireLeProjet, servicesCorpus } from "../components/ProjetDuMoment";
import { DEMANDE_CORPUS } from "../corpusIa";
import {
  corpusParLIa, preparerLeCorpus, reserverLaPreparation, resumeDeLaPreparation, titreExploitable,
} from "../corpusAuto";
import { aUnCorpus, corpusDe, texteDuCorpus } from "../corpusProjet";
import { graineAuHasard } from "../hasard";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { normaliser } from "../competencesTravaillees";
import {
  CATALOGUE, ETATS, MOIS, THEMES, avancement, chercherIdees, depuisIdee,
  etatDeduit, icoDuTheme, lireEtapes, moisCourant, nomDuMois, nomDuTheme, placer,
  projetVierge, semainesDuMois, type IdeeProjet, type ProjetClasse,
} from "../projets";

// ── Les projets de classe ─────────────────────────────────────────────────
//
// Deux temps, dans cet ordre : on choisit, puis on pose.
//
// En haut, l'année — dix mois, qu'on peut ouvrir semaine par semaine. En bas,
// le catalogue : quatre-vingt-dix projets qu'on coche, par thème ou par
// recherche. Dès qu'un projet est coché, chaque mois tend la main : « ＋ ici ».
// C'est tout le geste — cocher, puis désigner le moment.

const COULEUR_ETAT: Record<string, string> = {
  idee: "var(--text-2)", encours: "var(--accent)", fait: "#16a34a",
};

const ICO_ETAT: Record<string, string> = { idee: "🌱", encours: "🌿", fait: "✅" };

export default function Projets() {
  const annee = anneeScolaireActuelle();
  const { data: projets, reload } = useAsync(() => api.projetsList(), []);
  const [choisies, setChoisies] = React.useState<Set<string>>(new Set());
  const [recherche, setRecherche] = React.useState("");
  const [theme, setTheme] = React.useState<string>("");
  const [deplie, setDeplie] = React.useState<string>("");
  const [ouvert, setOuvert] = React.useState<string>("");

  const miens = (projets ?? []).filter((p) => !p.annee || p.annee === annee);
  const dejaPris = new Set(miens.map((p) => p.origine).filter(Boolean));
  // Depuis Fabriquer, « ✎ Le corpus » ouvre la fiche du projet suivi.
  useOngletDemande("projets", miens.map((p) => p.id), setOuvert);

  const enregistrer = async (p: ProjetClasse) => {
    try { await api.projetSave(p); reload(); }
    catch (e) { toast("Projet non enregistré : " + texteErreur(e), { icone: "⚠️" }); }
  };

  /** Pose les projets cochés sur ce mois, ou sur cette semaine précise. */
  const poser = async (mois: string, semaine = "") => {
    const idees = CATALOGUE.filter((i) => choisies.has(i.id));
    if (!idees.length) return;
    try {
      for (const i of idees) await api.projetSave(placer(depuisIdee(i, annee), mois, semaine));
      setChoisies(new Set());
      reload();
      const ou = semaine ? `la semaine du ${semaine.slice(8)}` : nomDuMois(mois).toLowerCase();
      toast(`${idees.length} projet${idees.length > 1 ? "s posés" : " posé"} sur ${ou}.`, { icone: "📌" });
    } catch (e) {
      toast("Projet non enregistré : " + texteErreur(e), { icone: "⚠️" });
    }
  };

  const creer = async (mois: string) => {
    const p = { ...projetVierge(mois, annee), titre: "Nouveau projet" };
    await enregistrer(p);
    setOuvert(p.id);
  };

  const supprimer = async (p: ProjetClasse) => {
    if (!await confirmer(`Retirer « ${p.titre || "ce projet"} » de l'année ? Les séquences rattachées restent.`)) return;
    try { await supprimerLeProjet(p, reload); }
    catch (e) { toast("Suppression impossible : " + texteErreur(e), { icone: "⚠️" }); }
  };

  const basculer = (id: string) => setChoisies((avant) => {
    const suite = new Set(avant);
    if (suite.has(id)) suite.delete(id); else suite.add(id);
    return suite;
  });

  // Le catalogue montré : la recherche l'emporte sur le thème, qui l'emporte
  // sur le tout-venant.
  const vues = recherche.trim() ? chercherIdees(recherche, normaliser)
    : theme ? CATALOGUE.filter((i) => i.theme === theme)
    : CATALOGUE;

  const ceMois = moisCourant();

  return (
    <Page titre="Projets" sous={`${CATALOGUE.length} projets à poser sur l'année — cochez, puis désignez le moment`}>
      {/* ── L'année ── */}
      <div className="projets-annee">
        {MOIS.map((m) => {
          const dessus = miens.filter((p) => p.mois === m.num);
          const ouvre = deplie === m.num;
          return (
            <div key={m.num} className={`card projets-mois${m.num === ceMois ? " est-maintenant" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <b style={{ fontSize: 13 }}>{m.nom}</b>
                <div className="spacer" style={{ flex: 1 }} />
                <button className="btn ghost sm" title="Voir les semaines"
                  onClick={() => setDeplie(ouvre ? "" : m.num)}>{ouvre ? "▾" : "▸"}</button>
              </div>

              {dessus.length === 0 && !ouvre && (
                <p className="meta" style={{ fontSize: 11.5, margin: "0 0 6px" }}>—</p>
              )}

              {dessus.filter((p) => !p.semaine || !ouvre).map((p) => (
                <Pastille key={p.id} projet={p} onOuvrir={() => setOuvert(ouvert === p.id ? "" : p.id)}
                  onSupprimer={() => { void supprimer(p); }}
                  onDeplacer={(mois, semaine) => { void enregistrer(placer(p, mois, semaine)); }} />
              ))}

              {ouvre && semainesDuMois(annee, m.num).map((sem) => (
                <div key={sem.iso} className="projets-semaine">
                  <div className="meta" style={{ fontSize: 11 }}>{sem.label}</div>
                  {dessus.filter((p) => p.semaine === sem.iso).map((p) => (
                    <Pastille key={p.id} projet={p} onOuvrir={() => setOuvert(ouvert === p.id ? "" : p.id)}
                      onSupprimer={() => { void supprimer(p); }}
                      onDeplacer={(mois, semaine) => { void enregistrer(placer(p, mois, semaine)); }} />
                  ))}
                  {choisies.size > 0 && (
                    <button className="btn sm primary" style={{ width: "100%", marginTop: 2 }}
                      onClick={() => { void poser(m.num, sem.iso); }}>＋ ici</button>
                  )}
                </div>
              ))}

              {choisies.size > 0 && !ouvre ? (
                <button className="btn sm primary" style={{ width: "100%" }}
                  onClick={() => { void poser(m.num); }}>＋ ici ({choisies.size})</button>
              ) : choisies.size === 0 && (
                <button className="btn ghost sm" style={{ width: "100%" }}
                  onClick={() => { void creer(m.num); }}>＋</button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── La fiche d'un projet posé ── */}
      {ouvert && miens.some((p) => p.id === ouvert) && (
        <FicheProjet key={ouvert} projet={miens.find((p) => p.id === ouvert)!} annee={annee}
          onChange={(suite) => { void enregistrer(suite); }} onFermer={() => setOuvert("")} />
      )}

      {/* ── Le catalogue ── */}
      <div className="toolbar" style={{ margin: "18px 0 10px", flexWrap: "wrap" }}>
        <Input value={recherche} placeholder="Chercher un projet (monnaie, sortie, écrire…)"
          onChange={(e) => setRecherche(e.target.value)} style={{ flex: "1 1 220px", minWidth: 140 }} />
        {choisies.size > 0 && (
          <>
            <span className="chip" style={{ fontSize: 12 }}>{choisies.size} choisi{choisies.size > 1 ? "s" : ""}</span>
            <span className="meta" style={{ fontSize: 12 }}>→ cliquez sur un mois, ci-dessus</span>
            <button className="btn ghost sm" onClick={() => setChoisies(new Set())}>Tout décocher</button>
          </>
        )}
      </div>

      {!recherche && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <button className={`btn sm${theme ? " ghost" : " primary"}`} onClick={() => setTheme("")}>Tous</button>
          {THEMES.map((t) => (
            <button key={t.id} className={`btn sm${theme === t.id ? " primary" : " ghost"}`}
              onClick={() => setTheme(theme === t.id ? "" : t.id)}>{t.ico} {t.nom}</button>
          ))}
        </div>
      )}

      <div className="projets-grille">
        {vues.map((i) => (
          <CarteIdee key={i.id} idee={i} choisie={choisies.has(i.id)} deja={dejaPris.has(i.id)}
            onBasculer={() => basculer(i.id)} />
        ))}
      </div>
      {vues.length === 0 && (
        <p className="meta" style={{ fontSize: 12.5 }}>Rien de ce côté-là — essayez un autre mot.</p>
      )}
    </Page>
  );
}

/** Un projet posé sur l'année, vu de loin : son nom et où il en est. */
function Pastille({ projet, onOuvrir, onSupprimer, onDeplacer }: {
  projet: ProjetClasse; onOuvrir: () => void; onSupprimer: () => void;
  onDeplacer: (mois: string, semaine: string) => void;
}) {
  const etapes = lireEtapes(projet.etapesJson);
  const { faites, total } = avancement(etapes);
  const etat = etatDeduit(projet.etat, etapes);
  return (
    <button type="button" className="projets-pastille" onClick={onOuvrir}
      title={projet.descriptif || projet.titre}
      onContextMenu={(e) => openCtx(e, [
        ...MOIS.map((m) => ({
          label: `Déplacer en ${m.nom.toLowerCase()}`, icon: projet.mois === m.num ? "●" : "🗓",
          onClick: () => onDeplacer(m.num, ""),
        })),
        { label: "Retirer de l'année", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
      ])}>
      <span>{ICO_ETAT[etat]}</span>
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {projet.titre || "Sans titre"}
      </span>
      {total > 0 && <span style={{ fontSize: 10.5, color: COULEUR_ETAT[etat] }}>{faites}/{total}</span>}
    </button>
  );
}

/** Une idée du catalogue : on la coche, et elle attend qu'on lui donne un mois. */
function CarteIdee({ idee, choisie, deja, onBasculer }: {
  idee: IdeeProjet; choisie: boolean; deja: boolean; onBasculer: () => void;
}) {
  return (
    <button type="button" className={`card projets-idee${choisie ? " choisie" : ""}`}
      onClick={onBasculer} aria-pressed={choisie}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 14 }}>{choisie ? "☑" : "☐"}</span>
        <b style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>{idee.titre}</b>
        {deja && <span className="chip" style={{ fontSize: 10 }}>déjà posé</span>}
      </div>
      <p style={{ margin: "5px 0 6px", fontSize: 12, lineHeight: 1.5, color: "var(--text-2)" }}>{idee.pitch}</p>
      <div className="meta" style={{ fontSize: 11 }}>
        {icoDuTheme(idee.theme)} {nomDuTheme(idee.theme)} · plutôt en {nomDuMois(idee.mois).toLowerCase()} · {idee.etapes.length} étapes
      </div>
    </button>
  );
}

/**
 * Le projet posé qu'on ouvre : son titre et son assistant, rien d'autre. On
 * lui raconte le projet, il le monte — le titre, la phrase, le moment, les
 * étapes, les mots — puis le mène : cocher une étape, dire où en est le
 * projet, redire les mots. « Enlève le reste pour ne laisser que le chatbot »
 * (l'enseignant, 31 octobre 2026). Un projet se retire de l'année depuis sa
 * pastille.
 */
function FicheProjet({ projet, annee, onChange, onFermer }: {
  projet: ProjetClasse; annee: string; onChange: (p: ProjetClasse) => void; onFermer: () => void;
}) {
  const etat = etatDeduit(projet.etat, lireEtapes(projet.etapesJson));
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }} title={ETATS.find((e) => e.id === etat)?.nom}>{ICO_ETAT[etat]}</span>
        <b style={{ flex: 1, minWidth: 0, fontSize: 15.5 }}>{projet.titre.trim() || "Nouveau projet"}</b>
        <button className="btn ghost sm" onClick={onFermer} aria-label="Fermer">✕</button>
      </div>
      <AssistantDuProjet projet={projet} annee={annee} onChange={onChange} />
    </div>
  );
}

/** Une bulle du fil : une réplique, ou ce que l'assistant dit de lui-même — les mots préparés, une erreur. */
type Bulle = Replique & { erreur?: boolean; note?: boolean };

/**
 * L'assistant du projet : un fil de bulles et un champ. On lui raconte le
 * projet ; il range dans la fiche ce qu'il en comprend (voir
 * assistantProjet.ts) et prépare les mots et les phrases du projet. Le fil ne
 * se garde pas : chaque ouverture de la fiche repart de l'accueil, qui dit où
 * en est le projet.
 */
function AssistantDuProjet({ projet, annee, onChange }: { projet: ProjetClasse; annee: string; onChange: (p: ProjetClasse) => void }) {
  const [fil, setFil] = React.useState<Bulle[]>(() => [{ role: "assistant", content: accueilDuProjet(projet, annee) }]);
  const [saisie, setSaisie] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const [cle, setCle] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    api.settingGet("mistralApiKey").then((k) => setCle(!!k && k.trim().length > 0)).catch(() => setCle(false));
  }, []);
  // La fiche la plus récente : celle que l'assistant vient d'écrire, ou celle qui arrive d'ailleurs — jamais une plus
  // vieille, le temps que l'enregistrement revienne.
  const projetRef = React.useRef(projet);
  const recue = React.useRef(projet);
  if (projet !== recue.current) { recue.current = projet; projetRef.current = projet; }
  const changer = React.useCallback((p: ProjetClasse) => { projetRef.current = p; onChange(p); }, [onChange]);
  const dire = React.useCallback((texte: string, erreur = false) => setFil((f) => [...f, { role: "assistant", content: texte, note: true, erreur }]), []);
  const preparer = usePreparationDuCorpus(projetRef, projet, changer, dire);
  const filRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight; }, [fil, occupe]);

  const envoyer = async () => {
    const texte = saisie.trim();
    if (!texte || occupe) return;
    // Ce qui part : les répliques, sans les erreurs ni ce que l'assistant a dit de lui-même.
    const conversation: Replique[] = [...fil.filter((m) => !m.erreur && !m.note).map(({ role, content }) => ({ role, content })), { role: "user", content: texte }];
    setFil((f) => [...f, { role: "user", content: texte }]);
    setSaisie("");
    setOccupe(true);
    try {
      const r = await demanderALAssistant(projetRef.current, annee, conversation, new Date().toLocaleDateString("fr-FR"));
      const avant = projetRef.current;
      const apres = appliquerLaReponse(avant, r);
      if (apres !== avant) changer(apres);
      setFil((f) => [...f, { role: "assistant", content: r.reponse }]);
      if (r.corpus) void preparer(r.corpus === "preparer" ? "tout" : r.corpus);
    } catch (e) {
      setFil((f) => [...f, { role: "assistant", content: `Je n'ai pas pu répondre : ${texteErreur(e)}`, erreur: true }]);
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="projet-assistant">
      <div className="projet-assistant-fil" ref={filRef} aria-live="polite">
        {fil.map((m, i) => (
          <div key={i} className={`projet-assistant-bulle ${m.role === "user" ? "moi" : "lui"}${m.erreur ? " erreur" : ""}`}>{m.content}</div>
        ))}
        {cle === false && (
          <div className="projet-assistant-bulle lui erreur">Pour répondre, l'assistant a besoin de la clé Mistral : Réglages › Assistant IA.</div>
        )}
        {occupe && <div className="projet-assistant-bulle lui en-cours" aria-label="L'assistant écrit">…</div>}
      </div>
      <div className="projet-assistant-saisie">
        <Input value={saisie} autoComplete="off" placeholder="Écrivez à l'assistant…" aria-label="Votre message à l'assistant du projet"
          disabled={cle === false} onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void envoyer(); } }} />
        <button type="button" className="btn primary" disabled={!saisie.trim() || occupe || cle === false} onClick={() => { void envoyer(); }}>Envoyer</button>
      </div>
    </div>
  );
}

const combien = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/**
 * Les mots et les phrases du projet, préparés par l'assistant — ils n'ont
 * plus de panneau : tout seuls dès que le projet a un titre, une fois ; puis
 * quand l'enseignant le demande — tout refaire, d'autres mots, d'autres
 * phrases. Les mots viennent de la banque ARASAAC de cet ordinateur, pour
 * qu'ils aient une image ; les phrases, de l'IA, avec ces mots : ce sont eux
 * que les ateliers de Fabriquer prennent tant que le projet est en cours. Ce
 * qui se passe se dit en bulles (`dire`).
 */
function usePreparationDuCorpus(projetRef: React.MutableRefObject<ProjetClasse>, projet: ProjetClasse,
  changer: (p: ProjetClasse) => void, dire: (texte: string, erreur?: boolean) => void) {
  const [demande] = useReglages("corpusIa", DEMANDE_CORPUS);
  /** Les thèmes ARASAAC où l'on pioche : devinés à la première préparation, gardés pour les tirages suivants. */
  const themes = React.useRef<string[] | undefined>(undefined);
  const occupe = React.useRef(false);

  const preparer = React.useCallback(async (quoi: "tout" | "mots" | "phrases") => {
    if (occupe.current) { dire("Je prépare déjà les mots du projet : un instant."); return; }
    occupe.current = true;
    const p = projetRef.current;
    // Rien encore : on prépare tout, et la préparation automatique ne la refera pas.
    const q = aUnCorpus(p) ? quoi : "tout";
    if (q === "tout") reserverLaPreparation(p.id, p.titre, true);
    dire(q === "tout" ? "Je prépare les mots et les phrases du projet : les mots dans la banque d'images de cet ordinateur, les phrases par l'IA…"
      : q === "mots" ? "Je tire d'autres mots dans la banque d'images…" : "J'écris d'autres phrases avec les mots du projet…");
    try {
      if (q === "phrases") {
        const c = await corpusParLIa(decrireLeProjet(p), { ...demande, mots: 0, avec: corpusDe(p).mots }, servicesCorpus);
        if (!c.phrases.length) { dire("Le modèle n'a rien proposé de lisible : redemandez-moi d'autres phrases.", true); return; }
        changer({ ...projetRef.current, phrases: texteDuCorpus(c.phrases) });
        dire(`Voici ${combien(c.phrases.length, "phrase")}, écrites avec les mots du projet :\n${c.phrases.join("\n")}`);
        return;
      }
      const d = q === "mots" ? { ...demande, phrases: 0 } : demande;
      const r = await preparerLeCorpus(decrireLeProjet(p), d, servicesCorpus, graineAuHasard(), themes.current, q === "mots" ? corpusDe(p).mots : []);
      if (r.themes.length) themes.current = r.themes;
      const avant = projetRef.current;
      const suite = { ...avant };
      if (r.mots.length) suite.mots = texteDuCorpus(r.mots);
      if (q === "tout" && r.phrases.length) suite.phrases = texteDuCorpus(r.phrases);
      if (suite.mots !== avant.mots || suite.phrases !== avant.phrases) changer(suite);
      const c = corpusDe(suite);
      dire([
        resumeDeLaPreparation(r, d),
        r.mots.length ? `Les mots : ${c.mots.join(", ")}.` : "",
        q === "tout" && r.phrases.length ? `Les phrases :\n${r.phrases.join("\n")}` : "",
      ].filter(Boolean).join("\n"));
    } catch (e) {
      dire("Je n'ai pas pu préparer les mots : " + texteErreur(e), true);
    } finally {
      occupe.current = false;
    }
  }, [demande, changer, dire, projetRef]);

  // Sans mots ni phrases, ils se préparent tout seuls — une fois le titre posé, et une seule fois.
  const preparerRef = React.useRef(preparer);
  preparerRef.current = preparer;
  const vide = !aUnCorpus(projet);
  React.useEffect(() => {
    if (!vide || !titreExploitable(projet.titre)) return;
    const t = window.setTimeout(() => {
      if (!occupe.current && reserverLaPreparation(projet.id, projet.titre, true)) void preparerRef.current("tout");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [projet.id, projet.titre, vide]);

  return preparer;
}
