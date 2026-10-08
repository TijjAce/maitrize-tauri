# Signe un fichier pour Tauri (bundle.windows.signCommand) — l'application,
# l'installeur, le désinstalleur — par ssign, avec la session qu'a ouverte
# ssign-session.ps1. Le secret du code QR n'est pas là : seul le jeton de
# vingt minutes l'est, rangé dans XDG_RUNTIME_DIR.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Fichier)

$ErrorActionPreference = 'Stop'

# ssign ne sait signer que les programmes (.exe, .dll) : l'installeur .msi reste sans signature.
if ([IO.Path]::GetExtension($Fichier) -ieq '.msi') {
    Write-Host "Laissé sans signature (ssign ne signe pas les .msi) : $Fichier"
    exit 0
}
# Tauri peut présenter deux fois le même fichier ; ssign refuse un fichier déjà signé.
if ((Get-AuthenticodeSignature -FilePath $Fichier).Status -eq 'Valid') {
    Write-Host "Déjà signé : $Fichier"
    exit 0
}

$cache = Join-Path $env:XDG_RUNTIME_DIR 'ssign\session.json'
if (-not (Test-Path $cache)) { throw "Pas de session de signature : ssign-session.ps1 n'a pas tourné ($cache)." }
$session = Get-Content -Raw $cache | ConvertFrom-Json
# ssign tient une session pour finie deux minutes avant son terme ; on ne tente pas de connexion avec un faux code.
if ($session.expires_at - [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() -le 120) {
    throw 'La session de signature a expiré : la compilation a duré plus de vingt minutes après son ouverture.'
}

$env:CERTUM_EMAIL = $session.email
Remove-Item Env:CERTUM_OTP -ErrorAction SilentlyContinue
# ssign veut un code ou le secret ; la session en cours lui suffit, ce code ne part jamais chez Certum.
$env:CERTUM_TOKEN = '000000'
for ($essai = 1; $essai -le 3; $essai++) {
    & ssign -n 'Maitrize V2' $Fichier
    if ($LASTEXITCODE -eq 0) { exit 0 }
    # Le serveur d'horodatage refuse parfois une demande : on réessaie un peu plus tard.
    Start-Sleep -Seconds (10 * $essai)
}
throw "La signature de « $Fichier » a échoué trois fois."
