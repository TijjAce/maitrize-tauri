# Installe SimplySign Desktop, l'application officielle de Certum, sur la
# machine Windows de GitHub : depuis le site de Certum, et seulement si
# l'installeur porte bien la signature de son éditeur.
[CmdletBinding()]
param([string]$Version = '9.4.4.92')

$ErrorActionPreference = 'Stop'
# La barre de progression ralentit beaucoup le téléchargement.
$ProgressPreference = 'SilentlyContinue'

$app = 'C:\Program Files\Certum\SimplySign Desktop\SimplySignDesktop.exe'
if (Test-Path $app) {
    Write-Host 'SimplySign Desktop est déjà installé.'
    exit 0
}

$url = "https://files.certum.eu/software/SimplySignDesktop/Windows/$Version/SimplySignDesktop-$Version-64-bit-en.msi"
$dossier = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [IO.Path]::GetTempPath() }
$msi = Join-Path $dossier "SimplySignDesktop-$Version.msi"
$journal = Join-Path $dossier 'simplysign-installation.log'

for ($essai = 1; ; $essai++) {
    try {
        Invoke-WebRequest -Uri $url -OutFile $msi
        break
    } catch {
        if ($essai -ge 3) { throw }
        Start-Sleep -Seconds (5 * $essai)
    }
}

# Certum appartient à Asseco ; ses anciens installeurs portaient le nom d'Unizeto.
$signature = Get-AuthenticodeSignature -FilePath $msi
$editeur = $signature.SignerCertificate.Subject
if ($signature.Status -ne 'Valid' -or $editeur -notmatch 'Asseco|Certum|Unizeto') {
    throw "Installeur refusé : signature « $($signature.Status) », éditeur « $editeur »."
}
Write-Host "Installeur signé par : $editeur"

$p = Start-Process msiexec.exe -ArgumentList @('/i', "`"$msi`"", '/qn', '/norestart', '/l*v', "`"$journal`"") -Wait -PassThru
if ($p.ExitCode -notin 0, 3010) {
    Get-Content $journal -Tail 40 | Write-Host
    throw "L'installation a échoué (msiexec : $($p.ExitCode))."
}
if (-not (Test-Path $app)) { throw "SimplySign Desktop est introuvable après l'installation." }
Write-Host "SimplySign Desktop $Version installé (msiexec : $($p.ExitCode)$(if ($p.ExitCode -eq 3010) { ', redémarrage demandé' }))."
# Le lecteur de carte virtuel et les services qu'installe SimplySign : ce qu'il faut voir avant de se connecter.
Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.Class -eq 'SmartCardReader' -or $_.FriendlyName -like '*SimplySign*' -or $_.FriendlyName -like '*Certum*' } |
    ForEach-Object { Write-Host "Périphérique : $($_.FriendlyName) — $($_.Class) — $($_.Status)" }
Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like '*SimplySign*' -or $_.DisplayName -like '*Certum*' -or $_.Name -like '*SimplySign*' } |
    ForEach-Object { Write-Host "Service : $($_.DisplayName) — $($_.Status)" }
