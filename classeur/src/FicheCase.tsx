import React from "react";
import { COULEURS, nouvelId, numeroDePage, ordreDesPages, pictoDeLaPage, type Case, type Classeur, type Page } from "./modele";
import { type PictoTrouve } from "./pont";
import { COULEUR_DE_LA_NATURE } from "./recherche";
import { Fenetre } from "./Fenetre";
import { ChoixImage } from "./ChoixImage";
import { CATEGORIES_MAX, categoriesDeLaCase, suitesDeLaFiche } from "./ensembles";

// ── La fiche d'une case, en mode modifier ────────────────────────────────
//
// Le mot, ce qui se dit, l'image — un picto d'ARASAAC ou une photo —, la
// couleur, la page qu'elle ouvre (ou une nouvelle, à son nom), cachée ou non ;
// et les catégories qu'on propose ensuite, dans la bande au-dessus de la
// grille, chacune avec son picto, que l'enseignant choisit lui-même.

export const NOUVELLE_PAGE = "__nouvelle__";

export function FicheCase({ classeur, page, valeur, images, onImage, onPoser, onFermer }: {
  classeur: Classeur; page: Page; valeur: Case | null; images: Record<string, string>;
  onImage: (id: string, donnees: string) => void;
  /** La case posée (ou rien, pour la vider) ; `nouvellePage` : le nom d'une page à créer, que la case ouvrira. */
  onPoser: (k: Case | null, nouvellePage?: string) => void;
  onFermer: () => void;
}) {
  const [mot, setMot] = React.useState(valeur?.mot ?? "");
  const [dire, setDire] = React.useState(valeur?.dire ?? "");
  const [image, setImage] = React.useState(valeur?.image);
  const [couleur, setCouleur] = React.useState<{ fond?: string; bord?: string }>({ fond: valeur?.fond, bord: valeur?.bord });
  const [lien, setLien] = React.useState(valeur?.lien ?? "");
  const [masquee, setMasquee] = React.useState(!!valeur?.masquee);
  const [occupe, setOccupe] = React.useState(false);
  // Les catégories proposées ensuite, dans l'ordre. Intactes tant qu'on n'y touche pas.
  const [categories, setCategories] = React.useState<string[]>(() => categoriesDeLaCase(valeur?.suites));
  const [suitesTouchees, setSuitesTouchees] = React.useState(false);
  const changerCategories = (f: (l: string[]) => string[]) => { setCategories(f); setSuitesTouchees(true); };

  /** Une image prise : un picto donne aussi son mot, si la case n'en a pas, et la couleur de sa nature. */
  const prise = (id: string, donnees: string, t?: PictoTrouve) => {
    onImage(id, donnees);
    setImage(id);
    if (!t) return;
    if (!mot.trim()) setMot(t.mot);
    // Sans couleur choisie, celle de la nature du mot : vert pour un verbe, orange pour une chose…
    const nature = COULEURS.find((c) => c.id === COULEUR_DE_LA_NATURE[t.nature ?? 0]);
    if (!couleur.fond && nature) setCouleur({ fond: nature.fond, bord: nature.bord });
  };

  const enregistrer = () => {
    const m = mot.trim();
    if (!m && !image) { onPoser(null); return; }
    const k: Case = { id: valeur?.id ?? nouvelId(), mot: m };
    // Les poids calculés à l'avance restent à la case qu'on retouche ; ses suites aussi, sauf si on les a changées.
    if (valeur?.poids !== undefined) k.poids = valeur.poids;
    if (suitesTouchees) {
      const suites = suitesDeLaFiche(categories);
      if (suites.length) k.suites = suites;
      k.suitesPerso = true;
    } else {
      if (valeur?.suites?.length) k.suites = valeur.suites;
      if (valeur?.suitesPerso) k.suitesPerso = true;
    }
    if (dire.trim() && dire.trim() !== m) k.dire = dire.trim();
    if (image) k.image = image;
    if (couleur.fond) k.fond = couleur.fond;
    if (couleur.bord) k.bord = couleur.bord;
    if (lien && lien !== NOUVELLE_PAGE) k.lien = lien;
    if (masquee) k.masquee = true;
    onPoser(k, lien === NOUVELLE_PAGE ? (m || "Nouvelle page") : undefined);
  };

  const autresPages = ordreDesPages(classeur).filter((p) => p.id !== page.id);
  return (
    <Fenetre titre={valeur ? "La case" : "Une nouvelle case"} onFermer={onFermer} large
      pied={<>
        {valeur && <button className="bouton danger" onClick={() => onPoser(null)}>Vider la case</button>}
        <span className="espace" />
        <button className="bouton" onClick={onFermer}>Annuler</button>
        <button className="bouton principal" disabled={occupe} onClick={enregistrer}>Enregistrer</button>
      </>}>
      <div className="fiche">
        <div className="fiche-apercu" style={{ background: couleur.fond ?? "#fff", borderColor: couleur.bord ?? "#8c8c96" }}>
          {image && images[image] ? <img src={images[image]} alt="" /> : <span className="sans-image">Sans image</span>}
          <span className="mot">{mot || "…"}</span>
        </div>
        <div className="fiche-champs">
          <label className="etiquette">Le mot
            <input className="champ" autoFocus value={mot} onChange={(e) => setMot(e.target.value)} placeholder="manger, je veux, encore…" />
          </label>
          <label className="etiquette">Ce qui se dit
            <input className="champ" value={dire} onChange={(e) => setDire(e.target.value)} placeholder="Comme le mot" />
          </label>
          <div className="etiquette">L'image
            <ChoixImage rechercheDeDepart={valeur?.mot ?? ""} image={image} onPrise={prise} onSansImage={() => setImage(undefined)} onOccupe={setOccupe} />
          </div>
          <div className="etiquette">La couleur
            <div className="couleurs">
              <button className={`pastille${!couleur.fond ? " choisie" : ""}`} style={{ background: "#fff" }} title="Aucune"
                onClick={() => setCouleur({})}>∅</button>
              {COULEURS.map((c) => (
                <button key={c.id} className={`pastille${couleur.fond === c.fond ? " choisie" : ""}`} title={c.nom}
                  style={{ background: c.fond, borderColor: c.bord }} onClick={() => setCouleur({ fond: c.fond, bord: c.bord })} />
              ))}
            </div>
          </div>
          <label className="etiquette">Elle ouvre
            <select className="champ" value={lien} onChange={(e) => setLien(e.target.value)}>
              <option value="">Aucune page</option>
              {autresPages.map((p) => <option key={p.id} value={p.id}>Page {numeroDePage(classeur, p.id)} · {p.nom}</option>)}
              <option value={NOUVELLE_PAGE}>＋ Une nouvelle page « {mot.trim() || "…"} »</option>
            </select>
          </label>
          <label className="coche">
            <input type="checkbox" checked={masquee} onChange={(e) => setMasquee(e.target.checked)} /> Cachée à l'élève (la place reste)
          </label>
          <div className="etiquette">Ensuite, proposer les catégories
            {categories.map((id, i) => {
              const picto = pictoDeLaPage(classeur, id);
              return (
                <div key={i} className="rangee categorie-fiche">
                  <span className="categorie-fiche-picto" aria-hidden="true">{picto && images[picto] && <img src={images[picto]} alt="" />}</span>
                  <select className="champ" value={id} aria-label={`Catégorie ${i + 1}`}
                    onChange={(e) => changerCategories((x) => x.map((y, j) => (j === i ? e.target.value : y)))}>
                    {autresPages.map((p) => <option key={p.id} value={p.id}>Page {numeroDePage(classeur, p.id)} · {p.nom}</option>)}
                  </select>
                  <button className="bouton discret" aria-label="Plus tôt" disabled={i === 0}
                    onClick={() => changerCategories((x) => { const y = [...x]; [y[i - 1], y[i]] = [y[i], y[i - 1]]; return y; })}>↑</button>
                  <button className="bouton discret" aria-label="Retirer cette catégorie" onClick={() => changerCategories((x) => x.filter((_, j) => j !== i))}>✕</button>
                </div>
              );
            })}
            {categories.length < CATEGORIES_MAX && autresPages.length > 0 && (
              <button className="bouton" onClick={() => changerCategories((x) => [...x, autresPages.find((p) => !x.includes(p.id))?.id ?? autresPages[0].id])}>
                ＋ Une catégorie
              </button>
            )}
          </div>
        </div>
      </div>
    </Fenetre>
  );
}
