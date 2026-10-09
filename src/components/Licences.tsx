import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Modal } from "./ui";

// Ce que Maîtrize doit à d'autres : sa propre licence, celles des pictogrammes
// qu'il télécharge, et le texte des licences des composants qu'il embarque
// (public/licences-tierces.txt, relevé par outils/licences/notices.mjs).

const SOURCE = "https://github.com/TijjAce/maitrize-tauri";
const AGPL = "https://www.gnu.org/licenses/agpl-3.0.html";

/** Les crédits des banques de pictogrammes, tels que leurs licences les demandent. */
export const CREDITS_PICTOGRAMMES = [
  { banque: "ARASAAC", credit: "auteur Sergio Palao, origine ARASAAC (arasaac.org), licence CC BY-NC-SA 4.0, propriété du Gouvernement d'Aragon (Espagne)" },
  { banque: "Sclera", credit: "Sclera vzw (sclera.be), licence CC BY-NC 2.0 BE" },
  { banque: "François Bajard", credit: "François Bajard (ressources-ecole-inclusive.org), licence CC BY-NC-SA 4.0" },
];

export function Licences() {
  const [texte, setTexte] = React.useState<string | null>(null);
  const ouvrir = (url: string) => { openUrl(url).catch(() => window.open(url, "_blank")); };
  const lien = (url: string, libelle: string) => (
    <a href={url} onClick={(e) => { e.preventDefault(); ouvrir(url); }}>{libelle}</a>
  );
  const voir = async () => {
    try {
      const r = await fetch("/licences-tierces.txt");
      setTexte(r.ok ? await r.text() : "Le relevé des licences n'a pas pu être lu.");
    } catch {
      setTexte("Le relevé des licences n'a pas pu être lu.");
    }
  };
  return (
    <div className="card" style={{ maxWidth: 620, marginTop: 18 }}>
      <h3 style={{ marginTop: 0 }}>📜 Licences</h3>
      <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.55 }}>
        <p style={{ marginTop: 0 }}>
          Maîtrize est un logiciel libre, distribué sous la licence {lien(AGPL, "GNU Affero GPL, version 3")} : vous pouvez
          l'utiliser, l'étudier, le modifier et le partager selon ses termes. Son code source est public :{" "}
          {lien(SOURCE, "github.com/TijjAce/maitrize-tauri")}. Il est fourni sans garantie.
        </p>
        <p>
          <b>Pictogrammes</b>, téléchargés depuis l'application et crédités sur chaque feuille :
        </p>
        <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
          {CREDITS_PICTOGRAMMES.map((c) => <li key={c.banque}><b>{c.banque}</b> : {c.credit}.</li>)}
        </ul>
        <p>
          Ces licences interdisent l'usage commercial : les feuilles qui montrent ces pictogrammes se donnent, elles ne se
          vendent pas ; une feuille qui en est tirée — un coloriage, une ombre — garde la même licence.
        </p>
        <p>
          <b>Transcription sur l'ordinateur</b> : modèles Whisper d'OpenAI, licence Apache 2.0, téléchargés depuis Hugging Face.
          <br /><b>Programmes et guides</b> : repris d'Éduscol et des textes officiels, avec leur source.
        </p>
      </div>
      <button className="btn" onClick={() => void voir()}>Licences des composants embarqués</button>
      {texte !== null && (
        <Modal titre="Licences des composants tiers" large onClose={() => setTexte(null)}>
          <textarea readOnly value={texte} aria-label="Licences des composants tiers"
            style={{ width: "100%", height: "62vh", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11.5, lineHeight: 1.45 }} />
        </Modal>
      )}
    </div>
  );
}
