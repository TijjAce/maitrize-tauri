import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, MaterielItem, couleurHex, couleurPourMatiere, newId, nowIso } from "../api";
import { Input, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { FormMateriel } from "../components/FormMateriel";
import { lireVideos, lireLien, vignetteYoutube } from "../videos";
import { useFileDropZone, estPdf, estImage, fichierEnBase64 } from "../dragdrop";
import {
  sousDossiers, filDAriane, normaliser, parent, estDans, renommerChemin, SousDossier,
} from "../dossiers";

// ── Le bureau ──────────────────────────────────────────────────────────────
//
// Une seule surface, comme un Finder : les dossiers et les documents y sont
// côte à côte, on entre dans un dossier en double-cliquant, on remonte par le
// fil d'Ariane. Pas de volet latéral — un arbre à gauche demande de tenir deux
// endroits à la fois dans sa tête.
//
// On y laisse tomber ce qu'on veut : un lien attrapé dans le navigateur, un
// PDF venu du Finder, une image. Chaque dépôt devient un matériel rangé là où
// l'on regarde.
//
// Les dossiers ne sont pas une table mais un chemin écrit sur chaque élément —
// « Français/Lecture ». Un dossier existe donc tant que quelque chose s'y
// trouve : rien à créer, renommer ou réparer en base.

type Element =
  | { genre: "sequence"; id: string; titre: string; dossier: string; seq: Sequence }
  | { genre: "materiel"; id: string; titre: string; dossier: string; mat: MaterielItem };

const liste = (json: string): string[] => { try { return JSON.parse(json || "[]"); } catch { return []; } };
const nb = (json: string): number => liste(json).length;

/** Un matériel neuf, rangé où il faut. Partagé par la création et les dépôts. */
const materielVierge = (dossier: string): MaterielItem => ({
  id: newId(), titre: "Nouveau matériel", descriptionMateriel: "", competenceId: "",
  competenceTitre: "", domaineTitre: "", sousDomaineTitre: "", cycle: "",
  imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null,
  sequenceId: null, dossier, videosJson: "[]", coffreJson: "[]",
});

/** Duplique une séquence avec toutes ses séances. */
async function dupliquerSequence(seq: Sequence) {
  const copie: Sequence = { ...seq, id: crypto.randomUUID(), titre: seq.titre + " (copie)", dateCreation: new Date().toISOString() };
  await api.sequenceSave(copie);
  const seances = await api.seancesList(seq.id);
  for (const s of seances) {
    await api.seanceSave({ ...s, id: crypto.randomUUID(), sequenceId: copie.id });
  }
  return copie;
}

export default function PlanDeTravail() {
  const nav = useNavigate();
  const { data: sequences, reload: rS } = useAsync(() => api.sequencesList(), []);
  const { data: materiels, reload: rM } = useAsync(() => api.materielList(), []);
  const recharger = () => { rS(); rM(); };

  const [dossier, setDossier] = React.useState("");
  const [q, setQ] = React.useState("");
  const [survol, setSurvol] = React.useState<string | null>(null);
  const [survolBureau, setSurvolBureau] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Element | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = React.useState<SousDossier | null>(null);
  const [materielOuvert, setMaterielOuvert] = React.useState<MaterielItem | null>(null);

  const elements: Element[] = React.useMemo(() => [
    ...(sequences ?? []).map((s): Element => ({ genre: "sequence", id: s.id, titre: s.titre || "Sans titre", dossier: s.dossier, seq: s })),
    ...(materiels ?? []).map((m): Element => ({ genre: "materiel", id: m.id, titre: m.titre || "Sans titre", dossier: m.dossier, mat: m })),
  ], [sequences, materiels]);

  const filtre = q.trim().toLowerCase();
  const dossiers = filtre ? [] : sousDossiers(elements, dossier);
  // Une recherche regarde partout : sinon il faudrait deviner où se trouve ce
  // qu'on cherche avant de le chercher.
  const ici = elements
    .filter((e) => (filtre ? e.titre.toLowerCase().includes(filtre) : normaliser(e.dossier) === dossier))
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  // ── Déplacements et dépôts ──
  const ranger = async (e: Element, vers: string) => {
    const cible = normaliser(vers);
    if (normaliser(e.dossier) === cible) return;
    if (e.genre === "sequence") await api.sequenceSave({ ...e.seq, dossier: cible });
    else await api.materielSave({ ...e.mat, dossier: cible });
    recharger();
    toast(cible ? `Rangé dans ${cible}` : "Sorti sur le bureau", { icone: "📂" });
  };

  const deposerLien = async (texte: string) => {
    const v = lireLien(texte);
    if (!v) return false;
    await api.materielSave({
      ...materielVierge(dossier),
      titre: v.youtubeId ? "Vidéo YouTube" : new URL(v.url).hostname.replace(/^www\./, ""),
      videosJson: JSON.stringify([v]),
    });
    recharger();
    toast("Vidéo ajoutée", { icone: "▶️" });
    return true;
  };

  const deposerFichiers = async (fichiers: File[]) => {
    let n = 0;
    for (const f of fichiers) {
      const nom = await api.fichierSave(f.name, await fichierEnBase64(f));
      const image = estImage(f.name);
      await api.materielSave({
        ...materielVierge(dossier),
        titre: f.name.replace(/\.[^.]+$/, ""),
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

  // ── Dossiers ──
  const creerDossier = () => {
    const nom = prompt("Nom du dossier :");
    if (!nom?.trim()) return;
    // Un dossier n'existe qu'habité : on le crée avec un matériel dedans,
    // sinon il disparaîtrait au rechargement suivant.
    const chemin = normaliser(dossier ? `${dossier}/${nom}` : nom);
    api.materielSave({ ...materielVierge(chemin) }).then(() => { recharger(); setDossier(chemin); });
  };

  const renommerDossier = async (d: SousDossier) => {
    const nom = prompt("Nouveau nom :", d.nom);
    if (!nom?.trim() || nom === d.nom) return;
    const nouveau = normaliser(parent(d.chemin) ? `${parent(d.chemin)}/${nom}` : nom);
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, nouveau);
      if (e.genre === "sequence") await api.sequenceSave({ ...e.seq, dossier: chemin });
      else await api.materielSave({ ...e.mat, dossier: chemin });
    }
    recharger();
    toast(`Dossier renommé (${touches.length} élément(s))`, { icone: "✏️" });
  };

  /** Vide un dossier en remontant son contenu d'un cran, sans rien effacer. */
  const viderDossier = async (d: SousDossier) => {
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, parent(d.chemin));
      if (e.genre === "sequence") await api.sequenceSave({ ...e.seq, dossier: chemin });
      else await api.materielSave({ ...e.mat, dossier: chemin });
    }
    setDossierASupprimer(null);
    recharger();
    toast(`${touches.length} élément(s) remonté(s) d'un dossier`, { icone: "📂" });
  };

  // ── Créations ──
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
  const creerRef = React.useRef(creerSequence);
  creerRef.current = creerSequence;
  React.useEffect(() => {
    // ⌘K et le tableau de bord amènent ici puis émettent cet événement.
    const h = () => creerRef.current();
    window.addEventListener("maitrize:nouvelle-sequence", h);
    return () => window.removeEventListener("maitrize:nouvelle-sequence", h);
  }, []);

  const creerMateriel = async () => {
    const m = materielVierge(dossier);
    await api.materielSave(m);
    recharger();
    setMaterielOuvert(m);
  };

  const supprimer = async (e: Element) => {
    if (e.genre === "sequence") await api.sequenceDelete(e.id);
    else await api.materielDelete(e.id);
    setASupprimer(null);
    recharger();
  };

  const fil = filDAriane(dossier);

  return (
    <Page titre="Plan de travail" sous="Votre bureau : séquences, matériel, documents"
      actions={<>
        <button className="btn" onClick={creerDossier}>📁 Dossier</button>
        <button className="btn" onClick={creerMateriel}>🧰 Matériel</button>
        <button className="btn primary" onClick={creerSequence}>📚 Séquence</button>
      </>}>

      <div className="toolbar">
        {/* Fil d'Ariane : on remonte en cliquant, et l'on peut y déposer pour
            ranger un cran plus haut. */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", flex: 1 }}>
          {fil.map((n, i) => (
            <React.Fragment key={n.chemin || "racine"}>
              {i > 0 && <span style={{ color: "var(--text-2)" }}>›</span>}
              <button
                onClick={() => { setDossier(n.chemin); setQ(""); }}
                onDragOver={(e) => { e.preventDefault(); setSurvol(n.chemin); }}
                onDragLeave={() => setSurvol(null)}
                onDrop={(e) => {
                  e.preventDefault(); setSurvol(null);
                  try { ranger(JSON.parse(e.dataTransfer.getData("application/json")), n.chemin); } catch { /* dépôt étranger */ }
                }}
                style={{
                  border: "none", background: survol === n.chemin ? "var(--accent)" : "transparent",
                  color: survol === n.chemin ? "#fff" : i === fil.length - 1 ? "var(--text)" : "var(--text-2)",
                  font: "inherit", fontWeight: i === fil.length - 1 ? 700 : 400,
                  padding: "3px 7px", borderRadius: 6, cursor: "pointer",
                }}>
                {i === 0 ? "🖥 " : ""}{n.nom}
              </button>
            </React.Fragment>
          ))}
        </div>
        <Input className="search" placeholder="Rechercher partout…" value={q}
          onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 220 }} />
      </div>

      {/* ── La surface ── */}
      <div ref={zoneFichiers}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/json")) return;
          e.preventDefault(); setSurvolBureau(true);
        }}
        onDragLeave={() => setSurvolBureau(false)}
        onDrop={async (e) => {
          if (e.dataTransfer.types.includes("application/json")) return;
          e.preventDefault(); setSurvolBureau(false);
          const texte = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
          if (texte && !(await deposerLien(texte))) toast("Ce n'est pas une adresse web.", { icone: "⚠️" });
        }}
        onContextMenu={(e) => {
          // Sur une tuile, c'est son propre menu qui s'ouvre.
          if ((e.target as HTMLElement).closest("[draggable]")) return;
          openCtx(e, [
            { label: "Nouveau dossier", icon: "📁", onClick: creerDossier },
            { label: "Nouvelle séquence", icon: "📚", sep: true, onClick: creerSequence },
            { label: "Nouveau matériel", icon: "🧰", onClick: creerMateriel },
          ]);
        }}
        style={{
          minHeight: "60vh", borderRadius: 12, padding: 14,
          border: (survolBureau || survolFichiers) ? "2px dashed var(--accent)" : "2px dashed transparent",
          background: (survolBureau || survolFichiers) ? "var(--panel-2)" : undefined,
          transition: "background .15s",
        }}>

        {!dossiers.length && !ici.length ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>{filtre ? "🔍" : "🖥"}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
              {filtre ? "Rien trouvé" : dossier ? "Dossier vide" : "Bureau vide"}
            </div>
            {!filtre && (
              <div style={{ fontSize: 13, marginTop: 6 }}>
                Déposez ici un lien YouTube, un PDF ou une image.<br />
                Clic droit pour créer un dossier ou une séquence.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 14 }}>
            {dossiers.map((d) => (
              <TuileDossier key={d.chemin} dossier={d} survole={survol === d.chemin}
                onOuvrir={() => setDossier(d.chemin)}
                onSurvol={setSurvol}
                onDepose={(el) => ranger(el, d.chemin)}
                onRenommer={() => renommerDossier(d)}
                onVider={() => setDossierASupprimer(d)} />
            ))}
            {ici.map((e) => (
              <TuileElement key={e.genre + e.id} element={e}
                onOuvrir={() => e.genre === "sequence" ? nav(`/sequences/${e.id}`) : setMaterielOuvert(e.mat)}
                onRanger={(c) => ranger(e, c)}
                onSupprimer={() => setASupprimer(e)}
                onDuplique={recharger} />
            ))}
          </div>
        )}
      </div>

      {materielOuvert && (
        <FormMateriel m={materielOuvert} onClose={() => setMaterielOuvert(null)}
          onSaved={() => { setMaterielOuvert(null); recharger(); }} />
      )}
      {aSupprimer && (
        <Confirm message={`Supprimer « ${aSupprimer.titre} » ?`}
          onYes={() => supprimer(aSupprimer)} onClose={() => setASupprimer(null)} />
      )}
      {dossierASupprimer && (
        <Confirm
          message={`Supprimer le dossier « ${dossierASupprimer.nom} » ? Son contenu (${dossierASupprimer.total} élément(s)) ne sera pas effacé : il remontera d'un cran.`}
          onYes={() => viderDossier(dossierASupprimer)}
          onClose={() => setDossierASupprimer(null)} />
      )}
    </Page>
  );
}

