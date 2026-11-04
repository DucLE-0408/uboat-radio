[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$TemporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("repo-template-version-test-" + [guid]::NewGuid().ToString('N'))

function Assert-Throws([scriptblock]$Action, [string]$Description) {
    $threw = $false
    try { & $Action } catch { $threw = $true }
    if (-not $threw) { throw "Expected failure: $Description" }
}

try {
    New-Item -ItemType Directory -Path $TemporaryRoot | Out-Null
    foreach ($directory in @('scripts', 'docs/release', 'examples/fastapi')) {
        New-Item -ItemType Directory -Path (Join-Path $TemporaryRoot $directory) -Force | Out-Null
    }
    foreach ($relative in @(
        'VERSION', 'version-targets.json', 'README.md', 'scripts/version.ps1',
        'docs/release/VERSIONING.md', 'docs/release/RELEASE-RUNBOOK.md',
        'examples/fastapi/main.py', 'examples/fastapi/Dockerfile'
    )) {
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot $relative) -Destination (Join-Path $TemporaryRoot $relative)
    }

    git -C $TemporaryRoot init --initial-branch=main | Out-Null
    git -C $TemporaryRoot config user.name 'Version Test' | Out-Null
    git -C $TemporaryRoot config user.email 'version-test@example.invalid' | Out-Null
    git -C $TemporaryRoot add --all
    git -C $TemporaryRoot commit -m 'test baseline' | Out-Null

    & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null

    $readme = Join-Path $TemporaryRoot 'README.md'
    $content = Get-Content -LiteralPath $readme -Raw -Encoding utf8
    $content = $content.Replace('Current repository version: `v0.0.0.0`', 'Current repository version: `v9.9.9.9`')
    [System.IO.File]::WriteAllText($readme, $content, [System.Text.UTF8Encoding]::new($false))
    Assert-Throws { & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null } 'wrong marker value'
    & (Join-Path $TemporaryRoot 'scripts/version.ps1') sync | Out-Null
    & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null

    [System.IO.File]::WriteAllText((Join-Path $TemporaryRoot 'VERSION'), 'v1.2.3', [System.Text.UTF8Encoding]::new($false))
    Assert-Throws { & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null } 'malformed canonical version'

    [System.IO.File]::WriteAllText((Join-Path $TemporaryRoot 'VERSION'), "v1.1.1.414`n", [System.Text.UTF8Encoding]::new($false))
    & (Join-Path $TemporaryRoot 'scripts/version.ps1') sync | Out-Null
    git -C $TemporaryRoot add --all
    git -C $TemporaryRoot commit -m 'published version' | Out-Null
    git -C $TemporaryRoot tag v1.1.1.414
    [System.IO.File]::WriteAllText((Join-Path $TemporaryRoot 'VERSION'), "v1.1.1.413`n", [System.Text.UTF8Encoding]::new($false))
    & (Join-Path $TemporaryRoot 'scripts/version.ps1') sync | Out-Null
    Assert-Throws { & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null } 'version lower than published tag'

    Write-Output 'Version regression checks passed.'
}
finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($TemporaryRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedTemp).StartsWith('repo-template-version-test-')) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
