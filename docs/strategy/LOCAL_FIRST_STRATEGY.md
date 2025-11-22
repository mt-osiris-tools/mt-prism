# Local-First Development Strategy

**Project**: MT-PRISM
**Focus**: Local developer experience
**Created**: 2025-11-19

## Overview

MT-PRISM is designed to run **100% locally** on developer machines. No servers, no databases, no cloud infrastructure required. Just install, configure API keys, and run.

---

## Core Principles

### 1. **Zero Infrastructure**
- ❌ No servers to deploy
- ❌ No databases to set up
- ❌ No Docker containers required
- ❌ No cloud services needed
- ✅ Just Node.js and npm

### 2. **Simple Installation**
- Single command installation
- No complex dependencies
- Works on macOS, Linux, Windows
- No admin/sudo required

### 3. **Local File Storage**
- All data stored in local `.prism/` directory
- No external databases
- Human-readable YAML files
- Easy to version control

### 4. **Offline-First**
- Works offline (except AI API calls)
- No network dependencies beyond AI providers
- Local caching of results
- Resume workflows after disconnect

### 5. **Fast Iteration**
- Hot reload during development
- Instant feedback
- No deployment delays
- Quick testing cycles

---

## Local Architecture

```
Developer's Machine
├── ~/.prism/                    # Global config (optional)
│   ├── config.yaml
│   └── cache/
│
└── project/
    ├── .prism/                  # Project-specific data
    │   ├── requirements.yaml
    │   ├── components.yaml
    │   ├── gaps.yaml
    │   ├── TDD.md
    │   └── .cache/
    │
    ├── .env                     # Local API keys
    └── prism-config.json        # Project config
```

**No external dependencies!**

---

## Installation (Local Developer)

### Step 1: Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version  # v20.x.x ✓

# Check npm
npm --version   # 10.x.x ✓

# That's it! No other requirements
```

### Step 2: Install MT-PRISM

**Option A: Via npm (simplest)**
```bash
npm install -g @mt-prism/cli
prism --version
```

**Option B: Via platform**
```bash
# Claude Code - via extension marketplace
# Cursor - via extension marketplace
# VS Code - via extension marketplace

# CLI tools
npm install -g @anthropic-ai/claude-code-cli
npm install -g @mt-prism/codex-cli
```

**Option C: From source (for contributors)**
```bash
git clone https://github.com/your-org/mt-prism.git
cd mt-prism
npm install
npm run build
npm link  # Makes 'prism' available globally
```

### Step 3: Configure Locally

```bash
# Create local config
prism init

# This creates:
# - .prism/ directory
# - .env file (with prompts for API keys)
# - prism-config.json (with defaults)
```

Interactive prompts:
```
🚀 MT-PRISM Setup

API Provider (anthropic, openai, google): anthropic
Anthropic API Key: sk-ant-xxxxx
Confluence URL (optional): https://company.atlassian.net
Figma Token (optional): xxxxx

✅ Configuration saved to .env and prism-config.json
✅ Ready to analyze your first PRD!

Try: prism analyze prd ./docs/PRD.md
```

### Step 4: Verify Installation

```bash
# Test basic functionality
prism doctor

Output:
✅ Node.js v20.10.0
✅ npm v10.2.3
✅ MT-PRISM v0.1.0
✅ Anthropic API key configured
✅ .prism/ directory writable
✅ All systems ready!
```

---

## Local Development Workflow

### Day 1: First PRD Analysis

```bash
# 1. Navigate to your project
cd ~/projects/my-app

# 2. Initialize PRISM (one-time)
prism init

# 3. Analyze a PRD
prism analyze prd docs/PRD-Feature-X.md

# Output saved to .prism/requirements.yaml
# View it:
cat .prism/requirements.yaml
```

**Time to first result**: < 5 minutes including setup!

### Day-to-Day Usage

```bash
# Morning: Analyze new PRD
prism analyze prd https://company.atlassian.net/wiki/pages/123

# Afternoon: Analyze Figma
prism analyze figma https://figma.com/file/abc/Feature-X

