# Suno API Changes Summary

## Session Date
November 2, 2025

## Overview
This document tracks all changes made to the Suno API wrapper to fix CAPTCHA automation, update UI selectors, and configure the latest Suno v5 model.

---

## 1. Browser Configuration Updates

### File: `/home/gyatso/Development/suno-api/.env`

**Changes:**
- Set `BROWSER_HEADLESS=false` for visual debugging of CAPTCHA flow

**Reason:** Enable visual inspection of browser automation to debug selector issues and CAPTCHA flow.

---

## 2. Suno UI Selector Updates

### File: `/home/gyatso/Development/suno-api/src/lib/SunoApi.ts`

#### Change 1: Updated Textarea Selector (Lines ~349-352)
**Before:**
```typescript
const textarea = page.locator('.custom-textarea');
await textarea.click();
await textarea.pressSequentially('Lorem ipsum');
```

**After:**
```typescript
// Updated selector - Suno UI changed, no longer uses .custom-textarea class
const textarea = page.locator('textarea[placeholder*="Hip-hop"]');
await textarea.waitFor({ state: 'visible', timeout: 10000 });
await textarea.focus();
await textarea.fill('Lorem ipsum');
```

**Reason:** Suno changed their UI - the textarea no longer has the `.custom-textarea` class. Updated to use placeholder attribute selector and changed interaction method from `click()` + `pressSequentially()` to `focus()` + `fill()` for more reliable input.

---

#### Change 2: Updated Button Selector (Lines ~354-355)
**Before:**
```typescript
const button = page.locator('button[aria-label="Create"]');
```

**After:**
```typescript
const button = page.locator('button[aria-label="Create song"]');
```

**Reason:** Suno changed the button's `aria-label` from "Create" to "Create song".

---

#### Change 3: Fixed hCaptcha Wait Logic (Lines ~363-366)
**Before:**
```typescript
if (wait) {
  await waitForRequests(page, controller.signal);
}
```

**After:**
```typescript
if (wait) {
  // Wait for hCaptcha images to load (iframe requests aren't caught by page listeners)
  await sleep(3);
}
```

**Reason:** `waitForRequests()` was listening for network requests on the main page, but hCaptcha images load in an iframe. Switched to simple 3-second sleep to allow iframe images to load.

---

## 3. Race Condition Fix - Route Interception

### File: `/home/gyatso/Development/suno-api/src/lib/SunoApi.ts`

#### Change: Moved Route Interception Setup (Lines ~329-356)
**Before:**
```typescript
// Button was clicked FIRST
const button = page.locator('button[aria-label="Create song"]');
await button.click();

// Route interception set up AFTER (too late!)
return (new Promise((resolve, reject) => {
  page.route('**/api/generate/v2/**', async (route: any) => {
    // ...
  });
}));
```

**After:**
```typescript
// Set up route interception BEFORE clicking the Create button
const controller = new AbortController();
const tokenPromise = new Promise<string|null>((resolve, reject) => {
  page.route('**/api/generate/v2/**', async (route: any) => {
    try {
      logger.info('hCaptcha token received. Closing browser');
      route.abort();
      browser.browser()?.close();
      controller.abort();
      const request = route.request();
      this.currentToken = request.headers().authorization.split('Bearer ').pop();
      resolve(request.postDataJSON().token);
    } catch(err) {
      reject(err);
    }
  });
});

// NOW click the button (after interception is ready)
const textarea = page.locator('textarea[placeholder*="Hip-hop"]');
await textarea.focus();
await textarea.fill('Lorem ipsum');

const button = page.locator('button[aria-label="Create song"]');
await button.click();

// ... CAPTCHA solving code ...

return tokenPromise;
```

**Reason:** Race condition - the route interception was being set up AFTER the button was clicked, causing the actual API request to go through and create a "Lorem ipsum" song instead of intercepting the token. Fixed by setting up the route handler BEFORE clicking the button.

---

## 4. Model Version Update

### File: `/home/gyatso/Development/suno-api/src/lib/SunoApi.ts` (Line 21)

**Before:**
```typescript
export const DEFAULT_MODEL = 'chirp-v3-5';
```

