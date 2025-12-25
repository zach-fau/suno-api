# RESOLVED: Browser Authentication for CAPTCHA Solving

**Status: FIXED** (Dec 25, 2025)

## Problem Summary

The Suno API uses Clerk (auth.suno.com) for authentication. When launching a Playwright browser to solve CAPTCHAs, the browser session wasn't properly authenticated - it would redirect to accounts.suno.com/sign-in even though API calls worked fine.

## Root Cause

**Two separate issues were causing the redirect:**

### Issue 1: Wrong `__client_uat` Value

The `__client_uat` cookie on `.suno.com` was being set to `0` (unauthenticated) instead of the actual timestamp.

**Discovery**: The Clerk middleware response header revealed the problem:
```
x-clerk-auth-reason: session-token-and-uat-missing
x-clerk-auth-status: signed-out
```

**Why it happened**: Cookie parsing got `__client_uat=0` but the REAL timestamp was in session-variant cookies like `__client_uat_Jnxw-muT=1766669345`.

### Issue 2: Wrong Token Type for `__session`

We were injecting `__session` cookie with the API bearer token (`currentToken`), but this token has `"aud": "suno-api"` - it's meant for API calls, not browser sessions.

**Discovery**: The same JWT worked for API calls with `Authorization: Bearer {token}` but was rejected by Clerk middleware when used as `__session` cookie.

**Why it happened**: Clerk expects browser `__session` tokens to be created by Clerk JS itself, with different JWT claims than API tokens.

## The Solution

### Fix 1: Extract Real `__client_uat` Timestamp

```typescript
// Find the REAL timestamp from session-variant __client_uat_* cookie
let clientUatTimestamp = this.cookies.__client_uat || '0';
for (const key in this.cookies) {
  if (key.startsWith('__client_uat_') && this.cookies[key] && this.cookies[key] !== '0') {
    clientUatTimestamp = this.cookies[key]!;
    logger.debug(`Found session-variant UAT: ${key}=${clientUatTimestamp}`);
    break;
  }
}
```

### Fix 2: Don't Inject `__session` - Let Clerk JS Create It

Instead of setting `__session` ourselves, we let Clerk JS create it properly:

```typescript
// DO NOT set __session cookie ourselves!
// The currentToken JWT has aud:"suno-api" which is for API calls only.
// Clerk middleware expects a browser session token with different claims.
// Let Clerk JS create __session by navigating to homepage first.
```

### Fix 3: Two-Step Navigation

Navigate to homepage first to let Clerk JS establish the session:

```typescript
// STEP 1: Navigate to homepage first to let Clerk JS establish session
logger.info('Step 1: Navigating to suno.com homepage to establish Clerk session...');
await page.goto('https://suno.com', { ... });

// Wait for Clerk JS to authenticate
await page.waitForResponse(
  response => response.url().includes('auth.suno.com/v1/client') && response.status() === 200,
  { timeout: 10000 }
);
// Give Clerk JS time to process and set cookies
await sleep(2);

// STEP 2: Now navigate to the protected page
logger.info('Step 2: Navigating to suno.com/create...');
await page.goto('https://suno.com/create', { ... });
```

## Cookie Architecture (Clerk + Suno)

### Cookie Domains

| Cookie | Domain | Purpose |
|--------|--------|---------|
| `__client` | `auth.suno.com` | Refresh token for Clerk API (HttpOnly, SameSite=None) |
| `__client` | `clerk.suno.com` | Same, for accounts.suno.com (HttpOnly, SameSite=Lax) |
| `__client_uat` | `auth.suno.com` | Always `0` on this domain |
| `__client_uat` | `.suno.com` | User Active Timestamp (actual value like `1766669345`) |
| `__session` | `.suno.com` | Browser session JWT (created by Clerk JS, NOT by us) |
| `__client_Jnxw-muT` | varies | Session-variant of `__client` |
| `__client_uat_Jnxw-muT` | `.suno.com` | Session-variant with real timestamp |

### Domain Mapping

| Site | Clerk API Domain |
|------|------------------|
| suno.com | auth.suno.com |
| accounts.suno.com | clerk.suno.com |

### Token Types

| Token | Audience (`aud`) | Used For |
|-------|------------------|----------|
| API Token (`currentToken`) | `suno-api` | API calls with `Authorization: Bearer` header |
| Browser Session (`__session`) | Different | Browser page access, created by Clerk JS |

## Authentication Flow

### API Flow (Works)
```
1. Parse SUNO_COOKIE containing __client
2. Call auth.suno.com/v1/client with Authorization: {__client}
3. Get session_id
4. Call auth.suno.com/v1/client/sessions/{sid}/tokens
5. Get JWT with aud:"suno-api"
6. Use JWT as Bearer token for API calls
```

### Browser Flow (Fixed)
```
1. Set cookies on browser context:
   - __client on auth.suno.com (for Clerk JS to use)
   - __client_uat on .suno.com (with REAL timestamp from session-variant)
   - Other tracking cookies on .suno.com
   - DO NOT set __session (let Clerk JS create it)

2. Navigate to suno.com (homepage, not protected)

3. Clerk JS loads and:
   - Sees __client cookie
   - Calls auth.suno.com/v1/client
   - Validates session
   - Creates proper __session cookie on .suno.com

4. Navigate to suno.com/create (protected page)
   - Now has valid __session from Clerk JS
   - Clerk middleware accepts it
   - Page loads without redirect!
```

## Key Learnings

### 1. Clerk Has Two Token Types
- **API tokens**: `aud:"suno-api"`, used with `Authorization: Bearer` header
- **Browser session tokens**: Different `aud`, created by Clerk JS, used as `__session` cookie

### 2. Session-Variant Cookies
Clerk uses session-specific cookie variants like `__client_uat_Jnxw-muT`. The plain `__client_uat` might be `0` while the variant has the real timestamp.

### 3. `x-clerk-auth-reason` Header
When Clerk redirects, it tells you WHY in the response headers:
- `x-clerk-auth-reason: session-token-and-uat-missing`
- `x-clerk-auth-status: signed-out`

This is invaluable for debugging!

### 4. Let Clerk JS Do Its Job
Don't try to fake browser sessions. Instead:
1. Set the `__client` cookie (refresh token)
2. Let Clerk JS validate it and create proper `__session`
3. This ensures all JWT claims are correct

## Files Modified

- `src/lib/SunoApi.ts`:
  - `launchBrowser()`: Fixed cookie setup, removed `__session` injection
  - `getCaptcha()`: Added two-step navigation (homepage → protected page)

## Testing

```bash
# Run with visible browser and debug logs
BROWSER_HEADLESS=false LOG_LEVEL=debug npm run dev

# Trigger CAPTCHA scenario and verify:
# 1. Homepage loads first
# 2. "Clerk authentication response received" in logs
# 3. Navigate to /create WITHOUT redirect to accounts.suno.com
```

## Environment Variables

- `BROWSER_HEADLESS=false` - Show browser window
- `BROWSER_DISABLE_GPU=true` - For Docker/headless environments
- `LOG_LEVEL=debug` - Enable debug logging for cookie info
