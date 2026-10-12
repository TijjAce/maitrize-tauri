import React from "react";
import { Aide } from "../components/Aide";
import { api, type Seance } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { TapuscritVue, motDuMot, usePictosDesMots } from "../components/Tapuscrit";
import { priseDeParoleImprimable, sequentielImprimable } from "../aidesDesSequences";
import { toast } from "../components/Toaster";
import { Boutons, Coche, Colonnes } from "./AteliersMaths";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { lireConsignes, motPrincipal, type MotDeConsigne } from "../tapuscrit";
import type { RefPicto } from "../pictosAppoint";
import {
  CLE_CODE, CODE_PAR_DEFAUT, COULEURS, FAMILLES_CODE, FORMATS_CARTE, MARQUES, NIVEAUX_CODE, REGLAGES_CARTE_CODE, STYLE_CODE_PHRASE,
  actifsPour, exemplesPour, htmlCodeDeLaPhrase, lireCode, marquer, phraseSansAnalyse, reglagesCarteSurs,
  type CodeDeLaPhrase, type FamilleCode, type IdConstituant, type Marque, type MarqueDuConstituant, type ReglagesCarteCode,
} from "../codeDeLaPhrase";
import {
  CHAINAGES, ETAPES_SEQUENTIEL_MAX, EXEMPLES_RESOLUTION, FORMES_SEQUENTIEL, MODELES_PAROLE, MOTS_PAROLE_MAX, NIVEAUX_RESOLUTION,
  REGLAGES_FONCTION, REGLAGES_MODELISATION, REGLAGES_PAROLE, REGLAGES_RESOLUTION, REGLAGES_SEQUENTIEL, STYLE_AIDES, STYLE_PAROLE,
  etapesDeLaFiche, htmlFonction, htmlModelisation, htmlPriseDeParole, htmlResolution, htmlSequentiel, motsDeLaParole, modeleParole,
  reglagesFonctionSurs, reglagesModelisationSurs, reglagesParoleSurs, reglagesResolutionSurs, reglagesSequentielSurs, styleDuSequentiel,
  type ReglagesParole, type ReglagesSequentiel,
} from "../aidesALaTache";

// ── Fabriquer › Aides à la tâche ──────────────────────────────────────────
//
// Les fiches de Cap école inclusive pour structurer la tâche (voir
// aidesALaTache.ts) : décomposer une tâche, préparer une prise de parole,
// résoudre un problème, passer de la figure à l'équation, modéliser par une
// fonction. Les deux premières se glissent aussi dans les séquences qu'on
// crée ; « Modifier dans Fabriquer » les rouvre ici.

/** Imprime, ou range sur le bureau, une feuille dont il faut d'abord charger les images. */
function useSortie(atelier: string, titre: string, fabriquer: () => Promise<{ html: string; style: string }>) {
  const imprimer = () => {
    void fabriquer()
      .then(({ html, style }) => imprimerAtelier(atelier, titre, html, STYLE_FEUILLE + style))
      .catch((e) => toast(String(e), { icone: "⚠️" }));
  };
  const bureau = async () => {
    const { html, style } = await fabriquer();
    return enregistrerSurLeBureau(atelier, titre, html, STYLE_FEUILLE + style);
  };
  return { imprimer, bureau };
}

// ── Décomposer la tâche ───────────────────────────────────────────────────

/** Le picto de chaque étape : celui de son geste, sinon de son premier mot de sens. */
const principaux = (etapes: string[]) => etapes.map(motPrincipal);

/** Les séances qui ont des consignes : on peut en faire une tâche décomposée. */
function useSeancesAvecConsignes(): Seance[] {
  const { data } = useAsync(() => api.seancesList(), []);
  return React.useMemo(() => (data ?? []).filter((s) => lireConsignes(s.consignes).length > 0), [data]);
}

