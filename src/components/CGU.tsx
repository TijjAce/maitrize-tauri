import React from "react";
import { api } from "../api";
import logo from "../assets/logo.png";

export const CGU_VERSION = 2;

export const CGU_TEXTE = `Conditions d'utilisation — Maîtrize

Dernière mise à jour : 9 octobre 2026

1. Objet
Maîtrize est un logiciel gratuit d'aide à la préparation de la classe et au suivi des élèves, destiné aux enseignants. Ces conditions encadrent son utilisation ; en l'utilisant, vous les acceptez.

2. Licence
Maîtrize est un logiciel libre, distribué sous la licence GNU Affero General Public License, version 3 (AGPL-3.0) : vous pouvez l'utiliser, l'étudier, le modifier et le redistribuer selon cette licence. Son code source est public : https://github.com/TijjAce/maitrize-tauri. Les composants tiers — bibliothèques, pictogrammes ARASAAC, Sclera et F. Bajard — gardent leurs propres licences : voir Réglages › Licences.

3. Où sont vos données
Vos données restent sur cet ordinateur, dans le dossier de l'application. Maîtrize ne crée aucun compte et n'envoie rien à son éditeur. Ne sortent de l'ordinateur que :
- ce que vous confiez à l'assistant IA (Mistral AI, avec votre propre clé et selon vos conditions avec Mistral) : les noms des élèves et des personnes que l'application connaît sont remplacés par des marqueurs avant l'envoi et remis à leur place au retour ; le reste du texte part tel que vous l'avez écrit ;
- la voix, si vous choisissez vous-même la transcription en ligne (Mistral) ; sinon elle est transcrite sur l'ordinateur ;
- la synchronisation et la sauvegarde que vous configurez, chiffrées, vers votre propre stockage ;
- ce que vous déposez sur un bureau commun ou envoyez à un collègue ;
- ce qui va à votre téléphone, si vous le reliez : par le WiFi, sur votre réseau local, une partie de vos données de classe ; par votre compte Nuage, vos dictées, vos notes et vos photos, chiffrées, et l'emploi du temps, sans nom d'élève ;
- la recherche de mises à jour (GitHub), le calendrier des vacances (data.education.gouv.fr), les téléchargements que vous lancez (pictogrammes, modèles de transcription, programmes officiels) et les vignettes des vidéos YouTube que vous ajoutez.

4. Données des élèves
Les données des élèves relèvent du responsable de traitement de votre établissement : en général le directeur académique pour le premier degré public, le chef d'établissement pour le second degré, la direction pour un établissement médico-social. Informez-le de l'usage de Maîtrize et suivez les consignes de son délégué à la protection des données. Ne saisissez que ce qui sert votre travail ; les informations de santé ou de handicap n'ont leur place que dans les dispositifs qui les demandent (PPS, PAI, PAP, PPI). Protégez l'ordinateur : session à mot de passe, disque chiffré (FileVault sur Mac, BitLocker sur Windows).

5. Contenus de tiers
Les documents que vous importez — manuels, fiches, grilles d'éditeurs — restent soumis aux droits de leurs auteurs : ne les partagez que si vous en avez le droit.

6. L'assistant IA
Ce que l'IA propose — une séquence, une reformulation, un document — est un premier jet, à relire et à corriger avant tout usage en classe ou dans un document officiel. Vous restez responsable de ce que vous en faites.

7. Garantie et responsabilité
Maîtrize est fourni « en l'état », sans garantie, comme le prévoit sa licence. Dans les limites permises par la loi, son éditeur ne répond pas d'une perte de données, d'une indisponibilité ou d'un dommage résultant de son utilisation. Sauvegardez régulièrement vos données (Réglages › Données).

8. Éditeur
Maîtrize est développé par Clément Titet. Contact : contact@maitrize.com.

9. Évolutions et acceptation
Ces conditions peuvent évoluer ; votre acceptation vous est alors redemandée au lancement. Elle est datée et associée à une empreinte de cette version, conservées sur cet ordinateur.

10. Droit applicable
Ces conditions sont régies par le droit français.`;

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
