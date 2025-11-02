---
created: 2025-11-02T13:59:08Z
last_updated: 2025-11-02T13:59:08Z
version: 1.0
author: Claude Code PM System
---

# Project Brief

## Project Name
**Suno API** - Open-Source Suno.ai API Integration

## Executive Summary

Suno API is an open-source project that provides RESTful API access to Suno.ai's AI music generation capabilities. Since Suno.ai does not offer an official public API, this project reverse-engineers their web interface and provides a developer-friendly API that can be self-hosted and integrated into applications, AI agents, and automation workflows.

The project solves the critical challenge of CAPTCHA verification through automated browser-based solving using 2Captcha service, making it possible to reliably use Suno.ai programmatically.

## Problem Statement

### The Challenge
Suno.ai is a powerful AI music generation service, but developers face significant barriers:

1. **No Official API** - Suno.ai only provides a web interface
2. **No Automation** - Manual interaction required for music generation
3. **CAPTCHA Barriers** - Frequent hCaptcha challenges block programmatic access
4. **Integration Difficulty** - Cannot integrate into AI agents, bots, or applications
5. **Limited Scalability** - Manual workflow doesn't scale

### Impact on Users
- **AI Agent Developers** - Cannot add music generation to GPTs or AI assistants
- **Application Developers** - Cannot build apps with AI music features
- **Content Creators** - Stuck with manual, time-consuming workflow
- **Researchers** - Cannot conduct automated experiments or studies

## Solution Overview

### What We Built
A self-hosted REST API that:
- Wraps all major Suno.ai functionality
- Automatically handles authentication and CAPTCHA challenges
- Provides OpenAI-compatible endpoints for AI agent integration
- Runs on Vercel, Docker, or local Node.js
- Fully open-source under LGPL-3.0 license

### How It Works
1. Users deploy suno-api to their infrastructure
2. Configure with Suno.ai cookie and 2Captcha API key
3. Make standard REST API calls to generate music
4. suno-api handles CAPTCHA solving automatically via browser automation
5. Returns generated music URLs and metadata

### Key Innovation
**Automated CAPTCHA Solving** - Using Playwright browser automation combined with 2Captcha's worker-based solving service, the API reliably handles hCaptcha challenges that would otherwise block programmatic access.

## Project Scope

### In Scope
- ✅ All major Suno.ai API endpoints
- ✅ Music generation (simple and custom)
- ✅ Lyrics generation
- ✅ Audio extension and stem separation
- ✅ Song concatenation
- ✅ Quota and clip information
- ✅ OpenAI API compatibility
- ✅ Automatic CAPTCHA handling
- ✅ Browser automation (Chromium/Firefox)
- ✅ Self-hosted deployment options
- ✅ Interactive API documentation
- ✅ Code examples (Python, JavaScript)

### Out of Scope
- ❌ Suno.ai account creation or management
- ❌ Payment processing or subscription management
- ❌ Music file storage or hosting
- ❌ Social features or music sharing
- ❌ Mobile applications
- ❌ Managed API service (users self-host)
- ❌ Official Suno.ai affiliation or support

## Success Criteria

### Technical Success
- [x] Successfully generate music via API
- [x] CAPTCHA solving success rate > 90%
- [x] API response time < 500ms (excluding generation)
- [x] Support multiple deployment platforms
- [x] Zero downtime deployments possible

### Adoption Success
- [x] 1000+ GitHub stars (actual: 11.5k+)
- [x] Active community contributions
- [x] Multiple deployment options working
- [x] Positive user feedback
- [x] Featured on Product Hunt

### Documentation Success
- [x] Complete API documentation
- [x] Interactive Swagger UI
- [x] Code examples in 2+ languages
- [x] README in 3+ languages
- [x] Deployment guides for each platform

## Target Audience

### Primary Audience
1. **AI/ML Developers** - Building agents that need music generation
2. **Full-Stack Developers** - Creating apps with music features
3. **Indie Developers** - Side projects and prototypes

### Secondary Audience
4. **Content Creators** - Automating music generation workflows
5. **Researchers** - Studying AI-generated music
6. **Students** - Learning about AI APIs and integration

## Business Model

### Monetization Approach
**Open-Source / Self-Hosted** - No direct monetization

**Cost Structure for Users:**
- Suno.ai subscription ($10-$30/month for Pro plans)
- 2Captcha usage (~$1-3 per 1000 CAPTCHAs)
- Infrastructure costs (Vercel free tier, or server costs)

**Project Sustainability:**
- Community contributions
- GitHub Sponsors (optional)
- Funding.yml for donations

## Timeline & Milestones

