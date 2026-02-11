Get-Item "h:\10.02\qui.02\.git\MERGE_HEAD" -Force | Remove-Item -Force -ErrorAction SilentlyContinue
Get-Item "h:\10.02\qui.02\.git\MERGE_MSG" -Force | Remove-Item -Force -ErrorAction SilentlyContinue  
Get-Item "h:\10.02\qui.02\.git\MERGE_MODE" -Force | Remove-Item -Force -ErrorAction SilentlyContinue
Get-Item "h:\10.02\qui.02\.git\AUTO_MERGE" -Force | Remove-Item -Force -ErrorAction SilentlyContinue
Get-Item "h:\10.02\qui.02\.git\.MERGE_MSG.swp" -Force | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Output "Merge state cleaned"
