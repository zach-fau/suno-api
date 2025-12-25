# Clerk Authentication Architecture for Suno

This document describes how Clerk authentication works with Suno's multi-domain setup.

## Overview

Suno uses Clerk for authentication across multiple domains:
- `suno.com` - Main application
- `accounts.suno.com` - Account management / login
- `auth.suno.com` - Clerk API for suno.com
- `clerk.suno.com` - Clerk API for accounts.suno.com

## Cookie Architecture

### Primary Cookies

| Cookie | Domain | HttpOnly | Secure | SameSite | Purpose |
|--------|--------|----------|--------|----------|---------|
| `__client` | `auth.suno.com` | Yes | Yes | None | Clerk refresh token (JWT) |
| `__client` | `clerk.suno.com` | Yes | Yes | Lax | Same, for accounts subdomain |
| `__client_uat` | `.suno.com` | No | Yes | Lax | User Active Timestamp |
| `__client_uat` | `auth.suno.com` | No | Yes | None | Always `0` on Clerk domain |
| `__session` | `.suno.com` | No | Yes | Lax | Browser session JWT |

### Session-Variant Cookies

Clerk creates session-specific variants with a suffix (e.g., `Jnxw-muT`):
- `__client_Jnxw-muT` - Session-specific refresh token
- `__client_uat_Jnxw-muT` - Session-specific UAT with real timestamp

**Important**: The plain `__client_uat` might be `0`, but the session-variant contains the real timestamp needed for authentication.

## Token Types

### 1. API Token (for backend calls)

Obtained via:
```
POST auth.suno.com/v1/client/sessions/{sid}/tokens
Authorization: {__client}
```

Response contains JWT with:
```json
{
  "aud": "suno-api",
  "azp": "https://suno.com",
  "iss": "https://auth.suno.com",
  "suno.com/claims/token_type": "access"
}
```

Used with `Authorization: Bearer {token}` header for API calls.

### 2. Browser Session Token (for page access)

Created by Clerk JS client-side after validating `__client` with auth.suno.com.

Has different JWT claims than API token - **cannot be faked with API token**.

## Authentication Flows

### API Authentication Flow

```
1. Extract __client from SUNO_COOKIE
2. GET auth.suno.com/v1/client
   - Headers: Authorization: {__client}
   - Response: { response: { last_active_session_id: "..." } }
3. POST auth.suno.com/v1/client/sessions/{sid}/tokens
   - Headers: Authorization: {__client}
   - Response: { jwt: "eyJ..." }
4. Use JWT as Bearer token for suno.com/api/* calls
```

### Browser Authentication Flow

```
1. Set cookies on browser context:
   - __client on auth.suno.com (SameSite=None, HttpOnly)
   - __client on clerk.suno.com (SameSite=Lax, HttpOnly)
   - __client_uat on .suno.com (with real timestamp!)
   - DO NOT set __session

2. Navigate to suno.com (homepage)

3. Clerk JS automatically:
   - Loads from scdn.clerk.com
   - Detects __client cookie on auth.suno.com
   - Calls auth.suno.com/v1/client to validate
   - Creates proper __session cookie

4. Navigate to protected page (e.g., /create)
   - Clerk middleware sees valid __session
   - Page loads normally
```

## Debugging Tips

### Check Clerk Auth Headers

When a request is rejected, Clerk returns helpful headers:

```
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
x-clerk-redirect-to: true
```

Common reasons:
- `session-token-and-uat-missing` - `__session` or `__client_uat` missing/invalid
- `session-token-missing` - No `__session` cookie
- `session-token-invalid` - JWT validation failed

### Verify Cookie Setup

Check cookies in DevTools → Application → Cookies:

1. `auth.suno.com`:
   - `__client` should have JWT value
   - `__client_uat` should be `0`

2. `.suno.com` (or `suno.com`):
   - `__client_uat` should be timestamp (e.g., `1766669345`), NOT `0`
   - `__session` should appear after Clerk JS runs

### Verify Clerk JS Communication

In Network tab, filter by `auth.suno.com`:
- Should see `GET /v1/client` request
- Should see `GET /v1/environment` request
- Check if `__client` cookie is being sent in request headers

## Common Pitfalls

### 1. Setting Wrong `__client_uat` Value

**Wrong**: Setting `__client_uat=0` on `.suno.com`
**Right**: Extract timestamp from session-variant cookie (e.g., `__client_uat_Jnxw-muT`)

### 2. Injecting `__session` Manually

**Wrong**: Setting `__session` to API bearer token
**Right**: Let Clerk JS create `__session` by navigating to non-protected page first

### 3. Wrong Cookie Domain

**Wrong**: Setting `__client` on `.suno.com`
**Right**: Set `__client` on exact Clerk domains (`auth.suno.com`, `clerk.suno.com`)

### 4. Direct Navigation to Protected Page

**Wrong**: Navigate directly to `/create` (protected)
**Right**: Navigate to `/` first, wait for Clerk JS, then navigate to `/create`

## Reference: Real Browser Cookie String

A working authenticated session sends cookies like:
```
__session=eyJ...; __client_uat=1766669345; __client_uat_Jnxw-muT=1766669345; __client_Jnxw-muT=eyJ...; ...
```

Note: `__client` is NOT sent to suno.com (it's on auth.suno.com domain only).
