$ErrorActionPreference = 'Stop'

$workflowFiles = @(
  'e:\Jeton\workflows\n8n\new-booking.json',
  'e:\Jeton\workflows\n8n\shipment-status-update.json',
  'e:\Jeton\workflows\n8n\failed-shipment-alert.json',
  'e:\Jeton\workflows\n8n\invoice-payment-link.json',
  'e:\Jeton\workflows\n8n\customer-support.json',
  'e:\Jeton\workflows\n8n\qr-lookup.json'
)

foreach ($wfPath in $workflowFiles) {
  $wf = Get-Content $wfPath -Raw | ConvertFrom-Json
  $name = ($wf.name -replace "'", "''")
  $nodesJson = ($wf.nodes | ConvertTo-Json -Depth 40 -Compress) -replace "'", "''"
  $connectionsJson = ($wf.connections | ConvertTo-Json -Depth 40 -Compress) -replace "'", "''"

  $sql = @"
UPDATE workflow_entity
SET
  nodes = '$nodesJson'::json,
  connections = '$connectionsJson'::json,
  "updatedAt" = NOW(),
  active = TRUE
WHERE name = '$name';

UPDATE workflow_history wh
SET
  nodes = we.nodes,
  connections = we.connections,
  "updatedAt" = NOW(),
  name = we.name
FROM workflow_entity we
WHERE wh."versionId" = we."versionId"
  AND we.name = '$name';
"@

  $tmpSql = Join-Path $env:TEMP ("sync-n8n-" + [Guid]::NewGuid().ToString('N') + ".sql")
  Set-Content -Path $tmpSql -Value $sql -Encoding UTF8
  docker cp $tmpSql jeton-postgres:/tmp/sync-n8n.sql | Out-Null
  docker exec jeton-postgres psql -U jeton -d jeton -f /tmp/sync-n8n.sql | Out-Null
}

# Rebuild webhook registrations from active workflow nodes.
docker cp "e:\Jeton\scripts\fix-n8n-webhooks.sql" jeton-postgres:/tmp/fix-n8n-webhooks.sql | Out-Null
docker exec jeton-postgres psql -U jeton -d jeton -f /tmp/fix-n8n-webhooks.sql | Out-Null

docker restart jeton-n8n | Out-Null
Start-Sleep -Seconds 8

Write-Host "n8n workflow sync complete."
