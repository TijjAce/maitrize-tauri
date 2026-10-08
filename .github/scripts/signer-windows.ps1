# Signe un fichier pour Tauri (bundle.windows.signCommand) — l'application,
# l'installeur, le désinstalleur — par ssign, avec la session qu'a ouverte
# ssign-session.ps1. Le secret du code QR n'est pas là : seul le jeton de
# vingt minutes l'est, rangé dans XDG_RUNTIME_DIR.
#
# Tauri garde pour lui ce qu'écrit la commande de signature : tout va aussi
# dans signature-windows.log, que la construction affiche quand elle échoue.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Fichier)

$ErrorActionPreference = 'Stop'
$journal = Join-Path $(if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }) 'signature-windows.log'
function Noter([string]$texte) { Write-Host $texte; Add-Content -Path $journal -Value $texte -Encoding utf8 }
function Echouer([string]$texte) { Noter "ÉCHEC : $texte"; throw $texte }

Noter "— $Fichier"
# ssign ne sait signer que les programmes (.exe, .dll) : l'installeur .msi reste sans signature.
if ([IO.Path]::GetExtension($Fichier) -ieq '.msi') {
    Noter 'Laissé sans signature : ssign ne signe pas les .msi.'
    exit 0
}
# Tauri peut présenter deux fois le même fichier ; ssign refuse un fichier déjà signé.
if ((Get-AuthenticodeSignature -FilePath $Fichier).Status -eq 'Valid') {
    Noter 'Déjà signé.'
    exit 0
}

$cache = Join-Path $env:XDG_RUNTIME_DIR 'ssign\session.json'
if (-not (Test-Path $cache)) { Echouer "Pas de session de signature : ssign-session.ps1 n'a pas tourné ($cache)." }
$session = Get-Content -Raw $cache | ConvertFrom-Json
# ssign tient une session pour finie deux minutes avant son terme ; on ne tente pas de connexion avec un faux code.
$reste = $session.expires_at - [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
if ($reste -le 120) { Echouer 'La session de signature a expiré : la compilation a duré plus de vingt minutes après son ouverture.' }
Noter "Session encore valable $([math]::Floor($reste / 60)) min."

$env:CERTUM_EMAIL = $session.email
Remove-Item Env:CERTUM_OTP -ErrorAction SilentlyContinue
# ssign veut un code ou le secret ; la session en cours lui suffit, ce code ne part jamais chez Certum.
$env:CERTUM_TOKEN = '000000'
for ($essai = 1; $essai -le 3; $essai++) {
    # Ce que ssign écrit sur sa sortie d'erreur ne doit pas arrêter le script avant qu'on l'ait noté.
    $ErrorActionPreference = 'Continue'
    $sortie = & ssign -v -n 'Maitrize V2' $Fichier 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $sortie | ForEach-Object { Noter "  ssign : $_" }
    if ($code -eq 0) { exit 0 }
    Noter "  essai $essai : ssign a rendu $code."
    # Le serveur d'horodatage refuse parfois une demande : on réessaie un peu plus tard.
    if ($essai -lt 3) { Start-Sleep -Seconds (10 * $essai) }
}
Echouer "La signature de « $Fichier » a échoué trois fois."
