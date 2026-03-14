$tag = "v$(Get-Date -Format 'yyyyMMdd')"

# If a tag already exists for today, append an incrementing counter
git rev-parse $tag 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    $n = 2
    git rev-parse "$tag.$n" 2>$null | Out-Null
    while ($LASTEXITCODE -eq 0) {
        $n++
        git rev-parse "$tag.$n" 2>$null | Out-Null
    }
    $tag = "$tag.$n"
}

Write-Host "Tagging $tag"
git tag $tag
git push origin $tag --no-verify
