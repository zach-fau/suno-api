---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# Project Overview

## What is Suno API?

Suno API is an open-source REST API that provides programmatic access to Suno.ai's AI music generation service. It acts as a bridge between developers and Suno.ai, handling the complexity of authentication, CAPTCHA solving, and API communication automatically.

## Core Purpose

Enable developers to integrate AI-generated music into their applications, AI agents, bots, and automation workflows without dealing with manual web interface interactions or CAPTCHA challenges.

## Key Features Summary

### Music Generation
- **Simple Generation** - Generate music from text prompts
- **Custom Generation** - Specify lyrics, music style, and title
- **Instrumental Mode** - Create music without vocals
- **Wait Mode** - Option to wait for generation completion before returning

### Audio Manipulation
- **Extend Audio** - Make songs longer from existing clips
- **Stem Separation** - Separate vocals from instrumentals
- **Song Concatenation** - Combine audio extensions into complete tracks
- **Aligned Lyrics** - Get timestamped lyrics for synchronization

### Lyrics & Creativity
- **Lyrics Generation** - AI-generated lyrics from prompts
- **Style Customization** - Specify music genres and moods
- **Persona Integration** - Access persona information and clips

### Management & Monitoring
- **Quota Checking** - Monitor remaining credits
- **Song Retrieval** - Get song information and status by ID
- **Clip Information** - Access individual clip details

### Integration Capabilities
- **OpenAI Compatibility** - `/v1/chat/completions` endpoint for AI agents
- **RESTful API** - Standard REST principles
- **Swagger Documentation** - Interactive API testing and docs
- **Multi-Language Examples** - Python and JavaScript sample code

### Automation Features
- **Automatic CAPTCHA Solving** - Powered by 2Captcha + Playwright
- **Session Management** - Keep-alive for persistent sessions
- **Browser Automation** - Stealth browser techniques to avoid detection
- **Cookie Handling** - Per-request or global cookie configuration

## Architecture Overview

### High-Level Components

```
┌─────────────┐
│   Client    │ (Your App/Agent)
└──────┬──────┘
       │ HTTP/REST
       ↓
┌─────────────┐
│  Suno API   │ (This Project)
│   Next.js   │
└──────┬──────┘
       │
       ├──→ Browser Automation (Playwright)
       │    └──→ 2Captcha Service
       │
       └──→ Suno.ai HTTP API
            └──→ Cookie Auth
```

### Technology Stack
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript 5
- **Runtime:** Node.js 18+
- **Browser:** Playwright (Chromium/Firefox)
- **CAPTCHA:** 2Captcha integration
- **Documentation:** Swagger UI
- **Styling:** Tailwind CSS

## Deployment Options

### 1. Vercel (Recommended)
- **One-click deploy** via Vercel button
- Serverless architecture
- Automatic HTTPS
- Free tier available
- Environment variable management built-in

### 2. Docker
- **Containerized** deployment
- Portable across platforms
- Docker Compose support
- Note: GPU acceleration disabled

### 3. Local Development
- **Direct Node.js** execution
- Full feature access
- Best for development and debugging
- Recommended for macOS (fewer CAPTCHAs)

## API Endpoints

### Generation Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate` | POST | Generate music from prompt |
| `/api/custom_generate` | POST | Generate with custom settings |
| `/api/generate_lyrics` | POST | Generate lyrics from prompt |
| `/api/extend_audio` | POST | Extend existing audio |
| `/api/generate_stems` | POST | Separate vocal/instrumental |
| `/api/concat` | POST | Combine audio segments |

### Information Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/get` | GET | Get song info by ID(s) |
| `/api/get_limit` | GET | Check quota/usage |
| `/api/clip` | GET | Get clip information |
| `/api/persona` | GET | Get persona details |
| `/api/get_aligned_lyrics` | GET | Get timed lyrics |

### Integration Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/chat/completions` | POST | OpenAI-compatible generation |

### Documentation Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/docs` | Interactive Swagger UI |
| `/api-doc` | OpenAPI JSON specification |

## Workflow Example

### Typical Music Generation Flow

1. **Setup**
   ```bash
   # Deploy and configure
   SUNO_COOKIE=your_cookie
   TWOCAPTCHA_KEY=your_key
   ```

2. **Generate Music**
   ```bash
   POST /api/generate
   {
     "prompt": "A cheerful pop song about summer",
     "make_instrumental": false,
     "wait_audio": false
   }
   ```

3. **Response** (Immediate)
   ```json
   [
     {
       "id": "abc123",
       "status": "pending",
       "title": "Summer Vibes"
     }
   ]
   ```