### Historical Milestones (Achieved)
- ✅ **Initial Release** - Core API functionality
- ✅ **CAPTCHA Integration** - Automated solving via 2Captcha
- ✅ **OpenAI Compatibility** - Chat completions endpoint
- ✅ **Docker Support** - Containerized deployment
- ✅ **Vercel Deployment** - One-click deploy
- ✅ **Persona API** - Latest feature addition
- ✅ **Production Stability** - Reliable operation at scale

### Current Phase
**Maturity & Optimization** (Ongoing)
- Bug fixes and stability improvements
- Documentation enhancements
- Performance optimization
- Community support

### Future Milestones (Potential)
- ⬜ Webhook support for async notifications
- ⬜ Batch generation capabilities
- ⬜ Advanced music manipulation features
- ⬜ Multi-service support (other AI music platforms)
- ⬜ Analytics and monitoring dashboard

## Key Stakeholders

### Project Maintainer
- **gcui.ai** - Original creator and primary maintainer
- Repository: https://github.com/gcui-art/suno-api

### Contributors
- Community contributors via GitHub pull requests
- Recent notable contributions:
  - sontl - Persona API implementation
  - CharlesCNorton - Documentation fixes
  - gohoski - Docker and browser improvements

### Users
- 11.5k+ GitHub stargazers
- Active deployment users (unknown quantity)
- Demo site visitors at https://suno.gcui.ai

### Dependencies
- **Suno.ai** - Upstream service (no official relationship)
- **2Captcha** - CAPTCHA solving service partner
- **Vercel** - Deployment platform
- **Playwright** - Browser automation framework

## Resources Required

### Technical Resources
- ✅ Next.js framework
- ✅ Playwright browser automation
- ✅ 2Captcha API integration
- ✅ Node.js runtime environment

### Infrastructure Resources
- Vercel hosting (free tier sufficient for small scale)
- OR Docker container environment
- OR Local Node.js server

### Financial Resources
**Per User:**
- Suno.ai subscription: $0-$30/month
- 2Captcha credits: ~$1-5/month (varies by CAPTCHA frequency)
- Infrastructure: $0-$20/month (depends on scale)

### Human Resources
- Maintainer time for issue triage and PR review
- Community contributors for features and fixes
- Users for testing and feedback

## Risks & Mitigations

### Risk 1: Suno.ai API Changes
**Impact:** High - Could break entire project
**Probability:** Medium
**Mitigation:**
- Monitor Suno.ai updates
- Quick response to breaking changes
- Community alerts system

### Risk 2: Increased CAPTCHA Difficulty
**Impact:** High - Reduces usability
**Probability:** Medium
**Mitigation:**
- Use stealth browser techniques
- Optimize 2Captcha integration
- Explore alternative CAPTCHA solvers

### Risk 3: Terms of Service Concerns
**Impact:** High - Legal/ethical issues
**Probability:** Low
**Mitigation:**
- Educational/research purpose framing
- User responsibility for ToS compliance
- Clear documentation disclaimers

### Risk 4: 2Captcha Service Disruption
**Impact:** Medium - CAPTCHA solving fails
**Probability:** Low
**Mitigation:**
- Fallback to alternative services
- Manual CAPTCHA solving option
- Service status monitoring

### Risk 5: Community Fragmentation
**Impact:** Low - Reduced collaboration
**Probability:** Low
**Mitigation:**
- Active maintainer presence
- Clear contribution guidelines
- Regular project updates

## Dependencies

### Critical Dependencies
1. **Suno.ai Service** - Must remain operational
2. **2Captcha Service** - Required for CAPTCHA solving
3. **Playwright** - Browser automation core
4. **Next.js** - Application framework

### Platform Dependencies
- Node.js 18+ runtime
- Modern browser (Chromium/Firefox) for automation
- Network access to suno.com and 2captcha.com

## Legal & Compliance

### License
**LGPL-3.0-or-later** - Free and open-source
- Users can modify and redistribute
- Commercial use allowed
- Must disclose source if distributed
- No warranty provided

### Disclaimers
- Unofficial project, not affiliated with Suno.ai
- Educational and research purposes
- Users responsible for ToS compliance
- No guarantee of continued functionality

### Data Privacy
- No user data stored by suno-api
- Cookies handled client-side
- API requests logged locally only
- No analytics or tracking by default

## Project Statement

> Suno API is an unofficial open-source project that empowers developers to integrate AI music generation into their applications and AI agents. By handling the complex challenges of authentication and CAPTCHA solving, we make Suno.ai's powerful music generation capabilities accessible through a simple, well-documented REST API. This project exists to enable creativity, experimentation, and innovation in the intersection of AI and music.
