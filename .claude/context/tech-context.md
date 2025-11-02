---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# Technical Context

## Technology Stack

### Runtime & Framework
- **Node.js** - JavaScript runtime environment
- **Next.js 14.1.4** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript

### Core Dependencies

#### API & HTTP
- **axios 1.7.8** - HTTP client for API requests
- **cookie 1.0.2** - Cookie parsing and serialization
- **js-cookie 3.0.5** - Cookie handling for browser
- **tough-cookie 4.1.4** - RFC 6265 cookie handling

#### Browser Automation & CAPTCHA
- **@playwright/browser-chromium 1.49.1** - Browser automation for Chromium
- **rebrowser-playwright-core 1.49.1** - Enhanced Playwright core with stealth features
- **@2captcha/captcha-solver 1.3.0** - CAPTCHA solving service integration
- **ghost-cursor-playwright 2.1.0** - Human-like cursor movement simulation
- **chromium-bidi 0.10.1** - BiDi protocol support
- **user-agents 1.1.156** - User agent string generation

#### Documentation
- **next-swagger-doc 0.4.0** - OpenAPI/Swagger documentation generation
- **swagger-ui-react 5.18.2** - Interactive API documentation UI
- **react-markdown 9.0.1** - Markdown rendering in React

#### Logging
- **pino 8.19.0** - Fast JSON logger
- **pino-pretty 11.0.0** - Pretty-print pino logs

#### Utilities
- **yn 5.0.0** - Boolean value parsing from strings
- **bufferutil 4.0.8** - WebSocket buffer utilities
- **utf-8-validate 6.0.5** - UTF-8 validation

#### Analytics
- **@vercel/analytics 1.2.2** - Vercel Analytics integration

#### Experimental
- **electron 33.2.1** - Desktop application framework (optional feature)

### Development Dependencies

#### TypeScript Type Definitions
- **@types/node** - Node.js types
- **@types/react** - React types
- **@types/react-dom** - React DOM types
- **@types/js-cookie 3.0.6** - Cookie types
- **@types/swagger-ui-react 4.18.3** - Swagger UI types
- **@types/tough-cookie 4.0.5** - Cookie types
- **@types/user-agents 1.0.4** - User agent types

#### Styling
- **tailwindcss 3.3.0** - Utility-first CSS framework
- **@tailwindcss/typography 0.5.12** - Typography plugin for Tailwind
- **postcss 8** - CSS transformation tool
- **autoprefixer 10.0.1** - CSS vendor prefixing

#### Linting & Formatting
- **eslint 8.57.0** - JavaScript linter
- **eslint-config-next 14.1.4** - Next.js ESLint configuration

## Language Versions

### Current Versions
- **TypeScript:** 5.x
- **ECMAScript Target:** ES2020+ (modern JavaScript)
- **Node.js:** 18+ recommended
- **React:** 18.x

### Browser Compatibility
- Modern browsers supporting ES6+
- Chromium-based browsers for automation
- Firefox support for automation (configurable)

## Build System

### Build Tools
- **Next.js Compiler** - Built-in SWC-based compiler
- **npm** - Package manager (package-lock.json present)
- **pnpm** - Alternative package manager support (pnpm-lock.yaml present)

### Build Scripts
```json
{
  "dev": "next dev",          // Development server (localhost:3000)
  "build": "next build",      // Production build
  "start": "next start",      // Production server
  "lint": "next lint"         // ESLint checking
}
```

### Build Output
- `.next/` - Compiled Next.js application
- Static assets optimized and bundled
- Server-side rendering ready
- API routes compiled

## Environment Configuration

### Required Environment Variables
```bash
SUNO_COOKIE          # Suno.ai authentication cookie
TWOCAPTCHA_KEY       # 2Captcha API key for CAPTCHA solving
BROWSER              # Browser type: 'chromium' or 'firefox'
BROWSER_GHOST_CURSOR # Enable ghost-cursor: 'true' or 'false'
BROWSER_LOCALE       # Browser language: 'en', 'ru', etc.
BROWSER_HEADLESS     # Headless mode: 'true' or 'false'
```

