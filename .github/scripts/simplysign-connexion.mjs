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
import { champDuLibelle, milieu } from "./fenetre.mjs";
import { code, diagnostic, lireSecret, secondesRestantes } from "./totp.mjs";

const APP = process.env.SIMPLYSIGN_APP || "C:\\Program Files\\Certum\\SimplySign Desktop\\SimplySignDesktop.exe";
const utilisateur = (process.env.CERTUM_UTILISATEUR ?? "").trim();
const brut = process.env.CERTUM_TOTP ?? "";

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** Du PowerShell ; le texte éventuel lui arrive par l'environnement. */
function powershell(script, saisie = "") {
  // La sortie en UTF-8 : les accents des certificats et des services passent tels quels.
  const avecUtf8 = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n${script}`;
  return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", avecUtf8], {
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

/**
 * Le certificat de signature de code de Certum, le plus lointain d'abord :
 * « empreinte|sujet|fin|clé ». Celui qu'annonce la carte virtuelle ne dit
 * pas toujours qu'il a sa clé — signtool la trouve quand même, par la
 * carte : on le préfère avec, on le prend sans.
 */
function certificat() {
  try {
    return powershell(`
      $c = Get-ChildItem Cert:\\CurrentUser\\My | Where-Object {
        $_.NotAfter -gt (Get-Date) -and $_.Issuer -like '*Certum*' -and
        ($_.EnhancedKeyUsageList | Where-Object { $_.ObjectId -eq '1.3.6.1.5.5.7.3.3' })
      } | Sort-Object @{ Expression = 'HasPrivateKey'; Descending = $true }, @{ Expression = 'NotAfter'; Descending = $true } | Select-Object -First 1
      if ($c) { "$($c.Thumbprint)|$($c.Subject)|$($c.NotAfter.ToString('yyyy-MM-dd'))|$($c.HasPrivateKey)" }
    `).trim();
  } catch {
    return "";
  }
}

/**
 * Les services qui portent une carte à puce dans le magasin de Windows : le
 * lecteur (SCardSvr) et la recopie des certificats (CertPropSvc). Sur une
 * machine de GitHub, ils peuvent être arrêtés.
 */
function demarrerLesServices() {
  try {
    console.log(powershell(`
      foreach ($nom in 'SCardSvr', 'CertPropSvc') {
        $s = Get-Service -Name $nom -ErrorAction SilentlyContinue
        if (-not $s) { "$nom : absent"; continue }
        if ($s.StartType -eq 'Disabled') { Set-Service -Name $nom -StartupType Manual }
        if ($s.Status -ne 'Running') { Start-Service -Name $nom -ErrorAction SilentlyContinue }
        "$nom : $((Get-Service -Name $nom).Status)"
      }
    `).trim());
  } catch (e) {
    console.log(`Services des cartes à puce : ${e.message}`);
  }
}

/**
 * Les fenêtres de SimplySign telles que les décrit Windows (UI Automation) :
 * leurs boutons, leurs libellés, le champ qui a la main. Le contenu des
 * champs n'est jamais lu.
 */
function fenetresDecrites(quand) {
  try {
    console.log(`— Fenêtres de SimplySign, ${quand}`);
    console.log(powershell(`
      Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
      $ids = @(Get-Process | Where-Object { $_.ProcessName -like '*SimplySign*' } | ForEach-Object { $_.Id })
      $racine = [System.Windows.Automation.AutomationElement]::RootElement
      $toutes = $racine.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
      $siennes = @($toutes | Where-Object { $ids -contains $_.Current.ProcessId })
      if (-not $siennes) { "  aucune fenêtre" }
      foreach ($f in $siennes) {
        "  Fenêtre « $($f.Current.Name) » ($($f.Current.ClassName))"
        $n = 0
        foreach ($e in $f.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
          if (++$n -gt 60) { "    …"; break }
          $c = $e.Current
          $type = $c.ControlType.ProgrammaticName -replace '^ControlType\.', ''
          $nom = if ($type -eq 'Edit') { if ($c.IsPassword) { '(champ masqué)' } else { '(champ)' } } else { "« $($c.Name) »" }
          $focus = if ($c.HasKeyboardFocus) { ' [a la main]' } else { '' }
          $r = $c.BoundingRectangle
          $place = if ($r.IsEmpty) { 'sans place' } else { "{0},{1} {2}x{3}" -f [int]$r.Left, [int]$r.Top, [int]$r.Width, [int]$r.Height }
          $prend = if ($c.IsKeyboardFocusable) { ' prend la main' } else { '' }
          $quoi = if ($c.ClassName) { " $($c.ClassName)" } else { '' }
          "    $type $nom$focus — $place$prend$quoi"
        }
      }
    `).trim());
  } catch (e) {
    console.log(`  relevé des fenêtres impossible : ${e.message}`);
  }
}

/**
 * Les éléments de la fenêtre de connexion et leur place à l'écran, lus
 * avant de taper : « nom|x|y|largeur|hauteur|peut prendre la main ».
 */
function disposition() {
  const sortie = powershell(`
    Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
    $ids = @(Get-Process | Where-Object { $_.ProcessName -like '*SimplySign*' } | ForEach-Object { $_.Id })
    $racine = [System.Windows.Automation.AutomationElement]::RootElement
    $f = @($racine.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition) |
      Where-Object { $ids -contains $_.Current.ProcessId -and $_.Current.Name -like '*SimplySign*' }) | Select-Object -First 1
    if ($f) {
      foreach ($e in $f.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)) {
        $c = $e.Current; $r = $c.BoundingRectangle
        if ($r.IsEmpty) { continue }
        "{0}|{1}|{2}|{3}|{4}|{5}" -f ($c.Name -replace '[|\\r\\n]', ''), [int]$r.Left, [int]$r.Top, [int]$r.Width, [int]$r.Height, $c.IsKeyboardFocusable
      }
    }
  `);
  return sortie.split(/\r?\n/).filter((l) => l.includes("|")).map((l) => {
    const [nom, x, y, largeur, hauteur, main] = l.split("|");
    return { nom: nom.trim(), x: Number(x), y: Number(y), largeur: Number(largeur), hauteur: Number(hauteur), main: main.trim() === "True" };
  });
}

/** Un clic gauche à cet endroit de l'écran : c'est ainsi que le champ prend la main, quel que soit l'ordre des tabulations. */
function cliquer({ x, y }) {
  powershell(`
    Add-Type -Namespace Maitrize -Name Souris -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y); [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, System.UIntPtr e);'
    [Maitrize.Souris]::SetCursorPos(${x}, ${y}) | Out-Null
    Start-Sleep -Milliseconds 150
    [Maitrize.Souris]::mouse_event(0x0002, 0, 0, 0, [System.UIntPtr]::Zero)
    Start-Sleep -Milliseconds 60
    [Maitrize.Souris]::mouse_event(0x0004, 0, 0, 0, [System.UIntPtr]::Zero)
  `);
}

/** Ce que voit Windows quand le certificat manque : rien de secret, l'adresse est masquée par GitHub. */
function releve() {
  try {
    console.log(powershell(`
      "— Services"
      Get-Service SCardSvr, CertPropSvc -ErrorAction SilentlyContinue | ForEach-Object { "  $($_.Name) : $($_.Status), $($_.StartType)" }
      "— SimplySign"
      Get-Process | Where-Object { $_.ProcessName -like '*SimplySign*' } | ForEach-Object { "  $($_.ProcessName) — fenêtre « $($_.MainWindowTitle) »" }
      foreach ($magasin in 'Cert:\\CurrentUser\\My', 'Cert:\\LocalMachine\\My') {
        "— $magasin"
        Get-ChildItem $magasin -ErrorAction SilentlyContinue | ForEach-Object { "  $($_.Subject) — émis par $($_.Issuer) — clé : $($_.HasPrivateKey)" }
      }
      "— Lecteurs de cartes"
      $p = Start-Process certutil.exe -ArgumentList '-scinfo', '-silent' -NoNewWindow -PassThru -RedirectStandardOutput "$env:RUNNER_TEMP\\scinfo.txt"
      if (-not $p.WaitForExit(30000)) { $p.Kill(); "  certutil ne répond pas" }
      Get-Content "$env:RUNNER_TEMP\\scinfo.txt" -ErrorAction SilentlyContinue | Where-Object { $_ -match 'Reader|Lecteur|Card|Carte|Subject|Sujet|Issuer|Émetteur|Provider|Fournisseur|Status|État' } | Select-Object -First 40 | ForEach-Object { "  $_" }
    `).trim());
  } catch (e) {
    console.log(`Relevé impossible : ${e.message}`);
  }
}

async function main() {
  if (!utilisateur || !brut.trim()) throw new Error("Il manque CERTUM_UTILISATEUR ou CERTUM_TOTP dans les secrets de GitHub.");
  const probleme = diagnostic(brut);
  if (probleme) throw new Error(probleme);
  if (!utilisateur.includes("@")) throw new Error("CERTUM_UTILISATEUR ne ressemble pas à une adresse e-mail.");
  const secret = lireSecret(brut);
  for (const masque of [utilisateur, brut.trim(), secret.secretBrut]) if (masque) console.log(`::add-mask::${masque}`);
  // Ce que dit le lien, hors secret : l'algorithme écrit (ou non), les chiffres, la période, l'émetteur.
  const lien = /^otpauth:\/\//i.test(brut.trim()) ? new URL(brut.trim()).searchParams : null;
  console.log(lien
    ? `Lien otpauth:// : algorithme ${lien.get("algorithm") ? `« ${lien.get("algorithm")} » écrit dans le lien` : "non écrit"}, ${secret.chiffres} chiffres, ${secret.periode} s, émetteur « ${lien.get("issuer") ?? "non écrit"} ».`
    : "Secret seul, sans lien otpauth://.");
  const sansConnexion = process.env.SIMPLYSIGN_SANS_CONNEXION === "1";

  // Un secret seul ne dit pas son algorithme : SHA-256, celui de Certum, puis SHA-1.
  const essais = secret.explicite
    ? [secret.algorithme, secret.algorithme]
    : [secret.algorithme, secret.algorithme === "sha256" ? "sha1" : "sha256"];

  demarrerLesServices();
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
  fenetresDecrites("avant de taper");
  if (sansConnexion) {
    releve();
    console.log("Essai sans connexion : on s'arrête là.");
    return;
  }

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
    // Les champs se trouvent par leurs libellés : au lancement, c'est celui du code qui a la main, et la
    // tabulation menait au bouton « Cancel » — la fenêtre se fermait sans que rien ne parte chez Certum.
    activer();
    await attendre(500);
    const elements = disposition();
    const champId = champDuLibelle(elements, "ID:");
    const champCode = champDuLibelle(elements, "Token:");
    const ok = elements.find((e) => e.nom === "Ok");
    if (!champId || !champCode || !ok || champId === champCode) {
      fenetresDecrites("champs introuvables");
      throw new Error("Je ne trouve pas les champs « ID » et « Token » ni le bouton « Ok » de la fenêtre de SimplySign.");
    }
    console.log(`Champ ID en ${milieu(champId).x},${milieu(champId).y} ; champ Token en ${milieu(champCode).x},${milieu(champCode).y} ; bouton Ok en ${milieu(ok).x},${milieu(ok).y}.`);
    cliquer(milieu(champId));
    await attendre(300);
    clavier("^a");
    taper(utilisateur);
    await attendre(300);
    // Le code se calcule au dernier moment, quinze secondes au moins devant lui.
    const reste = secondesRestantes(secret.periode);
    if (reste < 15) await attendre((reste + 1) * 1000);
    const leCode = code({ ...secret, algorithme: algo });
    console.log(`::add-mask::${leCode}`);
    cliquer(milieu(champCode));
    await attendre(300);
    clavier("^a");
    taper(leCode);
    await attendre(300);
    cliquer(milieu(ok));
    console.log(`Connexion envoyée (essai ${i + 1} sur ${essais.length}).`);
    await attendre(6000);
    fenetresDecrites("après la connexion");
    // Connecté, SimplySign Desktop ferme sa fenêtre et se range près de l'horloge.
    if (await attendreQue(() => fenetre() === "", 26000, 2000)) {
      connecte = true;
      break;
    }
  }
  if (!connecte) throw new Error("SimplySign Desktop n'a pas accepté la connexion : vérifiez CERTUM_UTILISATEUR et CERTUM_TOTP.");

  let trouve = "";
  await attendreQue(() => (trouve = certificat()) !== "", 120000, 3000);
  if (!trouve) {
    releve();
    throw new Error("Connecté, mais le certificat de Certum n'est pas apparu dans le magasin de Windows.");
  }
  const [empreinte, sujet, fin, cle] = trouve.split("|");
  console.log(`Certificat prêt : ${sujet}, jusqu'au ${fin} (empreinte ${empreinte}${cle === "True" ? "" : ", clé portée par la carte"}).`);
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV, `CERTUM_EMPREINTE=${empreinte}\n`);
}

main().catch((e) => {
  // Les messages d'erreur ne contiennent jamais le secret ni le code.
  console.error(`::error::${e.message}`);
  process.exit(1);
});
