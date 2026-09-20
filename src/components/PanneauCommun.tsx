import React from "react";
import { useNavigate } from "react-router-dom";
import { api, texteErreur, type BureauCommun, type EntreeCommune } from "../api";
import { Demander, Field, Input, Modal, Select } from "./ui";
import { toast, toastAnnulable } from "./Toaster";
import { confirmer } from "./confirmer";
import { openCtx } from "./ctxmenu";
import { IconeDossier, COULEUR_DOSSIER } from "./IconeDossier";
import { typeDocument, estImage } from "../dragdrop";
import { estPaquet, titreDuPaquet } from "../bureauCommun";
import {
  deposerDossier, deposerElement, dossiersDeMonBureau, dossiersPris, entreesDuDepot, poserFichiers,
  recupererDossier, recupererFichier, recupererPaquet,
} from "../partageCommun";
import type { GenreElement } from "../bureauCommun";

// ── Le panneau d'un bureau commun ─────────────────────────────────────────
//
// Chaque bureau commun est un dossier partagé par un service de stockage —
// Nuage, OneDrive, Google Drive… — avec les collègues de son choix. On y
// glisse des fichiers et des dossiers depuis le Finder ou l'Explorateur, on y
// dépose des dossiers de son bureau, et l'on récupère ce que les autres ont
// posé : chacun garde son bureau, et prend ce qu'il veut, en copie.
//
// Qui y a accès se règle dans le service de stockage, personne par personne :
// Maitrize ne garde aucune clé.
//
// Le même panneau sert en pleine page et à droite du bureau, quand on le
// scinde en deux : on fait alors glisser un dossier ou un élément d'un côté à
// l'autre, dans les deux sens.

/** Le dernier bureau commun ouvert, sur cet ordinateur. */
const CLE_ACTIF = "communs:actif";
/** Tant que la page est ouverte, on regarde ce que les collègues ont déposé. */
const RELECTURE_MS = 5000;
/** Sur Nuage, chaque relecture est une requête : on espace. */
const RELECTURE_NUAGE_MS = 20000;

/** Ce bureau commun est-il chez Nuage (compte ou lien de partage) ? */
const distant = (b: BureauCommun | null) => !!b && (b.sorte === "nuage" || b.sorte === "lien");
/** « Nouveau » pendant trois jours. */
const RECENT_MS = 3 * 86_400_000;
/** Au-delà, une image se montre par son icône : l'aperçu la chargerait entière. */
const APERCU_MAX = 8 * 1024 * 1024;

const taille = (octets: number) =>
  octets < 1024 ? `${octets} o` : octets < 1_048_576 ? `${Math.round(octets / 1024)} Ko` : `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo`;

/** Le type de glisser d'un dossier du bureau (défini par le plan de travail). */
const TYPE_DOSSIER_BUREAU = "application/x-maitrize-dossier";

/** Ce qu'un glisser porte quand il vient d'un bureau commun. */
export const TYPE_COMMUN = "application/x-maitrize-commun";
export interface DepotCommun { bureau: string; chemin: string; nom: string; dossier: boolean }

/** Lit un dépôt venu d'un bureau commun ; rien d'autre ne passe par ce type. */
export function lireDepotCommun(dt: DataTransfer): DepotCommun | null {
  try {
    const brut = dt.getData(TYPE_COMMUN);
    if (!brut) return null;
    const d = JSON.parse(brut) as DepotCommun;
    return d && typeof d.bureau === "string" && typeof d.chemin === "string" ? d : null;
  } catch {
    return null;
  }
}

