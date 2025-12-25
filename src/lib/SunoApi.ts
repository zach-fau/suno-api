import axios, { AxiosInstance } from 'axios';
import UserAgent from 'user-agents';
import pino from 'pino';
import yn from 'yn';
import { isPage, sleep, waitForRequests } from '@/lib/utils';
import * as cookie from 'cookie';
import { randomUUID } from 'node:crypto';
import { Solver } from '@2captcha/captcha-solver';
import { paramsCoordinates } from '@2captcha/captcha-solver/dist/structs/2captcha';
import { BrowserContext, Page, Locator, chromium, firefox } from 'rebrowser-playwright-core';
import { createCursor, Cursor } from 'ghost-cursor-playwright';
import { promises as fs } from 'fs';
import path from 'node:path';

// sunoApi instance caching
const globalForSunoApi = global as unknown as { sunoApiCache?: Map<string, SunoApi> };
const cache = globalForSunoApi.sunoApiCache || new Map<string, SunoApi>();
globalForSunoApi.sunoApiCache = cache;

const logger = pino();
export const DEFAULT_MODEL = 'chirp-crow'; // v5 (newest)

/**
 * Utility function to ensure error objects are proper Error instances
 * @param error - Unknown error value that may not be an Error object
 * @returns A proper Error instance
 */
function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('Unknown error occurred');
}

/**
 * Validates that a parameter is a non-empty string
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @throws Error if validation fails
 */
function validateRequiredString(value: unknown, paramName: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid parameter '${paramName}': expected string, got ${typeof value}`);
  }
  if (value.trim().length === 0) {
    throw new Error(`Invalid parameter '${paramName}': must not be empty`);
  }
}

/**
 * Validates that a parameter is a string or null
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @throws Error if validation fails
 */
function validateOptionalString(value: unknown, paramName: string): asserts value is string | null | undefined {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    throw new Error(`Invalid parameter '${paramName}': expected string, null, or undefined, got ${typeof value}`);
  }
}

/**
 * Validates that a parameter is a number
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @throws Error if validation fails
 */
function validateNumber(value: unknown, paramName: string): asserts value is number {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`Invalid parameter '${paramName}': expected number, got ${typeof value}`);
  }
}

/**
 * Validates that a parameter is a number or null/undefined
 * @param value - The value to validate
 * @param paramName - Name of the parameter for error messages
 * @throws Error if validation fails
 */
function validateOptionalNumber(value: unknown, paramName: string): asserts value is number | null | undefined {
  if (value !== null && value !== undefined) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid parameter '${paramName}': expected number, null, or undefined, got ${typeof value}`);
    }
  }
}

/**
 * Sanitize sensitive data from log messages and objects
 * Redacts cookies, tokens, authorization headers, and other sensitive data
 * @param data - The data to sanitize (string or object)
 * @returns Sanitized data with sensitive information redacted
 */
function sanitize(data: any): any {
  if (!data) return data;

  // Handle string data
  if (typeof data === 'string') {
    // Redact what looks like tokens or cookies (long alphanumeric strings)
    return data.replace(/([a-zA-Z0-9_-]{20,})/g, (match) => {
      // Show only first 8 characters for debugging
      return `${match.substring(0, 8)}...`;
    });
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      const lowerKey = key.toLowerCase();

      // Redact known sensitive fields
      if (lowerKey.includes('cookie') ||
          lowerKey.includes('token') ||
          lowerKey.includes('authorization') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('key') ||
          lowerKey.includes('secret')) {

        const value = String(data[key]);
        // Show prefix for debugging
        sanitized[key] = value.length > 8 ? `${value.substring(0, 8)}...[REDACTED]` : '[REDACTED]';
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitize(data[key]);
      }
    }

    return sanitized;
  }

  return data;
}

/**
 * Validate required environment variables at startup
 * @throws Error if required environment variables are missing or invalid
 */
