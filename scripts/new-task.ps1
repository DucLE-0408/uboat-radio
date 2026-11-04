[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9]+(?:-[a-z0-9]+)*$')]
    [string]$Name,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$Goal,

    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$ConfirmationReference,

    [string]$Owner = 'unassigned',

    [string[]]$OwnedPath = @('unassigned'),

    [string]$PlanPath = 'null'
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$Template = Join-Path $RepositoryRoot 'memory/tasks/task-template.md'
$DestinationDirectory = Join-Path $RepositoryRoot 'memory/tasks/active'
$Timestamp = (Get-Date).ToUniversalTime().ToString('o')
$Date = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
$Destination = Join-Path $DestinationDirectory "$Date-$Name.md"

if (-not (Test-Path -LiteralPath $Template -PathType Leaf)) { throw "Missing task template: $Template" }
if (Test-Path -LiteralPath $Destination) { throw "Task already exists: $Destination" }

$baseCommit = (git -C $RepositoryRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $baseCommit -notmatch '^[0-9a-f]{7,40}$') {
    throw 'Unable to resolve a valid base commit.'
}

$ownedPathYaml = ($OwnedPath | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_) -or $_ -match '[\r\n]') { throw 'Owned paths must be non-empty single-line values.' }
    "  - $_"
}) -join [Environment]::NewLine

$content = Get-Content -LiteralPath $Template -Raw -Encoding utf8
$replacements = [ordered]@{
    '{{TASK_ID}}' = "task-$Date-$Name"
    '{{TASK_NAME}}' = $Name
    '{{OWNER}}' = $Owner
    '{{GOAL_CONFIRMED_AT}}' = $Timestamp
    '{{STARTED_AT}}' = $Timestamp
    '{{UPDATED_AT}}' = $Timestamp
    '{{BASE_COMMIT}}' = $baseCommit
    '{{OWNED_PATHS}}' = $ownedPathYaml
    '{{PLAN_PATH}}' = $PlanPath
    '{{CONFIRMATION_REFERENCE}}' = $ConfirmationReference
    '{{GOAL}}' = $Goal
}
foreach ($entry in $replacements.GetEnumerator()) { $content = $content.Replace($entry.Key, $entry.Value) }

[System.IO.File]::WriteAllText($Destination, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output "Created active task: $Destination"
