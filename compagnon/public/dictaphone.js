// ── Le dictaphone ─────────────────────────────────────────────────────────
//
// On dicte en classe, l'ordinateur fermé dans le sac. Un bouton, un
// chronomètre, et rien d'autre à comprendre.
//
// Deux chemins, qui ne se mêlent pas. Les dictées et les notes passent par
// Nuage : le téléphone les y dépose, scellées, et l'ordinateur les relève où
// qu'il soit. Le dossier n'est ouvert qu'au compte Nuage de l'enseignant : le
// QR code de l'ordinateur dit lequel, et le téléphone s'y connecte par la page
// de Nuage. Le WiFi ne sert qu'à répondre à l'ordinateur quand il demande les
// pages d'un manuel ou une photo : il affiche un QR code, on le lit, on
// envoie. Rien ne se relie à la main : chaque liaison passe par un QR code.
//
// Le son est capturé à 16 kHz mono et empaqueté en WAV ici même : c'est ce que
// Whisper attend de l'autre côté, et cela évite de décoder un format de
// téléphone sur le Mac. Le fichier est ensuite confié à Rust, qui le garde
// jusqu'à ce qu'il parte.

/**
 * L'appel vers Rust.
 *
 * Le pont global n'existe que si `withGlobalTauri` est vrai dans la
 * configuration : sans lui, chaque appel partait en « undefined is not an
 * object », un message qui ne dit rien à personne. On le vérifie une fois,
 * et l'on dit ce qui manque.
 */
const invoke = (cmd, args) => {
  const pont = window.__TAURI__;
  if (!pont || !pont.core) {
    return Promise.reject("Le pont vers l'application n'est pas là (withGlobalTauri).");
  }
  return pont.core.invoke(cmd, args);
};

const TAUX = 16000;
let micro = null, ctx = null, noeud = null, morceaux = [], debut = null, depart = 0, minuteur = null;
let vocaux = [], envoiEnCours = false, souci = "";
/**
 * Le relais de Nuage : relié ou non, connecté au compte ou non, et s'il répond.
 *
 * L'ordinateur est le plus souvent fermé dans le sac : par Nuage, ce qui
 * attend part quand même, scellé pour lui, et il le relèvera en s'ouvrant.
 */
const SANS_RELAIS = { relie: false, connecte: false, serveur: "", compte: "" };
let relais = SANS_RELAIS, nuage = null;
/** La connexion au compte Nuage : en cours, et ce qui l'a empêchée. */
let connexionEnCours = false, connexionSouci = "";
/** Ce qui vient de partir par Nuage : on le dit, pour qu'on ne le cherche pas sur l'ordinateur tout de suite. */
let partiParNuage = "";
/**
 * Ce qu'il y a à dire de la dernière dictée — micro muet, arrêt en
 * arrière-plan. Séparé de `souci`, qui parle du réseau : l'envoi part juste
 * après l'enregistrement et effaçait l'avertissement avant qu'on le lise.
 */
let avis = "";
/** Le niveau entendu à l'instant, et le plus fort de tout l'enregistrement. */
let niveau = 0, crete = 0;
/** En dessous, on n'a rien capté : micro muet, refusé, ou pris par une autre app. */
const SEUIL_SILENCE = 0.015;
/** Le temps qu'on laisse avant de s'inquiéter d'un micro muet. */
const AVANT_DE_S_INQUIETER = 1800;
/** Le vocal qu'on écoute, et le lecteur qui s'en charge. */
let ecoute = "", lecteur = null;
/** Les notes écrites qui attendent, et l'éditeur quand il est ouvert. */
let notes = [], ecrit = false, brouillon = "";
/**
 * Où va ce qu'on dicte ou qu'on écrit : au cahier journal, rangé au créneau,
 * ou aux notes rapides de l'ordinateur, en un nouveau tiret. Le cahier
 * journal reste la règle : le choix tombe, comme le jour, après un quart
 * d'heure en arrière-plan.
 */
let pourLesNotes = false;
/** Ce que l'étiquette de Nuage porte pour les notes rapides. */
const VERS_LES_NOTES = "notes";
/** La destination de la dictée en cours, prise quand elle commence. */
let versDeLaDictee = "";
/** Le verrou qui empêche l'écran de s'éteindre pendant qu'on dicte. */
let veille = null;
/**
 * Les créneaux du jour, et celui sous lequel on enregistre.
 *
 * C'est la seule chose que ce téléphone sait de la classe : un emploi du
 * temps sans personne dedans. Il le redemande à l'ordinateur dès qu'il le
 * joint, et n'en garde qu'un jour.
 */
let creneaux = [], creneauChoisi = "", choixOuvert = false;
/**
 * Le jour dont on parle — vide : aujourd'hui, qui suit l'horloge.
 *
 * On dicte le soir sur la journée, le lendemain matin sur la veille : la
 * dictée se range alors au jour choisi, à l'heure de l'horloge. On regarde
 * aussi les jours à venir, leurs créneaux. Ce choix ne dure pas : il ne
 * survit ni à la fermeture de l'application, ni à un quart d'heure passé en
 * arrière-plan.
 */
let jourChoisi = "";
/** Les créneaux déjà reçus, par jour et par identifiant : une dictée d'hier garde son intitulé dans la liste. */
const creneauxParJour = new Map(), creneauxVus = new Map();
/** Faux tant que l'ordinateur ne nous a rien dit du jour : une journée sans
 *  créneau n'est pas une ignorance, et l'écran ne doit pas accuser le réseau. */
let creneauxConnus = false;
/**
 * Ce que l'ordinateur a demandé par son QR code, le temps d'y répondre :
 * l'adresse lue, une série de pages ou une seule photo, et où l'on en est.
 */
let demande = null;
/** Ce qui vient de se passer avec la demande : envoyé, refusé, terminé. */
let demandeInfo = "", demandeEnCours = false;

// ── Capturer ──────────────────────────────────────────────────────────────

/** Rééchantillonne au taux de Whisper : un ratio simple suffit pour la parole. */
function reechantillonner(entree, deTaux) {
  if (deTaux === TAUX) return entree;
  const ratio = deTaux / TAUX;
  const sortie = new Float32Array(Math.floor(entree.length / ratio));
  for (let i = 0; i < sortie.length; i++) sortie[i] = entree[Math.floor(i * ratio)] || 0;
  return sortie;
}

