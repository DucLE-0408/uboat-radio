[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('read', 'validate', 'sync')]
    [string]$Command = 'validate'
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$VersionFile = Join-Path $RepositoryRoot 'VERSION'
$TargetsFile = Join-Path $RepositoryRoot 'version-targets.json'
$VersionBodyPattern = 'v(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<feature>0|[1-9]\d*)\.(?<build>0|[1-9]\d*)'
$FirstRelease = [Version]'1.1.1.413'

function Get-CanonicalVersion {
    if (-not (Test-Path -LiteralPath $VersionFile -PathType Leaf)) { throw "Missing VERSION: $VersionFile" }
    $raw = Get-Content -LiteralPath $VersionFile -Raw -Encoding utf8
    if ($raw -notmatch "^$VersionBodyPattern`r?`n$") {
        throw 'VERSION must contain exactly vMAJOR.MINOR.FEATURE.BUILD followed by one newline.'
    }
    return $Matches[0].Trim()
}

function Get-Targets {
    if (-not (Test-Path -LiteralPath $TargetsFile -PathType Leaf)) { throw "Missing target manifest: $TargetsFile" }
    $config = Get-Content -LiteralPath $TargetsFile -Raw -Encoding utf8 | ConvertFrom-Json
    if ($config.schema_version -ne 1) { throw 'Unsupported version-targets.json schema_version.' }
    return $config
}

function Get-MarkerPattern {
    return '(?s)(?<start><!-- VERSION:START -->\s*)(?<body>.*?)(?<end>\s*<!-- VERSION:END -->)'
}

function Update-DocumentationTarget([string]$Path, [string]$Label, [string]$CanonicalVersion) {
    $content = Get-Content -LiteralPath $Path -Raw -Encoding utf8
    $pattern = Get-MarkerPattern
    $matches = [regex]::Matches($content, $pattern)
    if ($matches.Count -ne 1) { throw "Expected exactly one version marker block: $Path" }
    $replacement = '${start}' + "$($Label): ``$CanonicalVersion``" + '${end}'
    $updated = [regex]::Replace($content, $pattern, $replacement, 1)
    if ($updated -ne $content) {
        [System.IO.File]::WriteAllText($Path, $updated, [System.Text.UTF8Encoding]::new($false))
    }
}

function Assert-DocumentationTarget([string]$Path, [string]$Label, [string]$CanonicalVersion) {
    $content = Get-Content -LiteralPath $Path -Raw -Encoding utf8
    $matches = [regex]::Matches($content, (Get-MarkerPattern))
    if ($matches.Count -ne 1) { throw "Expected exactly one version marker block: $Path" }
    $expected = "$($Label): ``$CanonicalVersion``"
    if ($matches[0].Groups['body'].Value.Trim() -cne $expected) {
        throw "Exact version marker mismatch in $Path. Run 'sync'."
    }
}

function Assert-PublishedVersionDoesNotDecrease([string]$CanonicalVersion) {
    $tags = git -C $RepositoryRoot tag --list 'v*'
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect published Git tags.' }
    $published = @()
    foreach ($tag in $tags) {
        if ($tag -match "^$VersionBodyPattern$") {
            $numeric = [Version]($tag.TrimStart('v'))
            if ($numeric -ge $FirstRelease) { $published += $numeric }
        }
    }
    if ($published.Count -gt 0) {
        $latest = ($published | Sort-Object -Descending | Select-Object -First 1)
        if ([Version]($CanonicalVersion.TrimStart('v')) -lt $latest) {
            throw "$CanonicalVersion is lower than published tag v$latest."
        }
    }
}

$CanonicalVersion = Get-CanonicalVersion
$Targets = Get-Targets

switch ($Command) {
    'read' {
        Write-Output $CanonicalVersion
    }
    'sync' {
        foreach ($target in $Targets.documentation_targets) {
            $path = Join-Path $RepositoryRoot $target.path
            Update-DocumentationTarget $path $target.label $CanonicalVersion
        }
        Write-Output "Synchronized documentation to $CanonicalVersion"
    }
    'validate' {
        Assert-PublishedVersionDoesNotDecrease $CanonicalVersion
        foreach ($target in $Targets.documentation_targets) {
            $path = Join-Path $RepositoryRoot $target.path
            if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing version target: $($target.path)" }
            Assert-DocumentationTarget $path $target.label $CanonicalVersion
        }
        foreach ($target in $Targets.derived_wiring) {
            $path = Join-Path $RepositoryRoot $target.path
            if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing derived wiring target: $($target.path)" }
            $content = Get-Content -LiteralPath $path -Raw -Encoding utf8
            foreach ($pattern in $target.required_patterns) {
                if ($content -notmatch $pattern) { throw "Missing required version wiring '$pattern' in $($target.path)" }
            }
        }
        $numericVersion = [Version]($CanonicalVersion.TrimStart('v'))
        if ($numericVersion -lt $FirstRelease) {
            Write-Output "$CanonicalVersion is development-only; supported external release publishing is prohibited."
        } else {
            Write-Output "$CanonicalVersion is release-eligible; publication still requires explicit approval."
        }
        Write-Output 'Exact version metadata validation passed.'
    }
}
