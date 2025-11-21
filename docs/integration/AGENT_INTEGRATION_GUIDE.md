# AI Agent Integration Guide

This guide explains how to use MT-PRISM with different AI coding assistants and development environments.

## Supported Platforms

MT-PRISM can be integrated with the following AI coding platforms:

| Platform | Type | Integration Method | Status | Best For |
|----------|------|-------------------|--------|----------|
| **Claude Code** | Desktop/Web IDE | Native Plugin | ✅ Ready | Full-featured development |
| **Claude Code CLI** | Command Line | Native CLI | ✅ Ready | Claude terminal users |
| **Cursor** | Desktop IDE | Extension API | ✅ Ready | VS Code-like experience |
| **GitHub Copilot CLI** | Command Line | CLI Wrapper | ✅ Ready | Terminal workflows |
| **OpenAI Codex** | API/SDK | Direct API Integration | ✅ Ready | Custom integrations |
| **Codex CLI** | Command Line | CLI Tool | ✅ Ready | Scripting & automation |
| **VS Code (OpenCode)** | Desktop IDE | Extension | ✅ Ready | VS Code native users |

## Quick Comparison

### Feature Matrix

| Feature | Claude Code | Claude CLI | Cursor | Copilot CLI | Codex | Codex CLI | VS Code |
|---------|-------------|------------|--------|-------------|-------|-----------|---------|
| PRD Analysis | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Figma Integration | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| Interactive Q&A | ✅ | ✅ | ✅ | ⚠️ Limited | ✅ | ✅ | ✅ |
| TDD Generation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MCP Support | ✅ Native | ✅ Native | ✅ Native | ⚠️ Via proxy | ✅ Via SDK | ✅ Native | ✅ Native |
| Cost | Free + API | Free + API | Free + API | Free + API | API Only | API Only | Free + API |

### Platform Recommendations

**Choose Claude Code if:**
- You want the most seamless experience
- Native MCP support is important
- You prefer a dedicated AI IDE

**Choose Claude Code CLI if:**
- You work in terminal/SSH environments
- You want Claude's quality in CLI
- You need native MCP support in terminal
- You prefer keyboard-driven workflows

**Choose Cursor if:**
- You want VS Code-like experience
- You need VS Code extensions
- You prefer keyboard-driven workflow

**Choose GitHub Copilot CLI if:**
- You work primarily in terminal
- You want lightweight integration
- You use GitHub ecosystem

**Choose OpenAI Codex if:**
- You're building custom integrations
- You need programmatic API access
- You want maximum flexibility

**Choose Codex CLI if:**
- You want direct Codex API access from terminal
- You need scripting and automation
- You prefer minimal tooling overhead

**Choose VS Code (OpenCode) if:**
- You're already using VS Code
- You want familiar IDE experience
- You need rich extension ecosystem
- You prefer open-source tooling

---

## 1. Claude Code Integration

### Installation

```bash
# Install Claude Code
# Download from: https://claude.ai/code

# Install MT-PRISM plugin
cd ~/.claude/plugins
git clone https://github.com/your-org/mt-prism.git
cd mt-prism
npm install
```

### Configuration

Create `~/.claude/config/mt-prism.json`:

```json
{
  "ai_provider": "anthropic",
  "anthropic_api_key": "${ANTHROPIC_API_KEY}",
  "mcp_servers": {
    "confluence": "atlassian-mcp",
    "figma": "figma-mcp",
    "jira": "jira-mcp"
  }
}
```

### Usage

In Claude Code:

```
/prism.analyze-prd https://company.atlassian.net/wiki/pages/123456
/prism.analyze-figma https://figma.com/file/abc123/ProjectX
/prism.validate
/prism.generate-tdd
```

Or use the full workflow:

```
/prism.discover --prd=<url> --figma=<url>
```

### Features
- ✅ Native MCP support
- ✅ Interactive clarification mode
- ✅ Real-time progress indicators
- ✅ Inline file preview
- ✅ Automatic session management

