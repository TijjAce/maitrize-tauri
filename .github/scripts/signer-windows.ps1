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
# Pendant l'assemblage, Tauri garde l'application ouverte : ssign, qui remplace le fichier
# par sa version signée, se voyait refuser l'accès. Il écrit donc la version signée à part,
# et l'on en recopie le contenu dans le fichier d'origine, comme le fait signtool.
$aPart = Join-Path ([IO.Path]::GetDirectoryName($journal)) ("signe-" + [guid]::NewGuid().ToString('N'))
$signe = Join-Path $aPart ([IO.Path]::GetFileName($Fichier))
for ($essai = 1; $essai -le 3; $essai++) {
    # Ce que ssign écrit sur sa sortie d'erreur ne doit pas arrêter le script avant qu'on l'ait noté.
    $ErrorActionPreference = 'Continue'
    $sortie = & ssign -v -n 'Maitrize V2' -o $aPart $Fichier 2>&1
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $sortie | ForEach-Object { Noter "  ssign : $_" }
    if ($code -eq 0) { break }
    Noter "  essai $essai : ssign a rendu $code."
    # Le serveur d'horodatage refuse parfois une demande : on réessaie un peu plus tard.
    if ($essai -lt 3) { Start-Sleep -Seconds (10 * $essai) }
}
if ($code -ne 0) { Echouer "La signature de « $Fichier » a échoué trois fois." }

$octets = [IO.File]::ReadAllBytes($signe)
for ($essai = 1; ; $essai++) {
    try {
        # Réécrire sur place : il suffit que le fichier soit ouvert en partage d'écriture, pas d'effacement.
        $flux = [IO.File]::Open($Fichier, [IO.FileMode]::Open, [IO.FileAccess]::Write, [IO.FileShare]::ReadWrite)
        try { $flux.SetLength(0); $flux.Write($octets, 0, $octets.Length) } finally { $flux.Close() }
        break
    } catch {
        Noter "  recopie, essai $essai : $($_.Exception.Message)"
        if ($essai -ge 5) { Echouer "La version signée de « $Fichier » n'a pas pu remplacer l'originale." }
        Start-Sleep -Seconds 3
    }
}
Remove-Item -Recurse -Force $aPart -ErrorAction SilentlyContinue
$s = Get-AuthenticodeSignature -FilePath $Fichier
if ($s.Status -ne 'Valid') { Echouer "Après recopie, la signature de « $Fichier » n'est pas valide : $($s.Status) $($s.StatusMessage)" }
Noter "Signé : $($s.SignerCertificate.Subject)"
exit 0
