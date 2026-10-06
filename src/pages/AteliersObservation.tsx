import React from "react";
import { api, type CategorieArasaac, type PictoArasaac } from "../api";
import { Field, Input, Select, useAsync } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { chargerImages } from "../components/ChoixPicto";
import { peindre } from "../components/MesImages";
import { libelleCategorie } from "../data/categoriesArasaac";
import { uneImageParMot } from "../loto";
import type { MotImage } from "../jeuxSons";
import { graineAuHasard } from "../hasard";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import {
  CATEGORIES_FAMILIERES, CATEGORIES_LYNX, DESSINS_MAX, EXCLUES_LYNX, MODELES_MAX, NIVEAUX_LYNX, REGLAGES_LYNX, SEUIL_ENCRE, SEUIL_SCENE, STYLE_LYNX,
  auTrait, cadrage, choisirDessins, encre, enGris, htmlLynx, niveauLynx, niveauModifie, plancheLynx, reglagesLynxSurs, remplissage, sosieDe,
  variablesDuNiveau,
  type DessinLynx, type DispositionLynx, type IdNiveauLynx, type SosieLynx,
} from "../oeilDeLynx";

// ── Fabriquer › Observation › Œil de lynx ─────────────────────────────────
//
// Les modèles en haut, un cadre plein de dessins dessous : on retrouve, on
// entoure. Les dessins viennent de la banque — des objets, des animaux, des
// jouets, ou un thème — ou des mots de la classe ; chaque tirage en donne une
// autre feuille, et le corrigé suit.

/**
 * Un dessin prêt : son image, sa largeur sur sa hauteur, la part de son cadre
 * qu'il remplit — une scène le remplit tout entier —, et s'il a dû passer en
 * gris faute de trait.
 */
interface DessinPret { src: string; rapport: number; plein: number; pale: boolean }

const prets = new Map<string, Promise<DessinPret>>();

/** Le dessin rogné à ce qui est peint, réduit pour l'impression, au trait si on le veut : calculé une fois par image. */
function preparer(id: number, src: string, trait: boolean): Promise<DessinPret> {
  const cle = `${trait ? "t" : "c"}:${id}`;
  let p = prets.get(cle);
  if (!p) {
    p = peindre(src, 420).then(({ toile, pinceau }) => {
      const pixels = pinceau.getImageData(0, 0, toile.width, toile.height);
      const zone = cadrage(pixels.data, toile.width, toile.height);
      const plein = remplissage(pixels.data, toile.width, zone);
      let pale = false;
      if (trait) {
        let auTraitOuGris = auTrait(pixels.data, toile.width, toile.height);
        if (encre(auTraitOuGris) < SEUIL_ENCRE) { auTraitOuGris = enGris(pixels.data); pale = true; }
        pinceau.putImageData(new ImageData(auTraitOuGris, toile.width, toile.height), 0, 0);
      }
      // Assez de points pour un grand dessin net, pas davantage : une feuille en porte une centaine, deux fois avec le corrigé.
      const k = Math.min(1, 220 / Math.max(zone.l, zone.h));
      const sortie = document.createElement("canvas");
      sortie.width = Math.max(1, Math.round(zone.l * k));
      sortie.height = Math.max(1, Math.round(zone.h * k));
      const pinceauSortie = sortie.getContext("2d");
      if (!pinceauSortie) throw new Error("Toile indisponible.");
      pinceauSortie.imageSmoothingQuality = "high";
      // Un JPEG sur fond blanc pèse trois fois moins qu'un PNG, et le blanc ne se voit pas sur la feuille.
      pinceauSortie.fillStyle = "#fff";
      pinceauSortie.fillRect(0, 0, sortie.width, sortie.height);
      pinceauSortie.drawImage(toile, zone.x, zone.y, zone.l, zone.h, 0, 0, sortie.width, sortie.height);
      return { src: sortie.toDataURL("image/jpeg", trait ? 0.92 : 0.88), rapport: zone.l / zone.h, plein, pale };
    });
    p.catch(() => prets.delete(cle));
    prets.set(cle, p);
  }
  return p;
}

