# Skill Specification: Figma Analyzer

**Skill Name**: `prism.analyze-figma`
**Version**: 1.0
**Status**: Specification
**Owner**: MT-PRISM Team

---

## Overview

The Figma Analyzer skill extracts UI specifications from Figma design files. It parses Figma component trees, identifies design patterns, extracts design tokens, maps components to interactions, and generates a comprehensive component inventory with screenshots.

---

## Purpose & Goals

### Primary Goals
1. **Extract Components**: Identify all components, variants, and instances
2. **Design Tokens**: Extract colors, typography, spacing, shadows, etc.
3. **Pattern Recognition**: Identify UI patterns (forms, modals, tables, etc.)
4. **Component Specs**: Document properties, states, and behaviors
5. **Design System Check**: Compare against design system standards

### Success Criteria
- ✅ 95%+ component extraction accuracy
- ✅ All design tokens correctly identified
- ✅ UI patterns recognized with 90%+ accuracy
- ✅ Processing time < 3 minutes for typical Figma file (20-50 screens)
- ✅ Screenshots generated for all major components

---

## Input Parameters

### Required Parameters

**`--figma-url <url>`** or **`--figma-file-id <id>`**
- Full URL: `https://figma.com/file/abc123def456/ProjectName`
- File ID: `abc123def456`
- Validation: Must be valid Figma file URL or ID

### Optional Parameters

**`--design-system <path>`**
- Path to design system reference (JSON/YAML)
- Used for consistency checking
- Example: `./design-systems/company-ds.yaml`

**`--output-dir <path>`**
- Output directory for generated files
- Default: `./.prism/figma-analysis-{timestamp}/`

**`--format <format>`**
- Output format: `yaml` (default), `json`, `markdown`

**`--generate-screenshots`**
- Boolean flag to generate component screenshots
- Default: `true`

**`--screenshot-scale <number>`**
- Screenshot scale factor (1-4)
- Default: `2` (2x resolution)

**`--page-filter <pattern>`**
- Filter specific pages by name pattern
- Example: `--page-filter "Mobile|Desktop"`
- Default: All pages

**`--component-filter <pattern>`**
- Filter specific components
- Example: `--component-filter "Button|Input"`
- Default: All components

---

## Processing Steps

### Step 1: Fetch Figma File

```typescript
1. Validate Figma URL/ID
2. Use Figma MCP to fetch file:
   - Method: mcp_figma.getFile(fileId)
   - Includes: document structure, canvas, pages, frames
3. Fetch component library:
   - Method: mcp_figma.getFileComponents(fileId)
4. Fetch styles (design tokens):
   - Method: mcp_figma.getFileStyles(fileId)
5. Store raw Figma data for reference
```

### Step 2: Parse Document Structure

```typescript
1. Extract document hierarchy:
   - Pages (usually: Cover, Design, Components, Archive, etc.)
   - Frames (screens/artboards)
   - Component sets
   - Components and variants

2. Build component tree:
   - Parent-child relationships
   - Component instances vs. main components
   - Variant relationships

3. Identify important pages:
   - Prioritize: Design, Components, Patterns
   - Skip: Archive, Old, Draft (unless specified)
```

### Step 3: Extract Components

**For Each Component**:
```typescript
1. Basic Information:
   - Name (e.g., "Button/Primary/Large")
   - Type (Button, Input, Card, Modal, etc.)
   - Description (from Figma component description)

2. Component Properties:
   - Variants (e.g., primary, secondary, disabled)
   - Boolean properties (e.g., hasIcon, isLoading)
   - Text properties (e.g., label)
   - Instance swap properties

3. Visual Properties:
   - Dimensions (width, height, constraints)
   - Colors (fills, strokes)
   - Typography (font, size, weight, line-height)
   - Spacing (padding, gap)
   - Border radius, shadows
   - Effects (blur, etc.)

4. Interactive Properties:
   - States (default, hover, active, disabled, focus)
   - Interactions (on click, on hover, etc.)
   - Transitions and animations

5. Component Composition:
   - Child components
   - Slot patterns (e.g., icon slot, content slot)
   - Layout (auto-layout, flex properties)
```

