# Bundle output/**/0X_*.md and .github/skills/*/SKILL.md into docs/data.js
# so the viewer can load them via <script> without any browser file picker/upload.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$files = [ordered]@{}

$targets = @()
if (Test-Path "$root\output") {
  $targets += Get-ChildItem "$root\output" -Recurse -File | Where-Object { $_.Name -match '^0[1-9]_.+\.md$' }
}
if (Test-Path "$root\.github\skills") {
  $targets += Get-ChildItem "$root\.github\skills" -Recurse -File -Filter 'SKILL.md'
}

foreach ($f in $targets) {
  $rel = $f.FullName.Substring($root.Length).TrimStart('\').Replace('\', '/')
  $files[$rel] = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
}

$data = [ordered]@{ at = (Get-Date).ToUniversalTime().ToString('o'); files = $files }
$json = $data | ConvertTo-Json -Depth 3 -Compress
[System.IO.File]::WriteAllText("$root\docs\data.js", "window.PI_DATA = $json;", (New-Object System.Text.UTF8Encoding $false))
Write-Host "docs/data.js written: $($files.Count) files"
