import React from "react";
import { useNavigate } from "react-router-dom";
import { api, texteErreur } from "../api";
import { Aide } from "./Aide";
import { EVT_DONNEES_DISTANTES, Modal, Select, ouvrirOnglet, useAsync } from "./ui";
import { toast, toastAnnulable } from "./Toaster";
import { useMemoire } from "./useMemoire";
import { PliDuCatalogue } from "./PliDuCatalogue";
import { donneesDuReferentiel, type CompetenceSelectionnee, type RefCG, type RefComp, type RefDom, type RefSous } from "./CompetenceTree";
import { correspond } from "../competencesTravaillees";
import {
  EVT_COMPETENCES_ATELIER, ORDRE_DES_NIVEAUX, PREFIXE_COMPETENCES, detacherAtelier, identiteCompetence, liensParCompetence,
  niveauxDeLaLigne, nombreDeCompetences, rattacherAtelier, vautPourLeNiveau, type LienAtelier,
} from "../ateliersCompetences";
import { FAMILLES, type Onglet } from "../catalogueAteliers";

// ── Fabriquer, par compétence ─────────────────────────────────────────────
//
// Un même atelier sert plusieurs domaines, plusieurs compétences, plusieurs
// niveaux : le coloriage magique fait calculer ou entendre des sons. Lu par
// famille, le catalogue ne le dit pas. Ici, on part des programmes : chaque
// compétence, et les ateliers qui la travaillent — ce qui est couvert, et ce
// qui ne l'est pas encore.
//
// Rattacher un atelier écrit dans « Ce que cela travaille » : c'est la même
// liste, que l'atelier montre, que sa feuille imprime, et où les séquences
// créées sur la compétence viennent piocher.

/** Ce qu'on glisse : l'identifiant d'un atelier. */
const TYPE_ATELIER = "text/x-maitrize-atelier";

/** Un atelier tel que cet écran le montre : ceux de Fabriquer, et ceux de la communication, qui gardent aussi leurs compétences. */
interface AtelierMontre { id: string; nom: string; icone: string; quoi: string; onglet?: Onglet; caa?: string }

const FAMILLES_MONTREES: { id: string; libelle: string; ateliers: AtelierMontre[] }[] = [
  ...FAMILLES.map((f) => ({ id: f.id, libelle: f.libelle, ateliers: f.outils.map((o) => ({ id: o.id, nom: o.nom, icone: o.icone, quoi: o.quoi, onglet: o.id })) })),
  {
    id: "caa", libelle: "💬 Communication",
    ateliers: [
      { id: "tla", nom: "Tableaux de langage", icone: "🗣", quoi: "Les tableaux de langage assisté, dans Communication.", caa: "tla" },
      { id: "supports", nom: "Supports visuels", icone: "🖼", quoi: "Les supports visuels, dans Communication.", caa: "supports" },
    ],
  },
];
const ATELIERS = new Map(FAMILLES_MONTREES.flatMap((f) => f.ateliers).map((a) => [a.id, a]));

/** L'icône d'un domaine du programme, d'après son intitulé. */
const ICONES_DOMAINES: [RegExp, string][] = [
  [/langues/i, "🌍"], [/langage/i, "🗣"], [/français/i, "📖"], [/physique/i, "🏃"], [/artistique/i, "🎨"],
  [/math/i, "🔢"], [/temps et l.espace/i, "🧭"], [/histoire|géographie/i, "🗺"], [/moral et civique/i, "🤝"], [/vivant|sciences/i, "🔬"],
];
const iconeDuDomaine = (titre: string) => ICONES_DOMAINES.find(([re]) => re.test(titre))?.[1] ?? "📘";

type Montrer = "toutes" | "avec" | "sans";
interface Choix { referentiel: string; niveau: string; montrer: Montrer; sansSeulement: boolean }
const lireChoix = (brut: unknown): Choix => {
  const o = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  return {
    referentiel: typeof o.referentiel === "string" ? o.referentiel : "",
    niveau: typeof o.niveau === "string" ? o.niveau : "",
    montrer: o.montrer === "avec" || o.montrer === "sans" ? o.montrer : "toutes",
    sansSeulement: o.sansSeulement === true,
  };
};

