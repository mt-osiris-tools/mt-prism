# Install Script Hosting Guide

**Feature**: 003-curl-install
**Purpose**: Document how to host the install.sh script for curl access

## Hosting Options

### Option 1: GitHub Raw URL (Current)

**URL**: `https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh`

**Pros**:
- ✅ Free
- ✅ Automatic updates with main branch
- ✅ No infrastructure needed
- ✅ Version control built-in

**Cons**:
- ⚠️ Depends on GitHub availability
- ⚠️ No custom domain

**Setup**: None required - works automatically

---

### Option 2: GitHub Pages with Custom Domain

**Vanity URL**: `https://install.mt-prism.dev`

**Setup Steps**:

1. **Create GitHub Pages site**:
   ```bash
   # Create gh-pages branch
   git checkout --orphan gh-pages
   git rm -rf .
   ```

2. **Add redirect page**:
   ```html
   <!-- index.html -->
   <!DOCTYPE html>
   <html>
   <head>
     <meta http-equiv="refresh" content="0;url=https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh">
   </head>
   <body>Redirecting to installer...</body>
   </html>
   ```

3. **Add CNAME file**:
   ```
   install.mt-prism.dev
   ```

4. **Configure DNS**:
   - Add CNAME record: `install.mt-prism.dev` → `mt-osiris-tools.github.io`
   - Wait for DNS propagation (~1 hour)

5. **Enable HTTPS**:
   - Go to repository Settings → Pages
   - Enable "Enforce HTTPS"

**Result**: `https://install.mt-prism.dev` redirects to install.sh

---

### Option 3: CDN (CloudFlare, Fastly)

**For Production**: If GitHub has outages

**Setup**:
1. Create CDN distribution
2. Point to GitHub raw URL as origin
3. Configure custom domain
4. Enable caching with short TTL (5 minutes)

**Cost**: Free tier available

---

## Current Setup

**Active URL**: `https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh`

**Usage**:
```bash
curl -fsSL https://raw.githubusercontent.com/mt-osiris-tools/mt-prism/main/install.sh | sh
```

**Status**: ✅ Working (no custom domain needed for MVP)

---

## Recommendations

1. **MVP**: Use GitHub raw URL (current setup)
2. **Production**: Add custom domain via GitHub Pages
3. **Enterprise**: Add CDN for redundancy

**Current approach is sufficient for initial release.**