export function SequentielTab() {
  const [brut, maj] = useReglages("sequentiel", REGLAGES_SEQUENTIEL);
  const r = React.useMemo(() => reglagesSequentielSurs(brut), [brut]);
  const etapes = etapesDeLaFiche(r);
  const mots = React.useMemo(() => principaux(etapes), [etapes.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps
  const { pictoDe, images } = usePictosDesMots(mots.filter((m): m is MotDeConsigne => m !== null));
  const pictos: (RefPicto | null)[] = mots.map((m) => (m ? pictoDe(m) : null));
  const html = React.useMemo(() => htmlSequentiel(r, pictos, images), [r, JSON.stringify(pictos), images]); // eslint-disable-line react-hooks/exhaustive-deps
  const titre = r.titre.trim() || "Décomposer la tâche";
  const sortie = useSortie("sequentiel", titre, () => sequentielImprimable(r));
  const seances = useSeancesAvecConsignes();
  const [voirPictos, setVoirPictos] = React.useState(false);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Décomposer la tâche
          <Aide titre="Décomposer la tâche" vers="droite"><p>Une tâche en étapes simples, numérotées, que l'élève suit comme une recette illustrée et coche une à une. Le chaînage cache
          l'étape qu'il apprend, version après version, jusqu'à ce qu'il se passe du support ; le soliloque la lui fait dire en la faisant.</p></Aide>
        </h3>
        <Field label="La tâche">
          <Input value={r.titre} maxLength={120} placeholder="Coller une feuille dans mon cahier" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label={`Les étapes, une par ligne (${ETAPES_SEQUENTIEL_MAX} au plus)`}>
          <Textarea rows={6} value={r.etapes.join("\n")}
            onChange={(e) => maj({ etapes: e.target.value.split(/\r?\n/).slice(0, ETAPES_SEQUENTIEL_MAX) })} />
        </Field>
        {seances.length > 0 && (
          <Field label="Ou les consignes d'une séance">
            <Select value="" onChange={(e) => {
              const s = seances.find((x) => x.id === e.target.value);
              if (s) maj({ titre: s.titre, etapes: lireConsignes(s.consignes) });
            }}>
              <option value="">Choisir une séance…</option>
              {seances.map((s) => <option key={s.id} value={s.id}>{s.titre || `Séance ${s.numero}`}</option>)}
            </Select>
          </Field>
        )}
        <Field label="La fiche">
          <div className="seg" style={{ flexWrap: "wrap" }}>
            {FORMES_SEQUENTIEL.map((f) => (
              <button key={f.id} type="button" className={r.forme === f.id ? "active" : ""} title={f.quoi} onClick={() => maj({ forme: f.id })}>{f.nom}</button>
            ))}
          </div>
        </Field>
        {r.forme === "sequentiel" && (
          <Field label="Disposition">
            <Select value={r.disposition} onChange={(e) => maj({ disposition: e.target.value as ReglagesSequentiel["disposition"] })}>
              <option value="liste">En liste</option>
              <option value="grille">En grille</option>
              <option value="livret">Une étape par page</option>
            </Select>
          </Field>
        )}
        <Field label="Le chaînage">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Select value={r.chainage} onChange={(e) => maj({ chainage: e.target.value as ReglagesSequentiel["chainage"] })}>
              {CHAINAGES.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Select>
            {(({ nom, quoi }) => <Aide titre={nom} vers="gauche"><p>{quoi}</p></Aide>)(CHAINAGES.find((c) => c.id === r.chainage) ?? CHAINAGES[0])}
          </div>
        </Field>
        <Field label="Ce dont j'ai besoin">
          <Input value={r.materiel} maxLength={300} placeholder="Mon cahier, la colle…" onChange={(e) => maj({ materiel: e.target.value })} />
        </Field>
        <Field label="Ce que je dois obtenir">
          <Input value={r.resultat} maxLength={300} placeholder="Le résultat attendu" onChange={(e) => maj({ resultat: e.target.value })} />
        </Field>
        <Coche on={r.redire} libelle="D'abord : je lis la consigne et je la redis avec mes mots" onChange={(v) => maj({ redire: v })} />
        <Coche on={r.verifier} libelle="À la fin : je vérifie mon travail" onChange={(v) => maj({ verifier: v })} />
        <Coche on={r.pictos} libelle="Le picto du geste de chaque étape" onChange={(v) => maj({ pictos: v })} />
        <Coche on={r.cases} libelle="Une case à cocher par étape" onChange={(v) => maj({ cases: v })} />
        <Coche on={r.soliloque} libelle="La page du soliloque : je me dis ce que je fais" onChange={(v) => maj({ soliloque: v })} />
        {r.pictos && etapes.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button type="button" className="lien" onClick={() => setVoirPictos((v) => !v)}>
              {voirPictos ? "▾" : "▸"} Changer le picto d'une étape
            </button>
            {voirPictos && <div style={{ marginTop: 6 }}><TapuscritVue consignes={etapes} modifiable compact /></div>}
          </div>
        )}
        <Boutons peut={etapes.length > 0} onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={styleDuSequentiel(r)} />}
    />
  );
}

