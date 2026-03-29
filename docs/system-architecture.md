# Jeton Cargo System Architecture

## Core Layers

1. Client Layer
- Next.js web portal for shippers, operators, and admins.
- Expo mobile app for QR scan, status updates, and offline sync.

2. API Layer
- NestJS modules for auth, pricing, bookings, shipments, tracking, and scan.
- Directus as managed content/API layer for back-office resources.

3. Core Service Logic
- Pricing engine: weight, CBM, margin, lane rules.
- Booking engine: booking lifecycle and airline request hooks.
- Tracking engine: event timeline and status transitions.

4. Data + ERP + Automation
- PostgreSQL system of record.
- Odoo for invoicing and ERP workflows.
- n8n as event orchestrator between API, Odoo, airlines, and customer channels.

## Event-Driven Model

- BookingCreated -> n8n webhook -> airline notification + Odoo sync.
- ShipmentStatusUpdated -> n8n -> customer notifications (email/WhatsApp).
- InvoiceCreated -> n8n -> payment link dispatch.
- QRScanned -> lookup endpoint -> shipment details + event log.

## Security Baseline

- JWT authentication.
- Role-based access: `admin`, `shipper`, `operator`.
- Rate-limiting and audit logging.
- Secrets from environment variables or cloud secret manager.

## Multi-Country Readiness

- Country-aware routes and pricing rules.
- Currency and tax abstraction in pricing module.
- Timezone-safe timestamps and immutable tracking events.