# Validate
prism validate

# Review gaps locally
cat .prism/gaps.yaml
code .prism/gaps.yaml  # Open in VS Code

# Generate TDD
prism generate tdd

# Review TDD
cat .prism/TDD.md
```

**All data stays local!**

### Sharing with Team

```bash
# Option 1: Commit to git
git add .prism/
git commit -m "feat: add PRISM analysis for Feature X"
git push

# Option 2: Share specific files
cp .prism/requirements.yaml docs/requirements.yaml
cp .prism/TDD.md docs/TDD.md

# Option 3: Export to Confluence (via MCP)
prism export confluence --page "Technical Design: Feature X"
```

---

## Local File Structure

### Project Directory

```
my-project/
├── .prism/                      # MT-PRISM workspace
│   ├── requirements.yaml        # Extracted requirements
│   ├── components.yaml          # Figma components
│   ├── gaps.yaml               # Validation gaps
│   ├── clarifications.yaml     # Q&A responses
│   ├── TDD.md                  # Generated TDD
│   ├── api-spec.yaml           # OpenAPI spec
│   ├── database-schema.sql     # DB schema
│   ├── tasks.json              # Task breakdown
│   │
│   ├── .cache/                 # Local cache
│   │   ├── prd-123.json
│   │   └── figma-abc.json
│   │
│   └── .sessions/              # Workflow sessions
│       └── 2025-11-19-feature-x.json
│
├── .env                        # API keys (DO NOT COMMIT)
├── prism-config.json           # PRISM configuration
├── .gitignore                  # Excludes .env, .cache
└── docs/
    ├── PRD-Feature-X.md
    └── requirements.yaml       # Committed version
```

### .gitignore Configuration

```bash
# .gitignore
.env
.prism/.cache/
.prism/.sessions/
*.log
node_modules/

# Commit these for team sharing:
# .prism/requirements.yaml
# .prism/components.yaml
# .prism/gaps.yaml
# .prism/TDD.md
```

---

## Local Configuration

### Environment Variables (.env)

```bash
# AI Provider API Keys
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx

# MCP Service Credentials (optional)
CONFLUENCE_URL=https://company.atlassian.net
CONFLUENCE_TOKEN=xxxxx
FIGMA_TOKEN=xxxxx
JIRA_URL=https://company.atlassian.net
JIRA_TOKEN=xxxxx

# Local Preferences
PRISM_OUTPUT_DIR=.prism
PRISM_LOG_LEVEL=info
PRISM_AUTO_OPEN_TDD=true
```

### Project Configuration (prism-config.json)

```json
{
  "version": "1.0.0",
  "provider": "anthropic",
  "model": "claude-sonnet-4-5",

  "output": {
    "directory": ".prism",
    "format": "yaml",
    "autoOpen": true,
    "commitResults": false
  },

  "mcp": {
    "confluence": {
      "enabled": true,
      "cacheResponses": true
    },
    "figma": {
      "enabled": true,
      "downloadScreenshots": true
    }
  },

  "validation": {
    "autoGenerateQuestions": true,
    "interactiveMode": true
  },

  "tdd": {
    "includeApiSpec": true,
    "includeDatabaseSchema": true,
    "includeTaskBreakdown": true,
    "template": "default"
  },

  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": "100MB"
  }
}
```

---

## Local Development Features

### 1. **Hot Reload** (for development)

```bash
# Start in watch mode
npm run dev

# Changes to code automatically reload
# Instant feedback during development
```

### 2. **Local Caching**

```bash
# Analyze PRD (fetches from Confluence)
prism analyze prd https://company.atlassian.net/wiki/123
# ⏱️ 45 seconds (first time)

# Run again (uses cache)
prism analyze prd https://company.atlassian.net/wiki/123
# ⏱️ 2 seconds (cached!)

# Clear cache if needed
prism cache clear
```

### 3. **Offline Mode**

```bash
# Works offline with local files
prism analyze prd ./docs/PRD.md        # ✅ Works
prism analyze figma ./figma-export.json # ✅ Works

