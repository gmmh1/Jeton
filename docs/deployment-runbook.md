# Deployment Runbook

## Environments

- Local: Docker Compose
- Staging: Kubernetes namespace `jeton-staging`
- Production: Kubernetes namespace `jeton-prod`

## Deployment Sequence

1. Provision managed PostgreSQL and Redis.
2. Deploy secrets (`database-url`, `jwt-secret`, provider API keys).
3. Deploy API and web manifests from `infra/k8s`.
4. Deploy n8n and import workflow JSON from `workflows/n8n`.
5. Configure Odoo and Directus admin access.
6. Attach domains to ingress (`api.jetoncargo.com`, `app.jetoncargo.com`).

## Required External Integrations

- Airline notification channel (SMTP/API).
- WhatsApp provider for customer messaging.
- Payment provider for invoice links.
- Cloud object storage for documents and airway bills.

## Observability

- API logs to centralized logging.
- n8n execution logs retained for audit.
- DB backups with daily snapshots.
- Alerts for failed shipments and workflow failures.
