import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { AssistantDuLoto, questionDesCases, questionDesLegendes, questionDesPlanches, type QuestionDeReglage } from "../components/AssistantDuLoto";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { usePictoImages } from "../components/ChoixPicto";
import { ApercuExemple, useMotsExemple } from "../components/Exemple";
import { Field, Input, Select } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import { MOTS_EXEMPLE } from "../exemplesDesAteliers";
import { graineAuHasard, hasard } from "../hasard";
import { STYLE_JEUX_SONS, type MotImage } from "../jeuxSons";
import {
  REGLAGES_LOTO_SONS, STYLE_LOTOS_DES_SONS, htmlLotoDesSons, lotoDe, partieDeLoto, reglagesLotoSons, sonDansLaListe,
  type LotoDesSons, type ReglagesLotoSons, type SonDuMot, type UniteLoto,
} from "../lotosDesSons";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, Vide, bureau, ids, imprimer } from "./AteliersSons";

// ── Fabriquer › Sons et lecture › les lotos des sons ──────────────────────
//
// Six lotos, un même atelier (voir lotosDesSons.ts) : les attaques, les
// rimes, les syllabes d'attaque et de fin, les phonèmes d'attaque et de fin.
// En tête, un assistant pose ses questions une à une — avec quels mots,
// combien de planches, de cases, comment on joue (voir AssistantDuLoto) — ;
// à gauche, les mots, chacun avec son son, et les réglages ; à droite, la
// feuille telle qu'elle s'imprimera.

// ── Le son d'un mot, qu'on corrige ──

/** Ce qu'on écrit pour corriger : le son sans ses marques (« tr » pour /tr/, « teau » pour « teau »). */
const sansMarques = (ecrit: string) => ecrit.replace(/[/«»]/g, "").replace(/^-/, "").trim();

function SonModifiable({ son, corrige, onCorriger }: { son: SonDuMot | null; corrige: boolean; onCorriger: (texte: string) => void }) {
  const [edition, setEdition] = React.useState<string | null>(null);
  if (edition !== null) {
    const finir = (garder: boolean) => { if (garder) onCorriger(edition); setEdition(null); };
    return (
      <input className="bm-son-champ" autoFocus value={edition} size={Math.max(4, edition.length + 1)} aria-label="Le son de ce mot"
        onChange={(e) => setEdition(e.target.value)} onBlur={() => finir(true)}
        onKeyDown={(e) => { if (e.key === "Enter") finir(true); if (e.key === "Escape") finir(false); }} />
    );
  }
  return (
    <button type="button" className={`bm-compte${corrige ? " corrige" : ""}`} onClick={() => setEdition(son ? sansMarques(son.ecrit) : "")}
      title={son ? "Le son que le loto prend : un clic pour le corriger, vide pour revenir à celui de Maitrize" : "Ce mot n'a pas ce son (« avion » n'a pas d'attaque) : un clic pour l'écrire"}>
      {son?.ecrit ?? "—"}
    </button>
  );
}

// ── L'atelier ──

/** Ce que chaque loto fait entendre, sous le « ? » du titre ; sa source s'y ajoute d'elle-même (voir sourcesDesAteliers.ts). */
const AIDE: Record<UniteLoto, string> = {
  attaque: "L'attaque : la consonne, ou les consonnes, qui ouvrent le mot avant sa voyelle — /tr/ de train, /ch/ de chat. Un mot qui commence par une voyelle n'en a pas.",
  rime: "La rime : la fin du mot, depuis sa dernière voyelle — -eau de bateau et de gâteau, -oule de poule et de boule.",
  syllabeAttaque: "La syllabe d'attaque : la première syllabe orale du mot — « ba » de bateau, de banane, de ballon.",
  syllabeFin: "La syllabe de fin : la dernière syllabe orale du mot — « ri » de souris et de riz, « teau » de bateau et de gâteau.",
  phonemeAttaque: "Le phonème d'attaque : le premier son du mot — /s/ de soleil et de sac.",
  phonemeFin: "Le phonème en rime : le dernier son du mot — /n/ de lune et de banane, /o/ de bateau.",
};

