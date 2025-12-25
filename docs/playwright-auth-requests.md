# Playwright Browser Auth Requests (accounts.suno.com)

Captured: Dec 25, 2025

## Critical Finding

**Different Clerk endpoints for different domains:**
- `suno.com` uses → `auth.suno.com`
- `accounts.suno.com` uses → `clerk.suno.com`

**The `__client` cookie must be set on BOTH domains!**

---

## Request 1: GET clerk.suno.com/v1/client (Status 200)

```
URL: https://clerk.suno.com/v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
Method: GET
Status: 200 OK
```

### Request Headers
```
:authority: clerk.suno.com
:method: GET
:path: /v1/client?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
:scheme: https
accept: */*
accept-encoding: gzip, deflate, br, zstd
accept-language: en
sec-ch-ua: "Chromium";v="131", "Not_A Brand";v="24"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "macOS"
sec-fetch-dest: empty
sec-fetch-mode: cors
sec-fetch-site: same-site
user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
```

### Cookie Header (PROBLEM: No __client!)
```
cookie: __session=eyJ...; _axwrt=...; __client_uat_U9tcbTPE=0; __client_uat_Jnxw-muT=1766669345; __client_Jnxw-muT=eyJ...; __client_uat=0; ...
```

**Note:** Has `__client_Jnxw-muT` (session variant) but NO plain `__client`!

### Response Headers (Creates NEW client)
```
set-cookie: __client=eyJ...; Path=/; Domain=clerk.suno.com; Max-Age=315360000; HttpOnly; Secure; SameSite=Lax
set-cookie: __client_uat=0; Path=/; Domain=suno.com; Max-Age=315360000; Secure; SameSite=Lax
set-cookie: __client_uat_U9tcbTPE=0; Path=/; Domain=suno.com; Max-Age=315360000; Secure; SameSite=Lax
```

**This is wrong!** Server created a NEW unauthenticated client because it didn't see the `__client` cookie.

---

## Request 2: GET clerk.suno.com/v1/environment (Status 200)

```
URL: https://clerk.suno.com/v1/environment?__clerk_api_version=2025-11-10&_clerk_js_version=5.117.0
Method: GET
Status: 200 OK
```

Same cookie issue as above.

---

## Request 3: GET scdn.clerk.com/v1/projects/.../settings (Status 200)

```
URL: https://scdn.clerk.com/v1/projects/GHC5j9EImlsFgFvR5x9jlj4XissduHpH/settings
Method: GET
Status: 200 OK
```

This is just loading Clerk project settings, no auth cookies involved.

---

## Domain Mapping

| Site | Clerk API Domain | Cookie Domain for __client |
|------|------------------|---------------------------|
| suno.com | auth.suno.com | auth.suno.com |
| accounts.suno.com | clerk.suno.com | clerk.suno.com |

## Fix Required

The `__client` cookie must be set on BOTH:
1. `auth.suno.com` - for when browser is on suno.com
2. `clerk.suno.com` - for when browser is on accounts.suno.com

## Cookie Comparison

### Real Browser (working)
Sends to `auth.suno.com`:
- `__client=eyJ...` ✓
- `__client_uat=1766669345` ✓

### Playwright Browser (broken)
Sends to `clerk.suno.com`:
- `__client` ✗ MISSING!
- `__client_Jnxw-muT=eyJ...` ✓ (but this is session-specific)
- `__client_uat=0` ✓
