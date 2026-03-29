$ErrorActionPreference = 'Stop'

$ApiBase = 'http://localhost:3000/api'
$StrapiBase = 'http://localhost:1337'
$DirectusBase = 'http://localhost:8055'
$N8nBase = 'http://localhost:5679'
$OdooBase = 'http://localhost:8069'

$DirectusEmail = 'admin@jetoncargo.com'
$DirectusPassword = 'admin123'
$N8nUser = 'admin'
$N8nPass = 'admin123'
$OdooDb = 'jeton'
$OdooCredentialCandidates = @(
  @{ user = 'admin'; pass = 'admin123' },
  @{ user = 'admin'; pass = 'admin' }
)

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('GET', 'POST', 'PUT', 'PATCH', 'DELETE')] [string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [object]$Body,
    [hashtable]$Headers
  )

  $params = @{
    Method = $Method
    Uri = $Url
    ContentType = 'application/json'
    TimeoutSec = 30
  }

  if ($Headers) {
    $params.Headers = $Headers
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 12)
  }

  return Invoke-RestMethod @params
}

function Api-RegisterAndLogin {
  param(
    [string]$Email,
    [string]$Password,
    [ValidateSet('admin', 'operator', 'shipper')] [string]$Role
  )

  try {
    Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/auth/register" -Body @{
      email = $Email
      password = $Password
      role = $Role
    } | Out-Null
  } catch {
    # User may already exist in current runtime.
  }

  $login = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/auth/login" -Body @{
    email = $Email
    password = $Password
  }

  if (-not $login.accessToken) {
    throw "Failed to login user $Email"
  }

  return $login.accessToken
}

function Odoo-Call {
  param(
    [string]$Service,
    [string]$Method,
    [object[]]$Args
  )

  $payload = @{
    jsonrpc = '2.0'
    method = 'call'
    params = @{
      service = $Service
      method = $Method
      args = $Args
    }
    id = [int](Get-Random -Minimum 1000 -Maximum 9999)
  }

  return Invoke-JsonRequest -Method 'POST' -Url "$OdooBase/jsonrpc" -Body $payload
}

Write-Host '==> Seeding API + Strapi integration data'
$shipperToken = Api-RegisterAndLogin -Email 'mobile.shipper@jetoncargo.com' -Password 'testpass123' -Role 'shipper'
$operatorToken = Api-RegisterAndLogin -Email 'mobile.operator@jetoncargo.com' -Password 'testpass123' -Role 'operator'
$adminToken = Api-RegisterAndLogin -Email 'mobile.admin@jetoncargo.com' -Password 'testpass123' -Role 'admin'

$shipperHeaders = @{ Authorization = "Bearer $shipperToken" }
$operatorHeaders = @{ Authorization = "Bearer $operatorToken" }

$lanes = @(
  @{ origin = 'DXB'; destination = 'LHR'; weight = 48.2; volume = 0.23; airline = 'Emirates SkyCargo' },
  @{ origin = 'DOH'; destination = 'FRA'; weight = 112.5; volume = 0.41; airline = 'Qatar Cargo' },
  @{ origin = 'NBO'; destination = 'AMS'; weight = 86.3; volume = 0.35; airline = 'KLM Cargo' }
)

$seedShipments = @()
foreach ($lane in $lanes) {
  $shipment = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/shipments" -Headers $shipperHeaders -Body @{
    origin = $lane.origin
    destination = $lane.destination
    weight = $lane.weight
    volume = $lane.volume
  }

  $booking = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/bookings" -Headers $shipperHeaders -Body @{
    shipmentId = $shipment.id
    email = 'mobile.shipper@jetoncargo.com'
    airline = $lane.airline
  }

  $null = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/tracking/events" -Headers $operatorHeaders -Body @{
    trackingNumber = $shipment.trackingNumber
    status = 'in_transit'
    location = $lane.origin
  }

  $null = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/tracking/events" -Headers $operatorHeaders -Body @{
    trackingNumber = $shipment.trackingNumber
    status = 'delivered'
    location = $lane.destination
  }

  $price = Invoke-JsonRequest -Method 'POST' -Url "$ApiBase/pricing/calculate" -Body @{
    origin = $lane.origin
    destination = $lane.destination
    weight = $lane.weight
    cbm = $lane.volume
  }

  $seedShipments += @{
    id = $shipment.id
    trackingNumber = $shipment.trackingNumber
    bookingId = $booking.id
    amount = $price.amount
    currency = $price.currency
  }
}

