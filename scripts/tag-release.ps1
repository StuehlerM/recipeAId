$tag = "v$(Get-Date -Format 'yyyyMMdd')"

# If a tag already exists for today, append an incrementing counter
if (git rev-parse $tag 2>$null) {
    $n = 2
    while (git rev-parse "$tag.$n" 2>$null) {
        $n++
    }
    $tag = "$tag.$n"
}

Write-Host "Tagging $tag"
git tag $tag
git push origin $tag
