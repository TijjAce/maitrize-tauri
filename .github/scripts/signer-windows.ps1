# Signe un fichier pour Tauri (bundle.windows.signCommand) — l'application,
# ses installeurs, le désinstalleur — avec le certificat Certum de la session
# SimplySign qu'a ouverte simplysign-connexion.mjs. L'horodatage de Certum
# garde la signature valable après l'expiration du certificat.
[CmdletBinding()]
param([Parameter(Mandatory)][string]$Fichier)

$ErrorActionPreference = 'Stop'

$empreinte = $env:CERTUM_EMPREINTE
if (-not $empreinte) { throw "Aucun certificat : la session SimplySign n'est pas ouverte (CERTUM_EMPREINTE manque)." }

# Le signtool 64 bits, du kit le plus récent : le pilote de la carte virtuelle de SimplySign est en 64 bits.
$signtool = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe' -ErrorAction SilentlyContinue |
    Sort-Object { try { [version]$_.Directory.Parent.Name } catch { [version]'0.0' } } -Descending |
    Select-Object -First 1
if (-not $signtool) { throw 'signtool.exe (x64) est introuvable.' }

for ($essai = 1; $essai -le 3; $essai++) {
    & $signtool.FullName sign /sha1 $empreinte /fd sha256 /tr 'http://time.certum.pl' /td sha256 /d 'Maitrize V2' $Fichier
    if ($LASTEXITCODE -eq 0) { exit 0 }
    # Le serveur d'horodatage refuse parfois une demande : on réessaie un peu plus tard.
    Start-Sleep -Seconds (10 * $essai)
}
throw "La signature de « $Fichier » a échoué trois fois."
