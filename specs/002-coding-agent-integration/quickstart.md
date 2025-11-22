# Quickstart: Agent Mode

**Feature**: Coding Agent Integration
**Audience**: Developers using Claude Code, Cursor, GitHub Copilot, or Codex
**Setup Time**: < 5 minutes

## What This Enables

Use MT-PRISM with your existing coding agent configuration instead of managing separate API keys. The system automatically detects which agent you're using and selects the matching provider.

## Prerequisites

You must already have ONE of the following configured:
- ✅ Claude Code with Anthropic API key
- ✅ OpenAI Codex with OpenAI API key
- ✅ Cursor IDE (will guide you to configure underlying provider)
- ✅ GitHub Copilot (will guide you to configure OpenAI)

## Quick Setup (3 Steps)

### Step 1: Enable Auto-Detection

**Option A - Zero Configuration** (Recommended):
```bash
# Just run MT-PRISM - it will auto-detect your environment
npm run test:prd
```

**Option B - Explicit Configuration**:
```bash
# Create .env file
cp .env.example .env

# Edit .env and set:
AI_PROVIDER=auto              # Enable auto-detection
AGENT_MODE=auto               # Or 'explicit' with PREFERRED_AGENT
```

### Step 2: Verify Detection

Run any MT-PRISM skill and check the output:

```bash
npm run test:prd
```

Expected output:
```
🤖 Initializing AI provider...
   Detected: Claude Code environment
   Using: Anthropic Claude (claude-sonnet-4-5-20250929)
```

### Step 3: Run Analysis

That's it! MT-PRISM will now use your coding agent's configured provider automatically.

## Configuration Options

### Auto-Detection (Default)

```bash
# .env
AI_PROVIDER=auto
```

Detection priority order:
1. Claude Code (if `TERM=not\na\ntty`)
2. Codex (if `CODEX_SESSION` exists)
3. Cursor (if `.cursor/` directory exists)
4. Copilot (if VS Code extension detected)

### Explicit Agent

```bash
# .env
AGENT_MODE=explicit
PREFERRED_AGENT=claude-code
```

Forces specific agent, skips auto-detection.

### Per-Skill Overrides

Use different providers for different skills:

```bash
# .env
AI_PROVIDER=auto                    # Auto-detect for most skills
TDD_GENERATOR_PROVIDER=anthropic    # Force Anthropic for TDD generation
FIGMA_ANALYZER_PROVIDER=openai      # Force OpenAI for Figma analysis
```

### Disable Agent Mode

```bash
# .env
AGENT_MODE=disabled
```

Falls back to standard API provider selection (ignores agent detection).

## Environment-Specific Instructions

### Using Claude Code

**Already configured?** You're done!
- MT-PRISM automatically detects Claude Code
- Uses your existing `ANTHROPIC_API_KEY`
- No additional configuration needed

**Not configured?**
```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Using Cursor

**Cursor detected, but you need to configure the underlying provider**:

```bash
# Check which model Cursor is using in Settings → Models
# Then configure that provider:

# If Cursor uses Claude:
ANTHROPIC_API_KEY=sk-ant-api03-...

# If Cursor uses GPT-4:
OPENAI_API_KEY=sk-...

# If Cursor uses Gemini:
GOOGLE_API_KEY=AIza...
```

### Using GitHub Copilot

**Copilot detected, configure OpenAI as the provider**:

```bash
# .env
OPENAI_API_KEY=sk-...
```

GitHub Copilot uses OpenAI's GPT models, so configuring OpenAI provider gives you the same models.

### Using Codex

**Already configured?** You're done!
- MT-PRISM automatically detects Codex
- Uses your existing `OPENAI_API_KEY`
- No additional configuration needed

**Not configured?**
```bash
# Add to .env
OPENAI_API_KEY=sk-...
```

## Fallback Behavior

### When Agent Detection Fails

If no agent is detected, MT-PRISM falls back to standard provider selection:
1. Try Anthropic (if `ANTHROPIC_API_KEY` exists)
2. Try OpenAI (if `OPENAI_API_KEY` exists)
3. Try Google (if `GOOGLE_API_KEY` exists)
4. Error if no providers configured

You'll see:
```
⚠️  No coding agent detected
   Falling back to configured API providers
   Using: Anthropic Claude (claude-sonnet-4-5-20250929)
```

### Disable Fallback

Force agent-only mode (fail if no agent detected):

```bash
# .env
AGENT_MODE=explicit
PREFERRED_AGENT=claude-code
ENABLE_AGENT_FALLBACK=false
```

## Troubleshooting

### "No coding agent detected"

**Possible causes**:
- Not running in Claude Code, Cursor, Copilot, or Codex environment
- Agent detection failed (env vars not set)

**Solution**:
1. Check which coding agent you're using
2. Verify it's one of the supported agents
3. Set `PREFERRED_AGENT` explicitly if auto-detection fails
4. Or configure API keys directly (fallback behavior)

### "Agent detected but provider failed"

**Example**:
```
   Detected: Claude Code environment
   Using: Anthropic Claude (claude-sonnet-4-5-20250929)
❌ Provider failed: Authentication failed
```

**Cause**: Agent detected but API key not configured

**Solution**:
```bash
# Add the matching API key to .env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### "Wrong provider selected"

**Example**: Running in Cursor but MT-PRISM selected OpenAI (you want Claude)

**Solution**:
```bash
# Override auto-detection
PREFERRED_AGENT=cursor
ANTHROPIC_API_KEY=sk-ant-api03-...  # Configure the provider you want
```

Or:
```bash
# Skip agent detection entirely
AGENT_MODE=disabled
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Advanced Usage

### Debug Agent Detection

```bash
# Enable debug logging
DEBUG=true npm run test:prd
```

Output will show:
```
[DEBUG] Agent detection started
[DEBUG] Checking Claude Code (TERM check)... ✓ Found
[DEBUG] Confidence: 0.95
[DEBUG] Recommended provider: anthropic
[DEBUG] Fallback available: true
```

### Test Detection Without Running Analysis

```bash
# Create a simple test script
node -e "import { detectAgent } from './src/utils/agent-detector.js'; detectAgent().then(console.log)"
```

### Multiple Environments

If you switch between environments (e.g., Claude Code and Cursor):

```bash
# Detection is cached per process
# Restart to trigger re-detection

# Or force re-detection
FORCE_AGENT_DETECTION=true npm run test:prd
```

## Next Steps

After successful setup:
1. ✅ Run PRD analysis with agent mode
2. ✅ Verify correct provider is selected
3. ✅ Check performance and accuracy
4. ✅ Configure per-skill overrides if needed
5. ✅ Set up fallback API keys for reliability

## Support

**Documentation**: See [LLM_PROVIDER_GUIDE.md](../../../docs/integration/LLM_PROVIDER_GUIDE.md)
**Issues**: Report at project repository
**Examples**: See `scripts/test-prd-analyzer.ts` for usage
