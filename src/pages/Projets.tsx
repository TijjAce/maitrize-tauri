import React from "react";
import { Page } from "../App";
import { api, anneeScolaireActuelle, texteErreur } from "../api";
import { Field, Input, Select, Textarea, TextareaAuto, useAsync, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { useReglages } from "../components/useMemoire";
import { decrireLeProjet, servicesCorpus } from "../components/ProjetDuMoment";
import { DEMANDE_CORPUS } from "../corpusIa";
import {
  corpusParLIa, preparerLeCorpus, reserverLaPreparation, resumeDeLaPreparation, themesProposables, titreExploitable,
} from "../corpusAuto";
import { aUnCorpus, corpusDe, resumeDuCorpus, texteDuCorpus } from "../corpusProjet";
import { libelleCategorie } from "../data/categoriesArasaac";
import { graineAuHasard } from "../hasard";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { normaliser } from "../competencesTravaillees";
import {
  CATALOGUE, ETATS, MOIS, THEMES, avancement, chercherIdees, depuisIdee, ecrireEtapes,
  etatDeduit, icoDuTheme, lireEtapes, moisCourant, nomDuMois, nomDuTheme, placer,
  projetVierge, semainesDuMois, type Etape, type IdeeProjet, type ProjetClasse,
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
    try { await api.projetDelete(p.id); reload(); }
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
          onChange={(suite) => { void enregistrer(suite); }}
          onFermer={() => setOuvert("")} onSupprimer={() => { void supprimer(miens.find((p) => p.id === ouvert)!); }} />
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

/** Le projet posé qu'on ouvre : titre, semaine, étapes à cocher. */
function FicheProjet({ projet, annee, onChange, onFermer, onSupprimer }: {
  projet: ProjetClasse; annee: string;
  onChange: (p: ProjetClasse) => void; onFermer: () => void; onSupprimer: () => void;
}) {
  const etapes = lireEtapes(projet.etapesJson);
  const etat = etatDeduit(projet.etat, etapes);
  const majEtapes = (suite: Etape[]) =>
    onChange({ ...projet, etapesJson: ecrireEtapes(suite), etat: etatDeduit(projet.etat, suite) });

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{ICO_ETAT[etat]}</span>
        <Input value={projet.titre} placeholder="Titre du projet" style={{ flex: 1 }}
          onChange={(e) => onChange({ ...projet, titre: e.target.value })} />
        <button className="btn ghost sm" onClick={onFermer} aria-label="Fermer">✕</button>
      </div>

      <TextareaAuto value={projet.descriptif} minHauteur={56} placeholder="De quoi s'agit-il, en une phrase ?"
        onChange={(e) => onChange({ ...projet, descriptif: e.target.value })} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        <span className="meta" style={{ fontSize: 12, alignSelf: "center" }}>Quand :</span>
        {MOIS.map((m) => (
          <button key={m.num} type="button" className={`btn sm${projet.mois === m.num ? " primary" : " ghost"}`}
            onClick={() => onChange(placer(projet, m.num, ""))}>{m.abrege}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <span className="meta" style={{ fontSize: 12, alignSelf: "center" }}>Semaine :</span>
        <button type="button" className={`btn sm${projet.semaine ? " ghost" : " primary"}`}
          onClick={() => onChange({ ...projet, semaine: "" })}>tout le mois</button>
        {semainesDuMois(annee, projet.mois).map((s) => (
          <button key={s.iso} type="button" className={`btn sm${projet.semaine === s.iso ? " primary" : " ghost"}`}
            onClick={() => onChange({ ...projet, semaine: s.iso })}>{s.label}</button>
        ))}
      </div>

      <CorpusDuProjet projet={projet} onChange={onChange} />

      {etapes.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <input type="checkbox" checked={e.faite} aria-label={e.texte}
            onChange={() => majEtapes(etapes.map((x, j) => (j === i ? { ...x, faite: !x.faite } : x)))} />
          <Input value={e.texte} style={{ flex: 1, minWidth: 0, textDecoration: e.faite ? "line-through" : undefined }}
            onChange={(ev) => majEtapes(etapes.map((x, j) => (j === i ? { ...x, texte: ev.target.value } : x)))} />
          <button className="btn ghost sm" aria-label="Retirer cette étape"
            onClick={() => majEtapes(etapes.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="btn ghost sm" style={{ marginTop: 4 }}
        onClick={() => majEtapes([...etapes, { texte: "", faite: false }])}>＋ Étape</button>

      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <div className="seg" role="group" aria-label="Où en est le projet">
          {ETATS.map((x) => (
            <button key={x.id} className={etat === x.id ? "active" : ""}
              onClick={() => onChange({ ...projet, etat: x.id })}>{x.nom}</button>
          ))}
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={onSupprimer}>🗑 Retirer de l'année</button>
      </div>
    </div>
  );
}

/**
 * Un champ du corpus : ce qu'on tape s'enregistre une demi-seconde après la
 * dernière lettre, ou en quittant le champ. Enregistrer à chaque frappe
 * relisait la fiche et renvoyait le curseur en fin de texte — sur dix lignes
 * de mots, on ne s'y retrouvait plus.
 */
function ChampCorpus({ valeur, onChange, ...props }: { valeur: string; onChange: (v: string) => void } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange">) {
  const [brouillon, setBrouillon] = React.useState(valeur);
  const minuterie = React.useRef<number | null>(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  // Ce qui arrive d'ailleurs — l'IA, l'autre ordinateur — remplace le brouillon, sauf pendant qu'on tape.
  React.useEffect(() => { if (minuterie.current === null) setBrouillon(valeur); }, [valeur]);
  const enregistrer = (v: string) => { minuterie.current = null; onChangeRef.current(v); };
  const taper = (v: string) => {
    setBrouillon(v);
    if (minuterie.current !== null) window.clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(() => enregistrer(v), 500);
  };
  const poser = () => {
    if (minuterie.current === null) return;
    window.clearTimeout(minuterie.current);
    enregistrer(brouillon);
  };
  // Fermer la fiche pendant qu'on tape n'en perd pas la fin.
  const brouillonRef = React.useRef(brouillon);
  brouillonRef.current = brouillon;
  React.useEffect(() => () => {
    if (minuterie.current !== null) { window.clearTimeout(minuterie.current); onChangeRef.current(brouillonRef.current); }
  }, []);
  return <Textarea {...props} value={brouillon} onChange={(e) => taper(e.target.value)} onBlur={poser} />;
}

/**
 * Les mots et les phrases du projet : ce que les ateliers de Fabriquer
 * prennent tant qu'il est en cours.
 *
 * Le corpus se prépare tout seul dès que le projet a un titre : les mots dans
 * la banque ARASAAC de cet ordinateur — ils ont une image, rien ne part —,
 * les phrases par l'IA, avec ces mots. Puis tout se change : les thèmes où
 * piocher, le tirage, les phrases, ou les mots à la main.
 */
function CorpusDuProjet({ projet, onChange }: { projet: ProjetClasse; onChange: (p: ProjetClasse) => void }) {
  const corpus = corpusDe(projet);
  const vide = !aUnCorpus(projet);
  const [demande, majDemande] = useReglages("corpusIa", DEMANDE_CORPUS);
  /** Les thèmes ARASAAC où l'on pioche : devinés à la préparation, puis ceux qu'on a choisis ; null tant qu'on ne sait pas. */
  const [themes, setThemes] = React.useState<string[] | null>(null);
  const { data: categories } = useAsync(() => servicesCorpus.banqueInstallee().then((ok) => (ok ? servicesCorpus.categories() : [])), []);
  const proposables = React.useMemo(() => themesProposables(categories ?? []), [categories]);
  const [occupe, setOccupe] = React.useState<"" | "tout" | "mots" | "phrases">("");
  const [statut, setStatut] = React.useState("");
  // Ouvert d'emblée quand il y a quelque chose à voir ; ensuite, c'est l'enseignant qui plie et déplie.
  const [ouvertAuDepart] = React.useState(() => aUnCorpus(projet));
  const projetRef = React.useRef(projet);
  projetRef.current = projet;

  /** Prépare tout, tire d'autres mots, ou fait réécrire les phrases. */
  const preparer = React.useCallback(async (quoi: "tout" | "mots" | "phrases", choisis?: string[]) => {
    setOccupe(quoi);
    setStatut(quoi === "tout" ? "Le corpus se prépare : les mots dans la banque ARASAAC, les phrases par l'IA…"
      : quoi === "mots" ? "Un autre tirage dans la banque…" : "Le modèle écrit les phrases avec les mots du corpus…");
    try {
      const p = projetRef.current;
      if (quoi === "phrases") {
        const c = await corpusParLIa(decrireLeProjet(p), { ...demande, mots: 0, avec: corpusDe(p).mots }, servicesCorpus);
        if (!c.phrases.length) { setStatut("Le modèle n'a rien proposé de lisible ; réessayez."); return; }
        onChange({ ...p, phrases: texteDuCorpus(c.phrases) });
        setStatut(`${c.phrases.length} phrases écrites par l'IA avec les mots du corpus. Relisez, retirez ce qui ne convient pas.`);
        return;
      }
      const d = quoi === "mots" ? { ...demande, phrases: 0 } : demande;
      const r = await preparerLeCorpus(decrireLeProjet(p), d, servicesCorpus, graineAuHasard(), choisis);
      if (r.themes.length) setThemes(r.themes);
      else if (choisis) setThemes(choisis);
      const suite = { ...projetRef.current };
      if (r.mots.length) suite.mots = texteDuCorpus(r.mots);
      if (quoi === "tout" && r.phrases.length) suite.phrases = texteDuCorpus(r.phrases);
      if (suite.mots !== p.mots || suite.phrases !== p.phrases) onChange(suite);
      setStatut(resumeDeLaPreparation(r, d));
    } catch (e) {
      setStatut("Préparation impossible : " + texteErreur(e));
    } finally { setOccupe(""); }
  }, [demande, onChange]);

  // Sans corpus, il se prépare tout seul — une fois le titre posé, et une seule fois.
  const preparerRef = React.useRef(preparer);
  preparerRef.current = preparer;
  React.useEffect(() => {
    if (!vide || !titreExploitable(projet.titre)) return;
    const t = window.setTimeout(() => {
      if (reserverLaPreparation(projet.id, projet.titre, true)) void preparerRef.current("tout");
    }, 1200);
    return () => window.clearTimeout(t);
  }, [projet.id, projet.titre, vide]);

  const choisis = themes ?? [];
  return (
    <details className="tri-fiche corpus-projet" open={ouvertAuDepart}>
      <summary>📌 Le corpus du projet · {resumeDuCorpus(corpus)}{occupe ? " · en préparation…" : ""}</summary>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "4px 0 8px" }}>
        Ses mots et ses phrases nourrissent les ateliers de Fabriquer tant que le projet est en cours : mots mêlés, phrases en désordre,
        maisons du tri, loto, étiquettes. Il se prépare tout seul — les mots dans la banque ARASAAC de cet ordinateur, pour qu'ils aient
        une image ; les phrases par l'IA, avec ces mots — et se change autant qu'on veut.
      </p>
      {(proposables.length > 0 || choisis.length > 0) && (
        <div className="corpus-themes" role="group" aria-label="Les thèmes ARASAAC où piocher les mots">
          <span className="meta">Thèmes ARASAAC :</span>
          {choisis.map((t) => (
            <span key={t} className="bm-chip">
              <span className="bm-mot">{libelleCategorie(t)}</span>
              <button type="button" className="bm-x" aria-label={`Retirer le thème ${libelleCategorie(t)}`}
                onClick={() => setThemes(choisis.filter((x) => x !== t))}>×</button>
            </span>
          ))}
          {!choisis.length && <span className="meta">aucun pour l'instant</span>}
          {proposables.length > 0 && (
            <Select value="" aria-label="Ajouter un thème ARASAAC" style={{ maxWidth: 220 }}
              onChange={(e) => { if (e.target.value) setThemes([...choisis, e.target.value]); }}>
              <option value="">＋ un thème…</option>
              {proposables.filter((c) => !choisis.includes(c.nom)).map((c) => (
                <option key={c.nom} value={c.nom}>{libelleCategorie(c.nom)} ({c.nombre})</option>
              ))}
            </Select>
          )}
          <Select value={demande.mots} onChange={(e) => majDemande({ mots: Number(e.target.value) })} aria-label="Nombre de mots" style={{ width: 110 }}>
            {[8, 12, 16, 24, 32].map((n) => <option key={n} value={n}>{n} mots</option>)}
          </Select>
          <button type="button" className="btn sm" disabled={!!occupe} onClick={() => void preparer("mots", themes ?? undefined)}
            title="Un autre tirage dans les thèmes choisis : il remplace les mots">
            {occupe === "mots" ? "Tirage…" : "🎲 D'autres mots"}
          </button>
        </div>
      )}
      <div className="corpus-projet-colonnes">
        <Field label="Les mots, un par ligne">
          <ChampCorpus rows={8} valeur={projet.mots} onChange={(mots) => onChange({ ...projet, mots })} placeholder={"citrouille\nsoupe\nlouche…"} aria-label="Les mots du projet" />
        </Field>
        <Field label="Les phrases, une par ligne">
          <ChampCorpus rows={8} valeur={projet.phrases} onChange={(phrases) => onChange({ ...projet, phrases })} placeholder={"Nous coupons la citrouille.\nLa soupe est chaude."} aria-label="Les phrases du projet" />
        </Field>
      </div>
      <div className="ia-phrases">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>✨ Les phrases, par l'IA</span>
          <Select value={demande.cycle} onChange={(e) => majDemande({ cycle: Number(e.target.value) as 2 | 3 })} aria-label="Cycle" style={{ width: 100 }}>
            <option value={2}>Cycle 2</option><option value={3}>Cycle 3</option>
          </Select>
          <Select value={demande.phrases} onChange={(e) => majDemande({ phrases: Number(e.target.value) })} aria-label="Nombre de phrases" style={{ width: 130 }}>
            <option value={0}>pas de phrase</option>
            {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} phrases</option>)}
          </Select>
          <button type="button" className="btn sm" disabled={!!occupe} onClick={() => void preparer("phrases")}
            title="Le modèle réécrit les phrases avec les mots du corpus : elles remplacent celles-ci">
            {occupe === "phrases" ? "Le modèle écrit…" : "✨ D'autres phrases"}
          </button>
          {vide && (
            <button type="button" className="btn sm primary" disabled={!!occupe} onClick={() => void preparer("tout", themes ?? undefined)}>
              {occupe === "tout" ? "Préparation…" : "⚙️ Préparer le corpus"}
            </button>
          )}
          <span className="meta" style={{ fontSize: 12 }}>Écrites avec les mots du corpus. Seul le projet part, sans prénom d'élève.</span>
        </div>
      </div>
      {statut && <p className="meta corpus-statut" aria-live="polite">{statut}</p>}
    </details>
  );
}
