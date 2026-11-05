[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$TemporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("repo-template-init-test-" + [guid]::NewGuid().ToString('N'))

try {
    foreach ($directory in @(
        'scripts', 'docs/release', 'examples/fastapi', 'examples/governance-history',
        '.github/ISSUE_TEMPLATE', '.github/workflows'
    )) {
        New-Item -ItemType Directory -Path (Join-Path $TemporaryRoot $directory) -Force | Out-Null
    }
    foreach ($relative in @(
        'VERSION', 'version-targets.json', 'README.md',
        'scripts/initialize-repo.ps1', 'scripts/version.ps1',
        'docs/release/VERSIONING.md', 'docs/release/RELEASE-RUNBOOK.md',
        'examples/fastapi/Dockerfile', 'examples/fastapi/main.py', 'examples/fastapi/pyproject.toml',
        'examples/governance-history/README.md', '.github/ISSUE_TEMPLATE/config.yml',
        '.github/workflows/version-governance.yml', '.github/workflows/supply-chain.yml'
    )) {
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot $relative) -Destination (Join-Path $TemporaryRoot $relative)
    }
    git -C $TemporaryRoot init --initial-branch=main | Out-Null
    git -C $TemporaryRoot config user.name 'Initialization Test' | Out-Null
    git -C $TemporaryRoot config user.email 'init-test@example.invalid' | Out-Null
    git -C $TemporaryRoot add --all
    git -C $TemporaryRoot commit -m 'derived template root' | Out-Null

    & (Join-Path $TemporaryRoot 'scripts/initialize-repo.ps1') `
        -ProjectName 'sample-service' `
        -OwnerRepository 'example/sample-service' `
        -ServiceName 'Sample Service' `
        -ClearTemplateHistory | Out-Null

    $readme = Get-Content -LiteralPath (Join-Path $TemporaryRoot 'README.md') -Raw -Encoding utf8
    $dockerfile = Get-Content -LiteralPath (Join-Path $TemporaryRoot 'examples/fastapi/Dockerfile') -Raw -Encoding utf8
    $workflow = Get-Content -LiteralPath (Join-Path $TemporaryRoot '.github/workflows/version-governance.yml') -Raw -Encoding utf8
    if ($readme -notmatch 'created from the Sample Service' -or $dockerfile -notmatch 'example/sample-service' -or $workflow -notmatch 'sample-service-example') {
        throw 'Derived repository identity replacement failed.'
    }
    if (Test-Path -LiteralPath (Join-Path $TemporaryRoot 'examples/governance-history')) {
        throw 'Template governance history cleanup failed.'
    }
    & (Join-Path $TemporaryRoot 'scripts/version.ps1') validate | Out-Null
    Write-Output 'Template initialization regression checks passed.'
}
finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($TemporaryRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedTemp).StartsWith('repo-template-init-test-')) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