/** Un WAV 16 bits mono : en-tête de quarante-quatre octets, puis les échantillons. */
function versWav(blocs) {
  let n = 0;
  for (const b of blocs) n += b.length;
  const tout = new Float32Array(n);
  let o = 0;
  for (const b of blocs) { tout.set(b, o); o += b.length; }
  const buf = new ArrayBuffer(44 + tout.length * 2);
  const vue = new DataView(buf);
  const txt = (p, s) => { for (let i = 0; i < s.length; i++) vue.setUint8(p + i, s.charCodeAt(i)); };
  txt(0, "RIFF"); vue.setUint32(4, 36 + tout.length * 2, true); txt(8, "WAVEfmt ");
  vue.setUint32(16, 16, true); vue.setUint16(20, 1, true); vue.setUint16(22, 1, true);
  vue.setUint32(24, TAUX, true); vue.setUint32(28, TAUX * 2, true);
  vue.setUint16(32, 2, true); vue.setUint16(34, 16, true);
  txt(36, "data"); vue.setUint32(40, tout.length * 2, true);
  for (let i = 0; i < tout.length; i++) {
    const v = Math.max(-1, Math.min(1, tout[i]));
    vue.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Uint8Array(buf);
}

const p2 = (n) => String(n).padStart(2, "0");

/** L'heure locale au format que l'ordinateur attend. */
function maintenantIso() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}` +
    `T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
}

/**
 * Empêche l'écran de s'éteindre pendant la dictée.
 *
 * iOS suspend la page dès que l'écran s'endort : le son cesse d'arriver sans
 * que rien ne le dise. Le verrou est relâché à l'arrêt — on ne garde pas un
 * téléphone allumé pour rien.
 */
async function garderLEcranAllume() {
  try {
    veille = navigator.wakeLock ? await navigator.wakeLock.request("screen") : null;
  } catch (e) {
    veille = null;  // Refusé ou inconnu : on le dira à l'écran.
  }
}

function relacherLEcran() {
  try { if (veille) veille.release(); } catch (e) { /* déjà relâché */ }
  veille = null;
}

