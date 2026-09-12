import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, MaterielItem, couleurHex, couleurPourMatiere, newId, nowIso } from "../api";
import { Input, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { FormMateriel } from "./Materiel";
import {
  arbre, aplatir, normaliser, parent, estDans, renommerChemin,
} from "../dossiers";

// ── Plan de travail ────────────────────────────────────────────────────────
//
// Un bureau plutôt que deux listes. Les séquences et le matériel se rangeaient
// dans deux onglets séparés, chacun avec son classement propre : impossible de
// réunir une séquence et ses fiches au même endroit, alors que c'est ainsi
// qu'on les prépare et qu'on les retrouve.
//
// À gauche l'arborescence, à droite le contenu du dossier choisi. Les dossiers
// ne sont pas une table : ce sont des chemins écrits sur chaque élément, si
// bien qu'un dossier existe tant que quelque chose s'y trouve. On ne gère donc
// ni création à vide, ni suppression, ni orphelins.

/** Duplique une séquence avec toutes ses séances. */
async function dupliquerSequence(seq: Sequence) {
  const copie: Sequence = { ...seq, id: crypto.randomUUID(), titre: seq.titre + " (copie)", dateCreation: new Date().toISOString() };
  await api.sequenceSave(copie);
  const seances = await api.seancesList(seq.id);
  for (const s of seances) await api.seanceSave({ ...s, id: crypto.randomUUID(), sequenceId: copie.id });
}

type Element =
  | { genre: "sequence"; id: string; titre: string; dossier: string; seq: Sequence }
  | { genre: "materiel"; id: string; titre: string; dossier: string; mat: MaterielItem };

export default function PlanDeTravail() {
  const nav = useNavigate();
  const { data: sequences, reload: rS } = useAsync(() => api.sequencesList(), []);
  const { data: materiels, reload: rM } = useAsync(() => api.materielList(), []);
  const recharger = () => { rS(); rM(); };

  const [dossier, setDossier] = React.useState("");
  const [ouverts, setOuverts] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [renomme, setRenomme] = React.useState<string | null>(null);
  const [nomEnCours, setNomEnCours] = React.useState("");
  const [survol, setSurvol] = React.useState<string | null>(null);
  const [aSupprimer, setASupprimer] = React.useState<Element | null>(null);
  // Le matériel s'édite sur place : il n'y a plus d'écran où l'envoyer.
  const [materielOuvert, setMaterielOuvert] = React.useState<MaterielItem | null>(null);

  const elements: Element[] = React.useMemo(() => [
    ...(sequences ?? []).map((s): Element => ({ genre: "sequence", id: s.id, titre: s.titre || "Sans titre", dossier: s.dossier, seq: s })),
    ...(materiels ?? []).map((m): Element => ({ genre: "materiel", id: m.id, titre: m.titre || "Sans titre", dossier: m.dossier, mat: m })),
  ], [sequences, materiels]);

  // La palette ⌘K et le tableau de bord demandent une séquence neuve en
  // naviguant ici puis en émettant cet événement : sans écoute, le bouton
  // amènerait sur la page sans rien faire.
  const creerRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const h = () => creerRef.current();
    window.addEventListener("maitrize:nouvelle-sequence", h);
    return () => window.removeEventListener("maitrize:nouvelle-sequence", h);
  }, []);

  const racines = React.useMemo(() => arbre(elements), [elements]);
  const lignes = React.useMemo(() => aplatir(racines, ouverts), [racines, ouverts]);

  // Le dossier courant montre ce qu'il contient directement ; une recherche
  // cherche partout, sans quoi il faudrait deviner où se trouve ce qu'on veut.
  const filtre = q.trim().toLowerCase();
  const visibles = elements
    .filter((e) => (filtre ? e.titre.toLowerCase().includes(filtre) : normaliser(e.dossier) === dossier))
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  const deplacer = async (e: Element, vers: string) => {
    const cible = normaliser(vers);
    if (normaliser(e.dossier) === cible) return;
    if (e.genre === "sequence") await api.sequenceSave({ ...e.seq, dossier: cible });
    else await api.materielSave({ ...e.mat, dossier: cible });
    recharger();
    toast(cible ? `Déplacé dans ${cible}` : "Sorti des dossiers", { icone: "📂" });
  };

  /** Renomme un dossier : tous les éléments qui en dépendent suivent. */
  const appliquerRenommage = async (ancien: string, nouveau: string) => {
    const propre = normaliser(nouveau);
    setRenomme(null);
    if (!propre || propre === ancien) return;
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), ancien));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), ancien, propre);
      if (e.genre === "sequence") await api.sequenceSave({ ...e.seq, dossier: chemin });
      else await api.materielSave({ ...e.mat, dossier: chemin });
    }
    if (estDans(dossier, ancien)) setDossier(renommerChemin(dossier, ancien, propre));
    recharger();
    toast(`${touches.length} élément(s) déplacé(s) dans ${propre}`, { icone: "✏️" });
  };

  const creerSequence = async () => {
    const s: Sequence = {
      id: newId(), titre: "Nouvelle séquence", matiere: "", cycle: "", objectifs: "",
      competences: "[]", competenceVisee: "", imageNom: null, couleur: "indigo",
      dateCreation: nowIso(), periode: 1, annee: "", ratingEngagement: 0, ratingFacilite: 0,
      ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "", dossier,
    };
    await api.sequenceSave(s);
    recharger();
    nav(`/sequences/${s.id}`);
  };
  creerRef.current = creerSequence;

  const creerMateriel = async () => {
    const m: MaterielItem = {
      id: newId(), titre: "Nouveau matériel", descriptionMateriel: "", competenceId: "",
      competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
      imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null,
      sequenceId: null, dossier, videosJson: "[]", coffreJson: "[]",
    };
    await api.materielSave(m);
    recharger();
    // Ouvrir dans la foulée : créer une fiche vide qu'il faut ensuite
    // retrouver pour la remplir n'aide personne.
    setMaterielOuvert(m);
  };

  const supprimer = async (e: Element) => {
    if (e.genre === "sequence") await api.sequenceDelete(e.id);
    else await api.materielDelete(e.id);
    setASupprimer(null);
    recharger();
  };

  return (
    <Page titre="Plan de travail" sous="Séquences et matériel, rangés ensemble"
      actions={<>
        <button className="btn" onClick={creerMateriel}>+ Matériel</button>
        <button className="btn primary" onClick={creerSequence}>+ Séquence</button>
      </>}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr", gap: 14, alignItems: "start" }}>

        {/* ── Volet gauche : l'arborescence ── */}
        <div className="card" style={{ padding: 8 }}>
          <Dossier chemin="" nom="Tout" total={elements.length} profondeur={0}
            actif={dossier === "" && !filtre} survole={survol === ""}
            onChoisir={() => setDossier("")}
            onSurvol={setSurvol} onDepose={deplacer} />
          {lignes.map((n) => (
            <Dossier key={n.chemin} chemin={n.chemin} nom={n.nom} total={n.total}
              profondeur={n.profondeur} actif={dossier === n.chemin && !filtre}
              survole={survol === n.chemin} pliable={n.enfants.length > 0}
              ouvert={ouverts.has(n.chemin)}
              onPlier={() => setOuverts((s) => {
                const x = new Set(s);
                if (x.has(n.chemin)) x.delete(n.chemin); else x.add(n.chemin);
                return x;
              })}
              onChoisir={() => { setDossier(n.chemin); setQ(""); }}
              onRenommer={() => { setRenomme(n.chemin); setNomEnCours(n.nom); }}
              onSurvol={setSurvol} onDepose={deplacer} />
          ))}
          {!lignes.length && (
            <p style={{ fontSize: 12, color: "var(--text-2)", padding: "8px 6px", margin: 0 }}>
              Aucun dossier. Glissez un élément sur « Tout » et donnez-lui un
              chemin depuis son menu, ou tapez un chemin à la création.
            </p>
          )}
        </div>

        {/* ── Volet droit : le contenu ── */}
        <div>
          <div className="toolbar">
            <Input className="search" placeholder="Rechercher partout…" value={q}
              onChange={(e) => setQ(e.target.value)} />
            <div className="spacer" />
            <span style={{ fontSize: 13, color: "var(--text-2)" }}>
              {filtre ? `${visibles.length} résultat(s)` : dossier || "Tout"}
            </span>
          </div>

          {!visibles.length ? (
            <Empty icone="🗂" titre={filtre ? "Rien trouvé" : "Dossier vide"}
              sous={filtre ? undefined : "Créez une séquence ou du matériel, ou glissez-en un ici."} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
              {visibles.map((e) => (
                <Vignette key={e.genre + e.id} element={e}
                  onOuvrir={() => e.genre === "sequence"
                    ? nav(`/sequences/${e.id}`)
                    : setMaterielOuvert(e.mat)}
                  onRanger={(chemin) => deplacer(e, chemin)}
                  onSupprimer={() => setASupprimer(e)}
                  onDuplique={recharger} />
              ))}
            </div>
          )}
        </div>
      </div>

      {renomme !== null && (
        <RenommerDossier chemin={renomme} valeur={nomEnCours} onChange={setNomEnCours}
          onClose={() => setRenomme(null)}
          onValider={() => appliquerRenommage(renomme, parent(renomme)
            ? `${parent(renomme)}/${nomEnCours}` : nomEnCours)} />
      )}

      {materielOuvert && (
        <FormMateriel m={materielOuvert} onClose={() => setMaterielOuvert(null)}
          onSaved={() => { setMaterielOuvert(null); recharger(); }} />
      )}

      {aSupprimer && (
        <Confirm message={`Supprimer « ${aSupprimer.titre} » ?`}
          onYes={() => supprimer(aSupprimer)} onClose={() => setASupprimer(null)} />
      )}
    </Page>
  );
}

