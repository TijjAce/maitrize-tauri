import React from "react";
import { api, newId, texteErreur, type DepotCommun, type InfoCommun, type SyncConfig } from "../api";
import { Field, Input, Modal, Textarea } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { lireCouleurs, PREFIXE_COULEUR, SANS_COULEUR } from "../dossiers";
import {
  compter, contenuDuDossier, couleursDeballees, couleursDuDossier, deballer, destinationLibre, fichiersDe,
  TAILLE_MAX, type Paquet,
} from "../bureauCommun";

// ── Le bureau commun ───────────────────────────────────────────────────────
//
// Chacun garde son bureau ; le bureau commun reçoit des dossiers entiers,
// qu'on y dépose et qu'on en récupère. Il vit sur le même bucket que le reste,
// dans son propre dossier : chacun n'y lit que ce qui est partagé, car tout y
// est chiffré, chaque chose avec sa clé.

/** Le nom sous lequel on dépose : celui de l'enseignant, sinon une formule neutre. */
async function auteur(): Promise<string> {
  return ((await api.settingGet("enseignantNom")) ?? "").trim() || "Un collègue";
}

/**
 * Dépose un dossier du bureau, entier, sur le bureau commun. Le redéposer
 * remplace le dépôt précédent du même dossier.
 */
export async function deposerSurLeBureauCommun(chemin: string): Promise<DepotCommun> {
  const [sequences, seances, pieces, materiels, textes, jeux, ateliers, espaces, outils, reglages] = await Promise.all([
    api.sequencesList(), api.seancesList(), api.piecesJointesList(), api.materielList(), api.textesList(),
    api.jeuxList(), api.ateliersList(), api.espacesList(), api.outilsClasseList(), api.settingsAll(),
  ]);
  const contenu = contenuDuDossier(chemin, { sequences, seances, pieces, materiels, textes, jeux, ateliers, espaces, outils });
  if (!compter(contenu)) throw new Error("Ce dossier est vide : rien à déposer.");
  const fichiers: Record<string, string> = {};
  let taille = 0;
  for (const nom of fichiersDe(contenu)) {
    // Un fichier disparu du disque ne doit pas empêcher de déposer le reste.
    try { fichiers[nom] = await api.fichierRead(nom); taille += fichiers[nom].length; } catch { continue; }
    if (taille > TAILLE_MAX) throw new Error("Ce dossier est trop lourd pour le bureau commun : déposez plutôt ses sous-dossiers.");
  }
  const qui = await auteur();
  const nom = chemin.slice(chemin.lastIndexOf("/") + 1);
  const paquet: Paquet = {
    v: 1, dossier: nom, auteur: qui, depose: new Date().toISOString(), contenu,
    couleurs: couleursDuDossier(chemin, lireCouleurs(reglages)), fichiers,
  };
  return api.communDeposer({ dossier: nom, auteur: qui, elements: compter(contenu), paquet: JSON.stringify(paquet) });
}

/**
 * Récupère un dossier du bureau commun sur son propre bureau, à la racine.
 * Rend le nom du dossier où il a été posé.
 */
