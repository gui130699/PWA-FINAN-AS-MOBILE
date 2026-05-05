param(
  [string]$root = (Split-Path $PSScriptRoot -Parent),
  [string]$out  = (Join-Path (Split-Path $root -Parent) "CODIGO_FONTE_COMPLETO.txt")
)

$files = @(
  "index.html",
  "vite.config.ts",
  "package.json",
  "src\index.css",
  "src\main.tsx",
  "src\App.tsx",
  "src\App.css",
  "src\lib\firebase.ts",
  "src\lib\version.ts",
  "src\types\index.ts",
  "src\types\offline.ts",
  "src\contexts\AuthContext.tsx",
  "src\contexts\ThemeContext.tsx",
  "src\contexts\InstallPWAContext.tsx",
  "src\hooks\useTransactions.ts",
  "src\hooks\useCategories.ts",
  "src\hooks\useFixedAccounts.ts",
  "src\hooks\useInstallments.ts",
  "src\hooks\useInstallPWA.ts",
  "src\hooks\usePWAUpdate.ts",
  "src\hooks\useOnlineStatus.ts",
  "src\hooks\useAutoSync.ts",
  "src\offline\offlineDb.ts",
  "src\offline\syncService.ts",
  "src\services\firestore.ts",
  "src\services\financeRepository.ts",
  "src\utils\dateUtils.ts",
  "src\utils\errorUtils.ts",
  "src\utils\formatters.ts",
  "src\components\layout\AppLayout.tsx",
  "src\components\layout\TopBar.tsx",
  "src\components\layout\BottomNav.tsx",
  "src\components\layout\Sidebar.tsx",
  "src\components\layout\InstallPWABanner.tsx",
  "src\components\ui\Button.tsx",
  "src\components\ui\Card.tsx",
  "src\components\ui\Input.tsx",
  "src\components\ui\Loading.tsx",
  "src\components\ui\Modal.tsx",
  "src\components\ui\MonthSelector.tsx",
  "src\components\ui\PWAUpdateBanner.tsx",
  "src\components\ui\SplashScreen.tsx",
  "src\components\ui\SyncStatusBanner.tsx",
  "src\components\ui\Toast.tsx",
  "src\pages\LoginPage.tsx",
  "src\pages\DashboardPage.tsx",
  "src\pages\TransactionsPage.tsx",
  "src\pages\CategoriesPage.tsx",
  "src\pages\FixedAccountsPage.tsx",
  "src\pages\InstallmentsPage.tsx",
  "src\pages\ReportsPage.tsx",
  "public\favicon.svg",
  "scripts\generate-icons.mjs"
)

$count = $files.Count
$now   = Get-Date -Format "dd/MM/yyyy HH:mm"
$sb    = [System.Text.StringBuilder]::new()

$null = $sb.AppendLine("================ CODIGO FONTE COMPLETO - PWA FINANCAS MOBILE ================")
$null = $sb.AppendLine("Gerado: $now | $count arquivos | React19+Vite+TS+TailwindCSS4+Firebase10")
$null = $sb.AppendLine("URL: https://gui130699.github.io/PWA-FINAN-AS-MOBILE/")
$null = $sb.AppendLine("================================================================================")

foreach ($rel in $files) {
  $path = Join-Path $root $rel
  $null = $sb.AppendLine("")
  $null = $sb.AppendLine("== $rel ==")
  if (Test-Path $path) {
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    $null = $sb.Append($content.TrimEnd())
    $null = $sb.AppendLine()
  } else {
    $null = $sb.AppendLine("(arquivo nao encontrado)")
  }
}

$null = $sb.AppendLine("")
$null = $sb.AppendLine("== FIM ==")

[System.IO.File]::WriteAllText($out, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Write-Host "OK: $out"
Write-Host "Tamanho: $((Get-Item $out).Length) bytes"
$lineCount = ([System.IO.File]::ReadAllLines($out)).Count
Write-Host "Linhas: $lineCount"
