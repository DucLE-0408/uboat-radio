[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string]$ProjectName,

    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$OwnerRepository,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$ServiceName,

    [switch]$ClearTemplateHistory
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$replacements = [ordered]@{
    'Warp Agent Repository Template' = $ServiceName
    'replace-owner/replace-repository' = $OwnerRepository
    'Replace with service name' = $ServiceName
    'repository-template-fastapi-example' = "$ProjectName-fastapi-example"
    'repo-template-example' = "$ProjectName-example"
}
$targetFiles = @(
    (Join-Path $RepositoryRoot 'README.md'),
    (Join-Path $RepositoryRoot '.github/ISSUE_TEMPLATE/config.yml'),
    (Join-Path $RepositoryRoot '.github/workflows/version-governance.yml'),
    (Join-Path $RepositoryRoot '.github/workflows/supply-chain.yml'),
    (Join-Path $RepositoryRoot 'examples/fastapi/Dockerfile'),
    (Join-Path $RepositoryRoot 'examples/fastapi/main.py'),
    (Join-Path $RepositoryRoot 'examples/fastapi/pyproject.toml')
)

foreach ($path in $targetFiles) {
    $content = Get-Content -LiteralPath $path -Raw -Encoding utf8
    foreach ($entry in $replacements.GetEnumerator()) { $content = $content.Replace($entry.Key, $entry.Value) }
    if ($PSCmdlet.ShouldProcess($path, 'Apply derived project identity')) {
        [System.IO.File]::WriteAllText($path, $content, [System.Text.UTF8Encoding]::new($false))
    }
}

if ($ClearTemplateHistory) {
    $commitCount = [int](git -C $RepositoryRoot rev-list --count HEAD)
    if ($LASTEXITCODE -ne 0 -or $commitCount -ne 1) {
        throw 'Template history cleanup is allowed only on a one-commit derived repository.'
    }
    $historyRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'examples/governance-history'))
    $expectedParent = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'examples'))
    if (-not $historyRoot.StartsWith($expectedParent + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'Resolved history path escaped the expected examples directory.'
    }
    if ((Test-Path -LiteralPath $historyRoot) -and $PSCmdlet.ShouldProcess($historyRoot, 'Remove inherited template governance history')) {
        Remove-Item -LiteralPath $historyRoot -Recurse -Force
    }
}

& (Join-Path $PSScriptRoot 'version.ps1') sync
Write-Output "Initialized derived repository '$ProjectName' for $OwnerRepository."