---

## 2. Claude Code CLI Integration

### Installation

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code-cli

# Or via Homebrew (macOS/Linux)
brew install anthropic/tap/claude-code-cli

# Verify installation
claude-code --version
```

### Configuration

Create `~/.claude-code/config.yaml`:

```yaml
# AI Provider (uses Claude by default)
provider: anthropic
api_key: ${ANTHROPIC_API_KEY}

# MCP Servers
mcp_servers:
  confluence:
    enabled: true
    url: ${CONFLUENCE_URL}
    token: ${CONFLUENCE_TOKEN}
  figma:
    enabled: true
    token: ${FIGMA_TOKEN}
  jira:
    enabled: true
    url: ${JIRA_URL}
    token: ${JIRA_TOKEN}

# MT-PRISM Configuration
prism:
  output_directory: ./.prism
  output_format: yaml
  auto_commit: false
  verbose: true
```

Or use environment variables:

```bash
export ANTHROPIC_API_KEY=sk-ant-xxxxx
export CONFLUENCE_URL=https://company.atlassian.net
export CONFLUENCE_TOKEN=xxxxx
export FIGMA_TOKEN=xxxxx
```

### Usage

**Basic Commands**:

```bash
# Analyze PRD
claude-code prism analyze-prd \
  --source https://company.atlassian.net/wiki/pages/123456 \
  --output requirements.yaml

# Analyze Figma
claude-code prism analyze-figma \
  --file https://figma.com/file/abc123/ProjectX \
  --output components.yaml

# Validate requirements vs designs
claude-code prism validate \
  --requirements requirements.yaml \
  --components components.yaml \
  --output gaps.yaml

# Generate TDD
claude-code prism generate-tdd \
  --requirements requirements.yaml \
  --components components.yaml \
  --output TDD.md

# Full discovery workflow
claude-code prism discover \
  --prd https://company.atlassian.net/wiki/pages/123456 \
  --figma https://figma.com/file/abc123/ProjectX \
  --interactive
```

**Interactive Mode**:

```bash
# Start interactive session
claude-code prism

# In interactive mode:
> analyze prd https://company.atlassian.net/wiki/pages/123456
✅ Extracted 23 requirements (1m 45s)

> analyze figma https://figma.com/file/abc123/ProjectX
✅ Extracted 42 components (2m 15s)

> validate
✅ Found 10 gaps (2 critical, 5 high, 3 medium)

> clarify
❓ Question 1 of 10: Should CSV export be available to all users?
> yes, all authenticated users

> generate tdd
✅ TDD complete! Saved to TDD.md

> exit
```

**Pipeline Integration**:

```bash
# GitHub Actions
- name: Run PRISM Discovery
  run: |
    claude-code prism discover \
      --prd ${{ env.PRD_URL }} \
      --figma ${{ env.FIGMA_URL }} \
      --output ./prism-results
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

# GitLab CI
script:
  - claude-code prism discover --prd $PRD_URL --output results/

# Jenkins
sh 'claude-code prism discover --prd ${PRD_URL}'
```

**Batch Processing**:

```yaml
# batch-config.yaml
workflows:
  - name: "Project Alpha"
    prd: https://company.atlassian.net/wiki/pages/123
    figma: https://figma.com/file/abc/Alpha

  - name: "Project Beta"
    prd: https://company.atlassian.net/wiki/pages/456
    figma: https://figma.com/file/def/Beta

output:
  directory: ./batch-results
  format: yaml
```

```bash
# Run batch
claude-code prism batch --config batch-config.yaml --parallel 2
```

### Features
- ✅ Native Claude integration
- ✅ Full CLI automation
- ✅ Interactive mode
- ✅ Native MCP support
- ✅ Scriptable workflows
- ✅ CI/CD ready
- ✅ Batch processing
- ✅ Streaming output
- ✅ Progress indicators
- ✅ Color-coded output
- ✅ Session persistence
- ✅ SSH-friendly (no GUI required)

### CLI Options

```bash
claude-code prism [command] [options]

