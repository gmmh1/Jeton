# Jeton Cargo Tech Infrastructure

This repository provides a production-ready baseline for Jeton Cargo's event-driven logistics platform.

## Architecture

- Frontend: Next.js web app
- Mobile: React Native (Expo)
- Core API: NestJS services (pricing, booking, tracking, QR lookup)
- Headless CMS: Strapi
- Automation: n8n workflows as the central orchestration layer
- ERP: Odoo
- API CMS layer: Directus
- Data: PostgreSQL + Redis
- Deployment: Docker Compose (local), Kubernetes manifests (cloud)
- CI/CD: GitHub Actions

## Repo Structure

- `services/api`: NestJS core API layer
- `apps/web`: Next.js customer/operator portal shell
- `apps/mobile`: Expo mobile app shell
- `workflows/n8n`: importable n8n workflow JSON files
- `db`: SQL schema baseline
- `infra/k8s`: Kubernetes manifests
- `.github/workflows`: CI/CD pipelines
- `docs`: architecture and operations docs

## Quick Start (Local)

1. Copy `.env.example` to `.env` and adjust values.
2. Start infrastructure:

```bash
docker compose up -d postgres redis n8n directus strapi odoo
```

Strapi admin panel:

```text
http://localhost:1337/admin
```

3. Run API:

```bash
cd services/api
npm install
npm run start:dev
```

4. Run web app:

```bash
cd apps/web
npm install
npm run dev
```

5. Run mobile app:

```bash
cd apps/mobile
npm install
npm run start
```

Mobile environment setup (`apps/mobile/.env`):

```text
EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000/api
EXPO_PUBLIC_REALTIME_POLL_MS=5000
```

Note: For physical phones, never use `localhost`; use the host machine LAN IP.

## MVP Event Flow

1. User books shipment from web/mobile.
2. API creates booking + shipment in PostgreSQL.
3. n8n webhook receives booking event.
4. n8n triggers airline notification and Odoo sync.
5. Tracking updates trigger customer notifications.
6. QR scan endpoint resolves shipment instantly.

## Immediate Launch Priorities

1. Configure production secrets and domains.
2. Connect real airline, WhatsApp, and payment providers.
3. Finalize Odoo integration credentials.
4. Enable object storage for shipping documents.
5. Add Sentry and dashboards for operational visibility.

## AWS Deployment Guide

- AWS + GitHub deployment runbook: [docs/aws-deployment-guide.md](docs/aws-deployment-guide.md)
- Operational deployment sequence: [docs/deployment-runbook.md](docs/deployment-runbook.md)

## Security Layers Implemented

- Helmet security headers in API runtime.
- Strict CORS allowlist using `API_CORS_ORIGINS`.
- Global DTO validation with whitelist and rejection of unknown fields.
- Global rate limiting using throttler guard.
- JWT authentication via Passport strategy.
- Role-based authorization for business endpoints.
