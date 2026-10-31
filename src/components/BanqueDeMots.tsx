import React from "react";
import { api, type CategorieArasaac, type PictoArasaac } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "./ui";
import { toast } from "./Toaster";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { motsDeLaListe, uneImageParMot } from "../loto";
import { melanger } from "../hasard";
import { ChoixPicto, EtiquetteMonPicto, usePictoImage } from "./ChoixPicto";
import { avecSeul, type MotImage } from "../jeuxSons";
import { useProjetDuMoment } from "./ProjetDuMoment";
import { BoutonMesImages } from "./MesImages";
import { estPerso } from "../imagesPerso";
import { lireLesSaisies, pictosDesMots } from "../mesPictos";
import type { PictoPose } from "../supportsVisuels";

// Les mots d'un jeu : ceux qu'on écrit, ceux qu'un thème apporte.
//
// Un loto des syllabes se joue sur les mots de la classe, pas sur les nôtres :
// l'enseignant les écrit, la banque leur trouve une image. Un thème complète
// quand il en faut plus. Chaque mot se voit, avec son image, et se retire d'un
// clic ; rien ne s'imprime qu'on n'ait regardé. Une image qui ne convient pas
// se change d'un clic, cherchée par son mot ou par son numéro ARASAAC — celui
// que montre l'outil « Pictos » ; « graine 17183 » la donne dès la saisie.

/** Le mot avec l'image choisie ; « Vider » le laisse seul, sans image. */
function avecLImage(m: MotImage, p: PictoPose): MotImage {
  const mot = p.mot.trim() || m.mot;
  if (p.id == null) return { ...avecSeul(m, undefined), id: null, mot };
  return { ...m, id: p.id, mot };
}

