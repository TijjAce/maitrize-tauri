import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import { chargerImages, usePictoImages } from "./ChoixPicto";
import { ChoixPictoConsigne } from "./ChoixPictoConsigne";
import { useLexique } from "./ConsigneEnPictos";
import { CLE_LEXIQUE, lireLexique } from "../caa";
import type { RefPicto } from "../pictosAppoint";
import {
  CLE_CHOIX_TAPUSCRIT, CONSIGNE_MAX, CONSIGNES_MAX, EVT_CHOIX_TAPUSCRIT, avecChoix, demandesDe, ecrireChoix, ecrireConsignes,
  htmlDuTapuscrit, lireChoix, lireConsignes, motsDeLaConsigne, pictoDuMot, singuliers, type ChoixDesMots, type MotDeConsigne,
} from "../tapuscrit";
import { EVT_TAPUSCRIT_JOURNAL, cleTapuscritDuCreneau, creneauxAvecTapuscrit } from "../journalTapuscrit";

// ── Le tapuscrit d'une séance, à l'écran ──────────────────────────────────
//
// Les consignes s'écrivent une par ligne dans la fiche de la séance ; leur
// traduction en pictogrammes se voit dessous, et chaque picto se change d'un
// clic (voir tapuscrit.ts).

/** Les pictos choisis à la main, mot par mot, tenus à jour d'où qu'ils changent. */
export function useChoixTapuscrit(): { choix: ChoixDesMots; choisir: (cle: string, ref: RefPicto | 0 | undefined) => void } {
  const [choix, setChoix] = React.useState<ChoixDesMots>({});
  const courant = React.useRef(choix);
  const lire = React.useCallback(() => {
    api.settingGet(CLE_CHOIX_TAPUSCRIT).then((v) => { courant.current = lireChoix(v); setChoix(courant.current); }).catch(() => {});
  }, []);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_CHOIX_TAPUSCRIT, lire);
    return () => window.removeEventListener(EVT_CHOIX_TAPUSCRIT, lire);
  }, [lire]);
  const choisir = React.useCallback((cle: string, ref: RefPicto | 0 | undefined) => {
    courant.current = avecChoix(courant.current, cle, ref);
    setChoix(courant.current);
    api.settingSet(CLE_CHOIX_TAPUSCRIT, ecrireChoix(courant.current))
      .then(() => window.dispatchEvent(new Event(EVT_CHOIX_TAPUSCRIT)))
      .catch((e) => toast("Choix non enregistré : " + String(e), { icone: "⚠️" }));
  }, []);
  return { choix, choisir };
}

/** Un mot seul, à chercher tel quel dans la banque : une question, un mot-clé, une branche. */
export const motDuMot = (mot: string): MotDeConsigne => {
  const cle = mot.trim().toLowerCase();
  return { texte: mot.trim(), cle, demande: { verbes: [], noms: singuliers(cle) } };
};

/** Les mots des consignes, le picto de chacun, et leurs images. */
export function useTapuscrit(consignes: string[]) {
  const texte = consignes.join("\n");
  const mots = React.useMemo(() => lireConsignes(texte).map(motsDeLaConsigne), [texte]);
  return { mots, ...usePictosDesMots(mots.flat()) };
}

/**
 * Le picto de chacun de ces mots — le choix de l'enseignant, le lexique de
 * CAA, sinon la banque —, et leurs images, tenus à jour.
 */
export function usePictosDesMots(liste: MotDeConsigne[]) {
  const { lexique } = useLexique();
  const { choix, choisir } = useChoixTapuscrit();
  const cleListe = JSON.stringify(liste.map((m) => [m.cle, m.demande]));
  const { cles, demandes } = React.useMemo(() => demandesDe(liste), [cleListe]); // eslint-disable-line react-hooks/exhaustive-deps
  const [banque, setBanque] = React.useState<Record<string, RefPicto>>({});
  const [banqueAbsente, setBanqueAbsente] = React.useState(false);
  const cleDemandes = JSON.stringify(demandes);
  React.useEffect(() => {
    if (!demandes.length) { setBanque({}); return; }
    let vivant = true;
    // On attend que la frappe se pose : une demande par consigne écrite, pas par lettre.
    const t = window.setTimeout(() => {
      api.arasaacPourTapuscrit(demandes)
        .then((trouves) => {
          if (!vivant) return;
          const suite: Record<string, RefPicto> = {};
          cles.forEach((c, i) => { const p = trouves[i]; if (p) suite[c] = p.id; });
          setBanque(suite);
          setBanqueAbsente(false);
        })
        .catch(() => { if (vivant) { setBanque({}); setBanqueAbsente(true); } });
    }, 250);
    return () => { vivant = false; window.clearTimeout(t); };
  }, [cleDemandes]); // eslint-disable-line react-hooks/exhaustive-deps
  const pictoDe = React.useCallback((m: MotDeConsigne) => pictoDuMot(m, choix, lexique, banque), [choix, lexique, banque]);
  const refs = [...new Set(liste.map(pictoDe).filter((r): r is RefPicto => r != null))];
  const images = usePictoImages(refs) as Record<string, string>;
  return { pictoDe, images, banqueAbsente, choix, choisir };
}

