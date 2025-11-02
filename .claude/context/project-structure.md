---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# Project Structure

## Directory Organization

```
suno-api/
├── .claude/              # Claude Code configuration
│   ├── commands/         # Custom slash commands
│   │   ├── context/      # Context management commands
│   │   ├── pm/           # Project management commands
│   │   └── testing/      # Testing commands
│   └── context/          # Project context files
│
├── .github/              # GitHub configuration
│   └── ISSUE_TEMPLATE/   # Issue templates
│
├── .next/                # Next.js build output (generated)
│
├── ccpm/                 # Claude Code Project Management
│   ├── agents/           # PM agent configurations
│   ├── commands/         # CCPM slash commands
│   │   ├── context/
│   │   ├── pm/
│   │   └── testing/
│   ├── context/          # CCPM context files
│   ├── epics/            # Epic tracking
│   ├── hooks/            # Event hooks
│   └── prds/             # Product requirement docs
│
├── node_modules/         # NPM dependencies (generated)
│
├── public/               # Static assets
│   ├── icon.png
│   └── suno-banner.png
│
└── src/                  # Source code
    ├── app/              # Next.js app directory
    │   ├── api/          # API routes
    │   │   ├── clip/
    │   │   ├── concat/
    │   │   ├── custom_generate/
    │   │   ├── extend_audio/
    │   │   ├── generate/
    │   │   ├── generate_lyrics/
    │   │   ├── generate_stems/
    │   │   ├── get/
    │   │   ├── get_aligned_lyrics/
    │   │   ├── get_limit/
    │   │   └── persona/
    │   ├── components/   # React components
    │   │   ├── Footer.tsx
    │   │   ├── Header.tsx
    │   │   ├── Logo.tsx
    │   │   ├── Section.tsx
    │   │   └── Swagger.tsx
    │   ├── docs/         # Documentation page
    │   │   └── page.tsx
    │   ├── v1/           # OpenAI-compatible API
    │   │   └── chat/
    │   │       └── completions/
    │   ├── layout.tsx    # Root layout
    │   └── page.tsx      # Home page
    │
    └── lib/              # Shared libraries
        ├── SunoApi.ts    # Core API implementation
        └── utils.ts      # Utility functions
```

## Key Directories

### `/src/app/api/`
**Purpose:** Next.js API routes for Suno functionality

**Organization Pattern:** Each endpoint has its own directory containing a `route.ts` file

**Key Files:**
- `generate/route.ts` - Main music generation endpoint
- `custom_generate/route.ts` - Custom mode with lyrics, style, title
- `get/route.ts` - Retrieve song information by ID
- `get_limit/route.ts` - Check account quota
- `persona/route.ts` - NEW: Persona information retrieval

### `/src/lib/`
**Purpose:** Core business logic and API client

**Key Files:**
- **SunoApi.ts** - Main API client class
  - Handles authentication via cookies
  - Manages CAPTCHA solving with 2Captcha
  - Browser automation with Playwright
  - API request/response handling
- **utils.ts** - Helper functions and utilities

### `/src/app/components/`
**Purpose:** React UI components for documentation site

**Components:**
- `Swagger.tsx` - Interactive API documentation
- `Header.tsx` / `Footer.tsx` - Page layout
- `Logo.tsx` - Branding
- `Section.tsx` - Content sections

### `.claude/`
**Purpose:** Claude Code configuration and project management

**Structure:**
- `commands/` - Custom slash commands for development workflows
- `context/` - Project context files for AI assistance

### `ccpm/`
**Purpose:** Claude Code Project Management system

**Structure:**
- `agents/` - Specialized PM agent configurations
- `commands/` - CCPM-specific commands
- `epics/` - High-level feature tracking
- `prds/` - Product requirement documents
- `hooks/` - Automation hooks

## File Naming Conventions

### TypeScript/React Files
- **Route files:** `route.ts` (Next.js convention)
- **Components:** PascalCase with `.tsx` extension (e.g., `Header.tsx`)
- **Libraries:** camelCase with `.ts` extension (e.g., `utils.ts`)
- **Class files:** PascalCase matching class name (e.g., `SunoApi.ts`)

### Configuration Files
- **Next.js:** `next.config.mjs`, `next-env.d.ts`
- **TypeScript:** `tsconfig.json`
- **Tailwind:** `tailwind.config.ts`
- **PostCSS:** `postcss.config.js`
- **ESLint:** `.eslintrc.json`
- **Prettier:** `.prettierrc`

### Documentation
- **Markdown:** UPPERCASE for root-level docs (e.g., `README.md`, `LICENSE`)
- **Language variants:** Suffix with language code (e.g., `README_CN.md`, `README_RU.md`)

## Module Organization

### API Route Pattern
Each API endpoint follows this structure:
```
/src/app/api/[endpoint]/
└── route.ts
    - Named exports: GET, POST, PUT, DELETE
    - Response format: NextResponse.json()
    - Error handling: try-catch with appropriate status codes
```

### Component Pattern
```typescript
// Functional components with TypeScript
export default function ComponentName({ props }: Props) {
  // Component logic
  return (/* JSX */)
}
```

### API Client Pattern (SunoApi.ts)
```typescript
class SunoApi {
  // Private state management
  // Public API methods
  // Helper methods
  // CAPTCHA handling
  // Browser automation
}
```

## Build Output

### Generated Directories (Git-ignored)
- `.next/` - Next.js build cache and output
- `node_modules/` - NPM dependencies
- `dist/` - Production build (if applicable)

### Development Files
- `.env` - Environment variables (git-ignored)
- `.env.example` - Template for environment setup

## Import Path Organization

### Absolute Imports
Not currently configured - uses relative imports

### Relative Import Pattern
- API routes import from `@/lib/` using relative paths
- Components import from local directories
- Types are typically defined inline or in the same file

## Special Directories

### Docker Configuration
- `Dockerfile` - Container definition
- `docker-compose.yml` - Multi-container orchestration
- `.dockerignore` - Build exclusions

### Git Configuration
- `.github/` - GitHub-specific configuration
- `.git/` - Git repository data
- `.gitignore` - Version control exclusions