/** Les listes de compétences des ateliers, tenues à jour d'où qu'elles changent. */
function useListesDesAteliers(): [Record<string, string>, React.Dispatch<React.SetStateAction<Record<string, string>>>, () => void] {
  const [reglages, setReglages] = React.useState<Record<string, string>>({});
  const relire = React.useCallback(() => { api.settingsPrefixe(PREFIXE_COMPETENCES).then(setReglages).catch(() => {}); }, []);
  React.useEffect(() => {
    relire();
    window.addEventListener(EVT_COMPETENCES_ATELIER, relire);
    window.addEventListener(EVT_DONNEES_DISTANTES, relire);
    return () => {
      window.removeEventListener(EVT_COMPETENCES_ATELIER, relire);
      window.removeEventListener(EVT_DONNEES_DISTANTES, relire);
    };
  }, [relire]);
  return [reglages, setReglages, relire];
}

/** Un atelier rattaché, une seule fois même s'il l'est par plusieurs listes ; les classes de ces listes, quand elles en sont. */
function ateliersDesLiens(liens: LienAtelier[]): { atelier: string; classes: string[] }[] {
  const sortie: { atelier: string; classes: string[] }[] = [];
  for (const l of liens) {
    let a = sortie.find((x) => x.atelier === l.atelier);
    if (!a) sortie.push(a = { atelier: l.atelier, classes: [] });
    if (ORDRE_DES_NIVEAUX.includes(l.objectif) && !a.classes.includes(l.objectif)) a.classes.push(l.objectif);
  }
  return sortie;
}

const raccourcir = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