# Requires network (graceful fallback)
prism analyze prd https://confluence... # ❌ Shows offline error
```

### 4. **Local Testing**

```bash
# Run tests locally
npm test

# Watch mode for TDD
npm test -- --watch

# Coverage report
npm test -- --coverage
open coverage/index.html  # View in browser
```

### 5. **Quick Debugging**

```bash
# Verbose output
prism analyze prd ./PRD.md --verbose

# Debug mode
prism analyze prd ./PRD.md --debug

# Dry run (no API calls)
prism analyze prd ./PRD.md --dry-run
```

---

## No External Dependencies

### What We DON'T Require

❌ Docker
❌ Kubernetes
❌ PostgreSQL / MySQL / MongoDB
❌ Redis
❌ RabbitMQ / Kafka
❌ Elasticsearch
❌ Web server (nginx, Apache)
❌ Cloud storage (S3, GCS)
❌ Authentication server
❌ Load balancer
❌ Monitoring services

### What We DO Require

✅ Node.js 18+ (developer already has this)
✅ npm (comes with Node.js)
✅ AI Provider API key (free tier available)
✅ (Optional) Confluence/Figma access

**That's it!**

---

## Local Performance

### Target Performance (Local Machine)

| Operation | Target | Typical |
|-----------|--------|---------|
| Installation | < 2 min | 1m 30s |
| First run setup | < 5 min | 3m |
| PRD analysis | < 2 min | 1m 45s |
| Figma analysis | < 3 min | 2m 15s |
| Validation | < 3 min | 1m 52s |
| TDD generation | < 5 min | 3m 45s |
| **Full workflow** | **< 20 min** | **~17 min** |

### Hardware Requirements

**Minimum**:
- CPU: 2 cores
- RAM: 4GB
- Disk: 500MB free
- Network: Internet connection for AI APIs

**Recommended**:
- CPU: 4+ cores
- RAM: 8GB+
- Disk: 2GB free (for caching)
- Network: Broadband connection

**Runs on**:
- MacBook Air M1 ✅
- Dell XPS 13 ✅
- Windows Desktop ✅
- Linux laptop ✅
- Even Raspberry Pi 4! ✅

---

## Local Troubleshooting

### Common Issues

#### Issue 1: Installation fails

```bash
# Problem: npm install fails
npm ERR! permission denied

# Solution: Don't use sudo, use local install
npm install -g @mt-prism/cli --prefix ~/.local
export PATH="$HOME/.local/bin:$PATH"
```

#### Issue 2: API key not found

```bash
# Problem: API key error
Error: ANTHROPIC_API_KEY not found

# Solution: Check .env file exists
ls -la .env
cat .env | grep ANTHROPIC

# Or set temporarily
export ANTHROPIC_API_KEY=sk-ant-xxxxx
prism analyze prd ./PRD.md
```

#### Issue 3: Permission denied for .prism/

```bash
# Problem: Cannot write to .prism/
Error: EACCES: permission denied, mkdir '.prism'

# Solution: Fix permissions
chmod -R 755 .
mkdir .prism
```

#### Issue 4: Port already in use (if running server)

```bash
# Problem: Port 3000 in use
Error: listen EADDRINUSE: address already in use :::3000

# Solution: Use different port
PRISM_PORT=3001 prism server
```

---

## Local Security

### Best Practices

1. **Never commit API keys**
```bash
# Always add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
```

2. **Use environment variables**
```bash
# Good: Use .env
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Bad: Hardcode in config
# prism-config.json
# { "apiKey": "sk-ant-xxxxx" }  # ❌ DON'T DO THIS
```

3. **Rotate keys regularly**
```bash
# Every 90 days, generate new API keys
# Update .env
# Old keys automatically invalidated
```

4. **Use separate keys per project**
```bash
# Project A: Use API key A
# Project B: Use API key B
# Easier to track usage and revoke if needed
```

5. **Local file permissions**
```bash
# Restrict .env to current user only
chmod 600 .env

