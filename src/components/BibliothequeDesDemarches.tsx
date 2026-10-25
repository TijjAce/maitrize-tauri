import React from "react";
import { createPortal } from "react-dom";
import { resumeDuCadre, type Demarche } from "../demarches";
import type { Classe } from "../feuillesDesSequences";
import {
  RAYON_COMPETENCE, RAYONS_DES_METHODOLOGIES, RAYONS_DES_SEQUENCES, classeDeDepart, classesDuLivre, classesDuRayon, couleurDuLivre, etageres,
  livreDe, nombreDuRayon, rayonDeDepart, sorteDuLivre, type Livre, type Rayon,
} from "../bibliothequeDemarches";
import { CLASSES } from "../sequencesToutesFaites";

/**
 * Bouton + fenêtre de la bibliothèque des démarches (voir bibliothequeDemarches.ts) : les séquences toutes faites et les
 * méthodologies, chacune ses rayons ; puis la fiche de la démarche choisie — ce qu'elle est, ce qu'elle fait, sa source,
 * ses séances —, et le bouton qui la pose.
 */
export function BibliothequeDesDemarches({ label, className = "btn sm", style, title, ...fenetre }: {
  label: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
} & Omit<Fenetre, "onFermer">) {
  const [ouverte, setOuverte] = React.useState(false);
  return (
    <>
      <button type="button" className={className} style={style} title={title} onClick={() => setOuverte(true)}>{label}</button>
      {ouverte && <FenetreDesDemarches {...fenetre} onFermer={() => setOuverte(false)} />}
    </>
  );
}

interface Fenetre {
  onChoisir: (d: Demarche) => void;
  onFermer: () => void;
  /** Les démarches de la compétence de la séquence : leur rayon passe avant ceux des disciplines. */
  proposees?: Demarche[];
  /** La démarche dont le rayon s'ouvre, faute de démarches de la compétence. */
  depuis?: Demarche;
  /** La classe de la compétence (« CE1 ») : les rayons s'ouvrent sur elle. */
  classe?: string | null;
  /** Ce que la démarche apporte ici : ses séances (une séquence), ou les phases de sa première séance (une séance). */
  apport?: "seances" | "phases";
  /** Le bouton qui pose la démarche choisie. */
  verbe?: string;
  /** La démarche telle qu'elle sera posée — une séquence de problèmes s'ouvre sur la séance de leurs mots. */
  voir?: (d: Demarche) => Demarche;
  /** Un clic choisit, sans fiche : là où la démarche choisie se montre déjà. */
  directement?: boolean;
  /** La démarche déjà choisie, marquée dans les rayons. */
  choisie?: string;
}

const sansVoir = (d: Demarche) => d;

