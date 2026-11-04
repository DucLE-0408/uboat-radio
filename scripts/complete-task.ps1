[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$TaskPath
)

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$ActiveRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'memory/tasks/active'))
$CompletedRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'memory/tasks/completed'))
$ResolvedTask = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $TaskPath).Path)

if (-not $ResolvedTask.StartsWith($ActiveRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Task must be an existing file under memory/tasks/active.'
}

$content = Get-Content -LiteralPath $ResolvedTask -Raw -Encoding utf8
if ($content -notmatch '(?m)^status:\s*(?:in-progress|blocked|planned)\s*$') { throw 'Task has no closable status.' }
if ($content -match '(?im)pending implementation|Result:\s*`?pending|Remaining issue or reason not verified:\s*$') {
    throw 'Task still contains pending or incomplete verification evidence.'
}

$timestamp = (Get-Date).ToUniversalTime().ToString('o')
$content = [regex]::Replace($content, '(?m)^status:\s*.*$', 'status: completed', 1)
$content = [regex]::Replace($content, '(?m)^updated_at:\s*.*$', "updated_at: $timestamp", 1)
$destination = Join-Path $CompletedRoot ([System.IO.Path]::GetFileName($ResolvedTask))
if (Test-Path -LiteralPath $destination) { throw "Completed task already exists: $destination" }

$planPath = $null
$planContent = $null
if ($content -match '(?m)^plan:\s*(?<plan>[^\r\n]+)') {
    $relativePlan = $Matches['plan'].Trim()
    if ($relativePlan -ne 'null') {
        $planPath = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot $relativePlan))
        $plansRoot = [System.IO.Path]::GetFullPath((Join-Path $RepositoryRoot 'memory/plans'))
        if (-not $planPath.StartsWith($plansRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not (Test-Path -LiteralPath $planPath -PathType Leaf)) {
            throw 'Linked plan must resolve to an existing file under memory/plans.'
        }
        $planContent = Get-Content -LiteralPath $planPath -Raw -Encoding utf8
        $completedRelative = "memory/tasks/completed/$([System.IO.Path]::GetFileName($ResolvedTask))"
        $planContent = [regex]::Replace($planContent, '(?m)^task:\s*.*$', "task: $completedRelative", 1)
        $planContent = [regex]::Replace($planContent, '(?m)^status:\s*.*$', 'status: completed', 1)
    }
}

if ($PSCmdlet.ShouldProcess($ResolvedTask, "Complete and move to $destination")) {
    [System.IO.File]::WriteAllText($ResolvedTask, $content, [System.Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $ResolvedTask -Destination $destination
    if ($planPath) {
        [System.IO.File]::WriteAllText($planPath, $planContent, [System.Text.UTF8Encoding]::new($false))
    }
    Write-Output "Completed task: $destination"
}
