// Ouvre la session SimplySign Desktop sur la machine Windows de GitHub.
//
// SimplySign Desktop, l'application officielle de Certum, présente le
// certificat rangé dans le nuage comme une carte à puce : tant qu'on n'y est
// pas connecté, signtool ne trouve aucune clé. On s'y connecte dans sa
// fenêtre, avec l'adresse du compte et le code à six chiffres de
// l'application du téléphone. Ici, personne n'est là pour le taper : on
// calcule le code comme le téléphone (voir `totp.mjs`), à partir du code QR
// que l'enseignant a rangé dans les secrets de GitHub, et on le tape au
// clavier dans la fenêtre. Ni l'adresse, ni le secret, ni le code ne
// s'écrivent dans le journal ; le texte tapé passe par une variable
// d'environnement, jamais par une ligne de commande.
//
// La démarche — lancer deux fois, taper, attendre que la fenêtre se ferme,
// puis que le certificat paraisse — suit jay0lee/certum-cloud-code-sign
// (Apache-2.0), réécrite ici : le secret ne passe que par du code qu'on relit.
//
// Entrées : CERTUM_UTILISATEUR (l'adresse du compte SimplySign) et
// CERTUM_TOTP (l'adresse otpauth:// du code QR, ou le secret seul).
// Sortie : CERTUM_EMPREINTE, l'empreinte du certificat, pour signer-windows.ps1.

import { execFileSync, spawn } from "node:child_process";
import { appendFileSync } from "node:fs";
import { code, diagnostic, lireSecret, secondesRestantes } from "./totp.mjs";