/** Une ligne de l'arborescence, qui accepte qu'on lui dépose un élément. */
function Dossier({ chemin, nom, total, profondeur, actif, survole, pliable, ouvert,
                   onChoisir, onPlier, onRenommer, onSurvol, onDepose }: {
  chemin: string; nom: string; total: number; profondeur: number;
  actif: boolean; survole: boolean; pliable?: boolean; ouvert?: boolean;
  onChoisir: () => void; onPlier?: () => void; onRenommer?: () => void;
  onSurvol: (c: string | null) => void; onDepose: (e: Element, vers: string) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onSurvol(chemin); }}
      onDragLeave={() => onSurvol(null)}
      onDrop={(e) => {
        e.preventDefault(); onSurvol(null);
        try { onDepose(JSON.parse(e.dataTransfer.getData("application/json")), chemin); } catch { /* dépôt étranger */ }
      }}
      onClick={onChoisir}
      onContextMenu={(ev) => onRenommer && openCtx(ev, [{ label: "Renommer", icon: "✏️", onClick: onRenommer }])}
      style={{
        display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
        padding: "5px 6px", paddingLeft: 6 + profondeur * 14, borderRadius: 6, fontSize: 13,
        background: survole ? "var(--accent)" : actif ? "var(--panel-2)" : undefined,
        color: survole ? "#fff" : undefined,
      }}>
      {pliable ? (
        <span onClick={(e) => { e.stopPropagation(); onPlier?.(); }}
          style={{ width: 12, textAlign: "center", color: "var(--text-2)" }}>{ouvert ? "▾" : "▸"}</span>
      ) : <span style={{ width: 12 }} />}
      <span>{chemin === "" ? "🗂" : ouvert ? "📂" : "📁"}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nom}</span>
      <span style={{ fontSize: 11, color: survole ? "#fff" : "var(--text-2)" }}>{total}</span>
    </div>
  );
}

