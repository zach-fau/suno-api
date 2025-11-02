---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# Project Style Guide

## Code Style Standards

### TypeScript/JavaScript Style

#### General Principles
- **Type Safety First** - Leverage TypeScript's type system fully
- **Functional Where Appropriate** - Prefer functional patterns for data transformation
- **Clear Over Clever** - Readability trumps conciseness
- **Explicit Over Implicit** - Make intentions clear in code

#### Naming Conventions

**Variables & Functions**
```typescript
// Use camelCase for variables and functions
const userName = 'John';
const fetchUserData = async () => { ... };

// Use descriptive names
// Good
const sunoApiInstance = getSunoApi(cookie);
const generationResult = await api.generate(prompt);

// Avoid
const x = getApi(c);
const res = await api.gen(p);
```

**Classes & Types**
```typescript
// Use PascalCase for classes and interfaces
class SunoApi { ... }
interface AudioInfo { ... }
type GenerationStatus = 'pending' | 'complete';

// Interface names: no "I" prefix
// Good
interface AudioInfo { ... }

// Avoid
interface IAudioInfo { ... }
```

**Constants**
```typescript
// Use SCREAMING_SNAKE_CASE for true constants
const DEFAULT_MODEL = 'chirp-crow';
const MAX_RETRY_ATTEMPTS = 3;

// Use camelCase for runtime constants
const baseUrl = process.env.BASE_URL;
```

**Files & Directories**
```typescript
// API routes: lowercase with underscores
/api/generate_lyrics/route.ts
/api/custom_generate/route.ts

// Components: PascalCase
Header.tsx
Footer.tsx
Swagger.tsx

// Libraries: camelCase
utils.ts
// Special: Match class name
SunoApi.ts
```

#### Code Organization

**Import Ordering**
```typescript
// 1. External libraries
import { NextResponse } from 'next/server';
import axios from 'axios';

// 2. Internal modules
import { SunoApi } from '@/lib/SunoApi';
import { logger } from '@/lib/utils';

// 3. Types (if separate)
import type { AudioInfo, GenerationParams } from './types';
```

**Function Structure**
```typescript
// Order: Public methods first, then private
class SunoApi {
  // Public methods
  public async generate(params: GenerateParams) { ... }
  public async getLimit() { ... }

  // Private helpers
  private async makeRequest(url: string) { ... }
  private handleError(error: Error) { ... }
}
```

#### Error Handling

**Standard Pattern**
```typescript
try {
  const result = await api.generate(params);
  return NextResponse.json(result);
} catch (error) {
  logger.error('Generation failed', { error });
  return NextResponse.json(
    { error: 'Failed to generate music' },
    { status: 500 }
  );
}
```

**Specific Error Types**
```typescript
// Catch and handle specific errors
try {
  // ...
} catch (error) {
  if (error.response?.status === 401) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
  // Generic fallback
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

#### Async/Await Style

**Preferred Pattern**
```typescript
// Use async/await over .then()
// Good
const songs = await api.generate(prompt);
return songs;