/** Ce qu'on cherche d'abord pour un mot : l'infinitif d'un verbe, le singulier d'un nom. */
const rechercheDe = (m: MotDeConsigne) => { const s = singuliers(m.cle); return m.verbe ?? s[s.length - 1] ?? m.cle; };

/** Le tapuscrit d'une séance : ses consignes numérotées, chaque mot sous son picto. */
export function TapuscritVue({ consignes, modifiable = false, compact = false }: { consignes: string[]; modifiable?: boolean; compact?: boolean }) {
  const t = useTapuscrit(consignes);
  const [enChoix, setEnChoix] = React.useState<MotDeConsigne | null>(null);
  if (!t.mots.length) return null;
  return (
    <div className={compact ? "tapuscrit-ui compact" : "tapuscrit-ui"}>
      {modifiable && t.banqueAbsente && (
        <p className="meta" style={{ fontSize: 12, margin: 0 }}>
          La banque ARASAAC n'est pas sur cet ordinateur : l'onglet CAA la télécharge. Les pictos choisis à la main se montrent quand même.
        </p>
      )}
      {t.mots.map((mots, i) => (
        <div key={i} className="tp-ligne">
          <span className="tp-num">{i + 1}</span>
          <div className="tp-consigne">
            {mots.map((m, j) => {
              if (!m.cle) return <span key={j} className="tp-mot tp-petit"><span>{m.texte}</span></span>;
              const ref = t.pictoDe(m);
              const src = ref != null ? t.images[String(ref)] : "";
              if (!modifiable) {
                return <span key={j} className="tp-mot">{src && <img src={src} alt="" />}<span>{m.texte}</span></span>;
              }
              return (
                <button key={j} type="button" className="tp-mot" onClick={() => setEnChoix(m)}
                  title={src ? `Changer le picto de « ${m.texte} »` : `Donner un picto à « ${m.texte} »`}>
                  {src ? <img src={src} alt="" /> : <span className="tp-vide" aria-hidden>+</span>}
                  <span>{m.texte}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {modifiable && (
        <p className="meta" style={{ fontSize: 11.5, margin: 0 }}>
          Un picto se change d'un clic ; le choix vaut ensuite pour ce mot dans toutes les séances. Les petits mots restent écrits.
        </p>
      )}
      {enChoix && (
        <ChoixPictoConsigne verbe={enChoix.texte} actuel={t.pictoDe(enChoix)} recherche={rechercheDe(enChoix)}
          onClose={() => setEnChoix(null)}
          onValider={(ref) => { t.choisir(enChoix.cle, ref ?? 0); setEnChoix(null); }}
          onAutomatique={enChoix.cle in t.choix ? () => { t.choisir(enChoix.cle, undefined); setEnChoix(null); } : undefined} />
      )}
    </div>
  );
}

/**
 * Les consignes d'une séance : une par ligne, courtes, bornées — ce qui se dit
 * aux élèves, et rien d'autre. Entrée passe à la suivante. Leur traduction en
 * pictogrammes se voit dessous.
 */
export function ConsignesSeance({ valeur, onChange }: { valeur: string; onChange: (consignes: string) => void }) {
  const [lignes, setLignes] = React.useState<string[]>(() => {
    const lues = lireConsignes(valeur);
    return lues.length ? lues : [""];
  });
  const champs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [aFocaliser, setAFocaliser] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (aFocaliser == null) return;
    champs.current[aFocaliser]?.focus();
    setAFocaliser(null);
  }, [aFocaliser]);
  const maj = (suite: string[]) => { setLignes(suite); onChange(ecrireConsignes(suite)); };
  const ajouterApres = (i: number) => {
    if (lignes.length >= CONSIGNES_MAX) return;
    maj([...lignes.slice(0, i + 1), "", ...lignes.slice(i + 1)]);
    setAFocaliser(i + 1);
  };
  const retirer = (i: number) => {
    const suite = lignes.filter((_, j) => j !== i);
    maj(suite.length ? suite : [""]);
    setAFocaliser(Math.max(0, i - 1));
  };
  const ecrites = lignes.map((l) => l.trim()).filter(Boolean);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <p className="meta" style={{ fontSize: 12.5, margin: "0 0 2px", lineHeight: 1.5 }}>
        Ce que vous direz aux élèves, une consigne par ligne, courte. Elles seules se traduisent en pictogrammes :
        c'est le tapuscrit de la séance, qui peut s'imprimer dans le cahier journal.
      </p>
      {lignes.map((l, i) => (
        <div key={i} className="consigne-saisie">
          <span className="tp-num">{i + 1}</span>
          <input ref={(el) => { champs.current[i] = el; }} className="input" value={l} maxLength={CONSIGNE_MAX}
            placeholder={i === 0 ? "Découpe les étiquettes." : "Une autre consigne…"}
            aria-label={`Consigne ${i + 1}`}
            onChange={(e) => maj(lignes.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); ajouterApres(i); }
              else if (e.key === "Backspace" && !l && lignes.length > 1) { e.preventDefault(); retirer(i); }
            }} />
          {l.length > CONSIGNE_MAX - 30 && <span className="meta" style={{ fontSize: 11, flex: "none" }}>{l.length}/{CONSIGNE_MAX}</span>}
          <button type="button" className="btn ghost sm" aria-label={`Retirer la consigne ${i + 1}`} title="Retirer"
            onClick={() => retirer(i)} disabled={lignes.length === 1 && !l}>✕</button>
        </div>
      ))}
      <div>
        <button type="button" className="btn sm" disabled={lignes.length >= CONSIGNES_MAX} onClick={() => ajouterApres(lignes.length - 1)}
          title={lignes.length >= CONSIGNES_MAX ? `${CONSIGNES_MAX} consignes au plus : au-delà, c'est un déroulement` : undefined}>
          + Ajouter une consigne
        </button>
      </div>
      {ecrites.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text-2)", marginBottom: 6 }}>Traduction en pictogrammes</div>
          <TapuscritVue consignes={ecrites} modifiable />
        </div>
      )}
    </div>
  );
}

