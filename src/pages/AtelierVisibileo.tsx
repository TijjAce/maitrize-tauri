import React from "react";
import { Aide, LibelleAvecAide } from "../components/Aide";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { CasePicto } from "../components/CasePicto";
import { ApercuExemple, motsAvecImages } from "../components/Exemple";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { EditeurAffichage } from "../components/EditeurAffichage";
import { BoutonBureau } from "../components/BoutonBureau";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import type { PictoPose } from "../supportsVisuels";
import { api } from "../api";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { pngDeLaZone } from "../exercicesDesManuels";
import { pseudonymiserTout, restaurer } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import { singulier } from "../corpusAuto";
import {
  CONSIGNE_IMAGES, CONSIGNE_LECTURE_PAGE, CONSIGNE_VISIBILEO, COULEURS, STYLE_AFFICHAGE, htmlAffichage, idLibre, EXEMPLE_VISIBILEO, FLECHES_MAX, GENRES, PERSONNAGES_MAX, PIECES_MAX, REGLAGES_VISIBILEO,
  STYLE_VISIBILEO, VIERGES_MAX, ajouterPage, cequiManque, demandeDesImages, htmlVisibileo, idsDesImages, lireChoixDesImages, lirePremierJet,
  motsDeLExemple, personnageVide, personnagesNommes, pieceVide, reglagesSurs, type Fleche, type ImageACherche, type PremierJet,
  type Genre, type Piece, type ReglagesVisibileo, type Signe,
} from "../visibileo";

// ── Fabriquer › Visibiléo ─────────────────────────────────────────────────
//
// Les pièces pour construire avec la classe la trace d'un récit (voir
// visibileo.ts) : on nomme les personnages, on écrit ce qu'on prévoit de
// faire voir — ce qui se passe, ce qu'ils pensent, ce qu'ils disent —, et
// les feuilles se voient à droite telles qu'elles s'imprimeront. Le texte de
// l'histoire se colle, ou se photographie avec le compagnon, page à page ;
// « ✨ Construire avec l'IA » en tire un premier jet, à relire.

const ATELIER = "visibileo";

const MIME: Record<string, string> = { png: "image/png", webp: "image/webp", gif: "image/gif", heic: "image/heic" };
/** Une photo reçue du téléphone, en PNG base64 : c'est ce que lit l'IA. */
async function pngDeLaPhoto(nom: string): Promise<string> {
  const ext = nom.split(".").pop()?.toLowerCase() ?? "";
  const dataUrl = `data:${MIME[ext] ?? "image/jpeg"};base64,${await api.fichierRead(nom)}`;
  return pngDeLaZone(dataUrl, { x: 0, y: 0, l: 1, h: 1 }, 2000);
}

/**
 * Les pictos du premier jet, dans le sens de l'histoire (voir visibileo.ts) :
 * pour chaque image, les pictos de son mot et leurs mots-clés, puis le choix
 * de Mistral. Sans banque ou sans réponse, aucune image plutôt qu'une fausse.
 */
async function pictosDuPremierJet(jet: PremierJet, modele: string): Promise<{ personnages: PictoPose[]; pieces: PictoPose[] }> {
  // Chaque mot, et son singulier : la banque cherche par morceau de mot, et « chevaux » n'y ramène que des courses et des peignes.
  const voulues = [...jet.personnages, ...jet.pieces].map((x, n) => ({ n, mots: [...new Set(x.images.flatMap((m) => [m, singulier(m)]))], sens: x.sens }));
  const parMot = new Map<string, ImageACherche["candidats"]>();
  try {
    for (const mot of [...new Set(voulues.flatMap((v) => v.mots))]) {
      const trouves = await api.arasaacChercher(mot, 6);
      const mots = trouves.length ? await api.arasaacMotsDesIds(trouves.map((p) => p.id)) : {};
      parMot.set(mot, trouves.map((p) => ({ id: p.id, mots: mots[String(p.id)] ?? [p.mot], ...(p.nature ? { nature: p.nature } : {}) })));
    }
  } catch { /* sans banque : sans images */ }
  // Les pictos de tous les mots d'une image, une fois chacun : ceux du mot le plus précis d'abord.
  const images: ImageACherche[] = voulues.map((v) => ({
    ...v, candidats: [...new Map(v.mots.flatMap((m) => parMot.get(m) ?? []).map((c) => [c.id, c])).values()].slice(0, 12),
  }));
  let choix = new Map<number, number | null>();
  if (images.some((i) => i.candidats.length)) {
    try {
      const brut = await api.mistralChat([{ role: "system", content: CONSIGNE_IMAGES }, { role: "user", content: demandeDesImages(images) }], modele, true);
      choix = lireChoixDesImages(brut, images);
    } catch { /* sans réponse : sans images */ }
  }
  // Le mot de la case : celui qui a trouvé le picto choisi, sinon le plus précis.
  const picto = (n: number): PictoPose => {
    const id = choix.get(n) ?? null;
    return { id, mot: voulues[n].mots.find((m) => id !== null && parMot.get(m)?.some((c) => c.id === id)) ?? voulues[n].mots[0] ?? "" };
  };
  return {
    personnages: jet.personnages.map((_, i) => picto(i)),
    pieces: jet.pieces.map((_, i) => picto(jet.personnages.length + i)),
  };
}