function Chip({ m, extra, onRetirer, onRenommer, onSeul, onImage }: {
  m: MotImage; extra?: React.ReactNode; onRetirer: () => void;
  /** Changer l'image du mot : la chercher par son mot, ou par son numéro. */
  onImage?: () => void;
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
      {onImage
        ? (
          <button type="button" className="bm-image" onClick={onImage} aria-label={`Changer l'image de « ${m.mot} »`}
            title={`Changer l'image de « ${m.mot} » : la chercher par son mot, ou par son numéro`}>
            {src ? <img src={src} alt="" /> : <span className="bm-vide" />}
          </button>
        )
        : src ? <img src={src} alt="" /> : <span className="bm-vide" />}
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

export function BanqueDeMots({ mots, onChange, banque, extra, aide, propositions, affichage = false, assistant = false }: {
  mots: MotImage[];
  onChange: (mots: MotImage[]) => void;
  /** La banque de pictogrammes est là : on peut chercher des images et des thèmes. */
  banque: boolean;
  /**
   * L'atelier a son assistant, qui propose les mots du projet et les thèmes de la banque (voir AssistantDesMots) :
   * la liste ne les répète pas — ni la case du projet, ni « piocher dans un thème » (demandes de l'enseignant, 31 octobre 2026).
   */
  assistant?: boolean;
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
  // Le rang du mot dont on change l'image.
  const [aChanger, setAChanger] = React.useState<number | null>(null);
  const { data: categories } = useAsync<CategorieArasaac[]>(() => (banque ? api.arasaacCategories() : Promise.resolve([])), [banque]);
  const themes = React.useMemo(() => (categories ?? []).filter((c) => c.nombre >= 6)
    .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr")), [categories]);
  const deja = new Set(mots.map((m) => m.mot.toLowerCase()));
  const { projet, corpus } = useProjetDuMoment();
  // Les mots du projet ne viennent qu'à la demande : la case les ajoute tous, la décocher les retire.
  const presentsDuProjet = corpus.mots.filter((m) => deja.has(m.toLowerCase())).length;
  const projetCoche = corpus.mots.length > 0 && presentsDuProjet === corpus.mots.length;

  /** Ajoute les mots écrits — ou une liste venue d'ailleurs, comme celle du projet. */
  const ajouterMots = async (saisis?: string[]) => {
    const saisies = saisis ?? motsDeLaListe(texte);
    if (!saisies.length) return;
    setOccupe(true);
    try {
      // « graine 17183 » : le mot, avec le picto de ce numéro ; déjà dans la liste, il en change l'image.
      const lues = banque ? await lireLesSaisies(saisies) : saisies.map((mot) => ({ mot, picto: null }));
      const renumerotes = new Map(lues.flatMap((l) => (l.picto && deja.has(l.mot.toLowerCase()) ? [[l.mot.toLowerCase(), l.picto.id] as const] : [])));
      const nouvelles = lues.filter((l) => !deja.has(l.mot.toLowerCase()));
      const liste = banque ? nouvelles.filter((l) => !l.picto).map((l) => l.mot) : [];
      const [trouves, absents]: [PictoArasaac[], string[]] = liste.length ? await pictosDesMots(liste) : [[], []];
      const parMot = new Map(uneImageParMot(trouves).map((x) => [x.picto.mot.toLowerCase(), x.picto]));
      const suite = nouvelles.map(({ mot, picto }): MotImage => {
        const p = picto ?? parMot.get(mot.toLowerCase()) ?? trouves.find((t) => t.mot.toLowerCase() === mot.toLowerCase());
        return { id: p?.id ?? null, mot };
      });
      if (absents.length) toast(`${absents.length} mot${absents.length > 1 ? "s" : ""} sans image : ${absents.slice(0, 4).join(", ")}${absents.length > 4 ? "…" : ""}`, { icone: "ℹ️" });
      if (!suite.length && !renumerotes.size) return;
      onChange([...mots.map((m) => {
        const id = renumerotes.get(m.mot.toLowerCase());
        return id == null ? m : { ...m, id };
      }), ...suite]);
      if (!saisis) setTexte("");
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };

  const basculerProjet = (oui: boolean) => {
    if (oui) { void ajouterMots(corpus.mots); return; }
    const duProjet = new Set(corpus.mots.map((m) => m.toLowerCase()));
    onChange(mots.filter((m) => !duProjet.has(m.mot.toLowerCase())));
  };

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
        <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} rows={3} placeholder={"bateau\nbanane\nballon"} data-saisie-mots="" />
        {banque && (
          <p className="meta" style={{ fontSize: 12, margin: "4px 0 0", lineHeight: 1.45 }}>
            Un picto précis : son numéro après le mot (« graine 17183 »), celui que montre 🧩 Pictos. Une image ne convient pas ?
            Cliquez dessus pour en choisir une autre.
          </p>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
          <button type="button" className="btn sm" disabled={occupe || !texte.trim()} onClick={() => void ajouterMots()}>
            ＋ Ajouter les mots
          </button>
          {/* Une photo, un dessin, une image d'ailleurs : elles se mêlent aux pictogrammes. */}
          <BoutonMesImages onImages={(images) => onChange([...mots, ...images.map((i) => ({ id: i.id, mot: i.mot }))])}>🖼 Mes images</BoutonMesImages>
        </div>
        {!assistant && projet && corpus.mots.length > 0 && (
          <label className="pb-coche" style={{ marginTop: 8 }}>
            {/* À moitié cochée : une partie des mots du projet est déjà là ; la cocher ajoute les autres. */}
            <input type="checkbox" checked={projetCoche} disabled={occupe}
              ref={(el) => { if (el) el.indeterminate = presentsDuProjet > 0 && !projetCoche; }}
              onChange={(e) => basculerProjet(e.target.checked)} />
            <span>Les mots du projet « {projet.titre} » ({corpus.mots.length})</span>
          </label>
        )}
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
      {banque ? !assistant && (
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
            onSeul={affichage && m.id != null ? (seul) => onChange(mots.map((x, k) => (k === i ? avecSeul(x, seul) : x))) : undefined}
            onImage={() => setAChanger(i)} />
        ))}
      </div>
      {aChanger != null && mots[aChanger] && (
        <ChoixPicto valeur={{ id: mots[aChanger].id, mot: mots[aChanger].mot }} banque={banque}
          titre={`L'image de « ${mots[aChanger].mot} »`} onClose={() => setAChanger(null)}
          onValider={(p) => { onChange(mots.map((x, k) => (k === aChanger ? avecLImage(x, p) : x))); setAChanger(null); }} />
      )}
    </div>
  );
}
