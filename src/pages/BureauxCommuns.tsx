import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, texteErreur, type BureauCommun, type EntreeCommune } from "../api";
import { Demander, Field, Input, Modal, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { IconeDossier, COULEUR_DOSSIER } from "../components/IconeDossier";
import { typeDocument, estImage } from "../dragdrop";
import { estPaquet, titreDuPaquet } from "../bureauCommun";
import {
  deposerDossier, dossiersDeMonBureau, dossiersPris, entreesDuDepot, poserFichiers,
  recupererDossier, recupererFichier, recupererPaquet,
} from "../partageCommun";

// ── Les bureaux communs ────────────────────────────────────────────────────
//
// Chaque bureau commun est un dossier partagé par un service de stockage —
// Nuage, OneDrive, Google Drive… — avec les collègues de son choix. On y
// glisse des fichiers et des dossiers depuis le Finder ou l'Explorateur, on y
// dépose des dossiers de son bureau, et l'on récupère ce que les autres ont
// posé : chacun garde son bureau, et prend ce qu'il veut, en copie.
//
// Qui y a accès se règle dans le service de stockage, personne par personne :
// Maitrize ne garde aucune clé.

/** Le dernier bureau commun ouvert, sur cet ordinateur. */
const CLE_ACTIF = "communs:actif";
/** Tant que la page est ouverte, on regarde ce que les collègues ont déposé. */
const RELECTURE_MS = 5000;
/** « Nouveau » pendant trois jours. */
const RECENT_MS = 3 * 86_400_000;
/** Au-delà, une image se montre par son icône : l'aperçu la chargerait entière. */
const APERCU_MAX = 8 * 1024 * 1024;

const taille = (octets: number) =>
  octets < 1024 ? `${octets} o` : octets < 1_048_576 ? `${Math.round(octets / 1024)} Ko` : `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo`;

export default function BureauxCommuns() {
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
    const id = window.setInterval(() => { if (!document.hidden) void relire(); }, RELECTURE_MS);
    const auRetour = () => { void relire(); };
    window.addEventListener("focus", auRetour);
    return () => { window.clearInterval(id); window.removeEventListener("focus", auRetour); };
  }, [relire]);

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
    <Page titre="Bureaux communs" sous="Des dossiers partagés avec vos collègues, par Nuage, OneDrive, Google Drive…"
      actions={<>
        <button className="btn" onClick={() => nav("/plan")}>← Mon bureau</button>
        <button className="btn primary" onClick={() => setAjout(true)}>+ Ajouter un bureau commun</button>
      </>}>

      {bureaux && !bureaux.length && <PremiersPas onAjouter={() => setAjout(true)} />}

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
            <button className="btn sm" disabled={!actif.present || !!occupe} onClick={() => setChoixDepot(true)}>📤 Déposer un dossier de mon bureau</button>
            <button className="btn ghost sm" disabled={!actif.present} onClick={() => setDemande({
              titre: "Nouveau dossier", label: "Nom du dossier",
              sur: (nom) => faire("dossier", async () => { await api.communCreerDossier(actif.id, dossier, nom); await relire(); }),
            })}>📁 Nouveau dossier</button>
            <button className="btn ghost sm" disabled={!actif.present} title="Ouvrir ce dossier dans le Finder ou l'Explorateur"
              onClick={() => api.communOuvrir(actif.id, dossier).catch((e) => toast(texteErreur(e), { icone: "⚠️" }))}>📂</button>
            <button className="btn ghost sm" title="Renommer, oublier…" onClick={(e) => openCtx(e, [
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
              synchronisé ? Sinon, oubliez ce bureau commun ici et ajoutez-le de nouveau en choisissant le bon dossier.
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                if (!Array.from(e.dataTransfer.types).includes("Files")) return;
                e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setSurvol(true);
              }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSurvol(false); }}
              onDrop={(e) => {
                if (!Array.from(e.dataTransfer.types).includes("Files")) return;
                e.preventDefault(); setSurvol(false);
                // Les dossiers glissés se lisent pendant l'événement, pas après.
                void poser(entreesDuDepot(e.dataTransfer));
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
                minHeight: "55vh", borderRadius: 12, padding: 14,
                border: survol ? "2px dashed var(--accent)" : "2px dashed transparent",
                background: survol ? "var(--panel-2)" : undefined, transition: "background .15s",
              }}>
              {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13 }}>{erreur}</p>}
              {entrees === null ? <p style={{ color: "var(--text-2)" }}>Lecture…</p> : !entrees.length ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-2)" }}>
                  <div style={{ fontSize: 44, marginBottom: 10 }}>🤝</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{dossier ? "Dossier vide" : "Rien pour l'instant"}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Glissez ici des fichiers ou des dossiers depuis le Finder ou l'Explorateur,<br />
                    ou déposez un dossier de votre bureau — séquences, jeux, outils, avec tout leur contenu.
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 14 }}>
                  {entrees.map((e) => (
                    <Tuile key={e.chemin} entree={e} bureau={actif} occupe={occupe === e.chemin}
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

      {ajout && <AjoutBureau onClose={() => setAjout(false)} onAjoute={(b) => { setAjout(false); void relireBureaux(); setActifId(b.id); }} />}
      {choixDepot && <ChoixDossier onClose={() => setChoixDepot(false)} onChoisir={(c) => { void deposerDeMonBureau(c); }} />}
      {demande && (
        <Demander titre={demande.titre} label={demande.label} valeur={demande.valeur}
          onClose={() => setDemande(null)} onValider={(v) => { setDemande(null); demande.sur(v); }} />
      )}
    </Page>
  );
}

/** Un dossier, un dossier Maitrize ou un fichier du bureau commun. */
function Tuile({ entree: e, bureau, occupe, onOuvrir, onMenu }: {
  entree: EntreeCommune; bureau: BureauCommun; occupe: boolean;
  onOuvrir: () => void; onMenu: (ev: React.MouseEvent) => void;
}) {
  const recent = e.modifie && Date.now() - new Date(e.modifie).getTime() < RECENT_MS;
  const paquet = !e.dossier && estPaquet(e.nom);
  return (
    <div data-entree onDoubleClick={onOuvrir} onContextMenu={onMenu} title={e.nom}
      style={{ cursor: "pointer", textAlign: "center", padding: 8, borderRadius: 10, position: "relative", opacity: occupe ? 0.5 : 1 }}
      onMouseEnter={(ev) => (ev.currentTarget.style.background = "var(--panel-2)")}
      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}>
      {e.dossier ? (
        <IconeDossier couleur={COULEUR_DOSSIER} ouvert={false} />
      ) : (
        <div style={{ width: "100%", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "var(--panel-2)",
          display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
          {paquet ? <span style={{ fontSize: 40 }}>📦</span>
            : estImage(e.nom) && e.octets <= APERCU_MAX ? <Apercu bureau={bureau} chemin={e.chemin} />
            : <span style={{ fontSize: 40 }}>{typeDocument(e.nom).icone}</span>}
        </div>
      )}
      {recent && (
        <span style={{ position: "absolute", top: 6, right: 6, fontSize: 10, fontWeight: 700, background: "var(--accent)",
          color: "#fff", borderRadius: 999, padding: "1px 6px" }}>Nouveau</span>
      )}
      <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 5, lineHeight: 1.2, overflow: "hidden",
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
function PremiersPas({ onAjouter }: { onAjouter: () => void }) {
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>Partager avec des collègues</h3>
      <p style={{ fontSize: 13.5, color: "var(--text-2)", marginTop: 0 }}>
        Un bureau commun est un dossier partagé. C'est votre service de stockage qui le partage : vous y choisissez
        vous-même, personne par personne, qui y a accès. Maitrize ne garde aucune clé.
      </p>
      <ol style={{ fontSize: 13.5, lineHeight: 1.7, paddingLeft: 20 }}>
        <li>Dans <b>Nuage</b> (apps.education.fr), OneDrive ou Google Drive, créez un dossier et <b>partagez-le</b> avec vos collègues.</li>
        <li>Installez l'<b>application de synchronisation</b> du service, pour que ce dossier soit aussi sur votre ordinateur.</li>
        <li>Ici, <b>« Ajouter un bureau commun »</b> et choisissez ce dossier. Vos collègues font de même de leur côté.</li>
      </ol>
      <button className="btn primary" onClick={onAjouter}>+ Ajouter un bureau commun</button>
    </div>
  );
}

/** Ajouter un bureau commun : choisir le dossier partagé, lui donner un nom. */
function AjoutBureau({ onClose, onAjoute }: { onClose: () => void; onAjoute: (b: BureauCommun) => void }) {
  const [chemin, setChemin] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [erreur, setErreur] = React.useState("");
  const choisir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const choix = await open({ directory: true, multiple: false, title: "Le dossier partagé avec vos collègues" });
    if (typeof choix === "string") {
      setChemin(choix);
      if (!nom.trim()) setNom(choix.split(/[\\/]/).filter(Boolean).pop() ?? "");
    }
  };
  return (
    <Modal titre="Ajouter un bureau commun" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!chemin}
          onClick={() => api.communAjouter(nom, chemin).then(onAjoute).catch((e) => setErreur(texteErreur(e)))}>Ajouter</button>
      </>}>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
        Choisissez le dossier que votre service de stockage (Nuage, OneDrive, Google Drive…) partage avec vos collègues
        et synchronise sur cet ordinateur.
      </p>
      <Field label="Dossier partagé">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn" onClick={() => { void choisir(); }}>Choisir le dossier…</button>
          <span style={{ fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chemin || "Aucun"}</span>
        </div>
      </Field>
      <Field label="Nom"><Input placeholder="Équipe de l'IME" value={nom} onChange={(e) => setNom(e.target.value)} /></Field>
      {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13, marginBottom: 0 }}>{erreur}</p>}
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
