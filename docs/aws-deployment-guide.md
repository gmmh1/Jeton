# AWS Deployment Guide (EKS + ECR + GitHub Actions)

This guide shows how to host Jeton on AWS and deploy from GitHub push events.

## 1. Current Readiness Check (Repository Audit)

Status: partially ready. Core structure exists, but production blockers must be handled first.

### What is already good

- GitHub Actions workflow exists for AWS deploy: [.github/workflows/deploy-aws.yml](../.github/workflows/deploy-aws.yml)
- Kubernetes manifests exist for API, web, and ingress:
  - [infra/k8s/api-deployment.yaml](../infra/k8s/api-deployment.yaml)
  - [infra/k8s/web-deployment.yaml](../infra/k8s/web-deployment.yaml)
  - [infra/k8s/ingress.yaml](../infra/k8s/ingress.yaml)
- API is configured to bind on 0.0.0.0 for container/network access:
  - [services/api/src/main.ts](../services/api/src/main.ts)

### What must be fixed before production deploy

1. Kubernetes secrets coverage is incomplete.
- API deployment currently injects only DATABASE_URL from secret.
- API also needs JWT and other runtime env values from secret/config.
- File: [infra/k8s/api-deployment.yaml](../infra/k8s/api-deployment.yaml)

2. Ingress TLS is not configured.
- No certificate configuration and no TLS section.
- File: [infra/k8s/ingress.yaml](../infra/k8s/ingress.yaml)

3. Health probes and resource limits are missing.
- Add readiness/liveness probes and CPU/memory requests/limits.
- Files: [infra/k8s/api-deployment.yaml](../infra/k8s/api-deployment.yaml), [infra/k8s/web-deployment.yaml](../infra/k8s/web-deployment.yaml)

4. Namespace and secret bootstrap manifests are missing.
- Workflow expects existing namespace and secret objects.
- Add one-time bootstrap YAML or Terraform for namespace + secrets.

5. Managed database/redis and backup setup is not automated in this repo.
- Use RDS PostgreSQL + ElastiCache Redis and set backup policies.

If you want, these five points can be converted into concrete manifests in a follow-up change.

## 2. Target AWS Architecture

- Route 53 for DNS
- EKS for Kubernetes cluster
- ECR for container images
- RDS PostgreSQL for application database
- ElastiCache Redis for cache/session/rate data
- AWS Load Balancer Controller for Kubernetes ingress
- ACM certificates for TLS
- GitHub Actions OIDC role for secure deployment

## 3. Prerequisites

- AWS account with permissions for EKS, ECR, IAM, VPC, Route 53, ACM, RDS, ElastiCache
- Existing GitHub repository for this code
- Domain name managed in Route 53 (or delegated)
- kubectl, aws cli, and eksctl installed locally

## 4. One-Time AWS Setup

### 4.1 Create ECR repositories

- jeton-api
- jeton-web

Example:

```bash
aws ecr create-repository --repository-name jeton-api --region us-east-1
aws ecr create-repository --repository-name jeton-web --region us-east-1
```

### 4.2 Create EKS cluster

Use your preferred method (eksctl, Terraform, or console). Ensure:

- Worker nodes can pull from ECR
- Cluster has IAM OIDC provider associated
- kubectl access works

### 4.3 Install AWS Load Balancer Controller

Install the controller into EKS to support ingress -> ALB behavior.

### 4.4 Provision managed data services

- RDS PostgreSQL (production settings, backups enabled)
- ElastiCache Redis (production settings)

### 4.5 Create DNS + certificates

- Request ACM certificate for your hosts (example: app.jetoncargo.com, api.jetoncargo.com)
- Point Route 53 records to the load balancer created by ingress

## 5. GitHub OIDC Deployment Role

Create an IAM role that GitHub Actions can assume.

- Trust policy: GitHub OIDC provider + your repo conditions
- Permissions should include:
  - ECR push permissions
  - EKS describe/update kubeconfig permissions
  - kubectl apply/rollout access via mapped IAM role

Your workflow already uses OIDC:

- [.github/workflows/deploy-aws.yml](../.github/workflows/deploy-aws.yml)

## 6. Required GitHub Repository Secrets

Set these in GitHub repository settings -> Secrets and variables -> Actions:

- AWS_REGION
- AWS_ECR_REGISTRY
- AWS_EKS_CLUSTER
- AWS_K8S_NAMESPACE
- AWS_DEPLOY_ROLE_ARN

Example values:

- AWS_REGION: us-east-1
- AWS_ECR_REGISTRY: 123456789012.dkr.ecr.us-east-1.amazonaws.com
- AWS_EKS_CLUSTER: jeton-prod
- AWS_K8S_NAMESPACE: jeton-prod
- AWS_DEPLOY_ROLE_ARN: arn:aws:iam::123456789012:role/github-actions-jeton-deploy

## 7. Kubernetes Secrets and Config

Before first deployment, create your namespace and secrets.

### 7.1 Create namespace

```bash
kubectl create namespace jeton-prod
```

### 7.2 Create API secret values

At minimum include:

- DATABASE_URL
- JWT_SECRET
- JWT_EXPIRES_IN
- SUPERUSER_EMAIL
- SUPERUSER_PASSWORD_HASH
- SUPERUSER_ROLE
- API_CORS_ORIGINS
- THROTTLE_TTL
- THROTTLE_LIMIT
- STRIPE_SECRET_KEY (if used)
- STRIPE_WEBHOOK_SECRET (if used)
- STRIPE_CURRENCY
- TWILIO_ACCOUNT_SID (if used)
- TWILIO_AUTH_TOKEN (if used)
- TWILIO_WHATSAPP_NUMBER
- SUPPORT_DEFAULT_CHANNEL
- N8N_WEBHOOK_BASE_URL
- STRAPI_INTERNAL_URL
- STRAPI_INGEST_BASE_PATH
- STRAPI_API_TOKEN

Then patch [infra/k8s/api-deployment.yaml](../infra/k8s/api-deployment.yaml) to map required env vars from secret/config.

## 8. Recommended Manifest Hardening

Apply before go-live:

1. Add readiness/liveness probes to API and web deployments.
2. Add CPU/memory requests and limits.
3. Add pod disruption budgets for API and web.
4. Add ingress TLS section and ALB annotations.
5. Add HPA for API if traffic is expected to burst.

## 9. GitHub-Based Deployment Flow

Current workflow behavior:

- On push to main (or manual dispatch)
- Build API and web images
- Push both images to ECR
- Replace image references in Kubernetes manifests
- Apply manifests to EKS namespace
- Wait for rollout success

Source workflow:

- [.github/workflows/deploy-aws.yml](../.github/workflows/deploy-aws.yml)

## 10. Push to GitHub to Deploy

After you commit your changes, push to main branch to trigger deployment.

```bash
git add .
git commit -m "docs: add AWS deployment guide"
git push origin main
```

If you use pull-request based release, merge the PR into main to trigger deployment.

## 11. Post-Deploy Validation Checklist

1. Check action run status in GitHub Actions tab.
2. Confirm new image tags are running:

```bash
kubectl -n jeton-prod get deploy
kubectl -n jeton-prod get pods
kubectl -n jeton-prod get ingress
```

3. Validate endpoints:
- https://app.jetoncargo.com
- https://api.jetoncargo.com/api/health (or another known API endpoint)

4. Review logs:

```bash
kubectl -n jeton-prod logs deploy/jeton-api --tail=200
kubectl -n jeton-prod logs deploy/jeton-web --tail=200
```

## 12. Rollback

If rollout fails:

```bash
kubectl -n jeton-prod rollout undo deploy/jeton-api
kubectl -n jeton-prod rollout undo deploy/jeton-web
```

Then investigate the failed GitHub run and pod logs.

## 13. Notes About Mobile App

The mobile app should use a public API URL in production, not localhost or LAN IP.

- [apps/mobile/.env.example](../apps/mobile/.env.example)
- [README.md](../README.md)