# Verify
ls -la .env
# -rw------- 1 user user 123 Nov 19 10:00 .env
```

---

## Local Development Setup (5 Minutes)

### Complete Setup Guide

```bash
# 1. Install Node.js (if not already)
# Download from: https://nodejs.org/
node --version  # Verify: v18+ ✓

# 2. Install MT-PRISM
npm install -g @mt-prism/cli

# 3. Navigate to your project
cd ~/projects/my-app

# 4. Initialize
prism init
# Follow prompts to enter API keys

# 5. Test with example
prism analyze prd https://example.com/sample-prd.md

# 6. Done! ✅
```

**Time**: 5 minutes
**Cost**: $0 (except AI API usage)
**Complexity**: Very Low

---

## Local vs Cloud Comparison

| Feature | Local (MT-PRISM) | Cloud Alternative |
|---------|------------------|-------------------|
| **Setup Time** | 5 minutes | Days/weeks |
| **Cost** | $0 infra + AI API | $500-5000/month |
| **Maintenance** | Zero | High |
| **Dependencies** | Node.js only | 10+ services |
| **Deployment** | None needed | Complex CI/CD |
| **Scaling** | Instant (just run) | Complex setup |
| **Data Privacy** | Local only | Stored in cloud |
| **Offline** | Mostly works | No |
| **Team Setup** | npm install | Onboarding docs |
| **Debugging** | Local logs | Cloud logs/metrics |

**Winner**: Local! 🏆

---

## Local Team Workflows

### Scenario 1: Solo Developer

```bash
# Day 1: Setup (one-time)
cd ~/projects/new-feature
prism init

# Day 2-5: Development
prism analyze prd docs/PRD.md
prism analyze figma https://figma.com/...
prism validate
prism generate tdd

# Review locally
code .prism/TDD.md

# Commit results
git add .prism/TDD.md docs/requirements.yaml
git commit -m "feat: add technical design"
```

### Scenario 2: Small Team (2-5 people)

```bash
# PM: Creates PRD
# Saves to: docs/PRD-Feature-X.md
git add docs/PRD-Feature-X.md
git commit -m "docs: add PRD for Feature X"

# Dev 1: Analyzes PRD locally
git pull
prism analyze prd docs/PRD-Feature-X.md
git add .prism/requirements.yaml
git commit -m "feat: extract requirements for Feature X"

# Designer: Shares Figma link in PR
# Dev 2: Analyzes Figma locally
prism analyze figma https://figma.com/...
git add .prism/components.yaml
git commit -m "feat: extract Figma components"

# Dev 3: Validates & generates TDD locally
git pull
prism validate
prism generate tdd
git add .prism/
git commit -m "feat: generate TDD for Feature X"

# All work done locally! No server needed!
```

### Scenario 3: Larger Team (5+ people)

```bash
# Shared git repo workflow
# Everyone runs MT-PRISM locally
# Results committed to git
# No central server required!

# Optional: CI/CD runs PRISM too
# .github/workflows/prism.yml
# Validates PRDs on every commit
```

---

## Local CI/CD (GitHub Actions)

Even CI/CD runs "locally" on GitHub runners:

```yaml
# .github/workflows/prism-local.yml
name: Local PRISM Analysis

on:
  push:
    paths:
      - 'docs/PRD-*.md'

jobs:
  analyze:
    runs-on: ubuntu-latest  # "Local" to GitHub

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install MT-PRISM
        run: npm install -g @mt-prism/cli

      - name: Analyze PRD
        run: |
          prism analyze prd docs/PRD-*.md \
            --output .prism/requirements.yaml
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Commit results
        run: |
          git config user.name "PRISM Bot"
          git config user.email "bot@prism.dev"
          git add .prism/
          git commit -m "chore: update PRISM analysis"
          git push
```

**No servers deployed! Runs on GitHub's "local" runner!**

---

## Local Development Best Practices

### 1. Keep Everything Local

```bash
# ✅ Good: Local files
prism analyze prd ./docs/PRD.md
prism analyze figma ./figma-export.json

