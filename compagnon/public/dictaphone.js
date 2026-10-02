// ── Le dictaphone ─────────────────────────────────────────────────────────
//
// On dicte en classe, l'ordinateur fermé dans le sac. Un bouton, un
// chronomètre, et rien d'autre à comprendre.
//
// Le son est capturé à 16 kHz mono et empaqueté en WAV ici même : c'est ce que
// Whisper attend de l'autre côté, et cela évite de décoder un format de
// téléphone sur le Mac. Le fichier est ensuite confié à Rust, qui le garde
// jusqu'à ce que l'ordinateur réponde.

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
let vocaux = [], joignable = null, envoiEnCours = false, souci = "";
/**
 * Le relais de Nuage : relié ou non, et s'il répond.
 *
 * L'ordinateur n'est pas toujours sur le même WiFi que le téléphone — le plus
 * souvent, il est fermé dans le sac. Par Nuage, ce qui attend part quand
 * même, scellé pour lui, et il le relèvera en s'ouvrant.
 */
let relais = { relie: false, serveur: "" }, nuage = null;
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
 * dictée se range alors au jour choisi, à l'heure de l'horloge. Ce choix ne
 * dure pas : il ne survit ni à la fermeture de l'application, ni à un quart
 * d'heure passé en arrière-plan.
 */
let jourChoisi = "";
/** Les créneaux déjà reçus, par jour et par identifiant : une dictée d'hier garde son intitulé dans la liste. */
const creneauxParJour = new Map(), creneauxVus = new Map();
/** Faux tant que l'ordinateur ne nous a rien dit du jour : une journée sans
 *  créneau n'est pas une ignorance, et l'écran ne doit pas accuser le réseau. */
let creneauxConnus = false;
/** Le scanner de pages : ouvert, puis ce qu'il en est advenu. */
let scanEnCours = false, scanInfo = "";

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
    await invoke("vocal_garder",
      { debut, dureeS: secondes, wavB64: base64(octets), creneau: creneauChoisi });
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
  else if (jourChoisi && cacheeDepuis && Date.now() - cacheeDepuis > QUART_D_HEURE) void allerAuJour("");
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
    await invoke("note_garder", { debut: horodatage(), texte, creneau: creneauChoisi });
    ecrit = false; brouillon = ""; souci = "";
  } catch (e) {
    brouillon = texte;
    souci = String(e);
  }
  await relire();
  void envoyerTout();
}

/** Y a-t-il quelqu'un à qui parler : l'ordinateur sur le WiFi, ou à défaut le dossier de Nuage ? */
async function tater() {
  try { joignable = adresse ? await invoke("ordinateur_joignable") : false; } catch (e) { joignable = false; }
  // Nuage ne s'interroge que si l'ordinateur n'est pas là : à côté de lui, rien ne sort du WiFi.
  if (joignable || !relais.relie) nuage = joignable ? null : false;
  else { try { nuage = await invoke("relais_joignable"); } catch (e) { nuage = false; } }
  if (joignable || nuage) await rafraichirCreneaux();
  rendre();
}

/** Par où part ce qui attend : droit sur l'ordinateur s'il est là, par Nuage sinon. */
const voie = () => (joignable ? "direct" : relais.relie ? "nuage" : adresse ? "direct" : "");

/** Le téléphone est relié à quelque chose : il peut garder, et tenter d'envoyer. */
const relieQuelquePart = () => !!adresse || relais.relie;

/** Le jour d'aujourd'hui, au format du planning. */
const jourDuJour = () => maintenantIso().slice(0, 10);

/** Le jour où se range ce qu'on dicte : celui qu'on a choisi, ou aujourd'hui. */
const jourDeLaDictee = () => jourChoisi || jourDuJour();
const estAujourdHui = () => jourDeLaDictee() === jourDuJour();

/** L'heure de la dictée, rangée au jour choisi : l'heure est celle de l'horloge, le jour celui dont on parle. */
const horodatage = () => `${jourDeLaDictee()}${maintenantIso().slice(10)}`;

/** Combien de jours en arrière on peut remonter : deux semaines, pas l'année. */
const JOURS_EN_ARRIERE = 13;

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

/** Ce jour, vu d'aujourd'hui : « aujourd'hui », « hier », « il y a 4 jours ». */
function proximite(jour) {
  const e = ecartEnJours(jour, jourDuJour());
  return e === 0 ? "aujourd'hui" : e === 1 ? "hier" : e === 2 ? "avant-hier" : e > 0 ? `il y a ${e} jours` : "à venir";
}

