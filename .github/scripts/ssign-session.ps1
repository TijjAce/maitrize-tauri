# Ouvre la session de signature avant l'assemblage de Maitrize.
#
# ssign (github.com/Le-Syl21/ssign, compilé depuis la révision relue, voir
# release.yml) parle directement au service de signature de Certum, sans
# SimplySign Desktop : celui-ci se connecte bien sur la machine Windows de
# GitHub, mais n'y monte pas sa carte virtuelle.
#
# On signe ici un petit programme d'essai avec l'adresse du compte et le
# secret du code QR (CERTUM_EMAIL, CERTUM_OTP) : ssign se connecte, signe, et
# range dans XDG_RUNTIME_DIR un jeton valable vingt minutes. Les signatures
# de Tauri (signer-windows.ps1) s'en servent ensuite, sans jamais voir le
# secret. Windows PowerShell 5.1 : Add-Type n'y compile un .exe qu'en 5.1.
$ErrorActionPreference = 'Stop'

if (-not $env:XDG_RUNTIME_DIR) { throw "XDG_RUNTIME_DIR manque : c'est là que se range la session." }
$exe = Join-Path $env:RUNNER_TEMP 'essai-signature.exe'
Add-Type -OutputType ConsoleApplication -OutputAssembly $exe -TypeDefinition 'public static class Essai { public static void Main() { System.Console.WriteLine("Maitrize"); } }'

& ssign -n 'Maitrize V2' $exe
if ($LASTEXITCODE -ne 0) { throw "ssign n'a pas pu se connecter à Certum ni signer : vérifiez CERTUM_UTILISATEUR et CERTUM_TOTP." }

$s = Get-AuthenticodeSignature -FilePath $exe
if ($s.Status -ne 'Valid' -or -not $s.TimeStamperCertificate) { throw "Signature d'essai refusée : $($s.Status) $($s.StatusMessage)" }
Write-Host "Session ouverte. Signé par : $($s.SignerCertificate.Subject)"
Write-Host "Horodaté par : $($s.TimeStamperCertificate.Subject)"