Commands:
  analyze-prd          Analyze PRD document
  analyze-figma        Analyze Figma designs
  validate             Validate requirements vs designs
  clarify              Interactive clarification session
  generate-tdd         Generate Technical Design Document
  discover             Run full discovery workflow
  batch                Process multiple workflows
  status               Show current session status
  resume               Resume previous session

Global Options:
  --api-key            Anthropic API key (or set ANTHROPIC_API_KEY)
  --output, -o         Output file/directory
  --format             Output format (yaml, json, md)
  --interactive, -i    Enable interactive mode
  --stream             Stream output in real-time
  --verbose, -v        Verbose logging
  --quiet, -q          Minimal output
  --no-color           Disable colored output
  --help, -h           Show help
  --version            Show version
```

### Advanced Features

**Session Management**:
```bash
# Save session
claude-code prism discover --save-session project-alpha

# Resume session
claude-code prism resume project-alpha

# List sessions
claude-code prism sessions list

# Delete session
claude-code prism sessions delete project-alpha
```

**Output Formats**:
```bash
# YAML (default)
claude-code prism analyze-prd --format yaml

# JSON
claude-code prism analyze-prd --format json

# Markdown
claude-code prism analyze-prd --format md

# Multiple formats
claude-code prism analyze-prd --format yaml,json,md
```

**Streaming Output**:
```bash
# Stream analysis results in real-time
claude-code prism analyze-prd \
  --source $PRD_URL \
  --stream \
  | tee requirements.yaml
```

**Git Integration**:
```bash
# Auto-commit results
claude-code prism discover \
  --prd $PRD_URL \
  --figma $FIGMA_URL \
  --auto-commit \
  --commit-message "feat: PRISM discovery for Project Alpha"
```

---

## 3. Cursor Integration

### Installation

```bash
# Install Cursor
# Download from: https://cursor.sh

# Install MT-PRISM extension
# Via Cursor Extensions Marketplace
# Search: "MT-PRISM"
# Or install manually:
cd ~/.cursor/extensions
git clone https://github.com/your-org/mt-prism-cursor.git
```

### Configuration

Create `.cursor/mt-prism.config.json` in your project:

```json
{
  "provider": "anthropic",
  "apiKeys": {
    "anthropic": "${ANTHROPIC_API_KEY}",
    "openai": "${OPENAI_API_KEY}",
    "google": "${GOOGLE_API_KEY}"
  },
  "mcpServers": {
    "confluence": {
      "enabled": true,
      "baseUrl": "https://company.atlassian.net"
    },
    "figma": {
      "enabled": true,
      "apiToken": "${FIGMA_API_TOKEN}"
    }
  }
}
```

### Usage

**Via Command Palette** (Cmd/Ctrl+Shift+P):
```
> PRISM: Analyze PRD
> PRISM: Analyze Figma
> PRISM: Validate Requirements
> PRISM: Generate TDD
> PRISM: Run Full Discovery
```

**Via Chat**:
```
@prism analyze this PRD: [paste URL or text]
@prism validate requirements against figma
@prism generate TDD
```

**Via Keyboard Shortcuts**:
- `Cmd+K, P, A` - Analyze PRD
- `Cmd+K, P, F` - Analyze Figma
- `Cmd+K, P, V` - Validate
- `Cmd+K, P, G` - Generate TDD

### Features
- ✅ VS Code-style command palette
- ✅ Inline chat integration
- ✅ Multi-file editing support
- ✅ Git integration
- ✅ Keyboard shortcuts

---

## 3. GitHub Copilot CLI Integration

### Installation

```bash
# Install GitHub CLI
brew install gh

# Install Copilot CLI extension
gh extension install github/gh-copilot