/** Les dessins prêts à poser ; `pret` quand tout ce qui pouvait se charger l'est — une image qui manque ne retient pas les autres. */
function useDessinsLynx(ids: number[], trait: boolean): { dessins: Record<number, DessinPret>; pret: boolean } {
  const uniques = [...new Set(ids)].sort((a, b) => a - b);
  const cle = `${trait ? "t" : "c"}|${uniques.join(",")}`;
  const [etat, setEtat] = React.useState<{ cle: string; dessins: Record<number, DessinPret> }>({ cle: "", dessins: {} });
  React.useEffect(() => {
    let vivant = true;
    void (async () => {
      const sources = await chargerImages(uniques);
      const paires = await Promise.all(Object.entries(sources)
        .map(([id, src]) => preparer(Number(id), src, trait).then((d) => [Number(id), d] as const).catch(() => null)));
      if (vivant) setEtat({ cle, dessins: Object.fromEntries(paires.filter((p): p is readonly [number, DessinPret] => p !== null)) });
    })();
    return () => { vivant = false; };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  return { dessins: etat.dessins, pret: etat.cle === cle };
}

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function OeilDeLynxTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [brut, maj] = useReglages("oeilDeLynx", REGLAGES_LYNX);
  const r = React.useMemo(() => reglagesLynxSurs(brut), [brut]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const niv = niveauLynx(r.niveau);

  // Où piocher les dessins : toute sorte de choses qui se dessinent, ou un thème de la banque.
  const { data: vivier } = useAsync<PictoArasaac[]>(
    () => (banque ? api.arasaacSelection(r.intrus ? [r.intrus] : CATEGORIES_LYNX, EXCLUES_LYNX, false, 0, 7) : Promise.resolve([])),
    [banque, r.intrus],
  );
  // Les modèles tirés au sort : des choses que les enfants connaissent. Dans un thème, tout le thème.
  const { data: connus } = useAsync<PictoArasaac[]>(
    () => (banque && !r.intrus ? api.arasaacSelection(CATEGORIES_FAMILIERES, EXCLUES_LYNX, false, 0, 7) : Promise.resolve([])),
    [banque, r.intrus],
  );
  const familiers = React.useMemo(() => new Set((connus ?? []).map((p) => p.id)), [connus]);
  const { data: categories } = useAsync<CategorieArasaac[]>(() => (banque ? api.arasaacCategories() : Promise.resolve([])), [banque]);
  const themes = React.useMemo(() => (categories ?? []).filter((c) => c.nombre >= 12)
    .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr")), [categories]);
  const dessinsDuVivier = React.useMemo(() => uneImageParMot(vivier ?? []).map((x): DessinLynx => ({ id: x.picto.id, mot: x.picto.mot })), [vivier]);
  const liste = React.useMemo(() => mots.flatMap((m): DessinLynx[] => (m.id != null ? [{ id: m.id, mot: m.mot }] : [])), [mots]);
  // Le titre ne change ni le tirage ni la mise en page : on ne recalcule que ce qui en dépend.
  const cleChoix = `${r.modeles}|${r.dessins}|${r.compter}|${r.ressemblants}`;
  // Les scènes de la banque — une boutique, un billet, un conducteur au volant — et, au trait, les dessins sans contour
  // s'écartent une fois leur image lue : le suivant du tirage prend leur place.
  const [ecartes, setEcartes] = React.useState<ReadonlySet<number>>(() => new Set());
  const choix = React.useMemo(
    () => choisirDessins(liste, dessinsDuVivier, r, graine, ecartes, familiers),
    [liste, dessinsDuVivier, cleChoix, graine, ecartes, familiers], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const clePlanche = JSON.stringify({ ...r, titre: "" });

  // Les sosies : un autre dessin du même mot, cherché dans la banque pour chaque modèle.
  const [sosies, setSosies] = React.useState<SosieLynx[]>([]);
  const cleModeles = choix.modeles.map((m) => `${m.id}:${m.mot}`).join("|");
  React.useEffect(() => {
    if (!r.ressemblants || !banque) { setSosies([]); return; }
    let vivant = true;
    void Promise.all(choix.modeles.map((m) => api.arasaacChercher(m.mot, 30).then((t) => sosieDe(m, t)).catch(() => null)))
      .then((s) => { if (vivant) setSosies(s.filter((x): x is SosieLynx => x !== null)); });
    return () => { vivant = false; };
  }, [cleModeles, r.ressemblants, banque]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = [...choix.modeles, ...sosies, ...choix.intrus].map((d) => d.id);
  const { dessins, pret: lus } = useDessinsLynx(ids, r.trait);
  const miens = React.useMemo(() => new Set(liste.map((d) => d.id)), [liste]);
  const aEcarter = Object.entries(dessins)
    .filter(([id, d]) => (d.plein >= SEUIL_SCENE || d.pale) && !miens.has(Number(id)) && !ecartes.has(Number(id)))
    .map(([id]) => Number(id));
  const cleAEcarter = aEcarter.join(",");
  React.useEffect(() => { if (aEcarter.length) setEcartes((avant) => new Set([...avant, ...aEcarter])); }, [cleAEcarter]); // eslint-disable-line react-hooks/exhaustive-deps
  // Un dessin vient d'être écarté : le tirage va changer, on attend le suivant.
  const pret = lus && !aEcarter.length;
  const ratios = React.useMemo(() => Object.fromEntries(Object.entries(dessins).map(([id, d]) => [id, d.rapport])) as Record<number, number>, [dessins]);
  const images = React.useMemo(() => Object.fromEntries(Object.entries(dessins).map(([id, d]) => [id, d.src])) as Record<number, string>, [dessins]);
  // Pendant qu'un nouveau tirage se prépare, l'aperçu garde le précédent.
  const dernier = React.useRef<{ html: string; planche: ReturnType<typeof plancheLynx> | null }>({ html: "", planche: null });
  const plancheActuelle = React.useMemo(
    () => (pret && choix.modeles.length ? plancheLynx(choix, sosies, ratios, r, graine) : null),
    [pret, choix, sosies, ratios, clePlanche, graine], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const actuel = React.useMemo(() => (pret ? { planche: plancheActuelle, html: htmlLynx(plancheActuelle, images, r) } : null), [pret, plancheActuelle, images, r]);
  if (actuel) dernier.current = actuel;
  const { html, planche } = actuel ?? dernier.current;

  const choisirNiveau = (id: IdNiveauLynx) => maj({ niveau: id, ...variablesDuNiveau(id) });
  const sansRien = !banque && !liste.length;
  const cibles = planche ? planche.places.filter((p) => p.role === "cible").length : 0;
  const nbSosies = planche ? planche.places.filter((p) => p.role === "sosie").length : 0;
  const titre = r.titre.trim() || REGLAGES_LYNX.titre;

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Œil de lynx</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Une rangée de modèles, un grand cadre plein de dessins : l'élève retrouve chaque modèle et l'entoure. Le corrigé suit, et chaque tirage
          donne une autre feuille.
        </p>
        <Field label="Niveau">
          <Select value={r.niveau} onChange={(e) => choisirNiveau(e.target.value as IdNiveauLynx)}>
            {NIVEAUX_LYNX.map((n) => <option key={n.id} value={n.id}>{n.libelle} ({n.pour})</option>)}
          </Select>
          <div className="meta" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
            {niv.aide}
            {niveauModifie(r) && <> <button type="button" className="btn ghost sm" onClick={() => choisirNiveau(r.niveau)}>Revenir au niveau</button></>}
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Dessins à retrouver">
            <Input type="number" min={1} max={MODELES_MAX} value={r.modeles} onChange={(e) => maj({ modeles: borne(e.target.value, 1, MODELES_MAX, r.modeles) })} />
          </Field>
          <Field label="Dessins dans l'image">
            <Input type="number" min={r.modeles + 1} max={DESSINS_MAX} value={r.dessins}
              onChange={(e) => maj({ dessins: borne(e.target.value, r.modeles + 1, DESSINS_MAX, r.dessins) })} />
          </Field>
        </div>
        <Field label="Disposition">
          <Select value={r.disposition} onChange={(e) => maj({ disposition: e.target.value as DispositionLynx })}>
            <option value="vrac">En vrac, comme sur un tapis de jeu</option>
            <option value="rangees">En rangées : on balaie ligne par ligne</option>
          </Select>
        </Field>
        <Coche on={r.tailles} libelle="Des tailles variées : le dessin caché n'a pas la taille de son modèle" onChange={(v) => maj({ tailles: v })} />
        <Coche on={r.tourner} libelle="Certains dessins penchés" onChange={(v) => maj({ tourner: v })} />
        <Coche on={r.retourner} libelle="Certains dessins retournés, comme dans un miroir" onChange={(v) => maj({ retourner: v })} />
        <Coche on={r.ressemblants} libelle="Des sosies : un autre dessin du même objet, à ne pas entourer" onChange={(v) => maj({ ressemblants: v })} />
        <Coche on={r.trait} libelle="Au trait, en noir et blanc : la forme seule, et à colorier ensuite" onChange={(v) => maj({ trait: v })} />
        <Coche on={r.compter} libelle="Combien de fois ? Chaque modèle se cache une à trois fois : on compte" onChange={(v) => maj({ compter: v })} />
        <Coche on={r.legendes} libelle="Le mot sous chaque modèle" onChange={(v) => maj({ legendes: v })} />
        {banque && (
          <Field label="Les dessins qui cachent les modèles">
            <Select value={r.intrus} onChange={(e) => maj({ intrus: e.target.value })}>
              <option value="">De toute sorte : objets, animaux, jouets, aliments…</option>
              {themes.map((c) => <option key={c.nom} value={c.nom}>Le thème : {libelleCategorie(c.nom)} ({c.nombre})</option>)}
            </Select>
          </Field>
        )}
        <details className="pli">
          <summary>Mes dessins à retrouver{liste.length ? <span className="meta"> · {liste.length}</span> : <span className="meta"> · au hasard</span>}</summary>
          <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
            aide="Sans liste, les modèles se tirent au sort dans la banque. Avec les mots de la classe, ce sont eux qu'on cherche ; ceux qui ne sont pas tirés se cachent dans l'image." />
        </details>
        <Field label="Titre"><Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder={REGLAGES_LYNX.titre} /></Field>
        <div className="meta" style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.45 }}>
          {sansRien ? "Sans la banque de pictogrammes, ajoutez vos images : il en faut plus que de modèles."
            : !planche ? "Les dessins se préparent…"
            : <>
                {planche.modeles.length} modèle{planche.modeles.length > 1 ? "s" : ""}{choix.deLaListe ? " de votre liste" : ""},
                {" "}{planche.places.length} dessins dans l'image{cibles > planche.modeles.length ? `, dont ${cibles} à entourer` : ""}
                {nbSosies > 0 && ` et ${nbSosies} sosie${nbSosies > 1 ? "s" : ""} à ne pas entourer`}.
                {r.ressemblants && nbSosies < planche.modeles.length && (
                  <span> {nbSosies
                    ? `La banque n'a pas d'autre dessin pour ${planche.modeles.length - nbSosies} modèle${planche.modeles.length - nbSosies > 1 ? "s" : ""} : pas de sosie pour ${planche.modeles.length - nbSosies > 1 ? "eux" : "lui"}.`
                    : "La banque n'a pas d'autre dessin de ces mots : pas de sosie."}</span>
                )}
                {planche.nonPlaces > 0 && <span style={{ color: "var(--orange)" }}> {planche.nonPlaces} dessin{planche.nonPlaces > 1 ? "s n'ont" : " n'a"} pas trouvé de place : l'image est pleine.</span>}
              </>}
        </div>
        <Boutons atelier="oeilDeLynx" titre={titre} html={html} style={STYLE_LYNX} peut={Boolean(planche && pret)} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={sansRien
        ? <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>Ajoutez vos images dans « Mes dessins à retrouver », ou téléchargez la banque de pictogrammes depuis le loto : les dessins viendront d'eux-mêmes.</div>
        : <ApercuFeuille html={html} style={STYLE_LYNX} />}
    />
  );
}
