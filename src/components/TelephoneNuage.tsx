import React from "react";
import { api, texteErreur, type CodeTelephone, type CompteConnu, type EtatRelais } from "../api";
import { Field, Input } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { EVT_RELEVE, derniereReleve, releverMaintenant, resumeDeLaReleve, type EtatReleve } from "../releveTelephone";

// ── Le téléphone par Nuage ────────────────────────────────────────────────
//
// Le partage WiFi demande que le téléphone et l'ordinateur soient allumés
// ensemble, sur le même réseau. Or on dicte en classe, l'ordinateur fermé
// dans le sac, et on le rouvre le soir, ailleurs. Par Nuage, chacun passe
// quand il peut : le téléphone dépose dès qu'il a du réseau, l'ordinateur
// relève dès qu'il est ouvert.
//
// On relie une fois, par un QR code. Il ne porte ni l'identifiant ni le mot
// de passe de Nuage : seulement un lien vers le dossier du relais, et la clé
// qui ferme les dépôts — pas celle qui les rouvre.

/** Le jour d'une échéance, en toutes lettres. */
function jourLisible(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const heure = (quand: number) => new Date(quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** Le compte que Maitrize garde déjà, et le compte à saisir : deux choix qui ne sont pas des bureaux communs. */
const GARDE = "garde", AUTRE = "autre";

export function TelephoneNuage() {
  const [etat, setEtat] = React.useState<EtatRelais | null>(null);
  const [comptes, setComptes] = React.useState<CompteConnu[]>([]);
  const [choix, setChoix] = React.useState("");
  const [serveur, setServeur] = React.useState("");
  const [utilisateur, setUtilisateur] = React.useState("");
  const [motDePasse, setMotDePasse] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [code, setCode] = React.useState<CodeTelephone | null>(null);
  const [codeOrdi, setCodeOrdi] = React.useState("");
  const [avecCode, setAvecCode] = React.useState(false);
  const [recu, setRecu] = React.useState("");
  const [releve, setReleve] = React.useState<EtatReleve | null>(derniereReleve());

  React.useEffect(() => {
    let vivant = true;
    Promise.all([api.telephoneEtat(), api.telephoneComptes().catch(() => [] as CompteConnu[])]).then(([e, c]) => {
      if (!vivant) return;
      setEtat(e); setComptes(c);
      // Le plus court d'abord : le compte déjà gardé, sinon celui d'un bureau commun, sinon la saisie.
      setChoix(e.compte ? GARDE : c[0]?.id ?? AUTRE);
    }).catch(() => { if (vivant) setEtat(null); });
    return () => { vivant = false; };
  }, []);

  React.useEffect(() => {
    const suivre = (e: Event) => setReleve((e as CustomEvent<EtatReleve>).detail);
    window.addEventListener(EVT_RELEVE, suivre);
    return () => window.removeEventListener(EVT_RELEVE, suivre);
  }, []);

  if (!etat) return null;

  const relier = async () => {
    setOccupe("Connexion à Nuage…"); setMessage("");
    try {
      const e = choix === AUTRE ? await api.telephoneRelier(undefined, { serveur, utilisateur, motDePasse })
        : choix === GARDE ? await api.telephoneRelier()
        : await api.telephoneRelier(choix);
      setEtat(e); setMotDePasse(""); setCodeOrdi("");
      // Le QR code tout de suite : c'est le geste suivant.
      setCode(await api.telephoneCode());
      releverMaintenant();
      toast("Téléphone relié par Nuage : scannez le QR code avec le dictaphone.", { icone: "☁️" });
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  const refaire = async () => {
    if (!(await confirmer("Refaire le lien ? L'ancien QR code ne vaudra plus : le téléphone devra scanner le nouveau, et l'autre ordinateur recevoir un nouveau code.", { oui: "Refaire le lien" }))) return;
    setChoix(GARDE);
    setOccupe("Connexion à Nuage…"); setMessage("");
    try {
      setEtat(await api.telephoneRelier());
      setCodeOrdi("");
      setCode(await api.telephoneCode());
      releverMaintenant();
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  const montrerLeQr = async () => {
    if (code) { setCode(null); return; }
    try { setCode(await api.telephoneCode()); } catch (e) { setMessage("❌ " + texteErreur(e)); }
  };

  const montrerLeCodeOrdi = async () => {
    if (codeOrdi) { setCodeOrdi(""); return; }
    try { setCodeOrdi(await api.telephoneCodeOrdinateur()); } catch (e) { setMessage("❌ " + texteErreur(e)); }
  };

  const appliquer = async () => {
    setOccupe("Vérification…"); setMessage("");
    try {
      setEtat(await api.telephoneCodeAppliquer(recu));
      setRecu(""); setAvecCode(false);
      releverMaintenant();
      toast("Cet ordinateur relève lui aussi ce que le téléphone dépose.", { icone: "☁️" });
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  const oublier = async () => {
    const question = etat.proprietaire
      ? "Oublier le relais ? Le lien est révoqué dans Nuage : le téléphone ne pourra plus déposer tant que vous ne l'aurez pas relié à nouveau."
      : "Oublier le relais sur cet ordinateur ? Il ne relèvera plus ce que le téléphone dépose ; l'autre ordinateur continue.";
    if (!(await confirmer(question, { oui: "Oublier", danger: true }))) return;
    setMessage("");
    try {
      setEtat(await api.telephoneOublier(false));
      setCode(null); setCodeOrdi("");
    } catch (e) {
      // Sans réseau, la révocation attend. On peut oublier ici, à condition de fermer le lien dans Nuage.
      const quandMeme = await confirmer(`${texteErreur(e)}\n\nOublier quand même sur cet ordinateur ? Il faudra supprimer le partage du dossier « ${etat.dossier} » dans Nuage.`, { oui: "Oublier quand même", danger: true });
      if (!quandMeme) return;
      try { setEtat(await api.telephoneOublier(true)); setCode(null); setCodeOrdi(""); }
      catch (e2) { setMessage("❌ " + texteErreur(e2)); }
    }
  };

  const saisieComplete = serveur.trim() && utilisateur.trim() && motDePasse.trim();
  const peutRelier = choix === AUTRE ? !!saisieComplete : !!choix;

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>☁️ Le téléphone par Nuage</h3>
        <div className="spacer" style={{ flex: 1 }} />
        <span className="meta" style={{ color: etat.relie ? "var(--green, #16a34a)" : undefined }}>
          {etat.relie ? `● Relié — ${etat.serveur}` : "○ Non relié"}
        </span>
      </div>
      <p style={{ color: "var(--text-2)", marginTop: 10, fontSize: 13, lineHeight: 1.6 }}>
        Sans WiFi commun ni partage à ouvrir : le <b>Dictaphone</b> dépose dictées et notes dans un dossier de votre
        Nuage dès qu'il a du réseau, et Maitrize les relève tout seul quand il est ouvert. Tout est chiffré avant de
        quitter le téléphone : Nuage ne voit que des fichiers fermés, et le
        téléphone lui-même ne peut pas les rouvrir. En retour, il reçoit l'emploi du temps des jours à venir — une
        heure et un intitulé, sans personne dedans.
      </p>

      {!etat.relie ? (
        <>
          {!avecCode && <>
            <Field label="Le compte Nuage qui portera le dossier du téléphone">
              <div style={{ display: "grid", gap: 6 }}>
                {etat.compte && (
                  <label className="pb-coche"><input type="radio" name="compte-nuage" checked={choix === GARDE} onChange={() => setChoix(GARDE)} />
                    <span>{etat.compte}</span></label>
                )}
                {comptes.map((c) => (
                  <label key={c.id} className="pb-coche"><input type="radio" name="compte-nuage" checked={choix === c.id} onChange={() => setChoix(c.id)} />
                    <span>{c.libelle} <span className="meta">— celui de vos bureaux communs</span></span></label>
                ))}
                {(etat.compte || comptes.length > 0) && (
                  <label className="pb-coche"><input type="radio" name="compte-nuage" checked={choix === AUTRE} onChange={() => setChoix(AUTRE)} />
                    <span>Un autre compte</span></label>
                )}
              </div>
            </Field>
            {choix === AUTRE && <>
              <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 12.5, lineHeight: 1.55 }}>
                Dans Nuage : <b>Paramètres › Sécurité › Mot de passe d'application</b>, créez-en un pour Maitrize —
                sans le limiter au seul accès aux fichiers — et recopiez-le ici. Il reste sur cet ordinateur : ni
                synchronisé, ni sauvegardé, et jamais donné au téléphone.
              </p>
              <Field label="Adresse de Nuage">
                <Input placeholder="nuage17.apps.education.fr" value={serveur} onChange={(e) => setServeur(e.target.value)} />
              </Field>
              <div className="row">
                <Field label="Identifiant">
                  <Input placeholder="prenom.nom" value={utilisateur} onChange={(e) => setUtilisateur(e.target.value)} />
                </Field>
                <Field label="Mot de passe d'application">
                  <Input type="password" autoComplete="off" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
                </Field>
              </div>
            </>}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn primary" disabled={!!occupe || !peutRelier} onClick={() => { void relier(); }}>
                {occupe || "☁️ Relier le téléphone"}
              </button>
              <button type="button" className="lien" style={{ fontSize: 12.5 }} onClick={() => { setAvecCode(true); setMessage(""); }}>
                Le téléphone est déjà relié sur l'autre ordinateur ?
              </button>
            </div>
          </>}
          {avecCode && <>
            <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 12.5, lineHeight: 1.55 }}>
              Sur l'ordinateur qui a relié le téléphone : Réglages › Téléphone › <b>Un second ordinateur doit relever aussi ?</b>
              Collez-le ici : cet ordinateur relèvera lui aussi, sans rien changer au téléphone.
            </p>
            <textarea className="input" rows={3} value={recu} onChange={(e) => setRecu(e.target.value)}
              placeholder="maitrize-relais-ordinateur:…" spellCheck={false}
              style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: 11.5 }} />
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
              <button className="btn primary" disabled={!!occupe || !recu.trim()} onClick={() => { void appliquer(); }}>
                {occupe || "Appliquer le code"}
              </button>
              <button className="btn ghost" onClick={() => { setAvecCode(false); setMessage(""); }}>Annuler</button>
            </div>
          </>}
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            Dossier <b>{etat.dossier}</b> de votre Nuage{etat.creeLe && <> · relié le {jourLisible(etat.creeLe)}</>}.
          </p>
          <p className="meta" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
            {releve ? <>Dernière relève à {heure(releve.quand)} — {resumeDeLaReleve(releve)}.</> : resumeDeLaReleve(null)}
          </p>
          {etat.expire && (
            <p className="meta" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
              Nuage fermera ce lien le {jourLisible(etat.expire)}. {etat.proprietaire
                ? "Maitrize repousse cette date de lui-même, tant que vous l'ouvrez de temps en temps."
                : "La date se repousse quand Maitrize est ouvert sur l'ordinateur qui a relié le téléphone."}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button className={`btn${code ? " primary" : ""}`} onClick={() => { void montrerLeQr(); }}>📷 QR code du téléphone</button>
            <button className="btn" onClick={() => { releverMaintenant(); toast("Relève en cours…", { icone: "☁️", duree: 3000 }); }}>↻ Relever maintenant</button>
            {etat.proprietaire && <button className="btn" disabled={!!occupe} onClick={() => { void refaire(); }}>{occupe || "Refaire le lien"}</button>}
            <button className="btn danger" onClick={() => { void oublier(); }}>Oublier</button>
          </div>

          {code && (
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <div className="qr-portable qr-relais" aria-label="QR code du relais" dangerouslySetInnerHTML={{ __html: code.qrSvg }} />
              <div style={{ minWidth: 220, flex: 1 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Dans le Dictaphone : « Relier par Nuage », puis pointez la caméra sur ce QR code.</p>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
                  Une seule fois : le téléphone le retient. Ce code ouvre le dossier du relais — ne le montrez pas en
                  classe, et refermez-le une fois scanné.
                </p>
                <button className="btn ghost sm" onClick={() => { void navigator.clipboard?.writeText(code.code); toast("Code copié : collez-le dans le Dictaphone.", { icone: "📋" }); }}>
                  Copier le code, pour le coller dans le téléphone
                </button>
              </div>
            </div>
          )}

          {/* Un second ordinateur est rare : son code ne tient pas la place d'un bouton. */}
          <p style={{ margin: "12px 0 0" }}>
            <button type="button" className="lien" style={{ fontSize: 12.5 }} onClick={() => { void montrerLeCodeOrdi(); }}>
              {codeOrdi ? "Refermer le code du second ordinateur" : "Un second ordinateur doit relever aussi ?"}
            </button>
          </p>
          {codeOrdi && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.55 }}>
                Sur l'autre ordinateur : Réglages › Téléphone › « Le téléphone est déjà relié sur l'autre ordinateur ? ».
                <b> Ce code vaut un mot de passe</b> : il porte la clé qui rouvre les dictées. Ne l'envoyez pas par
                courriel ; recopiez-le d'un écran à l'autre, ou passez par une clé USB.
              </p>
              <code style={{ display: "block", fontSize: 10.5, wordBreak: "break-all", maxHeight: 84, overflow: "auto", padding: 8, border: "1px solid var(--border)", borderRadius: 8 }}>{codeOrdi}</code>
              <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => { void navigator.clipboard?.writeText(codeOrdi); toast("Code copié.", { icone: "📋" }); }}>Copier</button>
            </div>
          )}
        </>
      )}

      {message && <p style={{ fontSize: 13, marginBottom: 0, marginTop: 12, lineHeight: 1.55 }}>{message}</p>}
    </div>
  );
}