**After:**
```typescript
export const DEFAULT_MODEL = 'chirp-crow'; // v5 (newest)
```

**Reason:** Updated to use Suno's latest v5 model (`chirp-crow`) as the default instead of v3.5.

---

## 5. Testing Mode Configuration

### File: `/home/gyatso/Development/suno-api/src/lib/SunoApi.ts` (Lines ~307-446)

**Added temporary testing mode:**
```typescript
public async getCaptcha(): Promise<string|null> {
  // TEMPORARILY DISABLED FOR TESTING - Just open browser and wait
  logger.info('TESTING MODE: Launching browser...')
  const browser = await this.launchBrowser();
  const page = await browser.newPage();
  await page.goto('https://suno.com/create', { referer: 'https://www.google.com/', waitUntil: 'domcontentloaded', timeout: 0 });

  logger.info('Waiting for Suno interface to load');
  await page.waitForResponse('**/api/project/**\\?**', { timeout: 60000 });

  logger.info('Page loaded! Browser will stay open for 5 minutes for inspection...');
  await sleep(300); // Wait 5 minutes

  logger.info('Closing browser after timeout');
  await browser.browser()?.close();
  return null;

  /* ORIGINAL CODE COMMENTED OUT FOR TESTING
  ... (full CAPTCHA automation code commented)
  */
}
```

**Reason:** Added testing mode to inspect the Suno UI without triggering CAPTCHA or making API calls. This allowed us to verify selectors and page load behavior. **NOTE:** This should be reverted to production code before deployment.

---

## Model Names Reference

Based on network inspection of Suno's web interface:

| Version | Model Name | Notes |
|---------|-----------|-------|
| v3.0 | `chirp-v3-0` | Broad, versatile, max 2 minutes |
| v3.5 | `chirp-v3-5` | Better song structure, max 4 minutes |
| v4 | `chirp-v4` | Best audio quality, up to 4 minutes |
| v4.5 | `chirp-v4-5` or `chirp-auk` | Superior genre blending, up to 8 minutes |
| v4.5+ | `chirp-bluejay` | Richer sound, max 8 min |
| v5 (Latest) | `chirp-crow` | **Current default** - Best quality |

---

## Files Modified

1. `/home/gyatso/Development/suno-api/.env`
   - Set `BROWSER_HEADLESS=false`

2. `/home/gyatso/Development/suno-api/src/lib/SunoApi.ts`
   - Updated DEFAULT_MODEL to `chirp-crow`
   - Fixed textarea selector
   - Fixed button selector
   - Fixed hCaptcha wait logic
   - Fixed route interception race condition
   - Added temporary testing mode

---

## Known Issues & Next Steps

### Before Production Deployment:
1. **REVERT TESTING MODE** - The `getCaptcha()` function is currently in testing mode and needs to be restored to the original CAPTCHA automation code
2. **Test CAPTCHA Flow** - Once testing mode is reverted, test that the 2Captcha integration works end-to-end with the fixed selectors
3. **Re-enable Headless Mode** - Set `BROWSER_HEADLESS=true` in `.env` for production

### Additional Improvements Needed:
- Document the custom lyrics API endpoint (user asked about this)
- Test different model versions (`chirp-v4`, `chirp-bluejay`, etc.)
- Verify rate limiting behavior with new selectors

---

## Testing Performed

1. ✅ Browser opens successfully with non-headless mode
2. ✅ Page navigates to suno.com/create correctly
3. ✅ Session cookies are properly set
4. ✅ Page loads fully (song list API call completes)
5. ✅ Textarea selector works with current Suno UI
6. ✅ Button selector works with current Suno UI
7. ✅ Model name `chirp-crow` verified from network traffic
8. ⏳ Full CAPTCHA flow not yet tested (testing mode active)

---

## API Usage

To specify a custom model when making requests:

```bash
curl -X POST "http://localhost:3000/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "short happy birthday song",
    "make_instrumental": false,
    "model": "chirp-crow",
    "wait_audio": false
  }'
```

Available in the API routes:
- `/api/generate` - Accepts `model` parameter
- `/api/custom_generate` - Accepts `model` parameter
- `/api/extend_audio` - Accepts `model` parameter
