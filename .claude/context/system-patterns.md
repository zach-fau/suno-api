---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# System Patterns & Architecture

## Architectural Style

### Overall Architecture
**Type:** Serverless API Gateway with Browser Automation

**Layers:**
1. **Presentation Layer** - Next.js React UI for documentation
2. **API Layer** - Next.js API routes as REST endpoints
3. **Business Logic Layer** - SunoApi class orchestrating operations
4. **Integration Layer** - Playwright browser automation + HTTP clients
5. **External Services** - Suno.ai and 2Captcha

### Design Philosophy
- **Stateless Operations** - No persistent database, cookie-based sessions
- **Proxy Pattern** - Wraps Suno.ai's internal API with public REST API
- **Automation-First** - Browser automation handles authentication complexity
- **OpenAI Compatibility** - Mirrors OpenAI API format for easy integration

## Core Design Patterns

### 1. Singleton Pattern (Modified)
**Location:** `src/lib/SunoApi.ts`

**Implementation:**
```typescript
const cache = new Map<string, SunoApi>();
```

**Purpose:**
- One SunoApi instance per unique cookie value
- Maintains session state across requests
- Reduces browser launches and authentication overhead

**Rationale:** Each Suno account (cookie) needs persistent session management

### 2. Factory Pattern
**Location:** API route handlers

**Pattern:** Each API route creates/retrieves SunoApi instances
```typescript
// Routes obtain SunoApi instance based on cookie
const api = getSunoApiInstance(cookie);
```

### 3. Adapter Pattern
**Location:** `/v1/chat/completions/route.ts`

**Purpose:** Adapts Suno API to OpenAI API format
- Translates OpenAI chat completion requests
- Maps to Suno music generation calls
- Returns OpenAI-compatible responses

**Benefits:**
- Drop-in replacement for OpenAI API in AI agents
- Familiar interface for developers
- Easy integration with LangChain, GPTs, etc.

### 4. Strategy Pattern
**Location:** CAPTCHA solving in `SunoApi.ts`

**Strategies:**
- **No CAPTCHA Required** - Direct API access
- **CAPTCHA Required** - Browser automation + 2Captcha solving
- **Browser Selection** - Chromium vs Firefox strategies

**Configuration:** Environment variables determine strategy

### 5. Proxy Pattern
**Overall System Design**

**Structure:**
```
Client → suno-api (Proxy) → Suno.ai (Real Service)
```

**Responsibilities:**
- Authentication management
- CAPTCHA handling
- Rate limiting
- Response formatting
- Error handling

### 6. Command Pattern
**Location:** API endpoints

**Pattern:** Each endpoint represents a command
- `/api/generate` → GenerateMusicCommand
- `/api/custom_generate` → CustomGenerateCommand
- `/api/extend_audio` → ExtendAudioCommand

**Execution:** Commands orchestrate SunoApi method calls

## Data Flow Patterns

### Standard API Request Flow
```
1. Client Request (HTTP)
   ↓
2. Next.js API Route Handler
   ↓
3. Extract/Validate Cookie
   ↓
4. Get/Create SunoApi Instance (from cache)
   ↓
5. Check CAPTCHA Requirement
   ↓
6. [If needed] Solve CAPTCHA via Browser
   ↓
7. Make Request to Suno.ai
   ↓
8. Process Response
   ↓
9. Return JSON to Client
```

### Music Generation Flow (Async)
```
1. Client: POST /api/generate
   ↓
2. Immediate Response: {id: "...", status: "pending"}
   ↓
3. Client: Polling GET /api/get?ids=...
   ↓
4. Response: {status: "processing"} ...
   ↓
5. Response: {status: "streaming", audio_url: "..."}
```

**Pattern:** Asynchronous Job Processing with Polling

### CAPTCHA Solving Flow
```
1. Detect CAPTCHA Required
   ↓
2. Launch Playwright Browser
   ↓
3. Navigate to suno.com/create
   ↓
4. Wait for CAPTCHA Challenge
   ↓
5. Extract CAPTCHA Parameters
   ↓
6. Submit to 2Captcha API
   ↓
7. Poll 2Captcha for Solution
   ↓
8. Inject Solution Token
   ↓
9. Verify Success
   ↓
10. Extract Session Cookie
   ↓
11. Close Browser
   ↓
12. Update SunoApi Session
```

## State Management Patterns

### Session State
**Pattern:** Cookie-based stateful sessions

**Storage:**
- Client provides cookie via headers
- Server caches SunoApi instance per cookie
- No database persistence required

**Lifecycle:**
- **Creation:** First request with new cookie
- **Maintenance:** Automatic keep-alive requests
- **Expiration:** Cookie becomes invalid (requires re-login)

### Request State
**Pattern:** Stateless request handling

**Characteristics:**
- Each request is independent
- No server-side user sessions
- Authentication via cookie on every request

## Error Handling Patterns

