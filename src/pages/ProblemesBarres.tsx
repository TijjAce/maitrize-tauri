import React from "react";
import { api, raccourci } from "../api";
import { Field, Input, Modal, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML } from "../print";
import { useMemoire, useReglages } from "../components/useMemoire";
import {
  genererPartieTout, genererMultiplicatifs, blocProbleme, blocCorrige, enteteFeuille, feuilleProblemes, classesFeuille,
  decouperEnPages, lirePrenoms, retoucheDe, retoucher, schemaSvg, styleSchema, normaliserPresentation, memePresentation,
  STYLE_FEUILLE, TYPES_MULTIPLICATIFS, PLAFONDS, PRESENTATION_COMPLETE, PRESENTATION_MODELE_SEUL, nombre,
  type Probleme, type Presentation, type Retouche, type InconnuePartieTout, type TypeMultiplicatif,
} from "../problemesBarres";

// ── Fabriquer → Problèmes en barres ────────────────────────────────────────
//
// Deux onglets : les problèmes partie-tout (additifs) et les problèmes
// multiplicatifs. On choisit les problèmes, puis leur présentation — jusqu'au
// modèle en barres seul —, on regarde l'aperçu, on retouche ou remplace un
// problème, et l'on imprime la feuille et son corrigé.

const nouvelleGraine = () => Math.floor(Math.random() * 2 ** 31);

/** La feuille tirée : sa graine, les problèmes remplacés et ceux dont l'enseignant a choisi les nombres. */
function useTirage(structure: string) {
  const [graine, setGraine] = React.useState(nouvelleGraine);
  const [retirages, setRetirages] = React.useState<Record<number, number>>({});
  const [retouches, setRetouches] = React.useState<Record<number, Retouche>>({});
  // Changer la nature des problèmes rend caducs les nombres choisis à la main.
  React.useEffect(() => { setRetouches({}); }, [structure]);
  return {
    graine, retirages, retouches,
    nouvelle: () => { setGraine(nouvelleGraine()); setRetirages({}); setRetouches({}); },
    retirer: (i: number) => {
      setRetirages((r) => ({ ...r, [i]: nouvelleGraine() }));
      setRetouches(({ [i]: _, ...reste }) => reste);
    },
    retoucher: (i: number, r: Retouche) => setRetouches((t) => ({ ...t, [i]: r })),
  };
}
type Tirage = ReturnType<typeof useTirage>;

const appliquerRetouches = (problemes: Probleme[], retouches: Record<number, Retouche>, enonces: boolean) =>
  problemes.map((p, i) => (retouches[i] ? retoucher(p, retouches[i], enonces) : p));

const imprimer = (problemes: Probleme[], titre: string, presentation: Presentation) => {
  printHTML(titre.trim() || "Problèmes", feuilleProblemes(problemes, titre, presentation), STYLE_FEUILLE);
  toast(`La feuille s'ouvre dans le navigateur : imprimez-la ou enregistrez-la en PDF (${raccourci("P")}).`, { icone: "🖨", duree: 6000 });
};

// ── Partie-tout ────────────────────────────────────────────────────────────

