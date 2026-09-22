import React from "react";
import { api, texteErreur } from "../api";
import { Field, Input } from "./ui";
import { toast } from "./Toaster";

// ── Partager ses propres dossiers ─────────────────────────────────────────
//
// Rejoindre le partage d'un collègue ne demande qu'un lien : c'est le geste
// courant, il reste dans le bureau commun. Ouvrir son Nuage aux autres, en
// revanche, demande un serveur, un identifiant et un mot de passe
// d'application — une fois, et jamais plus. Cela n'a pas sa place dans un
// panneau qu'on ouvre en classe ; cela a sa place ici.

export function PartagerMesDossiers() {
  const [serveur, setServeur] = React.useState("");
  const [utilisateur, setUtilisateur] = React.useState("");
  const [motDePasse, setMotDePasse] = React.useState("");
  const [dossier, setDossier] = React.useState("");
  const [nom, setNom] = React.useState("");
  const [chemin, setChemin] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [message, setMessage] = React.useState("");

  const choisir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const choix = await open({ directory: true, multiple: false, title: "Le dossier partagé avec vos collègues" });
    if (typeof choix === "string") {
      setChemin(choix);
      if (!nom.trim()) setNom(choix.split(/[\\/]/).filter(Boolean).pop() ?? "");
    }
  };

  const creerDepuisNuage = async () => {
    setOccupe("Connexion à Nuage…"); setMessage("");
    try {
      const b = await api.communAjouterNuage(nom, serveur, utilisateur, motDePasse, dossier);
      setMessage(`✅ « ${b.nom} » est prêt. Ouvrez-le dans Plan de travail › 🤝 Bureaux communs, puis menu ⋯ › Inviter pour en tirer un lien à envoyer.`);
      setMotDePasse("");
      toast("Bureau commun créé.", { icone: "🤝" });
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  const ajouterLeDossier = async () => {
    setOccupe("Ajout…"); setMessage("");
    try {
      const b = await api.communAjouter(nom, chemin);
      setMessage(`✅ « ${b.nom} » est prêt, dans Plan de travail › 🤝 Bureaux communs.`);
      toast("Bureau commun ajouté.", { icone: "🤝" });
    } catch (e) {
      setMessage("❌ " + texteErreur(e));
    } finally { setOccupe(""); }
  };

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>🤝 Partager mes dossiers</h3>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13, lineHeight: 1.55 }}>
        Pour <b>rejoindre</b> le partage d'un collègue, rien à faire ici : son lien suffit, dans
        Plan de travail › 🤝 Bureaux communs. Cette page sert à <b>ouvrir vos propres dossiers</b> aux
        autres, une fois pour toutes.
      </p>

      <h4 style={{ margin: "14px 0 6px", fontSize: 14 }}>Depuis votre Nuage</h4>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 12.5, lineHeight: 1.55 }}>
        Dans Nuage : <b>Paramètres › Sécurité › Mot de passe d'application</b>, créez-en un pour
        Maitrize et recopiez-le ici. Il ne se donne à personne, se révoque là-bas quand vous voulez,
        et reste sur cet ordinateur — ni synchronisé, ni sauvegardé.
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
      <div className="row">
        <Field label="Dossier à partager (facultatif)">
          <Input placeholder="Équipe IME" value={dossier} onChange={(e) => setDossier(e.target.value)} />
        </Field>
        <Field label="Nom du bureau commun">
          <Input placeholder="Équipe de l'IME" value={nom} onChange={(e) => setNom(e.target.value)} />
        </Field>
      </div>
      <button className="btn primary" disabled={!!occupe || !(serveur.trim() && utilisateur.trim() && motDePasse.trim())}
        onClick={() => { void creerDepuisNuage(); }}>
        {occupe || "Créer le bureau commun"}
      </button>

      <h4 style={{ margin: "18px 0 6px", fontSize: 14 }}>…ou un dossier de cet ordinateur</h4>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 12.5, lineHeight: 1.55 }}>
        Le dossier que l'application de votre service (Nuage, OneDrive, Google Drive…) tient à jour
        sur cette machine.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" onClick={() => { void choisir(); }}>Choisir le dossier…</button>
        <span style={{ fontSize: 12.5, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
          {chemin || "Aucun"}
        </span>
        <button className="btn" disabled={!!occupe || !chemin} onClick={() => { void ajouterLeDossier(); }}>Ajouter</button>
      </div>

      {message && <p style={{ fontSize: 13, marginBottom: 0, marginTop: 12, lineHeight: 1.55 }}>{message}</p>}
    </div>
  );
}
