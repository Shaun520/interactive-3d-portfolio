$tmp = $env:TEMP
Get-ChildItem -Path $tmp -Recurse -Filter '*.png' -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-5) } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 5 |
    ForEach-Object { Write-Output ("{0}  {1}" -f $_.LastWriteTime, $_.FullName) }