**Component Classification**:
```typescript
Categories:
  - Atoms: Button, Input, Icon, Text, Image
  - Molecules: SearchBar, Dropdown, Card Header
  - Organisms: Card, Modal, Navbar, Form
  - Templates: Page layouts
  - Pages: Complete screens

Usage Patterns:
  - Navigation: Navbar, Sidebar, Breadcrumb, Tabs
  - Forms: Input, Select, Checkbox, Radio, Form Group
  - Data Display: Table, List, Card, Badge
  - Feedback: Alert, Toast, Modal, Loading
  - Layout: Container, Grid, Stack
```

### Step 4: Extract Design Tokens

```typescript
1. Colors:
   - Primary, secondary, accent colors
   - Semantic colors (success, error, warning, info)
   - Neutral colors (backgrounds, borders, text)
   - Format: Hex, RGB, HSL

2. Typography:
   - Font families
   - Font sizes
   - Font weights
   - Line heights
   - Letter spacing

3. Spacing:
   - Spacing scale (4px, 8px, 16px, 24px, etc.)
   - Common patterns (margin, padding, gap)

4. Shadows:
   - Elevation levels
   - Box shadows

5. Border Radius:
   - Small, medium, large
   - Pill, circle

6. Breakpoints (if specified):
   - Mobile: < 768px
   - Tablet: 768-1024px
   - Desktop: > 1024px
```

**Output Format**:
```json
{
  "colors": {
    "primary": {
      "50": "#e3f2fd",
      "500": "#2196f3",
      "900": "#0d47a1"
    },
    "semantic": {
      "success": "#4caf50",
      "error": "#f44336",
      "warning": "#ff9800",
      "info": "#2196f3"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, sans-serif",
      "mono": "Fira Code, monospace"
    },
    "fontSize": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px"
    }
  },
  "spacing": {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px"
  }
}
```

### Step 5: Identify UI Patterns

```typescript
Pattern Recognition:

1. Forms:
   - Look for: Multiple inputs + button
   - Fields: email, password, text, etc.
   - Validation states
   - Submit buttons

2. Modals/Dialogs:
   - Look for: Overlay + centered content + close button
   - Types: Confirmation, form, info
   - Actions: Primary, secondary, cancel

3. Tables:
   - Look for: Header row + data rows
   - Features: Sorting, filtering, pagination
   - Row actions

4. Cards:
   - Look for: Container with image + text + actions
   - Variants: horizontal, vertical
   - Content: title, description, metadata

5. Navigation:
   - Navbar: Horizontal menu
   - Sidebar: Vertical menu
   - Breadcrumbs: Path navigation
   - Tabs: Section switching

6. Lists:
   - Simple lists
   - Ordered/unordered
   - With icons, avatars
```

### Step 6: Map Components to Screens

```typescript
1. For each screen/frame:
   - List all components used
   - Count component instances
   - Identify missing components

2. Build component usage map:
   {
     "LoginScreen": {
       "components": ["Button", "Input", "Logo", "Link"],
       "count": { "Button": 2, "Input": 2, "Logo": 1, "Link": 3 }
     },
     "DashboardScreen": {
       "components": ["Navbar", "Card", "Table", "Button"],
       "count": { "Navbar": 1, "Card": 6, "Table": 1, "Button": 8 }
     }
   }

3. Identify component coverage:
   - Which screens use which components?
   - Are all components from library being used?
   - Any ad-hoc components not in library?
```

### Step 7: Design System Consistency Check

**If design system reference provided**:
```typescript
1. Color Consistency:
   - Compare extracted colors with design system palette
   - Flag colors not in design system
   - Suggest closest design system color

2. Typography Consistency:
   - Check font families match
   - Verify font sizes from scale
   - Check if custom sizes are used

3. Spacing Consistency:
   - Verify spacing values from scale
   - Flag arbitrary spacing values

4. Component Consistency:
   - Compare component names with design system
   - Check if component variants match
   - Identify missing components

5. Generate consistency report:
   - Compliance score (%)
   - List of deviations
   - Recommendations
```

