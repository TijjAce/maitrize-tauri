import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Sequence, MaterielItem, Texte, couleurHex, couleurPourMatiere, newId, nowIso } from "../api";
import { Input, Confirm, Demander, Modal, ColorPicker, useAsync } from "../components/ui";
import { VignettePdf } from "../components/VignettePdf";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FormMateriel } from "../components/FormMateriel";
import { EditeurTexte } from "../components/EditeurTexte";
import { FormSequence } from "../components/FormSequence";
import { contenuDirect, nature } from "../bureau";
import { lireVideos, lireLien, vignetteYoutube } from "../videos";
import { useFileDropZone, estPdf, estImage, estDocument, typeDocument, fichierEnBase64 } from "../dragdrop";
import {
  sousDossiers, filDAriane, normaliser, parent, estDans, renommerChemin, SousDossier,
  destinationDossier, reporterCouleurs, lireCouleurs, PREFIXE_COULEUR,
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
  | { genre: "materiel"; id: string; titre: string; dossier: string; mat: MaterielItem }
  | { genre: "texte"; id: string; titre: string; dossier: string; txt: Texte };

/** Range un élément dans un dossier, quel que soit son genre. */
function enregistrerDossier(e: Element, dossier: string) {
  if (e.genre === "sequence") return api.sequenceSave({ ...e.seq, dossier });
  if (e.genre === "materiel") return api.materielSave({ ...e.mat, dossier });
  return api.texteSave({ ...e.txt, dossier });
}

/**
 * Un élément glissé depuis le bureau lui-même porte notre format : il se range
 * dans un dossier, il ne crée rien.
 */
const vientDuBureau = (e: React.DragEvent) =>
  Array.from(e.dataTransfer.types).some((t) => t === "application/json" || t === TYPE_DOSSIER);

/** Type de glisser propre aux dossiers : son contenu est un chemin. */
const TYPE_DOSSIER = "application/x-maitrize-dossier";

/** Ce qu'on lâche sur un dossier ou le fil d'Ariane : un élément, ou un dossier. */
function lireDepotInterne(dt: DataTransfer): { element?: Element; dossier?: string } {
  const chemin = dt.getData(TYPE_DOSSIER);
  if (chemin) return { dossier: chemin };
  try { return { element: JSON.parse(dt.getData("application/json")) }; } catch { return {}; }
}

/** Couleur d'un dossier sans couleur choisie : le bleu doux d'un dossier ordinaire. */
const COULEUR_DOSSIER = "#6fa8e6";

/** Assombrit une couleur #rrggbb, pour l'onglet du dossier. */
function assombrir(hex: string, part: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (d: number) => Math.round(((n >> d) & 255) * (1 - part)).toString(16).padStart(2, "0");
  return `#${f(16)}${f(8)}${f(0)}`;
}

/**
 * Le texte d'un dépôt, quel que soit le type employé par la plateforme.
 *
 * Safari, Chrome et le Finder n'annoncent pas les mêmes types pour un même
 * lien ; n'en interroger qu'un revient à ne marcher que sur l'un d'eux.
 * `text/uri-list` peut par ailleurs contenir plusieurs lignes, dont des
 * commentaires : on prend la première adresse.
 */
function lireTexteDepose(dt: DataTransfer): string {
  for (const type of ["text/uri-list", "text/plain", "URL", "public.url", "text/html"]) {
    let valeur = "";
    try { valeur = dt.getData(type); } catch { continue; }
    if (!valeur) continue;
    const ligne = valeur.split(/[\r\n]+/).map((l) => l.trim())
      .find((l) => l && !l.startsWith("#") && /^https?:\/\//i.test(l));
    if (ligne) return ligne;
    // text/html : le lien est dans un attribut href.
    const href = valeur.match(/href=["']?(https?:\/\/[^"'\s>]+)/i)?.[1];
    if (href) return href;
  }
  return "";
}

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
  const { data: textes, reload: rT } = useAsync(() => api.textesList(), []);
  const recharger = () => { rS(); rM(); rT(); };
  const [texteOuvert, setTexteOuvert] = React.useState<Texte | null>(null);
  const [sequenceFiche, setSequenceFiche] = React.useState<{ sequence: Sequence; nouvelle: boolean } | null>(null);

  const [dossier, setDossier] = React.useState("");
  const [q, setQ] = React.useState("");
  const [survol, setSurvol] = React.useState<string | null>(null);
  const [survolBureau, setSurvolBureau] = React.useState(false);
  const [aSupprimer, setASupprimer] = React.useState<Element | null>(null);
  const [dossierASupprimer, setDossierASupprimer] = React.useState<SousDossier | null>(null);
  const [materielOuvert, setMaterielOuvert] = React.useState<MaterielItem | null>(null);
  const [couleurs, setCouleurs] = React.useState<Record<string, string>>({});
  const [aColorer, setAColorer] = React.useState<SousDossier | null>(null);
  React.useEffect(() => { api.settingsAll().then((r) => setCouleurs(lireCouleurs(r))).catch(() => {}); }, []);

  /** Applique des réécritures de couleurs, en base puis à l'écran. */
  const ecrireCouleurs = async (ecritures: Record<string, string>) => {
    for (const [cle, valeur] of Object.entries(ecritures)) await api.settingSet(cle, valeur);
    setCouleurs((avant) => {
      const apres = { ...avant };
      for (const [cle, valeur] of Object.entries(ecritures)) {
        const chemin = cle.slice(PREFIXE_COULEUR.length);
        if (valeur) apres[chemin] = valeur; else delete apres[chemin];
      }
      return apres;
    });
  };
  // Saisies courtes : `window.prompt` n'existe pas dans la fenêtre de
  // l'application, l'appel ne faisait rien et le bouton paraissait mort.
  const [demande, setDemande] = React.useState<
    { titre: string; label: string; valeur?: string; placeholder?: string; sur: (v: string) => void } | null>(null);

  const elements: Element[] = React.useMemo(() => [
    ...(sequences ?? []).map((s): Element => ({ genre: "sequence", id: s.id, titre: s.titre || "Sans titre", dossier: s.dossier, seq: s })),
    ...(materiels ?? []).map((m): Element => ({ genre: "materiel", id: m.id, titre: m.titre || "Sans titre", dossier: m.dossier, mat: m })),
    ...(textes ?? []).map((x): Element => ({ genre: "texte", id: x.id, titre: x.titre || "Sans titre", dossier: x.dossier, txt: x })),
  ], [sequences, materiels, textes]);

  const filtre = q.trim().toLowerCase();
  const dossiers = filtre ? [] : sousDossiers(elements, dossier);
  // Une recherche regarde partout : sinon il faudrait deviner où se trouve ce
  // qu'on cherche avant de le chercher.
  const ici = elements
    .filter((e) => (filtre
      ? e.titre.toLowerCase().includes(filtre) || (e.genre === "texte" && e.txt.contenu.toLowerCase().includes(filtre))
      : normaliser(e.dossier) === dossier))
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  // ── Déplacements et dépôts ──
  const ranger = async (e: Element, vers: string) => {
    const cible = normaliser(vers);
    if (normaliser(e.dossier) === cible) return;
    await enregistrerDossier(e, cible);
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
    accept: (c) => estDocument(c) || estImage(c),
    onFiles: deposerFichiers,
  });

  // ── Dossiers ──
  const deplacerDossier = async (chemin: string, vers: string) => {
    const arrivee = destinationDossier(chemin, vers);
    if (!arrivee) return;
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), chemin));
    for (const e of touches) {
      const nouveau = renommerChemin(normaliser(e.dossier), chemin, arrivee);
      await enregistrerDossier(e, nouveau);
    }
    await ecrireCouleurs(reporterCouleurs(couleurs, chemin, arrivee));
    // On regardait l'intérieur du dossier déplacé : on le suit.
    if (dossier && estDans(dossier, chemin)) setDossier(renommerChemin(dossier, chemin, arrivee));
    recharger();
    toast(normaliser(vers) ? `Dossier rangé dans ${normaliser(vers)}` : "Dossier sorti sur le bureau", { icone: "📁" });
  };

  /** Ce qu'on lâche sur un dossier : un élément s'y range, un dossier y entre. */
  const deposerSur = (dt: DataTransfer, cible: string) => {
    const { element, dossier: d } = lireDepotInterne(dt);
    if (d) deplacerDossier(d, cible);
    else if (element) ranger(element, cible);
  };

  const creerDossier = () => setDemande({
    titre: "Nouveau dossier", label: "Nom du dossier", placeholder: "Lecture, Rituels…",
    sur: (nom) => {
      // Un dossier n'existe qu'habité : on le crée avec un matériel dedans,
      // sinon il disparaîtrait au rechargement suivant.
      const chemin = normaliser(dossier ? `${dossier}/${nom}` : nom);
      api.materielSave({ ...materielVierge(chemin) }).then(() => { recharger(); setDossier(chemin); });
    },
  });

  const renommerDossier = (d: SousDossier) => setDemande({
    titre: "Renommer le dossier", label: "Nouveau nom", valeur: d.nom,
    sur: (nom) => { if (nom !== d.nom) appliquerRenommage(d, nom); },
  });

  const appliquerRenommage = async (d: SousDossier, nom: string) => {
    const nouveau = normaliser(parent(d.chemin) ? `${parent(d.chemin)}/${nom}` : nom);
    await ecrireCouleurs(reporterCouleurs(couleurs, d.chemin, nouveau));
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, nouveau);
      await enregistrerDossier(e, chemin);
    }
    recharger();
    toast(`Dossier renommé (${touches.length} élément(s))`, { icone: "✏️" });
  };

  /** Vide un dossier en remontant son contenu d'un cran, sans rien effacer. */
  const viderDossier = async (d: SousDossier) => {
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    for (const e of touches) {
      const chemin = renommerChemin(normaliser(e.dossier), d.chemin, parent(d.chemin));
      await enregistrerDossier(e, chemin);
    }
    // Le dossier disparaît avec sa couleur ; ses sous-dossiers remontent avec la leur.
    const { [d.chemin]: couleurRetiree, ...autres } = couleurs;
    await ecrireCouleurs({
      ...reporterCouleurs(autres, d.chemin, parent(d.chemin)),
      ...(couleurRetiree ? { [PREFIXE_COULEUR + d.chemin]: "" } : {}),
    });
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
    // La fiche d'abord : on nomme la séquence avant d'y entrer.
    setSequenceFiche({ sequence: s, nouvelle: true });
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

  const creerTexte = async () => {
    const x: Texte = { id: newId(), titre: "Nouveau texte", contenu: "", dossier, dateCreation: nowIso(), dateModification: "" };
    await api.texteSave(x);
    recharger();
    setTexteOuvert(x);
  };

  /** Double-clic : un dépôt simple s'ouvre tel quel, le reste en fiche. */
  const ouvrir = (e: Element) => {
    if (e.genre === "sequence") { nav(`/sequences/${e.id}`); return; }
    if (e.genre === "texte") { setTexteOuvert(e.txt); return; }
    const c = contenuDirect(e.mat);
    if (!c) { setMaterielOuvert(e.mat); return; }
    // Dans le navigateur : l'intégration YouTube exige un référent que la
    // fenêtre de l'application compilée (tauri://) ne fournit pas.
    if (c.genre === "video") openUrl(c.video.url).catch(() => window.open(c.video.url, "_blank"));
    else api.fichierOuvrir(c.nom).catch((err) => toast(String(err), { icone: "⚠️" }));
  };

  const supprimer = async (e: Element) => {
    if (e.genre === "sequence") await api.sequenceDelete(e.id);
    else if (e.genre === "texte") await api.texteDelete(e.id);
    else await api.materielDelete(e.id);
    setASupprimer(null);
    recharger();
  };

  const fil = filDAriane(dossier);

  return (
    <Page titre="Plan de travail" sous="Votre bureau : séquences, matériel, documents">

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
                onDrop={(e) => { e.preventDefault(); setSurvol(null); deposerSur(e.dataTransfer, n.chemin); }}
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
          if (vientDuBureau(e)) return;
          e.preventDefault();
          // « copy » plutôt que le défaut : sans lui, certains navigateurs
          // affichent le curseur d'interdiction même quand le dépôt est accepté.
          e.dataTransfer.dropEffect = "copy";
          setSurvolBureau(true);
        }}
        onDragLeave={() => setSurvolBureau(false)}
        onDrop={async (e) => {
          if (vientDuBureau(e)) return;
          e.preventDefault(); setSurvolBureau(false);
          const texte = lireTexteDepose(e.dataTransfer);
          if (!texte) return; // un dépôt de fichiers est traité par la zone dédiée
          if (!(await deposerLien(texte))) toast("Ce n'est pas une adresse web.", { icone: "⚠️" });
        }}
        onContextMenu={(e) => {
          // Sur une tuile, c'est son propre menu qui s'ouvre.
          if ((e.target as HTMLElement).closest("[draggable]")) return;
          openCtx(e, [
            { label: "Nouveau dossier", icon: "📁", onClick: creerDossier },
            { label: "Nouveau texte", icon: "📝", onClick: creerTexte },
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
                Déposez ici un lien YouTube, un PDF, un document Word ou LibreOffice, une image.<br />
                Clic droit pour créer un dossier, un texte ou une séquence.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 14 }}>
            {dossiers.map((d) => (
              <TuileDossier key={d.chemin} dossier={d} survole={survol === d.chemin}
                couleur={couleurHex[couleurs[d.chemin]] ?? COULEUR_DOSSIER}
                onOuvrir={() => setDossier(d.chemin)}
                onSurvol={setSurvol}
                onDepose={(dt) => deposerSur(dt, d.chemin)}
                onColorer={() => setAColorer(d)}
                onRenommer={() => renommerDossier(d)}
                onVider={() => setDossierASupprimer(d)} />
            ))}
            {ici.map((e) => (
              <TuileElement key={e.genre + e.id} element={e}
                onOuvrir={() => ouvrir(e)}
                onModifier={e.genre === "materiel" && contenuDirect(e.mat) ? () => setMaterielOuvert(e.mat)
                  : e.genre === "sequence" ? () => setSequenceFiche({ sequence: e.seq, nouvelle: false }) : undefined}
                onRanger={() => setDemande({
                  titre: "Ranger dans…", label: "Chemin du dossier",
                  valeur: e.dossier, placeholder: "Français/Lecture",
                  sur: (c) => ranger(e, c),
                })}
                onSupprimer={() => setASupprimer(e)}
                onDuplique={recharger} />
            ))}
          </div>
        )}
      </div>

      {demande && (
        <Demander titre={demande.titre} label={demande.label} valeur={demande.valeur}
          placeholder={demande.placeholder}
          onClose={() => setDemande(null)}
          onValider={(v) => { setDemande(null); demande.sur(v); }} />
      )}

      {aColorer && (
        <Modal titre={`Couleur de « ${aColorer.nom} »`} onClose={() => setAColorer(null)}
          footer={<>
            <button className="btn" onClick={() => {
              ecrireCouleurs({ [PREFIXE_COULEUR + aColorer.chemin]: "" }); setAColorer(null);
            }}>Sans couleur</button>
            <button className="btn primary" onClick={() => setAColorer(null)}>Fermer</button>
          </>}>
          <ColorPicker value={couleurs[aColorer.chemin] ?? ""} onChange={(c) => {
            ecrireCouleurs({ [PREFIXE_COULEUR + aColorer.chemin]: c }); setAColorer(null);
          }} />
        </Modal>
      )}

      {sequenceFiche && (
        <FormSequence sequence={sequenceFiche.sequence} onClose={() => setSequenceFiche(null)}
          onSaved={(seq) => { const nouvelle = sequenceFiche.nouvelle; setSequenceFiche(null); recharger(); if (nouvelle) nav(`/sequences/${seq.id}`); }} />
      )}

      {texteOuvert && (
        <EditeurTexte texte={texteOuvert} onClose={() => { setTexteOuvert(null); recharger(); }} />
      )}

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
function TuileDossier({ dossier, survole, couleur, onOuvrir, onSurvol, onDepose, onColorer, onRenommer, onVider }: {
  dossier: SousDossier; survole: boolean; couleur: string; onOuvrir: () => void;
  onSurvol: (c: string | null) => void; onDepose: (dt: DataTransfer) => void;
  onColorer: () => void; onRenommer: () => void; onVider: () => void;
}) {
  return (
    <div draggable
      onDragStart={(e) => { e.dataTransfer.setData(TYPE_DOSSIER, dossier.chemin); e.dataTransfer.effectAllowed = "move"; }}
      onDoubleClick={onOuvrir}
      onDragOver={(e) => {
        // Un lien ou un fichier venu d'ailleurs file jusqu'au bureau, qui sait
        // l'accueillir. Lâcher un dossier sur lui-même est refusé plus loin :
        // pendant le survol, on ne peut pas encore lire ce qui est glissé.
        if (!vientDuBureau(e)) return;
        e.preventDefault(); onSurvol(dossier.chemin);
      }}
      onDragLeave={() => onSurvol(null)}
      onDrop={(e) => {
        if (!vientDuBureau(e)) return;
        e.preventDefault(); e.stopPropagation(); onSurvol(null); onDepose(e.dataTransfer);
      }}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "📂", onClick: onOuvrir },
        { label: "Renommer", icon: "✏️", onClick: onRenommer },
        { label: "Couleur…", icon: "🎨", onClick: onColorer },
        { label: "Supprimer le dossier", icon: "🗑", danger: true, sep: true, onClick: onVider },
      ])}
      title={`${dossier.nom} — ${dossier.total} élément(s)`}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10,
        background: survole ? "var(--accent)" : "transparent",
        color: survole ? "#fff" : undefined, transition: "background .12s" }}>
      <IconeDossier couleur={couleur} ouvert={survole} />
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