// Avoid
return api.generate(prompt).then(songs => songs);
```

**Promise.all for Parallelism**
```typescript
// Multiple independent async operations
const [songs, limit, persona] = await Promise.all([
  api.generate(prompt),
  api.getLimit(),
  api.getPersona(id)
]);
```

### React/Next.js Patterns

#### Component Style

**Functional Components**
```typescript
// Use functional components with TypeScript
export default function Header({ title }: { title: string }) {
  return (
    <header>
      <h1>{title}</h1>
    </header>
  );
}
```

**Props Interface**
```typescript
// Define props interface explicitly
interface SectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, children, className }: SectionProps) {
  return (
    <section className={className}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

#### API Routes Pattern

**Standard Structure**
```typescript
// /src/app/api/[endpoint]/route.ts
import { NextResponse } from 'next/server';
import { SunoApi } from '@/lib/SunoApi';

export async function POST(request: Request) {
  try {
    // 1. Parse request
    const body = await request.json();

    // 2. Extract cookie (optional override)
    const cookie = request.headers.get('Cookie') || process.env.SUNO_COOKIE;

    // 3. Get API instance
    const api = await SunoApi.getInstance(cookie);

    // 4. Call API method
    const result = await api.someMethod(body);

    // 5. Return response
    return NextResponse.json(result);
  } catch (error) {
    // 6. Handle errors
    return NextResponse.json(
      { error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Logging Standards

#### Log Levels
```typescript
// info - Normal operations
logger.info('CAPTCHA required. Launching browser...');

// warn - Recoverable issues
logger.warn('Retrying after failure', { attempt: 2 });

// error - Failures requiring attention
logger.error('Browser launch failed', { error });

// debug - Detailed debugging (when enabled)
logger.debug('Request payload', { body });
```

#### Structured Logging
```typescript
// Include context in log objects
logger.info('Music generation started', {
  prompt,
  model: DEFAULT_MODEL,
  userId: user.id
});
```

### Comment Style

#### When to Comment

**DO Comment:**
```typescript
// Explain WHY, not WHAT
// Use browser automation because Suno requires CAPTCHA solving
// that cannot be done with HTTP requests alone
const browser = await this.launchBrowser();

// Document complex algorithms
// Binary search implementation for finding optimal generation parameters
function findOptimalParams(input: Input): Params { ... }

// Mark temporary code
// TEMPORARILY DISABLED FOR TESTING - Just open browser and wait
logger.info('TESTING MODE: Launching browser...');

// Explain non-obvious decisions
// Note: macOS gets fewer CAPTCHAs than Linux/Windows
const recommendedOS = 'macOS';
```

**DON'T Comment:**
```typescript
// Avoid obvious comments
// Bad: Get the user name
const userName = getUserName();

// Bad: Increment counter by 1
counter++;
```

#### Documentation Comments (JSDoc)

**Public API Methods**
```typescript
/**
 * Generate music from a text prompt
 *
 * @param prompt - Text description of desired music
 * @param options - Optional generation parameters
 * @returns Array of generated audio clips
 * @throws {Error} If generation fails or quota exceeded
 *
 * @example
 * ```typescript
 * const songs = await api.generate('upbeat jazz music');
 * console.log(songs[0].audio_url);
 * ```
 */
public async generate(
  prompt: string,
  options?: GenerateOptions
): Promise<AudioInfo[]> {
  // Implementation
}
```

### Git Commit Style

#### Commit Message Format

**Structure:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

**Examples:**
```bash
feat(api): Add persona endpoint for retrieving persona information and clips

fix(readme): remove the extra quotation mark in the <h1> tag

chore(docker): implement cookie check, use browser NPM package for auto install
```

#### Branch Naming
```bash
# Feature branches
feature/webhook-notifications
feature/batch-generation

# Bug fix branches
fix/captcha-timeout
fix/docker-gpu-issue

# Documentation
docs/api-examples
docs/deployment-guide
```

## Code Quality Standards

### TypeScript Configuration

**Strict Mode Enabled**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type Safety**
```typescript
// Always define return types for public functions
public async generate(prompt: string): Promise<AudioInfo[]> {
  // Implementation
}

// Use type guards for runtime checks
function isAudioInfo(obj: unknown): obj is AudioInfo {
  return typeof obj === 'object'
    && obj !== null
    && 'id' in obj;
}
```

### Linting & Formatting

#### ESLint Rules
- Follow Next.js recommended config
- No unused variables
- Consistent quote style (single quotes preferred)
- Semicolons required

#### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 80
}
```

### Testing Standards (Future)

**Test File Naming**
```typescript
// Test files adjacent to source
SunoApi.ts
SunoApi.test.ts

// Or in __tests__ directory
__tests__/SunoApi.test.ts
```

**Test Structure**
```typescript
describe('SunoApi', () => {
  describe('generate', () => {
    it('should generate music from prompt', async () => {
      // Arrange
      const prompt = 'jazz music';

      // Act
      const result = await api.generate(prompt);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('audio_url');
    });
  });
});
```

## Documentation Style

### README Structure
1. Project title and badges
2. Visual banner/demo
3. Introduction
4. Features list
5. Getting started
6. Configuration
7. API reference
8. Examples
9. Contributing
10. License

### API Documentation

**Endpoint Description**
```markdown
## POST /api/generate

Generate music from a text prompt.

### Request Body
- `prompt` (string, required) - Description of desired music
- `make_instrumental` (boolean, optional) - Generate without vocals
- `wait_audio` (boolean, optional) - Wait for completion

### Response
Array of AudioInfo objects with generation status.

### Example
\```bash
curl -X POST https://api.example.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "upbeat jazz music"}'
\```
```

### Code Examples

**Include Multiple Languages**
```markdown
### Python
\```python
import requests
response = requests.post(...)
\```

### JavaScript
\```javascript
const response = await fetch(...)
\```
```

## File Organization Standards

### Directory Purposes
- `/src/app/api/` - API route handlers only
- `/src/lib/` - Reusable business logic
- `/src/app/components/` - React components
- `/public/` - Static assets
- `.claude/` - AI assistant configuration

### File Size Guidelines
- **API routes:** < 200 lines
- **Components:** < 300 lines
- **Classes:** < 500 lines
- If larger, consider splitting into modules

## Security Best Practices

### Environment Variables
```typescript
// Always use environment variables for secrets
const cookie = process.env.SUNO_COOKIE;
const apiKey = process.env.TWOCAPTCHA_KEY;

// Never commit .env file
// Always provide .env.example
```

### Input Validation
```typescript
// Validate user input
if (!prompt || typeof prompt !== 'string') {
  return NextResponse.json(
    { error: 'Invalid prompt' },
    { status: 400 }
  );
}
```

### Cookie Handling
```typescript
// Allow per-request cookie override
const cookie =
  request.headers.get('Cookie') ||
  process.env.SUNO_COOKIE;

// Never log full cookies
logger.info('Using cookie', {
  cookiePrefix: cookie?.slice(0, 10)
});
```

## Performance Guidelines

### Caching
```typescript
// Cache API instances per cookie
const cache = new Map<string, SunoApi>();

if (cache.has(cookie)) {
  return cache.get(cookie);
}
```

### Async Operations
```typescript
// Don't wait unnecessarily
if (!wait_audio) {
  // Return immediately
  return NextResponse.json(result);
}

// Parallel operations where possible
const [result1, result2] = await Promise.all([
  operation1(),
  operation2()
]);
```

## Accessibility (UI Components)

### Semantic HTML
```tsx
// Use appropriate HTML elements
<header>
  <nav>
    <h1>Title</h1>
  </nav>
</header>
```

### ARIA Labels
```tsx
// Add labels for screen readers
<button aria-label="Generate music">
  <Icon />
</button>
```

## Deprecation Policy

### Marking Deprecated Code
```typescript
/**
 * @deprecated Use generateWithOptions() instead
 * Will be removed in v2.0.0
 */
export function generate(prompt: string) {
  return generateWithOptions({ prompt });
}
```

### Breaking Changes
- Announce in advance (GitHub discussions)
- Provide migration guide
- Maintain backward compatibility for one major version
- Update CHANGELOG.md

## Style Guide Evolution

This style guide is a living document. When proposing changes:

1. Open a GitHub issue for discussion
2. Provide rationale and examples
3. Update this document via PR
4. Communicate changes to contributors

## Quick Reference

### Checklist for New Code
- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] Logging added for key operations
- [ ] Comments explain non-obvious logic
- [ ] ESLint passes
- [ ] Consistent with existing patterns
- [ ] No secrets in code
- [ ] README updated if needed