### Step 8: Generate Screenshots

```typescript
1. For each major component:
   - Use Figma API to export image
   - Format: PNG
   - Scale: 2x (default)
   - Background: Transparent

2. Organize screenshots:
   screenshots/
   ├── atoms/
   │   ├── Button-Primary-Large.png
   │   ├── Button-Secondary-Medium.png
   │   └── Input-Default.png
   ├── molecules/
   │   ├── SearchBar.png
   │   └── Dropdown.png
   └── organisms/
       ├── Card-Product.png
       └── Modal-Confirmation.png

3. Generate thumbnail index (HTML)
```

### Step 9: Generate Outputs

**Primary Output**: `components.yaml`
```yaml
metadata:
  figma_file_id: "abc123def456"
  figma_file_name: "Project X Design System"
  analyzed_at: "2025-11-05T14:30:00Z"
  total_components: 42
  total_screens: 25

components:
  - id: COMP-001
    name: "Button/Primary/Large"
    type: Button
    category: atom
    description: "Primary call-to-action button in large size"

    variants:
      - name: default
        properties:
          width: 200px
          height: 48px
          backgroundColor: "#2196f3"
          color: "#ffffff"
          borderRadius: 8px
          fontSize: 16px
          fontWeight: 600

      - name: hover
        properties:
          backgroundColor: "#1976d2"

      - name: disabled
        properties:
          backgroundColor: "#e0e0e0"
          color: "#9e9e9e"
          cursor: not-allowed

    properties:
      - name: label
        type: text
        default: "Button"
      - name: hasIcon
        type: boolean
        default: false
      - name: isLoading
        type: boolean
        default: false

    composition:
      - type: text
        role: label
      - type: icon
        role: leading-icon
        optional: true

    usage:
      screens: ["Login", "Dashboard", "Settings"]
      count: 15

    design_tokens:
      color: "colors.primary.500"
      spacing: "spacing.4"
      borderRadius: "radius.md"
      typography: "fontSize.base"

    screenshot: "screenshots/atoms/Button-Primary-Large.png"

  - id: COMP-002
    name: "Input/Text/Default"
    type: Input
    category: atom
    # ... more details
```

**Secondary Output**: `design-tokens.json`
```json
{
  "colors": { /* as shown above */ },
  "typography": { /* as shown above */ },
  "spacing": { /* as shown above */ },
  "borderRadius": {
    "none": "0px",
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    "md": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
  }
}
```

**Tertiary Output**: `figma-analysis-report.md`
```markdown
# Figma Analysis Report

**Figma File**: Project X Design System (abc123def456)
**Analyzed**: 2025-11-05 2:30 PM
**Analysis Duration**: 2m 15s

## Summary

- **Total Components**: 42
  - Atoms: 18
  - Molecules: 12
  - Organisms: 10
  - Templates: 2
- **Total Screens**: 25
- **Design Tokens Extracted**:
  - Colors: 32
  - Typography Styles: 12
  - Spacing Values: 10
  - Shadow Styles: 4

## Component Breakdown

### Atoms (18)
- Button (5 variants)
- Input (3 types)
- Icon (120 icons)
- Badge
- Avatar
- ...

### Molecules (12)
- SearchBar
- Dropdown
- Card Header
- ...

## UI Patterns Identified

1. **Forms** (3 screens):
   - Login Form
   - Registration Form
   - Settings Form

2. **Data Tables** (2 screens):
   - User Table (with sorting, pagination)
   - Transaction Table

3. **Modals** (5 types):
   - Confirmation Modal
   - Form Modal
   - Info Modal

## Design System Consistency

✓ **Color Usage**: 95% compliant
  - 30/32 colors from design system
  - 2 custom colors found (flag for review)

✓ **Typography**: 100% compliant
  - All fonts from design system

⚠ **Spacing**: 88% compliant
  - 12 instances of custom spacing
  - Recommend using design system scale

## Component Coverage

| Screen | Components Used | Coverage |
|--------|----------------|----------|
| Login | Button, Input, Link, Logo | 100% |
| Dashboard | Navbar, Card, Table, Chart | 95% |
| Settings | Form, Input, Toggle, Button | 100% |

## Missing Components

Components in design system but not used:
- Tooltip
- Popover
- Skeleton Loader

Components used but not in design system (ad-hoc):
- CustomChart (on Dashboard)
- SpecialButton (on Settings)

## Recommendations

1. **Standardize custom colors**: Use design system colors
2. **Add missing components to library**: CustomChart, SpecialButton
3. **Use spacing scale**: Replace 12 custom spacing values
4. **Consider using**: Tooltip, Popover (in design system but unused)

## Next Steps

1. Review and address design system deviations
2. Run `/prism.validate` to cross-check with PRD requirements
3. Ensure all requirements have corresponding UI components
```

