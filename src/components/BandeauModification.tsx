import { modificationEnCours, useModification } from "../modifierFeuille";
import { useNavigate } from "react-router-dom";
import { cheminDeLaSeance, feuillePourLaSeance, usePourLaSeance } from "../feuillePourLaSeance";
import { nomDeLAtelier } from "../catalogueAteliers";

/**
 * La feuille qu'on refait (voir `modifierFeuille`) : dans son atelier, ce
 * qu'on refait et comment ; ailleurs dans Fabriquer, de quoi y revenir.
 * « Abandonner » laisse la feuille telle qu'elle est.
 */
export function BandeauModification({ atelier, onReprendre }: { atelier: string; onReprendre: (atelier: string) => void }) {
  const m = useModification();
  if (!m) return null;
  const ici = m.atelier === atelier;
  return (
    <div className="bandeau-modif" role="status">
      <span className="bandeau-modif-ico" aria-hidden="true">✏️</span>
      <div className="bandeau-modif-texte">
        <b>Vous refaites « {m.titre} »</b>, {m.ou}.{" "}
        {!ici ? `Elle se refait dans l'atelier « ${nomDeLAtelier(m.atelier)} ».`
          : m.refaite ? "L'atelier est réglé comme elle : changez ce qu'il faut, puis « ✏️ Remplacer la feuille » — la nouvelle prend sa place, sous le même nom."
            : "Elle ne se refait pas à l'identique ici : l'atelier garde vos derniers réglages. La feuille que vous enregistrerez prendra sa place, sous le même nom."}
      </div>
      {!ici && <button className="btn sm" onClick={() => onReprendre(m.atelier)}>Y retourner</button>}
      <button className="btn ghost sm" onClick={() => modificationEnCours.finir()} title="Laisser la feuille telle qu'elle est">Abandonner</button>
    </div>
  );
}

/**
 * Fabriquer pour une séance (voir `feuillePourLaSeance`) : les feuilles
 * enregistrées y vont. « Terminé » rend aux générateurs leur bureau.
 */
export function BandeauPourLaSeance() {
  const p = usePourLaSeance();
  const navigate = useNavigate();
  if (!p) return null;
  return (
    <div className="bandeau-modif" role="status">
      <span className="bandeau-modif-ico" aria-hidden="true">📚</span>
      <div className="bandeau-modif-texte">
        <b>Pour la séance « {p.titre} »</b> : les feuilles enregistrées y vont.
      </div>
      <button className="btn sm" onClick={() => navigate(cheminDeLaSeance(p))}>Revenir à la séance</button>
      <button className="btn ghost sm" onClick={() => feuillePourLaSeance.finir()} title="Les feuilles iront de nouveau sur le bureau">Terminé</button>
    </div>
  );
}