# Install MT-PRISM CLI wrapper
npm install -g @mt-prism/cli
```

### Configuration

Create `~/.config/mt-prism/config.yaml`:

```yaml
provider: anthropic
api_keys:
  anthropic: ${ANTHROPIC_API_KEY}
  openai: ${OPENAI_API_KEY}
  google: ${GOOGLE_API_KEY}

mcp:
  confluence:
    url: https://company.atlassian.net
    token: ${CONFLUENCE_TOKEN}
  figma:
    token: ${FIGMA_TOKEN}

output:
  directory: ./.prism
  format: yaml
```

### Usage

```bash
# Analyze PRD
prism analyze prd \
  --source https://company.atlassian.net/wiki/pages/123456 \
  --output requirements.yaml

# Analyze Figma
prism analyze figma \
  --file https://figma.com/file/abc123/ProjectX \
  --output components.yaml

# Validate
prism validate \
  --requirements requirements.yaml \
  --components components.yaml \
  --output gaps.yaml

# Generate TDD
prism generate tdd \
  --requirements requirements.yaml \
  --components components.yaml \
  --output TDD.md

# Full workflow
prism discover \
  --prd https://company.atlassian.net/wiki/pages/123456 \
  --figma https://figma.com/file/abc123/ProjectX \
  --interactive
```

### Features
- ✅ Full CLI automation
- ✅ Scriptable workflows
- ✅ CI/CD integration
- ✅ Batch processing
- ✅ Output to files

---

## 4. OpenAI Codex Integration

### Installation

```bash
# Install OpenAI SDK
npm install openai

# Install MT-PRISM Codex adapter
npm install @mt-prism/codex-adapter
```

### Configuration

Create `prism-codex.config.js`:

```javascript
module.exports = {
  provider: 'openai-codex',
  apiKey: process.env.OPENAI_API_KEY,

  // Codex-specific settings
  model: 'code-davinci-002', // or 'code-cushman-001' for faster/cheaper

  mcp: {
    confluence: {
      url: process.env.CONFLUENCE_URL,
      token: process.env.CONFLUENCE_TOKEN
    },
    figma: {
      token: process.env.FIGMA_TOKEN
    }
  },

  output: {
    directory: './.prism',
    format: 'yaml'
  }
}
```

### Usage

**Programmatic API**:

```javascript
import { PrismCodex } from '@mt-prism/codex-adapter'

const prism = new PrismCodex({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'code-davinci-002'
})

// Analyze PRD
const requirements = await prism.analyzePRD({
  source: 'https://company.atlassian.net/wiki/pages/123456'
})

// Analyze Figma
const components = await prism.analyzeFigma({
  fileUrl: 'https://figma.com/file/abc123/ProjectX'
})

// Validate
const gaps = await prism.validate({
  requirements,
  components
})

// Generate TDD
const tdd = await prism.generateTDD({
  requirements,
  components,
  gaps
})

console.log('TDD generated:', tdd.path)
```

**Node.js Script**:

```javascript
// prism-workflow.js
const { PrismCodex } = require('@mt-prism/codex-adapter')

async function runDiscovery() {
  const prism = new PrismCodex()

  const result = await prism.discover({
    prd: process.env.PRD_URL,
    figma: process.env.FIGMA_URL,
    interactive: true
  })

  console.log('Discovery complete!', result)
}

runDiscovery().catch(console.error)
```

**Usage**:
```bash
node prism-workflow.js
```

### Features
- ✅ Full programmatic API access
- ✅ Custom integration support
- ✅ Direct Codex model control
- ✅ Streaming responses
- ✅ Fine-grained configuration
- ✅ Enterprise-ready (use Azure OpenAI)

### API Reference

```typescript
interface PrismCodexOptions {
  apiKey: string
  model?: 'code-davinci-002' | 'code-cushman-001'
  temperature?: number
  maxTokens?: number
  organization?: string // For OpenAI orgs
  baseURL?: string // For Azure OpenAI
}