### Configuration Files
- `.env` - Local environment variables (git-ignored)
- `.env.example` - Template with example values
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript compiler options
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `.eslintrc.json` - ESLint rules
- `.prettierrc` - Prettier formatting rules

## API Integrations

### External Services
1. **Suno.ai** - Music generation service
   - Cookie-based authentication
   - Private/internal API (not official)
   - Endpoints reverse-engineered

2. **2Captcha (ruCaptcha)** - CAPTCHA solving
   - Worker-based CAPTCHA solving
   - hCaptcha support
   - API key authentication
   - Pricing: Pay per CAPTCHA solved

### API Response Format
- JSON-based responses
- RESTful design patterns
- OpenAI-compatible format for `/v1/chat/completions`

## Browser Automation Stack

### Playwright Configuration
- **Browser Support:** Chromium, Firefox
- **Stealth Mode:** rebrowser-patches for detection avoidance
- **Headless/Headed:** Configurable via environment
- **User Agent Rotation:** Random user agents
- **Ghost Cursor:** Optional realistic mouse movements

### CAPTCHA Solving Flow
1. Detect CAPTCHA requirement
2. Launch browser (Chromium/Firefox)
3. Navigate to Suno.ai
4. Wait for CAPTCHA challenge
5. Submit to 2Captcha service
6. Inject solution token
7. Verify and extract session

## Deployment Targets

### Supported Platforms
- **Vercel** - Primary deployment platform
  - Serverless functions
  - Edge runtime support
  - Automatic HTTPS
  - Environment variable management

- **Docker** - Containerized deployment
  - Dockerfile provided
  - docker-compose.yml for orchestration
  - Note: GPU acceleration disabled in container

- **Local Development** - Direct Node.js execution
  - Full feature support
  - Best for development
  - Recommended for macOS (fewer CAPTCHAs)

### Platform-Specific Notes
- **macOS:** Fewer CAPTCHAs encountered (recommended)
- **Linux:** More CAPTCHAs, but functional
- **Windows:** More CAPTCHAs, but functional
- **Docker:** Slower without GPU, but portable

## Database & State Management

### Current Implementation
- **No persistent database** - Stateless API
- **In-memory caching** - SunoApi instance caching per cookie
- **Session management** - Cookie-based authentication
- **Global state** - Using globalThis for development hot-reload

### Caching Strategy
```typescript
const cache = new Map<string, SunoApi>();
// Key: Cookie value
// Value: SunoApi instance with session
```

## Security Considerations

### Authentication
- Cookie-based authentication with Suno.ai
- No user credentials stored
- Session cookies managed securely
- HTTPS required for production

### CAPTCHA Handling
- Automated CAPTCHA solving via paid service
- Browser fingerprinting mitigation
- Stealth techniques to avoid detection

### API Rate Limiting
- Quota checking via `/api/get_limit`
- Suno.ai enforces daily/monthly limits
- Free tier: 50 credits/day
- Pro tier: Higher limits (varies)

## Performance Optimization

### Current Optimizations
- Response streaming for audio generation
- Keep-alive for Suno session
- Connection pooling via axios
- Static asset caching via Next.js

### Known Bottlenecks
- CAPTCHA solving (2-30 seconds)
- Audio generation (30-90 seconds)
- Browser launch overhead (2-5 seconds)

## Development Tools

### Code Quality
- ESLint for linting
- Prettier for formatting (configured)
- TypeScript for type safety
- Next.js built-in linting

### Debugging
- Pino structured logging
- Browser DevTools integration
- Headed browser mode for debugging
- Source maps enabled

## Version Management

### Dependency Updates
- Regular updates via npm/pnpm
- Security patches prioritized
- Breaking changes evaluated carefully
- Lock files maintained (package-lock.json, pnpm-lock.yaml)

### Compatibility Matrix
| Component | Version | Status |
|-----------|---------|--------|
| Node.js | 18+ | Supported |
| Next.js | 14.1.4 | Current |
| React | 18.x | Current |
| TypeScript | 5.x | Current |
| Playwright | 1.49.1 | Current |