### Layered Error Handling
```
1. Try-Catch in API Routes
   ↓
2. Specific Error Types Caught
   ↓
3. Log Error Details (Pino)
   ↓
4. Return HTTP Status Code + JSON Error
```

### Error Response Format
```typescript
{
  error: "Description of error",
  details?: "Additional context",
  code?: "ERROR_CODE"
}
```

### CAPTCHA Failure Recovery
**Pattern:** Retry with Browser Automation
1. API request fails (403/401)
2. Detect CAPTCHA requirement
3. Launch browser to solve
4. Retry original request
5. Return response or error

## Logging Patterns

### Structured Logging
**Library:** Pino

**Pattern:** JSON-structured log entries
```typescript
logger.info('CAPTCHA required. Launching browser...');
logger.error('Browser launch failed', { error });
```

**Levels:**
- `info` - Normal operations
- `warn` - Recoverable issues
- `error` - Failures requiring attention
- `debug` - Detailed debugging info (when enabled)

## API Design Patterns

### RESTful Principles
**Followed:**
- Resource-based URLs (`/api/get`, `/api/generate`)
- HTTP methods (GET, POST)
- JSON responses
- Appropriate status codes

**Deviations:**
- Some endpoints use query params where POST body might be more RESTful
- Action-based naming (`/api/generate_lyrics` vs `/api/lyrics`)

### Endpoint Naming Convention
- Verb-based: `/api/generate`, `/api/extend_audio`
- Noun-based: `/api/clip`, `/api/persona`
- Getter pattern: `/api/get`, `/api/get_limit`

### Request/Response Format
**Request:** JSON body or query parameters
**Response:** JSON with consistent structure

## Security Patterns

### Authentication Pattern
**Method:** Bearer token (cookie) in header

**Implementation:**
```typescript
// Cookie can be in:
// 1. Environment variable (default)
// 2. Request header (per-request override)
```

### CAPTCHA Bypass Mitigation
**Approach:** Legitimate CAPTCHA solving via paid service
- No illegal bypassing
- Respects Suno.ai's CAPTCHA requirements
- Uses human workers (2Captcha)

### Rate Limiting
**Pattern:** Delegated to Suno.ai
- Quota checking via API
- No client-side rate limiting
- Transparent pass-through of limits

## Browser Automation Patterns

### Stealth Automation
**Techniques:**
- **rebrowser-patches** - Playwright modifications to avoid detection
- **User-Agent Rotation** - Random realistic user agents
- **Ghost Cursor** - Human-like mouse movements (optional)
- **Viewport Randomization** - Variable browser sizes
- **Timing Randomization** - Variable delays

### Resource Optimization
**Pattern:** Browser instance reuse where possible
- Launch browser only when CAPTCHA required
- Close browser after CAPTCHA solved
- No persistent browser instances (serverless compatibility)

## Caching Patterns

### In-Memory Cache
**Pattern:** Map-based caching
```typescript
const cache = new Map<string, SunoApi>();
```

**Scope:** Per-deployment instance (serverless: per-container)

**Eviction:** No explicit eviction (relies on process restart)

### Response Caching
**Current:** No response caching implemented
**Rationale:** Music generation is dynamic, not cacheable

## Scalability Patterns

### Horizontal Scaling
**Supported:** Yes (stateless API design)

**Considerations:**
- Each instance has own cache
- No shared state between instances
- CAPTCHA solving scales linearly

### Serverless Compatibility
**Design Choices:**
- Stateless operations
- No persistent connections
- Fast cold start optimization
- Environment-based configuration

## Integration Patterns

### Webhook Pattern
**Not Implemented:** Currently polling-based

**Future Consideration:** Webhook callbacks for music generation completion

### OpenAPI/Swagger Documentation
**Pattern:** Auto-generated from code
- Swagger UI for interactive docs
- OpenAPI specification export
- Machine-readable API schema

## Testing Patterns

### Current State
**Patterns:** Manual testing with browser inspection mode
**Tools:** Headed browser mode for debugging

### Testing Modes
1. **CAPTCHA Testing** - Browser stays open for inspection
2. **Production Mode** - Headless, fully automated
3. **Development Mode** - Headed, with delays

## Code Organization Patterns

### File-per-Route Pattern
**Next.js Convention:** Each API endpoint = separate directory

### Separation of Concerns
- **Routes** - Request/response handling
- **SunoApi** - Business logic
- **Utils** - Helper functions
- **Components** - UI elements

### TypeScript Interfaces
**Pattern:** Define clear type contracts
```typescript
interface AudioInfo {
  id: string;
  title: string;
  // ... other fields
}
```

## Future Pattern Considerations

### Potential Patterns
- **Observer Pattern** - For music generation progress notifications
- **Queue Pattern** - For handling burst requests
- **Circuit Breaker** - For Suno.ai API failures
- **Retry Pattern with Backoff** - For transient failures