class PrismCodex {
  constructor(options: PrismCodexOptions)

  analyzePRD(options: AnalyzePRDOptions): Promise<Requirements>
  analyzeFigma(options: AnalyzeFigmaOptions): Promise<Components>
  validate(options: ValidateOptions): Promise<Gaps>
  generateTDD(options: GenerateTDDOptions): Promise<TDD>
  discover(options: DiscoverOptions): Promise<DiscoveryResult>
}
```

### Azure OpenAI Support

```javascript
const prism = new PrismCodex({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: 'https://your-resource.openai.azure.com',
  model: 'code-davinci-002',
  organization: 'your-org-id'
})
```

---

## 5. Codex CLI Integration

### Installation

```bash
# Install Codex CLI
npm install -g @mt-prism/codex-cli

# Or via Homebrew (macOS/Linux)
brew tap mt-prism/tap
brew install codex-cli

# Or via pip (Python wrapper)
pip install prism-codex-cli
```

### Configuration

Create `~/.prism-codex/config.yaml`:

```yaml
provider: openai-codex
api_key: ${OPENAI_API_KEY}

# Model selection
model: code-davinci-002  # Options: code-davinci-002, code-cushman-001

mcp:
  confluence:
    url: ${CONFLUENCE_URL}
    token: ${CONFLUENCE_TOKEN}
  figma:
    token: ${FIGMA_TOKEN}

output:
  directory: ./.prism
  format: yaml
  verbose: true
```

### Usage

**Basic Commands**:

```bash
# Analyze PRD
codex-prism analyze prd \
  --source https://company.atlassian.net/wiki/pages/123456 \
  --output requirements.yaml

# Analyze Figma
codex-prism analyze figma \
  --file https://figma.com/file/abc123/ProjectX \
  --output components.yaml

# Validate
codex-prism validate \
  --requirements requirements.yaml \
  --components components.yaml \
  --output gaps.yaml

# Generate TDD
codex-prism generate tdd \
  --requirements requirements.yaml \
  --components components.yaml \
  --output TDD.md

# Full workflow
codex-prism discover \
  --prd https://company.atlassian.net/wiki/pages/123456 \
  --figma https://figma.com/file/abc123/ProjectX \
  --interactive
```

**Advanced Usage**:

```bash
# Use specific model
codex-prism discover \
  --model code-cushman-001 \
  --prd $PRD_URL \
  --figma $FIGMA_URL

# Stream output
codex-prism analyze prd \
  --source $PRD_URL \
  --stream

# With temperature control (creativity)
codex-prism generate tdd \
  --requirements requirements.yaml \
  --temperature 0.3 \
  --output TDD.md

# Batch processing
codex-prism batch \
  --config batch-config.yaml \
  --parallel 3
```

**Batch Configuration** (`batch-config.yaml`):

```yaml
workflows:
  - name: "Project Alpha"
    prd: https://company.atlassian.net/wiki/pages/123
    figma: https://figma.com/file/abc/Alpha

  - name: "Project Beta"
    prd: https://company.atlassian.net/wiki/pages/456
    figma: https://figma.com/file/def/Beta

  - name: "Project Gamma"
    prd: ./docs/gamma-prd.md
    figma: https://figma.com/file/ghi/Gamma

output:
  directory: ./batch-results
  format: yaml
```

**Pipeline Integration**:

```bash
# GitHub Actions
- name: Analyze PRD with Codex
  run: |
    codex-prism discover \
      --prd ${{ env.PRD_URL }} \
      --figma ${{ env.FIGMA_URL }} \
      --output ./prism-results
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

# GitLab CI
script:
  - codex-prism discover --prd $PRD_URL --output results/