// ── Préparer une prise de parole ──────────────────────────────────────────

export function PriseDeParoleTab() {
  const [brut, maj] = useReglages("priseDeParole", REGLAGES_PAROLE);
  const r = React.useMemo(() => reglagesParoleSurs(brut), [brut]);
  const mots = React.useMemo(() => motsDeLaParole(r).map(motDuMot), [r]);
  const { pictoDe, images } = usePictosDesMots(mots);
  const html = React.useMemo(() => htmlPriseDeParole(r, (mot) => pictoDe(motDuMot(mot)), images), [r, pictoDe, images]);
  const titre = r.sujet.trim() ? `Prise de parole — ${r.sujet.trim()}` : "Préparer une prise de parole";
  const sortie = useSortie("priseDeParole", titre, () => priseDeParoleImprimable(r));
  const modele = modeleParole(r.modele);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Préparer une prise de parole
          <Aide titre="Préparer une prise de parole" vers="droite"><p>Organiser ses idées avant de parler : la carte mentale à compléter, le sujet au centre ; les mots pour enchaîner ; des
          cartes-images qu'on choisit et qu'on range dans l'ordre où l'on parlera ; un dé à raconter.</p></Aide>
        </h3>
        <Field label="Le sujet">
          <Input value={r.sujet} maxLength={80} placeholder="Les saisons, mon animal préféré…" onChange={(e) => maj({ sujet: e.target.value })} />
        </Field>
        <Field label="La carte">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div className="seg" style={{ flexWrap: "wrap" }}>
              {MODELES_PAROLE.map((m) => (
                <button key={m.id} type="button" className={r.modele === m.id ? "active" : ""} title={m.quoi}
                  onClick={() => maj({ modele: m.id, branches: m.branches.slice(0, 4).map((b) => b.titre) })}>{m.nom}</button>
              ))}
            </div>
            <Aide titre={modele.nom} vers="gauche"><p>{modele.quoi}</p></Aide>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {modele.branches.map((b) => {
              const on = r.branches.includes(b.titre);
              return (
                <button key={b.titre} type="button" className={`btn sm${on ? " primary" : " ghost"}`}
                  disabled={on && r.branches.length <= 2}
                  onClick={() => maj({ branches: on ? r.branches.filter((t) => t !== b.titre) : [...r.branches, b.titre] })}>{b.titre}</button>
              );
            })}
          </div>
        </Field>
        <Coche on={r.carte} libelle="La carte mentale à compléter" onChange={(v) => maj({ carte: v })} />
        <Coche on={r.debuts} libelle="Les mots pour enchaîner mes idées" onChange={(v) => maj({ debuts: v })} />
        <Coche on={r.cartes} libelle="Les cartes-images des mots-clés, à découper" onChange={(v) => maj({ cartes: v })} />
        <Field label="Le dé à raconter">
          <Select value={r.de} onChange={(e) => maj({ de: e.target.value as ReglagesParole["de"] })}>
            <option value="aucun">Pas de dé</option>
            <option value="questions">Ses faces : qui, quoi, où, quand, comment, pourquoi</option>
            <option value="mots">Ses faces : les mots-clés</option>
          </Select>
        </Field>
        {(r.cartes || r.de === "mots") && (
          <Field label={`Les mots-clés, un par ligne (${MOTS_PAROLE_MAX} au plus)`}>
            <Textarea rows={5} value={r.mots.join("\n")} onChange={(e) => maj({ mots: e.target.value.split(/\r?\n/).slice(0, MOTS_PAROLE_MAX) })} />
          </Field>
        )}
        <Boutons peut={r.carte || r.debuts || r.cartes || r.de !== "aucun"} onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PAROLE()} />}
    />
  );
}

