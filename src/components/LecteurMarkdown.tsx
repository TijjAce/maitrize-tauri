import React from "react";
import { api, texteErreur } from "../api";
import { Modal } from "./ui";
import { toast } from "./Toaster";
import { estMarkdown } from "../dragdrop";
import { feuilleDuDocument, markdownVersHtml } from "../documentIa";
import { texteDuFichier, titreDuLecteur } from "../lecteurMarkdown";
import { printHTML } from "../print";

// ── Lire un « .md » dans l'application ────────────────────────────────────
//
// Un fichier Markdown est un texte mis en forme : des titres, des listes, des
// tableaux. Les autres applications le montrent brut, ou pas du tout : ici,
// on le lit mis en page et on l'imprime. Pour le modifier, on l'ouvre dans
// l'application que l'ordinateur lui associe.
//
// Le bureau commun, le bureau et les fiches s'en servent : `lireMarkdown()`
// prévient l'hôte, monté une fois dans l'application.

interface Lecture {
  /** Le nom du fichier ; à défaut, le titre se prend au premier « # » du texte. */
  nom?: string;
  /** Son contenu, en base64. */
  lire: () => Promise<string>;
  /** L'ouvrir dans l'application du système, pour le modifier. */
  ailleurs: () => Promise<void>;
}
const EVT = "maitrize:lire-markdown";

/** Montre un fichier Markdown, d'où qu'il vienne. */
export function lireMarkdown(lecture: Lecture) {
  window.dispatchEvent(new CustomEvent<Lecture>(EVT, { detail: lecture }));
}

/** Ouvre une pièce jointe : un « .md » se lit ici, le reste dans son application. */
export async function ouvrirLaPieceJointe(fichier: string, nom?: string): Promise<void> {
  if (!estMarkdown(fichier)) return api.fichierOuvrir(fichier);
  lireMarkdown({ nom, lire: () => api.fichierRead(fichier), ailleurs: () => api.fichierOuvrir(fichier) });
}

/** Hôte unique, monté une fois dans l'application. */
export function LecteurMarkdownHost() {
  const [ouvert, setOuvert] = React.useState<{ lecture: Lecture; texte: string | null } | null>(null);
  // Chaque ouverture a son numéro : une lecture lente ne revient pas après qu'on a fermé.
  const tour = React.useRef(0);
  React.useEffect(() => {
    const h = (e: Event) => {
      const lecture = (e as CustomEvent<Lecture>).detail;
      const ici = ++tour.current;
      setOuvert({ lecture, texte: null });
      lecture.lire()
        .then((b64) => { if (ici === tour.current) setOuvert({ lecture, texte: texteDuFichier(b64) }); })
        .catch((err: unknown) => {
          if (ici !== tour.current) return;
          setOuvert(null);
          toast(texteErreur(err), { icone: "⚠️" });
        });
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  const texte = ouvert?.texte ?? null;
  const html = React.useMemo(() => (texte ? markdownVersHtml(texte, { titres: "impression" }) : ""), [texte]);
  if (!ouvert) return null;

  const { lecture } = ouvert;
  const titre = titreDuLecteur(lecture.nom, texte ?? "");
  const fermer = () => { tour.current++; setOuvert(null); };
  const imprimer = () => { const f = feuilleDuDocument(texte ?? ""); printHTML(titre, f.corps, f.style); };
  return (
    <Modal large titre={`📓 ${titre}`} onClose={fermer}
      footer={<>
        <button className="btn ghost" title="Pour le modifier : l'application que l'ordinateur associe aux fichiers .md"
          onClick={() => { lecture.ailleurs().catch((err: unknown) => toast(texteErreur(err), { icone: "⚠️" })); }}>
          Ouvrir avec une autre application
        </button>
        <div className="spacer" />
        <button className="btn" onClick={fermer}>Fermer</button>
        <button className="btn primary" disabled={!texte?.trim()} onClick={imprimer}>🖨 Imprimer</button>
      </>}>
      {texte === null ? <p className="meta">Lecture…</p>
        : !texte.trim() ? <p className="meta">Ce fichier est vide.</p>
        : <div className="md lecteur-md" dangerouslySetInnerHTML={{ __html: html }} />}
    </Modal>
  );
}