Write-Host '==> Seeding PostgreSQL reference data'
$sql = @"
INSERT INTO rates (airline, origin, destination, rate_per_kg, min_charge, currency, effective_date)
VALUES
  ('Emirates SkyCargo','DXB','LHR',2.20,120.00,'USD',CURRENT_DATE),
  ('Qatar Cargo','DOH','FRA',2.45,150.00,'USD',CURRENT_DATE),
  ('KLM Cargo','NBO','AMS',2.15,110.00,'USD',CURRENT_DATE)
ON CONFLICT DO NOTHING;
"@

$tmpSqlPath = Join-Path $env:TEMP 'jeton-seed-rates.sql'
Set-Content -Path $tmpSqlPath -Value $sql -Encoding UTF8
& docker cp $tmpSqlPath "jeton-postgres:/tmp/jeton-seed-rates.sql" | Out-Null
& docker exec jeton-postgres psql -U jeton -d jeton -f /tmp/jeton-seed-rates.sql | Out-Null

Write-Host '==> Seeding Redis cache samples'
& docker exec jeton-redis redis-cli SET demo:tracking:last $seedShipments[0].trackingNumber | Out-Null
& docker exec jeton-redis redis-cli HSET demo:kpi today_shipments 3 delivered_shipments 3 pending_issues 0 | Out-Null

Write-Host '==> Seeding Directus managed data'
$directusLogin = Invoke-JsonRequest -Method 'POST' -Url "$DirectusBase/auth/login" -Body @{
  email = $DirectusEmail
  password = $DirectusPassword
}
$directusToken = $directusLogin.data.access_token
if (-not $directusToken) {
  throw 'Directus login failed.'
}
$directusHeaders = @{ Authorization = "Bearer $directusToken" }

$collectionName = 'ops_seed_events'
$collectionExists = $false
try {
  $null = Invoke-JsonRequest -Method 'GET' -Url "$DirectusBase/collections/$collectionName" -Headers $directusHeaders
  $collectionExists = $true
} catch {
  $collectionExists = $false
}

if (-not $collectionExists) {
  Invoke-JsonRequest -Method 'POST' -Url "$DirectusBase/collections" -Headers $directusHeaders -Body @{
    collection = $collectionName
    meta = @{
      icon = 'inventory_2'
      note = 'Seeded operational events'
    }
    schema = @{
      name = $collectionName
    }
  } | Out-Null

  $fields = @(
    @{ field = 'event_type'; type = 'string'; interface = 'input'; required = $true },
    @{ field = 'tracking_number'; type = 'string'; interface = 'input'; required = $false },
    @{ field = 'details'; type = 'text'; interface = 'input-multiline'; required = $false }
  )

  foreach ($f in $fields) {
    Invoke-JsonRequest -Method 'POST' -Url "$DirectusBase/fields/$collectionName" -Headers $directusHeaders -Body @{
      field = $f.field
      type = $f.type
      meta = @{ interface = $f.interface }
      schema = @{ is_nullable = -not $f.required }
    } | Out-Null
  }
}

foreach ($s in $seedShipments) {
  Invoke-JsonRequest -Method 'POST' -Url "$DirectusBase/items/$collectionName" -Headers $directusHeaders -Body @{
    event_type = 'shipment_delivered'
    tracking_number = $s.trackingNumber
    details = "Seed flow completed for $($s.trackingNumber), booking $($s.bookingId), amount $($s.amount) $($s.currency)"
  } | Out-Null
}

