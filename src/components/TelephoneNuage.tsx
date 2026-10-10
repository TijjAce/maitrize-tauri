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
// Le dossier n'est ouvert qu'au compte Nuage de l'enseignant. On relie une
// fois, par un QR code qui ne porte aucun mot de passe : il dit où est le
// dossier et dans quel compte, avec la clé qui ferme les dépôts — pas celle
// qui les rouvre. Le téléphone se connecte ensuite lui-même à ce compte.

/** Le jour d'une date, en toutes lettres. */
function jourLisible(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const heure = (quand: number) => new Date(quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
/** « aujourd'hui à 17:30 », « hier à 9:05 », « le 2 octobre à 17:30 ». */
function quandLisible(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jour = (x: Date) => x.toDateString();
  const hier = new Date(); hier.setDate(hier.getDate() - 1);
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (jour(d) === jour(new Date())) return `aujourd'hui à ${h}`;
  if (jour(d) === jour(hier)) return `hier à ${h}`;
  return `le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${h}`;
}

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
    const suivre = (e: Event) => {
      const r = (e as CustomEvent<EtatReleve>).detail;
      setReleve(r);
      // L'emploi du temps vient de partir : sa ligne le dit aussitôt.
      if (r.bilan?.agendaPublie) api.telephoneEtat().then(setEtat).catch(() => {});
    };
    window.addEventListener(EVT_RELEVE, suivre);
    return () => window.removeEventListener(EVT_RELEVE, suivre);
  }, []);

  if (!etat) return null;

  /** Le compte choisi, tel que Rust l'attend : un bureau commun, une saisie, ou celui que Maitrize garde. */
  const leCompte = (): [string | undefined, { serveur: string; utilisateur: string; motDePasse: string } | undefined] =>
    choix === AUTRE ? [undefined, { serveur, utilisateur, motDePasse }] : choix === GARDE ? [undefined, undefined] : [choix, undefined];

  /** Relie, ou relie à nouveau : le QR code tout de suite, c'est le geste suivant. */
  const relierAvec = async (bureau?: string, compte?: { serveur: string; utilisateur: string; motDePasse: string }) => {
    setOccupe("Connexion à Nuage…"); setMessage("");
    try {
      setEtat(await api.telephoneRelier(bureau, compte));
      setMotDePasse(""); setCodeOrdi("");
      setCode(await api.telephoneCode());
      releverMaintenant();
      return true;
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
      return false;
    } finally { setOccupe(""); }
  };

  const relier = async () => {
    if (await relierAvec(...leCompte())) {
      toast("Téléphone relié par Nuage : scannez le QR code avec le Dictaphone, puis connectez-vous à votre compte.", { icone: "☁️" });
    }
  };

  const refaire = async () => {
    if (!(await confirmer("Refaire le lien ? Les clés changent : le téléphone devra scanner le nouveau QR code — il reste connecté à votre compte —, et l'autre ordinateur recevoir un nouveau code.", { oui: "Refaire le lien" }))) return;
    setChoix(GARDE);
    await relierAvec();
  };

  /** Un relais d'avant : son lien de partage est supprimé de Nuage, et le dossier n'est plus ouvert qu'au compte. */
  const reserver = async () => {
    if (!(await confirmer("Réserver le dossier du téléphone à votre compte ? Le lien de partage est supprimé de Nuage. Sur le téléphone, mettez le Dictaphone à jour, scannez le nouveau QR code, puis connectez-vous à votre compte Nuage.", { oui: "Réserver à mon compte" }))) return;
    setChoix(GARDE);
    if (await relierAvec()) {
      toast("Le lien de partage est supprimé : seul votre compte ouvre désormais le dossier du téléphone.", { icone: "🔒", duree: 9000 });
    }
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
      setEtat(await api.telephoneCodeAppliquer(recu, ...leCompte()));
      setRecu(""); setAvecCode(false); setMotDePasse("");
      releverMaintenant();
      toast("Cet ordinateur relève lui aussi ce que le téléphone dépose.", { icone: "☁️" });
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  const oublier = async () => {
    const question = etat.parLien
      ? etat.proprietaire
        ? "Oublier le relais ? Le lien de partage est supprimé de Nuage : le téléphone ne pourra plus déposer tant que vous ne l'aurez pas relié à nouveau."
        : "Oublier le relais sur cet ordinateur ? Il ne relèvera plus ce que le téléphone dépose."
      : "Oublier le relais sur cet ordinateur ? Il ne relèvera plus ce que le téléphone dépose. Le téléphone garde son accès à votre Nuage tant que vous ne l'oubliez pas aussi dans le Dictaphone, ou que vous ne le lui retirez pas dans Nuage › Paramètres › Sécurité.";
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

  /** Le compte qui portera le dossier, ou qui y entrera depuis ce second ordinateur. */
  const choixDuCompte = (titre: string) => <>
    <Field label={titre}>
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
        Dans Nuage : <b>Paramètres › Sécurité › Mot de passe d'application</b>, créez-en un pour Maitrize et
        recopiez-le ici. Il reste sur cet ordinateur — ses copies de sécurité locales comprises : il ne part ni dans la
        synchronisation, ni dans la sauvegarde en ligne, et n'est jamais donné au téléphone.
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
  </>;

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
        Le <b>Dictaphone</b> dépose dictées, notes et photos dans un dossier de votre Nuage dès qu'il a du réseau — c'est
        leur seul chemin —, et Maitrize les relève tout seul quand il est ouvert ; une photo nommée rejoint Mes pictos. Ce dossier n'est ouvert qu'à
        <b> votre compte</b> : aucun lien de partage, aucun mot de passe dans le QR code — le téléphone s'y connecte
        lui-même, avec votre compte. Tout est chiffré avant de quitter le téléphone : Nuage ne voit que des fichiers
        fermés, et le téléphone lui-même ne peut pas les rouvrir. En retour, il reçoit l'emploi du temps — une heure
        et un intitulé, sans personne dedans.
      </p>

      {!etat.relie ? (
        <>
          {!avecCode && <>
            {choixDuCompte("Le compte Nuage qui portera le dossier du téléphone")}
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
            {choixDuCompte("Votre compte Nuage — le même que sur l'autre ordinateur")}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
              <button className="btn primary" disabled={!!occupe || !recu.trim() || !peutRelier} onClick={() => { void appliquer(); }}>
                {occupe || "Appliquer le code"}
              </button>
              <button className="btn ghost" onClick={() => { setAvecCode(false); setMessage(""); }}>Annuler</button>
            </div>
          </>}
        </>
      ) : (
        <>
          {etat.parLien && (
            <div style={{ border: "1px solid var(--orange, #d97706)", borderRadius: 10, padding: "10px 12px", margin: "0 0 12px", fontSize: 13, lineHeight: 1.55 }}>
              <p style={{ margin: "0 0 8px" }}>
                🔓 Ce dossier s'ouvre encore par un <b>lien de partage</b> protégé par un mot de passe : quiconque
                détient l'ancien QR code peut y entrer. Réservez-le à votre compte : le lien sera supprimé de Nuage.
              </p>
              {etat.proprietaire
                ? <button className="btn primary" disabled={!!occupe} onClick={() => { void reserver(); }}>{occupe || "🔒 Réserver le dossier à mon compte"}</button>
                : <p className="meta" style={{ margin: 0, fontSize: 12.5 }}>Faites-le depuis l'ordinateur qui a relié le téléphone, puis recopiez ici le nouveau code de cet ordinateur.</p>}
            </div>
          )}
          <p style={{ margin: "0 0 4px", fontSize: 13 }}>
            Dossier <b>{etat.dossier}</b> de votre Nuage
            {etat.compteDuDossier && <>, ouvert au seul compte <b>{etat.compteDuDossier}</b></>}
            {etat.creeLe && <> · relié le {jourLisible(etat.creeLe)}</>}.
          </p>
          <p className="meta" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
            {releve ? <>Dernière relève à {heure(releve.quand)} — {resumeDeLaReleve(releve)}.</> : resumeDeLaReleve(null)}
          </p>
          <p className="meta" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
            {etat.agendaPublieLe
              ? <>📅 Emploi du temps envoyé au téléphone {quandLisible(etat.agendaPublieLe)} : les deux semaines passées et les deux à venir. Il repart de lui-même dès qu'un créneau change.</>
              : <>📅 L'emploi du temps n'est pas encore parti vers le téléphone : il part à la prochaine relève.</>}
          </p>
          {!etat.parLien && (
            <p className="meta" style={{ margin: "0 0 4px", fontSize: 12.5 }}>
              Le téléphone figure dans Nuage › Paramètres › Sécurité › <i>Appareils et sessions</i>, sous le nom
              « Maitrize Dictaphone » : c'est de là qu'on lui retire l'accès, s'il se perd.
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {!etat.parLien && <button className={`btn${code ? " primary" : ""}`} onClick={() => { void montrerLeQr(); }}>📷 QR code du téléphone</button>}
            <button className="btn" onClick={() => { releverMaintenant(); toast("Relève en cours…", { icone: "☁️", duree: 3000 }); }}>↻ Relever maintenant</button>
            {etat.proprietaire && !etat.parLien && <button className="btn" disabled={!!occupe} onClick={() => { void refaire(); }}>{occupe || "Refaire le lien"}</button>}
            <button className="btn danger" onClick={() => { void oublier(); }}>Oublier</button>
          </div>

          {code && (
            <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
              <div className="qr-portable qr-relais" aria-label="QR code du relais" dangerouslySetInnerHTML={{ __html: code.qrSvg }} />
              <div style={{ minWidth: 220, flex: 1 }}>
                <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                  Dans le Dictaphone : « Relier à l'ordinateur », scannez ce QR code, puis « Se connecter » avec votre
                  compte Nuage{etat.compteDuDossier && <> (<b>{etat.compteDuDossier}</b>)</>}.
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-2)", lineHeight: 1.55 }}>
                  Ce code ne contient aucun mot de passe : sans votre compte, il n'ouvre rien. Il porte la clé de
                  l'emploi du temps — refermez-le une fois scanné.
                </p>
              </div>
            </div>
          )}

          {/* Un second ordinateur est rare : son code ne tient pas la place d'un bouton. */}
          {!etat.parLien && (
            <p style={{ margin: "12px 0 0" }}>
              <button type="button" className="lien" style={{ fontSize: 12.5 }} onClick={() => { void montrerLeCodeOrdi(); }}>
                {codeOrdi ? "Refermer le code du second ordinateur" : "Un second ordinateur doit relever aussi ?"}
              </button>
            </p>
          )}
          {codeOrdi && (
            <div style={{ marginTop: 8 }}>
              <p style={{ margin: "0 0 6px", fontSize: 12.5, lineHeight: 1.55 }}>
                Sur l'autre ordinateur : Réglages › Téléphone › « Le téléphone est déjà relié sur l'autre ordinateur ? »,
                avec le même compte Nuage. <b>Ce code vaut un mot de passe</b> : il porte la clé qui rouvre les dictées.
                Ne l'envoyez pas par courriel ; recopiez-le d'un écran à l'autre, ou passez par une clé USB.
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