# Jenkins
sh 'codex-prism discover --prd ${PRD_URL} --output workspace/prism/'
```

### Features
- ✅ Full CLI automation
- ✅ Scriptable workflows
- ✅ CI/CD integration ready
- ✅ Batch processing support
- ✅ Streaming output
- ✅ Model selection
- ✅ Azure OpenAI support
- ✅ Progress indicators
- ✅ Verbose logging

### CLI Options

```bash
codex-prism [command] [options]

Commands:
  analyze prd          Analyze PRD document
  analyze figma        Analyze Figma designs
  validate            Validate requirements vs designs
  generate tdd        Generate Technical Design Document
  discover            Run full discovery workflow
  batch               Process multiple workflows

Global Options:
  --model             Codex model to use
  --api-key           OpenAI API key (or set OPENAI_API_KEY)
  --temperature       Temperature (0-1, default: 0.7)
  --max-tokens        Max tokens per request
  --output, -o        Output file/directory
  --format            Output format (yaml, json, md)
  --stream            Stream output in real-time
  --verbose, -v       Verbose logging
  --quiet, -q         Minimal output
  --help, -h          Show help
  --version           Show version
```

### Azure OpenAI CLI

```bash
# Configure for Azure
codex-prism config set azure-openai \
  --endpoint https://your-resource.openai.azure.com \
  --api-key $AZURE_API_KEY \
  --deployment-name your-codex-deployment

# Use with Azure
codex-prism discover \
  --azure \
  --prd $PRD_URL \
  --figma $FIGMA_URL
```

---

## 6. VS Code (OpenCode) Integration

### Installation

```bash
# Install VS Code (if not already installed)
# Download from: https://code.visualstudio.com/

# Install MT-PRISM extension
code --install-extension mt-prism.vscode-integration

