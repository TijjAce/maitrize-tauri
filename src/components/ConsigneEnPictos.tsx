import React from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { toast } from "./Toaster";
import { usePictoImages } from "./ChoixPicto";
import { ChoixPictoConsigne } from "./ChoixPictoConsigne";
import {
  CLE_ACTIF, CLE_LEXIQUE, EVT_LEXIQUE, STYLE_CONSIGNES_PICTOS, VERBES_CONSIGNE, consignesActives, decorerConsignesHtml, ecrireLexique,
  lireLexique, verbesDuTexte, type Lexique,
} from "../caa";
import type { RefPicto } from "../pictosAppoint";

// Les pictos de la consigne, vus depuis l'atelier.
//
// Le lexique des verbes vit dans CAA ; ici on voit ce qu'il donne pour cette
// feuille — les verbes que sa consigne dit, avec leur picto —, on donne un
// picto à ceux qui n'en ont pas, et on en ajoute à la main quand la consigne
// ne dit pas le verbe qu'on veut montrer. Ce qui s'ajoute se garde avec
// l'atelier ; le picto d'un verbe, lui, se garde dans le lexique commun.

/** Le lexique, et sa mise à jour quand il change ailleurs. */
export function useLexique(): { lexique: Lexique; actif: boolean; enregistrer: (suite: Lexique) => void } {
  const [lexique, setLexique] = React.useState<Lexique>({});
  const [reglageActif, setReglageActif] = React.useState<string | null>(null);
  const lire = React.useCallback(() => {
    api.settingGet(CLE_LEXIQUE).then((v) => setLexique(lireLexique(v))).catch(() => {});
    api.settingGet(CLE_ACTIF).then(setReglageActif).catch(() => {});
  }, []);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_LEXIQUE, lire);
    return () => window.removeEventListener(EVT_LEXIQUE, lire);
  }, [lire]);
  const enregistrer = React.useCallback((suite: Lexique) => {
    setLexique(suite);
    api.settingSet(CLE_LEXIQUE, ecrireLexique(suite))
      .then(() => window.dispatchEvent(new Event(EVT_LEXIQUE)))
      .catch((e) => toast("Lexique non enregistré : " + String(e), { icone: "⚠️" }));
  }, []);
  return { lexique, actif: consignesActives(reglageActif, lexique), enregistrer };
}

/** L'aperçu d'une feuille avec ses consignes en pictos, comme à l'impression. */
export function useConsignesEnPictos(html: string, pictos: string[] = []): { html: string; style: string } {
  const { lexique, actif } = useLexique();
  const images = usePictoImages([...new Set(Object.values(lexique))]);
  return React.useMemo(() => {
    if (!actif) return { html, style: "" };
    const decore = decorerConsignesHtml(html, lexique, images, pictos);
    return { html: decore, style: decore === html ? "" : STYLE_CONSIGNES_PICTOS };
  }, [html, pictos, lexique, images, actif]);
}

export function ConsigneEnPictos({ consignes, pictos, onChange, compact = false }: {
  /** Les consignes de la feuille, telles qu'elles s'impriment. */
  consignes: string[];
  /** Les verbes ajoutés à la main pour cette feuille. */
  pictos: string[];
  onChange: (pictos: string[]) => void;
  /** Sans titre ni cadre : quand le bandeau de l'atelier les donne déjà. */
  compact?: boolean;
}) {
  const navigate = useNavigate();
  const { lexique, actif, enregistrer } = useLexique();
  const [choix, setChoix] = React.useState("");
  const trouves = React.useMemo(() => {
    const tous: string[] = [];
    for (const c of consignes) for (const v of verbesDuTexte(c)) if (!tous.includes(v)) tous.push(v);
    return tous;
  }, [consignes]);
  const montres = [...pictos, ...trouves.filter((v) => !pictos.includes(v))];
  const images = usePictoImages([...new Set(montres.map((v) => lexique[v]).filter((id): id is RefPicto => !!id))]);
  const restants = VERBES_CONSIGNE.map((v) => v.verbe).filter((v) => !montres.includes(v));
  const ajouter = (verbe: string) => {
    if (!verbe || montres.includes(verbe)) return;
    onChange([...pictos, verbe]);
    if (!lexique[verbe]) setChoix(verbe);
  };
  const nb = Object.keys(lexique).length;

  return (
    <div className={compact ? "consigne-pictos-ui compact" : "consigne-pictos-ui"}>
      <div className="consigne-pictos-titre" style={compact ? { justifyContent: "flex-end" } : undefined}>
        {!compact && <span>🔤 Pictos de la consigne</span>}
        <button type="button" className="btn ghost sm" onClick={() => navigate("/caa")} title="Le lexique des verbes, dans l'onglet CAA">CAA →</button>
      </div>
      {!nb ? (
        <p className="meta" style={{ fontSize: 12.5, margin: "4px 0" }}>
          Aucun verbe n'a encore de picto. Ajoutez-en un ici, ou donnez-leur tous un picto dans l'onglet CAA.
        </p>
      ) : !actif ? (
        <p className="meta" style={{ fontSize: 12.5, margin: "4px 0" }}>Les pictos des consignes sont coupés dans l'onglet CAA.</p>
      ) : null}
      <div className="consigne-pictos-chips">
        {montres.map((v) => {
          const id = lexique[v];
          const src = id ? images[id] : "";
          const ajoute = pictos.includes(v);
          return (
            <span key={v} className={`consigne-chip${id ? "" : " sans"}`} title={ajoute ? "Ajouté à la main" : "Reconnu dans la consigne"}>
              {src ? <img src={src} alt="" /> : <button type="button" className="consigne-chip-choisir" onClick={() => setChoix(v)}
                title="Choisir le picto de ce verbe">＋</button>}
              <span>{v}</span>
              {ajoute && <button type="button" className="consigne-chip-retirer" aria-label={`Retirer ${v}`} onClick={() => onChange(pictos.filter((x) => x !== v))}>✕</button>}
            </span>
          );
        })}
        <select className="select consigne-pictos-ajout" value="" aria-label="Ajouter un picto de verbe" onChange={(e) => ajouter(e.target.value)}>
          <option value="">＋ Ajouter un picto…</option>
          {restants.map((v) => <option key={v} value={v}>{v}{lexique[v] ? "" : " (sans picto encore)"}</option>)}
        </select>
      </div>
      {choix && (
        <ChoixPictoConsigne verbe={choix} actuel={lexique[choix] ?? null} onClose={() => setChoix("")}
          onValider={(ref) => {
            const suite = { ...lexique };
            if (ref == null) delete suite[choix]; else suite[choix] = ref;
            enregistrer(suite);
            setChoix("");
          }} />
      )}
    </div>
  );
}