// ── Résoudre un problème ──────────────────────────────────────────────────

export function ResolutionTab() {
  const [brut, maj] = useReglages("resolution", REGLAGES_RESOLUTION);
  const r = React.useMemo(() => reglagesResolutionSurs(brut), [brut]);
  const html = React.useMemo(() => htmlResolution(r), [r]);
  const sortie = useSortie("resolution", "Résoudre un problème", async () => ({ html, style: STYLE_AIDES }));
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Résoudre un problème, étape par étape
          <Aide titre="Résoudre un problème, étape par étape" vers="droite"><p>Pour les élèves qui lisent difficilement ou se repèrent mal dans un texte : on travaille l'énoncé en couleurs, la question
          sort du texte et reste sous les yeux, puis quatre étapes — ce qu'on cherche, la phrase devenue égalité, la résolution,
          la vérification et la phrase réponse.</p></Aide>
        </h3>
        <Field label="Niveau">
          <div className="seg">
            {NIVEAUX_RESOLUTION.map((n) => (
              <button key={n.id} type="button" className={r.niveau === n.id ? "active" : ""} title={n.quoi} onClick={() => maj({ niveau: n.id })}>{n.nom}</button>
            ))}
          </div>
        </Field>
        <Field label="L'énoncé, une phrase par ligne, sans la question">
          <Textarea rows={4} value={r.enonce} onChange={(e) => maj({ enonce: e.target.value })} />
        </Field>
        <Field label="La question">
          <Input value={r.question} maxLength={300} onChange={(e) => maj({ question: e.target.value })} />
        </Field>
        <button type="button" className="lien" onClick={() => maj(EXEMPLES_RESOLUTION[r.niveau])}>↺ Reprendre l'énoncé d'exemple</button>
        <Coche on={r.couleurs} libelle="La légende pour travailler l'énoncé en couleurs" onChange={(v) => maj({ couleurs: v })} />
        <Coche on={r.questionAPart} libelle="La question sur un bandeau, à garder sous les yeux" onChange={(v) => maj({ questionAPart: v })} />
        <Boutons peut={Boolean(r.enonce.trim())} onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_AIDES} />}
    />
  );
}

// ── Le code de la phrase ──────────────────────────────────────────────────

