[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string]$Name,

    [Parameter(Mandatory)]
    [string]$TaskPath,

    [Parameter(Mandatory)]
    [string]$FromAgent,

    [Parameter(Mandatory)]
    [string]$ToAgent
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$Template = Join-Path $RepositoryRoot 'memory/session-handoffs/handoff-template.md'
$DestinationRoot = Join-Path $RepositoryRoot 'memory/session-handoffs'
$ResolvedTask = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $TaskPath).Path)
$TaskRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'memory/tasks'))
if (-not $ResolvedTask.StartsWith($TaskRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Task path must be under memory/tasks.'
}

$timestamp = (Get-Date).ToUniversalTime().ToString('o')
$date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$commit = (git -C $RepositoryRoot rev-parse HEAD).Trim()
$rootWithSeparator = $RepositoryRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$rootUri = [Uri]$rootWithSeparator
$taskUri = [Uri]$ResolvedTask
$relativeTask = [Uri]::UnescapeDataString($rootUri.MakeRelativeUri($taskUri).ToString())
$destination = Join-Path $DestinationRoot "$date-$Name.md"
if (Test-Path -LiteralPath $destination) { throw "Handoff already exists: $destination" }

$content = Get-Content -LiteralPath $Template -Raw -Encoding utf8
$replacements = [ordered]@{
    '{{HANDOFF_ID}}' = "handoff-$date-$Name"
    '{{HANDOFF_NAME}}' = $Name
    '{{TASK_PATH}}' = $relativeTask
    '{{FROM_AGENT}}' = $FromAgent
    '{{TO_AGENT}}' = $ToAgent
    '{{CREATED_AT}}' = $timestamp
    '{{BASE_COMMIT}}' = $commit
    '{{CURRENT_COMMIT}}' = $commit
}
foreach ($entry in $replacements.GetEnumerator()) { $content = $content.Replace($entry.Key, $entry.Value) }
[System.IO.File]::WriteAllText($destination, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output "Created handoff: $destination"
