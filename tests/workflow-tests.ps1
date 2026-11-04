[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$RepositoryRoot = Split-Path -Parent $PSScriptRoot
$TemporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("repo-template-workflow-test-" + [guid]::NewGuid().ToString('N'))

try {
    foreach ($directory in @(
        'scripts', 'memory/tasks/active', 'memory/tasks/completed',
        'memory/session-handoffs', 'memory/plans'
    )) {
        New-Item -ItemType Directory -Path (Join-Path $TemporaryRoot $directory) -Force | Out-Null
    }
    foreach ($relative in @(
        'scripts/new-task.ps1', 'scripts/new-handoff.ps1', 'scripts/complete-task.ps1',
        'memory/tasks/task-template.md', 'memory/session-handoffs/handoff-template.md'
    )) {
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot $relative) -Destination (Join-Path $TemporaryRoot $relative)
    }
    git -C $TemporaryRoot init --initial-branch=main | Out-Null
    git -C $TemporaryRoot config user.name 'Workflow Test' | Out-Null
    git -C $TemporaryRoot config user.email 'workflow-test@example.invalid' | Out-Null
    git -C $TemporaryRoot add --all
    git -C $TemporaryRoot commit -m 'test baseline' | Out-Null

    & (Join-Path $TemporaryRoot 'scripts/new-task.ps1') `
        -Name 'test-lifecycle' `
        -Goal 'Verify task and handoff lifecycle scripts.' `
        -ConfirmationReference 'automated regression test' `
        -Owner 'test-agent' `
        -OwnedPath @('src', 'tests') | Out-Null
    $task = Get-ChildItem -LiteralPath (Join-Path $TemporaryRoot 'memory/tasks/active') -Filter '*test-lifecycle.md' -File
    if (-not $task) { throw 'new-task.ps1 did not create an active task.' }
    $taskContent = Get-Content -LiteralPath $task.FullName -Raw -Encoding utf8
    if ($taskContent -notmatch '(?m)^status: in-progress\r?$' -or $taskContent -notmatch '(?m)^  - src\r?$') {
        throw 'Generated task metadata is incorrect.'
    }
    $relativePlan = 'memory/plans/test-lifecycle.md'
    $planPath = Join-Path $TemporaryRoot $relativePlan
    $planContent = @"
---
schema_version: 1
id: plan-test-lifecycle
task: memory/tasks/active/$($task.Name)
status: approved
owner: test-agent
base_commit: $(git -C $TemporaryRoot rev-parse HEAD)
---

# Plan: test-lifecycle
"@
    [System.IO.File]::WriteAllText($planPath, $planContent, [System.Text.UTF8Encoding]::new($false))
    $taskContent = [regex]::Replace($taskContent, '(?m)^plan:\s*null\r?$', "plan: $relativePlan", 1)
    [System.IO.File]::WriteAllText($task.FullName, $taskContent, [System.Text.UTF8Encoding]::new($false))

    & (Join-Path $TemporaryRoot 'scripts/new-handoff.ps1') `
        -Name 'test-lifecycle-transfer' `
        -TaskPath $task.FullName `
        -FromAgent 'test-agent' `
        -ToAgent 'next-agent' | Out-Null
    $handoff = Get-ChildItem -LiteralPath (Join-Path $TemporaryRoot 'memory/session-handoffs') -Filter '*test-lifecycle-transfer.md' -File
    if (-not $handoff) { throw 'new-handoff.ps1 did not create a handoff.' }

    $taskContent = $taskContent.Replace('- Remaining issue or reason not verified:', '- Remaining issue or reason not verified: none; lifecycle test passed.')
    [System.IO.File]::WriteAllText($task.FullName, $taskContent, [System.Text.UTF8Encoding]::new($false))
    & (Join-Path $TemporaryRoot 'scripts/complete-task.ps1') -TaskPath $task.FullName | Out-Null
    $completed = Join-Path $TemporaryRoot "memory/tasks/completed/$($task.Name)"
    if (-not (Test-Path -LiteralPath $completed -PathType Leaf)) { throw 'complete-task.ps1 did not move the task.' }
    if ((Get-Content -LiteralPath $completed -Raw -Encoding utf8) -notmatch '(?m)^status: completed\r?$') {
        throw 'Completed task status was not updated.'
    }
    $completedPlan = Get-Content -LiteralPath $planPath -Raw -Encoding utf8
    if ($completedPlan -notmatch '(?m)^status: completed\r?$' -or
        $completedPlan -notmatch "(?m)^task: memory/tasks/completed/$([regex]::Escape($task.Name))\r?$") {
        throw 'Linked plan was not closed and relinked to the completed task.'
    }
    Write-Output 'Workflow lifecycle regression checks passed.'
}
finally {
    $resolvedTemp = [System.IO.Path]::GetFullPath($TemporaryRoot)
    $systemTemp = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
    if ($resolvedTemp.StartsWith($systemTemp, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedTemp).StartsWith('repo-template-workflow-test-')) {
        Remove-Item -LiteralPath $resolvedTemp -Recurse -Force -ErrorAction SilentlyContinue
    }
}
