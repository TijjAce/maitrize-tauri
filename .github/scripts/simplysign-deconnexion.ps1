# Ferme la session SimplySign à la fin de la construction, qu'elle ait
# réussi ou non : la carte virtuelle se démonte, le certificat quitte le
# magasin de Windows. La machine de GitHub est jetée ensuite ; on ne laisse
# rien ouvert pour autant.
$ErrorActionPreference = 'SilentlyContinue'

Get-Process | Where-Object { $_.ProcessName -like '*SimplySign*' } | ForEach-Object { $_.CloseMainWindow() | Out-Null }
Start-Sleep -Seconds 2
Get-Process | Where-Object { $_.ProcessName -like '*SimplySign*' } | Stop-Process -Force
Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Issuer -like '*Certum*' } | Remove-Item -Force
Write-Host 'Session SimplySign fermée.'
exit 0