Write-Host '==> Seeding Odoo sample partners'
try {
  $uid = $null
  $odooPass = $null
  foreach ($candidate in $OdooCredentialCandidates) {
    $odooLogin = Odoo-Call -Service 'common' -Method 'login' -Args @($OdooDb, $candidate.user, $candidate.pass)
    if ($odooLogin.result) {
      $uid = $odooLogin.result
      $odooPass = $candidate.pass
      break
    }
  }

  if (-not $uid) {
    Write-Warning 'Odoo API login failed. Falling back to SQL partner seed in PostgreSQL.'

    $odooSql = @"
INSERT INTO res_partner (name, email, city, is_company, create_date, write_date)
SELECT 'Jeton Demo Shipper', 'demo.shipper@jetoncargo.com', 'Dubai', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM res_partner WHERE email = 'demo.shipper@jetoncargo.com');

INSERT INTO res_partner (name, email, city, is_company, create_date, write_date)
SELECT 'Jeton Demo Airline', 'ops@airline-demo.com', 'Doha', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM res_partner WHERE email = 'ops@airline-demo.com');

INSERT INTO res_partner (name, email, city, is_company, create_date, write_date)
SELECT 'Jeton Demo Receiver', 'demo.receiver@jetoncargo.com', 'Amsterdam', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM res_partner WHERE email = 'demo.receiver@jetoncargo.com');
"@

    $tmpOdooSqlPath = Join-Path $env:TEMP 'jeton-seed-odoo-partners.sql'
    Set-Content -Path $tmpOdooSqlPath -Value $odooSql -Encoding UTF8
    & docker cp $tmpOdooSqlPath "jeton-postgres:/tmp/jeton-seed-odoo-partners.sql" | Out-Null
    & docker exec jeton-postgres psql -U jeton -d jeton -f /tmp/jeton-seed-odoo-partners.sql | Out-Null
  } else {
    $partners = @(
      @{ name = 'Jeton Demo Shipper'; email = 'demo.shipper@jetoncargo.com'; city = 'Dubai' },
      @{ name = 'Jeton Demo Airline'; email = 'ops@airline-demo.com'; city = 'Doha' },
      @{ name = 'Jeton Demo Receiver'; email = 'demo.receiver@jetoncargo.com'; city = 'Amsterdam' }
    )

    foreach ($p in $partners) {
      $null = Odoo-Call -Service 'object' -Method 'execute_kw' -Args @(
        $OdooDb,
        $uid,
        $odooPass,
        'res.partner',
        'create',
        @(@{
          name = $p.name
          email = $p.email
          city = $p.city
          company_type = 'company'
        })
      )
    }
  }
} catch {
  Write-Warning "Odoo seeding skipped due to timeout/error: $($_.Exception.Message)"
}

