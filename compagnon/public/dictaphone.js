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
  try {
    micro = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    souci = "Le micro n'est pas accessible. Autorisez-le pour cette application.";
    rendre();
    return;
  }
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createMediaStreamSource(micro);
  noeud = ctx.createScriptProcessor(4096, 1, 1);
  morceaux = [];
  debut = maintenantIso();
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
  // Chrono et jauge se posent à la main : refaire la page dix fois par
  // seconde couperait l'écoute en cours et ferait clignoter le bouton.
  await garderLEcranAllume();
  minuteur = setInterval(() => {
    const el = document.getElementById("chrono");
    if (el) el.textContent = duree(Math.round((Date.now() - depart) / 1000));
    const jauge = document.getElementById("jauge");
    // La racine étale le bas de l'échelle : une voix normale remplit la
    // moitié de la barre, un murmure la fait tout de même bouger.
    if (jauge) jauge.style.width = `${Math.min(100, Math.round(Math.sqrt(niveau) * 190))}%`;
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
  creneauChoisi = await creneauDeLHeure();
  if (capte < SEUIL_SILENCE) {
    avis = "Rien n'a été capté : vérifiez que le micro est autorisé pour cette "
      + "application, et qu'aucune autre ne s'en sert.";
  }
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
document.addEventListener("visibilitychange", () => {
  if (document.hidden) fermerCamera();
  if (document.hidden && ctx) {
    void arreter().then(() => {
      avis = "L'enregistrement s'est arrêté quand l'application est passée en "
        + "arrière-plan : gardez-la à l'écran pendant que vous dictez.";
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
    await invoke("note_garder", { debut: maintenantIso(), texte, creneau: creneauChoisi });
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

/** Redemande l'emploi du temps du jour, et retient celui de l'instant. */
async function rafraichirCreneaux() {
  try {
    // L'ordinateur les dit lui-même quand il est là ; sinon, il les a laissés sur Nuage.
    creneaux = await invoke(joignable ? "creneaux_rafraichir" : "creneaux_du_relais", { jour: jourDuJour() });
    creneauxConnus = true;
  } catch (e) { /* hors réseau : on garde ce qu'on avait */ }
  await relireCreneaux();
}

/** Relit ce qu'on a gardé, et pose le créneau de l'instant si on n'a rien choisi. */
async function relireCreneaux() {
  if (!creneauxConnus) {
    try {
      const lu = await invoke("creneaux_du_jour", { jour: jourDuJour() });
      creneauxConnus = !!lu.connus;
      creneaux = lu.creneaux ?? [];
    } catch (e) { creneauxConnus = false; creneaux = []; }
  }
  if (!creneauChoisi) creneauChoisi = await creneauDeLHeure();
}

/** Le créneau où l'on se trouve, d'après l'ordinateur autant que d'après l'heure. */
async function creneauDeLHeure() {
  try { return await invoke("creneau_maintenant", { heureIso: maintenantIso() }); }
  catch (e) { return ""; }
}

/** Ce qu'on affiche d'un créneau : l'heure et l'intitulé. */
function libelleCreneau(id) {
  const c = creneaux.find((x) => x.id === id);
  if (!c) return "";
  const h = (c.debut || "").slice(0, 5).replace(":", "h");
  return `${h} ${c.matiere || "créneau"}`;
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
      if (!par) { souci = "Reliez d'abord l'ordinateur, ci-dessous."; break; }
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
      partiParNuage = `${parNuage} envoi${parNuage > 1 ? "s" : ""} parti${parNuage > 1 ? "s" : ""} par Nuage à ${heureDe(maintenantIso())} : `
        + "l'ordinateur les relèvera en s'ouvrant.";
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
  scanEnCours = true; scanInfo = "Le scanner s'ouvre…"; rendre();
  try {
    const r = await invoke("plugin:scanner|scanner");
    const fichiers = (r && r.fichiers) || [];
    if (!fichiers.length) { scanInfo = ""; return; }
    scanInfo = `Envoi de ${fichiers.length} page${fichiers.length > 1 ? "s" : ""}…`; rendre();
    // Par Nuage quand l'ordinateur n'est pas sur le WiFi : les pages l'y attendent.
    const parNuage = !joignable && relais.relie;
    const n = await invoke(parNuage ? "scan_deposer" : "scan_envoyer", { fichiers });
    scanInfo = parNuage
      ? `✅ ${n} page${n > 1 ? "s" : ""} partie${n > 1 ? "s" : ""} par Nuage : elles arrivent sur l'ordinateur dès que « Scanner avec le compagnon » y est ouvert.`
      : `✅ ${n} page${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""} sur l'ordinateur. Vous pouvez en scanner d'autres.`;
  } catch (e) {
    scanInfo = "❌ " + String(e);
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
    scanSouci = "La caméra n'est pas accessible. Autorisez-la, ou collez l'adresse.";
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
    throw "Ce code est celui de l'autre ordinateur. Pour le téléphone : Réglages › Téléphone › « QR code du téléphone ».";
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
    souci = "Le presse-papiers n'est pas accessible : collez dans le champ à la main.";
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

/** Le début d'une note, pour la reconnaître dans la liste. */
const apercu = (t) => {
  const ligne = String(t ?? "").split("\n")[0].trim();
  return ligne.length > 34 ? `${ligne.slice(0, 33)}…` : ligne;
};

/** « 340 ko », « 2,1 Mo » : de quoi juger si le dépôt va être long. */
function poids(octets) {
  return octets >= 1e6
    ? `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`
    : `${Math.round(octets / 1000)} ko`;
}

/**
 * Sous quoi l'on enregistre, et comment en changer.
 *
 * On dicte parfois en sortant de la salle, ou une heure plus tard en
 * repensant à la séance : l'heure seule se trompe alors, et c'est le
 * téléphone qui était là.
 */
function bandeauCreneau() {
  if (!creneauxConnus) {
    return `<p class="creneau vide">Créneaux inconnus — l'ordinateur les donnera au prochain contact.</p>`;
  }
  // L'ordinateur a répondu, et il n'y a rien : un dimanche, des vacances. On
  // enregistre quand même, et c'est l'ordinateur qui rangera au retour.
  if (!creneaux.length) {
    return `<p class="creneau vide">Aucun créneau aujourd'hui — dictez tout de même, l'ordinateur rangera.</p>`;
  }
  if (choixOuvert) {
    return `<div class="choix">
      ${creneaux.map((c) => `
        <button class="choix-ligne${c.id === creneauChoisi ? " on" : ""}" data-creneau="${c.id}">
          <b>${echapper((c.debut || "").slice(0, 5).replace(":", "h"))}</b>
          <span>${echapper(c.matiere || "créneau")}</span>
        </button>`).join("")}
      <button class="choix-ligne${creneauChoisi ? "" : " on"}" data-creneau="">
        <b>—</b><span>Laisser l'ordinateur décider</span>
      </button>
    </div>`;
  }
  const libelle = libelleCreneau(creneauChoisi);
  return `<button class="creneau" id="changer-creneau">
    <span>${libelle ? `📍 ${echapper(libelle)}` : "📍 Hors créneau"}</span>
    <span class="creneau-action">Changer</span>
  </button>`;
}

function rendre() {
  const enCours = !!ctx;
  const attente = enAttente();
  const el = document.getElementById("ecran");
  if (!el) return;

  // Injoignable : on dit lequel on cherche. Une adresse retenue hier, quand
  // la box donnait une autre IP, se reconnaît alors d'un coup d'œil.
  const etat = joignable === null ? ["var(--txt2)", "on regarde…"]
    : joignable ? ["#16a34a", `joignable — ${hoteDe(adresse)}`]
    : ["#d97706", `injoignable — ${hoteDe(adresse)}`];
  // Le relais : on ne l'interroge que si l'ordinateur n'est pas là.
  const etatNuage = joignable ? ["var(--txt2)", `en réserve — ${relais.serveur}`]
    : nuage === null ? ["var(--txt2)", "on regarde…"]
    : nuage ? ["#16a34a", `prêt — ${relais.serveur}`]
    : ["#d97706", `injoignable — ${relais.serveur}`];
  // Ce qui attend partira-t-il maintenant ? Par l'un ou par l'autre.
  const pointAttente = joignable || nuage ? "#16a34a" : joignable === null && nuage === null ? "var(--txt2)" : "#d97706";
  const relie = relieQuelquePart();

  el.innerHTML = `
    <div class="card" style="text-align:center">
      ${relie ? bandeauCreneau() : ""}
      ${enCours
        ? `<p class="chrono" id="chrono">0:00</p>
           <div class="jauge-fond"><div class="jauge" id="jauge"></div></div>
           <p class="meta" id="muet" hidden style="margin:8px 0 0;color:var(--rouge)">
             Le micro ne capte rien pour l'instant.
           </p>
           <p class="meta" style="margin:8px 0 14px">${veille
             ? "L'écran reste allumé. Ne quittez pas l'application."
             : "Gardez l'écran allumé et l'application devant, sans quoi iOS met la dictée en pause."}</p>
           <button class="gros rouge" id="stop">⏹ Terminer</button>`
        : `<button class="gros" id="go" ${relie ? "" : "disabled"}>🎙 Dicter</button>
           ${ecrit
             ? `<textarea id="note" rows="4" placeholder="Deux lignes, au lieu de parler…">${echapper(brouillon)}</textarea>
                <div style="display:flex;gap:8px;margin-top:8px">
                  <button class="btn" id="annuler-note" style="flex:1">Annuler</button>
                  <button class="btn plein" id="garder-note" style="flex:1">Garder</button>
                </div>`
             : `<button class="btn" id="ecrire" ${relie ? "" : "disabled"}
                  style="width:100%;margin-top:10px">✍️ Écrire plutôt</button>`}
           <p class="meta" style="margin:14px 0 0">${relie
             ? "L'heure suffit : l'ordinateur saura de quel créneau il s'agit."
             : "Reliez d'abord l'ordinateur, ci-dessous."}</p>`}
    </div>

    ${avis ? `<p class="avis">${avis}</p>` : ""}
    ${souci ? `<p class="err">${souci}</p>` : ""}

    ${relie && !enCours ? `
      <p class="titre">Manuels</p>
      <div class="card">
        <button class="gros" id="scan-pages" ${scanEnCours ? "disabled" : ""}>📄 Scanner des pages</button>
        <p class="meta" style="margin:12px 0 0">Comme dans Notes : cadrez la page, elle se redresse ; enchaînez les pages, puis
          « Enregistrer ». Elles arrivent sur l'ordinateur, dans Adapter une fiche › Manuels — ouvrez-y « Scanner avec le compagnon ».</p>
        ${scanInfo ? `<p class="avis" style="margin:10px 0 0">${echapper(scanInfo)}</p>` : ""}
      </div>` : ""}

    ${partiParNuage ? `<p class="avis">☁️ ${echapper(partiParNuage)}</p>` : ""}

    ${attente.length ? `
      <p class="titre">En attente d'envoi (${attente.length})</p>
      ${attente.map((x) => `
        <div class="ligne">
          <span class="pt" style="background:${pointAttente}"></span>
          <b>${heureDe(x.debut)}</b>
          ${x.sorte === "note"
            ? `<span class="note-apercu">✍️ ${echapper(apercu(x.texte))}</span>`
            : `<span class="meta">${libelleDuree(x.dureeS)}${x.octets ? ` · ${poids(x.octets)}` : ""}</span>`}
          ${x.creneau && libelleCreneau(x.creneau)
            ? `<span class="meta creneau-puce">${echapper(libelleCreneau(x.creneau))}</span>` : ""}
          <span style="flex:1"></span>
          ${x.sorte === "note" ? "" : `<button class="btn" data-ecouter="${x.id}">${ecoute === x.id ? "⏸" : "▶︎"}</button>`}
          <button class="btn" data-oublier="${x.id}" data-sorte="${x.sorte}">🗑</button>
        </div>`).join("")}
      <button class="btn plein" id="envoyer" ${envoiEnCours ? "disabled" : ""}
        style="width:100%;margin-top:6px">${envoiEnCours ? "Envoi…" : "↑ Envoyer maintenant"}</button>
    ` : `<p class="titre">En attente</p><p class="meta">Rien : tout est parti.</p>`}

    <p class="titre">Ordinateur</p>
    ${adresse ? `
      <div class="ligne">
        <span class="pt" style="background:${etat[0]}"></span>
        <span class="meta" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📡 WiFi : ${echapper(etat[1])}</span>
        <button class="btn" id="changer">Changer</button>
      </div>` : ""}
    ${relais.relie ? `
      <div class="ligne">
        <span class="pt" style="background:${etatNuage[0]}"></span>
        <span class="meta" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">☁️ Nuage : ${echapper(etatNuage[1])}</span>
        <button class="btn" id="oublier-relais">Oublier</button>
      </div>` : ""}
    ${appairage || !relie ? `
      <div class="card">
        <p class="meta" style="margin:0 0 10px">Sur l'ordinateur : <b>Réglages → Téléphone</b>. Pour déposer de partout,
        « Le téléphone par Nuage » → <b>QR code du téléphone</b> ; pour le même WiFi, « Ouvrir le partage ».
        Pointez la caméra sur le QR code affiché : l'application reconnaît lequel c'est.</p>
        ${camera
          ? `<video id="vue" class="vue" playsinline autoplay muted></video>
             <button class="btn plein" id="stop-scan" style="width:100%;margin-top:8px">Arrêter la caméra</button>`
          : `<button class="gros" id="scanner">📷 Scanner le QR code</button>`}
        ${scanSouci ? `<p class="err" style="margin:10px 0 0">${echapper(scanSouci)}</p>` : ""}
        <p class="titre" style="margin:16px 0 8px">Ou, à la main</p>
        <input id="adresse" placeholder="L'adresse du partage, ou le code du relais" value="${appairage && adresse && !relais.relie ? echapper(adresse) : ""}"
          autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn" id="colle" style="flex:1">📋 Coller</button>
          <button class="btn plein" id="appairer" style="flex:1">Relier</button>
        </div>
        ${relie ? `<button class="btn" id="fermer-appairage" style="width:100%;margin-top:8px">Fermer</button>` : ""}
      </div>`
      : `<button class="btn" id="relier-encore" style="width:100%;margin-top:6px">${adresse && relais.relie ? "Relier autrement…"
          : relais.relie ? "＋ Relier aussi par le WiFi…" : "＋ Relier aussi par Nuage : déposer sans WiFi commun…"}</button>`}
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