export async function recupererDuBureauCommun(depot: DepotCommun, pris: Set<string>): Promise<string> {
  const paquet = JSON.parse(await api.communRecuperer(depot.id)) as Paquet;
  const destination = destinationLibre(paquet.dossier || depot.dossier, paquet.auteur || depot.auteur, pris);
  // Chaque fichier est réenregistré, sous un nouveau nom : on garde la correspondance.
  const renommes = new Map<string, string>();
  for (const [nom, contenu] of Object.entries(paquet.fichiers ?? {})) {
    try { renommes.set(nom, await api.fichierSave(nom, contenu)); } catch { /* les autres passent */ }
  }
  const c = deballer(paquet, destination, (n) => renommes.get(n) ?? n, newId);
  // Dans l'ordre des liens : la séquence avant ses séances, la séance avant ses pièces.
  for (const s of c.sequences) await api.sequenceSave(s);
  for (const s of c.seances) await api.seanceSave(s);
  for (const x of c.pieces) await api.pieceJointeSave(x);
  for (const m of c.materiels) await api.materielSave(m);
  for (const t of c.textes) await api.texteSave(t);
  for (const j of c.jeux) await api.jeuSave(j);
  for (const a of c.ateliers) await api.atelierSave(a);
  for (const e of c.espaces) await api.espaceSave(e);
  for (const o of c.outils) await api.outilClasseSave(o);
  // Le dossier existe même s'il ne contenait que des sous-dossiers, avec ses couleurs.
  const couleurs = couleursDeballees(paquet, destination);
  if (!couleurs[destination]) couleurs[destination] = SANS_COULEUR;
  for (const [chemin, valeur] of Object.entries(couleurs)) await api.settingSet(PREFIXE_COULEUR + chemin, valeur);
  return destination;
}

const taille = (octets: number) => (octets < 1_048_576 ? `${Math.max(1, Math.round(octets / 1024))} Ko` : `${(octets / 1_048_576).toFixed(1).replace(".", ",")} Mo`);
const quand = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** La fenêtre du bureau commun : le créer ou le rejoindre, puis y récupérer des dossiers. */
export function BureauCommun({ dossiersPris, onRecupere, onClose }: {
  /** Les dossiers déjà à la racine du bureau, pour ne pas mêler ce qu'on récupère à l'existant. */
  dossiersPris: Set<string>;
  onRecupere: (destination: string) => void;
  onClose: () => void;
}) {
  const [info, setInfo] = React.useState<InfoCommun | null | undefined>(undefined);
  const [depots, setDepots] = React.useState<DepotCommun[] | null>(null);
  const [moi, setMoi] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [erreur, setErreur] = React.useState("");
  const [voirCode, setVoirCode] = React.useState(false);

  const relire = React.useCallback(async () => {
    setErreur("");
    try {
      const i = await api.communInfo();
      setInfo(i);
      setMoi(await auteur());
      if (i) setDepots(await api.communLister());
    } catch (e) {
      setErreur(texteErreur(e));
    }
  }, []);
  React.useEffect(() => { void relire(); }, [relire]);

  const faire = async (quoi: string, f: () => Promise<void>) => {
    setOccupe(quoi); setErreur("");
    try { await f(); } catch (e) { setErreur(texteErreur(e)); } finally { setOccupe(""); }
  };

  return (
    <Modal titre={info ? `🤝 ${info.nom}` : "🤝 Bureau commun"} onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {info === undefined && <p style={{ color: "var(--text-2)" }}>Lecture…</p>}
      {info === null && <Creation occupe={occupe} faire={faire} onPret={relire} />}
      {info && (
        <>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
            Chacun garde son bureau. Pour partager un dossier : <b>clic droit sur le dossier › Déposer sur le bureau
            commun</b>. Pour en prendre un : <b>Récupérer</b> ci-dessous — il arrive sur votre bureau, en copie à vous.
          </p>

          {depots === null ? <p style={{ color: "var(--text-2)" }}>Lecture du bureau commun…</p>
            : !depots.length ? (
              <div style={{ textAlign: "center", padding: "24px 12px", color: "var(--text-2)" }}>
                <div style={{ fontSize: 36 }}>🗂</div>
                Rien pour l'instant sur le bureau commun.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {depots.map((d) => (
                  <div key={d.id} className="list-row" style={{ alignItems: "center" }}>
                    <span style={{ fontSize: 22 }}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title">{d.dossier}</div>
                      <div className="meta">
                        {d.auteur} · {quand(d.date)} · {d.elements} élément{d.elements > 1 ? "s" : ""} · {taille(d.octets)}
                      </div>
                    </div>
                    {d.auteur.trim().toLowerCase() === moi.trim().toLowerCase() && (
                      <button className="btn ghost sm" disabled={!!occupe} title="Retirer votre dépôt du bureau commun"
                        onClick={() => faire("retrait", async () => {
                          if (!(await confirmer(`Retirer « ${d.dossier} » du bureau commun ? Vos collègues ne pourront plus le récupérer ; votre dossier, lui, reste sur votre bureau.`, { oui: "Retirer", danger: true }))) return;
                          await api.communRetirer(d.id);
                          setDepots(await api.communLister());
                        })}>Retirer</button>
                    )}
                    <button className="btn sm primary" disabled={!!occupe}
                      onClick={() => faire(d.id, async () => {
                        const ou = await recupererDuBureauCommun(d, dossiersPris);
                        toast(`« ${d.dossier} » récupéré dans le dossier « ${ou} » de votre bureau.`, { icone: "📥" });
                        onRecupere(ou);
                      })}>
                      {occupe === d.id ? "Récupération…" : "⬇ Récupérer"}
                    </button>
                  </div>
                ))}
              </div>
            )}

          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn sm" onClick={() => setVoirCode(!voirCode)}>🔑 Code pour un collègue</button>
            <button className="btn sm" disabled={!!occupe} onClick={() => faire("liste", async () => setDepots(await api.communLister()))}>
              ↻ Actualiser
            </button>
            <div className="spacer" />
            <button className="btn ghost sm" disabled={!!occupe}
              onClick={() => faire("quitter", async () => {
                if (!(await confirmer("Oublier le bureau commun sur cet ordinateur ? Rien n'est effacé du bureau commun ; vous pourrez le rejoindre de nouveau avec son code.", { oui: "Oublier" }))) return;
                await api.communQuitter();
                setDepots(null);
                await relire();
              })}>Quitter ce bureau commun</button>
          </div>
          {voirCode && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 6 }}>
                Ce code donne accès au bureau commun — lire et déposer. Transmettez-le en main propre ou par un
                message privé, et collez-le aussi sur votre autre ordinateur.
              </div>
              <Textarea readOnly rows={3} value={info.code} onFocus={(e) => e.currentTarget.select()}
                style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5 }} />
              <button className="btn sm" style={{ marginTop: 6 }}
                onClick={() => navigator.clipboard.writeText(info.code)
                  .then(() => toast("Code copié.", { icone: "🔑" }))
                  .catch(() => toast("Copie impossible : sélectionnez le code et copiez-le.", { icone: "⚠️" }))}>
                Copier le code
              </button>
            </div>
          )}
        </>
      )}
      {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13, marginBottom: 0 }}>{erreur}</p>}
    </Modal>
  );
}

