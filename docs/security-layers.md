# API Security Layers

## Implemented

1. Security headers
- `helmet` is enabled in API bootstrap.

2. CORS restrictions
- Allowed origins are explicitly controlled by `API_CORS_ORIGINS`.
- Credentials are supported for trusted frontends.

3. Input validation hardening
- Global `ValidationPipe` with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

4. Global rate limiting
- `@nestjs/throttler` enabled globally via `APP_GUARD`.
- Tunable with `THROTTLE_TTL` and `THROTTLE_LIMIT`.

5. JWT authentication
- Bearer token validation through Passport JWT strategy.
- Token payload includes user id, email, and role.

6. Role-based authorization
- Roles decorator and guard support `admin`, `shipper`, `operator`.
- Business endpoints are protected with both JWT and role checks.

## Recommended Next Security Steps

1. Move user storage from in-memory to PostgreSQL with salted password hashes.
2. Add refresh tokens and token revocation support.
3. Add audit log table for sensitive actions.
4. Add SIEM/Sentry hooks for auth and abuse events.
5. Add WAF/IP reputation and bot protection in front of API ingress.