export function PanneauCommun({ compact = false, onFermer, onRecupere }: {
  /** Serré : à droite du bureau, plutôt qu'en pleine page. */
  compact?: boolean;
  /** Bouton de fermeture du panneau (bureau scindé). */
  onFermer?: () => void;
  /** Après une récupération : le bureau se recharge. */
  onRecupere?: () => void;
}) {
  const nav = useNavigate();
  const [bureaux, setBureaux] = React.useState<BureauCommun[] | null>(null);
  const [actifId, setActifIdBrut] = React.useState(() => { try { return localStorage.getItem(CLE_ACTIF) ?? ""; } catch { return ""; } });
  const setActifId = (id: string) => {
    setActifIdBrut(id); setDossier("");
    try { localStorage.setItem(CLE_ACTIF, id); } catch { /* stockage indisponible */ }
  };
  const actif = bureaux?.find((b) => b.id === actifId) ?? bureaux?.[0] ?? null;
  const [dossier, setDossier] = React.useState("");
  const [entrees, setEntrees] = React.useState<EntreeCommune[] | null>(null);
  const [erreur, setErreur] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [ajout, setAjout] = React.useState(false);
  const [choixDepot, setChoixDepot] = React.useState(false);
  const [survol, setSurvol] = React.useState(false);
  const [demande, setDemande] = React.useState<{ titre: string; label: string; valeur?: string; sur: (v: string) => void } | null>(null);
  const [invitation, setInvitation] = React.useState(false);

  const relireBureaux = React.useCallback(async () => {
    try { setBureaux(await api.communsListe()); } catch (e) { setErreur(texteErreur(e)); setBureaux([]); }
  }, []);
  React.useEffect(() => { void relireBureaux(); }, [relireBureaux]);

  const relire = React.useCallback(async () => {
    if (!actif?.present) { setEntrees(null); return; }
    try { setEntrees(await api.communLister(actif.id, dossier)); setErreur(""); }
    catch (e) { setErreur(texteErreur(e)); setEntrees([]); }
  }, [actif?.id, actif?.present, dossier]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { setEntrees(null); void relire(); }, [relire]);
  // Les dépôts des collègues arrivent par le service de stockage : on relit
  // régulièrement, et quand on revient sur la fenêtre.
  React.useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) void relire(); },
      actif && actif.sorte !== "dossier" && actif.sorte ? RELECTURE_NUAGE_MS : RELECTURE_MS);
    const auRetour = () => { void relire(); };
    window.addEventListener("focus", auRetour);
    return () => { window.clearInterval(id); window.removeEventListener("focus", auRetour); };
  }, [relire, actif?.sorte]);

  const faire = async (quoi: string, f: () => Promise<void>) => {
    setOccupe(quoi);
    try { await f(); } catch (e) { toast(texteErreur(e), { icone: "⚠️", duree: 8000 }); } finally { setOccupe(""); }
  };

  // ── Récupérer sur mon bureau ──
  const recuperer = (e: EntreeCommune) => faire(e.chemin, async () => {
    if (!actif) return;
    if (e.dossier) {
      const ou = await recupererDossier(actif, e.chemin, await dossiersPris());
      toast(`« ${e.nom} » est sur votre bureau, dans le dossier « ${ou} ».`, { icone: "📥" });
    } else if (estPaquet(e.nom)) {
      const ou = await recupererPaquet(actif, e.chemin, await dossiersPris());
      toast(`« ${titreDuPaquet(e.nom)} » est sur votre bureau, dans le dossier « ${ou} ».`, { icone: "📥" });
    } else {
      await recupererFichier(actif, e.chemin, "");
      toast(`« ${e.nom} » est sur votre bureau.`, { icone: "📥" });
    }
    onRecupere?.();
  });

  const ouvrir = (e: EntreeCommune) => {
    if (e.dossier) { setDossier(e.chemin); return; }
    if (estPaquet(e.nom)) { void recuperer(e); return; }
    if (actif) api.communOuvrir(actif.id, e.chemin).catch((err) => toast(texteErreur(err), { icone: "⚠️" }));
  };

  const supprimer = (e: EntreeCommune) => faire("suppression", async () => {
    if (!actif) return;
    if (!(await confirmer(
      `Supprimer « ${e.dossier ? e.nom : titreDuPaquet(e.nom)} » du bureau commun ? Il disparaîtra pour tout le monde. `
      + "Le service de stockage le garde en général dans sa corbeille (40 jours pour Nuage).", { oui: "Supprimer", danger: true }))) return;
    await api.communSupprimer(actif.id, e.chemin);
    await relire();
  });

  // ── Poser sur le bureau commun ──
  const poser = (lire: () => Promise<{ chemin: string; fichier: File }[]>) => faire("depot", async () => {
    if (!actif) return;
    const fichiers = await lire();
    if (!fichiers.length) return;
    const { poses: n, refuses, tropLourds } = await poserFichiers(actif, dossier, fichiers);
    if (n) toast(`${n} fichier${n > 1 ? "s" : ""} posé${n > 1 ? "s" : ""} sur « ${actif.nom} ».`, { icone: "🤝" });
    if (tropLourds.length) {
      toast(`Trop lourd pour passer par Maitrize : ${tropLourds.join(", ")}. Glissez-le directement dans le dossier partagé (bouton 📂).`,
        { icone: "⚠️", duree: 10000 });
    }
    if (refuses.length) toast(`Impossible de poser : ${refuses.join(", ")}.`, { icone: "⚠️", duree: 8000 });
    await relire();
  });

  /** Ce qui vient d'être déposé peut repartir aussitôt : un geste se rattrape. */
  const deposeAnnulable = async (quoi: string, depot: () => Promise<{ nom: string; elements: number }>) => {
    if (!actif) return;
    // Vers Nuage, l'envoi prend le temps du réseau : on ne laisse pas l'écran muet.
    if (distant(actif)) toast(`Envoi de « ${quoi} » vers « ${actif.nom} »…`, { icone: "☁️", duree: 4000 });
    const r = await depot();
    await relire();
    toastAnnulable(`« ${quoi} » est sur « ${actif.nom} » (${r.elements} élément${r.elements > 1 ? "s" : ""}).`,
      async () => {
        await api.communSupprimer(actif.id, [dossier, r.nom].filter(Boolean).join("/")).catch(() => {});
        await relire();
      }, "🤝");
  };

  /** Un dossier ou un élément lâché sur le panneau depuis le bureau. */
  const accepterDuBureau = (dt: DataTransfer) => faire("depot", async () => {
    if (!actif) return;
    const chemin = dt.getData(TYPE_DOSSIER_BUREAU);
    if (chemin) {
      await deposeAnnulable(chemin, () => deposerDossier(chemin, actif, dossier));
      return;
    }
    let el: { genre?: string; id?: string; titre?: string } | null = null;
    try { el = JSON.parse(dt.getData("application/json")); } catch { el = null; }
    if (!el?.genre || !el.id) return;
    await deposeAnnulable(el.titre || "Sans titre",
      () => deposerElement(el!.genre as GenreElement, el!.id!, el!.titre ?? "", actif, dossier));
  });

  const deposerDeMonBureau = (chemin: string) => faire("depot", async () => {
    if (!actif) return;
    setChoixDepot(false);
    if (!(await confirmer(
      `Déposer « ${chemin} » sur « ${actif.nom} » ? Vos collègues pourront le récupérer. Les bilans de séance et les élèves `
      + "associés aux outils ne partent pas ; les textes et documents partent tels qu'ils sont écrits.", { oui: "Déposer" }))) return;
    const r = await deposerDossier(chemin, actif, dossier);
    toast(`« ${chemin} » est sur « ${actif.nom} » (${r.elements} élément${r.elements > 1 ? "s" : ""}).`, { icone: "🤝" });
    await relire();
  });

  const fil = [{ nom: actif?.nom ?? "", chemin: "" }, ...dossier.split("/").filter(Boolean)
    .map((nom, i, tout) => ({ nom, chemin: tout.slice(0, i + 1).join("/") }))];

  return (
    <div className={compact ? "commun-panneau" : ""}>
      {compact && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontWeight: 700 }}>🤝 Bureau commun</span>
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" title="Ouvrir en pleine page" onClick={() => nav("/commun")}>⤢</button>
          {onFermer && <button className="btn ghost sm" title="Refermer le bureau commun" aria-label="Refermer le bureau commun" onClick={onFermer}>✕</button>}
        </div>
      )}
      {!compact && (
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8 }}>
          <button className="btn" onClick={() => nav("/plan")}>← Mon bureau</button>
          <button className="btn primary" onClick={() => setAjout(true)}>+ Ajouter un bureau commun</button>
        </div>
      )}

      {bureaux && !bureaux.length && <PremiersPas onAjouter={() => setAjout(true)} compact={compact} />}

      {actif && (
        <>
          <div className="toolbar">
            {bureaux!.length > 1 && (
              <Select value={actif.id} onChange={(e) => setActifId(e.target.value)} style={{ maxWidth: 240 }}>
                {bureaux!.map((b) => <option key={b.id} value={b.id}>🤝 {b.nom}</option>)}
              </Select>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", flex: 1 }}>
              {fil.map((n, i) => (
                <React.Fragment key={n.chemin || "racine"}>
                  {i > 0 && <span style={{ color: "var(--text-2)" }}>›</span>}
                  <button className={`rangement-etape${i === fil.length - 1 ? " courante" : ""}`} onClick={() => setDossier(n.chemin)}
                    style={{ border: "none", background: "transparent", font: "inherit", padding: "3px 7px", borderRadius: 6, cursor: "pointer",
                      color: i === fil.length - 1 ? "var(--text)" : "var(--text-2)", fontWeight: i === fil.length - 1 ? 700 : 400 }}>
                    {i === 0 ? "🤝 " : ""}{n.nom}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <button className="btn sm" disabled={!actif.present || !!occupe} onClick={() => setChoixDepot(true)}
              title="Choisir un dossier de mon bureau à déposer ici">
              {compact ? "📤 Déposer…" : "📤 Déposer un dossier de mon bureau"}</button>
            <button className="btn ghost sm" disabled={!actif.present} title="Nouveau dossier" onClick={() => setDemande({
              titre: "Nouveau dossier", label: "Nom du dossier",
              sur: (nom) => faire("dossier", async () => { await api.communCreerDossier(actif.id, dossier, nom); await relire(); }),
            })}>{compact ? "📁" : "📁 Nouveau dossier"}</button>
            <button className="btn ghost sm" disabled={!actif.present}
              title={distant(actif) ? "Ouvrir dans Nuage, dans le navigateur" : "Ouvrir ce dossier dans le Finder ou l'Explorateur"}
              onClick={() => api.communOuvrir(actif.id, dossier).catch((e) => toast(texteErreur(e), { icone: "⚠️" }))}>
              {distant(actif) ? "☁️" : "📂"}</button>
            <button className="btn ghost sm" title="Inviter, renommer, oublier…" onClick={(e) => openCtx(e, [
              ...(actif.sorte === "nuage"
                ? [{ label: "Inviter un ami : créer un lien", icon: "🔗", onClick: () => setInvitation(true) }]
                : []),
              { label: "Renommer ce bureau commun", icon: "✏️", onClick: () => setDemande({
                titre: "Renommer", label: "Nom du bureau commun", valeur: actif.nom,
                sur: (nom) => faire("nom", async () => { await api.communRenommer(actif.id, nom); await relireBureaux(); }),
              }) },
              { label: "Oublier sur cet ordinateur", icon: "🗑", danger: true, sep: true, onClick: () => faire("oubli", async () => {
                if (!(await confirmer(`Oublier « ${actif.nom} » sur cet ordinateur ? Le dossier partagé et tout ce qu'il contient restent en place ; vous pourrez l'ajouter de nouveau.`, { oui: "Oublier" }))) return;
                await api.communOublier(actif.id);
                await relireBureaux();
              }) },
            ])}>⋯</button>
          </div>

          {!actif.present ? (
            <div className="card" style={{ color: "var(--text-2)" }}>
              Le dossier de « {actif.nom} » n'est pas sur cet ordinateur ({actif.chemin}). Le service de stockage l'a-t-il
              synchronisé ? Sinon, oubliez ce bureau commun ici et ajoutez-le de nouveau — en le posant sur Nuage, par
              exemple, où rien n'est à installer.
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                const types = Array.from(e.dataTransfer.types);
                // Des fichiers du Finder, ou un dossier / un élément du bureau.
                if (!types.includes("Files") && !types.includes(TYPE_DOSSIER_BUREAU) && !types.includes("application/json")) return;
                e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setSurvol(true);
              }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
              onDrop={(e) => {
                const types = Array.from(e.dataTransfer.types);
                if (types.includes("Files")) {
                  e.preventDefault(); setSurvol(false);
                  // Les dossiers glissés se lisent pendant l'événement, pas après.
                  void poser(entreesDuDepot(e.dataTransfer));
                  return;
                }
                if (!types.includes(TYPE_DOSSIER_BUREAU) && !types.includes("application/json")) return;
                e.preventDefault(); setSurvol(false);
                void accepterDuBureau(e.dataTransfer);
              }}
              onContextMenu={(e) => {
                if ((e.target as HTMLElement).closest("[data-entree]")) return;
                openCtx(e, [
                  { label: "Nouveau dossier", icon: "📁", onClick: () => setDemande({
                    titre: "Nouveau dossier", label: "Nom du dossier",
                    sur: (nom) => faire("dossier", async () => { await api.communCreerDossier(actif.id, dossier, nom); await relire(); }),
                  }) },
                  { label: "Déposer un dossier de mon bureau…", icon: "📤", onClick: () => setChoixDepot(true) },
                ]);
              }}
              style={{
                minHeight: compact ? "50vh" : "55vh", borderRadius: 12, padding: compact ? 8 : 14,
                maxHeight: compact ? "62vh" : undefined, overflowY: compact ? "auto" : undefined,
                border: survol ? "2px dashed var(--accent)" : "2px dashed transparent",
                background: survol ? "var(--panel-2)" : undefined, transition: "background .15s",
              }}>
              {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13 }}>{erreur}</p>}
              {entrees === null ? <p style={{ color: "var(--text-2)" }}>Lecture…</p> : !entrees.length ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🤝</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{dossier ? "Dossier vide" : "Rien pour l'instant"}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Glissez ici un dossier ou un élément de votre bureau, à gauche,<br />
                    ou des fichiers depuis le Finder ou l'Explorateur.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 96 : 128}px, 1fr))`, gap: compact ? 10 : 14 }}>
                  {entrees.map((e) => (
                    <Tuile key={e.chemin} entree={e} bureau={actif} occupe={occupe === e.chemin} compact={compact}
                      onOuvrir={() => ouvrir(e)}
                      onMenu={(ev) => openCtx(ev, [
                        { label: e.dossier ? "Ouvrir" : estPaquet(e.nom) ? "Récupérer sur mon bureau" : "Ouvrir", icon: "↗", onClick: () => ouvrir(e) },
                        ...(!estPaquet(e.nom) ? [{ label: "Récupérer sur mon bureau", icon: "📥", onClick: () => { void recuperer(e); } }] : []),
                        { label: "Supprimer du bureau commun", icon: "🗑", danger: true, sep: true, onClick: () => { void supprimer(e); } },
                      ])} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {invitation && actif && <Invitation bureau={actif} onClose={() => setInvitation(false)} />}
      {ajout && <AjoutBureau onClose={() => setAjout(false)} onAjoute={(b) => { setAjout(false); void relireBureaux(); setActifId(b.id); }} />}
      {choixDepot && <ChoixDossier onClose={() => setChoixDepot(false)} onChoisir={(c) => { void deposerDeMonBureau(c); }} />}
      {demande && (
        <Demander titre={demande.titre} label={demande.label} valeur={demande.valeur}
          onClose={() => setDemande(null)} onValider={(v) => { setDemande(null); demande.sur(v); }} />
      )}
    </div>
  );
}

/** Un dossier, un dossier Maitrize ou un fichier du bureau commun. */
function Tuile({ entree: e, bureau, occupe, compact = false, onOuvrir, onMenu }: {
  entree: EntreeCommune; bureau: BureauCommun; occupe: boolean; compact?: boolean;
  onOuvrir: () => void; onMenu: (ev: React.MouseEvent) => void;
}) {
  const recent = e.modifie && Date.now() - new Date(e.modifie).getTime() < RECENT_MS;
  const paquet = !e.dossier && estPaquet(e.nom);
  return (
    <div data-entree draggable
      onDragStart={(ev) => {
        const depot: DepotCommun = { bureau: bureau.id, chemin: e.chemin, nom: e.nom, dossier: e.dossier };
        ev.dataTransfer.setData(TYPE_COMMUN, JSON.stringify(depot));
        ev.dataTransfer.effectAllowed = "copy";
      }}
      onDoubleClick={onOuvrir} onContextMenu={onMenu} title={e.nom}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10, position: "relative", opacity: occupe ? 0.5 : 1 }}
      onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
      {e.dossier ? (
        <IconeDossier couleur={COULEUR_DOSSIER} ouvert={false} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "var(--panel-2)",
          display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
          {paquet ? <span style={{ fontSize: compact ? 30 : 40 }}>📦</span>
            : estImage(e.nom) && e.octets <= APERCU_MAX ? <Apercu bureau={bureau} chemin={e.chemin} />
            : <span style={{ fontSize: compact ? 30 : 40 }}>{typeDocument(e.nom).icone}</span>}
        </div>
      )}
      {recent && (
        <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10, fontWeight: 700, background: "var(--accent)",
          color: "#fff", borderRadius: 999, padding: "1px 6px" }}>Nouveau</span>
      )}
      <div style={{ fontSize: compact ? 11.5 : 12.5, fontWeight: 600, marginTop: 5, lineHeight: 1.2, overflow: "hidden",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {paquet ? titreDuPaquet(e.nom) : e.nom}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--text-2)" }}>
        {occupe ? "Récupération…" : e.dossier ? `${e.elements} élément${e.elements > 1 ? "s" : ""}` : paquet ? "Dossier Maitrize" : taille(e.octets)}
      </div>
    </div>
  );
}

/** L'aperçu d'une image du bureau commun. */
function Apercu({ bureau, chemin }: { bureau: BureauCommun; chemin: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.communLire(bureau.id, chemin).then((b) => { if (vivant) setSrc(`data:image;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [bureau.id, chemin]);
  return src ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 34 }}>🖼</span>;
}

/** Tant qu'aucun bureau commun n'existe : comment faire, en trois gestes. */
function PremiersPas({ onAjouter, compact = false }: { onAjouter: () => void; compact?: boolean }) {
  if (compact) {
    return (
      <div className="card" style={{ fontSize: 13.5 }}>
        <b>Partager avec des collègues</b>
        <p style={{ color: "var(--text-2)", marginTop: 6 }}>
          Un bureau commun est un dossier partagé par Nuage, OneDrive ou Google Drive, synchronisé sur cet ordinateur.
        </p>
        <button className="btn primary sm" onClick={onAjouter}>+ Ajouter un bureau commun</button>
      </div>
    );
  }
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>Partager avec des collègues</h3>
      <p style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 0 }}>
        Un bureau commun est un dossier partagé. C'est votre service de stockage qui le partage : vous y choisissez
        vous-même, personne par personne, qui y a accès. Maitrize ne garde aucune clé.
      </p>
      <ol style={{ fontSize: 13.5, lineHeight: 1.7, paddingLeft: 20 }}>
        <li>Dans <b>Nuage</b> (apps.education.fr), créez un dossier et <b>partagez-le</b> avec vos collègues.</li>
        <li>Toujours dans Nuage : <b>Paramètres › Sécurité</b>, créez un <b>mot de passe d'application</b> pour Maitrize.</li>
        <li>Ici, <b>« Ajouter un bureau commun »</b> : choisissez Nuage, collez ce mot de passe, et le dossier partagé
          apparaît — sur le Mac comme sur le PC, sans rien installer. (Un dossier synchronisé par OneDrive ou Google Drive
          sur cet ordinateur reste possible.)</li>
      </ol>
      <button className="btn primary" onClick={onAjouter}>+ Ajouter un bureau commun</button>
    </div>
  );
}

/** Ajouter un bureau commun : choisir le dossier partagé, lui donner un nom. */
function AjoutBureau({ onClose, onAjoute }: { onClose: () => void; onAjoute: (b: BureauCommun) => void }) {
  // Deux façons d'atteindre le dossier partagé : Nuage directement — rien à
  // installer, et le Mac comme le PC y voient la même chose —, ou un dossier
  // de cet ordinateur, tenu à jour par l'application du service.
  const [sorte, setSorte] = React.useState<"nuage" | "lien" | "dossier">("nuage");
  const [chemin, setChemin] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [lien, setLien] = React.useState("");
  const [serveur, setServeur] = React.useState("");
  const [utilisateur, setUtilisateur] = React.useState("");
  const [motDePasse, setMotDePasse] = React.useState("");
  const [dossierDistant, setDossierDistant] = React.useState("");
  const [erreur, setErreur] = React.useState("");
  const [essai, setEssai] = React.useState(false);

  const choisir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const choix = await open({ directory: true, multiple: false, title: "Le dossier partagé avec vos collègues" });
    if (typeof choix === "string") {
      setChemin(choix);
      if (!nom.trim()) setNom(choix.split(/[\\/]/).filter(Boolean).pop() ?? "");
    }
  };

  const ajouter = async () => {
    setErreur(""); setEssai(true);
    try {
      onAjoute(sorte === "nuage" ? await api.communAjouterNuage(nom, serveur, utilisateur, motDePasse, dossierDistant)
        : sorte === "lien" ? await api.communAjouterLien(nom, lien, motDePasse, dossierDistant)
        : await api.communAjouter(nom, chemin));
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setEssai(false);
    }
  };

  const pret = sorte === "nuage" ? !!(serveur.trim() && utilisateur.trim() && motDePasse.trim())
    : sorte === "lien" ? !!lien.trim()
    : !!chemin;
  return (
    <Modal titre="Ajouter un bureau commun" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!pret || essai} onClick={() => { void ajouter(); }}>
          {essai ? "Connexion…" : sorte === "dossier" ? "Ajouter" : "Se connecter"}
        </button>
      </>}>
      <Field label="Où est le dossier partagé ?">
        <div className="seg" style={{ flexWrap: "wrap" }}>
          <button className={sorte === "nuage" ? "active" : ""} onClick={() => setSorte("nuage")}>☁️ Mon Nuage</button>
          <button className={sorte === "lien" ? "active" : ""} onClick={() => setSorte("lien")}>🔗 Un lien de partage</button>
          <button className={sorte === "dossier" ? "active" : ""} onClick={() => setSorte("dossier")}>💻 Un dossier de cet ordinateur</button>
        </div>
      </Field>

      {sorte === "lien" ? (
        <>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
            Un collègue vous a envoyé un lien de partage ? Collez-le ici : vous n'avez besoin d'aucun compte, et personne
            ne donne son mot de passe. Le lien n'ouvre que le dossier partagé.
          </p>
          <Field label="Lien de partage">
            <Input placeholder="https://nuage03.apps.education.fr/s/aBcD1234" value={lien} onChange={(e) => setLien(e.target.value)} />
          </Field>
          <div className="row">
            <Field label="Mot de passe du lien (s'il y en a un)">
              <Input type="password" autoComplete="off" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
            </Field>
            <Field label="Nom du bureau commun">
              <Input placeholder="Équipe de l'IME" value={nom} onChange={(e) => setNom(e.target.value)} />
            </Field>
          </div>
        </>
      ) : sorte === "nuage" ? (
        <>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
            Pour <b>votre</b> Nuage. Maitrize s'y connecte : le bureau commun <b>est</b> votre dossier Nuage, identique sur le
            Mac et sur le PC, sans rien installer. Dans Nuage, allez dans <b>Paramètres › Sécurité › Mot de passe
            d'application</b>, créez-en un pour Maitrize, et recopiez-le ici — il ne se donne à personne, et se révoque
            là-bas quand vous voulez. Pour inviter un collègue, vous lui enverrez un <b>lien de partage</b> (menu ⋯ du
            bureau commun).
          </p>
          <Field label="Adresse de Nuage">
            <Input placeholder="nuage03.apps.education.fr" value={serveur} onChange={(e) => setServeur(e.target.value)} />
          </Field>
          <div className="row">
            <Field label="Identifiant">
              <Input placeholder="prenom.nom" value={utilisateur} onChange={(e) => setUtilisateur(e.target.value)} />
            </Field>
            <Field label="Mot de passe d'application">
              <Input type="password" autoComplete="off" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
            </Field>
          </div>
          <Field label="Dossier partagé dans Nuage (facultatif)">
            <Input placeholder="Équipe IME" value={dossierDistant} onChange={(e) => setDossierDistant(e.target.value)} />
          </Field>
          <Field label="Nom du bureau commun">
            <Input placeholder="Équipe de l'IME" value={nom} onChange={(e) => setNom(e.target.value)} />
          </Field>
          <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            Le mot de passe d'application reste sur cet ordinateur : il ne part ni dans la synchronisation, ni dans les sauvegardes.
          </p>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
            Choisissez le dossier que l'application de votre service de stockage (Nuage, OneDrive, Google Drive…) synchronise
            sur cet ordinateur.
          </p>
          <Field label="Dossier partagé">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="btn" onClick={() => { void choisir(); }}>Choisir le dossier…</button>
              <span style={{ fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chemin || "Aucun"}</span>
            </div>
          </Field>
          <Field label="Nom"><Input placeholder="Équipe de l'IME" value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
        </>
      )}
      {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13, marginBottom: 0 }}>{erreur}</p>}
    </Modal>
  );
}

/**
 * Inviter un collègue sans lui donner quoi que ce soit de personnel : Nuage
 * fabrique un lien qui n'ouvre que ce dossier, avec son propre mot de passe.
 */
function Invitation({ bureau, onClose }: { bureau: BureauCommun; onClose: () => void }) {
  const [ecriture, setEcriture] = React.useState(true);
  const [motDePasse, setMotDePasse] = React.useState("");
  const [lien, setLien] = React.useState("");
  const [erreur, setErreur] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);

  const creer = async () => {
    setErreur(""); setOccupe(true);
    try {
      setLien(await api.communCreerLien(bureau.id, motDePasse, ecriture));
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Modal titre="🔗 Inviter un ami sur ce bureau commun" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>{lien ? "Terminé" : "Annuler"}</button>
        {!lien && <button className="btn primary" disabled={occupe} onClick={() => { void creer(); }}>
          {occupe ? "Création…" : "Créer le lien"}</button>}
      </>}>
      {lien ? (
        <>
          <p style={{ marginTop: 0, fontSize: 13.5 }}>
            Voici le lien. Envoyez-le à votre ami{motDePasse ? ", avec le mot de passe que vous venez de choisir (par un autre moyen : SMS, de vive voix)" : ""}.
            Dans son Maitrize : <b>Bureaux communs › Ajouter › 🔗 Un lien de partage</b>.
          </p>
          <Field label="Lien de partage">
            <Input value={lien} readOnly onFocus={(e) => e.currentTarget.select()} />
          </Field>
          <button className="btn sm" onClick={() => {
            navigator.clipboard?.writeText(lien).then(() => toast("Lien copié.", { icone: "🔗" })).catch(() => {});
          }}>📋 Copier le lien</button>
          <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            Ce lien n'ouvre que ce dossier : ni votre compte, ni le reste de votre Nuage. Vous pouvez le révoquer à tout
            moment dans Nuage (onglet Partage du dossier).
          </p>
        </>
      ) : (
        <>
          <p style={{ marginTop: 0, fontSize: 13.5, color: "var(--text-2)" }}>
            Votre ami n'a besoin d'aucun compte, et vous ne lui donnez pas votre mot de passe : Nuage fabrique un lien
            qui n'ouvre que le dossier « {bureau.nom} ».
          </p>
          <Field label="Ce que le lien permet">
            <div className="seg" style={{ flexWrap: "wrap" }}>
              <button className={ecriture ? "active" : ""} onClick={() => setEcriture(true)}>Déposer et modifier</button>
              <button className={!ecriture ? "active" : ""} onClick={() => setEcriture(false)}>Lire seulement</button>
            </div>
          </Field>
          <Field label="Mot de passe du lien (recommandé)">
            <Input type="password" autoComplete="off" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="un mot simple, donné de vive voix" />
          </Field>
          {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13 }}>{erreur}</p>}
        </>
      )}
    </Modal>
  );
}

/** Choisir un dossier de mon bureau à déposer. */
function ChoixDossier({ onClose, onChoisir }: { onClose: () => void; onChoisir: (chemin: string) => void }) {
  const [dossiers, setDossiers] = React.useState<string[] | null>(null);
  const [q, setQ] = React.useState("");
  React.useEffect(() => { dossiersDeMonBureau().then(setDossiers).catch(() => setDossiers([])); }, []);
  const cherche = q.trim().toLowerCase();
  const liste = (dossiers ?? []).filter((d) => !cherche || d.toLowerCase().includes(cherche));
  return (
    <Modal titre="Déposer un dossier de mon bureau" onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Annuler</button>}>
      <Input autoFocus placeholder="Chercher un dossier…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 8, display: "grid", gap: 4 }}>
        {dossiers === null ? <div style={{ color: "var(--text-2)" }}>Lecture…</div>
          : !liste.length ? <div style={{ color: "var(--text-2)", fontSize: 13 }}>Aucun dossier sur votre bureau.</div>
          : liste.map((d) => (
            <button key={d} className="list-row" style={{ textAlign: "left", border: "none", cursor: "pointer" }} onClick={() => onChoisir(d)}>
              <span>📁</span>
              <span style={{ flex: 1 }}>
                {d.split("/").slice(0, -1).map((p) => <span key={p} style={{ color: "var(--text-2)" }}>{p} › </span>)}
                <b>{d.split("/").pop()}</b>
              </span>
            </button>
          ))}
      </div>
    </Modal>
  );
}