function FenetreDesDemarches({
  onChoisir, onFermer, proposees = [], depuis, classe, apport = "seances", verbe = "Poser cette démarche", voir = sansVoir, directement, choisie,
}: Fenetre) {
  const [rayon, setRayon] = React.useState(() => rayonDeDepart(proposees, depuis));
  const [classeChoisie, setClasseChoisie] = React.useState<Classe | null>(() => classeDeDepart(classe));
  const [recherche, setRecherche] = React.useState("");
  const [fiche, setFiche] = React.useState<Demarche | null>(null);
  const titreId = React.useId();
  const corps = React.useRef<HTMLDivElement>(null);
  // Revenir aux rayons depuis une fiche : là où on les avait laissés.
  const position = React.useRef(0);
  React.useLayoutEffect(() => { if (corps.current) corps.current.scrollTop = fiche ? 0 : position.current; }, [fiche]);
  React.useLayoutEffect(() => { if (corps.current) corps.current.scrollTop = 0; position.current = 0; }, [rayon, classeChoisie, recherche]);

  const cherche = recherche.trim().length > 0;
  const lesEtageres = etageres({ rayon, classe: classeChoisie, recherche, proposees });
  const classes = cherche ? CLASSES : classesDuRayon(rayon);
  const ouvrir = (d: Demarche) => {
    if (directement) { onChoisir(d); onFermer(); return; }
    position.current = corps.current?.scrollTop ?? 0;
    setFiche(d);
  };
  const boutonDuRayon = (r: Rayon) => {
    const ici = !cherche && r.cle === rayon;
    return (
      <button key={r.cle} type="button" className={`nav-item${ici ? " active" : ""}`} aria-current={ici ? "true" : undefined}
        onClick={() => { setRayon(r.cle); setRecherche(""); }}>
        <span className="ico" aria-hidden="true">{r.icone}</span>
        <span className="biblio-rayon-nom">{r.nom}</span>
        <span className="biblio-rayon-nombre">{nombreDuRayon(r.cle, classeChoisie, proposees)}</span>
      </button>
    );
  };

  return createPortal(
    <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="modal biblio-demarches" role="dialog" aria-modal="true" aria-labelledby={titreId}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onFermer(); } }}>
        <div className="modal-head">
          <h2 id={titreId}>Séquences toutes faites et méthodologies</h2>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onFermer} aria-label="Fermer">✕</button>
        </div>
        {fiche ? (
          <div ref={corps} className="modal-body biblio-demarches-defile">
            <Fiche demarche={fiche} vue={voir(fiche)} apport={apport} onRetour={() => setFiche(null)} />
          </div>
        ) : (
          <div className="biblio-demarches-corps">
            <nav className="biblio-rayons" aria-label="Les rayons">
              {proposees.length > 0 && boutonDuRayon(RAYON_COMPETENCE)}
              <div className="biblio-rayons-titre">📚 Séquences toutes faites</div>
              {RAYONS_DES_SEQUENCES.map(boutonDuRayon)}
              <div className="biblio-rayons-titre">🧭 Méthodologies</div>
              {RAYONS_DES_METHODOLOGIES.map(boutonDuRayon)}
            </nav>
            <div className="biblio-demarches-principal">
              <div className="biblio-filtres">
                {classes.length > 0 && (
                  <div className="seg" role="group" aria-label="La classe">
                    <button type="button" className={classeChoisie === null ? "active" : ""} aria-pressed={classeChoisie === null}
                      onClick={() => setClasseChoisie(null)}>Toutes les classes</button>
                    {classes.map((c) => (
                      <button key={c} type="button" className={classeChoisie === c ? "active" : ""} aria-pressed={classeChoisie === c}
                        onClick={() => setClasseChoisie(c)}>{c}</button>
                    ))}
                  </div>
                )}
                <input className="input search biblio-demarches-recherche" value={recherche} autoFocus placeholder="Chercher une démarche…"
                  aria-label="Chercher une démarche" onChange={(e) => setRecherche(e.target.value)} />
              </div>
              <div ref={corps} className="biblio-demarches-defile">
                {lesEtageres.map((e) => (
                  <section key={e.titre ?? ""} className="biblio-etagere" aria-label={e.titre ?? undefined}>
                    {e.titre && <h3 className="biblio-etagere-titre">{e.titre} <span className="meta">{e.livres.length}</span></h3>}
                    <div className="biblio">
                      {e.livres.map((l) => <LivreDeDemarche key={l.demarche.id} livre={l} vue={voir(l.demarche)} apport={apport}
                        choisi={l.demarche.id === choisie} onClick={() => ouvrir(l.demarche)} />)}
                    </div>
                  </section>
                ))}
                {!lesEtageres.length && <div className="choix-support-vide">Aucune démarche ne correspond.</div>}
              </div>
            </div>
          </div>
        )}
        <div className="modal-foot">
          <button className="btn" onClick={onFermer}>Annuler</button>
          {fiche && <button className="btn primary" onClick={() => { onChoisir(fiche); onFermer(); }}>{verbe}</button>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const nombre = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Un livre : la couverture aux couleurs de sa matière, l'image de son domaine, sa classe et ce qu'il apporte ; son nom dessous. */
function LivreDeDemarche({ livre, vue, apport, choisi, onClick }: { livre: Livre; vue: Demarche; apport: "seances" | "phases"; choisi: boolean; onClick: () => void }) {
  const couleur = couleurDuLivre(livre);
  const contenu = apport === "phases" ? nombre(vue.seances[0]?.phases.length ?? 0, "phase") : nombre(vue.seances.length, "séance");
  return (
    <button type="button" className={`biblio-livre biblio-livre-demarche${choisi ? " choisi" : ""}`} onClick={onClick} title={livre.demarche.nom}
      style={couleur ? ({ "--livre": couleur } as React.CSSProperties) : undefined}>
      <span className="biblio-couverture">
        {livre.classes.length > 0 && <span className="biblio-livre-classe">{classesDuLivre(livre)}</span>}
        <span aria-hidden="true">{livre.icone}</span>
        <span className="biblio-livre-contenu">{contenu}</span>
      </span>
      <span className="biblio-titre">{livre.titre}</span>
    </button>
  );
}

/** La fiche d'une démarche : ce qu'elle fait, son guide, et ce qu'elle posera. */
function Fiche({ demarche, vue, apport, onRetour }: { demarche: Demarche; vue: Demarche; apport: "seances" | "phases"; onRetour: () => void }) {
  const livre = livreDe(demarche);
  const couleur = couleurDuLivre(livre);
  const premiere = vue.seances[0];
  return (
    <div className="biblio-fiche">
      <div className="biblio-choisi">
        <span className="choix-support-vignette biblio-livre-demarche" style={couleur ? ({ "--livre": couleur } as React.CSSProperties) : undefined}>{livre.icone}</span>
        <span className="biblio-choisi-titre">
          <span className="biblio-fiche-sorte">{sorteDuLivre(livre)}</span>
          {demarche.nom}
        </span>
        <button type="button" className="btn sm" autoFocus onClick={onRetour}>📚 Changer de démarche</button>
      </div>
      <p className="biblio-fiche-resume">{demarche.resume}</p>
      <div className="meta">📖 {demarche.source}</div>
      {apport === "phases" ? (
        <>
          <div className="biblio-fiche-total">Les phases de sa première séance{premiere?.titre ? ` : « ${premiere.titre} »` : ""}</div>
          <ol className="deroulement-seances">
            {premiere?.phases.map((p, i) => (
              <li key={i}><b>{p.phase}</b>{p.duree && <span className="meta"> · {p.duree}</span>}<div className="meta">{p.description}</div></li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className="biblio-fiche-total">{resumeDuCadre(vue)}</div>
          <ol className="deroulement-seances">
            {vue.seances.map((sc, i) => (
              <li key={i}><b>{sc.titre}</b> <span className="meta">· {sc.duree} min · {sc.phases.map((p) => p.phase.replace(/^Temps \d – /, "")).join(" › ")}</span></li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