/** Un dossier posé sur le bureau : on y entre, on y dépose. */
function TuileDossier({ dossier, survole, onOuvrir, onSurvol, onDepose, onRenommer, onVider }: {
  dossier: SousDossier; survole: boolean; onOuvrir: () => void;
  onSurvol: (c: string | null) => void; onDepose: (e: Element) => void;
  onRenommer: () => void; onVider: () => void;
}) {
  return (
    <div onDoubleClick={onOuvrir}
      onDragOver={(e) => { e.preventDefault(); onSurvol(dossier.chemin); }}
      onDragLeave={() => onSurvol(null)}
      onDrop={(e) => {
        e.preventDefault(); onSurvol(null);
        try { onDepose(JSON.parse(e.dataTransfer.getData("application/json"))); } catch { /* dépôt étranger */ }
      }}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "📂", onClick: onOuvrir },
        { label: "Renommer", icon: "✏️", onClick: onRenommer },
        { label: "Supprimer le dossier", icon: "🗑", danger: true, sep: true, onClick: onVider },
      ])}
      title={`${dossier.nom} — ${dossier.total} élément(s)`}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10,
        background: survole ? "var(--accent)" : "transparent",
        color: survole ? "#fff" : undefined, transition: "background .12s" }}>
      <div style={{ fontSize: 48, lineHeight: 1.1 }}>{survole ? "📂" : "📁"}</div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {dossier.nom}
      </div>
      <div style={{ fontSize: 10.5, color: survole ? "#fff" : "var(--text-2)" }}>
        {dossier.total} élément{dossier.total > 1 ? "s" : ""}
      </div>
    </div>
  );
}

