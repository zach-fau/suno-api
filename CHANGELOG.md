# Changelog

All notable changes to this project will be documented in this file.

This fork is maintained separately from the [original gcui-art/suno-api](https://github.com/gcui-art/suno-api) which appears unmaintained since February 2024.

## [Unreleased]

### Fixed

#### Authentication Migration (December 2024)
Suno migrated their Clerk authentication from `clerk.suno.com` to `auth.suno.com`. This broke all existing suno-api installations.

**API Authentication:**
- Migrated `CLERK_BASE_URL` from `clerk.suno.com` to `auth.suno.com`
- Updated `CLERK_VERSION` from `5.15.0` to `5.117.0`
- Added `__clerk_api_version=2025-11-10` parameter to auth requests

**Browser Authentication (CAPTCHA solving):**
The browser session was redirecting to `accounts.suno.com/sign-in` because Clerk middleware rejected our authentication. Two issues were fixed:

1. **Wrong `__client_uat` value**: Cookie parsing was getting `__client_uat=0` but the real timestamp was stored in session-variant cookies like `__client_uat_Jnxw-muT`. Now extracts the real timestamp from session-variant cookies.

2. **Wrong token type for `__session`**: We were injecting `__session` with the API bearer token (which has `aud:"suno-api"`), but Clerk's browser middleware expects a different token created by Clerk JS. Now we don't inject `__session` at all—instead we navigate to the homepage first and let Clerk JS create the proper session.

**Cookie Domain Changes:**
- `__client` cookie now set on BOTH `auth.suno.com` (SameSite=None) AND `clerk.suno.com` (SameSite=Lax)
- `__client_uat` set to `"0"` on `auth.suno.com` and the real timestamp on `.suno.com`
- Proper `Secure` and `HttpOnly` flags for sensitive cookies

#### Docker Build Fix
- Added `COPY --from=builder /src/public ./public` to Dockerfile (CAPTCHA instruction images were missing)
- Removed unnecessary volume mount from docker-compose.yml

### Changed
- Default model updated from `chirp-v3-5` to `chirp-crow` (Suno v5 - latest)
- Added auto-open DevTools when running in non-headless mode for debugging
- Expanded `.env.example` with all configurable timeout variables

### Added
- TypeScript interfaces for `ClipInfo`, `ClipMetadata`, `BoundingBox`, etc.
- Input validation helper functions (`validateRequiredString`, `validateNumber`, etc.)
- Error handling utility (`toError()`) for consistent error objects
- Security sanitization (`sanitize()`) to redact sensitive data from logs
- Centralized `TIMEOUTS` configuration constant with environment variable overrides
- Refactored CAPTCHA solving into separate methods for better maintainability

---

## Original Project History

The original project by [gcui-art](https://github.com/gcui-art/suno-api) was last updated in February 2024. This fork was created to maintain compatibility with Suno's evolving API and authentication system.