export function CatalogueParCompetence({ recherche, onOuvrir }: { recherche: string; onOuvrir: (id: Onglet) => void }) {
  const naviguer = useNavigate();
  const { data: refs } = useAsync(() => api.referentielsList(), []);
  const actifs = React.useMemo(() => (refs ?? []).filter((r) => r.actif), [refs]);
  const [choix, setChoix] = useMemoire<Choix>("par-competence", lireChoix);
  const changer = (m: Partial<Choix>) => setChoix({ ...choix, ...m });
  const ref = actifs.find((r) => r.id === choix.referentiel) ?? actifs[0];
  const data = React.useMemo(() => (ref ? donneesDuReferentiel(ref) : null), [ref]);
  const [plis, setPlis] = useMemoire<string[]>("plis-competences", (b) => (Array.isArray(b) ? b.filter((x): x is string => typeof x === "string") : []));

  const [reglages, setReglages, relire] = useListesDesAteliers();
  const liens = React.useMemo(() => liensParCompetence(reglages), [reglages]);
  const compte = React.useMemo(() => nombreDeCompetences(reglages), [reglages]);

  // L'atelier qu'on glisse, la compétence survolée, celle dont on choisit les ateliers.
  const [enVol, setEnVol] = React.useState("");
  const [survol, setSurvol] = React.useState("");
  const [choisir, setChoisir] = React.useState<CompetenceSelectionnee | null>(null);

  // Les niveaux du référentiel affiché ; un niveau qui n'y est pas ne filtre rien.
  const niveaux = React.useMemo(() => {
    const vus = new Set<string>();
    for (const dom of data?.domaines ?? []) for (const sd of dom.sousDomaines) {
      for (const c of [...(sd.competences ?? []), ...(sd.competencesGenerales ?? []).flatMap((cg) => cg.competences ?? [])]) {
        niveauxDeLaLigne(c.niveau).forEach((n) => vus.add(n));
      }
    }
    return ORDRE_DES_NIVEAUX.filter((n) => vus.has(n));
  }, [data]);
  const niveau = niveaux.includes(choix.niveau) ? choix.niveau : "";
  const cherche = recherche.trim().length >= 2 ? recherche.trim() : "";

  const ecrire = async (ecrit: Record<string, string>): Promise<boolean> => {
    if (!Object.keys(ecrit).length) return false;
    setReglages((r) => ({ ...r, ...ecrit }));
    try {
      for (const [cle, valeur] of Object.entries(ecrit)) await api.settingSet(cle, valeur);
      window.dispatchEvent(new Event(EVT_COMPETENCES_ATELIER));
      return true;
    } catch (e) {
      toast("Non enregistré : " + texteErreur(e), { icone: "⚠️" });
      relire();
      return false;
    }
  };
  const nomDe = (atelier: string) => ATELIERS.get(atelier)?.nom ?? atelier;
  const rattacher = (atelier: string, c: CompetenceSelectionnee) => { void ecrire(rattacherAtelier(reglages, atelier, c)); };
  const detacher = async (atelier: string, c: CompetenceSelectionnee) => {
    const ecrit = detacherAtelier(reglages, atelier, c);
    const avant = Object.fromEntries(Object.keys(ecrit).map((cle) => [cle, reglages[cle] ?? "[]"]));
    if (await ecrire(ecrit)) toastAnnulable(`${nomDe(atelier)} n'est plus rattaché à « ${raccourcir(c.competenceTitre, 60)} ».`, () => { void ecrire(avant); }, "🎯");
  };
  const ouvrir = (a: AtelierMontre) => {
    if (a.onglet) onOuvrir(a.onglet);
    else if (a.caa) { naviguer("/caa"); setTimeout(() => ouvrirOnglet("caa", a.caa!), 140); }
  };

  if (!refs) return null;
  if (!ref || !data) {
    return <div className="zone-moment-vide">Aucun référentiel actif : importez les programmes dans l'onglet Référentiels, et leurs compétences s'afficheront ici.</div>;
  }

  const selection = (dom: RefDom, sd: RefSous, cg: RefCG | null, comp: RefComp): CompetenceSelectionnee => ({
    id: comp.id, referentielNom: ref.nom, domaineId: dom.id, domaineTitre: dom.titre, sousDomaineTitre: sd.titre,
    competenceGeneraleTitre: cg?.titre ?? null, competenceTitre: comp.texte, niveau: comp.niveau ?? null, competenceRefId: comp.id,
  });
  const liensDe = (comp: RefComp) => liens.get(identiteCompetence(ref.nom, comp.id)) ?? [];
  const garde = (dom: RefDom, sd: RefSous, cg: RefCG | null, comp: RefComp) => {
    if (!vautPourLeNiveau(comp.niveau, niveau)) return false;
    if (choix.montrer !== "toutes" && (liensDe(comp).length > 0) !== (choix.montrer === "avec")) return false;
    return !cherche || correspond(`${comp.niveau ?? ""} ${comp.texte} ${cg?.titre ?? ""} ${sd.titre} ${dom.titre}`, cherche);
  };
  const lignesDe = (dom: RefDom, sd: RefSous) => [
    ...(sd.competences ?? []).map((c) => ({ cg: null as RefCG | null, c })),
    ...(sd.competencesGenerales ?? []).flatMap((cg) => (cg.competences ?? []).map((c) => ({ cg, c }))),
  ].filter(({ cg, c }) => garde(dom, sd, cg, c));

  const domaines = data.domaines.map((dom) => {
    const parties = dom.sousDomaines.map((sd) => ({ sd, lignes: lignesDe(dom, sd) })).filter((p) => p.lignes.length);
    const lignes = parties.flatMap((p) => p.lignes);
    return { dom, parties, total: lignes.length, couvertes: lignes.filter(({ c }) => liensDe(c).length).length };
  }).filter((d) => d.total);
  const total = domaines.reduce((n, d) => n + d.total, 0);
  const couvertes = domaines.reduce((n, d) => n + d.couvertes, 0);
  const cleDuPli = (dom: RefDom) => `${ref.id}:${dom.id}`;
  const toutPlie = domaines.length > 0 && domaines.every(({ dom }) => plis.includes(cleDuPli(dom)));
  const sansCompetence = FAMILLES_MONTREES.flatMap((f) => f.ateliers).filter((a) => !compte[a.id]).length;

  const ligne = (dom: RefDom, sd: RefSous, cg: RefCG | null, comp: RefComp) => {
    const c = selection(dom, sd, cg, comp);
    const id = identiteCompetence(ref.nom, comp.id);
    const lies = ateliersDesLiens(liensDe(comp));
    return (
      <div key={comp.id} className={`pc-ligne${survol === id ? " survol" : ""}${lies.length ? "" : " sans"}`}
        onDragOver={(e) => {
          if (!enVol) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          if (survol !== id) setSurvol(id);
        }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol((s) => (s === id ? "" : s)); }}
        onDrop={(e) => {
          e.preventDefault();
          const atelier = e.dataTransfer.getData(TYPE_ATELIER) || enVol;
          setSurvol("");
          setEnVol("");
          if (atelier) rattacher(atelier, c);
        }}>
        <span className="pc-niveau">{comp.niveau ? <span className="badge">{comp.niveau}</span> : null}</span>
        <div className="pc-texte">
          <span>{comp.texte}</span>
          {lies.length > 0 && (
            <span className="pc-puces">
              {lies.map(({ atelier, classes }) => {
                const a = ATELIERS.get(atelier);
                return (
                  <span key={atelier} className="pc-puce">
                    <button type="button" className="pc-puce-nom" disabled={!a} onClick={() => a && ouvrir(a)}
                      title={a ? `Ouvrir ${a.nom}` : undefined}>
                      {a?.icone ?? "🧩"} {a?.nom ?? atelier}{classes.length ? ` · ${classes.join(", ")}` : ""}
                    </button>
                    <button type="button" className="pc-puce-retirer" aria-label={`Détacher ${nomDe(atelier)} de cette compétence`}
                      title="Détacher" onClick={() => { void detacher(atelier, c); }}>×</button>
                  </span>
                );
              })}
            </span>
          )}
        </div>
        <button type="button" className="btn ghost sm pc-ajouter" aria-label={`Rattacher des ateliers à « ${comp.texte} »`}
          title="Rattacher des ateliers à cette compétence" onClick={() => setChoisir(c)}>＋</button>
      </div>
    );
  };

  return (
    <>
      <div className="pc-barre">
        <Select value={ref.id} onChange={(e) => changer({ referentiel: e.target.value })} aria-label="Le référentiel" style={{ width: "auto", maxWidth: 360 }}>
          {actifs.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </Select>
        {niveaux.length > 1 && (
          <div className="seg" role="group" aria-label="Le niveau">
            <button className={!niveau ? "active" : ""} onClick={() => changer({ niveau: "" })}>Tous</button>
            {niveaux.map((n) => <button key={n} className={niveau === n ? "active" : ""} onClick={() => changer({ niveau: n })}>{n}</button>)}
          </div>
        )}
        <div className="seg" role="group" aria-label="Les compétences montrées">
          <button className={choix.montrer === "toutes" ? "active" : ""} onClick={() => changer({ montrer: "toutes" })}>Toutes</button>
          <button className={choix.montrer === "avec" ? "active" : ""} onClick={() => changer({ montrer: "avec" })}>Avec un atelier</button>
          <button className={choix.montrer === "sans" ? "active" : ""} onClick={() => changer({ montrer: "sans" })}>Sans atelier</button>
        </div>
        {!cherche && domaines.length > 0 && (
          <button className="btn ghost sm" onClick={() => {
            const cles = domaines.map(({ dom }) => cleDuPli(dom));
            setPlis(toutPlie ? plis.filter((p) => !cles.includes(p)) : [...new Set([...plis, ...cles])]);
          }}>{toutPlie ? "▾ Tout déplier" : "▸ Tout replier"}</button>
        )}
      </div>
      <div className="pc-bilan">
        {total} compétence{total > 1 ? "s" : ""}{niveau ? ` en ${niveau}` : ""}{cherche ? ` pour « ${cherche} »` : ""}
        {choix.montrer === "toutes" && total > 0 ? ` · ${couvertes} avec au moins un atelier` : ""}
      </div>

      <div className="par-competence">
        <div className="pc-arbre">
          {!domaines.length ? (
            <div className="zone-moment-vide">
              {cherche ? `Aucune compétence ne contient « ${cherche} » ici.` : choix.montrer === "avec"
                ? "Aucune compétence n'a encore d'atelier : glissez-en un depuis la liste, à droite." : "Aucune compétence à montrer."}
            </div>
          ) : domaines.map(({ dom, parties, total: n, couvertes: k }) => (
            <section key={dom.id} className="famille-catalogue">
              <PliDuCatalogue ouvert={cherche ? true : !plis.includes(cleDuPli(dom))}
                onBasculer={(o) => setPlis(o ? plis.filter((p) => p !== cleDuPli(dom)) : [...new Set([...plis, cleDuPli(dom)])])}
                icone={iconeDuDomaine(dom.titre)} titre={dom.titre}
                aide={`${n} compétence${n > 1 ? "s" : ""}${niveau ? ` en ${niveau}` : ""}, dont ${k} avec au moins un atelier.`}
                nombre={k} compte={`${k} sur ${n}`}>
                {parties.map(({ sd, lignes }) => {
                  let cgPrecedente: RefCG | null = null;
                  return (
                    <div key={sd.id} className="pc-partie">
                      <div className="pc-partie-titre">
                        {sd.titre}
                        <span className="pc-partie-compte">{lignes.filter(({ c }) => liensDe(c).length).length} sur {lignes.length}</span>
                      </div>
                      {lignes.map(({ cg, c }) => {
                        const titre = cg && cg !== cgPrecedente ? <div key={`cg-${cg.id}`} className="pc-cg">{cg.titre}</div> : null;
                        cgPrecedente = cg;
                        return <React.Fragment key={c.id}>{titre}{ligne(dom, sd, cg, c)}</React.Fragment>;
                      })}
                    </div>
                  );
                })}
              </PliDuCatalogue>
            </section>
          ))}
        </div>

        <aside className="pc-ateliers" aria-label="Les ateliers à rattacher">
          <div className="pc-ateliers-tete">
            <b>Les ateliers</b>
            <Aide titre="Rattacher un atelier à une compétence">
              <p>Glissez un atelier sur une compétence pour l'y rattacher, ou cliquez sur ＋ au bout de la ligne. × le détache.</p>
              <p>C'est la liste « 🎯 Ce que cela travaille » de l'atelier, vue depuis les programmes : ce qu'on rattache ici s'y retrouve, et une séquence créée sur la compétence vient y piocher l'atelier.</p>
              <p>Le nombre à côté d'un atelier : combien de compétences il travaille déjà.</p>
            </Aide>
          </div>
          <label className="pc-sans-competence">
            <input type="checkbox" checked={choix.sansSeulement} onChange={(e) => changer({ sansSeulement: e.target.checked })} />
            Seulement ceux sans compétence ({sansCompetence})
          </label>
          <div className="pc-ateliers-liste">
            {FAMILLES_MONTREES.map((f) => {
              const ateliers = f.ateliers.filter((a) => !choix.sansSeulement || !compte[a.id]);
              if (!ateliers.length) return null;
              return (
                <div key={f.id} className="pc-famille">
                  <div className="pc-famille-titre">{f.libelle}</div>
                  {ateliers.map((a) => (
                    <div key={a.id} className={`pc-atelier${enVol === a.id ? " en-vol" : ""}`} draggable
                      onDragStart={(e) => { e.dataTransfer.setData(TYPE_ATELIER, a.id); e.dataTransfer.effectAllowed = "copy"; setEnVol(a.id); }}
                      onDragEnd={() => { setEnVol(""); setSurvol(""); }}
                      title={`${a.quoi}\nGlissez-le sur une compétence pour l'y rattacher.`}>
                      <span aria-hidden="true">{a.icone}</span>
                      <span className="pc-atelier-nom">{a.nom}</span>
                      {compte[a.id] ? <span className="pc-atelier-nombre" aria-label={`${compte[a.id]} compétences`}>{compte[a.id]}</span> : null}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {choisir && (
        <Modal titre="🎯 Les ateliers qui la travaillent" onClose={() => setChoisir(null)} large
          footer={<button className="btn primary" onClick={() => setChoisir(null)}>Terminé</button>}>
          <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            {choisir.niveau && <span className="badge" style={{ marginRight: 6 }}>{choisir.niveau}</span>}
            {choisir.competenceTitre}
          </p>
          {FAMILLES_MONTREES.map((f) => (
            <div key={f.id} className="pc-famille">
              <div className="pc-famille-titre">{f.libelle}</div>
              <div className="pc-choix">
                {f.ateliers.map((a) => {
                  const on = (liens.get(identiteCompetence(choisir.referentielNom, choisir.competenceRefId ?? "")) ?? []).some((l) => l.atelier === a.id);
                  return (
                    <label key={a.id} className={`pc-choix-atelier${on ? " on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={() => (on ? void detacher(a.id, choisir) : rattacher(a.id, choisir))} />
                      <span aria-hidden="true">{a.icone}</span> {a.nom}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