/** Un dossier dessiné, pour pouvoir le teinter — un émoji ne se colore pas. */
function IconeDossier({ couleur, ouvert }: { couleur: string; ouvert: boolean }) {
  const onglet = assombrir(couleur, 0.16);
  return (
    <svg viewBox="0 0 64 52" width="76" height="62" aria-hidden="true" style={{ display: "block", margin: "0 auto" }}>
      <path d="M3 9a5 5 0 0 1 5-5h15.2a5 5 0 0 1 3.9 1.9L30 10h26a5 5 0 0 1 5 5v5H3z" fill={onglet} />
      <path d={ouvert ? "M1 22a4 4 0 0 1 4-4h56a3 3 0 0 1 3 3.6l-3.6 24A5 5 0 0 1 55.5 50h-47a5 5 0 0 1-4.9-4.3z"
        : "M3 19a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v26a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"} fill={couleur} />
      <path d="M3 19a4 4 0 0 1 4-4h50a4 4 0 0 1 4 4v2H3z" fill="#fff" opacity={ouvert ? 0 : 0.22} />
    </svg>
  );
}

/**
 * Une séquence ou un matériel posé sur le bureau.
 *
 * L'aperçu passe avant le nom : on reconnaît un document à son allure avant
 * de le lire.
 */
function TuileElement({ element, onOuvrir, onModifier, onRanger, onSupprimer, onDuplique }: {
  element: Element; onOuvrir: () => void; onRanger: () => void;
  /** Présent pour un dépôt simple, qui s'ouvre sans passer par sa fiche. */
  onModifier?: () => void;
  onSupprimer: () => void; onDuplique: () => void;
}) {
  const seq = element.genre === "sequence" ? element.seq : null;
  const t = seq ? (couleurHex[couleurPourMatiere(seq.matiere)] ?? couleurHex.gray) : couleurHex.gray;
  const videos = element.genre === "materiel" ? lireVideos(element.mat.videosJson) : [];
  const apercuVideo = videos.find((v) => v.youtubeId);
  const image = element.genre === "materiel" ? liste(element.mat.imagesJson)[0] : seq?.imageNom;
  const pdf = element.genre === "materiel" ? liste(element.mat.pdfsJson)[0] : undefined;

  return (
    <div draggable
      onDragStart={(e) => e.dataTransfer.setData("application/json", JSON.stringify(element))}
      onDoubleClick={onOuvrir}
      onContextMenu={(e) => openCtx(e, [
        { label: "Ouvrir", icon: "↗", onClick: onOuvrir },
        ...(onModifier ? [{ label: "Modifier…", icon: "✏️", onClick: onModifier }] : []),
        ...(element.genre === "sequence" ? [{ label: "Dupliquer", icon: "📑",
          onClick: () => dupliquerSequence(element.seq).then(onDuplique) }] : []),
        { label: "Ranger dans…", icon: "📂", onClick: onRanger },
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
        ) : pdf && estPdf(pdf) ? (
          <VignettePdf nom={pdf} />
        ) : pdf ? (
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 42 }}>{typeDocument(pdf).icone}</span>
            <span style={{ fontSize: 10, color: "var(--text-2)", textTransform: "uppercase" }}>{pdf.split(".").pop()}</span>
          </span>
        ) : element.genre === "texte" ? (
          <ApercuTexte contenu={element.txt.contenu} />
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
          : element.genre === "texte" ? "Texte" : nature(element.mat)}
      </div>
    </div>
  );
}

/** Les premières lignes d'un texte, posées comme sur une feuille. */
function ApercuTexte({ contenu }: { contenu: string }) {
  const debut = contenu.split("\n").slice(0, 14).join("\n").slice(0, 600);
  return (
    <div aria-hidden="true" style={{
      width: "72%", height: "86%", background: "#fff", borderRadius: 2, padding: "8px 8px",
      boxShadow: "0 1px 2px rgba(0,0,0,.18), 0 3px 10px rgba(0,0,0,.12)", overflow: "hidden",
      textAlign: "left", fontSize: 6.5, lineHeight: 1.35, color: "#4b5563",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
    }}>
      {debut.trim() ? debut : <span style={{ color: "#c4c9d1", fontSize: 9 }}>Vide</span>}
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