# ⚠️ OK: Remote but cached
prism analyze prd https://confluence...

# ❌ Avoid: Unnecessary remote deps
# (We don't even have any!)
```

### 2. Version Control Results

```bash
# Commit human-readable outputs
git add .prism/requirements.yaml
git add .prism/TDD.md
git add .prism/api-spec.yaml

# Ignore cache and logs
# .gitignore
.prism/.cache/
.prism/.sessions/
*.log
```

### 3. Use Local Testing

```bash
# Test locally before committing
npm test

# Lint locally
npm run lint

# Type check locally
npm run type-check

# Build locally
npm run build
```

### 4. Share via Git, Not Servers

```bash
# ✅ Share via git
git add .prism/TDD.md
git commit -m "docs: add TDD"
git push

# ✅ Share via file
cp .prism/TDD.md docs/TDD-Feature-X.md

# ❌ Don't deploy to server
# (No server to deploy to!)
```

---

## Local-First Architecture Diagram

```
┌─────────────────────────────────────────────┐
│         Developer's Machine                  │
│                                              │
│  ┌────────────────────────────────────┐    │
│  │     MT-PRISM CLI / Extension        │    │
│  │  - No server process                │    │
│  │  - Just runs when called            │    │
│  │  - Exits when done                  │    │
│  └────────────────────────────────────┘    │
│                  │                           │
│                  ↓                           │
│  ┌────────────────────────────────────┐    │
│  │       Local File System             │    │
│  │  .prism/                            │    │
│  │  ├── requirements.yaml              │    │
│  │  ├── components.yaml                │    │
│  │  ├── TDD.md                         │    │
│  │  └── .cache/                        │    │
│  └────────────────────────────────────┘    │
│                                              │
└─────────────────────────────────────────────┘
                    │
                    │ (Only when needed)
                    ↓
      ┌─────────────────────────────┐
      │   External APIs (Optional)   │
      │  - Claude API                │
      │  - Confluence API            │
      │  - Figma API                 │
      └─────────────────────────────┘

NO SERVERS • NO DATABASES • NO DOCKER • NO CLOUD
```

---

## Why Local-First Wins

### For Developers

✅ **Simple**: npm install and you're done
✅ **Fast**: No network latency
✅ **Private**: Data stays on your machine
✅ **Reliable**: No server downtime
✅ **Cheap**: $0 infrastructure cost
✅ **Debuggable**: Local logs, local files
✅ **Testable**: Run tests locally
✅ **Portable**: Works anywhere Node.js runs

### For Teams

✅ **No DevOps**: No servers to manage
✅ **No Ops**: No monitoring, no alerts
✅ **No Bills**: No cloud infrastructure costs
✅ **Easy Onboarding**: "npm install" is the entire setup
✅ **Git-Native**: Everything in version control
✅ **Works Offline**: Continue working on plane/train

### For Organizations

✅ **Security**: Data never leaves developer machines
✅ **Compliance**: No data in third-party clouds
✅ **Cost**: Eliminate infrastructure spend
✅ **Agility**: No deployment processes
✅ **Reliability**: No single point of failure

---

## Future: Still Local-First

Even as we add features, we stay local:

### v1.1.0: Performance Optimizations
- ✅ Still local
- ✅ Better local caching
- ✅ Faster local processing

### v1.2.0: Team Collaboration Features
- ✅ Still local
- ✅ Share via git
- ✅ Optional: Local webhooks

### v2.0.0: Multi-Language Support
- ✅ Still local
- ✅ More local language models
- ✅ Local translation cache

**Local-first forever!** 🏡

---

## Summary

MT-PRISM is **designed for local development**:

- ✅ Install in 5 minutes
- ✅ Zero infrastructure
- ✅ Works offline (mostly)
- ✅ Data stays local
- ✅ Git-native workflow
- ✅ No servers to manage
- ✅ Fast iteration
- ✅ Simple debugging
- ✅ Team-friendly

**Perfect for developers who want to get work done, not manage infrastructure!** 🚀
