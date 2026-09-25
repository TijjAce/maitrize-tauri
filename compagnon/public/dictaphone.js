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
    await invoke("vocal_garder", { debut, dureeS: secondes, wavB64: base64(octets) });
  } catch (e) {
    souci = String(e);
  }
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
  rendre();
}

async function tater() {
  try { joignable = await invoke("ordinateur_joignable"); } catch (e) { joignable = false; }
  rendre();
}

/** Dépose ce qui attend, et s'arrête au premier refus : le reste est gardé. */
async function envoyerTout() {
  if (envoiEnCours) return;
  envoiEnCours = true;
  souci = "";
  rendre();
  try {
    for (const v of vocaux.slice()) {
      try {
        await invoke("vocal_envoyer", { id: v.id });
      } catch (e) {
        souci = String(e);
        break;
      }
      await relire();
    }
  } finally {
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

async function oublier(id) {
  if (ecoute === id) arreterEcoute();
  try { await invoke("vocal_oublier", { id }); } catch (e) { /* déjà parti */ }
  await relire();
}

// ── Appairer ──────────────────────────────────────────────────────────────

let adresse = "";
let appairage = false;

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
  try {
    await invoke("ordinateur_ecrire", { url: champ ? champ.value : "" });
    adresse = await invoke("ordinateur_lire");
    appairage = false;
    souci = "";
  } catch (e) {
    souci = String(e);
  }
  rendre();
  void tater();
}

// ── Afficher ──────────────────────────────────────────────────────────────

const duree = (s) => `${Math.floor(s / 60)}:${p2(s % 60)}`;

function libelleDuree(s) {
  const n = Math.round(s);
  return n >= 60 ? `${Math.floor(n / 60)} min ${p2(n % 60)}` : `${n} s`;
}

const heureDe = (iso) => (iso.slice(11, 16) || "--:--").replace(":", "h");

/** « 340 ko », « 2,1 Mo » : de quoi juger si le dépôt va être long. */
function poids(octets) {
  return octets >= 1e6
    ? `${(octets / 1e6).toFixed(1).replace(".", ",")} Mo`
    : `${Math.round(octets / 1000)} ko`;
}

function rendre() {
  const enCours = !!ctx;
  const el = document.getElementById("ecran");
  if (!el) return;

  const etat = joignable === null ? ["var(--txt2)", "on regarde…"]
    : joignable ? ["#16a34a", "ordinateur joignable"]
    : ["#d97706", "ordinateur injoignable"];

  el.innerHTML = `
    <div class="card" style="text-align:center">
      ${enCours
        ? `<p class="chrono" id="chrono">0:00</p>
           <div class="jauge-fond"><div class="jauge" id="jauge"></div></div>
           <p class="meta" id="muet" hidden style="margin:8px 0 0;color:var(--rouge)">
             Le micro ne capte rien pour l'instant.
           </p>
           <p class="meta" style="margin:8px 0 14px">Gardez l'écran allumé pendant que vous dictez.</p>
           <button class="gros rouge" id="stop">⏹ Terminer</button>`
        : `<button class="gros" id="go" ${adresse ? "" : "disabled"}>🎙 Dicter</button>
           <p class="meta" style="margin:14px 0 0">${adresse
             ? "L'heure suffit : l'ordinateur saura de quel créneau il s'agit."
             : "Appairez d'abord l'ordinateur, ci-dessous."}</p>`}
    </div>

    ${avis ? `<p class="avis">${avis}</p>` : ""}
    ${souci ? `<p class="err">${souci}</p>` : ""}

    ${vocaux.length ? `
      <p class="titre">En attente de l'ordinateur (${vocaux.length})</p>
      ${vocaux.map((v) => `
        <div class="ligne">
          <span class="pt" style="background:${etat[0]}"></span>
          <b>${heureDe(v.debut)}</b>
          <span class="meta">${libelleDuree(v.dureeS)}${v.octets ? ` · ${poids(v.octets)}` : ""}</span>
          <span style="flex:1"></span>
          <button class="btn" data-ecouter="${v.id}">${ecoute === v.id ? "⏸" : "▶︎"}</button>
          <button class="btn" data-oublier="${v.id}">🗑</button>
        </div>`).join("")}
      <button class="btn plein" id="envoyer" ${envoiEnCours ? "disabled" : ""}
        style="width:100%;margin-top:6px">${envoiEnCours ? "Envoi…" : "↑ Envoyer maintenant"}</button>
    ` : `<p class="titre">En attente</p><p class="meta">Rien : tout est parti sur l'ordinateur.</p>`}

    <p class="titre">Ordinateur</p>
    ${appairage || !adresse ? `
      <div class="card">
        <p class="meta" style="margin:0 0 10px">Sur l'ordinateur : Réglages → Partage WiFi →
        « Ouvrir le partage ». Copiez l'adresse affichée sous le QR code, puis « Coller » ici.</p>
        <input id="adresse" placeholder="http://192.168.1.20:8787/?t=…" value="${adresse}"
          autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn" id="colle" style="flex:1">📋 Coller</button>
          <button class="btn plein" id="appairer" style="flex:1">Appairer</button>
        </div>
      </div>`
      : `<div class="ligne">
           <span class="pt" style="background:${etat[0]}"></span>
           <span class="meta" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${etat[1]}</span>
           <button class="btn" id="changer">Changer</button>
         </div>`}
  `;

  const clic = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  clic("go", () => { void demarrer(); });
  clic("stop", () => { void arreter(); });
  clic("envoyer", () => { void envoyerTout(); });
  clic("appairer", () => { void appairer(); });
  clic("colle", () => { void coller(); });
  clic("changer", () => { appairage = true; rendre(); });
  el.querySelectorAll("[data-oublier]").forEach((b) => {
    b.onclick = () => { void oublier(b.dataset.oublier); };
  });
  el.querySelectorAll("[data-ecouter]").forEach((b) => {
    b.onclick = () => { void ecouter(b.dataset.ecouter); };
  });
}

// ── Au démarrage ──────────────────────────────────────────────────────────

(async () => {
  try { adresse = await invoke("ordinateur_lire"); } catch (e) { adresse = ""; }
  await relire();
  void tater();
  // L'ordinateur s'allume parfois après nous : on retente de loin en loin, et
  // l'on dépose ce qui attend dès qu'il répond.
  setInterval(async () => {
    if (ctx || envoiEnCours) return;
    await tater();
    if (joignable && vocaux.length) void envoyerTout();
  }, 20000);
})();