const AJOUTER: Record<Genre, string> = { cadre: "＋ Un cadre", nuage: "＋ Un nuage", bulle: "＋ Une bulle" };
const EXEMPLES: Record<Genre, string> = { cadre: "Le corbeau tient un fromage.", nuage: "Je veux ce fromage.", bulle: "Que vous êtes joli !" };

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span><LibelleAvecAide libelle={libelle} /></span></label>
);

const Nombre = ({ valeur, max, libelle, onChange }: { valeur: number; max: number; libelle: string; onChange: (n: number) => void }) => (
  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
    <Input type="number" min={0} max={max} value={valeur} style={{ width: 58 }} aria-label={libelle}
      onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))} />
    {libelle}
  </label>
);

export function VisibileoTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesVisibileo>(ATELIER, REGLAGES_VISIBILEO);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  // Rien d'écrit : l'exemple, ce que donneront les vôtres.
  const vide = !r.titre.trim() && !r.texte.trim() && !r.pieces.length && !personnagesNommes(r).length;
  const [occupe, setOccupe] = React.useState("");
  const [vue, setVue] = React.useState<"feuilles" | "affiche">("feuilles");

  // Les pages photographiées arrivent une à une : chacune se lit à son tour, et son texte s'ajoute au précédent.
  const texteRef = React.useRef(r.texte);
  texteRef.current = r.texte;
  const file = React.useRef(Promise.resolve());
  const [lues, setLues] = React.useState(0);
  const pageRecue = (nom: string) => {
    file.current = file.current.then(async () => {
      setOccupe("Lecture de la page…");
      try {
        const page = await api.mistralVision(CONSIGNE_LECTURE_PAGE, await pngDeLaPhoto(nom), await api.modeleActif());
        texteRef.current = ajouterPage(texteRef.current, page);
        maj({ texte: texteRef.current });
        setLues((n) => n + 1);
      } catch (e) {
        toast(`Page reçue, mais illisible : ${String(e)}`, { icone: "⚠️", duree: 8000 });
      } finally {
        setOccupe("");
        api.fichierDelete(nom).catch(() => {});
      }
    });
  };

  // Le premier jet de l'IA : les prénoms des élèves masqués à l'aller, remis au retour.
  const construire = async () => {
    if ((r.pieces.length || personnagesNommes(r).length)
      && !(await confirmer("Remplacer les personnages et les pièces par ceux que l'IA propose ?", { oui: "Remplacer" }))) return;
    setOccupe("L'IA lit l'histoire…");
    try {
      const modele = await api.modeleActif();
      const masque = pseudonymiserTout([r.texte], await nomsAMasquer());
      const brut = await api.mistralChat([
        { role: "system", content: CONSIGNE_VISIBILEO },
        { role: "user", content: `Le texte de l'histoire :\n\n${masque.textes[0]}` },
      ], modele, true);
      const jet = lirePremierJet(restaurer(brut, masque.table).texte);
      if (!jet) { toast("L'IA n'a rien rendu d'utilisable : réessayez.", { icone: "⚠️" }); return; }
      setOccupe("L'IA choisit les images…");
      const images = await pictosDuPremierJet(jet, modele);
      // L'affiche repart rangée : les flèches rouges des causes, et les bleues de l'ordre des cadres.
      const idDe = (k: number) => `q${k + 1}`;
      const cadres = jet.pieces.map((p, k) => ({ p, k })).filter(({ p }) => p.genre === "cadre");
      maj({
        titre: r.titre.trim() || jet.titre,
        personnages: jet.personnages.map((p, i) => ({ ...personnageVide(i), nom: p.nom, image: images.personnages[i] })),
        pieces: jet.pieces.map((p, i): Piece => ({ id: idDe(i), genre: p.genre, texte: p.texte, qui: p.qui, image: images.pieces[i] })),
        affichage: {
          places: {},
          fleches: [
            ...cadres.slice(1).map(({ k }, j): Fleche => ({ de: idDe(cadres[j].k), vers: idDe(k), couleur: "bleue", courbe: 0 })),
            ...jet.causes.map((c): Fleche => ({ de: idDe(c.de), vers: idDe(c.vers), couleur: "rouge", courbe: 0.25 })),
          ],
        },
      });
      toast("✨ Le premier jet de l'IA est posé : relisez les pièces avant d'imprimer.", { icone: "✨", duree: 7000 });
    } catch (e) {
      toast(String(e), { icone: "⚠️", duree: 8000 });
    } finally {
      setOccupe("");
    }
  };
  const [exemple, setExemple] = React.useState<ReglagesVisibileo | null>(null);
  React.useEffect(() => {
    if (!vide || exemple) return;
    let vivant = true;
    motsAvecImages(motsDeLExemple()).then((mots) => {
      const image = (m: string): PictoPose => {
        const t = mots.find((x) => x.mot === m);
        return { id: t?.id ?? null, mot: m };
      };
      if (vivant) {
        const idDe = (k: number) => `q${k + 1}`;
        setExemple({
          ...r, titre: EXEMPLE_VISIBILEO.titre,
          personnages: EXEMPLE_VISIBILEO.personnages.map((p, i) => ({ ...personnageVide(i), nom: p.nom, image: image(p.image) })),
          pieces: EXEMPLE_VISIBILEO.pieces.map((p, k): Piece => ({ id: idDe(k), genre: p.genre, texte: p.texte, image: p.image ? image(p.image) : { id: null, mot: "" }, qui: p.qui })),
          affichage: { places: {}, fleches: EXEMPLE_VISIBILEO.fleches.map((f): Fleche => ({ ...f, de: idDe(f.de), vers: idDe(f.vers) })) },
        });
      }
    }).catch(() => {});
    return () => { vivant = false; };
  }, [vide]); // eslint-disable-line react-hooks/exhaustive-deps
  const montree = vide && exemple ? { ...exemple, feuilles: r.feuilles, images: r.images, mots: r.mots, capitales: r.capitales, grandes: r.grandes } : r;
  const ids = React.useMemo(() => idsDesImages(montree), [montree]);
  const images = usePictoImages(ids);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlVisibileo(montree, images), [montree, images]);
  const titre = r.titre.trim() ? `Visibiléo — ${r.titre.trim()}` : "Visibiléo";
  const feuilleImprimee = async () => htmlVisibileo(r, await chargerImages(idsDesImages(r)));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_VISIBILEO); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  // L'affiche, en A3 à l'italienne : son style vient en dernier, sa page l'emporte sur celle des feuilles.
  const imprimerLAffiche = async () => {
    try { await imprimerAtelier(ATELIER, `${titre} — l'affiche`, htmlAffichage(r, await chargerImages(idsDesImages(r))), STYLE_FEUILLE + STYLE_VISIBILEO + STYLE_AFFICHAGE); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };

  const changerPersonnage = (i: number, p: Partial<ReglagesVisibileo["personnages"][number]>) =>
    maj({ personnages: r.personnages.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  // Un personnage qui part : les pensées et les paroles qu'on lui donnait ne sont plus à personne, celles des suivants gardent leur auteur.
  const retirerPersonnage = (i: number) => maj({
    personnages: r.personnages.filter((_, k) => k !== i),
    pieces: r.pieces.map((p) => ({ ...p, qui: p.qui === i ? -1 : p.qui > i ? p.qui - 1 : p.qui })),
  });
  const changerPiece = (i: number, p: Partial<Piece>) => maj({ pieces: r.pieces.map((x, k) => (k === i ? { ...x, ...p } : x)) });
  const nommes = r.personnages.map((p, i) => ({ p, i })).filter(({ p }) => p.nom.trim() || p.image.mot);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 430px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Visibiléo
          <Aide titre="Visibiléo" vers="droite">
            <p>La trace d'un récit, construite avec la classe : des cadres pour ce qui se passe, des nuages pour ce que pensent et veulent
            les personnages — ce que le texte ne dit pas —, des bulles pour ce qu'ils disent, des flèches rouges pour les causes et des
            flèches bleues pour l'ordre des événements. On le pose d'abord dans l'ordre du récit, puis selon les liens, et on le relit de
            la conséquence vers la cause.</p>
            <p>Ce sont les élèves qui décident de ce qui est important : Maitrize fait les pièces à découper et à plastifier — avec des
            vierges pour le feutre effaçable —, le mémo des signes et la fiche de préparation, pas un Visibiléo tout fait.</p>
          </Aide>
        </h3>
        <Field label="L'histoire">
          <Input value={r.titre} placeholder="Le Corbeau et le Renard" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label="Le texte de l'histoire">
          <Textarea value={r.texte} rows={Math.min(10, Math.max(3, r.texte.split("\n").length + 1))} aria-label="Le texte de l'histoire"
            placeholder="Collez le tapuscrit, ou photographiez les pages avec le téléphone."
            onChange={(e) => maj({ texte: e.target.value })} style={{ width: "100%", resize: "vertical" }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
            <PhotoTelephone serie label="📱 Photographier le texte" className="btn sm" onPhoto={pageRecue}
              onFin={(n) => { if (n) toast(`${n} page${n > 1 ? "s" : ""} reçue${n > 1 ? "s" : ""} : le texte se lit.`, { icone: "📱" }); }} />
            <button type="button" className="btn sm" disabled={!r.texte.trim() || Boolean(occupe)} onClick={() => { void construire(); }}>
              ✨ Construire avec l'IA</button>
            {occupe ? <span className="meta">{occupe}</span> : lues ? <span className="meta">{lues} page{lues > 1 ? "s" : ""} lue{lues > 1 ? "s" : ""}</span> : null}
          </div>
        </Field>
        <Field label={`Les personnages (${r.personnages.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {r.personnages.map((p, i) => (
              <div key={i} className="ct-categorie" style={{ borderLeftColor: p.couleur }}>
                <div className="ct-categorie-tete">
                  <CasePicto valeur={p.image} banque={banque} titre={`L'image du personnage ${i + 1}`} taille={30} onChange={(image) => changerPersonnage(i, { image })} />
                  <Input value={p.nom} placeholder={i === 0 ? "Le corbeau" : "Un personnage"} aria-label={`Nom du personnage ${i + 1}`}
                    onChange={(e) => changerPersonnage(i, { nom: e.target.value })} />
                  <button type="button" className="btn ghost sm" onClick={() => retirerPersonnage(i)} aria-label={`Retirer ${p.nom || `le personnage ${i + 1}`}`}>✕</button>
                </div>
                <div style={{ display: "flex", gap: 4, margin: "4px 0 2px 38px" }}>
                  {COULEURS.map((c) => (
                    <button key={c.hex} type="button" title={c.nom} aria-label={`Couleur ${c.nom}`} onClick={() => changerPersonnage(i, { couleur: c.hex })}
                      className="dos-pastille" style={{ width: 16, height: 16, background: c.hex, cursor: "pointer", outline: p.couleur === c.hex ? "2px solid var(--text)" : "none" }} />
                  ))}
                </div>
              </div>
            ))}
            {r.personnages.length < PERSONNAGES_MAX && (
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }}
                onClick={() => maj({ personnages: [...r.personnages, personnageVide(r.personnages.length, idLibre(r, "p"))] })}>＋ Un personnage</button>
            )}
          </div>
        </Field>
        {GENRES.map((genre) => {
          const siennes = r.pieces.map((p, i) => ({ p, i })).filter(({ p }) => p.genre === genre);
          return (
            <Field key={genre} label={`${r.libelles[genre]} (${siennes.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {siennes.map(({ p, i }) => (
                  <div key={i} className="ct-categorie-tete">
                    <CasePicto valeur={p.image} banque={banque} titre="L'image de la pièce" taille={30} onChange={(image) => changerPiece(i, { image })} />
                    <Input value={p.texte} placeholder={EXEMPLES[genre]} aria-label={r.libelles[genre]} onChange={(e) => changerPiece(i, { texte: e.target.value })} />
                    {genre !== "cadre" && (
                      <Select value={String(p.qui)} aria-label="Qui pense ou qui parle" style={{ width: 120 }}
                        onChange={(e) => changerPiece(i, { qui: Number(e.target.value) })}>
                        <option value="-1">Personne</option>
                        {nommes.map(({ p: x, i: k }) => <option key={k} value={k}>{x.nom.trim() || x.image.mot}</option>)}
                      </Select>
                    )}
                    <button type="button" className="btn ghost sm" onClick={() => maj({ pieces: r.pieces.filter((_, k) => k !== i) })} aria-label="Retirer la pièce">✕</button>
                  </div>
                ))}
                {r.pieces.length < PIECES_MAX && (
                  <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }}
                    onClick={() => maj({ pieces: [...r.pieces, pieceVide(genre, genre === "cadre" ? -1 : nommes[0]?.i ?? -1, idLibre(r, "q"))] })}>{AJOUTER[genre]}</button>
                )}
              </div>
            </Field>
          );
        })}
        <details className="pli">
          <summary>Pièces vierges et flèches<span className="meta"> · {r.vierges.cadre + r.vierges.nuage + r.vierges.bulle} vierges, {r.fleches.rouges + r.fleches.bleues} flèches</span></summary>
          <div style={{ display: "grid", gap: 6, margin: "6px 0" }}>
            <Nombre valeur={r.vierges.cadre} max={VIERGES_MAX} libelle="cadres vierges" onChange={(cadre) => maj({ vierges: { ...r.vierges, cadre } })} />
            <Nombre valeur={r.vierges.nuage} max={VIERGES_MAX} libelle="nuages vierges, par personnage" onChange={(nuage) => maj({ vierges: { ...r.vierges, nuage } })} />
            <Nombre valeur={r.vierges.bulle} max={VIERGES_MAX} libelle="bulles vierges, par personnage" onChange={(bulle) => maj({ vierges: { ...r.vierges, bulle } })} />
            <Nombre valeur={r.fleches.rouges} max={FLECHES_MAX} libelle="flèches rouges (les causes)" onChange={(rouges) => maj({ fleches: { ...r.fleches, rouges } })} />
            <Nombre valeur={r.fleches.bleues} max={FLECHES_MAX} libelle="flèches bleues (l'ordre)" onChange={(bleues) => maj({ fleches: { ...r.fleches, bleues } })} />
          </div>
        </details>
        <details className="pli">
          <summary>Les signes de la classe<span className="meta"> · les mots du mémo</span></summary>
          <div style={{ display: "grid", gap: 6, margin: "6px 0" }}>
            {(Object.keys(r.libelles) as Signe[]).map((k) => (
              <Input key={k} value={r.libelles[k]} aria-label={`Le mot du signe ${k}`} onChange={(e) => maj({ libelles: { ...r.libelles, [k]: e.target.value } })} />
            ))}
          </div>
        </details>
        <details className="pli">
          <summary>Présentation<span className="meta"> · {[r.images ? "images" : "sans images", r.mots ? "mots" : "images seules", r.grandes && "grandes pièces", r.capitales && "en capitales"].filter(Boolean).join(", ")}</span></summary>
          <Coche on={r.images} libelle="Les images sur les pièces" onChange={(images) => maj({ images })} />
          <Coche on={r.mots} libelle="Les mots sur les pièces" onChange={(mots) => maj({ mots })} />
          <Coche on={r.grandes} libelle="Une pièce par ligne, plus grande, pour le tableau" onChange={(grandes) => maj({ grandes })} />
          <Coche on={r.capitales} libelle="Tout écrire en capitales" onChange={(capitales) => maj({ capitales })} />
          <div className="meta" style={{ margin: "8px 0 2px" }}>Les feuilles</div>
          <Coche on={r.feuilles.pieces} libelle="Les pièces à découper" onChange={(pieces) => maj({ feuilles: { ...r.feuilles, pieces } })} />
          <Coche on={r.feuilles.memo} libelle="Le mémo des signes" onChange={(memo) => maj({ feuilles: { ...r.feuilles, memo } })} />
          <Coche on={r.feuilles.preparation} libelle="La fiche de préparation" onChange={(preparation) => maj({ feuilles: { ...r.feuilles, preparation } })} />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_VISIBILEO)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="seg" role="group" aria-label="Ce qu'on regarde" style={{ marginBottom: 10 }}>
          <button type="button" className={vue === "feuilles" ? "active" : ""} onClick={() => setVue("feuilles")}>📄 Les feuilles</button>
          <button type="button" className={vue === "affiche" ? "active" : ""} onClick={() => setVue("affiche")}>🖼 L'affiche</button>
        </div>
        {vide && exemple
          ? <ApercuExemple onPrendre={() => maj({ titre: exemple.titre, personnages: exemple.personnages, pieces: exemple.pieces, affichage: exemple.affichage })}>
              {vue === "feuilles"
                ? <ApercuFeuille html={html} style={STYLE_VISIBILEO} />
                : <ApercuFeuille html={htmlAffichage(montree, images)} style={STYLE_VISIBILEO + STYLE_AFFICHAGE} />}
            </ApercuExemple>
          : vue === "feuilles"
            ? <ApercuFeuille html={html} style={STYLE_VISIBILEO} />
            : <EditeurAffichage r={r} images={images} onChange={(affichage) => maj({ affichage })} onImprimer={() => { void imprimerLAffiche(); }} />}
      </div>
    </div>
  );
}