export function CodePhraseTab() {
  const [brutCode, majCode] = useReglages<CodeDeLaPhrase>(CLE_CODE, CODE_PAR_DEFAUT);
  const code = React.useMemo(() => lireCode(brutCode), [brutCode]);
  const [brut, maj] = useReglages<ReglagesCarteCode>("codePhraseCarte", REGLAGES_CARTE_CODE);
  const r = React.useMemo(() => reglagesCarteSurs(brut), [brut]);
  const html = React.useMemo(() => htmlCodeDeLaPhrase(code, r), [code, r]);
  const sortie = useSortie("codePhrase", "Le code de la phrase", async () => ({ html, style: STYLE_CODE_PHRASE }));
  const changer = (id: IdConstituant, x: Partial<MarqueDuConstituant>) => majCode({ [id]: { ...code[id], ...x } });
  const basculer = (id: IdConstituant) => maj({ caches: r.caches.includes(id) ? r.caches.filter((x) => x !== id) : [...r.caches, id] });
  const famille = (f: FamilleCode) => maj({ familles: r.familles.includes(f) ? r.familles.filter((x) => x !== f) : [...r.familles, f] });
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le code de la phrase
          <Aide titre="Le code de la phrase" vers="droite">
            <p>{"Les couleurs et les marques de l'analyse, choisies une fois pour toute la classe : la carte du code les montre à l'élève pendant qu'il analyse, et les feuilles de grammaire les reprennent dans leurs consignes et leurs corrigés."}</p>
            <p>{"Le niveau montre ce que le programme y fait apprendre, du CP à la 6e : les compléments deviennent au CE2 le complément du verbe et le complément de phrase ; au cycle 3 viennent le COD, le COI, l'attribut, le complément du nom, et de nouvelles classes de mots."}</p>
            <p>{"Chaque élément a une couleur et une marque — souligné, entouré, encadré… — : la marque reste lisible quand la feuille est photocopiée en noir et blanc, et pour l'élève qui distingue mal les couleurs."}</p>
          </Aide>
        </h3>
        <Field label="Le niveau">
          <div className="seg">
            {NIVEAUX_CODE.map((n) => (
              <button key={n} type="button" className={r.niveau === n ? "active" : ""} onClick={() => maj({ niveau: n, exemple: 0 })}>{n}</button>
            ))}
          </div>
        </Field>
        {FAMILLES_CODE.map((f) => (
          <div key={f.id} className="cp-famille-reglages">
            <label className="pb-coche cp-famille-titre">
              <input type="checkbox" checked={r.familles.includes(f.id)} onChange={() => famille(f.id)} /><span>{f.nom}</span>
            </label>
            {r.familles.includes(f.id) && actifsPour(r.niveau, f.id).map((c) => (
              <div key={c.id} className={`cp-reglage${r.caches.includes(c.id) ? " cp-cache" : ""}`}>
                <div className="cp-reglage-tete">
                  <span className="cp-reglage-nom" dangerouslySetInnerHTML={{ __html: marquer(code, c.id, c.libelle) }} />
                  <label className="cp-sur-carte" title="Laisser sur la carte, ou l'en retirer : le code reste le même pour les feuilles">
                    <input type="checkbox" checked={!r.caches.includes(c.id)} onChange={() => basculer(c.id)} /> sur la carte
                  </label>
                </div>
                <div className="cp-reglage-choix">
                  <div className="cp-couleurs" role="radiogroup" aria-label={`La couleur : ${c.libelle.toLowerCase()}`}>
                    {COULEURS.map((k) => (
                      <button key={k.id} type="button" role="radio" aria-checked={code[c.id].couleur === k.id} aria-label={k.nom} title={k.nom}
                        className={`cp-pastille${code[c.id].couleur === k.id ? " active" : ""}`} style={{ background: k.hex }}
                        onClick={() => changer(c.id, { couleur: k.id })} />
                    ))}
                  </div>
                  <Select value={code[c.id].marque} aria-label={`La marque : ${c.libelle.toLowerCase()}`}
                    onChange={(e) => changer(c.id, { marque: e.target.value as Marque })}>
                    {MARQUES.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                  </Select>
                </div>
              </div>
            ))}
          </div>
        ))}
        <button type="button" className="lien" onClick={() => majCode(CODE_PAR_DEFAUT)}>↺ Reprendre le code proposé</button>
        <Field label="La carte">
          <div className="seg">
            {FORMATS_CARTE.map((f) => (
              <button key={f.id} type="button" className={r.format === f.id ? "active" : ""} title={f.quoi} onClick={() => maj({ format: f.id })}>{f.nom}</button>
            ))}
          </div>
        </Field>
        {r.familles.includes("groupes") && (
          <Field label="La phrase d'exemple">
            <Select value={r.exemple} onChange={(e) => maj({ exemple: Number(e.target.value) })}>
              {exemplesPour(r.niveau).map((x, i) => <option key={x.phrase} value={i}>{phraseSansAnalyse(x.phrase)}</option>)}
            </Select>
          </Field>
        )}
        <Coche on={r.indices} libelle="Ce qui fait reconnaître chaque élément : « C'est… qui », « ne… pas »…" onChange={(v) => maj({ indices: v })} />
        <p className="meta" style={{ fontSize: 12.5, margin: "8px 0 0" }}>Ce code sert aussi aux feuilles de grammaire : leurs consignes et leurs corrigés le suivent.</p>
        <Boutons onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_CODE_PHRASE} />}
    />
  );
}