function validateEnvironment(): void {
  const requiredVars = {
    SUNO_COOKIE: process.env.SUNO_COOKIE,
    TWOCAPTCHA_KEY: process.env.TWOCAPTCHA_KEY
  };

  const missing: string[] = [];
  const invalid: string[] = [];

  for (const [name, value] of Object.entries(requiredVars)) {
    if (!value) {
      missing.push(name);
    } else if (typeof value !== 'string' || value.trim().length === 0) {
      invalid.push(name);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please set these variables in your .env file or environment.`
    );
  }

  if (invalid.length > 0) {
    throw new Error(
      `Invalid environment variables (empty or whitespace): ${invalid.join(', ')}`
    );
  }

  logger.info('Environment validation passed', {
    variables: Object.keys(requiredVars)
  });
}

/**
 * Metadata associated with an audio clip
 */
export interface ClipMetadata {
  gpt_description_prompt?: string;
  prompt?: string;
  type?: string;
  tags?: string;
  negative_tags?: string;
  duration?: string;
  error_message?: string;
  stem_from_id?: string;
  concat_history?: Array<{
    clip_id: string;
    continue_at: number;
  }>;
  history?: Array<{
    id: string;
    continue_at?: number;
    type: string;
    source?: string;
  }>;
}

/**
 * Represents a complete audio clip with all its associated information
 */
export interface ClipInfo {
  id: string;
  title?: string;
  image_url?: string;
  image_large_url?: string;
  is_video_pending: boolean;
  major_model_version: string;
  model_name: string;
  metadata: ClipMetadata;
  is_liked: boolean;
  user_id: string;
  display_name?: string;
  handle?: string;
  is_handle_updated: boolean;
  avatar_image_url?: string;
  is_trashed: boolean;
  created_at: string;
  status: 'submitted' | 'queued' | 'streaming' | 'complete' | 'error';
  audio_url?: string;
  video_url?: string;
  play_count?: number;
  upvote_count?: number;
  is_public: boolean;
}

/**
 * Simplified audio information returned by API endpoints
 */
export interface AudioInfo {
  id: string; // Unique identifier for the audio
  title?: string; // Title of the audio
  image_url?: string; // URL of the image associated with the audio
  lyric?: string; // Lyrics of the audio
  audio_url?: string; // URL of the audio file
  video_url?: string; // URL of the video associated with the audio
  created_at: string; // Date and time when the audio was created
  model_name: string; // Name of the model used for audio generation
  gpt_description_prompt?: string; // Prompt for GPT description
  prompt?: string; // Prompt for audio generation
  status: string; // Status
  type?: string;
  tags?: string; // Genre of music.
  negative_tags?: string; // Negative tags of music.
  duration?: string; // Duration of the audio
  error_message?: string; // Error message if any
  stem_from_id?: string; // Parent clip ID if this is a stem
}

/**
 * Response structure for persona-related API calls
 */
interface PersonaResponse {
  persona: {
    id: string;
    name: string;
    description: string;
    image_s3_id: string;
    root_clip_id: string;
    clip: ClipInfo; // Full clip information
    user_display_name: string;
    user_handle: string;
    user_image_url: string;
    persona_clips: Array<{
      clip: ClipInfo; // Full clip information
    }>;
    is_suno_persona: boolean;
    is_trashed: boolean;
    is_owned: boolean;
    is_public: boolean;
    is_public_approved: boolean;
    is_loved: boolean;
    upvote_count: number;
    clip_count: number;
  };
  total_results: number;
  current_page: number;
  is_following: boolean;
}

/**
 * Coordinate data returned from 2Captcha solver
 */
interface CaptchaCoordinate {
  x: number;
  y: number;
}

/**
 * Solution data from 2Captcha
 */
interface CaptchaSolution {
  id: string;
  data: CaptchaCoordinate[];
}

/**
 * Bounding box coordinates for UI elements
 */
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Payload for song generation API request
 */
interface GenerateSongsPayload {
  make_instrumental?: boolean;
  mv: string; // Model version
  prompt: string;
  generation_type: 'TEXT' | 'EXTEND';
  continue_at?: number;
  continue_clip_id?: string;
  task?: string;
  token: string | null;
  tags?: string;
  title?: string;
  negative_tags?: string;
  gpt_description_prompt?: string;
}

/**
 * API response for clips
 */
interface ClipsResponse {
  clips: ClipInfo[];
}

/**
 * Transcribed word with timing information
 */
interface TranscribedWord {
  word: string;
  start_s: number;
  end_s: number;
  success: boolean;
  p_align: number;
}

class SunoApi {
  private static BASE_URL: string = 'https://studio-api.prod.suno.com';
  private static CLERK_BASE_URL: string = 'https://auth.suno.com';
  private static CLERK_VERSION = '5.117.0';
  private static CLERK_API_VERSION = '2025-11-10';

  /**
   * Centralized timeout configuration (in milliseconds unless otherwise specified)
   * All values can be overridden via environment variables
   */
  private static readonly TIMEOUTS = {
    // Browser navigation timeouts
    /** Timeout for page navigation (0 = unlimited) */
    PAGE_NAVIGATION: Number(process.env.TIMEOUT_PAGE_NAVIGATION) || 0,
    /** Timeout for waiting for API response after page load */
    PAGE_API_RESPONSE: Number(process.env.TIMEOUT_PAGE_API_RESPONSE) || 30000,

    // UI element interaction timeouts
    /** Timeout for popup close button clicks */
    POPUP_CLOSE: Number(process.env.TIMEOUT_POPUP_CLOSE) || 2000,
    /** Timeout for textarea visibility */
    TEXTAREA_WAIT: Number(process.env.TIMEOUT_TEXTAREA_WAIT) || 3000,
    /** Timeout for Create button visibility */
    CREATE_BUTTON_WAIT: Number(process.env.TIMEOUT_CREATE_BUTTON_WAIT) || 5000,

    // CAPTCHA solving timeouts
    /** Timeout for CAPTCHA challenge screenshot */
    CAPTCHA_SCREENSHOT: Number(process.env.TIMEOUT_CAPTCHA_SCREENSHOT) || 5000,
    /** Delay for hCaptcha images to load (seconds, not milliseconds) */
    CAPTCHA_IMAGE_LOAD_DELAY: Number(process.env.TIMEOUT_CAPTCHA_IMAGE_LOAD) || 3,
    /** Delay for CAPTCHA piece to unlock during drag operation (seconds) */
    CAPTCHA_PIECE_UNLOCK_DELAY: Number(process.env.TIMEOUT_CAPTCHA_PIECE_UNLOCK) || 1.1,

    // API request timeouts
    /** Timeout for HTTP requests to concatenate endpoint */
    API_CONCATENATE: Number(process.env.TIMEOUT_API_CONCATENATE) || 10000,
    /** Timeout for HTTP requests to generate endpoint */
    API_GENERATE: Number(process.env.TIMEOUT_API_GENERATE) || 10000,
    /** Timeout for HTTP requests to feed endpoint */
    API_FEED: Number(process.env.TIMEOUT_API_FEED) || 10000,
    /** Timeout for HTTP requests to persona endpoint */
    API_PERSONA: Number(process.env.TIMEOUT_API_PERSONA) || 10000,

    // Polling and delay configurations (sleep delays in seconds)
    /** Min delay range for keepAlive sleep (seconds) */
    KEEP_ALIVE_SLEEP_MIN: Number(process.env.TIMEOUT_KEEP_ALIVE_MIN) || 1,
    /** Max delay range for keepAlive sleep (seconds) */
    KEEP_ALIVE_SLEEP_MAX: Number(process.env.TIMEOUT_KEEP_ALIVE_MAX) || 2,
    /** Delay between lyrics generation polls (seconds) */
    LYRICS_POLL_DELAY: Number(process.env.TIMEOUT_LYRICS_POLL) || 2,
    /** Min delay range for audio generation polling (seconds) */
    AUDIO_POLL_DELAY_MIN: Number(process.env.TIMEOUT_AUDIO_POLL_MIN) || 3,
    /** Max delay range for audio generation polling (seconds) */
    AUDIO_POLL_DELAY_MAX: Number(process.env.TIMEOUT_AUDIO_POLL_MAX) || 6,
    /** Initial delay before starting audio polling (seconds) */
    AUDIO_POLL_INITIAL_DELAY: Number(process.env.TIMEOUT_AUDIO_POLL_INITIAL) || 5,

    // Overall operation timeouts
    /** Maximum time to wait for audio generation completion */
    AUDIO_GENERATION_MAX: Number(process.env.TIMEOUT_AUDIO_GENERATION_MAX) || 100000,
  } as const;

  private readonly client: AxiosInstance;
  private sid?: string;
  private currentToken?: string;
  private deviceId?: string;
  private userAgent?: string;
  private cookies: Record<string, string | undefined>;
  private solver = new Solver(`${process.env.TWOCAPTCHA_KEY}`);
  private ghostCursorEnabled = yn(process.env.BROWSER_GHOST_CURSOR, { default: false });
  private cursor?: Cursor;

  constructor(cookies: string) {
    // Validate required environment variables at startup
    validateEnvironment();

    this.userAgent = new UserAgent(/Macintosh/).random().toString(); // Usually Mac systems get less amount of CAPTCHAs
    this.cookies = cookie.parse(cookies);
    this.deviceId = this.cookies.ajs_anonymous_id || randomUUID();
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Affiliate-Id': 'undefined',
        'Device-Id': `"${this.deviceId}"`,
        'x-suno-client': 'Android prerelease-4nt180t 1.0.42',
        'X-Requested-With': 'com.suno.android',
        'sec-ch-ua': '"Chromium";v="130", "Android WebView";v="130", "Not?A_Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'User-Agent': this.userAgent
      }
    });
    this.client.interceptors.request.use(config => {
      if (this.currentToken && !config.headers.Authorization)
        config.headers.Authorization = `Bearer ${this.currentToken}`;
      const cookiesArray = Object.entries(this.cookies).map(([key, value]) =>
        cookie.serialize(key, value as string)
      );
      config.headers.Cookie = cookiesArray.join('; ');
      return config;
    });
    this.client.interceptors.response.use(resp => {
      const setCookieHeader = resp.headers['set-cookie'];
      if (Array.isArray(setCookieHeader)) {
        const newCookies = cookie.parse(setCookieHeader.join('; '));
        for (const [key, value] of Object.entries(newCookies)) {
          this.cookies[key] = value;
        }
      }
      return resp;
    })
  }

  /**
   * Initialize the SunoApi instance by obtaining authentication tokens and keeping the session alive.
   * This method must be called before using any other API methods.
   *
   * @returns Promise that resolves to the initialized SunoApi instance
   * @throws Error if authentication fails or session cannot be established
   *
   * @example
   * ```typescript
   * const api = await new SunoApi(cookie).init();
   * ```
   */
  public async init(): Promise<SunoApi> {
    //await this.getClerkLatestVersion();
    await this.getAuthToken();
    await this.keepAlive();
    return this;
  }


  /**
   * Get the session ID and save it for later use.
   */
  private async getAuthToken() {
    logger.info('Getting the session ID from auth.suno.com');
    // URL to get session ID
    const getSessionUrl = `${SunoApi.CLERK_BASE_URL}/v1/client?_is_native=true&_clerk_js_version=${SunoApi.CLERK_VERSION}&__clerk_api_version=${SunoApi.CLERK_API_VERSION}`;
    // Get session ID
    const sessionResponse = await this.client.get(getSessionUrl, {
      headers: { Authorization: this.cookies.__client }
    });
    if (!sessionResponse?.data?.response?.last_active_session_id) {
      throw new Error(
        'Failed to get session id, you may need to update the SUNO_COOKIE'
      );
    }
    // Save session ID for later use
    this.sid = sessionResponse.data.response.last_active_session_id;
  }

  /**
   * Renew the session token to keep the authentication active.
   * This method should be called periodically to prevent session expiration.
   *
   * @param isWait - If true, adds a delay after token renewal before returning. Defaults to false
   * @throws Error if session ID is not set or token renewal fails
   *
   * @example
   * ```typescript
   * await api.keepAlive(true); // Wait after renewal
   * ```
   */
  public async keepAlive(isWait?: boolean): Promise<void> {
    if (!this.sid) {
      throw new Error('Session ID is not set. Cannot renew token.');
    }
    // URL to renew session token
    const renewUrl = `${SunoApi.CLERK_BASE_URL}/v1/client/sessions/${this.sid}/tokens?_is_native=true&_clerk_js_version=${SunoApi.CLERK_VERSION}&__clerk_api_version=${SunoApi.CLERK_API_VERSION}`;
    // Renew session token
    logger.info('KeepAlive...\n');
    const renewResponse = await this.client.post(renewUrl, {}, {
      headers: { Authorization: this.cookies.__client }
    });
    if (isWait) {
      await sleep(SunoApi.TIMEOUTS.KEEP_ALIVE_SLEEP_MIN, SunoApi.TIMEOUTS.KEEP_ALIVE_SLEEP_MAX);
    }
    const newToken = renewResponse.data.jwt;
    // Update Authorization field in request header with the new JWT token
    this.currentToken = newToken;
  }

  /**
   * Get the session token (not to be confused with session ID) and save it for later use.
   */
  private async getSessionToken() {
    const tokenResponse = await this.client.post(
      `${SunoApi.BASE_URL}/api/user/create_session_id/`,
      {
        session_properties: JSON.stringify({ deviceId: this.deviceId }),
        session_type: 1
      }
    );
    return tokenResponse.data.session_id;
  }

  private async captchaRequired(): Promise<boolean> {
    const resp = await this.client.post(`${SunoApi.BASE_URL}/api/c/check`, {
      ctype: 'generation'
    });
    logger.debug('CAPTCHA check response', sanitize(resp.data));
    return resp.data.required;
  }

  /**
   * Clicks on a locator or XY vector. This method is made because of the difference between ghost-cursor-playwright and Playwright methods
   */
  private async click(target: Locator|Page, position?: { x: number, y: number }): Promise<void> {
    if (this.ghostCursorEnabled) {
      let pos: BoundingBox | { x: number; y: number } = isPage(target) ? { x: 0, y: 0 } : await target.boundingBox() as BoundingBox;
      if (position) {
        const basePos = 'width' in pos ? pos : { ...pos, width: 0, height: 0 };
        pos = {
          x: basePos.x + position.x,
          y: basePos.y + position.y,
          width: basePos.width,
          height: basePos.height,
        };
      }
      return this.cursor?.actions.click({
        target: pos
      });
    } else {
      if (isPage(target))
        return target.mouse.click(position?.x ?? 0, position?.y ?? 0);
      else
        return target.click({ force: true, position });
    }
  }

  /**
   * Get the BrowserType from the `BROWSER` environment variable.
   * @returns {BrowserType} chromium, firefox or webkit. Default is chromium
   */
  private getBrowserType() {
    const browser = process.env.BROWSER?.toLowerCase();
    switch (browser) {
      case 'firefox':
        return firefox;
      default:
        return chromium;
    }
  }

  /**
   * Launches a browser with the necessary cookies
   * @returns {BrowserContext}
   */
  private async launchBrowser(): Promise<BrowserContext> {
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-features=site-per-process',
      '--disable-features=IsolateOrigins',
      '--disable-extensions',
      '--disable-infobars'
    ];
    // Check for GPU acceleration, as it is recommended to turn it off for Docker
    if (yn(process.env.BROWSER_DISABLE_GPU, { default: false }))
      args.push('--enable-unsafe-swiftshader',
        '--disable-gpu',
        '--disable-setuid-sandbox');
    // Auto-open DevTools when not headless (for debugging)
    if (!yn(process.env.BROWSER_HEADLESS, { default: true }))
      args.push('--auto-open-devtools-for-tabs');
    const browser = await this.getBrowserType().launch({
      args,
      headless: yn(process.env.BROWSER_HEADLESS, { default: true })
    });
    const context = await browser.newContext({ userAgent: this.userAgent, locale: process.env.BROWSER_LOCALE, viewport: null });
    const cookies: Array<{name: string, value: string, domain: string, path: string, sameSite: 'Lax' | 'Strict' | 'None', secure?: boolean, httpOnly?: boolean}> = [];
    const lax: 'Lax' | 'Strict' | 'None' = 'Lax';
    const none: 'Lax' | 'Strict' | 'None' = 'None';

    // DO NOT set __session cookie ourselves!
    // The currentToken JWT has aud:"suno-api" which is for API calls only.
    // Clerk middleware expects a browser session token with different claims.
    // Let Clerk JS create __session by navigating to homepage first.

    // Set most cookies on .suno.com domain (except special ones we handle separately)
    for (const key in this.cookies) {
      if (key === '__client' || key === '__client_uat') continue;
      cookies.push({
        name: key,
        value: `${this.cookies[key]}`,
        domain: '.suno.com',
        path: '/',
        sameSite: lax
      });
    }

    // __client cookie must be on BOTH auth.suno.com AND clerk.suno.com!
    // - suno.com uses auth.suno.com for Clerk API
    // - accounts.suno.com uses clerk.suno.com for Clerk API
    if (this.cookies.__client) {
      // For auth.suno.com (used by suno.com)
      cookies.push({
        name: '__client',
        value: `${this.cookies.__client}`,
        domain: 'auth.suno.com',
        path: '/',
        sameSite: none,
        secure: true,
        httpOnly: true
      });
      // For clerk.suno.com (used by accounts.suno.com)
      cookies.push({
        name: '__client',
        value: `${this.cookies.__client}`,
        domain: 'clerk.suno.com',
        path: '/',
        sameSite: lax,  // clerk.suno.com uses SameSite=Lax
        secure: true,
        httpOnly: true
      });
    }

    // __client_uat exists on BOTH domains with different values:
    // 1. auth.suno.com with value "0" and SameSite=None
    // 2. .suno.com with actual timestamp and SameSite=Lax
    // CRITICAL: The timestamp is in session-variant cookies like __client_uat_Jnxw-muT
    // The plain __client_uat from cookie parsing is often "0" which means "unauthenticated"!

    // Find the REAL timestamp from session-variant __client_uat_* cookie
    let clientUatTimestamp = this.cookies.__client_uat || '0';
    for (const key in this.cookies) {
      if (key.startsWith('__client_uat_') && this.cookies[key] && this.cookies[key] !== '0') {
        clientUatTimestamp = this.cookies[key]!;
        logger.debug(`Found session-variant UAT: ${key}=${clientUatTimestamp}`);
        break;
      }
    }

    if (clientUatTimestamp && clientUatTimestamp !== '0') {
      // On auth.suno.com with value 0
      cookies.push({
        name: '__client_uat',
        value: '0',
        domain: 'auth.suno.com',
        path: '/',
        sameSite: none,
        secure: true
      });
      // On .suno.com with actual timestamp - THIS IS CRITICAL FOR AUTH!
      cookies.push({
        name: '__client_uat',
        value: clientUatTimestamp,
        domain: '.suno.com',
        path: '/',
        sameSite: lax,
        secure: true
      });
      logger.debug(`Setting __client_uat=${clientUatTimestamp} on .suno.com`);
    } else {
      logger.warn('No valid __client_uat timestamp found! Browser auth will fail.');
    }

    // Log cookies being set for debugging
    logger.debug('Setting browser cookies:', cookies.map(c => ({ name: c.name, domain: c.domain, sameSite: c.sameSite, httpOnly: c.httpOnly })));

    await context.addCookies(cookies);

    return context;
  }

  /**
   * Solves CAPTCHA using 2Captcha service with retry logic
   * @param challenge The challenge container locator
   * @param isDrag Whether this is a drag-type CAPTCHA
   * @returns CAPTCHA solution or null if failed
   */
  private async solveCaptchaWithRetry(challenge: Locator, isDrag: boolean): Promise<CaptchaSolution | null> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        logger.info('Sending the CAPTCHA to 2Captcha');
        const payload: paramsCoordinates = {
          body: (await challenge.screenshot({ timeout: SunoApi.TIMEOUTS.CAPTCHA_SCREENSHOT })).toString('base64'),
          lang: process.env.BROWSER_LOCALE
        };
        if (isDrag) {
          // Provide instructions for drag-type CAPTCHA
          payload.textinstructions = 'CLICK on the shapes at their edge or center as shown above—please be precise!';
          payload.imginstructions = (await fs.readFile(path.join(process.cwd(), 'public', 'drag-instructions.jpg'))).toString('base64');
        }
        return await this.solver.coordinates(payload) as unknown as CaptchaSolution;
      } catch(err) {
        const error = toError(err);
        logger.info(error.message);
        if (attempt < maxRetries - 1) {
          logger.info('Retrying...');
        } else {
          throw error;
        }
      }
    }
    return null;
  }

  /**
   * Validates that drag-type CAPTCHA solution has even number of coordinate points
   * @param solution The CAPTCHA solution to validate
   * @returns true if valid, false if invalid
   */
  private validateDragSolution(solution: CaptchaSolution): boolean {
    if (solution.data.length % 2 !== 0) {
      logger.info('Solution does not have even amount of points required for dragging. Requesting new solution...');
      this.solver.badReport(solution.id);
      return false;
    }
    return true;
  }

  /**
   * Performs drag-type CAPTCHA interaction
   * @param page The page to perform mouse actions on
   * @param challengeBox The bounding box of the challenge container
   * @param solution The CAPTCHA solution with coordinate pairs
   */
  private async performDragInteraction(page: Page, challengeBox: BoundingBox, solution: CaptchaSolution): Promise<void> {
    for (let i = 0; i < solution.data.length; i += 2) {
      const startPoint = solution.data[i];
      const endPoint = solution.data[i + 1];
      logger.info(JSON.stringify(startPoint) + JSON.stringify(endPoint));

      // Move to start position
      await page.mouse.move(challengeBox.x + +startPoint.x, challengeBox.y + +startPoint.y);
      await page.mouse.down();

      // Wait for piece to unlock
      await sleep(SunoApi.TIMEOUTS.CAPTCHA_PIECE_UNLOCK_DELAY);

      // Drag to end position
      await page.mouse.move(challengeBox.x + +endPoint.x, challengeBox.y + +endPoint.y, { steps: 30 });
      await page.mouse.up();
    }
  }

  /**
   * Performs click-type CAPTCHA interaction
   * @param challenge The challenge container locator
   * @param solution The CAPTCHA solution with click coordinates
   */
  private async performClickInteraction(challenge: Locator, solution: CaptchaSolution): Promise<void> {
    for (const coordinate of solution.data) {
      logger.info(coordinate);
      await this.click(challenge, { x: +coordinate.x, y: +coordinate.y });
    }
  }

  /**
   * Submits CAPTCHA solution and handles submission errors
   * @param frame The iframe frame locator
   * @param button The Create button to click if CAPTCHA window closed
   */
  private async submitCaptchaSolution(frame: ReturnType<Page['frameLocator']>, button: Locator): Promise<void> {
    try {
      await this.click(frame.locator('.button-submit'));
    } catch(e) {
      const error = toError(e);
      if (error.message.includes('viewport')) {
        // CAPTCHA window closed due to inactivity, retrigger it
        await this.click(button);
      } else {
        throw error;
      }
    }
  }

  /**
   * Automatically detect and solve CAPTCHA challenges using 2Captcha service.
   * Launches a browser, navigates to Suno, triggers CAPTCHA, and returns the solved token.
   * Supports both click-based and drag-based CAPTCHA types.
   *
   * @returns Promise resolving to hCaptcha token string if CAPTCHA was required and solved, or null if no CAPTCHA needed
   * @throws Error if browser launch fails, CAPTCHA solving fails, or timeout occurs
   *
   * @example
   * ```typescript
   * const token = await api.getCaptcha();
   * if (token) {
   *   console.log('CAPTCHA solved successfully');
   * }
   * ```
   */
  public async getCaptcha(): Promise<string|null> {
    const browser = await this.launchBrowser();
    const page = await browser.newPage();

    // When not headless, wait for DevTools to open so we can capture network requests
    if (!yn(process.env.BROWSER_HEADLESS, { default: true })) {
      logger.info('Waiting 5 seconds for DevTools to open... (switch to Network tab now!)');
      await sleep(5);  // sleep() takes seconds, not ms!
    }

    // STEP 1: Navigate to homepage first to let Clerk JS establish session
    // We don't have __session cookie - Clerk JS needs to create it by validating __client with auth.suno.com
    logger.info('Step 1: Navigating to suno.com homepage to establish Clerk session...');
    await page.goto('https://suno.com', { referer: 'https://www.google.com/', waitUntil: 'domcontentloaded', timeout: SunoApi.TIMEOUTS.PAGE_NAVIGATION });

    // Wait for Clerk JS to authenticate (it calls auth.suno.com/v1/client and sets __session)
    logger.info('Waiting for Clerk JS to establish session...');
    try {
      await page.waitForResponse(
        response => response.url().includes('auth.suno.com/v1/client') && response.status() === 200,
        { timeout: 10000 }
      );
      logger.info('Clerk authentication response received');
      // Give Clerk JS time to process and set cookies
      await sleep(2);
    } catch (e) {
      logger.warn('Clerk auth response timeout - continuing anyway');
    }

    // STEP 2: Now navigate to the protected page
    logger.info('Step 2: Navigating to suno.com/create...');
    await page.goto('https://suno.com/create', { referer: 'https://suno.com/', waitUntil: 'domcontentloaded', timeout: SunoApi.TIMEOUTS.PAGE_NAVIGATION });

    // Wait for the page to be fully loaded (React app needs time to render)
    logger.info('Waiting for page to fully load...');
    try {
      // Wait for the song list API call which indicates the page is ready
      await page.waitForResponse(response =>
        response.url().includes('/api/project/') && response.status() === 200,
        { timeout: SunoApi.TIMEOUTS.PAGE_API_RESPONSE }
      );
      logger.info('Page fully loaded');
    } catch(e) {
      logger.info('API response timeout - page might not be fully loaded, continuing anyway');
    }

    if (this.ghostCursorEnabled)
      this.cursor = await createCursor(page);

    logger.info('Triggering the CAPTCHA');

    // Try multiple methods to close popups
    try {
      logger.info('Attempting to close popup with getByLabel...');
      await page.getByLabel('Close').click({ timeout: SunoApi.TIMEOUTS.POPUP_CLOSE });
      logger.info('Popup closed successfully');
    } catch(e) {
      logger.info('getByLabel failed, trying alternative selectors...');
      try {
        // Try button with aria-label
        await page.locator('button[aria-label="Close"]').click({ timeout: SunoApi.TIMEOUTS.POPUP_CLOSE });
        logger.info('Popup closed with aria-label selector');
      } catch(e2) {
        // Try SVG close icon
        try {
          await page.locator('svg[data-testid="close-icon"]').click({ timeout: SunoApi.TIMEOUTS.POPUP_CLOSE });
          logger.info('Popup closed with SVG selector');
        } catch(e3) {
          logger.info('No popup found or unable to close - continuing anyway');
        }
      }
    }

    // Set up route interception BEFORE clicking the Create button
    const controller = new AbortController();

    // Log all API requests to see what's actually being called
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        logger.info(`API Request: ${request.method()} ${request.url()}`);
      }
    });

    const tokenPromise = new Promise<string|null>((resolve, reject) => {
      // Try multiple patterns to catch the generate request
      const patterns = [
        '**/api/generate/v2/**',
        '**/api/generate/v3/**',
        '**/api/generate/**',
        '**/generate/**'
      ];

      patterns.forEach(pattern => {
        page.route(pattern, async (route) => {
          try {
            logger.info(`Route intercepted! Pattern: ${pattern}, URL: ${route.request().url()}`);
            logger.info('Extracting token from request...');

            const request = route.request();
            const headers = request.headers();
            const postData = request.postDataJSON() as { token?: string; hcaptcha_token?: string } | null;

            logger.debug('Request headers', sanitize(headers));
            logger.debug('Request post data', sanitize(postData));

            // Extract token from post data if it exists
            const token = postData?.token || postData?.hcaptcha_token;

            // Extract auth token from headers
            if (headers.authorization) {
              this.currentToken = headers.authorization.split('Bearer ').pop();
            }

            logger.info(`Captured token: ${token ? 'Yes' : 'No'}`);
            logger.info('Aborting request and closing browser');

            route.abort();
            const browserInstance = browser.browser();
            if (browserInstance) {
              browserInstance.close().catch(closeError => {
                logger.error('Failed to close browser during route interception', { error: toError(closeError) });
              });
            } else {
              logger.warn('Browser instance not available for cleanup during route interception');
            }
            controller.abort();

            resolve(token || null);
          } catch(err) {
            const error = toError(err);
            logger.error(`Route interception error: ${error.message}`);
            reject(error);
          }
        });
      });
    });

    // Find and fill the textarea - try multiple selectors
    logger.info('Looking for song description textarea...');
    let textarea;
    try {
      // Try original selector first
      textarea = page.locator('textarea[placeholder*="Hip-hop"]');
      await textarea.waitFor({ state: 'visible', timeout: SunoApi.TIMEOUTS.TEXTAREA_WAIT });
      logger.info('Found textarea with Hip-hop placeholder');
    } catch(e) {
      logger.info('Hip-hop placeholder not found, trying alternative selectors...');
      // Try finding any visible textarea on the page
      const textareas = page.locator('textarea');
      const count = await textareas.count();
      logger.info(`Found ${count} textareas on page`);

      // Usually the song description textarea is the first or second one
      for (let i = 0; i < count; i++) {
        const ta = textareas.nth(i);
        if (await ta.isVisible()) {
          textarea = ta;
          logger.info(`Using textarea at index ${i}`);
          break;
        }
      }

      if (!textarea) {
        throw new Error('Could not find any visible textarea on the page');
      }
    }

    logger.info('Filling textarea with test prompt...');
    await textarea.focus();
    const testPrompt = process.env.CAPTCHA_TEST_PROMPT || 'Lorem ipsum';
    await textarea.fill(testPrompt);
    logger.info('Textarea filled successfully');

    logger.info('Looking for Create button...');
    const button = page.locator('button[aria-label="Create song"]');
    await button.waitFor({ state: 'visible', timeout: SunoApi.TIMEOUTS.CREATE_BUTTON_WAIT });
    logger.info('Clicking Create button...');
    await button.click();
    logger.info('Create button clicked - waiting for CAPTCHA...');

    // Store the CAPTCHA solving promise to ensure it's properly handled
    const captchaSolvingPromise = new Promise<void>(async (resolve, reject) => {
      const frame = page.frameLocator('iframe[title*="hCaptcha"]');
      const challenge = frame.locator('.challenge-container');
      try {
        let shouldWaitForImages = true;

        // Continuous CAPTCHA solving loop
        while (true) {
          // Wait for CAPTCHA images to load if needed
          if (shouldWaitForImages) {
            await sleep(SunoApi.TIMEOUTS.CAPTCHA_IMAGE_LOAD_DELAY);
          }

          // Determine CAPTCHA type
          const promptText = await challenge.locator('.prompt-text').first().innerText();
          const isDragType = promptText.toLowerCase().includes('drag');

          // Solve CAPTCHA with retry logic
          const solution = await this.solveCaptchaWithRetry(challenge, isDragType);
          if (!solution) {
            throw new Error('Failed to solve CAPTCHA after 3 attempts');
          }

          // Handle drag-type CAPTCHA
          if (isDragType) {
            // Validate solution has even number of points
            if (!this.validateDragSolution(solution)) {
              shouldWaitForImages = false;
              continue; // Request new solution
            }

            // Get challenge bounding box for coordinate calculations
            const challengeBox = await challenge.boundingBox();
            if (!challengeBox) {
              throw new Error('.challenge-container boundingBox is null!');
            }

            // Perform drag interaction
            await this.performDragInteraction(page, challengeBox, solution);
            shouldWaitForImages = true;
          } else {
            // Handle click-type CAPTCHA
            await this.performClickInteraction(challenge, solution);
          }

          // Submit solution
          await this.submitCaptchaSolution(frame, button);
        }
      } catch(e) {
        const error = toError(e);
        // Check for expected termination conditions
        if (error.message.includes('been closed') || error.message === 'AbortError') {
          resolve();
        } else {
          reject(error);
        }
      }
    }).catch(e => {
      const error = toError(e);
      const browserInstance = browser.browser();
      if (browserInstance) {
        browserInstance.close().catch(closeError => {
          logger.error('Failed to close browser after CAPTCHA error', { error: toError(closeError) });
        });
      } else {
        logger.warn('Browser instance not available for cleanup after CAPTCHA error');
      }
      throw error;
    });

    // Wait for either tokenPromise or captchaSolvingPromise to complete
    // This ensures proper coordination between token extraction and CAPTCHA solving
    await Promise.race([tokenPromise, captchaSolvingPromise]);

    return tokenPromise;
  }


  /**
   * Generate music from a text description using AI.
   * Suno's AI will create lyrics, style, and melody based on your prompt.
   *
   * @param prompt - Text description of the desired music (e.g., "upbeat jazz music about coding")
   * @param make_instrumental - If true, generates music without vocals. Defaults to false
   * @param model - Model version to use. Defaults to 'chirp-crow' (v5)
   * @param wait_audio - If true, waits until audio generation is complete before returning. Defaults to false
   * @returns Promise resolving to array of AudioInfo objects (typically 2 variations)
   * @throws Error if prompt is empty, generation fails, or CAPTCHA cannot be solved
   *
   * @example
   * ```typescript
   * // Simple generation
   * const songs = await api.generate('energetic rock anthem');
   *
   * // Instrumental with wait
   * const instrumental = await api.generate(
   *   'calm piano melody',
   *   true,  // instrumental
   *   undefined,  // default model
   *   true   // wait for completion
   * );
   * console.log(instrumental[0].audio_url);
   * ```
   */
  public async generate(
    prompt: string,
    make_instrumental: boolean = false,
    model?: string,
    wait_audio: boolean = false
  ): Promise<AudioInfo[]> {
    validateRequiredString(prompt, 'prompt');
    validateOptionalString(model, 'model');
    await this.keepAlive(false);
    const startTime = Date.now();
    const audios = await this.generateSongs(
      prompt,
      false,
      undefined,
      undefined,
      make_instrumental,
      model,
      wait_audio
    );
    const costTime = Date.now() - startTime;
    logger.info(`Generate Response:\n${JSON.stringify(audios, null, 2)}`);
    logger.info(`Cost time: ${costTime}`);
    return audios;
  }

  /**
   * Concatenate multiple song segments into a complete full-length track.
   * Useful for combining extended audio clips into one continuous song.
   *
   * @param clip_id - ID of the audio clip to concatenate
   * @returns Promise resolving to AudioInfo object with the concatenated audio
   * @throws Error if clip_id is invalid, not found, or API request fails
   *
   * @example
   * ```typescript
   * const fullSong = await api.concatenate('clip-id-123');
   * console.log(fullSong.audio_url);
   * ```
   */
  public async concatenate(clip_id: string): Promise<AudioInfo> {
    validateRequiredString(clip_id, 'clip_id');
    await this.keepAlive(false);
    const payload: { clip_id: string } = { clip_id: clip_id };

    const response = await this.client.post<AudioInfo>(
      `${SunoApi.BASE_URL}/api/generate/concat/v2/`,
      payload,
      {
        timeout: SunoApi.TIMEOUTS.API_CONCATENATE
      }
    );
    if (response.status !== 200) {
      throw new Error(`Error response: ${response.statusText}`);
    }
    return response.data;
  }

  /**
   * Generate music with custom lyrics, style tags, and title.
   * Provides full control over song generation with explicit lyrics and metadata.
   *
   * @param prompt - Custom lyrics or vocal content for the song
   * @param tags - Musical style tags (e.g., "jazz, piano, slow tempo")
   * @param title - Title for the generated song
   * @param make_instrumental - If true, generates instrumental version. Defaults to false
   * @param model - Model version to use. Defaults to 'chirp-crow' (v5)
   * @param wait_audio - If true, waits until generation completes. Defaults to false
   * @param negative_tags - Style elements to avoid (e.g., "electronic, drums")
   * @returns Promise resolving to array of AudioInfo objects (typically 2 variations)
   * @throws Error if required parameters are empty or generation fails
   *
   * @example
   * ```typescript
   * const songs = await api.custom_generate(
   *   '[Verse]\nCoding all night long\n[Chorus]\nBugs are everywhere',
   *   'indie rock, energetic, electric guitar',
   *   'Developer Blues',
   *   false,
   *   undefined,
   *   true,
   *   'slow, acoustic'
   * );
   * ```
   */
  public async custom_generate(
    prompt: string,
    tags: string,
    title: string,
    make_instrumental: boolean = false,
    model?: string,
    wait_audio: boolean = false,
    negative_tags?: string
  ): Promise<AudioInfo[]> {
    validateRequiredString(prompt, 'prompt');
    validateRequiredString(tags, 'tags');
    validateRequiredString(title, 'title');
    validateOptionalString(model, 'model');
    validateOptionalString(negative_tags, 'negative_tags');
    const startTime = Date.now();
    const audios = await this.generateSongs(
      prompt,
      true,
      tags,
      title,
      make_instrumental,
      model,
      wait_audio,
      negative_tags
    );
    const costTime = Date.now() - startTime;
    logger.info(
      `Custom Generate Response:\n${JSON.stringify(audios, null, 2)}`
    );
    logger.info(`Cost time: ${costTime}`);
    return audios;
  }

  /**
   * Generates songs based on the provided parameters.
   *
   * @param prompt The text prompt to generate songs from.
   * @param isCustom Indicates if the generation should consider custom parameters like tags and title.
   * @param tags Optional tags to categorize the song, used only if isCustom is true.
   * @param title Optional title for the song, used only if isCustom is true.
   * @param make_instrumental Indicates if the generated song should be instrumental.
   * @param wait_audio Indicates if the method should wait for the audio file to be fully generated before returning.
   * @param negative_tags Negative tags that should not be included in the generated audio.
   * @param task Optional indication of what to do. Enter 'extend' if extending an audio, otherwise specify null.
   * @param continue_clip_id
   * @returns A promise that resolves to an array of AudioInfo objects representing the generated songs.
   */
  private async generateSongs(
    prompt: string,
    isCustom: boolean,
    tags?: string,
    title?: string,
    make_instrumental?: boolean,
    model?: string,
    wait_audio: boolean = false,
    negative_tags?: string,
    task?: string,
    continue_clip_id?: string,
    continue_at?: number
  ): Promise<AudioInfo[]> {
    // Validate task parameter if provided
    validateOptionalString(task, 'task');
    validateOptionalString(continue_clip_id, 'continue_clip_id');
    validateOptionalNumber(continue_at, 'continue_at');

    // If task is 'extend', validate required parameters
    if (task === 'extend') {
      validateRequiredString(continue_clip_id, 'continue_clip_id (required when task is "extend")');
    }

    await this.keepAlive();
    const payload: Partial<GenerateSongsPayload> = {
      make_instrumental: make_instrumental,
      mv: model || DEFAULT_MODEL,
      prompt: '',
      generation_type: task === 'extend' ? 'EXTEND' : 'TEXT',
      continue_at: continue_at,
      continue_clip_id: continue_clip_id,
      task: task,
      token: await this.getCaptcha()
    };
    if (isCustom) {
      payload.tags = tags;
      payload.title = title;
      payload.negative_tags = negative_tags;
      payload.prompt = prompt;
    } else {
      payload.gpt_description_prompt = prompt;
    }
    logger.info('generateSongs payload', sanitize({
      prompt: prompt,
      isCustom: isCustom,
      tags: tags,
      title: title,
      make_instrumental: make_instrumental,
      wait_audio: wait_audio,
      negative_tags: negative_tags,
      payload: payload
    }));
    const response = await this.client.post<ClipsResponse>(
      `${SunoApi.BASE_URL}/api/generate/v2/`,
      payload,
      {
        timeout: SunoApi.TIMEOUTS.API_GENERATE
      }
    );
    if (response.status !== 200) {
      throw new Error(`Error response: ${response.statusText}`);
    }
    const songIds = response.data.clips.map((audio) => audio.id);
    //Want to wait for music file generation
    if (wait_audio) {
      const startTime = Date.now();
      let lastResponse: AudioInfo[] = [];
      await sleep(SunoApi.TIMEOUTS.AUDIO_POLL_INITIAL_DELAY, SunoApi.TIMEOUTS.AUDIO_POLL_INITIAL_DELAY);
      while (Date.now() - startTime < SunoApi.TIMEOUTS.AUDIO_GENERATION_MAX) {
        const response = await this.get(songIds);
        const allCompleted = response.every(
          (audio) => audio.status === 'streaming' || audio.status === 'complete'
        );
        const allError = response.every((audio) => audio.status === 'error');
        if (allCompleted || allError) {
          return response;
        }
        lastResponse = response;
        await sleep(SunoApi.TIMEOUTS.AUDIO_POLL_DELAY_MIN, SunoApi.TIMEOUTS.AUDIO_POLL_DELAY_MAX);
        await this.keepAlive(true);
      }
      return lastResponse;
    } else {
      return response.data.clips.map((audio): AudioInfo => ({
        id: audio.id,
        title: audio.title,
        image_url: audio.image_url,
        lyric: audio.metadata.prompt,
        audio_url: audio.audio_url,
        video_url: audio.video_url,
        created_at: audio.created_at,
        model_name: audio.model_name,
        status: audio.status,
        gpt_description_prompt: audio.metadata.gpt_description_prompt,
        prompt: audio.metadata.prompt,
        type: audio.metadata.type,
        tags: audio.metadata.tags,
        negative_tags: audio.metadata.negative_tags,
        duration: audio.metadata.duration
      }));
    }
  }

  /**
   * Generate song lyrics from a text prompt using AI.
   * Returns formatted lyrics with verse/chorus structure.
   *
   * @param prompt - Description of desired lyrics theme or topic
   * @returns Promise resolving to generated lyrics as string
   * @throws Error if prompt is empty or lyrics generation fails
   *
   * @example
   * ```typescript
   * const lyrics = await api.generateLyrics('a song about summer vacation');
   * console.log(lyrics);
   * // Output:
   * // [Verse]
   * // Walking on the beach...
   * // [Chorus]
   * // Summer days are here...
   * ```
   */
  public async generateLyrics(prompt: string): Promise<string> {
    validateRequiredString(prompt, 'prompt');
    await this.keepAlive(false);
    // Initiate lyrics generation
    const generateResponse = await this.client.post(
      `${SunoApi.BASE_URL}/api/generate/lyrics/`,
      { prompt }
    );
    const generateId = generateResponse.data.id;

    // Poll for lyrics completion
    let lyricsResponse = await this.client.get(
      `${SunoApi.BASE_URL}/api/generate/lyrics/${generateId}`
    );
    while (lyricsResponse?.data?.status !== 'complete') {
      await sleep(SunoApi.TIMEOUTS.LYRICS_POLL_DELAY);
      lyricsResponse = await this.client.get(
        `${SunoApi.BASE_URL}/api/generate/lyrics/${generateId}`
      );
    }

    // Return the generated lyrics text
    return lyricsResponse.data;
  }

  /**
   * Extend an existing song by adding more content before or after a specific timestamp.
   * Useful for making songs longer or adding new sections.
   *
   * @param audioId - ID of the audio clip to extend
   * @param prompt - Lyrics or description for the new section. Defaults to empty string
   * @param continueAt - Timestamp in seconds where extension should begin (e.g., 30 for 00:30)
   * @param tags - Musical style tags for the extension. Defaults to empty string
   * @param negative_tags - Style elements to avoid. Defaults to empty string
   * @param title - Title for the extended song. Defaults to empty string
   * @param model - Model version to use. Defaults to 'chirp-crow' (v5)
   * @param wait_audio - If true, waits until generation completes. Defaults to false
   * @returns Promise resolving to array of AudioInfo objects with extended audio
   * @throws Error if audioId is invalid or continueAt is not a valid number
   *
   * @example
   * ```typescript
   * // Extend from the end
   * const extended = await api.extendAudio(
   *   'song-id-123',
   *   '[Verse 3]\nNew verse here',
   *   120,  // Continue at 2:00
   *   'rock, energetic'
   * );
   * ```
   */
  public async extendAudio(
    audioId: string,
    prompt: string = '',
    continueAt: number,
    tags: string = '',
    negative_tags: string = '',
    title: string = '',
    model?: string,
    wait_audio?: boolean
  ): Promise<AudioInfo[]> {
    validateRequiredString(audioId, 'audioId');
    validateOptionalString(model, 'model');
    validateNumber(continueAt, 'continueAt');
    return this.generateSongs(prompt, true, tags, title, false, model, wait_audio, negative_tags, 'extend', audioId, continueAt);
  }

  /**
   * Generate isolated audio stems (vocals, instruments, bass, drums) from a complete song.
   * Useful for remixing or extracting individual track elements.
   *
   * @param song_id - ID of the song to split into stems
   * @returns Promise resolving to array of AudioInfo objects, one for each stem track
   * @throws Error if song_id is invalid or stem generation fails
   *
   * @example
   * ```typescript
   * const stems = await api.generateStems('song-id-123');
   * // stems[0] = vocals only
   * // stems[1] = instrumental only
   * // stems[2] = bass only
   * // stems[3] = drums only
   * ```
   */
  public async generateStems(song_id: string): Promise<AudioInfo[]> {
    validateRequiredString(song_id, 'song_id');
    await this.keepAlive(false);
    const response = await this.client.post<ClipsResponse>(
      `${SunoApi.BASE_URL}/api/edit/stems/${song_id}`, {}
    );

    logger.info('generateStems response', sanitize(response?.data));
    return response.data.clips.map((clip): AudioInfo => ({
      id: clip.id,
      status: clip.status,
      created_at: clip.created_at,
      title: clip.title,
      model_name: clip.model_name,
      stem_from_id: clip.metadata.stem_from_id,
      duration: clip.metadata.duration
    }));
  }


  /**
   * Get word-level timing data for synchronized lyric display (karaoke-style).
   * Returns each word with its start and end timestamps.
   *
   * @param song_id - ID of the song to get lyric timing for
   * @returns Promise resolving to array of TranscribedWord objects with timing data
   * @throws Error if song_id is invalid or alignment data unavailable
   *
   * @example
   * ```typescript
   * const alignment = await api.getLyricAlignment('song-id-123');
   * alignment.forEach(word => {
   *   console.log(`${word.word}: ${word.start_s}s - ${word.end_s}s`);
   * });
   * // Output: "Hello: 0.5s - 0.8s"
   * ```
   */
  public async getLyricAlignment(song_id: string): Promise<TranscribedWord[]> {
    validateRequiredString(song_id, 'song_id');
    await this.keepAlive(false);
    const response = await this.client.get<{ aligned_words: TranscribedWord[] }>(`${SunoApi.BASE_URL}/api/gen/${song_id}/aligned_lyrics/v2/`);

    logger.info('getLyricAlignment response', sanitize(response.data));
    return response.data?.aligned_words.map((transcribedWord): TranscribedWord => ({
      word: transcribedWord.word,
      start_s: transcribedWord.start_s,
      end_s: transcribedWord.end_s,
      success: transcribedWord.success,
      p_align: transcribedWord.p_align
    }));
  }

  /**
   * Processes the lyrics (prompt) from the audio metadata into a more readable format.
   * @param prompt The original lyrics text.
   * @returns The processed lyrics text.
   */
  private parseLyrics(prompt: string): string {
    // Assuming the original lyrics are separated by a specific delimiter (e.g., newline), we can convert it into a more readable format.
    // The implementation here can be adjusted according to the actual lyrics format.
    // For example, if the lyrics exist as continuous text, it might be necessary to split them based on specific markers (such as periods, commas, etc.).
    // The following implementation assumes that the lyrics are already separated by newlines.

    // Split the lyrics using newline and ensure to remove empty lines.
    const lines = prompt.split('\n').filter((line) => line.trim() !== '');

    // Reassemble the processed lyrics lines into a single string, separated by newlines between each line.
    // Additional formatting logic can be added here, such as adding specific markers or handling special lines.
    return lines.join('\n');
  }

  /**
   * Retrieve detailed information about songs by IDs or get paginated feed.
   * Can fetch specific songs or browse all user songs with pagination.
   *
   * @param songIds - Optional array of song IDs to retrieve. If omitted, returns user's song feed
   * @param page - Optional page number for pagination when browsing feed
   * @returns Promise resolving to array of AudioInfo objects with song details
   * @throws Error if API request fails
   *
   * @example
   * ```typescript
   * // Get specific songs
   * const songs = await api.get(['song-1', 'song-2']);
   *
   * // Get user's first page of songs
   * const feed = await api.get();
   *
   * // Get second page
   * const page2 = await api.get(undefined, '2');
   * ```
   */
  public async get(
    songIds?: string[],
    page?: string | null
  ): Promise<AudioInfo[]> {
    await this.keepAlive(false);
    let url = new URL(`${SunoApi.BASE_URL}/api/feed/v2`);
    if (songIds) {
      url.searchParams.append('ids', songIds.join(','));
    }
    if (page) {
      url.searchParams.append('page', page);
    }
    logger.info(`Get audio status: ${url.href}`);
    const response = await this.client.get(url.href, {
      timeout: SunoApi.TIMEOUTS.API_FEED
    });

    const audios: ClipInfo[] = response.data.clips;

    return audios.map((audio): AudioInfo => ({
      id: audio.id,
      title: audio.title,
      image_url: audio.image_url,
      lyric: audio.metadata.prompt
        ? this.parseLyrics(audio.metadata.prompt)
        : '',
      audio_url: audio.audio_url,
      video_url: audio.video_url,
      created_at: audio.created_at,
      model_name: audio.model_name,
      status: audio.status,
      gpt_description_prompt: audio.metadata.gpt_description_prompt,
      prompt: audio.metadata.prompt,
      type: audio.metadata.type,
      tags: audio.metadata.tags,
      duration: audio.metadata.duration,
      error_message: audio.metadata.error_message
    }));
  }

  /**
   * Get complete detailed metadata for a specific audio clip.
   * Returns raw clip data including all metadata fields.
   *
   * @param clipId - ID of the clip to retrieve
   * @returns Promise resolving to object with full clip information
   * @throws Error if clipId is empty or clip not found
   *
   * @example
   * ```typescript
   * const clip = await api.getClip('clip-id-123');
   * console.log(clip);
   * ```
   */
  public async getClip(clipId: string): Promise<object> {
    validateRequiredString(clipId, 'clipId');
    await this.keepAlive(false);
    const response = await this.client.get(
      `${SunoApi.BASE_URL}/api/clip/${clipId}`
    );
    return response.data;
  }

  /**
   * Get account credit balance and usage information.
   * Shows remaining credits, billing period, and monthly limits.
   *
   * @returns Promise resolving to object with credits_left, period, monthly_limit, and monthly_usage
   *
   * @example
   * ```typescript
   * const credits = await api.getCredits();
   * console.log(`Credits remaining: ${credits.credits_left}`);
   * console.log(`Monthly usage: ${credits.monthly_usage}/${credits.monthly_limit}`);
   * ```
   */
  public async getCredits(): Promise<object> {
    await this.keepAlive(false);
    const response = await this.client.get(
      `${SunoApi.BASE_URL}/api/billing/info/`
    );
    return {
      credits_left: response.data.total_credits_left,
      period: response.data.period,
      monthly_limit: response.data.monthly_limit,
      monthly_usage: response.data.monthly_usage
    };
  }

  /**
   * Get account credit balance and usage information.
   *
   * @deprecated Use getCredits() instead. This method will be removed in v2.0.0
   * @returns Promise resolving to object with credits information
   *
   * @example
   * ```typescript
   * // Don't use this - use getCredits() instead
   * const credits = await api.get_credits();
   * ```
   */
  public async get_credits(): Promise<object> {
    logger.warn('get_credits() is deprecated, use getCredits() instead');
    return this.getCredits();
  }

  /**
   * Get information about a Suno persona including their clips with pagination.
   * Personas are voice/style profiles that can be used for consistent song generation.
   *
   * @param personaId - ID of the persona to retrieve
   * @param page - Page number for paginated results. Defaults to 1
   * @returns Promise resolving to PersonaResponse with persona details and clips
   * @throws Error if personaId is invalid, page is not a number, or API request fails
   *
   * @example
   * ```typescript
   * const persona = await api.getPersonaPaginated('persona-id-123');
   * console.log(persona.persona.name);
   * console.log(`Clips: ${persona.persona.clip_count}`);
   *
   * // Get second page of clips
   * const page2 = await api.getPersonaPaginated('persona-id-123', 2);
   * ```
   */
  public async getPersonaPaginated(personaId: string, page: number = 1): Promise<PersonaResponse> {
    validateRequiredString(personaId, 'personaId');
    validateNumber(page, 'page');
    await this.keepAlive(false);

    const url = `${SunoApi.BASE_URL}/api/persona/get-persona-paginated/${personaId}/?page=${page}`;

    logger.info(`Fetching persona data: ${url}`);

    const response = await this.client.get(url, {
      timeout: SunoApi.TIMEOUTS.API_PERSONA
    });

    if (response.status !== 200) {
      throw new Error(`Error response: ${response.statusText}`);
    }

    return response.data;
  }
}

/**
 * Factory function to get a cached SunoApi instance.
 * Creates and initializes a new instance if one doesn't exist for the given cookie.
 * Uses per-cookie caching to reuse instances and maintain session state.
 *
 * @param cookie - Optional Suno authentication cookie. Falls back to SUNO_COOKIE environment variable
 * @returns Promise resolving to initialized and cached SunoApi instance
 * @throws Error if no valid cookie provided or initialization fails
 *
 * @example
 * ```typescript
 * // Use environment variable cookie
 * const api = await sunoApi();
 *
 * // Use custom cookie
 * const api2 = await sunoApi('custom_cookie_value');
 *
 * // Subsequent calls with same cookie return cached instance
 * const sameApi = await sunoApi(); // Returns cached instance
 * ```
 */
export const sunoApi = async (cookie?: string) => {
  const resolvedCookie = cookie && cookie.includes('__client') ? cookie : process.env.SUNO_COOKIE; // Check for bad `Cookie` header (It's too expensive to actually parse the cookies *here*)
  if (!resolvedCookie) {
    logger.info('No cookie provided! Aborting...\nPlease provide a cookie either in the .env file or in the Cookie header of your request.')
    throw new Error('Please provide a cookie either in the .env file or in the Cookie header of your request.');
  }

  // Check if the instance for this cookie already exists in the cache
  const cachedInstance = cache.get(resolvedCookie);
  if (cachedInstance)
    return cachedInstance;

  // If not, create a new instance and initialize it
  const instance = await new SunoApi(resolvedCookie).init();
  // Cache the initialized instance
  cache.set(resolvedCookie, instance);

  return instance;
};