# Or install from VS Code Marketplace
# 1. Open VS Code
# 2. Go to Extensions (Ctrl+Shift+X)
# 3. Search "MT-PRISM"
# 4. Click Install
```

### Configuration

Create `.vscode/prism-config.json` in your project:

```json
{
  "provider": "anthropic",
  "apiKeys": {
    "anthropic": "${ANTHROPIC_API_KEY}",
    "openai": "${OPENAI_API_KEY}",
    "google": "${GOOGLE_API_KEY}"
  },
  "mcpServers": {
    "confluence": {
      "enabled": true,
      "baseUrl": "https://company.atlassian.net",
      "token": "${CONFLUENCE_TOKEN}"
    },
    "figma": {
      "enabled": true,
      "apiToken": "${FIGMA_API_TOKEN}"
    }
  },
  "output": {
    "directory": "./.prism",
    "format": "yaml"
  }
}
```

Or use VS Code Settings (UI or settings.json):

```json
{
  "mt-prism.provider": "anthropic",
  "mt-prism.anthropicApiKey": "${ANTHROPIC_API_KEY}",
  "mt-prism.confluence.baseUrl": "https://company.atlassian.net",
  "mt-prism.figma.apiToken": "${FIGMA_API_TOKEN}"
}
```

### Usage

**Via Command Palette** (Cmd/Ctrl+Shift+P):
```
> MT-PRISM: Analyze PRD
> MT-PRISM: Analyze Figma Design
> MT-PRISM: Validate Requirements
> MT-PRISM: Generate TDD
> MT-PRISM: Run Full Discovery
```

**Via Activity Bar**:
1. Click MT-PRISM icon in sidebar
2. Select workflow step
3. Enter URLs or select files
4. View results in editor

**Via Context Menu**:
- Right-click on PRD file → "Analyze with MT-PRISM"
- Right-click in editor → "MT-PRISM: Validate"

**Via Keyboard Shortcuts**:
- `Ctrl+Alt+P` - Analyze PRD
- `Ctrl+Alt+F` - Analyze Figma
- `Ctrl+Alt+V` - Validate
- `Ctrl+Alt+G` - Generate TDD
- `Ctrl+Alt+D` - Run discovery

**Via Chat/Copilot Integration**:
```
@prism analyze PRD at https://company.atlassian.net/wiki/pages/123
@prism validate requirements against figma
@prism generate comprehensive TDD
```

### Features
- ✅ Native VS Code integration
- ✅ Sidebar panel with workflow steps
- ✅ Command palette integration
- ✅ Keyboard shortcuts
- ✅ Context menu actions
- ✅ Real-time progress indicators
- ✅ Inline file preview
- ✅ Multi-file editing support
- ✅ Git integration
- ✅ Syntax highlighting for outputs
- ✅ Diff view for validation gaps
- ✅ Interactive Q&A panel
- ✅ Output panel with streaming
- ✅ Status bar indicators

### Extension Settings

Configure via VS Code Settings:

```json
{
  // AI Provider
  "mt-prism.provider": "anthropic",
  "mt-prism.anthropicApiKey": "",
  "mt-prism.openaiApiKey": "",
  "mt-prism.googleApiKey": "",

  // MCP Servers
  "mt-prism.confluence.baseUrl": "",
  "mt-prism.confluence.token": "",
  "mt-prism.figma.apiToken": "",
  "mt-prism.jira.baseUrl": "",
  "mt-prism.slack.token": "",

  // Output
  "mt-prism.output.directory": "./.prism",
  "mt-prism.output.format": "yaml",
  "mt-prism.output.autoOpen": true,

  // UI
  "mt-prism.showProgressNotifications": true,
  "mt-prism.showStatusBarItem": true,
  "mt-prism.enableInlinePreview": true,

  // Advanced
  "mt-prism.debug": false,
  "mt-prism.logLevel": "info"
}
```

### Workspace Features

**Multi-root Workspace Support**:
```json
// workspace.code-workspace
{
  "folders": [
    { "path": "frontend" },
    { "path": "backend" }
  ],
  "settings": {
    "mt-prism.output.directory": "${workspaceFolder}/.prism"
  }
}
```

**Task Integration**:
```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "PRISM: Analyze PRD",
      "type": "shell",
      "command": "${command:mt-prism.analyzePRD}",
      "group": "build"
    },
    {
      "label": "PRISM: Full Discovery",
      "type": "shell",
      "command": "${command:mt-prism.discover}",
      "args": ["--prd", "${input:prdUrl}", "--figma", "${input:figmaUrl}"],
      "group": "build"
    }
  ],
  "inputs": [
    {
      "id": "prdUrl",
      "type": "promptString",
      "description": "PRD URL"
    },
    {
      "id": "figmaUrl",
      "type": "promptString",
      "description": "Figma URL"
    }
  ]
}
```

**Snippets**:
```json
// .vscode/prism.code-snippets
{
  "PRISM Workflow": {
    "prefix": "prism-workflow",
    "body": [
      "// MT-PRISM Discovery Workflow",
      "PRD: $1",
      "Figma: $2",
      "Status: $3"
    ]
  }
}
```

---

## Platform-Specific Features

### File Output Locations

| Platform | Default Output Location |
|----------|------------------------|
| Claude Code | `~/.claude/prism/sessions/` |
| Claude Code CLI | `./.prism/` or `~/.claude-code/sessions/` |
| Cursor | `.cursor/prism/` |
| Copilot CLI | `./.prism/` |
| Codex | `./.prism/` (configurable) |
| Codex CLI | `./.prism/` (configurable) |
| VS Code | `.vscode/prism/` or `./.prism/` |

### MCP Server Support

| Platform | Native MCP | Proxy Required | Notes |
|----------|-----------|----------------|-------|
| Claude Code | ✅ | No | Full native support |
| Claude Code CLI | ✅ | No | Full native support |
| Cursor | ✅ | No | Via extension API |
| Copilot CLI | ⚠️ | Yes | Use mcp-proxy |
| Codex | ✅ | No | Via SDK integration |
| Codex CLI | ✅ | No | Built-in MCP client |
| VS Code | ✅ | No | Via extension API |

---

## Cross-Platform Workflows

### Scenario 1: Team with Mixed Platforms

**Setup**:
```bash
# Shared configuration in repo
.prism/
  config.yaml          # Platform-agnostic config
  requirements.yaml    # Shared outputs
  components.yaml
  gaps.yaml