// ── De la figure à l'équation ─────────────────────────────────────────────

export function ModelisationTab() {
  const [brut, maj] = useReglages("modelisation", REGLAGES_MODELISATION);
  const r = React.useMemo(() => reglagesModelisationSurs(brut), [brut]);
  const html = React.useMemo(() => htmlModelisation(r), [r]);
  const sortie = useSortie("modelisation", "De la figure à l'équation", async () => ({ html, style: STYLE_AIDES }));
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          De la figure à l'équation
          <Aide titre="De la figure à l'équation" vers="droite"><p>Un problème de géométrie qui se résout par une équation, décortiqué en six étapes : lire l'énoncé en trois parts, l'expliquer
          sur la figure, découper la figure, chercher par essais, passer aux calculs avec x, contrôler — aussi en découpant.</p></Aide>
        </h3>
        <Field label="L'énoncé, une phrase par ligne">
          <Textarea rows={5} value={r.enonce} onChange={(e) => maj({ enonce: e.target.value })} />
        </Field>
        <Field label="La consigne">
          <Input value={r.consigne} maxLength={300} onChange={(e) => maj({ consigne: e.target.value })} />
        </Field>
        <Field label="La longueur qui varie, qu'on appellera x">
          <Input value={r.inconnue} maxLength={12} style={{ width: 120 }} onChange={(e) => maj({ inconnue: e.target.value })} />
        </Field>
        <button type="button" className="lien" onClick={() => maj(REGLAGES_MODELISATION)}>↺ Reprendre l'énoncé d'exemple</button>
        <Coche on={r.essais} libelle="Le tableau des essais successifs" onChange={(v) => maj({ essais: v })} />
        <Coche on={r.decoupage} libelle="Contrôler aussi en découpant" onChange={(v) => maj({ decoupage: v })} />
        <Boutons peut={Boolean(r.enonce.trim())} onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_AIDES} />}
    />
  );
}

// ── Modéliser par une fonction ────────────────────────────────────────────

export function FonctionTab() {
  const [brut, maj] = useReglages("fonction", REGLAGES_FONCTION);
  const r = React.useMemo(() => reglagesFonctionSurs(brut), [brut]);
  const html = React.useMemo(() => htmlFonction(r), [r]);
  const sortie = useSortie("fonction", "Modéliser par une fonction", async () => ({ html, style: STYLE_AIDES }));
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Modéliser par une fonction
          <Aide titre="Modéliser par une fonction" vers="droite"><p>Une figure à géométrie variable, décortiquée avant de calculer : le texte et la figure aux mêmes couleurs, ce qui est fixe et
          ce qui bouge, les points qui font bouger et ceux qui suivent, une partie de la figure isolée à la fois.</p></Aide>
        </h3>
        <Field label="L'énoncé, une phrase par ligne">
          <Textarea rows={4} value={r.enonce} onChange={(e) => maj({ enonce: e.target.value })} />
        </Field>
        <Field label="La question">
          <Textarea rows={2} value={r.question} onChange={(e) => maj({ question: e.target.value })} />
        </Field>
        <Field label="La longueur qui varie, qu'on appellera x">
          <Input value={r.variable} maxLength={12} style={{ width: 120 }} onChange={(e) => maj({ variable: e.target.value })} />
        </Field>
        <button type="button" className="lien" onClick={() => maj(REGLAGES_FONCTION)}>↺ Reprendre l'énoncé d'exemple</button>
        <Coche on={r.tableau} libelle="Ensuite : le tableau de valeurs" onChange={(v) => maj({ tableau: v })} />
        <Coche on={r.repere} libelle="Ensuite : le repère pour placer les points" onChange={(v) => maj({ repere: v })} />
        <Boutons peut={Boolean(r.enonce.trim())} onImprimer={sortie.imprimer} onBureau={sortie.bureau} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_AIDES} />}
    />
  );
}