export function PartieToutTab() {
  const [r, maj] = useReglages("partieTout", {
    titre: "Problèmes partie-tout", nombre: 6, prenoms: "",
    parties: 2, inconnue: "melange" as InconnuePartieTout, max: 20,
    perso: false, toutMin: 5, toutMax: 10, partieMin: 1,
  });
  const [presentation, setPresentation] = useMemoire("presentation:partieTout", normaliserPresentation);
  const tirage = useTirage(`${r.parties}|${r.inconnue}`);
  const problemes = React.useMemo(() => appliquerRetouches(genererPartieTout({
    nombre: r.nombre, parties: r.parties, inconnue: r.inconnue, enonces: presentation.enonce, prenoms: lirePrenoms(r.prenoms),
    ...(r.perso ? { max: r.toutMax, min: r.toutMin, partMin: r.partieMin } : { max: r.max }),
  }, tirage.graine, tirage.retirages), tirage.retouches, presentation.enonce),
  [r, presentation.enonce, tirage.graine, tirage.retirages, tirage.retouches]);

  return (
    <Atelier titre={r.titre} setTitre={(titre) => maj({ titre })} nombre={r.nombre} setNombre={(nombre) => maj({ nombre })}
      prenoms={r.prenoms} setPrenoms={(prenoms) => maj({ prenoms })}
      presentation={presentation} setPresentation={setPresentation} problemes={problemes} tirage={tirage}
      intro={<>Un tout et ses parties : l'élève voit ce qui manque avant de choisir l'opération. Programmes : « résoudre des
        problèmes additifs en une étape de type parties-tout ».</>}
    >
      <Field label="Ce que l'élève cherche">
        <Select value={r.inconnue} onChange={(e) => maj({ inconnue: e.target.value as InconnuePartieTout })}>
          <option value="melange">Le tout ou une partie, en alternance</option>
          <option value="tout">Le tout</option>
          <option value="partie">Une partie</option>
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Parties">
          <Select value={r.parties} onChange={(e) => maj({ parties: Number(e.target.value) })}>
            <option value={2}>2 parties</option>
            <option value={3}>3 parties</option>
          </Select>
        </Field>
        <Field label="Nombres">
          <Select value={r.perso ? "perso" : r.max} onChange={(e) => (e.target.value === "perso"
            ? maj({ perso: true }) : maj({ perso: false, max: Number(e.target.value) }))}>
            {PLAFONDS.map((m) => <option key={m} value={m}>jusqu'à {nombre(m)}</option>)}
            <option value="perso">Personnalisés…</option>
          </Select>
        </Field>
      </div>
      {r.perso && (
        <div className="pb-plage">
          <NombreChamp label="Le tout, de" valeur={r.toutMin} min={2} onChange={(toutMin) => maj({ toutMin })} />
          <NombreChamp label="à" valeur={r.toutMax} min={2} onChange={(toutMax) => maj({ toutMax })} />
          <NombreChamp label="Chaque partie, au moins" valeur={r.partieMin} min={1} onChange={(partieMin) => maj({ partieMin })} />
        </div>
      )}
    </Atelier>
  );
}

// ── Multiplicatifs ─────────────────────────────────────────────────────────

export function MultiplicatifsTab() {
  const [r, maj] = useReglages("multiplicatifs", {
    titre: "Problèmes multiplicatifs", nombre: 6, prenoms: "",
    types: ["tout", "part", "nombre"] as TypeMultiplicatif[], table: 10,
    perso: false, partsMin: 2, partsMax: 5, valeurMin: 1, valeurMax: 5,
  });
  const [presentation, setPresentation] = useMemoire("presentation:multiplicatifs", normaliserPresentation);
  const types = r.types.filter((t) => TYPES_MULTIPLICATIFS.some((x) => x.id === t));
  const tirage = useTirage(types.join());
  const problemes = React.useMemo(() => appliquerRetouches(genererMultiplicatifs({
    nombre: r.nombre, types, table: r.table, enonces: presentation.enonce, prenoms: lirePrenoms(r.prenoms),
    ...(r.perso ? { parts: [r.partsMin, r.partsMax] as [number, number], valeurs: [r.valeurMin, r.valeurMax] as [number, number] } : {}),
  }, tirage.graine, tirage.retirages), tirage.retouches, presentation.enonce),
  [r, types.join(), presentation.enonce, tirage.graine, tirage.retirages, tirage.retouches]); // eslint-disable-line react-hooks/exhaustive-deps

  const basculer = (t: TypeMultiplicatif) => {
    const suite = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    if (!suite.length) { toast("Gardez au moins un type de problème.", { icone: "ℹ️" }); return; }
    // Dans l'ordre de la liste : les problèmes se succèdent dans cet ordre sur la feuille.
    maj({ types: TYPES_MULTIPLICATIFS.map((x) => x.id).filter((id) => suite.includes(id)) });
  };

  return (
    <Atelier titre={r.titre} setTitre={(titre) => maj({ titre })} nombre={r.nombre} setNombre={(nombre) => maj({ nombre })}
      prenoms={r.prenoms} setPrenoms={(prenoms) => maj({ prenoms })}
      presentation={presentation} setPresentation={setPresentation} problemes={problemes} tirage={tirage}
      intro={<>Des parts égales qui font un tout, ou une quantité plusieurs fois plus grande qu'une autre. Programmes :
        « résoudre des problèmes multiplicatifs de type parties-tout en une étape ».</>}
    >
      <Field label="Types de problèmes, en alternance sur la feuille">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {TYPES_MULTIPLICATIFS.map((t) => (
            <label key={t.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={types.includes(t.id)} onChange={() => basculer(t.id)} />
              <span><b>{t.libelle}</b><br /><span style={{ color: "var(--text-2)" }}>{t.exemple}</span></span>
            </label>
          ))}
        </div>
      </Field>
      <Field label="Nombres">
        <Select value={r.perso ? "perso" : r.table} onChange={(e) => (e.target.value === "perso"
          ? maj({ perso: true }) : maj({ perso: false, table: Number(e.target.value) }))}>
          <option value={5}>Tables de 2 à 5</option>
          <option value={10}>Tables de 2 à 10</option>
          <option value="perso">Personnalisés…</option>
        </Select>
      </Field>
      {r.perso && (
        <div className="pb-plage pb-plage-4">
          <NombreChamp label="Nombre de parts (ou de fois), de" valeur={r.partsMin} min={2} onChange={(partsMin) => maj({ partsMin })} />
          <NombreChamp label="à" valeur={r.partsMax} min={2} onChange={(partsMax) => maj({ partsMax })} />
          <NombreChamp label="Valeur d'une part (ou petite quantité), de" valeur={r.valeurMin} min={1} onChange={(valeurMin) => maj({ valeurMin })} />
          <NombreChamp label="à" valeur={r.valeurMax} min={1} onChange={(valeurMax) => maj({ valeurMax })} />
        </div>
      )}
    </Atelier>
  );
}

/**
 * Un nombre à saisir. Le champ garde ce qui est tapé, même vide ou encore trop
 * petit : effacer « 5 » pour écrire « 12 » ne doit pas faire réapparaître le
 * minimum sous le curseur. Seul un nombre valable est transmis.
 */
function NombreChamp({ label, valeur, min, onChange }: { label: string; valeur: number; min: number; onChange: (v: number) => void }) {
  const [texte, setTexte] = React.useState(String(valeur));
  React.useEffect(() => { setTexte((t) => (Number(t) === valeur ? t : String(valeur))); }, [valeur]);
  const lu = (t: string) => {
    const n = Math.round(Number(t));
    return t.trim() !== "" && Number.isFinite(n) && n >= min && n <= 100000 ? n : null;
  };
  return (
    <Field label={label}>
      <Input type="number" min={min} max={100000} value={texte}
        onChange={(e) => { setTexte(e.target.value); const n = lu(e.target.value); if (n !== null) onChange(n); }}
        onBlur={() => { if (lu(texte) === null) setTexte(String(valeur)); }} />
    </Field>
  );
}

// ── Mise en page commune ───────────────────────────────────────────────────

function Atelier({ intro, titre, setTitre, nombre: nombreProblemes, setNombre, prenoms, setPrenoms, presentation, setPresentation, problemes, tirage, children }: {
  intro: React.ReactNode;
  titre: string; setTitre: (v: string) => void;
  nombre: number; setNombre: (v: number) => void;
  prenoms: string; setPrenoms: (v: string) => void;
  presentation: Presentation; setPresentation: (p: Presentation) => void;
  problemes: Probleme[];
  tirage: Tirage;
  children: React.ReactNode;
}) {
  const [corrige, setCorrige] = React.useState(false);
  const [edite, setEdite] = React.useState<number | null>(null);
  const p = presentation;
  const pages = corrige
    ? [problemes.map((pb, i) => ({ i, html: blocCorrige(pb, i, p) }))]
    : decouperEnPages(problemes.map((pb, i) => ({ i, html: blocProbleme(pb, i, p) })), p.parPage);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 14, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Les problèmes</h3>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-2)" }}>{intro}</p>
          {children}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Nombre de problèmes">
              <Select value={nombreProblemes} onChange={(e) => setNombre(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Titre de la feuille">
              <Input value={titre} onChange={(e) => setTitre(e.target.value)} />
            </Field>
          </div>
          {p.enonce && (
            <Field label="Prénoms dans les énoncés (facultatif)">
              <Input value={prenoms} placeholder="Séparés par des virgules : Léa, Tom…" onChange={(e) => setPrenoms(e.target.value)} />
            </Field>
          )}
        </div>
        <ReglagesPresentation p={p} set={setPresentation} />
      </div>

      <div className="card" style={{ position: "sticky", top: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Aperçu</h3>
          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={corrige} onChange={(e) => setCorrige(e.target.checked)} /> Voir le corrigé
          </label>
          <div style={{ flex: 1 }} />
          <button className="btn sm" onClick={tirage.nouvelle} title="Tire d'autres nombres et d'autres situations">🔀 Nouvelle feuille</button>
          <button className="btn sm primary" onClick={() => imprimer(problemes, titre, p)}>🖨 Imprimer</button>
        </div>
        <style>{STYLE_FEUILLE}</style>
        <div className="pb-apercu">
          {pages.map((page, k) => (
            <div key={k} className={`pb-apercu-page ${classesFeuille(p)}`}>
              {!corrige && k === 0 && <div dangerouslySetInnerHTML={{ __html: enteteFeuille(titre, p) }} />}
              <div className={`pb-grille pb-colonnes-${corrige ? (p.enonce ? 1 : 2) : p.colonnes}`}>
                {page.map(({ i, html }) => (
                  <div key={i} className="pb-apercu-probleme">
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                    <div className="pb-apercu-actions">
                      <button className="btn sm" onClick={() => setEdite(i)} title="Choisir les nombres de ce problème"
                        aria-label={`Modifier les nombres du problème ${i + 1}`}>✏️</button>
                      <button className="btn sm" onClick={() => tirage.retirer(i)} title="Remplacer ce problème par un autre"
                        aria-label={`Remplacer le problème ${i + 1}`}>↻</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!corrige && pages.length > 1 && (
            <div style={{ fontSize: 12, color: "var(--text-2)", textAlign: "center" }}>{pages.length} pages à l'impression</div>
          )}
        </div>
      </div>

      {edite !== null && problemes[edite] && (
        <EditeurProbleme probleme={problemes[edite]} numero={edite + 1} presentation={p}
          onFermer={() => setEdite(null)}
          onValider={(r) => { tirage.retoucher(edite, r); setEdite(null); }} />
      )}
    </div>
  );
}

// ── Présentation ───────────────────────────────────────────────────────────

const CLE_PRESENTATIONS = "fabriquer:presentations";
interface PresentationNommee { nom: string; presentation: Presentation }

/** Les présentations enregistrées par l'enseignant, communes aux deux onglets et à ses ordinateurs. */
function usePresentationsEnregistrees() {
  const [liste, setListe] = React.useState<PresentationNommee[]>([]);
  React.useEffect(() => {
    api.settingGet(CLE_PRESENTATIONS).then((brut) => {
      try {
        const lu = brut ? JSON.parse(brut) : [];
        setListe(Array.isArray(lu) ? lu.filter((x) => x && typeof x.nom === "string")
          .map((x) => ({ nom: x.nom, presentation: normaliserPresentation(x.presentation) })) : []);
      } catch { setListe([]); }
    }).catch(() => {});
  }, []);
  const ecrire = (suite: PresentationNommee[]) => {
    setListe(suite);
    api.settingSet(CLE_PRESENTATIONS, JSON.stringify(suite)).catch((e) => toast(`Enregistrement impossible : ${e}`, { icone: "⚠️" }));
  };
  return {
    liste,
    enregistrer: (nom: string, presentation: Presentation) =>
      ecrire([...liste.filter((x) => x.nom !== nom), { nom, presentation }].sort((a, b) => a.nom.localeCompare(b.nom, "fr"))),
    supprimer: (nom: string) => ecrire(liste.filter((x) => x.nom !== nom)),
  };
}

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <details className="pb-groupe" open>
      <summary>{titre}</summary>
      <div className="pb-groupe-corps">{children}</div>
    </details>
  );
}

function ReglagesPresentation({ p, set }: { p: Presentation; set: (p: Presentation) => void }) {
  const maj = (m: Partial<Presentation>) => set({ ...p, ...m });
  const { liste, enregistrer, supprimer } = usePresentationsEnregistrees();
  const [nom, setNom] = React.useState<string | null>(null);
  const courante = liste.find((x) => memePresentation(x.presentation, p));

  const coche = (cle: keyof Presentation, libelle: string, aide?: string) => (
    <label className="pb-coche">
      <input type="checkbox" checked={Boolean(p[cle])} onChange={(e) => maj({ [cle]: e.target.checked } as Partial<Presentation>)} />
      <span>{libelle}{aide && <><br /><span style={{ color: "var(--text-2)" }}>{aide}</span></>}</span>
    </label>
  );
  const choix = <K extends keyof Presentation>(cle: K, libelle: string, options: [Presentation[K], string][]) => (
    <Field label={libelle}>
      <Select value={String(p[cle])} onChange={(e) => {
        const trouve = options.find(([v]) => String(v) === e.target.value);
        if (trouve) maj({ [cle]: trouve[0] } as Partial<Presentation>);
      }}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </Select>
    </Field>
  );
  const couleur = (cle: "couleurTout" | "couleurPartie1" | "couleurPartie2" | "couleurPartie3", libelle: string) => (
    <label className="pb-couleur">
      <input type="color" value={p[cle]} onChange={(e) => maj({ [cle]: e.target.value } as Partial<Presentation>)} />
      {libelle}
    </label>
  );

  const valider = () => {
    const n = (nom ?? "").trim();
    if (!n) return;
    enregistrer(n, p);
    setNom(null);
    toast(`Présentation « ${n} » enregistrée.`, { icone: "💾" });
  };

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>La présentation</h3>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <button className={`btn sm${memePresentation(p, PRESENTATION_COMPLETE) ? " primary" : ""}`}
          onClick={() => set(PRESENTATION_COMPLETE)}>📄 Feuille complète</button>
        <button className={`btn sm${memePresentation(p, PRESENTATION_MODELE_SEUL) ? " primary" : ""}`}
          onClick={() => set(PRESENTATION_MODELE_SEUL)}
          title="Le schéma et ses nombres, sans titre, énoncé, numéro, cadre ni mot">▭ Modèle en barres seul</button>
      </div>

      <Field label="Présentations enregistrées">
        <div style={{ display: "flex", gap: 6 }}>
          <Select value={courante?.nom ?? ""} style={{ flex: 1 }} onChange={(e) => {
            const x = liste.find((y) => y.nom === e.target.value);
            if (x) set(x.presentation);
          }}>
            <option value="">{liste.length ? "Choisir…" : "Aucune pour l'instant"}</option>
            {liste.map((x) => <option key={x.nom} value={x.nom}>{x.nom}</option>)}
          </Select>
          <button className="btn sm" onClick={() => setNom(courante?.nom ?? "")} title="Enregistrer cette présentation">💾</button>
          {courante && (
            <button className="btn sm" title={`Supprimer « ${courante.nom} »`} onClick={async () => {
              if (await confirmer(`Supprimer la présentation « ${courante.nom} » ?`, { oui: "Supprimer", danger: true })) supprimer(courante.nom);
            }}>🗑</button>
          )}
        </div>
        {nom !== null && (
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <Input autoFocus value={nom} placeholder="Nom, par exemple « Pour Adam »" style={{ flex: 1 }}
              onFocus={(e) => e.target.select()} onChange={(e) => setNom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setNom(null); }} />
            <button className="btn sm primary" onClick={valider} disabled={!nom.trim()}>Enregistrer</button>
          </div>
        )}
      </Field>

      <Groupe titre="La feuille">
        {coche("titre", "Titre")}
        {coche("nomDate", "Lignes « Prénom » et « Date »")}
        {coche("numeros", "Numéros des problèmes")}
        {coche("cadres", "Cadre autour de chaque problème")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
          {choix("parPage", "Par page", [[0, "À la suite"], [1, "1 par page"], [2, "2 par page"], [3, "3 par page"], [4, "4 par page"], [6, "6 par page"]])}
          {choix("colonnes", "Colonnes", [[1, "1 colonne"], [2, "2 colonnes"]])}
        </div>
        {choix("police", "Police", [["arial", "Arial"], ["verdana", "Verdana"], ["comic", "Comic Sans"]])}
        {coche("corrige", "Corrigé à la fin", "Sur une page à part, pour vous.")}
      </Groupe>

      <Groupe titre="L'énoncé">
        {coche("enonce", "Écrire l'énoncé")}
        {p.enonce && (
          <>
            {choix("tailleTexte", "Taille du texte", [["normale", "Normale"], ["grande", "Grande"], ["tres-grande", "Très grande"]])}
            {coche("capitales", "En capitales")}
          </>
        )}
        {coche("calcul", "Ligne « Calcul »")}
        {coche("reponse", "Ligne « Réponse »")}
      </Groupe>

      <Groupe titre="Le schéma">
        {p.enonce && choix("schema", "Dans le schéma", [
          ["nombres", "Les nombres de l'énoncé"], ["vide", "Cases vides, l'élève les remplit"], ["sans", "Pas de schéma : un cadre pour le dessiner"],
        ])}
        {choix("images", "Dans les cases", [["non", "Les nombres"], ["oui", "Des images à compter"], ["avec-nombres", "Des images et les nombres"]])}
        {p.images !== "non" && (
          <>
            {choix("formeImages", "Les images", [["enonce", "Celles de l'énoncé : billes, pommes, fleurs…"], ["ronds", "Des ronds de couleur"]])}
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "-6px 0 10px" }}>
              Jusqu'à 20 objets par case : au-delà, ou dans une case trop étroite, le nombre reste écrit.
            </p>
          </>
        )}
        {choix("inconnue", "La case à trouver", [["?", "Un « ? »"], ["vide", "Vide"], ["surlignee", "Vide et surlignée en jaune"]])}
        {coche("etiquettes", "Mots sur le schéma", "« TOUT », « PARTIE », prénoms des comparaisons.")}
        {p.etiquettes && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Mot du tout"><Input value={p.motTout} maxLength={30} onChange={(e) => maj({ motTout: e.target.value })} /></Field>
            <Field label="Mot des parties"><Input value={p.motPartie} maxLength={30} onChange={(e) => maj({ motPartie: e.target.value })} /></Field>
          </div>
        )}
        {coche("aides", "Accolades et légendes", "« 4 parts égales », « × 3 ».")}
        {coche("proportionnel", "Longueurs proportionnelles aux nombres")}
        {coche("toutEnBas", "Le tout sous les parties")}
        {choix("couleurs", "Couleurs", [["classe", "Bleu, rouge, violet"], ["noir", "Noir seulement"], ["perso", "Choisies…"]])}
        {p.couleurs === "perso" && (
          <div className="pb-couleurs">
            {couleur("couleurTout", "Tout")}
            {couleur("couleurPartie1", "Partie 1")}
            {couleur("couleurPartie2", "Partie 2")}
            {couleur("couleurPartie3", "Partie 3")}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {choix("epaisseur", "Traits", [["fin", "Fins"], ["normal", "Normaux"], ["epais", "Épais"]])}
          {choix("tailleSchema", "Taille", [["moyen", "Moyenne"], ["grand", "Grande"], ["pleine", "Toute la largeur"]])}
        </div>
      </Groupe>
    </div>
  );
}

// ── Choisir les nombres d'un problème ──────────────────────────────────────

function EditeurProbleme({ probleme, numero, presentation, onFermer, onValider }: {
  probleme: Probleme; numero: number; presentation: Presentation;
  onFermer: () => void; onValider: (r: Retouche) => void;
}) {
  const [r, setR] = React.useState<Retouche>(() => retoucheDe(probleme));
  const apercu = retoucher(probleme, r, presentation.enonce);
  const champ = (label: string, valeur: number, min: number, onChange: (v: number) => void) => (
    <NombreChamp key={label} label={label} valeur={valeur} min={min} onChange={onChange} />
  );

  return (
    <Modal titre={`Problème ${numero} : choisir les nombres`} onClose={onFermer} large
      footer={<>
        <button className="btn" onClick={onFermer}>Annuler</button>
        <button className="btn primary" onClick={() => onValider(r)}>Appliquer</button>
      </>}>
      {r.forme === "parties" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${r.valeurs.length}, 1fr)`, gap: 10 }}>
            {r.valeurs.map((v, k) => champ(`Partie ${k + 1}`, v, 1, (n) => setR({ ...r, valeurs: r.valeurs.map((x, j) => (j === k ? n : x)) })))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.inconnue} onChange={(e) => setR({ ...r, inconnue: Number(e.target.value) })}>
              <option value={-1}>Le tout ({nombre(r.valeurs.reduce((s, v) => s + v, 0))})</option>
              {r.valeurs.map((v, k) => <option key={k} value={k}>La partie {k + 1} ({nombre(v)})</option>)}
            </Select>
          </Field>
        </>
      )}
      {r.forme === "parts-egales" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {champ("Nombre de parts", r.parts, 2, (parts) => setR({ ...r, parts }))}
            {champ("Valeur d'une part", r.valeur, 1, (valeur) => setR({ ...r, valeur }))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as typeof r.type })}>
              <option value="tout">Le tout ({nombre(r.parts * r.valeur)})</option>
              <option value="part">La valeur d'une part</option>
              <option value="nombre">Le nombre de parts</option>
            </Select>
          </Field>
        </>
      )}
      {r.forme === "comparaison" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {champ("Petite quantité", r.petit, 1, (petit) => setR({ ...r, petit }))}
            {champ("Combien de fois plus", r.fois, 2, (fois) => setR({ ...r, fois }))}
          </div>
          <Field label="Case à trouver">
            <Select value={r.type} onChange={(e) => setR({ ...r, type: e.target.value as typeof r.type })}>
              <option value="grand">La grande quantité ({nombre(r.petit * r.fois)})</option>
              <option value="petit">La petite quantité</option>
            </Select>
          </Field>
        </>
      )}
      <div className="pb-apercu-page pb-feuille" style={{ marginTop: 6 }}>
        {presentation.enonce && apercu.enonce && <p className="pb-enonce" style={{ marginTop: 0 }}>{apercu.enonce}</p>}
        <div className="pb-schema" dangerouslySetInnerHTML={{ __html: schemaSvg(apercu.schema, "nombres", styleSchema(presentation)) }} />
      </div>
    </Modal>
  );
}