**Quaternary Output**: `screenshots/index.html`
```html
<!DOCTYPE html>
<html>
<head>
  <title>Component Screenshots</title>
  <style>/* Simple grid layout */</style>
</head>
<body>
  <h1>Component Library</h1>

  <h2>Atoms</h2>
  <div class="grid">
    <div class="component">
      <img src="atoms/Button-Primary-Large.png" alt="Button Primary Large">
      <p>Button/Primary/Large</p>
    </div>
    <!-- More components -->
  </div>

  <!-- More categories -->
</body>
</html>
```

---

## Prompt Engineering Guidelines

### Main Prompt Structure

```markdown
# Role and Context
You are a senior UI/UX analyst and design system expert.
Your task is to analyze Figma design files and extract comprehensive UI specifications.

# Input
[Figma file data will be provided as JSON]

# Your Task
1. Parse the Figma component tree
2. Identify all components, variants, and instances
3. Extract design tokens (colors, typography, spacing, etc.)
4. Classify components by atomic design principles
5. Identify UI patterns (forms, modals, tables, etc.)
6. Map components to screens
7. Check design system consistency (if reference provided)
8. Generate structured output

# Output Format
[Provide YAML schema for components.yaml]

# Component Classification
Atoms: Basic building blocks (Button, Input, Icon)
Molecules: Simple combinations (SearchBar, CardHeader)
Organisms: Complex components (Card, Modal, Table)
Templates: Page layouts
Pages: Complete screens

# UI Pattern Recognition
Look for common patterns:
- Forms (multiple inputs + submit button)
- Tables (header + rows)
- Modals (overlay + content)
- Navigation (menu items)
- Cards (image + text + actions)

# Quality Checklist
- [ ] All components extracted with unique IDs
- [ ] Variants and properties documented
- [ ] Design tokens extracted
- [ ] UI patterns identified
- [ ] Component-to-screen mapping complete
- [ ] Consistency check performed (if applicable)
```

---

## Edge Cases & Error Handling

### Edge Cases

1. **Very large Figma file (100+ screens)**:
   - Process pages in batches
   - Show progress updates
   - May take 5-10 minutes

2. **Nested component variants**:
   - Flatten variant structure
   - Document nesting relationships

3. **Ad-hoc components (not in library)**:
   - Extract anyway
   - Flag as "not in design system"

4. **Multiple component libraries**:
   - Merge into single inventory
   - Note source library

5. **Private Figma files**:
   - Require authentication
   - Check MCP permissions

### Error Handling

```typescript
Error Scenarios:

1. Figma file not found (404):
   - Error: "Cannot access Figma file. Check URL and permissions."
   - Suggest: Verify URL, check MCP configuration, verify file access

2. Invalid Figma file ID:
   - Error: "Invalid Figma file ID format"
   - Suggest: Provide full URL or correct file ID

3. No components found:
   - Warning: "No components found in Figma file"
   - Suggest: Check if file has Components page, verify file type

4. MCP connection error:
   - Error: "Cannot connect to Figma MCP"
   - Suggest: Check MCP server status, verify API token

5. Screenshot generation failure:
   - Warning: "Could not generate screenshots for {n} components"
   - Continue with analysis, note which components failed
```