const APP = process.env.SIMPLYSIGN_APP || "C:\\Program Files\\Certum\\SimplySign Desktop\\SimplySignDesktop.exe";
const utilisateur = (process.env.CERTUM_UTILISATEUR ?? "").trim();
const brut = process.env.CERTUM_TOTP ?? "";

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Du PowerShell ; le texte éventuel lui arrive par l'environnement. */
function powershell(script, saisie = "") {
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
    env: { ...process.env, SAISIE: saisie },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Les touches spéciales de SendKeys, entre accolades pour qu'elles soient tapées telles quelles. */
const echapper = (texte) => texte.replace(/[+^%~(){}[\]]/g, (c) => `{${c}}`);

/** Des touches (« {TAB} », « ^a ») envoyées à la fenêtre active. */
const clavier = (touches) => powershell("(New-Object -ComObject WScript.Shell).SendKeys($env:SAISIE)", touches);
const taper = (texte) => clavier(echapper(texte));

const FENETRE = "Get-Process | Where-Object { $_.MainWindowTitle -and ($_.MainWindowTitle -like '*SimplySign*' -or $_.ProcessName -like '*SimplySign*') } | Select-Object -First 1";

/** Le titre de la fenêtre de SimplySign, s'il y en a une d'ouverte. */
function fenetre() {
  try {
    return powershell(`${FENETRE} -ExpandProperty MainWindowTitle`).trim();
  } catch {
    return "";
  }
}

/** La fenêtre de SimplySign au premier plan, pour que les touches y aillent. */
function activer() {
  try {
    powershell(`
      Add-Type -Namespace Maitrize -Name Fenetres -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetForegroundWindow(System.IntPtr h); [DllImport("user32.dll")] public static extern bool ShowWindow(System.IntPtr h, int n);'
      $p = ${FENETRE}
      if ($p) {
        [Maitrize.Fenetres]::ShowWindow($p.MainWindowHandle, 9) | Out-Null
        [Maitrize.Fenetres]::SetForegroundWindow($p.MainWindowHandle) | Out-Null
        (New-Object -ComObject WScript.Shell).AppActivate($p.Id) | Out-Null
      }
    `);
  } catch { /* la fenêtre a pu se fermer entre-temps */ }
}

function lancer() {
  const p = spawn(APP, [], { detached: true, stdio: "ignore" });
  p.on("error", (e) => console.error(`SimplySign Desktop ne se lance pas : ${e.message}`));
  p.unref();
}

async function attendreQue(condition, ms, pas = 1000) {
  for (let t = 0; t < ms; t += pas) {
    if (condition()) return true;
    await attendre(pas);
  }
  return condition();
}

/** Le certificat de signature de code de Certum, avec sa clé — le plus lointain d'abord : « empreinte|sujet|fin ». */
function certificat() {
  try {
    return powershell(`
      $c = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object {
        $_.HasPrivateKey -and $_.NotAfter -gt (Get-Date) -and $_.Issuer -like '*Certum*' -and
        ($_.EnhancedKeyUsageList | Where-Object { $_.ObjectId -eq '1.3.6.1.5.5.7.3.3' })
      } | Sort-Object NotAfter -Descending | Select-Object -First 1
      if ($c) { "$($c.Thumbprint)|$($c.Subject)|$($c.NotAfter.ToString('yyyy-MM-dd'))" }
    `).trim();
  } catch {
    return "";
  }
}

async function main() {
  if (!utilisateur || !brut.trim()) throw new Error("Il manque CERTUM_UTILISATEUR ou CERTUM_TOTP dans les secrets de GitHub.");
  const probleme = diagnostic(brut);
  if (probleme) throw new Error(probleme);
  if (!utilisateur.includes("@")) throw new Error("CERTUM_UTILISATEUR ne ressemble pas à une adresse e-mail.");
  const secret = lireSecret(brut);
  for (const masque of [utilisateur, brut.trim(), secret.secretBrut]) if (masque) console.log(`::add-mask::${masque}`);

  // Un secret seul ne dit pas son algorithme : SHA-256, celui de Certum, puis SHA-1.
  const essais = secret.explicite
    ? [secret.algorithme, secret.algorithme]
    : [secret.algorithme, secret.algorithme === "sha256" ? "sha1" : "sha256"];

  try { powershell("(New-Object -ComObject Shell.Application).MinimizeAll()"); } catch { /* rien à réduire */ }
  // Le premier lancement démarre le service, le second ouvre la fenêtre de connexion.
  lancer();
  await attendre(4000);
  lancer();
  if (!(await attendreQue(() => fenetre() !== "", 30000))) {
    lancer();
    if (!(await attendreQue(() => fenetre() !== "", 20000))) throw new Error("La fenêtre de connexion de SimplySign Desktop n'est pas apparue.");
  }
  console.log(`Fenêtre de connexion ouverte : « ${fenetre()} ».`);

  let connecte = false;
  for (const [i, algo] of essais.entries()) {
    if (i > 0) {
      // Le message d'erreur de l'essai précédent se ferme ; la fenêtre de connexion revient au besoin.
      activer();
      await attendre(300);
      clavier("{ENTER}");
      await attendre(800);
      if (!fenetre()) {
        lancer();
        await attendreQue(() => fenetre() !== "", 15000);
      }
    }
    // Quinze secondes au moins devant le code : il ne doit pas expirer en route.
    const reste = secondesRestantes(secret.periode);
    if (reste < 15) await attendre((reste + 1) * 1000);
    const leCode = code({ ...secret, algorithme: algo });
    console.log(`::add-mask::${leCode}`);
    activer();
    await attendre(500);
    clavier("^a");
    taper(utilisateur);
    await attendre(200);
    clavier("{TAB}");
    clavier("^a");
    taper(leCode);
    await attendre(200);
    activer();
    clavier("{ENTER}");
    console.log(`Connexion envoyée (essai ${i + 1} sur ${essais.length}).`);
    // Connecté, SimplySign Desktop ferme sa fenêtre et se range près de l'horloge.
    if (await attendreQue(() => fenetre() === "", 26000, 2000)) {
      connecte = true;
      break;
    }
  }
  if (!connecte) throw new Error("SimplySign Desktop n'a pas accepté la connexion : vérifiez CERTUM_UTILISATEUR et CERTUM_TOTP.");

  let trouve = "";
  await attendreQue(() => (trouve = certificat()) !== "", 90000, 3000);
  if (!trouve) throw new Error("Connecté, mais le certificat de Certum n'est pas apparu dans le magasin de Windows.");
  const [empreinte, sujet, fin] = trouve.split("|");
  console.log(`Certificat prêt : ${sujet}, jusqu'au ${fin} (empreinte ${empreinte}).`);
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `CERTUM_EMPREINTE=${empreinte}\n`);
}

main().catch((e) => {
  // Les messages d'erreur ne contiennent jamais le secret ni le code.
  console.error(`::error::${e.message}`);
  process.exit(1);
});
