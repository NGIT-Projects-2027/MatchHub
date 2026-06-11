$source = "c:\Users\navee\.gemini\antigravity\scratch\matchhub"
$dest = "c:\Users\navee\Desktop\matchhub.zip"
$temp = "c:\Users\navee\Desktop\matchhub_temp"

Write-Host "Copying files to temp directory..."
New-Item -ItemType Directory -Force -Path $temp | Out-Null
Copy-Item -Path "$source\*" -Destination $temp -Recurse -Exclude "node_modules", "venv", ".git", "__pycache__" -Force

Write-Host "Zipping files..."
Compress-Archive -Path "$temp\*" -DestinationPath $dest -Force

Write-Host "Cleaning up temp directory..."
Remove-Item -Path $temp -Recurse -Force

Write-Host "Zip file successfully created at $dest"