4. **Poll for Completion**
   ```bash
   GET /api/get?ids=abc123
   ```

5. **Get Results** (When ready)
   ```json
   {
     "id": "abc123",
     "status": "streaming",
     "audio_url": "https://...",
     "title": "Summer Vibes",
     "lyrics": "..."
   }
   ```

## Integration Examples

### AI Agent Integration
```javascript
// Use OpenAI-compatible endpoint
const response = await fetch('/v1/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{
      role: 'user',
      content: 'Generate upbeat electronic music'
    }]
  })
});
```

### Python Application
```python
import requests

# Generate music
response = requests.post(
  'https://your-api.vercel.app/api/generate',
  json={'prompt': 'Jazz piano solo'}
)
songs = response.json()
```

### Discord Bot
```javascript
bot.on('message', async msg => {
  if (msg.content.startsWith('!generate')) {
    const prompt = msg.content.slice(10);
    const songs = await generateMusic(prompt);
    msg.reply(`Generated: ${songs[0].audio_url}`);
  }
});
```

## Current State

### Maturity Level
**Production-Ready** - Stable and actively used

### Version
**1.1.0** (from package.json)

### Community
- **11.5k+ GitHub Stars**
- Active contributions and PRs
- Multi-language README (English, Chinese, Russian)
- Featured on Product Hunt
- Live demo at https://suno.gcui.ai

### Recent Updates
- ✨ Persona API endpoint added
- 🐛 Docker and browser automation improvements
- 📝 Documentation fixes
- 🔒 Cookie validation enhancements
- 🎯 hCaptcha handling optimizations

## Use Case Categories

### 1. Content Creation
- YouTube background music
- Podcast intros/outros
- Social media content
- Video game soundtracks

### 2. AI Assistants
- GPT plugins
- Discord/Slack bots
- Virtual assistants
- Chatbot integrations

### 3. Applications
- Music generation apps
- Creative tools
- Educational platforms
- Marketing automation

### 4. Research & Education
- AI music studies
- Academic research
- Music theory education
- Algorithm experiments

### 5. Development Tools
- Prototyping
- Testing AI music systems
- API exploration
- Integration development

## Requirements

### User Requirements
- Suno.ai account (free or Pro)
- 2Captcha account with credits
- Basic REST API knowledge
- Deployment platform (Vercel, Docker, or Node.js)

### Technical Requirements
- Node.js 18+ (for local deployment)
- Modern browser support (for automation)
- Internet connection
- Environment variable configuration

### Cost Considerations
- **Suno.ai:** $0-30/month (depending on usage tier)
- **2Captcha:** ~$1-5/month (varies by CAPTCHA frequency)
- **Infrastructure:** $0-20/month (Vercel free tier or server costs)

## Documentation Resources

### Available Documentation
- **README.md** - English installation and usage guide
- **README_CN.md** - Chinese translation
- **README_RU.md** - Russian translation
- **Interactive Docs** - Swagger UI at /docs
- **Code Examples** - Python and JavaScript samples
- **API Specification** - OpenAPI format

### Getting Started
1. Read the README
2. Deploy to preferred platform
3. Configure environment variables
4. Test with `/api/get_limit` endpoint
5. Generate your first song
6. Integrate into your application

## Support & Community

### Getting Help
- **GitHub Issues** - Bug reports and feature requests
- **README** - Comprehensive setup instructions
- **Demo Site** - Live examples and testing
- **Code Examples** - Sample implementations

### Contributing
- **Open Source** - LGPL-3.0 license
- **Pull Requests** - Community contributions welcome
- **Issue Reporting** - Feedback appreciated
- **Translations** - Help with documentation

### Project Links
- **Repository:** https://github.com/gcui-art/suno-api
- **Demo:** https://suno.gcui.ai
- **Docs:** https://suno.gcui.ai/docs
- **Deploy:** One-click Vercel deployment

## Limitations & Considerations

### Known Limitations
- Dependent on Suno.ai service availability
- CAPTCHA solving adds latency (2-30 seconds)
- Music generation is async (30-90 seconds)
- Unofficial API (could break with Suno.ai updates)
- Requires paid 2Captcha service

### Best Practices
- Use macOS for fewer CAPTCHAs
- Monitor quota to avoid service interruptions
- Handle async generation appropriately
- Implement retry logic for transient failures
- Cache SunoApi instances per cookie

### Legal Considerations
- Unofficial project, no Suno.ai affiliation
- Users responsible for ToS compliance
- Educational/research purpose emphasis
- Open-source license (LGPL-3.0)
