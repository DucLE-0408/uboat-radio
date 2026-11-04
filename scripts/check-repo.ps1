[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
}

& (Join-Path $PSScriptRoot 'version.ps1') validate
if ($LASTEXITCODE -ne 0) { throw 'Version validation failed.' }

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCommand) { throw 'Python is required for repository governance validation.' }
Invoke-Checked $pythonCommand.Source @((Join-Path $PSScriptRoot 'validate_repo.py'))

$trackedDiff = git -C $RepositoryRoot diff --check
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed: $trackedDiff" }
Write-Output 'Repository health checks passed.'