Write-Host '==> Seeding n8n workflow metadata (best-effort)'
try {
  $n8nProjectId = (& docker exec jeton-postgres psql -U jeton -d jeton -t -A -c "SELECT id FROM project ORDER BY id ASC LIMIT 1;").Trim()
  if (-not $n8nProjectId) {
    throw 'No n8n project found in database.'
  }

  $workflowFiles = @(
    'e:\Jeton\workflows\n8n\new-booking.json',
    'e:\Jeton\workflows\n8n\shipment-status-update.json',
    'e:\Jeton\workflows\n8n\failed-shipment-alert.json',
    'e:\Jeton\workflows\n8n\invoice-payment-link.json',
    'e:\Jeton\workflows\n8n\qr-lookup.json',
    'e:\Jeton\workflows\n8n\customer-support.json'
  )

  foreach ($wfPath in $workflowFiles) {
    $wf = Get-Content $wfPath -Raw | ConvertFrom-Json
    $wfId = [Guid]::NewGuid().ToString('N').Substring(0, 16)
    $versionId = [Guid]::NewGuid().ToString()
    $wfName = $wf.name.Replace("'", "''")
    $nodesJson = ($wf.nodes | ConvertTo-Json -Depth 40 -Compress).Replace("'", "''")
    $connectionsJson = ($wf.connections | ConvertTo-Json -Depth 40 -Compress).Replace("'", "''")

    $sql = @"
INSERT INTO workflow_entity (
  name,
  active,
  nodes,
  connections,
  "createdAt",
  "updatedAt",
  settings,
  "staticData",
  "pinData",
  "versionId",
  "triggerCount",
  id,
  "isArchived",
  "versionCounter"
)
SELECT
  '$wfName',
  FALSE,
  '$nodesJson'::json,
  '$connectionsJson'::json,
  NOW(),
  NOW(),
  '{}'::json,
  '{}'::json,
  '{}'::json,
  '$versionId',
  0,
  '$wfId',
  FALSE,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM workflow_entity WHERE name = '$wfName'
);

INSERT INTO shared_workflow ("workflowId", "projectId", role, "createdAt", "updatedAt")
SELECT w.id, '$n8nProjectId', 'workflow:owner', NOW(), NOW()
FROM workflow_entity w
WHERE w.name = '$wfName'
AND NOT EXISTS (
  SELECT 1 FROM shared_workflow s WHERE s."workflowId" = w.id AND s."projectId" = '$n8nProjectId'
);
"@

    $tmpN8nSqlPath = Join-Path $env:TEMP "jeton-seed-n8n-$wfId.sql"
    Set-Content -Path $tmpN8nSqlPath -Value $sql -Encoding UTF8
    & docker cp $tmpN8nSqlPath "jeton-postgres:/tmp/jeton-seed-n8n.sql" | Out-Null
    & docker exec jeton-postgres psql -U jeton -d jeton -f /tmp/jeton-seed-n8n.sql | Out-Null
  }
} catch {
  Write-Warning "n8n workflow import skipped: $($_.Exception.Message)"
}

Write-Host '==> Verifying seeded record counts'
$strapiShipmentsTotal = (& docker exec jeton-postgres psql -U jeton -d jeton -t -A -c "SELECT COUNT(*) FROM cms_shipments;").Trim()
$strapiBookingsTotal = (& docker exec jeton-postgres psql -U jeton -d jeton -t -A -c "SELECT COUNT(*) FROM cms_bookings;").Trim()
$strapiTrackingTotal = (& docker exec jeton-postgres psql -U jeton -d jeton -t -A -c "SELECT COUNT(*) FROM cms_tracking_events;").Trim()
$n8nWorkflowsTotal = (& docker exec jeton-postgres psql -U jeton -d jeton -t -A -c "SELECT COUNT(*) FROM workflow_entity;").Trim()

$directusItems = Invoke-JsonRequest -Method 'GET' -Url "$DirectusBase/items/${collectionName}?limit=1&meta=filter_count" -Headers $directusHeaders

$summary = [PSCustomObject]@{
  api_seeded_shipments = $seedShipments.Count
  strapi_shipments_total = [int]$strapiShipmentsTotal
  strapi_bookings_total = [int]$strapiBookingsTotal
  strapi_tracking_events_total = [int]$strapiTrackingTotal
  n8n_workflows_total = [int]$n8nWorkflowsTotal
  directus_seed_events_total = $directusItems.meta.filter_count
  sample_tracking_numbers = ($seedShipments | ForEach-Object { $_.trackingNumber }) -join ', '
  expo_api_base = 'http://<your-lan-ip>:3000/api'
  expo_strapi_base = 'http://<your-lan-ip>:1337/api'
}

$summary | Format-List
Write-Host 'Seeding complete.'