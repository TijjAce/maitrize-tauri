// ── La page de bienvenue, à chaque lancement ──────────────────────────────
//
// « À chaque lancement de l'application, j'aimerais une page de bienvenue, un
// peu comme ça, avec écrit Bienvenue sur Maitrize » (l'enseignant, 6 novembre
// 2026, sur l'image d'un « welcome » de verre). Puis, le même jour : « c'est
// encore pas mégafluide » ; « plus personnalisé, souligne avec deux barres rouges
// le z, fais ça proprement » ; « oublie la toute première transition » ; « une
// application créée par Clément Titet, Professeur des écoles », en petit.
//
// Le titre s'écrit en cursive du ministère, en lettres de verre, sur une feuille
// de cahier que recouvre une soie de couleur (voir bienvenueRendu.ts) ; le z se
// souligne de deux traits rouges à la règle, comme un titre de cahier ; Clément
// Titet signe dessous ; puis la page s'efface sur l'application.
//
// La fluidité tient à l'ordre des choses, parce qu'une image saccade dès que le
// navigateur fait autre chose :
//   — la fenêtre reste cachée jusqu'à ce que la première image soit prête : elle
//     s'ouvre directement sur la page, sans fond provisoire ni fondu ;
//   — rien d'autre ne se charge pendant l'écriture : ce fichier est à part, tout
//     petit, et l'application attend que le titre soit écrit (voir main.tsx) ;
//   — une fois écrit, le fond s'immobilise : plus rien à dessiner pendant que
//     l'application se monte ; les barres, la signature et le fondu de la fin ne
//     demandent que la carte graphique, qu'un navigateur occupé n'arrête pas ;
//   — la page ne s'efface que lorsque l'application a fini de se poser.
// Toucher, cliquer ou taper au clavier la fait partir tout de suite.
//
// Pas de WebGL : le titre en cursive sur un fond très pâle, sans le verre.
// Mouvements réduits demandés au système : ni écriture ni courant.

import { getCurrentWindow } from "@tauri-apps/api/window";
import marelle from "./assets/polices/marelle/Marelle-Regular.woff2?inline";
import { PALETTE, creerRendu, cuireLeTexte, miseEnPage, type Rendu } from "./bienvenueRendu";
import {
  ECRITURE_MS, FONDU_MS, IMAGES_CALMES, POSE_MAX_MS, avancementDeLEcriture, barresDuZ, estUnLancement, etatDeLaPage, tempsDuFond,
} from "./bienvenueDeroule";
import { estInviteDuRelais } from "./relaisDev";
import "./bienvenue.css";

export const TITRE: [string, string] = ["Bienvenue", "sur Maitrize"];
/** « Une application créée par Clément Titet, Professeur des écoles » : son nom en cursive, comme une signature. */
export const CREDIT = ["Une application créée par", "Clément Titet", ", Professeur des écoles"] as const;

const POLICE = "Marelle Bienvenue";

export interface Bienvenue {
  /** L'application est montée derrière la page. */
  appPrete: () => void;
}

/** La fenêtre, cachée au lancement (voir tauri.conf.json) : elle se montre quand il y a quelque chose à voir. */
function montrerLaFenetre() {
  if (estInviteDuRelais()) return;
  try {
    const f = getCurrentWindow();
    void f.show().then(() => f.setFocus()).catch(() => {});
  } catch { /* hors de l'application */ }
}

/**
 * Au lancement : ouvre la page, puis charge l'application quand elle ne gêne plus (`charger`, qui la monte, et appelle
 * `appPrete` une fois à l'écran). Une fenêtre qui se recharge va droit à l'application.
 */
export function accueillir(charger: (b: Bienvenue) => void) {
  let session: Storage | null = null;
  try { session = window.sessionStorage; } catch { /* rien */ }
  document.documentElement.classList.remove("au-lancement");
  if (!estUnLancement(session)) {
    montrerLaFenetre();
    charger({ appPrete: () => {} });
    return;
  }
  ouvrirLaPage(charger);
}