/** Le jour d'un envoi, en tête de sa ligne : rien pour aujourd'hui, « Hier », « jeu. 1 oct. ». */
function jourCourt(jour) {
  const e = ecartEnJours(jour, jourDuJour());
  if (e === 0) return "";
  if (e === 1) return "Hier";
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
  if (joignable || nuage) { await rafraichirCreneaux(); rendre(); }
}

/** Redemande l'emploi du temps du jour choisi, et retient celui de l'instant. */
async function rafraichirCreneaux() {
  const jour = jourDeLaDictee();
  try {
    // L'ordinateur les dit lui-même quand il est là ; sinon, il les a laissés sur Nuage.
    const liste = await invoke(joignable ? "creneaux_rafraichir" : "creneaux_du_relais", { jour });
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

/** La commande qui dépose un élément par une voie : droit sur l'ordinateur, ou par Nuage. */
const commandeDEnvoi = (sorte, par) =>
  `${sorte === "note" ? "note" : "vocal"}_${par === "nuage" ? "deposer" : "envoyer"}`;

/**
 * Dépose ce qui attend, et s'arrête au premier refus : le reste est gardé.
 *
 * L'ordinateur d'abord, quand il est sur le WiFi : rien ne sort alors du
 * réseau local. Sinon par Nuage, si le téléphone y est relié — et si
 * l'ordinateur décroche en cours de route, Nuage prend la suite.
 */
async function envoyerTout() {
  if (envoiEnCours) return;
  envoiEnCours = true;
  souci = "";
  rendre();
  let parNuage = 0;
  try {
    for (const x of enAttente()) {
      let par = voie();
      if (!par) { souci = "Aucune liaison avec l'ordinateur."; break; }
      try {
        await invoke(commandeDEnvoi(x.sorte, par), { id: x.id });
      } catch (e) {
        if (par !== "direct" || !relais.relie) { souci = String(e); break; }
        // L'ordinateur ne répond plus : on ne s'obstine pas, Nuage prend la suite.
        joignable = false;
        par = "nuage";
        try { await invoke(commandeDEnvoi(x.sorte, par), { id: x.id }); }
        catch (e2) { souci = String(e2); break; }
      }
      if (par === "nuage") parNuage += 1;
      await relire();
    }
  } finally {
    if (parNuage) {
      partiParNuage = `${parNuage} envoi${parNuage > 1 ? "s" : ""} parti${parNuage > 1 ? "s" : ""} par Nuage à ${heureDe(maintenantIso())}.`;
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

// ── Scanner un manuel ─────────────────────────────────────────────────────
//
// Le scanner de documents de l'iPhone — celui de Notes — trouve la page, la
// redresse, la nettoie, et enchaîne. Les pages partent aussitôt sur
// l'ordinateur, dans « Adapter une fiche › Manuels », où elles attendent.

async function scannerPages() {
  if (scanEnCours) return;
  scanEnCours = true; scanInfo = ""; souci = ""; rendre();
  try {
    const r = await invoke("plugin:scanner|scanner");
    const fichiers = (r && r.fichiers) || [];
    if (!fichiers.length) { scanInfo = ""; return; }
    scanInfo = `Envoi de ${fichiers.length} page${fichiers.length > 1 ? "s" : ""}…`; rendre();
    // Par Nuage quand l'ordinateur n'est pas sur le WiFi : les pages l'y attendent.
    const parNuage = !joignable && relais.relie;
    const n = await invoke(parNuage ? "scan_deposer" : "scan_envoyer", { fichiers });
    scanInfo = parNuage
      ? `${n} page${n > 1 ? "s" : ""} partie${n > 1 ? "s" : ""} par Nuage.`
      : `${n} page${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} sur l'ordinateur.`;
  } catch (e) {
    scanInfo = "";
    souci = String(e);
  } finally {
    scanEnCours = false; rendre();
  }
}

// ── Appairer ──────────────────────────────────────────────────────────────

let adresse = "";
let appairage = false;
/** La caméra ouverte pour lire le QR code, et la boucle qui l'examine. */
let camera = null, lecture = null, scanSouci = "";

/**
 * Lit le QR code affiché par l'ordinateur.
 *
 * C'est le geste le plus court : on pointe, et c'est appairé. Rien n'est
 * photographié — chaque vue de la caméra est analysée puis jetée, et la
 * caméra se referme dès qu'un code est lu.
 *
 * Le décodage se fait ici, en JavaScript : ajouter le greffon natif de Tauri
 * demanderait de monter la version du cadriciel, et toute la chaîne de
 * compilation iOS avec elle. Si la caméra refuse, « 📋 Coller » reste là.
 */
async function scanner() {
  scanSouci = "";
  appairage = true;
  rendre();
  try {
    camera = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
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
      const lu = trouve.data;
      fermerCamera();
      void appairerAvec(lu);
    }
  }, 220);
}

function fermerCamera() {
  if (lecture) { clearInterval(lecture); lecture = null; }
  if (camera) { camera.getTracks().forEach((t) => t.stop()); camera = null; }
}

/** Ce que porte un code de Maitrize : l'adresse de l'ordinateur sur le WiFi, ou le relais de Nuage. */
const sansEspaces = (t) => String(t || "").replace(/\s+/g, "");
const estUnRelais = (t) => sansEspaces(t).startsWith("maitrize-relais:");

/**
 * Retient ce qu'on vient de lire : l'ordinateur, ou le relais.
 *
 * Les deux QR codes se scannent du même geste ; c'est ce qu'ils portent qui
 * dit lequel c'est. Le code que l'ordinateur donne à l'autre ordinateur, lui,
 * n'est pas pour le téléphone : on le dit, plutôt que de l'avaler de travers.
 */
async function retenir(lu) {
  if (sansEspaces(lu).startsWith("maitrize-relais-ordinateur:")) {
    throw "Ce code est celui de l'autre ordinateur, pas celui du téléphone.";
  }
  if (estUnRelais(lu)) {
    relais = await invoke("relais_ecrire", { code: lu });
    nuage = null;
    return;
  }
  await invoke("ordinateur_ecrire", { url: lu });
  adresse = await invoke("ordinateur_lire");
}

/** Retient le QR code lu, et dit tout de suite s'il ne convient pas. */
async function appairerAvec(lu) {
  let relie = false;
  try {
    await retenir(lu);
    relie = true;
    appairage = false;
    souci = "";
    scanSouci = "";
  } catch (e) {
    scanSouci = `Ce QR code ne convient pas (${String(e)}).`;
    appairage = true;
  }
  rendre();
  // Ce qui attendait part dès qu'on est relié — et seulement alors : un refus
  // doit rester à l'écran, pas se faire recouvrir par un envoi impossible.
  void tater().then(() => { if (relie && enAttente().length) void envoyerTout(); });
}

/** Oublie le relais de Nuage : ce qui attend ne partira plus que par le WiFi. */
async function oublierLeRelais() {
  try { await invoke("relais_oublier"); } catch (e) { /* déjà oublié */ }
  relais = { relie: false, serveur: "" };
  nuage = null;
  partiParNuage = "";
  rendre();
}

/** Colle l'adresse depuis le presse-papiers : quarante caractères à la main, non. */
async function coller() {
  let texte = "";
  try {
    texte = ((await navigator.clipboard.readText()) || "").trim();
  } catch (e) {
    souci = "Le presse-papiers n'est pas accessible.";
    rendre();
    return;
  }
  if (!texte) { souci = "Le presse-papiers est vide."; rendre(); return; }
  // Le champ d'abord : c'est lui qu'`appairer` relit, et c'est lui que l'on
  // voit si l'adresse est refusée.
  const champ = document.getElementById("adresse");
  if (champ) champ.value = texte;
  souci = "";
  await appairer();
}

async function appairer() {
  const champ = document.getElementById("adresse");
  let relie = false;
  try {
    await retenir(champ ? champ.value : "");
    relie = true;
    appairage = false;
    souci = "";
  } catch (e) {
    souci = String(e);
  }
  rendre();
  void tater().then(() => { if (relie && enAttente().length) void envoyerTout(); });
}

// ── Afficher ──────────────────────────────────────────────────────────────

const duree = (s) => `${Math.floor(s / 60)}:${p2(s % 60)}`;

function libelleDuree(s) {
  const n = Math.round(s);
  return n >= 60 ? `${Math.floor(n / 60)} min ${p2(n % 60)}` : `${n} s`;
}

const heureDe = (iso) => (iso.slice(11, 16) || "--:--").replace(":", "h");

/** L'ordinateur qu'on cherche, tel qu'on le montre : sans le jeton. */
function hoteDe(url) {
  const m = /^https?:\/\/([^/?#]+)/.exec(String(url || ""));
  return m ? m[1] : "aucun ordinateur";
}

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
  droite: '<path d="M9.5 6l6 6-6 6"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h2.5v2.5H14zM18 18h2.5v2.5H18zM14 19.5h1.5M19.5 14v1.5"/>',
  coller: '<rect x="8" y="3" width="8" height="4" rx="1.2"/><path d="M8 5H6.5A1.5 1.5 0 0 0 5 6.5v13A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-13A1.5 1.5 0 0 0 17.5 5H16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
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
  if (!creneaux.length) return `<p class="pastille muette">${icone("epingle")}<span>Pas de créneau aujourd'hui</span></p>`;
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
    <button class="jour-fleche" id="jour-apres" aria-label="Jour suivant" ${fige || !autre ? "disabled" : ""}>${icone("droite")}</button>
  </div>`;
}

/** Le grand bouton, et ce qu'on peut faire d'autre que dicter. */
const auRepos = () => `
  <button class="rond" id="go" aria-label="Dicter">${icone("micro")}</button>
  <p class="rond-legende">Dicter</p>
  <div class="tuiles">
    <button class="tuile" id="ecrire">${icone("crayon")}Écrire</button>
    <button class="tuile" id="scan-pages" ${scanEnCours ? "disabled" : ""}>${icone("page")}${scanEnCours ? "Scanner…" : "Scanner"}</button>
  </div>`;

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
    <textarea id="note" rows="5" placeholder="Votre note…">${echapper(brouillon)}</textarea>
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
  if (!ctx && scanInfo) b.push(`<p class="bulle">${icone("page")}<span>${echapper(scanInfo)}</span></p>`);
  return b.join("");
}

/** Par où partirait un envoi maintenant : le WiFi, Nuage, ou rien pour l'instant. */
function routeDEnvoi() {
  if (joignable) return { classe: "ok", texte: "WiFi" };
  if (nuage) return { classe: "ok", texte: "Nuage" };
  if (joignable === null || (relais.relie && nuage === null)) return { classe: "", texte: "…" };
  return { classe: "loin", texte: "Hors ligne" };
}

function rangDAttente(x) {
  const note = x.sorte === "note";
  const matiere = x.creneau ? matiereDuCreneau(x.creneau) : "";
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

/** Le QR code d'abord, un code collé sinon. `fermable` quand on est déjà relié par ailleurs. */
function carteAppairage(fermable) {
  const valeur = appairage && adresse && !relais.relie ? echapper(adresse) : "";
  return `<div class="carte">
    <div class="carte-tete"><span class="grand-ico">${icone("lien")}</span><h2>Relier à l'ordinateur</h2></div>
    ${camera
      ? `<video id="vue" class="vue" playsinline autoplay muted></video>
         <button class="btn-doux" id="stop-scan">Arrêter la caméra</button>`
      : `<button class="btn-plein" id="scanner">${icone("qr")}Scanner le QR code</button>`}
    ${scanSouci ? `<p class="erreur-ligne">${echapper(scanSouci)}</p>` : ""}
    <p class="ou">ou</p>
    <input id="adresse" placeholder="Code ou adresse" value="${valeur}"
      autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
    <div class="deux">
      <button class="btn-doux" id="colle">${icone("coller")}Coller</button>
      <button class="btn-plein" id="appairer">Relier</button>
    </div>
    ${fermable ? `<button class="lien-btn centre" id="fermer-appairage">Fermer</button>` : ""}
  </div>`;
}

/** Les deux chemins vers l'ordinateur, et leur état. */
function liaisons() {
  const wifi = joignable === null ? ["", "…"] : joignable ? ["ok", "joignable"] : ["loin", "injoignable"];
  // Nuage ne s'interroge que si l'ordinateur n'est pas là : à côté de lui, rien ne sort du WiFi.
  const parNuage = joignable ? ["", "en réserve"] : nuage === null ? ["", "…"] : nuage ? ["ok", "prêt"] : ["loin", "injoignable"];
  const autre = adresse && relais.relie ? "Relier autrement" : relais.relie ? "Relier aussi par le WiFi" : "Relier aussi par Nuage";
  const rang = (ico, titre, etat, detail, bouton) => `<div class="rang">
    <span class="ico">${icone(ico)}</span>
    <span class="rang-texte"><span class="rang-titre">${titre}</span>
      <span class="rang-sous"><span class="pt ${etat[0]}"></span><span class="coupe">${echapper(etat[1])} · ${echapper(detail)}</span></span></span>
    ${bouton}
  </div>`;
  return `<p class="titre">Liaisons</p>
    <div class="groupe">
      ${adresse ? rang("wifi", "Ordinateur", wifi, hoteDe(adresse), `<button class="lien-btn" id="changer">Changer</button>`) : ""}
      ${relais.relie ? rang("nuage", "Nuage", parNuage, relais.serveur, `<button class="lien-btn rouge" id="oublier-relais">Oublier</button>`) : ""}
      ${appairage ? "" : `<button class="rang" id="relier-encore"><span class="ico">${icone("plus")}</span><span class="rang-titre accent">${autre}</span></button>`}
    </div>
    ${appairage ? carteAppairage(true) : ""}`;
}

function rendre() {
  const el = document.getElementById("ecran");
  if (!el) return;
  const enCours = !!ctx;
  const relie = relieQuelquePart();

  // En tête, par où partirait une dictée maintenant.
  const tete = document.getElementById("liaison");
  if (tete) {
    const route = routeDEnvoi();
    tete.hidden = !relie;
    tete.className = `liaison ${route.classe}`;
    tete.innerHTML = `<span class="pt"></span>${route.texte === "…" ? "…" : route.texte === "WiFi" ? "Ordinateur" : route.texte}`;
  }

  // Pas encore relié : il n'y a qu'une chose à faire.
  el.innerHTML = !relie ? `${carteAppairage(false)}${bulles()}` : `
    <section class="heros">
      ${barreDuJour()}
      ${bandeauCreneau()}
      ${enCours ? enDictee() : ecrit ? editeurDeNote() : auRepos()}
    </section>
    ${bulles()}
    ${enCours || ecrit ? "" : listeDAttente(enAttente()) + liaisons()}
  `;

  const clic = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  clic("go", () => { void demarrer(); });
  clic("stop", () => { void arreter(); });
  clic("envoyer", () => { void envoyerTout(); });
  clic("appairer", () => { void appairer(); });
  clic("colle", () => { void coller(); });
  clic("scanner", () => { void scanner(); });
  clic("scan-pages", () => { void scannerPages(); });
  clic("stop-scan", () => { fermerCamera(); rendre(); });
  clic("changer-creneau", () => { choixOuvert = true; rendre(); });
  clic("jour-avant", () => { void allerAuJour(decaler(jourDeLaDictee(), -1)); });
  clic("jour-apres", () => { void allerAuJour(decaler(jourDeLaDictee(), 1)); });
  clic("jour-aujourdhui", () => { void allerAuJour(""); });
  el.querySelectorAll("[data-creneau]").forEach((b) => {
    b.onclick = () => { creneauChoisi = b.dataset.creneau; choixOuvert = false; rendre(); };
  });
  clic("ecrire", () => { ecrit = true; rendre(); document.getElementById("note")?.focus(); });
  clic("annuler-note", () => { ecrit = false; brouillon = ""; rendre(); });
  clic("garder-note", () => { void garderLaNote(); });
  const champNote = document.getElementById("note");
  if (champNote) champNote.oninput = () => { brouillon = champNote.value; };
  clic("changer", () => { appairage = true; scanSouci = ""; rendre(); });
  clic("relier-encore", () => { appairage = true; scanSouci = ""; rendre(); });
  clic("fermer-appairage", () => { fermerCamera(); appairage = false; scanSouci = ""; rendre(); });
  clic("oublier-relais", () => { void oublierLeRelais(); });
  el.querySelectorAll("[data-oublier]").forEach((b) => {
    b.onclick = () => { void oublier(b.dataset.oublier, b.dataset.sorte); };
  });
  el.querySelectorAll("[data-ecouter]").forEach((b) => {
    b.onclick = () => { void ecouter(b.dataset.ecouter); };
  });
}

// ── Au démarrage ──────────────────────────────────────────────────────────

(async () => {
  try { adresse = await invoke("ordinateur_lire"); } catch (e) { adresse = ""; }
  try { relais = await invoke("relais_lire"); } catch (e) { relais = { relie: false, serveur: "" }; }
  await relireCreneaux();
  await relire();
  // Ce qui attendait d'hier part dès l'ouverture, par l'ordinateur ou par Nuage.
  void tater().then(() => { if ((joignable || nuage) && enAttente().length) void envoyerTout(); });
  // L'ordinateur s'allume parfois après nous, le réseau revient en sortant du
  // métro : on retente de loin en loin, et l'on dépose ce qui attend dès que
  // l'un des deux chemins répond.
  setInterval(async () => {
    if (ctx || envoiEnCours) return;
    await tater();
    if ((joignable || nuage) && enAttente().length) void envoyerTout();
  }, 20000);
})();