async function demarrer() {
  souci = "";
  avis = "";
  partiParNuage = "";
  try {
    micro = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    souci = "Le micro n'est pas accessible.";
    rendre();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createMediaStreamSource(micro);
  noeud = ctx.createScriptProcessor(4096, 1, 1);
  morceaux = [];
  debut = horodatage();
  versDeLaDictee = pourLesNotes ? VERS_LES_NOTES : "";
  depart = Date.now();
  niveau = 0; crete = 0;
  noeud.onaudioprocess = (e) => {
    const bloc = e.inputBuffer.getChannelData(0);
    // Le niveau se lit pendant qu'on parle, et la crête se retient : un
    // enregistrement entièrement muet ne devait plus se découvrir le soir,
    // devant une transcription vide.
    let somme = 0, haut = 0;
    for (let i = 0; i < bloc.length; i++) {
      const v = Math.abs(bloc[i]);
      somme += bloc[i] * bloc[i];
      if (v > haut) haut = v;
    }
    niveau = Math.sqrt(somme / bloc.length);
    if (haut > crete) crete = haut;
    morceaux.push(reechantillonner(new Float32Array(bloc), ctx.sampleRate));
  };
  // Une sortie muette : sans elle, le nœud ne reçoit rien sur certains moteurs.
  const muet = ctx.createGain();
  muet.gain.value = 0;
  source.connect(noeud); noeud.connect(muet); muet.connect(ctx.destination);
  // Chrono et halo se posent à la main : refaire la page dix fois par
  // seconde couperait l'écoute en cours et ferait clignoter le bouton.
  await garderLEcranAllume();
  minuteur = setInterval(() => {
    const el = document.getElementById("chrono");
    if (el) el.textContent = duree(Math.round((Date.now() - depart) / 1000));
    const halo = document.getElementById("halo");
    // La racine étale le bas de l'échelle : une voix normale gonfle le halo
    // à moitié, un murmure le fait tout de même bouger.
    if (halo) halo.style.transform = `scale(${(1 + Math.min(1, Math.sqrt(niveau) * 1.9) * 0.42).toFixed(3)})`;
    // On laisse le temps de commencer à parler : sans ce délai, l'écran
    // annonçait un micro muet à la seconde même où l'on appuie.
    const muet = document.getElementById("muet");
    if (muet) muet.hidden = crete >= SEUIL_SILENCE || Date.now() - depart < AVANT_DE_S_INQUIETER;
  }, 100);
  rendre();
}

async function arreter() {
  if (!ctx) return;
  relacherLEcran();
  clearInterval(minuteur); minuteur = null;
  try { noeud.disconnect(); } catch (e) { /* déjà détaché */ }
  const octets = versWav(morceaux);
  let n = 0;
  for (const m of morceaux) n += m.length;
  const secondes = n / TAUX;
  try { await ctx.close(); } catch (e) { /* déjà fermé */ }
  if (micro) micro.getTracks().forEach((t) => t.stop());
  ctx = null; noeud = null; micro = null; morceaux = [];
  if (secondes < 0.5) { rendre(); return; }
  // On garde quand même un enregistrement muet — il n'est pas à nous de
  // décider qu'il ne vaut rien —, mais on le dit tout de suite.
  const capte = crete;
  // On garde d'abord, on envoie ensuite : un vocal ne se perd pas parce que
  // l'ordinateur était éteint.
  try {
    await invoke("vocal_garder", {
      debut, dureeS: secondes, wavB64: base64(octets),
      creneau: versDeLaDictee ? "" : creneauChoisi, destination: versDeLaDictee,
    });
  } catch (e) {
    souci = String(e);
  }
  if (estAujourdHui()) creneauChoisi = await creneauDeLHeure();
  if (capte < SEUIL_SILENCE) avis = "Rien n'a été capté par le micro.";
  await relire();
  void envoyerTout();
}

/**
 * L'application passe à l'arrière-plan pendant qu'elle enregistre.
 *
 * iOS suspend alors la page : le son cesse d'arriver, le chronomètre se fige,
 * et l'on croit enregistrer encore en rangeant le téléphone dans sa poche. On
 * termine donc proprement, avec ce qui a été capté, plutôt que de laisser
 * croire à une dictée qui n'a pas lieu.
 */
/** Quand l'application est passée en arrière-plan, pour savoir combien de temps elle y est restée. */
let cacheeDepuis = 0;
const QUART_D_HEURE = 15 * 60 * 1000;

document.addEventListener("visibilitychange", () => {
  if (document.hidden) cacheeDepuis = Date.now();
  else if (cacheeDepuis && Date.now() - cacheeDepuis > QUART_D_HEURE) {
    // Une note rapide commencée garde sa destination : on ne la change pas sous les doigts.
    if (pourLesNotes && !ecrit) { pourLesNotes = false; rendre(); }
    if (jourChoisi) void allerAuJour("");
  }
  if (document.hidden) fermerCamera();
  if (document.hidden && ctx) {
    void arreter().then(() => {
      avis = "Enregistrement arrêté : l'application est passée en arrière-plan.";
      rendre();
    });
  }
});

/** Base64 par tranches : une chaîne d'appels sur un tableau de deux millions d'octets déborde la pile. */
function base64(octets) {
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

// ── Déposer ───────────────────────────────────────────────────────────────

async function relire() {
  try { vocaux = await invoke("vocaux_liste"); } catch (e) { vocaux = []; }
  try { notes = await invoke("notes_liste"); } catch (e) { notes = []; }
  rendre();
}

/** Ce qui attend l'ordinateur, vocaux et notes mêlés, du plus ancien au plus récent. */
function enAttente() {
  return [
    ...vocaux.map((v) => ({ ...v, sorte: "vocal" })),
    ...notes.map((n) => ({ ...n, sorte: "note" })),
  ].sort((a, b) => String(a.debut).localeCompare(String(b.debut)));
}

/** Garde la note écrite, puis tente de la déposer. */
async function garderLaNote() {
  const champ = document.getElementById("note");
  const texte = (champ ? champ.value : brouillon).trim();
  if (!texte) { ecrit = false; brouillon = ""; rendre(); return; }
  try {
    await invoke("note_garder", {
      debut: horodatage(), texte,
      creneau: pourLesNotes ? "" : creneauChoisi, destination: pourLesNotes ? VERS_LES_NOTES : "",
    });
    ecrit = false; brouillon = ""; souci = "";
  } catch (e) {
    brouillon = texte;
    souci = String(e);
  }
  await relire();
  void envoyerTout();
}

/** Nuage répond-il ? On ne le demande que si le téléphone y est relié et connecté. */
async function tater() {
  if (!relais.relie || !relais.connecte) nuage = null;
  else {
    try { nuage = await invoke("relais_joignable"); } catch (e) { nuage = false; }
    // Un accès retiré dans Nuage se perd en route : l'écran redemande alors de se connecter.
    if (!nuage) { try { relais = await invoke("relais_lire"); } catch (e) { /* on garde ce qu'on savait */ } }
  }
  if (nuage) await rafraichirCreneaux();
  rendre();
}

/** Le jour d'aujourd'hui, au format du planning. */
const jourDuJour = () => maintenantIso().slice(0, 10);

/** Le jour où se range ce qu'on dicte : celui qu'on a choisi, ou aujourd'hui. */
const jourDeLaDictee = () => jourChoisi || jourDuJour();
const estAujourdHui = () => jourDeLaDictee() === jourDuJour();

/**
 * L'heure de la dictée, rangée au jour choisi : l'heure est celle de
 * l'horloge, le jour celui dont on parle. Une note rapide n'a pas de jour à
 * elle : elle est de maintenant.
 */
const horodatage = () => (pourLesNotes ? maintenantIso() : `${jourDeLaDictee()}${maintenantIso().slice(10)}`);

/** Combien de jours en arrière on peut remonter : deux semaines, pas l'année. */
const JOURS_EN_ARRIERE = 13;
/** Et en avant : jusqu'au bout de l'emploi du temps que l'ordinateur laisse sur Nuage. */
const JOURS_EN_AVANT = 13;

/** Un jour décalé de `n` jours : « 2026-10-02 » et -1 → « 2026-10-01 ». */
function decaler(jour, n) {
  const d = new Date(`${jour}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** Combien de jours séparent deux jours. */
const ecartEnJours = (de, a) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${de}T12:00:00`)) / 86400000);

const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const NOMS_MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « Vendredi 2 octobre », « Jeudi 1er octobre ». */
function dateLongue(jour) {
  const d = new Date(`${jour}T12:00:00`);
  const n = d.getDate();
  const s = `${NOMS_JOURS[d.getDay()]} ${n === 1 ? "1er" : n} ${NOMS_MOIS[d.getMonth()]}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Ce jour, vu d'aujourd'hui : « aujourd'hui », « hier », « il y a 4 jours », « demain », « dans 3 jours ». */
function proximite(jour) {
  const e = ecartEnJours(jour, jourDuJour());
  if (e === 0) return "aujourd'hui";
  if (e > 0) return e === 1 ? "hier" : e === 2 ? "avant-hier" : `il y a ${e} jours`;
  return e === -1 ? "demain" : e === -2 ? "après-demain" : `dans ${-e} jours`;
}

/** Le jour d'un envoi, en tête de sa ligne : rien pour aujourd'hui, « Hier », « Demain », « jeu. 1 oct. ». */
function jourCourt(jour) {
  const e = ecartEnJours(jour, jourDuJour());
  if (e === 0) return "";
  if (e === 1) return "Hier";
  if (e === -1) return "Demain";
  const d = new Date(`${jour}T12:00:00`);
  return `${NOMS_JOURS[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

/** Retient les créneaux reçus d'un jour. */
function noterCreneaux(jour, liste) {
  creneauxParJour.set(jour, liste);
  for (const c of liste) creneauxVus.set(c.id, c);
}

/**
 * Passe à un autre jour — vide : aujourd'hui.
 *
 * Ses créneaux viennent de ce qu'on a déjà reçu, sinon de l'ordinateur ou de
 * Nuage ; sans réseau, ils restent inconnus, et la dictée se range quand même
 * au bon jour.
 */
async function allerAuJour(jour) {
  jourChoisi = jour && jour !== jourDuJour() ? jour : "";
  choixOuvert = false;
  creneauChoisi = "";
  const connus = creneauxParJour.get(jourDeLaDictee());
  creneaux = connus ?? [];
  creneauxConnus = !!connus;
  rendre();
  await relireCreneaux();
  rendre();
  if (nuage) { await rafraichirCreneaux(); rendre(); }
}

/** Redemande l'emploi du temps du jour choisi, et retient celui de l'instant. */
async function rafraichirCreneaux() {
  const jour = jourDeLaDictee();
  try {
    // L'ordinateur les laisse sur Nuage, chiffrés : une heure et un intitulé, rien d'autre.
    const liste = await invoke("creneaux_du_relais", { jour });
    noterCreneaux(jour, liste);
    // On a pu changer de jour pendant la question : la réponse ne vaut que pour le sien.
    if (jour === jourDeLaDictee()) { creneaux = liste; creneauxConnus = true; }
  } catch (e) { /* hors réseau, ou jour que Nuage ne couvre pas : on garde ce qu'on avait */ }
  await relireCreneaux();
}

/** Relit ce qu'on a gardé, et pose le créneau de l'instant si on n'a rien choisi — aujourd'hui seulement. */
async function relireCreneaux() {
  if (!creneauxConnus) {
    const jour = jourDeLaDictee();
    try {
      const lu = await invoke("creneaux_du_jour", { jour });
      if (jour === jourDeLaDictee()) {
        creneauxConnus = !!lu.connus;
        creneaux = lu.creneaux ?? [];
        if (creneauxConnus) noterCreneaux(jour, creneaux);
      }
    } catch (e) { creneauxConnus = false; creneaux = []; }
  }
  if (!creneauChoisi && estAujourdHui()) creneauChoisi = await creneauDeLHeure();
}

/** Le créneau où l'on se trouve, d'après l'ordinateur autant que d'après l'heure. */
async function creneauDeLHeure() {
  try { return await invoke("creneau_maintenant", { heureIso: maintenantIso() }); }
  catch (e) { return ""; }
}

/** L'heure d'un créneau, telle qu'on l'écrit : « 09h00 ». */
const heureCourte = (hhmm) => String(hhmm || "").slice(0, 5).replace(":", "h");

/** Ce qu'on affiche d'un créneau : l'heure et l'intitulé. */
function libelleCreneau(id) {
  const c = creneaux.find((x) => x.id === id);
  if (!c) return "";
  return `${heureCourte(c.debut)} · ${c.matiere || "Créneau"}`;
}

/** L'intitulé seul : sous un vocal, son heure est déjà écrite. Celui d'un autre jour s'y trouve aussi. */
function matiereDuCreneau(id) {
  const c = creneaux.find((x) => x.id === id) ?? creneauxVus.get(id);
  return c ? c.matiere || heureCourte(c.debut) : "";
}

/**
 * Dépose ce qui attend sur Nuage, et s'arrête au premier refus : le reste est
 * gardé, et repartira au prochain passage.
 */
async function envoyerTout() {
  if (envoiEnCours) return;
  envoiEnCours = true;
  souci = "";
  rendre();
  let parties = 0;
  try {
    for (const x of enAttente()) {
      if (!relais.relie) { souci = "Le téléphone n'est pas relié à Nuage."; break; }
      if (!relais.connecte) { souci = "Le téléphone n'est pas connecté à votre compte Nuage."; break; }
      try {
        await invoke(x.sorte === "note" ? "note_deposer" : "vocal_deposer", { id: x.id });
      } catch (e) { souci = String(e); break; }
      parties += 1;
      await relire();
    }
  } finally {
    if (parties) {
      partiParNuage = `${parties} envoi${parties > 1 ? "s" : ""} parti${parties > 1 ? "s" : ""} par Nuage à ${heureDe(maintenantIso())}.`;
    }
    envoiEnCours = false;
    await relire();
    void tater();
  }
}

/**
 * Écoute un vocal en attente.
 *
 * Le lecteur vit en dehors de la page : celle-ci se redessine à chaque
 * changement, et un `<audio>` posé dedans s'arrêterait au premier envoi.
 */
async function ecouter(id) {
  if (ecoute === id) { arreterEcoute(); rendre(); return; }
  arreterEcoute();
  try {
    const b64 = await invoke("vocal_lire", { id });
    lecteur = new Audio(`data:audio/wav;base64,${b64}`);
    lecteur.onended = () => { arreterEcoute(); rendre(); };
    ecoute = id;
    await lecteur.play();
  } catch (e) {
    souci = "Lecture impossible : " + String(e);
    arreterEcoute();
  }
  rendre();
}

function arreterEcoute() {
  if (lecteur) { try { lecteur.pause(); } catch (e) { /* déjà arrêté */ } }
  lecteur = null;
  ecoute = "";
}

async function oublier(id, sorte) {
  if (ecoute === id) arreterEcoute();
  try { await invoke(sorte === "note" ? "note_oublier" : "vocal_oublier", { id }); }
  catch (e) { /* déjà parti */ }
  await relire();
}

// ── Répondre à l'ordinateur, par le WiFi ─────────────────────────────────
//
// L'ordinateur demande les pages d'un manuel ou une photo : il affiche un QR
// code. Le téléphone le lit, puis photographie les pages — chacune ajustée
// aussitôt prise — ou prend la photo, et envoie. La demande ne se retient
// pas : la suivante viendra avec son propre QR code. Les pages, si : elles
// restent sur le téléphone jusqu'à ce qu'on les supprime.

/** Retient la demande qu'on vient de lire : où envoyer, et quoi. */
async function accepterDemande(url) {
  const lue = await invoke("demande_lire", { url });
  demande = { url, serie: !!lue.serie, envoyees: 0 };
  demandeInfo = "";
  // Des pages attendaient un ordinateur : elles partent dès qu'il en demande.
  await relirePages();
  if (demande.serie && pages.aEnvoyer) void envoyerLesPages();
}

// ── Les pages d'un manuel ─────────────────────────────────────────────────
//
// Une photo, on ajuste les coins, on garde : la page est écrite aussitôt sur
// le téléphone, et part vers l'ordinateur pendant qu'on photographie la
// suivante. Une page qui n'a pas pu partir attend le prochain QR code ; une
// page partie reste sur le téléphone jusqu'à ce qu'on la supprime.

/** Les pages gardées sur le téléphone : où l'appareil les écrit, combien attendent, combien sont parties. */
let pages = { dossier: "", aEnvoyer: 0, envoyees: 0 };
/** Une tournée d'envoi en cours, et s'il faudra en refaire une : une page est arrivée entre-temps. */
let envoiPages = null, pagesEncore = false;

async function relirePages() {
  try { pages = await invoke("pages_etat"); } catch (e) { /* le dossier se recréera au prochain appel */ }
}

const enPages = (n) => `${n} page${n > 1 ? "s" : ""}`;

/** Envoie ce qui attend à l'ordinateur qui l'a demandé ; une seule tournée à la fois. */
function envoyerLesPages() {
  if (!demande || !demande.serie) return Promise.resolve();
  if (envoiPages) { pagesEncore = true; return envoiPages; }
  envoiPages = (async () => {
    try {
      do {
        pagesEncore = false;
        const n = await invoke("pages_envoyer", { url: demande.url });
        demande.envoyees += n;
      } while (pagesEncore && demande);
      souci = "";
    } catch (e) {
      // Rien n'est perdu : les pages attendent sur le téléphone.
      souci = `${String(e)} Les pages restent sur le téléphone.`;
    } finally {
      envoiPages = null;
      await relirePages();
      if (demande && demande.envoyees) demandeInfo = `${enPages(demande.envoyees)} envoyée${demande.envoyees > 1 ? "s" : ""} à l'ordinateur.`;
      rendre();
    }
  })();
  return envoiPages;
}

/** Ouvre l'appareil : chaque page gardée part aussitôt vers l'ordinateur. */
async function photographierLesPages() {
  if (!demande || demandeEnCours) return;
  demandeEnCours = true; souci = ""; rendre();
  try {
    await relirePages();
    const surPage = new window.__TAURI__.core.Channel();
    surPage.onmessage = () => { void relirePages().then(() => { void envoyerLesPages(); }); };
    await invoke("plugin:scanner|photographier", { dossier: pages.dossier, surPage });
  } catch (e) {
    souci = String(e);
  } finally {
    demandeEnCours = false;
    await envoyerLesPages();
    await relirePages();
    rendre();
  }
}

/** La suppression qu'on s'apprête à faire, le temps de la confirmer : « envoyees », ou « toutes ». */
let pagesAOublier = "";

/** Supprime les pages parties — ou toutes, celles qui attendent comprises. */
async function oublierLesPages() {
  const toutes = pagesAOublier === "toutes";
  pagesAOublier = "";
  try { pages = await invoke("pages_oublier", { toutes }); } catch (e) { souci = String(e); }
  rendre();
}

/** Dit à l'ordinateur que le manuel est complet, et oublie la demande. */
async function terminerLaDemande() {
  if (!demande) return;
  const { url, envoyees } = demande;
  try { await invoke("demande_terminer", { url }); } catch (e) { /* l'ordinateur a déjà fermé : rien à dire de plus */ }
  demande = null;
  demandeInfo = envoyees ? `Manuel envoyé : ${envoyees} page${envoyees > 1 ? "s" : ""}.` : "";
  rendre();
}

/** Une photo, ramenée à une taille d'écran : trois mégapixels suffisent, et l'envoi reste rapide. */
async function photoReduite(fichier) {
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = adresse;
    await image.decode();
    const k = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
    const toile = document.createElement("canvas");
    toile.width = Math.round(image.naturalWidth * k);
    toile.height = Math.round(image.naturalHeight * k);
    toile.getContext("2d").drawImage(image, 0, 0, toile.width, toile.height);
    return toile.toDataURL("image/jpeg", 0.88).split(",")[1];
  } finally {
    URL.revokeObjectURL(adresse);
  }
}

/** Envoie la photo prise à l'ordinateur qui l'a demandée. */
async function envoyerLaPhoto(fichier) {
  if (!demande || !fichier) return;
  demandeEnCours = true; souci = ""; demandeInfo = "Envoi de la photo…"; rendre();
  try {
    await invoke("demande_envoyer_photo", { url: demande.url, imageB64: await photoReduite(fichier), ext: "jpg" });
    demande = null;
    demandeInfo = "Photo envoyée.";
  } catch (e) {
    demandeInfo = "";
    souci = String(e);
  } finally {
    demandeEnCours = false; rendre();
  }
}

// ── Lire un QR code ───────────────────────────────────────────────────────
//
// Le seul geste pour relier quoi que ce soit : on pointe la caméra sur le QR
// code que montre l'ordinateur. Celui de Nuage relie les dictées ; celui
// d'une demande ouvre l'envoi des pages ou de la photo. Rien n'est
// photographié — chaque vue est analysée puis jetée, et la caméra se referme
// dès qu'un code est lu. Le décodage se fait ici, en JavaScript (jsQR).

/** La caméra ouverte pour lire un QR code, la boucle qui l'examine, et pour quelle carte. */
let camera = null, lecture = null, scanSouci = "", lecturePour = "";

async function lireUnQrCode(pour) {
  scanSouci = "";
  lecturePour = pour;
  try {
    camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
  } catch (e) {
    scanSouci = "La caméra n'est pas accessible.";
    camera = null;
    rendre();
    return;
  }
  rendre();
  const video = document.getElementById("vue");
  if (!video) { fermerCamera(); return; }
  video.srcObject = camera;
  video.setAttribute("playsinline", "");
  try { await video.play(); } catch (e) { /* la lecture démarrera d'elle-même */ }

  const toile = document.createElement("canvas");
  const pinceau = toile.getContext("2d", { willReadFrequently: true });
  lecture = setInterval(() => {
    if (!video.videoWidth) return;
    toile.width = video.videoWidth;
    toile.height = video.videoHeight;
    pinceau.drawImage(video, 0, 0, toile.width, toile.height);
    const vue = pinceau.getImageData(0, 0, toile.width, toile.height);
    const trouve = window.jsQR ? window.jsQR(vue.data, vue.width, vue.height) : null;
    if (trouve && trouve.data) {
      fermerCamera();
      void codeLu(trouve.data);
    }
  }, 220);
}

function fermerCamera() {
  if (lecture) { clearInterval(lecture); lecture = null; }
  if (camera) { camera.getTracks().forEach((t) => t.stop()); camera = null; }
  lecturePour = "";
}

const sansEspaces = (t) => String(t || "").replace(/\s+/g, "");

/**
 * Ce que porte le code lu : le relais de Nuage, ou une demande de
 * l'ordinateur. Lu d'une carte ou de l'autre, il va où il doit aller.
 */
async function codeLu(lu) {
  const code = sansEspaces(lu);
  try {
    if (code.startsWith("maitrize-relais-ordinateur:")) {
      throw "Ce code est celui de l'autre ordinateur, pas celui du téléphone.";
    }
    if (code.startsWith("maitrize-relais:")) {
      relais = await invoke("relais_ecrire", { code });
      nuage = null;
      partiParNuage = "";
      scanSouci = "";
      connexionSouci = "";
      rendre();
      // Ce qui attendait part dès qu'on est relié — et connecté, si c'est le même compte qu'avant.
      void tater().then(() => { if (nuage && enAttente().length) void envoyerTout(); });
      return;
    }
    if (/^https?:\/\//.test(code)) {
      await accepterDemande(code);
      scanSouci = "";
      rendre();
      return;
    }
    throw "Ce n'est pas un QR code de Maitrize.";
  } catch (e) {
    scanSouci = String(e);
    rendre();
  }
}

/** Oublie le relais de Nuage : le téléphone rend son accès, et plus rien ne part jusqu'au prochain QR code. */
async function oublierLeRelais() {
  try { await invoke("relais_oublier"); } catch (e) { /* déjà oublié */ }
  relais = SANS_RELAIS;
  nuage = null;
  partiParNuage = "";
  connexionSouci = "";
  rendre();
}

/**
 * Se connecte au compte Nuage qui porte le dossier.
 *
 * La page de connexion de Nuage s'ouvre dans une feuille de Safari ; pendant
 * qu'on s'y connecte, Rust demande à Nuage si c'est fait, puis garde le mot de
 * passe que Nuage remet au téléphone, et l'on referme la feuille.
 */
async function seConnecter() {
  if (connexionEnCours) return;
  connexionEnCours = true;
  connexionSouci = "";
  rendre();
  try {
    const page = await invoke("nuage_connexion_commencer");
    const attente = invoke("nuage_connexion_attendre");
    invoke("plugin:scanner|ouvrir_connexion", { url: page })
      .then((r) => { if (r && r.annulee) void invoke("nuage_connexion_annuler"); })
      .catch((e) => { connexionSouci = String(e); void invoke("nuage_connexion_annuler"); });
    try {
      relais = await attente;
    } finally {
      void invoke("plugin:scanner|fermer_connexion").catch(() => {});
    }
    nuage = null;
    partiParNuage = "";
    void tater().then(() => { if (nuage && enAttente().length) void envoyerTout(); });
  } catch (e) {
    // Refermer la page n'est pas une erreur : on reste où l'on était.
    if (!/annulée/.test(String(e))) connexionSouci = String(e);
  } finally {
    connexionEnCours = false;
    rendre();
  }
}

// ── Afficher ──────────────────────────────────────────────────────────────

const duree = (s) => `${Math.floor(s / 60)}:${p2(s % 60)}`;

function libelleDuree(s) {
  const n = Math.round(s);
  return n >= 60 ? `${Math.floor(n / 60)} min ${p2(n % 60)}` : `${n} s`;
}

const heureDe = (iso) => (iso.slice(11, 16) || "--:--").replace(":", "h");

/** Ce qu'on met dans une page : le texte d'une note n'y est pas du HTML. */
const echapper = (t) => String(t ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

/** La première ligne d'une note, pour la reconnaître dans la liste : l'écran la coupe à sa largeur. */
const apercu = (t) => String(t ?? "").split("\n")[0].trim().slice(0, 160);

/** « 340 ko », « 2,1 Mo » : de quoi juger si le dépôt va être long. */
function poids(octets) {
  return octets >= 1e6
    ? `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`
    : `${Math.round(octets / 1000)} ko`;
}

// Des icônes dessinées au trait, dans la couleur du texte : les emojis n'ont
// ni la même taille ni la même teinte d'un iPhone à l'autre.
const ICONES = {
  micro: '<rect x="9" y="2.5" width="6" height="11.5" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v4.5M8.5 21.5h7"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor" stroke="none"/>',
  crayon: '<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  page: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  nuage: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.3 9.6 4.5 4.5 0 0 0 7 18.5z"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 15.8a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>',
  lecture: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="7" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none"/><rect x="13.5" y="5.5" width="3.5" height="13" rx="1" fill="currentColor" stroke="none"/>',
  poubelle: '<path d="M4 7h16M10 11v6M14 11v6M9 7V4.5h6V7"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>',
  envoyer: '<path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/>',
  coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  epingle: '<path d="M12 21s6.5-6.2 6.5-11a6.5 6.5 0 0 0-13 0c0 4.8 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  chevron: '<path d="M7 10l5 5 5-5"/>',
  gauche: '<path d="M14.5 6l-6 6 6 6"/>',
  photo: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  droite: '<path d="M9.5 6l6 6-6 6"/>',
  cadenas: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19.5h1.5M19.5 14v1.5"/>',
  coller: '<rect x="8" y="3" width="8" height="4" rx="1.2"/><path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  liste: '<path d="M9.5 6.5H20M9.5 12H20M9.5 17.5H20"/><path d="M4.5 6.5h1M4.5 12h1M4.5 17.5h1"/>',
  lien: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  attention: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
};

const icone = (nom, classe = "") =>
  `<svg class="ic ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;

/**
 * Sous quoi l'on enregistre, et comment en changer.
 *
 * On dicte parfois en sortant de la salle, ou une heure plus tard en
 * repensant à la séance : l'heure seule se trompe alors, et c'est le
 * téléphone qui était là.
 */
function bandeauCreneau() {
  if (!creneauxConnus) return `<p class="pastille muette">${icone("epingle")}<span>Créneau inconnu</span></p>`;
  // L'ordinateur a répondu, et il n'y a rien : un dimanche, des vacances. On
  // enregistre quand même, et c'est l'ordinateur qui rangera au retour.
  if (!creneaux.length) return `<p class="pastille muette">${icone("epingle")}<span>Pas de créneau ${estAujourdHui() ? "aujourd'hui" : "ce jour-là"}</span></p>`;
  if (choixOuvert) {
    const rang = (id, heure, libelle) => `
      <button class="choix-rang${id === creneauChoisi ? " on" : ""}" data-creneau="${echapper(id)}">
        <b>${echapper(heure)}</b><span>${echapper(libelle)}</span>${id === creneauChoisi ? icone("coche") : ""}
      </button>`;
    return `<div class="groupe choix">
      ${creneaux.map((c) => rang(c.id, heureCourte(c.debut), c.matiere || "Créneau")).join("")}
      ${rang("", "—", "Selon l'heure")}
    </div>`;
  }
  return `<button class="pastille" id="changer-creneau">${icone("epingle")}<span>${echapper(libelleCreneau(creneauChoisi) || "Selon l'heure")}</span>${icone("chevron", "petit")}</button>`;
}

/**
 * Le jour dont on parle, et deux petites flèches pour en changer. Un autre
 * jour qu'aujourd'hui se voit de loin ; toucher sa date ramène à aujourd'hui.
 */
function barreDuJour() {
  const jour = jourDeLaDictee();
  const ecart = ecartEnJours(jour, jourDuJour());
  const autre = ecart !== 0;
  // Pendant une dictée, le jour est déjà pris : on le montre, on n'en change pas.
  const fige = !!ctx;
  const texte = `<b>${dateLongue(jour)}</b><span>${proximite(jour)}</span>`;
  return `<div class="jour${autre ? " autre" : ""}">
    <button class="jour-fleche" id="jour-avant" aria-label="Jour précédent" ${fige || ecart >= JOURS_EN_ARRIERE ? "disabled" : ""}>${icone("gauche")}</button>
    ${autre && !fige ? `<button class="jour-texte" id="jour-aujourdhui" aria-label="Revenir à aujourd'hui">${texte}</button>` : `<span class="jour-texte">${texte}</span>`}
    <button class="jour-fleche" id="jour-apres" aria-label="Jour suivant" ${fige || ecart <= -JOURS_EN_AVANT ? "disabled" : ""}>${icone("droite")}</button>
  </div>`;
}

/**
 * Où va ce qu'on dicte : au cahier journal, rangé au créneau, ou aux notes
 * rapides de l'ordinateur. Pendant une dictée, le choix est pris : on le
 * montre, on n'en change pas.
 */
function choixDeDestination() {
  const fige = ctx ? "disabled" : "";
  const bouton = (id, ico, libelle, on) =>
    `<button id="${id}" class="${on ? "on" : ""}" aria-pressed="${on}" ${fige}>${icone(ico, "petit")}<span>${libelle}</span></button>`;
  return `<div class="destination" role="group" aria-label="Où va la dictée">
    ${bouton("vers-journal", "page", "Cahier journal", !pourLesNotes)}
    ${bouton("vers-notes", "liste", "Notes rapides", pourLesNotes)}
  </div>`;
}

/** À la place du jour et du créneau, ce que deviendra la note : un tiret de plus. */
const versLesNotes = () =>
  `<p class="pastille muette">${icone("liste")}<span>Un nouveau tiret dans les notes rapides</span></p>`;

/** Le grand bouton, et l'autre façon de prendre une note : l'écrire. */
const auRepos = () => `
  <button class="rond" id="go" aria-label="${pourLesNotes ? "Dicter une note rapide" : "Dicter"}">${icone("micro")}</button>
  <p class="rond-legende">${pourLesNotes ? "Dicter une note rapide" : "Dicter"}</p>
  <button class="tuile seule" id="ecrire">${icone("crayon")}${pourLesNotes ? "Écrire une note rapide" : "Écrire une note"}</button>`;

/** Pendant qu'on dicte : le temps, le halo qui suit la voix, et de quoi s'arrêter. */
const enDictee = () => `
  <p class="chrono" id="chrono">${duree(Math.round((Date.now() - depart) / 1000))}</p>
  <div class="rond-cadre">
    <span class="halo" id="halo"></span>
    <button class="rond rouge" id="stop" aria-label="Terminer">${icone("stop")}</button>
  </div>
  <p class="rond-legende">Terminer</p>
  <p class="muet" id="muet" hidden>Le micro ne capte rien</p>`;

const editeurDeNote = () => `
  <div class="note-carte">
    <textarea id="note" rows="5" placeholder="${pourLesNotes ? "Votre note rapide…" : "Votre note…"}">${echapper(brouillon)}</textarea>
    <div class="deux">
      <button class="btn-doux" id="annuler-note">Annuler</button>
      <button class="btn-plein" id="garder-note">Garder</button>
    </div>
  </div>`;

/** Ce qui vient de se passer — un avertissement, une erreur, un envoi : à lire en passant. */
function bulles() {
  const b = [];
  if (avis) b.push(`<p class="bulle alerte">${icone("attention")}<span>${echapper(avis)}</span></p>`);
  if (souci) b.push(`<p class="bulle erreur">${icone("attention")}<span>${echapper(souci)}</span></p>`);
  if (!ctx && partiParNuage) b.push(`<p class="bulle">${icone("nuage")}<span>${echapper(partiParNuage)}</span></p>`);
  return b.join("");
}

/** Nuage, tel que l'en-tête le dit : prêt, injoignable, ou pas encore regardé. */
function etatDeNuage() {
  if (!relais.relie) return { classe: "", texte: "Non relié" };
  if (!relais.connecte) return { classe: "loin", texte: "À connecter" };
  if (nuage === null) return { classe: "", texte: "…" };
  return nuage ? { classe: "ok", texte: "Nuage prêt" } : { classe: "loin", texte: "Hors ligne" };
}

function rangDAttente(x) {
  const note = x.sorte === "note";
  const matiere = x.destination === VERS_LES_NOTES ? "Notes rapides" : x.creneau ? matiereDuCreneau(x.creneau) : "";
  // Rangé à un autre jour qu'aujourd'hui : on le dit en tête de la ligne.
  const jour = jourCourt(String(x.debut).slice(0, 10));
  const sous = [jour, heureDe(x.debut), matiere, !note && x.octets ? poids(x.octets) : ""].filter(Boolean).map(echapper).join(" · ");
  return `<div class="rang">
    <span class="ico">${icone(note ? "crayon" : "micro")}</span>
    <span class="rang-texte">
      <span class="rang-titre">${note ? echapper(apercu(x.texte)) : `Dictée · ${libelleDuree(x.dureeS)}`}</span>
      <span class="rang-sous"><span class="coupe">${sous}</span></span>
    </span>
    ${note ? "" : `<button class="icone-btn" data-ecouter="${echapper(x.id)}" aria-label="${ecoute === x.id ? "Pause" : "Écouter"}">${icone(ecoute === x.id ? "pause" : "lecture")}</button>`}
    <button class="icone-btn danger" data-oublier="${echapper(x.id)}" data-sorte="${x.sorte}" aria-label="Supprimer">${icone("poubelle")}</button>
  </div>`;
}

function listeDAttente(attente) {
  if (!attente.length) {
    return `<p class="titre">À envoyer</p>
      <div class="groupe"><div class="rang vide-ok"><span class="ico">${icone("coche")}</span><span class="rang-texte">Tout est envoyé</span></div></div>`;
  }
  return `<p class="titre">À envoyer · ${attente.length}</p>
    <div class="groupe">${attente.map(rangDAttente).join("")}</div>
    <button class="btn-plein" id="envoyer" ${envoiEnCours ? "disabled" : ""}>${icone("envoyer")}${envoiEnCours ? "Envoi…" : "Envoyer maintenant"}</button>`;
}

/** L'en-tête d'une partie de l'écran : par où elle passe, d'un coup d'œil. */
const entete = (ico, titre, voie) => `<h2 class="partie">${icone(ico)}<span>${titre}</span><small>${voie}</small></h2>`;

/** La vue de la caméra, quand elle lit un QR code pour cette carte. */
const vueDeLaCamera = (pour) => (camera && lecturePour === pour
  ? `<video id="vue" class="vue" playsinline autoplay muted></video>
     <button class="btn-doux" id="stop-scan">Arrêter la caméra</button>`
  : "");

/** Relier le téléphone à Nuage : le QR code que montre l'ordinateur, rien d'autre. */
function carteNuage() {
  return `<div class="carte">
    <div class="carte-tete"><span class="grand-ico">${icone("nuage")}</span><h3>Relier à l'ordinateur</h3></div>
    ${vueDeLaCamera("nuage") || `<button class="btn-plein" id="lire-nuage">${icone("qr")}Scanner le QR code</button>`}
    ${scanSouci && lecturePour !== "wifi" && !demande ? `<p class="erreur-ligne">${echapper(scanSouci)}</p>` : ""}
  </div>`;
}

/**
 * Se connecter au compte qui porte le dossier : le QR code l'a dit, la page de
 * Nuage le demande. C'est le seul compte qui ouvre le dossier du téléphone.
 */
function carteConnexion() {
  return `<div class="carte">
    <div class="carte-tete"><span class="grand-ico">${icone("cadenas")}</span><h3>Se connecter à Nuage</h3>
      <p class="sous">avec le compte <b>${echapper(relais.compte)}</b></p></div>
    <button class="btn-plein" id="se-connecter" ${connexionEnCours ? "disabled" : ""}>${icone("cadenas")}${connexionEnCours ? "Connexion…" : "Se connecter"}</button>
    ${connexionSouci ? `<p class="erreur-ligne">${echapper(connexionSouci)}</p>` : ""}
    <button class="btn-doux" id="oublier-relais" ${connexionEnCours ? "disabled" : ""}>Oublier ce QR code</button>
  </div>`;
}

/** Le lien avec Nuage, une fois connecté : son état, le compte, et de quoi l'oublier. */
function lienNuage() {
  const e = etatDeNuage();
  return `<div class="groupe">
    <div class="rang">
      <span class="ico">${icone("nuage")}</span>
      <span class="rang-texte"><span class="rang-titre">Nuage</span>
        <span class="rang-sous"><span class="pt ${e.classe}"></span><span class="coupe">${echapper(e.texte)} · ${echapper(relais.compte)}</span></span></span>
      <button class="lien-btn rouge" id="oublier-relais">Oublier</button>
    </div>
  </div>`;
}

/** Les pages gardées sur le téléphone : combien, combien attendent, et de quoi les supprimer. */
function pagesGardees() {
  const total = pages.aEnvoyer + pages.envoyees;
  if (!total) return "";
  if (pagesAOublier) {
    const toutes = pagesAOublier === "toutes";
    const n = toutes ? total : pages.envoyees;
    const question = toutes
      ? `Supprimer les ${enPages(n)} du téléphone${pages.aEnvoyer ? `, dont ${enPages(pages.aEnvoyer)} pas encore envoyée${pages.aEnvoyer > 1 ? "s" : ""}` : ""} ?`
      : `Supprimer du téléphone ${n > 1 ? `les ${n} pages déjà envoyées` : "la page déjà envoyée"} ?`;
    return `<div class="pages-gardees confirmer"><p>${echapper(question)}</p>
      <div class="pages-boutons"><button class="lien-btn rouge" id="confirmer-oubli">Supprimer</button><button class="lien-btn" id="annuler-oubli">Garder</button></div></div>`;
  }
  const dit = `${enPages(total)} sur le téléphone · ${pages.aEnvoyer ? `${pages.aEnvoyer} à envoyer` : "toutes envoyées"}`;
  return `<div class="pages-gardees">
    <p>${icone("page")}<span>${echapper(dit)}</span></p>
    ${pages.aEnvoyer && !demande ? `<p class="pages-aide">Elles partiront au prochain QR code « Scanner avec le compagnon » de l'ordinateur.</p>` : ""}
    <div class="pages-boutons">
      ${pages.envoyees ? `<button class="lien-btn" id="oublier-envoyees">Supprimer les envoyées</button>` : ""}
      ${pages.aEnvoyer ? `<button class="lien-btn rouge" id="oublier-toutes">Tout supprimer</button>` : ""}
    </div>
  </div>`;
}

/**
 * Répondre à l'ordinateur, par le WiFi : lire son QR code, puis photographier
 * les pages qu'il attend ou prendre la photo qu'il demande.
 */
function carteWifi() {
  const occupe = demandeEnCours ? "disabled" : "";
  let corps;
  if (!demande) {
    corps = vueDeLaCamera("wifi") || `<button class="btn-plein" id="lire-wifi">${icone("qr")}Scanner le QR code</button>`;
  } else if (demande.serie) {
    corps = `<button class="btn-plein" id="photographier-pages" ${occupe}>${icone("photo")}${demande.envoyees ? "Photographier d'autres pages" : "Photographier les pages"}</button>
      <button class="btn-doux" id="terminer-demande" ${occupe}>${icone("coche")}Terminer</button>`;
  } else {
    corps = `<label class="btn-plein${demandeEnCours ? " inactif" : ""}">${icone("photo")}Prendre la photo
        <input type="file" id="photo" accept="image/*" capture="environment" hidden ${occupe}></label>
      <button class="btn-doux" id="annuler-demande" ${occupe}>Annuler</button>`;
  }
  const info = demandeInfo ? `<p class="carte-info">${icone(demande ? "wifi" : "coche")}<span>${echapper(demandeInfo)}</span></p>` : "";
  const erreur = scanSouci && (lecturePour === "wifi" || demande || relais.relie) ? `<p class="erreur-ligne">${echapper(scanSouci)}</p>` : "";
  return `<div class="carte carte-wifi">${corps}${info}${erreur}${pagesGardees()}</div>`;
}

function rendre() {
  const el = document.getElementById("ecran");
  if (!el) return;
  const enCours = !!ctx;

  // En tête, l'état de Nuage : c'est par lui que partent les dictées.
  const tete = document.getElementById("liaison");
  if (tete) {
    const e = etatDeNuage();
    tete.hidden = !relais.relie;
    tete.className = `liaison ${e.classe}`;
    tete.innerHTML = `${icone("nuage", "petit")}<span class="pt"></span>${echapper(e.texte)}`;
  }

  // Deux parties, qui ne se mêlent pas : ce qui passe par Nuage, ce qui passe par le WiFi.
  const pret = relais.relie && relais.connecte;
  const parNuage = !relais.relie ? carteNuage() : !relais.connecte ? carteConnexion() : `
    <section class="heros">
      ${choixDeDestination()}
      ${pourLesNotes ? versLesNotes() : barreDuJour() + bandeauCreneau()}
      ${enCours ? enDictee() : ecrit ? editeurDeNote() : auRepos()}
    </section>
    ${bulles()}
    ${enCours || ecrit ? "" : listeDAttente(enAttente()) + lienNuage()}`;
  el.innerHTML = `
    ${entete("nuage", "Dictées et notes", "par Nuage")}
    ${parNuage}
    ${!pret ? bulles() : ""}
    ${enCours || ecrit ? "" : `${entete("wifi", "Pages et photos", "par le WiFi, à la demande de l'ordinateur")}${carteWifi()}`}
  `;

  const clic = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  clic("go", () => { void demarrer(); });
  clic("stop", () => { void arreter(); });
  clic("envoyer", () => { void envoyerTout(); });
  clic("lire-nuage", () => { void lireUnQrCode("nuage"); });
  clic("se-connecter", () => { void seConnecter(); });
  clic("lire-wifi", () => { void lireUnQrCode("wifi"); });
  clic("stop-scan", () => { fermerCamera(); rendre(); });
  clic("photographier-pages", () => { void photographierLesPages(); });
  clic("oublier-envoyees", () => { pagesAOublier = "envoyees"; rendre(); });
  clic("oublier-toutes", () => { pagesAOublier = "toutes"; rendre(); });
  clic("confirmer-oubli", () => { void oublierLesPages(); });
  clic("annuler-oubli", () => { pagesAOublier = ""; rendre(); });
  clic("terminer-demande", () => { void terminerLaDemande(); });
  clic("annuler-demande", () => { demande = null; demandeInfo = ""; rendre(); });
  const photo = document.getElementById("photo");
  if (photo) photo.onchange = () => { const f = photo.files && photo.files[0]; if (f) void envoyerLaPhoto(f); };
  clic("changer-creneau", () => { choixOuvert = true; rendre(); });
  clic("jour-avant", () => { void allerAuJour(decaler(jourDeLaDictee(), -1)); });
  clic("jour-apres", () => { void allerAuJour(decaler(jourDeLaDictee(), 1)); });
  clic("jour-aujourdhui", () => { void allerAuJour(""); });
  el.querySelectorAll("[data-creneau]").forEach((b) => {
    b.onclick = () => { creneauChoisi = b.dataset.creneau; choixOuvert = false; rendre(); };
  });
  clic("vers-journal", () => { pourLesNotes = false; rendre(); });
  clic("vers-notes", () => { pourLesNotes = true; choixOuvert = false; rendre(); });
  clic("ecrire", () => { ecrit = true; rendre(); document.getElementById("note")?.focus(); });
  clic("annuler-note", () => { ecrit = false; brouillon = ""; rendre(); });
  clic("garder-note", () => { void garderLaNote(); });
  const champNote = document.getElementById("note");
  if (champNote) champNote.oninput = () => { brouillon = champNote.value; };
  clic("oublier-relais", () => { void oublierLeRelais(); });
  el.querySelectorAll("[data-oublier]").forEach((b) => {
    b.onclick = () => { void oublier(b.dataset.oublier, b.dataset.sorte); };
  });
  el.querySelectorAll("[data-ecouter]").forEach((b) => {
    b.onclick = () => { void ecouter(b.dataset.ecouter); };
  });
}

// ── Au démarrage ──────────────────────────────────────────────────────────

// Pas de zoom : l'écran est fait pour le pouce, et un pincement le déréglait.
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("dblclick", (e) => e.preventDefault(), { passive: false });

(async () => {
  try { relais = await invoke("relais_lire"); } catch (e) { relais = SANS_RELAIS; }
  await relireCreneaux();
  await relirePages();
  await relire();
  // Ce qui attendait d'hier part dès l'ouverture.
  void tater().then(() => { if (nuage && enAttente().length) void envoyerTout(); });
  // Le réseau revient en sortant du métro : on retente de loin en loin, et
  // l'on dépose ce qui attend dès que Nuage répond.
  setInterval(async () => {
    if (ctx || envoiEnCours) return;
    await tater();
    if (nuage && enAttente().length) void envoyerTout();
  }, 20000);
})();