/** Un élément du bureau : séquence ou matériel, déplaçable. */
function Vignette({ element, onOuvrir, onRanger, onSupprimer, onDuplique }: {
  element: Element; onOuvrir: () => void;
  onRanger: (chemin: string) => void; onSupprimer: () => void; onDuplique: () => void;
}) {
  const seq = element.genre === "sequence" ? element.seq : null;
  const t = seq ? (couleurHex[couleurPourMatiere(seq.matiere)] ?? couleurHex.gray) : couleurHex.gray;
  return (
    <div className="card" draggable
      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify(element))}
      onDoubleClick={onOuvrir}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "↗", onClick: onOuvrir },
        ...(element.genre === "sequence" ? [{ label: "Dupliquer", icon: "📑",
          onClick: () => dupliquerSequence(element.seq).then(onDuplique) }] : []),
        { label: "Ranger dans…", icon: "📂", onClick: () => {
          const c = prompt("Chemin du dossier (ex. Français/Lecture) :", element.dossier);
          if (c !== null) onRanger(c);
        } },
        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
      ])}
      style={{ cursor: "pointer", padding: 10, borderLeft: `3px solid ${t}` }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 18 }}>{element.genre === "sequence" ? "📚" : "🧰"}</span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{element.titre}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 4 }}>
        {element.genre === "sequence"
          ? [seq!.matiere, seq!.cycle].filter(Boolean).join(" · ") || "Séquence"
          : element.mat.sousDomaineTitre || "Matériel"}
      </div>
    </div>
  );
}

function RenommerDossier({ chemin, valeur, onChange, onClose, onValider }: {
  chemin: string; valeur: string; onChange: (v: string) => void;
  onClose: () => void; onValider: () => void;
}) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-head"><h2>Renommer le dossier</h2></div>
        <div className="modal-body">
          <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 0 }}>
            Tout ce qui est rangé dans « {chemin} », sous-dossiers compris, suivra.
          </p>
          <Input autoFocus value={valeur} onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onValider()} />
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={onValider}>Renommer</button>
        </div>
      </div>
    </div>
  );
}
