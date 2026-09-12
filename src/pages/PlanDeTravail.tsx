import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, MaterielItem, couleurHex, couleurPourMatiere, newId, nowIso } from "../api";
import { Input, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { FormMateriel } from "../components/FormMateriel";
import { lireVideos, lireLien, vignetteYoutube } from "../videos";
import { useFileDropZone, estPdf, estImage, nomDeChemin } from "../dragdrop";
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

/** Un matériel neuf, rangé où il faut. Partagé par la création et les dépôts. */
const materielVierge = (dossier: string): MaterielItem => ({
  id: newId(), titre: "Nouveau matériel", descriptionMateriel: "", competenceId: "",
  competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
  imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null,
  sequenceId: null, dossier, videosJson: "[]", coffreJson: "[]",
});

const liste = (json: string): string[] => { try { return JSON.parse(json || "[]"); } catch { return []; } };

const nb = (json: string): number => { try { return JSON.parse(json || "[]").length; } catch { return 0; } };

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
  const [survolLien, setSurvolLien] = React.useState(false);
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

  /**
   * Dépose un lien sur le bureau : il devient un matériel dans le dossier
   * ouvert. C'est le geste qu'on attend d'un bureau — attraper une vidéo
   * depuis le navigateur et la laisser tomber au bon endroit.
   */
  const deposerLien = async (texte: string) => {
    const v = lireLien(texte);
    if (!v) return false;
    await api.materielSave({
      ...materielVierge(dossier),
      titre: v.youtubeId ? "Vidéo YouTube" : new URL(v.url).hostname.replace(/^www\./, ""),
      videosJson: JSON.stringify([v]),
    });
    recharger();
    toast(dossier ? `Vidéo ajoutée dans ${dossier}` : "Vidéo ajoutée", { icone: "▶️" });
    return true;
  };

  /** Dépose des fichiers : un matériel par fichier, dans le dossier ouvert. */
  const deposerFichiers = async (chemins: string[]) => {
    let n = 0;
    for (const c of chemins) {
      const nom = await api.fichierImporterDepuisChemin(c);
      const image = estImage(c);
      await api.materielSave({
        ...materielVierge(dossier),
        titre: nomDeChemin(c).replace(/\.[^.]+$/, ""),
        imagesJson: image ? JSON.stringify([nom]) : "[]",
        pdfsJson: image ? "[]" : JSON.stringify([nom]),
      });
      n++;
    }
    if (n) { recharger(); toast(`${n} fichier(s) ajouté(s)`, { icone: "📥" }); }
  };

  const { ref: zoneFichiers, actif: survolFichiers } = useFileDropZone({
    accept: (c) => estPdf(c) || estImage(c),
    onFiles: deposerFichiers,
  });

  const creerMateriel = async () => {
    const m = materielVierge(dossier);
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

        {/* ── Volet droit : le contenu, et la zone de dépôt ── */}
        <div ref={zoneFichiers}
          onDragOver={(e) => {
            // Seuls les liens venus de l'extérieur : un élément glissé depuis
            // le bureau lui-même porte notre propre format et se range ailleurs.
            if (e.dataTransfer.types.includes("application/json")) return;
            e.preventDefault(); setSurvolLien(true);
          }}
          onDragLeave={() => setSurvolLien(false)}
          onDrop={async (e) => {
            if (e.dataTransfer.types.includes("application/json")) return;
            e.preventDefault(); setSurvolLien(false);
            const texte = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
            if (texte && !(await deposerLien(texte))) {
              toast("Ce n'est pas une adresse web.", { icone: "⚠️" });
            }
          }}
          onContextMenu={(e) => {
            // Le clic droit sur le vide, réflexe de bureau : créer là où on
            // regarde plutôt que de remonter à la barre d'outils. Sur une
            // tuile, c'est son propre menu qui doit s'ouvrir.
            if ((e.target as HTMLElement).closest("[draggable]")) return;
            openCtx(e, [
              { label: "Nouvelle séquence", icon: "📚", onClick: creerSequence },
              { label: "Nouveau matériel", icon: "🧰", onClick: creerMateriel },
              { label: "Nouveau dossier ici…", icon: "📁", sep: true, onClick: () => {
                const nom = prompt("Nom du dossier :");
                if (!nom?.trim()) return;
                // Un dossier n'existe qu'habité : on le crée avec un matériel
                // plutôt que de laisser une entrée fantôme dans l'arbre.
                const chemin = normaliser(dossier ? `${dossier}/${nom}` : nom);
                api.materielSave({ ...materielVierge(chemin), titre: "Nouveau matériel" })
                  .then(() => { recharger(); setDossier(chemin); });
              } },
            ]);
          }}
          style={{
            outline: (survolLien || survolFichiers) ? "2px dashed var(--accent)" : "none",
            outlineOffset: 6, borderRadius: 10, minHeight: 240,
          }}>
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
              sous={filtre ? undefined
                : "Déposez ici un PDF, une image ou un lien YouTube — ou créez une séquence."} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
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

/**
 * Une tuile du bureau : séquence ou matériel, déplaçable.
 *
 * L'aperçu passe avant le texte — sur un bureau, on reconnaît une fiche à son
 * allure avant de lire son nom. À défaut d'image, une grande icône colorée par
 * la matière remplit le même rôle.
 */
function Vignette({ element, onOuvrir, onRanger, onSupprimer, onDuplique }: {
  element: Element; onOuvrir: () => void;
  onRanger: (chemin: string) => void; onSupprimer: () => void; onDuplique: () => void;
}) {
  const seq = element.genre === "sequence" ? element.seq : null;
  const t = seq ? (couleurHex[couleurPourMatiere(seq.matiere)] ?? couleurHex.gray) : couleurHex.gray;
  const videos = element.genre === "materiel" ? lireVideos(element.mat.videosJson) : [];
  const apercuVideo = videos.find((v) => v.youtubeId);
  const image = element.genre === "materiel" ? liste(element.mat.imagesJson)[0] : seq?.imageNom;

  return (
    <div draggable
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
      title={element.titre}
      style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 5,
        padding: 6, borderRadius: 10, textAlign: "center" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 8,
        overflow: "hidden", background: t + "22", border: `1px solid ${t}55`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {apercuVideo ? (
          <img src={vignetteYoutube(apercuVideo.youtubeId!)} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : image ? (
          <ApercuFichier nom={image} />
        ) : (
          <span style={{ fontSize: 34 }}>{element.genre === "sequence" ? "📚" : "🧰"}</span>
        )}
        {element.genre === "materiel" && (
          <div style={{ position: "absolute", bottom: 3, right: 3, display: "flex", gap: 3 }}>
            {nb(element.mat.pdfsJson) > 0 && <Pastille>📄 {nb(element.mat.pdfsJson)}</Pastille>}
            {nb(element.mat.coffreJson) > 0 && <Pastille>🔐</Pastille>}
            {videos.length > 0 && <Pastille>▶️</Pastille>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {element.titre}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-2)", overflow: "hidden",
        textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {element.genre === "sequence"
          ? [seq!.matiere, seq!.cycle].filter(Boolean).join(" · ") || "Séquence"
          : element.mat.sousDomaineTitre || "Matériel"}
      </div>
    </div>
  );
}

const Pastille = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontSize: 9.5, background: "rgba(0,0,0,.55)", color: "#fff",
    borderRadius: 4, padding: "1px 4px" }}>{children}</span>
);

/** Aperçu d'une image déjà rangée dans les fichiers de l'application. */
function ApercuFichier({ nom }: { nom: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.fichierRead(nom).then((b) => { if (vivant) setSrc(`data:image;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [nom]);
  return src
    ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : <span style={{ fontSize: 30 }}>🖼</span>;
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