---

## Testing Criteria

### Test Cases

**Test 1: Standard Design System**
```
Input: Figma file with 30 components, organized by atomic design
Expected:
  - All 30 components extracted
  - Correct atomic classification
  - Design tokens extracted accurately
  - Screenshots generated for all
```

**Test 2: Complex Component Variants**
```
Input: Button component with 12 variants (size × style × state)
Expected:
  - All 12 variants documented
  - Properties correctly identified
  - State changes captured
```

**Test 3: Design System Consistency Check**
```
Input: Figma file + design system reference
Expected:
  - Consistency score calculated
  - Deviations flagged
  - Recommendations provided
```

**Test 4: UI Pattern Recognition**
```
Input: Figma file with login form, data table, modal
Expected:
  - All 3 patterns identified
  - Component composition documented
```

**Test 5: Large File (100+ screens)**
```
Input: Comprehensive design system with 100+ screens
Expected:
  - All screens analyzed
  - Processing completes in < 10 minutes
  - No missing components
```

### Acceptance Criteria

- [ ] Successfully analyzes 10 real Figma files with 95%+ accuracy
- [ ] Processing time < 3 min for typical file (20-50 screens)
- [ ] Output format valid (YAML schema validation)
- [ ] All design tokens extracted correctly
- [ ] UI pattern recognition 90%+ accurate
- [ ] Screenshots generated successfully
- [ ] Handles all edge cases gracefully

---

## Integration Points

### Required MCPs
- **Custom Figma MCP** (to be built if not available)
  - Methods: getFile, getFileComponents, getFileStyles, getImage

### Claude Code Tools Used
- **Write**: For output files
- **Bash**: For screenshot organization

### Output Files Location
```
.prism/figma-analysis-{timestamp}/
├── components.yaml              # Primary component inventory
├── design-tokens.json           # Extracted design tokens
├── figma-analysis-report.md    # Human-readable summary
├── raw-figma-data.json          # Original Figma API response
├── screenshots/
│   ├── atoms/
│   ├── molecules/
│   ├── organisms/
│   └── index.html               # Screenshot gallery
└── metadata.json                # Analysis metadata
```

---

## Performance Requirements

- **Processing Time**: < 3 min for typical file (20-50 screens)
- **Accuracy**: 95%+ component extraction accuracy
- **Memory Usage**: < 1 GB for large files
- **Claude API Calls**: 3-5 calls per analysis
- **Token Usage**: < 40K tokens for typical file

---

## Future Enhancements

**Version 1.1**:
- Component code generation (React, Vue, etc.)
- Interactive prototype analysis
- Animation and transition documentation
- Accessibility annotations

**Version 1.2**:
- Real-time design system monitoring
- Component usage analytics
- Automated design-code sync
- Design system governance

---

## Example Usage

```bash
# In Claude Code
> /prism.analyze-figma --figma-url https://figma.com/file/abc123/ProjectX

Analyzing Figma file...
✓ Fetched Figma file (2.1 seconds)
✓ Parsed document structure (3 pages, 25 screens)
✓ Extracted 42 components (18 atoms, 12 molecules, 10 organisms, 2 templates)
✓ Extracted design tokens (32 colors, 12 typography styles)
✓ Identified 5 UI patterns
✓ Generated 42 screenshots
✓ Analysis complete (2m 15s)

Output files:
  📦 .prism/figma-analysis-20251105-143000/components.yaml
  🎨 .prism/figma-analysis-20251105-143000/design-tokens.json
  📸 .prism/figma-analysis-20251105-143000/screenshots/ (42 images)
  📋 .prism/figma-analysis-20251105-143000/figma-analysis-report.md

Summary:
  • 42 components across 25 screens
  • 5 UI patterns identified (forms, tables, modals, navigation, cards)
  • 95% design system compliance

Next steps:
  1. Review figma-analysis-report.md
  2. Run /prism.validate --requirements requirements.yaml --components components.yaml
```

---

**Document Owner**: MT-PRISM Team
**Last Updated**: 2025-11-05
**Next Review**: After implementation