function ouvrirLaPage(charger: (b: Bienvenue) => void) {
  const debut = performance.now();
  const immobile = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const page = document.createElement("div");
  page.className = "bienvenue";
  page.style.setProperty("--bienvenue-page", PALETTE.page);
  page.style.setProperty("--bienvenue-credit", PALETTE.credit);
  page.style.setProperty("--bienvenue-signature", PALETTE.signature);
  const toile = document.createElement("canvas");
  toile.setAttribute("aria-hidden", "true");
  const titre = document.createElement("h1");
  titre.className = "bienvenue-titre";
  titre.append(`${TITRE[0]} ${TITRE[1].replace(/z.*$/, "")}`, Object.assign(document.createElement("span"), { className: "z", textContent: "z" }), TITRE[1].replace(/^.*z/, ""));
  const barre1 = document.createElement("i"), barre2 = document.createElement("i");
  barre1.className = barre2.className = "bienvenue-barre";
  barre1.setAttribute("aria-hidden", "true");
  barre2.setAttribute("aria-hidden", "true");
  const credit = document.createElement("p");
  credit.className = "bienvenue-credit";
  credit.append(CREDIT[0], Object.assign(document.createElement("span"), { className: "bienvenue-signature", textContent: CREDIT[1] }), CREDIT[2]);
  credit.style.top = "78%";
  page.append(toile, titre, barre1, barre2, credit);
  document.body.appendChild(page);

  let rendu: Rendu | null = null;
  let debutEcriture: number | null = null;
  let appPrete = false, appPosee = false, passee = false, partie = false, demandee = false, chargee = false, reglee = false, signee = false;
  let image = 0;

  /** Le titre à la taille de la fenêtre : mesuré dans la police, cuit en relief de verre ; les barres et la signature à leur place. */
  const preparerLeTitre = () => {
    if (!rendu) return;
    const mesures = document.createElement("canvas").getContext("2d");
    if (!mesures) return;
    mesures.font = `100px "${POLICE}"`;
    const mesure = (t: string) => mesures.measureText(t).width / 100;
    const mise = miseEnPage(window.innerWidth, window.innerHeight, TITRE, mesure);
    rendu.poserLeTexte(cuireLeTexte(mise, POLICE, 1.25));
    const b = barresDuZ(mise, mesure, mesures.measureText("z").actualBoundingBoxDescent / 100);
    if (b) {
      for (const [barre, y] of [[barre1, b.y1], [barre2, b.y2]] as const) {
        Object.assign(barre.style, { left: `${b.x}px`, top: `${y}px`, width: `${b.l}px`, height: `${b.e}px` });
      }
    }
    credit.style.top = `${Math.round(Math.min(window.innerHeight * 0.93, (b ? b.y2 : mise.bas) + 0.42 * mise.taille))}px`;
  };

  const dessiner = () => {
    if (partie) return;
    const ecoule = debutEcriture === null ? 0 : performance.now() - debutEcriture;
    if (rendu) rendu.dessiner(immobile ? 2 : 2 + tempsDuFond(ecoule) * 1.5, immobile ? 1.06 : avancementDeLEcriture(ecoule));
    // Une fois écrit, plus rien ne bouge dans le dessin : il n'y a plus rien à demander au navigateur.
    if (!immobile && ecoule < ECRITURE_MS + 100) image = requestAnimationFrame(dessiner);
  };

  const partir = () => {
    if (partie) return;
    partie = true;
    window.clearInterval(veille);
    window.removeEventListener("keydown", passer);
    window.removeEventListener("resize", ajuster);
    cancelAnimationFrame(image);
    page.classList.add("bienvenue-fin");
    window.setTimeout(() => {
      rendu?.liberer();
      page.remove();
    }, FONDU_MS + 60);
  };

  /** L'application est montée : on la laisse se poser (ses premières données, ses premiers dessins) avant de se retirer. */
  const attendreQuElleSePose = () => {
    const depuis = performance.now();
    let avant = depuis, calmes = 0;
    const regarder = (ici: number) => {
      calmes = ici - avant < 28 ? calmes + 1 : 0;
      avant = ici;
      if (calmes >= IMAGES_CALMES || ici - depuis > POSE_MAX_MS) { appPosee = true; avancer(); }
      else requestAnimationFrame(regarder);
    };
    requestAnimationFrame(regarder);
    // Une fenêtre cachée ne dessine pas : le temps suffit.
    window.setTimeout(() => { appPosee = true; }, POSE_MAX_MS + 100);
  };

  const avancer = () => {
    const ici = performance.now();
    const ecriture = debutEcriture === null ? null : debutEcriture - debut;
    const etat = etatDeLaPage({ ecoule: ici - debut, debutEcriture: ecriture, appPrete, appPosee, passee, immobile });
    if (debutEcriture !== null) {
      const ecoule = ici - debutEcriture;
      if (!signee && (immobile || ecoule >= ECRITURE_MS * 0.8)) { signee = true; page.classList.add("bienvenue-signe"); }
      if (!reglee && (immobile || ecoule >= ECRITURE_MS)) {
        reglee = true;
        page.classList.add("bienvenue-regle");
        // Une fenêtre passée derrière une autre n'a peut-être pas tout dessiné : la dernière image, en tout cas.
        rendu?.dessiner(immobile ? 2 : 2 + tempsDuFond(ECRITURE_MS) * 1.5, 1.06);
      }
    }
    if (etat.chargerLApp && !demandee) {
      demandee = true;
      // Deux images d'abord : les barres et la signature partent, et plus rien ne peut les arrêter.
      requestAnimationFrame(() => requestAnimationFrame(() => { window.setTimeout(chargerLApp, 0); }));
      // Une fenêtre cachée ne dessine pas : l'application se charge quand même.
      window.setTimeout(chargerLApp, 400);
    }
    if (etat.partir) partir();
  };
  const chargerLApp = () => {
    if (chargee) return;
    chargee = true;
    charger({
      appPrete: () => {
        if (appPrete) return;
        appPrete = true;
        attendreQuElleSePose();
        avancer();
      },
    });
  };

  const passer = () => { passee = true; avancer(); };
  // Le temps se tient ici, pas dans le dessin : une fenêtre cachée ne dessine pas, mais la page s'en va quand même.
  const veille = window.setInterval(avancer, 40);
  page.addEventListener("click", passer);
  window.addEventListener("keydown", passer);

  let attente = 0;
  const ajuster = () => {
    window.clearTimeout(attente);
    attente = window.setTimeout(() => {
      if (!rendu || partie) return;
      rendu.ajuster(window.innerWidth, window.innerHeight);
      try { preparerLeTitre(); } catch { /* il garde sa taille */ }
      const ecoule = debutEcriture === null ? 0 : performance.now() - debutEcriture;
      rendu.dessiner(immobile ? 2 : 2 + tempsDuFond(ecoule) * 1.5, immobile ? 1.06 : avancementDeLEcriture(ecoule));
    }, 120);
  };
  window.addEventListener("resize", ajuster);

  // Tout se prépare fenêtre cachée — la carte graphique, la police, le relief ; la première image attend d'être finie.
  const commencer = () => {
    try {
      rendu = creerRendu(toile);
      if (rendu) rendu.ajuster(window.innerWidth, window.innerHeight);
    } catch { rendu = null; }
    if (rendu) page.classList.add("bienvenue-dessinee");
    const police = new FontFace(POLICE, `url(${marelle})`);
    police.load()
      .then((f) => { document.fonts.add(f); })
      .catch(() => { /* la cursive du système prend la place du titre */ })
      .finally(() => {
        try {
          preparerLeTitre();
          if (rendu) {
            rendu.dessiner(2, 0);
            rendu.finir();
            rendu.dessiner(2, 0);
          }
        } catch { rendu = null; page.classList.remove("bienvenue-dessinee"); }
        montrerLaFenetre();
        debutEcriture = performance.now();
        dessiner();
        avancer();
      });
  };
  commencer();
}