/**
 * Le tapuscrit prêt à imprimer : le HTML, et les pictos qu'il porte — pour la
 * mention de leur licence. Rien si la séance n'a pas de consignes.
 */
export async function tapuscritImprimable(consignes: string[]): Promise<{ html: string; refs: RefPicto[] }> {
  const mots = consignes.flatMap((c) => lireConsignes(c)).map(motsDeLaConsigne);
  if (!mots.length) return { html: "", refs: [] };
  const { pictoDe, images, refs } = await resoudrePictos(mots.flat());
  return { html: htmlDuTapuscrit(mots, pictoDe, images), refs };
}

/**
 * Le picto de chacun de ces mots, et leurs images chargées : pour imprimer,
 * hors de l'écran. Un picto dont l'image n'a pas pu se charger ne compte pas.
 */
export async function resoudrePictos(liste: MotDeConsigne[]): Promise<{
  pictoDe: (m: MotDeConsigne) => RefPicto | null; images: Record<string, string>; refs: RefPicto[];
}> {
  const [lexique, choix] = await Promise.all([
    api.settingGet(CLE_LEXIQUE).then(lireLexique).catch(() => ({})),
    api.settingGet(CLE_CHOIX_TAPUSCRIT).then(lireChoix).catch((): ChoixDesMots => ({})),
  ]);
  const { cles, demandes } = demandesDe(liste);
  const trouves = demandes.length ? await api.arasaacPourTapuscrit(demandes).catch(() => []) : [];
  const banque: Record<string, RefPicto> = {};
  cles.forEach((c, i) => { const p = trouves[i]; if (p) banque[c] = p.id; });
  const choisi = (m: MotDeConsigne) => pictoDuMot(m, choix, lexique, banque);
  const tous = [...new Set(liste.map(choisi).filter((r): r is RefPicto => r != null))];
  const images = await chargerImages(tous) as Record<string, string>;
  const pictoDe = (m: MotDeConsigne) => { const r = choisi(m); return r != null && images[String(r)] ? r : null; };
  return { pictoDe, images, refs: tous.filter((r) => images[String(r)]) };
}

/** Les créneaux dont le tapuscrit s'imprime dans le cahier journal, tenus à jour d'où ils changent. */
export function useTapuscritDuJournal(): { avec: Set<string>; poser: (creneauId: string, oui: boolean) => Promise<void> } {
  const [avec, setAvec] = React.useState<Set<string>>(new Set());
  const lire = React.useCallback(() => {
    api.settingsAll().then((r) => setAvec(creneauxAvecTapuscrit(r))).catch(() => {});
  }, []);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_TAPUSCRIT_JOURNAL, lire);
    return () => window.removeEventListener(EVT_TAPUSCRIT_JOURNAL, lire);
  }, [lire]);
  const poser = React.useCallback(async (creneauId: string, oui: boolean) => {
    setAvec((a) => { const suite = new Set(a); if (oui) suite.add(creneauId); else suite.delete(creneauId); return suite; });
    try {
      await api.settingSet(cleTapuscritDuCreneau(creneauId), oui ? "1" : "");
      window.dispatchEvent(new Event(EVT_TAPUSCRIT_JOURNAL));
    } catch (e) {
      toast("Choix non enregistré : " + String(e), { icone: "⚠️" });
      lire();
    }
  }, [lire]);
  return { avec, poser };
}
