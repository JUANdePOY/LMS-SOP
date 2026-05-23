$content = Get-Content 'C:\wamp64\www\PAFR\PAFR\pafr_database_schema_fresh.sql' -Raw

# Remove everything up to and including the USE statement
$content = $content -replace '(?s)^.*?USE `pafr`;\s*', ''

# Remove all the ugly version-specific /*! ... */ comments
$content = $content -replace '/\*!\d+[^/]*\*/\s*', ''

# Remove the per-table DROP TABLE lines (we already drop the whole DB)
$content = $content -replace 'DROP TABLE IF EXISTS `[^`]+`;\s*', ''

# Append to our project schema file
Add-Content -Path 'C:\wamp64\www\PAFR\PAFR\pafr_database_schema.sql' -Value $content -Encoding UTF8

Write-Host "Schema file successfully updated."
Write-Host "New size: $((Get-Item 'C:\wamp64\www\PAFR\PAFR\pafr_database_schema.sql').Length / 1KB) KB"