/**
 * Une séquence ou un matériel posé sur le bureau.
 *
 * L'aperçu passe avant le nom : on reconnaît un document à son allure avant
 * de le lire.
 */
function TuileElement({ element, onOuvrir, onRanger, onSupprimer, onDuplique }: {
  element: Element; onOuvrir: () => void; onRanger: (chemin: string) => void;
  onSupprimer: () => void; onDuplique: () => void;
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
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "1", borderRadius: 8,
        overflow: "hidden", background: t + "1f", border: `1px solid ${t}44`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        {apercuVideo ? (
          <img src={vignetteYoutube(apercuVideo.youtubeId!)} alt="" loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : image ? (
          <ApercuFichier nom={image} />
        ) : (
          <span style={{ fontSize: 40 }}>{element.genre === "sequence" ? "📚" : "🧰"}</span>
        )}
        {element.genre === "materiel" && (
          <div style={{ position: "absolute", bottom: 3, right: 3, display: "flex", gap: 3 }}>
            {nb(element.mat.pdfsJson) > 0 && <Pastille>📄 {nb(element.mat.pdfsJson)}</Pastille>}
            {nb(element.mat.coffreJson) > 0 && <Pastille>🔐</Pastille>}
            {videos.length > 0 && <Pastille>▶️</Pastille>}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5, lineHeight: 1.2, overflow: "hidden",
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

function ApercuFichier({ nom }: { nom: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.fichierRead(nom).then((b) => { if (vivant) setSrc(`data:image;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [nom]);
  return src
    ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    : <span style={{ fontSize: 34 }}>🖼</span>;
}
