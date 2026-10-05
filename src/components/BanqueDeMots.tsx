import React from "react";
import { api, type CategorieArasaac } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "./ui";
import { toast } from "./Toaster";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { motsDeLaListe, uneImageParMot } from "../loto";
import { melanger } from "../hasard";
import { EtiquetteMonPicto, usePictoImage } from "./ChoixPicto";
import { avecSeul, type MotImage } from "../jeuxSons";
import { useProjetDuMoment } from "./ProjetDuMoment";
import { BoutonMesImages } from "./MesImages";
import { estPerso } from "../imagesPerso";
import { pictosDesMots } from "../mesPictos";

// Les mots d'un jeu : ceux qu'on écrit, ceux qu'un thème apporte.
//
// Un loto des syllabes se joue sur les mots de la classe, pas sur les nôtres :
// l'enseignant les écrit, la banque leur trouve une image. Un thème complète
// quand il en faut plus. Chaque mot se voit, avec son image, et se retire d'un
// clic ; rien ne s'imprime qu'on n'ait regardé.

function Chip({ m, extra, onRetirer, onRenommer, onSeul }: {
  m: MotImage; extra?: React.ReactNode; onRetirer: () => void;
  /** Pour une image de l'enseignant : son mot s'écrit ici, le nom du fichier n'en est qu'une proposition. */
  onRenommer?: (mot: string) => void;
  /** Ce que la feuille montre du mot : son image, son mot, ou les deux — jamais rien. */
  onSeul?: (seul: MotImage["seul"]) => void;
}) {
  const src = usePictoImage(m.id);
  const sansImage = m.seul === "mot", sansMot = m.seul === "image";
  return (
    <span className={`bm-chip${sansImage ? " bm-sans-image" : ""}${sansMot ? " bm-sans-mot" : ""}`}
      title={m.id == null ? "Aucune image trouvée : le mot s'imprimera seul" : onRenommer && estPerso(m.id) ? "Votre image : écrivez son mot" : m.mot}>
      {src ? <img src={src} alt="" /> : <span className="bm-vide" />}
      <EtiquetteMonPicto id={m.id} />
      {onRenommer
        ? <input className="bm-renommer" value={m.mot} size={Math.max(4, m.mot.length)} aria-label="Le mot de cette image"
            onChange={(e) => onRenommer(e.target.value)} />
        : <span className="bm-mot">{m.mot}</span>}
      {extra}
      {onSeul && src && (
        <span className="bm-montrer" role="group" aria-label={`Ce que la feuille montre de « ${m.mot} »`}>
          <button type="button" aria-pressed={!sansImage} disabled={sansMot}
            title={sansImage ? "Remettre l'image sur la feuille" : "Enlever l'image de la feuille : le mot seul"}
            onClick={() => onSeul(sansImage ? undefined : "mot")}>🖼</button>
          <button type="button" aria-pressed={!sansMot} disabled={sansImage}
            title={sansMot ? "Remettre le mot sur la feuille" : "Enlever le mot de la feuille : l'image seule"}
            onClick={() => onSeul(sansMot ? undefined : "image")}>Aa</button>
        </span>
      )}
      <button type="button" className="bm-x" aria-label={`Retirer ${m.mot}`} onClick={onRetirer}>×</button>
    </span>
  );
}