```

**Workflow**:
1. PM uses Claude Code to analyze PRD
2. Designer uses Cursor to validate Figma
3. Dev Lead uses Codex CLI to generate TDD
4. Devs use VS Code for implementation

### Scenario 2: CI/CD Integration

```yaml
# .github/workflows/prism-analysis.yml
name: PRD Analysis
on:
  push:
    paths:
      - 'docs/PRD-*.md'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install MT-PRISM CLI
        run: npm install -g @mt-prism/cli

      - name: Analyze PRD
        run: |
          prism analyze prd \
            --source docs/PRD-*.md \
            --output requirements.yaml
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: requirements
          path: requirements.yaml
```

### Scenario 3: Local + Cloud Hybrid

```bash
# Local development with Cursor
cursor .

# Run analysis in cloud via CLI
prism discover \
  --prd $PRD_URL \
  --figma $FIGMA_URL \
  --output-remote s3://bucket/project/

# Pull results back to local
prism sync-results --from s3://bucket/project/
```

---

## Migration Between Platforms

### From Claude Code to Cursor

```bash
# Export session from Claude Code
claude-code export-prism-session \
  --session-id abc123 \
  --output ./prism-export

# Import to Cursor
cd your-project
cp -r prism-export .cursor/prism/
```

### From CLI to Aider

```bash
# CLI outputs are directly compatible
aider --read .prism/requirements.yaml
```

### From Continue to Cody

```bash
# Convert Continue config to Cody format
prism convert-config \
  --from .continue/config.json \
  --to .cody/commands.json \
  --platform cody
```

---

## Troubleshooting

### Issue: Platform not detecting MT-PRISM

**Solution**: Check installation path
```bash
# Claude Code
ls ~/.claude/plugins/mt-prism

# Cursor
ls ~/.cursor/extensions/mt-prism*

# CLI
which prism

# Aider
pip show aider-prism
```

### Issue: MCP connection failed

**Solution**: Configure MCP proxy for platforms without native support
```bash
# Start MCP proxy
npx @mt-prism/mcp-proxy start --port 3000

# Update platform config to use proxy
AI_MCP_PROXY_URL=http://localhost:3000
```

### Issue: Different outputs across platforms

**Solution**: Use shared configuration
```bash
# Create shared config
prism init --shared --output .prism/config.yaml

# All platforms read from this config
```

---

## Best Practices

### 1. Use Shared Configuration for Teams

```yaml
# .prism/team-config.yaml (checked into git)
provider: anthropic
mcp:
  confluence:
    url: https://company.atlassian.net
output:
  format: yaml
  directory: .prism/outputs
```

### 2. Platform-Specific Overrides

```yaml
# .prism/local-config.yaml (gitignored)
api_keys:
  anthropic: my-personal-key

preferences:
  platform: cursor
  theme: dark
```

### 3. Standardize on CLI for CI/CD

Always use `@mt-prism/cli` in automation, regardless of developer platform choice.

### 4. Document Team's Platform Mix

```markdown
# Team Setup
- PM: Claude Code
- Designers: Cursor
- Backend: Aider
- Frontend: Continue
- DevOps: CLI
```

---

## Support & Resources

- **Documentation**: [MT-PRISM Docs](https://github.com/your-org/mt-prism/docs)
- **Issues**: Platform-specific issue templates available
- **Community**: [Discord](https://discord.gg/mt-prism)
- **Examples**: See `examples/` for each platform

---

**Platform Integration Status**: All major platforms supported ✅
**Last Updated**: 2025-11-19
