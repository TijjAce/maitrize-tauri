import React from "react";
import { api } from "../api";
import { Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { nomDeLAtelier } from "../catalogueAteliers";
import {
  CLE_INVENTAIRE, EVT_INVENTAIRE, FAMILLES_MATERIEL, MATERIEL_REEL, ecrireInventaire, lireInventaire, materielDeLAtelier,
  type Inventaire, type MaterielReel,
} from "../materielDeClasse";

// ── Le matériel de la classe ───────────────────────────────────────────────
//
// Le catalogue du matériel réel que les programmes nomment, où l'on coche ce
// que la classe possède et où c'est rangé ; la note « le vrai matériel » des
// ateliers de Fabriquer et des séquences, qui le rappelle au moment voulu.

/** L'inventaire de la classe, relu quand il change d'où que ce soit. */
export function useInventaire(): [Inventaire, (inv: Inventaire) => void] {
  const [inv, setInv] = React.useState<Inventaire>({});
  React.useEffect(() => {
    let vivant = true;
    const relire = () => { api.settingGet(CLE_INVENTAIRE).then((v) => { if (vivant) setInv(lireInventaire(v)); }).catch(() => {}); };
    relire();
    window.addEventListener(EVT_INVENTAIRE, relire);
    return () => { vivant = false; window.removeEventListener(EVT_INVENTAIRE, relire); };
  }, []);
  const changer = React.useCallback((suite: Inventaire) => {
    setInv(suite);
    api.settingSet(CLE_INVENTAIRE, ecrireInventaire(suite))
      .then(() => window.dispatchEvent(new Event(EVT_INVENTAIRE)))
      .catch((e) => toast("Inventaire non enregistré : " + String(e), { icone: "⚠️" }));
  }, []);
  return [inv, changer];
}

/** « Le papier ne le remplace pas », avec la raison au survol. */
const Irremplacable = ({ m }: { m: MaterielReel }) => (m.irremplacable
  ? <span className="materiel-reel-badge" title={m.irremplacable}>le papier ne le remplace pas</span>
  : null);

/** Une ligne du matériel, telle qu'une séquence ou un atelier la montre. */
function LigneMateriel({ m, inv }: { m: MaterielReel; inv: Inventaire }) {
  const la = inv[m.id];
  return (
    <li className="materiel-reel-ligne">
      <span className={la?.a ? "materiel-reel-etat oui" : "materiel-reel-etat"}>{la?.a ? "✓" : "○"}</span>
      <span>
        <b>{m.nom}</b> <Irremplacable m={m} />
        <span className="meta" style={{ display: "block", fontSize: 12 }}>
          {la?.a ? (la.lieu ? `Dans la classe — ${la.lieu}.` : "Dans la classe.") : "À se procurer."} {m.usage}
          {m.irremplacable && <> <i>{m.irremplacable}</i></>}
        </span>
      </span>
    </li>
  );
}

/** Le matériel réel d'une liste, avec ce que la classe en a, et de quoi tenir l'inventaire. */
export function MaterielReelListe({ materiel, titre }: { materiel: MaterielReel[]; titre: string }) {
  const [inv] = useInventaire();
  const [ouvert, setOuvert] = React.useState(false);
  if (!materiel.length) return null;
  return (
    <div className="materiel-reel">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span className="meta" style={{ fontSize: 12.5 }}>{titre}</span>
        <button type="button" className="lien" onClick={() => setOuvert(true)}>Le matériel de ma classe…</button>
      </div>
      <ul>{materiel.map((m) => <LigneMateriel key={m.id} m={m} inv={inv} />)}</ul>
      {ouvert && <MaterielDeLaClasse onClose={() => setOuvert(false)} />}
    </div>
  );
}

/**
 * Le vrai matériel d'un atelier de Fabriquer : ce que la feuille aide à
 * travailler, et ce qu'elle ne remplace pas. Rien pour un atelier sans
 * matériel réel attaché.
 */
export function MaterielDeLAtelier({ atelier }: { atelier: string }) {
  const materiel = React.useMemo(() => materielDeLAtelier(atelier), [atelier]);
  const [inv] = useInventaire();
  const [ouvert, setOuvert] = React.useState(false);
  if (!materiel.length) return null;
  const irremplacables = materiel.filter((m) => m.irremplacable).length;
  return (
    <details className="comp-atelier materiel-reel-atelier">
      <summary>
        🧰 Le vrai matériel
        <span className="meta">
          {materiel.length} objet{materiel.length > 1 ? "s" : ""} de la classe
          {irremplacables ? ` · ${irremplacables} que le papier ne remplace pas` : ""}
        </span>
      </summary>
      <div className="materiel-reel">
        <p className="meta" style={{ fontSize: 12.5, margin: "0 0 6px" }}>
          Les feuilles s'utilisent après la manipulation, pas à sa place.
          <button type="button" className="lien" style={{ marginLeft: 8 }} onClick={() => setOuvert(true)}>Le matériel de ma classe…</button>
        </p>
        <ul>{materiel.map((m) => <LigneMateriel key={m.id} m={m} inv={inv} />)}</ul>
      </div>
      {ouvert && <MaterielDeLaClasse onClose={() => setOuvert(false)} />}
    </details>
  );
}

/** L'inventaire : tout le catalogue, par famille, à cocher, avec où c'est rangé. */
export function MaterielDeLaClasse({ onClose }: { onClose: () => void }) {
  const [inv, changer] = useInventaire();
  const maj = (id: string, patch: Partial<{ a: boolean; lieu: string }>) =>
    changer({ ...inv, [id]: { a: inv[id]?.a ?? false, lieu: inv[id]?.lieu ?? "", ...patch } });
  const possede = MATERIEL_REEL.filter((m) => inv[m.id]?.a).length;
  return (
    <Modal titre="🧰 Le matériel de la classe" onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      <p className="meta" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 0 }}>
        Le matériel réel que les programmes nomment. Cochez ce que votre classe possède, et dites où il est rangé :
        les séances le rappellent — à sortir, ou à se procurer. {possede} sur {MATERIEL_REEL.length} dans la classe.
      </p>
      {FAMILLES_MATERIEL.map((f) => {
        const liste = MATERIEL_REEL.filter((m) => m.famille === f.id);
        if (!liste.length) return null;
        return (
          <section key={f.id} className="materiel-reel-famille">
            <h4>{f.libelle}</h4>
            {liste.map((m) => (
              <div key={m.id} className="materiel-reel-fiche">
                <label className="pb-coche">
                  <input type="checkbox" checked={inv[m.id]?.a ?? false} onChange={(e) => maj(m.id, { a: e.target.checked })} />
                  <span><b>{m.nom}</b></span>
                </label>
                <Irremplacable m={m} />
                <div className="meta" style={{ fontSize: 12, lineHeight: 1.45, margin: "2px 0 0 26px" }}>
                  {m.usage}{m.irremplacable ? ` ${m.irremplacable}` : ""}
                  {m.imprime && <> Fabriquer en imprime {m.imprime.quoi} (atelier « {nomDeLAtelier(m.imprime.atelier)} »).</>}
                  <span style={{ display: "block", opacity: .8 }}>📖 {m.source}</span>
                </div>
                {inv[m.id]?.a && (
                  <Input value={inv[m.id]?.lieu ?? ""} placeholder="Rangé où ? (ex. : armoire du fond, salle de sciences)"
                    onChange={(e) => maj(m.id, { lieu: e.target.value })} style={{ margin: "4px 0 0 26px", width: "calc(100% - 26px)" }}
                    aria-label={`Où est rangé : ${m.nom}`} />
                )}
              </div>
            ))}
          </section>
        );
      })}
    </Modal>
  );
}
