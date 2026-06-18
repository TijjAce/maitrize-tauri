import React from "react";
import { api } from "../api";
import logo from "../assets/logo.png";

export const CGU_VERSION = 1;

export const CGU_TEXTE = `Conditions Générales d'Utilisation — Maitrize V2

Dernière mise à jour : juin 2026

1. Objet
Maitrize V2 est une application d'aide à la préparation et au suivi pédagogique destinée aux enseignants. Les présentes conditions régissent son utilisation. En utilisant l'application, vous reconnaissez les avoir lues et acceptées.

2. Données et confidentialité
Toutes vos données (séquences, séances, élèves, planning, documents, etc.) sont stockées localement sur votre appareil. L'application ne crée aucun compte et ne transmet pas vos données à un serveur, hormis les requêtes que vous initiez explicitement vers l'assistant IA (le texte envoyé transite alors vers le fournisseur d'IA configuré).

3. Données relatives aux élèves
Vous êtes seul responsable des données personnelles que vous saisissez, notamment celles concernant les élèves. Vous vous engagez à respecter la réglementation applicable (RGPD) : information des personnes, finalité légitime, durée de conservation limitée et sécurité des données. L'éditeur n'a pas accès à ces données.

4. Responsabilité
L'application est fournie « en l'état », sans garantie. L'éditeur ne saurait être tenu responsable d'une perte de données, d'une indisponibilité ou d'un dommage résultant de son utilisation. Il vous appartient de réaliser des sauvegardes régulières (export de données).

5. Propriété intellectuelle
L'application, son interface et son contenu sont protégés. Les contenus que vous créez restent votre propriété.

6. Sauvegarde
Vous êtes responsable de la sauvegarde de vos données via la fonction d'export disponible dans les Réglages.

7. Évolutions
Ces conditions peuvent évoluer. En cas de modification, votre acceptation vous sera redemandée au lancement.

8. Acceptation
En cochant la case et en validant, vous acceptez l'intégralité des présentes conditions. Votre acceptation est horodatée et associée à une empreinte de cette version, conservées localement dans l'application.`;

async function sha256(texte: string): Promise<string> {
  const data = new TextEncoder().encode(texte);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Acceptation enregistrée : { version, hash (empreinte du texte), accepteeLe (ISO) }. */
export interface CguAcceptation { version: number; hash: string; accepteeLe: string; }

export async function lireAcceptationCgu(): Promise<CguAcceptation | null> {
  try { return JSON.parse((await api.settingGet("cgu")) || ""); } catch { return null; }
}

/** Porte d'entrée : tant que les CGU (version courante) ne sont pas acceptées,
 *  l'application n'est pas accessible. */
export function CguGate({ children }: { children: React.ReactNode }) {
  const [etat, setEtat] = React.useState<"chargement" | "requis" | "accepte">("chargement");
  const [coche, setCoche] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const hash = await sha256(CGU_TEXTE);
      const acc = await lireAcceptationCgu();
      setEtat(acc && acc.hash === hash ? "accepte" : "requis");
    })();
  }, []);

  const accepter = async () => {
    setBusy(true);
    try {
      const hash = await sha256(CGU_TEXTE);
      const acc: CguAcceptation = { version: CGU_VERSION, hash, accepteeLe: new Date().toISOString() };
      await api.settingSet("cgu", JSON.stringify(acc));
      setEtat("accepte");
    } finally { setBusy(false); }
  };

  if (etat === "chargement") return null;
  if (etat === "accepte") return <>{children}</>;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="card" style={{ width: 720, maxWidth: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <img src={logo} style={{ width: 38, height: 38, borderRadius: 9 }} alt="" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Conditions Générales d'Utilisation</div>
            <div style={{ color: "var(--text-2)", fontSize: 12.5 }}>Lecture et acceptation requises pour utiliser Maitrize V2</div>
          </div>
        </div>
        <div style={{ overflow: "auto", padding: "16px 22px", whiteSpace: "pre-wrap", lineHeight: 1.55, fontSize: 13.5, flex: 1 }}>
          {CGU_TEXTE}
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 12 }}>
            <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} style={{ marginTop: 3 }} />
            <span style={{ fontSize: 13.5 }}>J'ai lu et j'accepte les présentes Conditions Générales d'Utilisation.</span>
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn primary" disabled={!coche || busy} onClick={accepter}>
              {busy ? "…" : "Accepter et continuer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