export function BanqueDeMots({ mots, onChange, banque, extra, aide, propositions, affichage = false }: {
  mots: MotImage[];
  onChange: (mots: MotImage[]) => void;
  /** La banque de pictogrammes est là : on peut chercher des images et des thèmes. */
  banque: boolean;
  /** Ce qu'on montre en plus sur chaque mot (un compte de syllabes, par exemple). */
  extra?: (m: MotImage) => React.ReactNode;
  aide?: string;
  /** Des listes toutes prêtes que l'atelier propose : les mots d'un son, par exemple. */
  propositions?: { libelle: string; mots: string[] }[];
  /** Chaque mot dit ce que la feuille en montre — 🖼 son image, Aa son mot — et chacun se réécrit (la carte mentale). */
  affichage?: boolean;
}) {
  const [texte, setTexte] = React.useState("");
  const [proposition, setProposition] = React.useState("");
  const [theme, setTheme] = React.useState("");
  const [combien, setCombien] = React.useState(12);
  const [occupe, setOccupe] = React.useState(false);
  const { data: categories } = useAsync<CategorieArasaac[]>(() => (banque ? api.arasaacCategories() : Promise.resolve([])), [banque]);
  const themes = React.useMemo(() => (categories ?? []).filter((c) => c.nombre >= 6)
    .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr")), [categories]);
  const deja = new Set(mots.map((m) => m.mot.toLowerCase()));
  const { projet, corpus } = useProjetDuMoment();
  const duProjet = corpus.mots.filter((m) => !deja.has(m.toLowerCase()));

  /** Ajoute les mots écrits — ou une liste venue d'ailleurs, comme celle du projet. */
  const ajouterMots = async (saisis?: string[]) => {
    const liste = (saisis ?? motsDeLaListe(texte)).filter((m) => !deja.has(m.toLowerCase()));
    if (!liste.length) return;
    setOccupe(true);
    try {
      let suite: MotImage[] = [];
      if (banque) {
        const [trouves, absents] = await pictosDesMots(liste);
        const parMot = new Map(uneImageParMot(trouves).map((x) => [x.picto.mot.toLowerCase(), x.picto]));
        suite = liste.map((mot) => {
          const p = parMot.get(mot.toLowerCase()) ?? trouves.find((t) => t.mot.toLowerCase() === mot.toLowerCase());
          return { id: p?.id ?? null, mot };
        });
        if (absents.length) toast(`${absents.length} mot${absents.length > 1 ? "s" : ""} sans image : ${absents.slice(0, 4).join(", ")}${absents.length > 4 ? "…" : ""}`, { icone: "ℹ️" });
      } else {
        suite = liste.map((mot) => ({ id: null, mot }));
      }
      onChange([...mots, ...suite]);
      if (!saisis) setTexte("");
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };

  // Le projet du moment donne ses mots dès qu'on ouvre l'atelier, s'il est vide —
  // une fois : on en retire, on en ajoute ensuite à sa guise.
  const projetPris = React.useRef("");
  React.useEffect(() => {
    if (!projet || !corpus.mots.length || projetPris.current === projet.id || mots.length) return;
    projetPris.current = projet.id;
    void ajouterMots(corpus.mots);
  }, [projet?.id, corpus.mots.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const ajouterTheme = async () => {
    if (!theme) return;
    setOccupe(true);
    try {
      const vivier = await api.arasaacSelection([theme], EXCLUES_PAR_DEFAUT, false, 0, 1);
      const libres = uneImageParMot(vivier).map((x) => x.picto).filter((p) => !deja.has(p.mot.toLowerCase()));
      const pris = melanger(Math.random, libres).slice(0, combien);
      if (!pris.length) toast("Ce thème n'a plus d'autres mots.", { icone: "ℹ️" });
      onChange([...mots, ...pris.map((p) => ({ id: p.id, mot: p.mot }))]);
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };

  return (
    <div>
      {aide && <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>{aide}</p>}
      <Field label="Mes mots (un par ligne, ou séparés par des virgules)">
        <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder={"bateau\nbanane\nballon"} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          <button type="button" className="btn sm" disabled={occupe || !texte.trim()} onClick={() => void ajouterMots()}>
            ＋ Ajouter les mots
          </button>
          {projet && corpus.mots.length > 0 && (
            <button type="button" className="btn sm" disabled={occupe || !duProjet.length} onClick={() => void ajouterMots(corpus.mots)}
              title={duProjet.length ? `Les mots du projet « ${projet.titre} »` : `Les mots du projet « ${projet.titre} » sont déjà là`}>
              📌 Les mots du projet ({corpus.mots.length})
            </button>
          )}
          {/* Une photo, un dessin, une image d'ailleurs : elles se mêlent aux pictogrammes. */}
          <BoutonMesImages onImages={(images) => onChange([...mots, ...images.map((i) => ({ id: i.id, mot: i.mot }))])}>🖼 Mes images</BoutonMesImages>
        </div>
      </Field>
      {propositions && propositions.length > 0 && (
        <Field label="Ou des mots tout prêts">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Select value={proposition} onChange={(e) => setProposition(e.target.value)} style={{ flex: 1, minWidth: 150 }}>
              <option value="">Choisir une liste…</option>
              {propositions.map((p) => <option key={p.libelle} value={p.libelle}>{p.libelle}</option>)}
            </Select>
            <button type="button" className="btn sm" disabled={occupe || !proposition}
              onClick={() => void ajouterMots(propositions.find((p) => p.libelle === proposition)?.mots ?? [])}>＋ Ajouter</button>
          </div>
        </Field>
      )}
      {banque ? (
        <Field label="Ou piocher dans un thème">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ flex: 1, minWidth: 150 }}>
              <option value="">Choisir un thème…</option>
              {themes.map((c) => <option key={c.nom} value={c.nom}>{libelleCategorie(c.nom)} ({c.nombre})</option>)}
            </Select>
            <Input type="number" min={1} max={60} value={combien} onChange={(e) => setCombien(Math.max(1, Math.min(60, Number(e.target.value) || 1)))} style={{ width: 64 }} aria-label="Combien de mots" />
            <button type="button" className="btn sm" disabled={occupe || !theme} onClick={ajouterTheme}>＋ Piocher</button>
          </div>
        </Field>
      ) : (
        <p className="meta" style={{ fontSize: 12 }}>Sans la banque de pictogrammes, les mots s'impriment seuls. Elle se télécharge depuis le loto.</p>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <b style={{ fontSize: 13 }}>{mots.length} mot{mots.length > 1 ? "s" : ""}</b>
        {mots.length > 0 && <button type="button" className="btn ghost sm" onClick={() => onChange([])}>Tout retirer</button>}
      </div>
      <div className="bm-liste">
        {mots.map((m, i) => (
          // Un mot qu'on réécrit garde sa clé : le champ ne perd pas le curseur.
          <Chip key={affichage ? `rang${i}` : estPerso(m.id) ? `perso${m.id}` : `${m.mot}-${i}`} m={m} extra={extra?.(m)}
            onRetirer={() => onChange(mots.filter((_, k) => k !== i))}
            onRenommer={affichage || estPerso(m.id) ? (mot) => onChange(mots.map((x, k) => (k === i ? { ...x, mot } : x))) : undefined}
            onSeul={affichage && m.id != null ? (seul) => onChange(mots.map((x, k) => (k === i ? avecSeul(x, seul) : x))) : undefined} />
        ))}
      </div>
    </div>
  );
}