export function LotoDesSonsTab({ banque, unite }: { banque: boolean; unite: UniteLoto }) {
  const loto: LotoDesSons = lotoDe(unite);
  const [mots, setMots] = useMotsGardes(`${loto.atelier}:mots`);
  const [brut, maj] = useReglages<ReglagesLotoSons>(loto.atelier, REGLAGES_LOTO_SONS);
  const r = React.useMemo(() => reglagesLotoSons(brut), [brut]);
  const [graine, setGraine] = useGraine();
  // Sans mots, la partie d'un exemple : ce que donnera votre loto.
  const exemple = useMotsExemple(MOTS_EXEMPLE[loto.atelier as keyof typeof MOTS_EXEMPLE], !mots.length);
  const montres = mots.length ? mots : exemple ?? [];
  const partie = React.useMemo(() => partieDeLoto(montres, unite, r, hasard(graine)), [montres, unite, r, graine]);
  const images = usePictoImages(ids(montres));
  const html = React.useMemo(() => htmlLotoDesSons(partie, loto, images, r), [partie, loto, images, r]);
  const style = STYLE_JEUX_SONS + STYLE_LOTOS_DES_SONS;
  const corriger = (m: MotImage, texte: string) => {
    const corrections = { ...r.corrections };
    if (texte.trim()) corrections[m.mot.toLowerCase()] = texte.trim(); else delete corrections[m.mot.toLowerCase()];
    maj({ corrections });
  };
  const fabriquer = (im: Record<number, string>) => htmlLotoDesSons(partieDeLoto(mots, unite, r, hasard(graine)), loto, im, r);
  const meneur = `🗣 Le meneur dit ${loto.quoi}`;
  const reglages: QuestionDeReglage[] = [
    questionDesPlanches((planches) => maj({ planches })),
    questionDesCases((cases) => maj({ cases })),
    {
      question: {
        id: "jeu", puce: "Le jeu", titre: "Comment joue-t-on ?",
        choix: [
          { id: "meneur", libelle: meneur, description: `il pioche une carte et dit ${loto.quoi} ; chacun pose un jeton sur l'image qui ${loto.debut ? "commence" : "finit"} ainsi — la règle du guide` },
          { id: "images", libelle: "🖼 On pioche des images", description: `on pose l'image piochée sur celle qui ${unite === "rime" ? "rime avec elle" : loto.debut ? "commence pareil" : "finit pareil"} (${loto.paire.join(" – ")}) : il faut des paires de mots` },
        ],
      },
      repondre: (c) => { maj({ jeu: c === "images" ? "images" : "meneur" }); return c === "images" ? "🖼 On pioche des images" : meneur; },
    },
    questionDesLegendes((legendes) => maj({ legendes })),
  ];
  const fin = !mots.length
    ? "Écrivez vos mots à gauche, ou choisissez-en : le loto se fait sous vos yeux."
    : partie.manque
      ? `⚠️ ${partie.manque} Ajoutez des mots, ou changez une réponse.`
      : `C'est prêt : ${partie.planches.length} planche${partie.planches.length > 1 ? "s" : ""} de ${r.cases} cases, avec ${mots.length} mots.`;
  const apercu = <ApercuFeuille html={html} style={style} />;
  const conseil = [r.cases === 9 ? "passez à 6 cases" : "", r.jeu === "images" ? "jouez avec le meneur" : ""].filter(Boolean).map((c) => `, ou ${c}`).join("");
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {loto.nom}
          <Aide titre={loto.nom} vers="droite">
            <p>{AIDE[unite]}</p>
            <p>{`Avec le meneur, il pioche une carte et dit ${loto.quoi} ; chacun pose un jeton sur l'image de sa planche dont le mot ${loto.debut ? "commence" : "finit"} ainsi. Sans meneur, on pioche des images et on les pose sur celles qui ${unite === "rime" ? "riment avec elles" : loto.debut ? "commencent pareil" : "finissent pareil"}.`}</p>
            <p>{"Le son que Maitrize entend dans chaque mot se lit sous son image : un clic le corrige (« ville » ne se dit pas comme « fille »)."}</p>
          </Aide>
        </h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          extra={(m) => <SonModifiable son={sonDansLaListe(m, unite, r)} corrige={Boolean(r.corrections[m.mot.toLowerCase()])} onCorriger={(t) => corriger(m, t)} />} />
        <Field label="Planches">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Input type="number" min={1} max={12} value={r.planches} onChange={(e) => maj({ planches: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} style={{ width: 70 }} aria-label="Nombre de planches" />
            <Select value={r.cases} onChange={(e) => maj({ cases: Number(e.target.value) === 9 ? 9 : 6 })} aria-label="Cases par planche">
              <option value={6}>6 cases</option><option value={9}>9 cases</option>
            </Select>
          </div>
        </Field>
        <div className="seg" role="group" aria-label="Comment on joue" style={{ marginBottom: 8 }}>
          <button type="button" className={r.jeu === "meneur" ? "active" : ""} onClick={() => maj({ jeu: "meneur" })}>🗣 Le meneur</button>
          <button type="button" className={r.jeu === "images" ? "active" : ""} onClick={() => maj({ jeu: "images" })}>🖼 Des images à piocher</button>
        </div>
        <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(v) => maj({ legendes: v })} />
        <Boutons peut={mots.length > 0 && partie.planches.length > 0} onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer(loto.atelier, loto.nom, fabriquer, ids(mots), style)}
          onBureau={() => bureau(loto.atelier, loto.nom, fabriquer, ids(mots), style)} />
      </>}
      droite={
        <div className="loto-droite">
          <AssistantDuLoto titre={`Préparer le ${loto.nom.charAt(0).toLowerCase()}${loto.nom.slice(1)}`} mots={mots} onMots={setMots} banque={banque}
            reglages={reglages} fin={fin} />
          {partie.manque ? <Vide quoi={`${partie.manque} Ajoutez des mots qui ${loto.debut ? "commencent" : "finissent"} autrement${conseil}.`} />
            : mots.length ? apercu
              : <ApercuExemple onPrendre={() => setMots(montres)}>{apercu}</ApercuExemple>}
        </div>
      }
    />
  );
}