/** Créer un bureau commun, ou en rejoindre un avec le code reçu. */
function Creation({ occupe, faire, onPret }: {
  occupe: string;
  faire: (quoi: string, f: () => Promise<void>) => Promise<void>;
  onPret: () => void;
}) {
  const [code, setCode] = React.useState("");
  const [stockage, setStockage] = React.useState<SyncConfig | null | undefined>(undefined);
  const [s, setS] = React.useState({ nom: "", endpoint: "", region: "", bucket: "", access: "", secret: "" });
  const [cleLimitee, setCleLimitee] = React.useState(false);
  const up = (k: keyof typeof s) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value });

  React.useEffect(() => {
    api.syncConfigGet().then(setStockage).catch(() => setStockage(null));
  }, []);
  // Un seul bucket : celui déjà réglé pour les sauvegardes, s'il l'est.
  const dejaRegle = Boolean(stockage?.endpoint && stockage?.bucket && stockage?.access && stockage?.aSecret);
  const pret = dejaRegle
    ? (!cleLimitee || (s.access.trim() && s.secret.trim()))
    : (s.endpoint.trim() && s.bucket.trim() && s.access.trim() && s.secret.trim());

  return (
    <>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
        Un bureau commun partage des dossiers entiers avec des collègues : chacun y dépose les siens et récupère
        ceux des autres, en copie. Il se range sur le même bucket que le reste, dans son propre dossier, et
        chacun n'y lit <b>que ce qui est partagé</b> : tout y est chiffré, chaque chose avec sa clé.
      </p>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Rejoindre avec un code</h3>
        <p style={{ marginTop: 0, fontSize: 12.5, color: "var(--text-2)" }}>
          Le code suffit : pas besoin d'y ranger vos propres sauvegardes.
        </p>
        <Textarea rows={3} placeholder="MZC1.…" value={code} onChange={(e) => setCode(e.target.value)}
          style={{ fontFamily: "ui-monospace, monospace", fontSize: 11.5 }} />
        <button className="btn primary" style={{ marginTop: 8 }} disabled={!code.trim() || !!occupe}
          onClick={() => faire("rejoindre", async () => { await api.communRejoindre(code); onPret(); })}>
          {occupe === "rejoindre" ? "Connexion…" : "Rejoindre"}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Ou créer le bureau commun</h3>
        <Field label="Nom"><Input placeholder="Collègues de l'IME" value={s.nom} onChange={up("nom")} /></Field>
        {stockage === undefined ? null : dejaRegle ? (
          <>
            <p style={{ fontSize: 13, margin: "4px 0 8px" }}>
              Sur votre stockage : <b>{stockage!.bucket}</b> <span style={{ color: "var(--text-2)" }}>({stockage!.endpoint})</span>
            </p>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={cleLimitee} onChange={(e) => setCleLimitee(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Donner à mes collègues une clé limitée au partage
                <span style={{ display: "block", fontSize: 12, color: "var(--text-2)" }}>
                  Sans elle, ils reçoivent votre clé : ils ne pourront pas lire vos sauvegardes, chiffrées, mais pourraient
                  les voir passer ou les effacer. Créez chez votre hébergeur une clé limitée au dossier
                  « maitrize-commun/ » du bucket, et saisissez-la ici.
                </span>
              </span>
            </label>
            {cleLimitee && (
              <div className="row" style={{ marginTop: 8 }}>
                <Field label="Clé d'accès limitée"><Input value={s.access} onChange={up("access")} /></Field>
                <Field label="Clé secrète limitée"><Input type="password" value={s.secret} onChange={up("secret")} /></Field>
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "4px 0 8px" }}>
              Aucun stockage n'est encore réglé. Celui-ci servira au partage ; y ranger aussi vos sauvegardes reste
              facultatif (Réglages › Données & synchro).
            </p>
            <div className="row">
              <Field label="Adresse du stockage (endpoint)"><Input placeholder="https://s3.fr-par.scw.cloud" value={s.endpoint} onChange={up("endpoint")} /></Field>
              <Field label="Région"><Input placeholder="fr-par" value={s.region} onChange={up("region")} /></Field>
            </div>
            <Field label="Bucket"><Input placeholder="maitrize" value={s.bucket} onChange={up("bucket")} /></Field>
            <div className="row">
              <Field label="Clé d'accès"><Input value={s.access} onChange={up("access")} /></Field>
              <Field label="Clé secrète"><Input type="password" value={s.secret} onChange={up("secret")} /></Field>
            </div>
          </>
        )}
        <button className="btn primary" style={{ marginTop: 8 }} disabled={!pret || !!occupe}
          onClick={() => faire("creer", async () => {
            // Stockage réglé : seule la clé limitée, si on en donne une, part avec le nom.
            await api.communCreer(dejaRegle
              ? { nom: s.nom, endpoint: "", region: "", bucket: "", access: cleLimitee ? s.access : "", secret: cleLimitee ? s.secret : "" }
              : s);
            onPret();
          })}>
          {occupe === "creer" ? "Vérification du stockage…" : "Créer le bureau commun"}
        </button>
      </div>
    </>
  );
}
