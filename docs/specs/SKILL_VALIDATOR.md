# Skill Specification: Requirements Validator

**Skill Name**: `prism.validate`
**Version**: 1.0
**Status**: Specification
**Owner**: MT-PRISM Team

---

## Overview

The Requirements Validator skill cross-validates PRD requirements against Figma designs and optionally against existing codebase. It identifies gaps, inconsistencies, and missing elements, then generates targeted clarification questions for stakeholders.

---

## Purpose & Goals

### Primary Goals
1. **Requirement-to-Component Mapping**: Link each requirement to corresponding UI components
2. **Gap Detection**: Identify requirements without UI, and UI without requirements
3. **Consistency Check**: Find conflicts between PRD and designs
4. **Technical Feasibility**: Assess implementation complexity with codebase analysis
5. **Clarification Generation**: Create specific, actionable questions for stakeholders

### Success Criteria
- ✅ 90%+ gap detection rate (vs. manual review)
- ✅ Accurate requirement-component mapping (85%+ precision)
- ✅ Zero false negatives on critical gaps
- ✅ Clarification questions are specific and actionable
- ✅ Processing time < 3 minutes

---

## Input Parameters

### Required Parameters

**`--requirements <path>`**
- Path to requirements.yaml (from PRD analysis)
- Example: `.prism/prd-analysis-*/requirements.yaml`

**`--components <path>`**
- Path to components.yaml (from Figma analysis)
- Example: `.prism/figma-analysis-*/components.yaml`

### Optional Parameters

**`--codebase <path>`**
- Path to existing codebase for technical feasibility check
- Example: `./src` or `./`
- Default: Not checked

**`--output-dir <path>`**
- Output directory for validation results
- Default: `./.prism/validation-{timestamp}/`

**`--strict-mode`**
- Boolean: Fail validation if any critical gaps found
- Default: `false`

**`--confidence-threshold <number>`**
- Minimum confidence (0.0-1.0) for mappings
- Default: `0.75`

**`--generate-questions`**
- Boolean: Generate clarification questions
- Default: `true`

---

## Processing Steps

### Step 1: Load and Parse Inputs

```typescript
1. Load requirements.yaml:
   - Parse YAML
   - Validate schema
   - Index requirements by ID
   - Group by type (functional, non-functional)

2. Load components.yaml:
   - Parse YAML
   - Validate schema
   - Index components by ID
   - Group by category (atom, molecule, organism)

3. Optional: Analyze codebase:
   - Scan directory structure
   - Find existing API endpoints
   - Identify database models
   - Map reusable components
```

### Step 2: Requirement-to-Component Mapping

**Mapping Strategy**:
```typescript
For each requirement:
  1. Extract key entities and actions:
     - Example: "User can log in" → entities: [User], actions: [login]
     - Example: "Display user profile" → entities: [User, Profile], actions: [display]

  2. Search for matching components:
     - Text similarity matching (requirement description vs. component name/description)
     - Semantic search using embeddings
     - Keyword matching (login, profile, button, input, etc.)

  3. Calculate confidence score (0.0-1.0):
     - 0.9-1.0: Very confident match
     - 0.75-0.89: Likely match
     - 0.5-0.74: Possible match
     - < 0.5: Unlikely match (exclude)

  4. Store mapping:
     requirement_id: REQ-FUNC-001
     component_ids: [COMP-015, COMP-003]
     confidence: 0.88
     reasoning: "Login requirement maps to Login form (COMP-015) and Button (COMP-003)"
```

**Example Mappings**:
```yaml
mappings:
  - requirement_id: REQ-FUNC-001
    requirement_title: "User Authentication"
    component_ids:
      - COMP-015  # Login Form
      - COMP-003  # Button (Primary)
      - COMP-007  # Input (Email)
      - COMP-008  # Input (Password)
    confidence: 0.92
    mapping_type: complete
    reasoning: "All login UI components present"

  - requirement_id: REQ-FUNC-005
    requirement_title: "User Profile Display"
    component_ids:
      - COMP-042  # Profile Card
      - COMP-018  # Avatar
    confidence: 0.85
    mapping_type: partial
    reasoning: "Profile card found, but edit functionality unclear"
    missing: "Edit profile button not clearly visible"
```

### Step 3: Gap Detection

**Type 1: Requirements Without UI**
```typescript
For each requirement:
  If no component mapping OR confidence < threshold:
    Flag as "Missing UI"

    Gap:
      type: missing_ui
      severity: critical | high | medium
      requirement_id: REQ-FUNC-010
      requirement_title: "Export data to CSV"
      description: "No UI component found for CSV export functionality"
      impact: "Users cannot export data as specified in requirement"
      stakeholder: design
```

**Type 2: Components Without Requirements**
```typescript
For each component:
  If not referenced in any requirement mapping:
    Flag as "No Requirement"

    Gap:
      type: no_requirement
      severity: medium | low
      component_id: COMP-025
      component_name: "Special Dashboard Widget"
      description: "Component exists in Figma but no corresponding requirement in PRD"
      impact: "May be deprecated, or requirement is missing from PRD"
      stakeholder: product
```

**Type 3: Incomplete Mappings**
```typescript
For requirement with mapping:
  If confidence < 0.85 OR mapping_type == "partial":
    Flag as "Incomplete Mapping"

    Gap:
      type: incomplete_mapping
      severity: high | medium
      requirement_id: REQ-FUNC-003
      component_ids: [COMP-020]
      description: "Requirement mentions editing, but only display component found"
      missing_elements: "Edit button, Save button, form inputs"
      stakeholder: design, product
```

**Type 4: Inconsistencies**
```typescript
Compare requirement vs. component details:
  - Requirement says "5 fields", design shows 3 fields
  - Requirement says "primary button", design shows secondary
  - Requirement says "required field", design shows optional

    Gap:
      type: inconsistency
      severity: high
      requirement_id: REQ-FUNC-007
      component_id: COMP-030
      description: "PRD specifies 5 form fields, Figma shows 3"
      details:
        expected_from_prd: ["name", "email", "phone", "address", "city"]
        found_in_figma: ["name", "email", "phone"]
        missing: ["address", "city"]
      stakeholder: design, product
```

**Type 5: Missing Acceptance Criteria**
```typescript
For each requirement:
  If acceptance_criteria is empty OR vague:
    Flag as "Missing Acceptance Criteria"

    Gap:
      type: missing_acceptance_criteria
      severity: medium
      requirement_id: REQ-FUNC-012
      description: "Requirement has no acceptance criteria"
      impact: "Cannot validate implementation correctness"
      stakeholder: product
```

### Step 4: Technical Feasibility Check

**If codebase path provided**:
```typescript
1. Scan codebase structure:
   - API endpoints (REST, GraphQL)
   - Database models/schemas
   - Existing UI components
   - Third-party integrations

2. For each requirement:
   a. Check if API exists:
      - Search for routes matching requirement
      - Example: "GET /api/users/:id" for user profile

   b. Check if model exists:
      - Search for User, Profile, etc. models
      - Verify required fields

   c. Estimate implementation complexity:
      - Existing: Component/API already exists (complexity: 1-2)
      - Simple: Small modifications needed (complexity: 3-4)
      - Medium: New feature, uses existing patterns (complexity: 5-6)
      - Complex: New patterns, high uncertainty (complexity: 7-8)
      - Very Complex: Major architectural changes (complexity: 9-10)

3. Flag technical concerns:
   Feasibility Issue:
     type: technical_concern
     severity: high | medium
     requirement_id: REQ-FUNC-020
     description: "Real-time collaboration requires WebSocket infrastructure"
     current_state: "Application uses REST API only"
     effort_estimate: "High (2-3 weeks)"
     recommendation: "Consider architectural spike"
     stakeholder: engineering
```

### Step 5: Calculate Metrics

```typescript
Validation Metrics:
  - Total requirements: 23
  - Requirements with complete UI: 18 (78%)
  - Requirements with partial UI: 3 (13%)
  - Requirements with no UI: 2 (9%)
  - Components without requirements: 5 (12%)
  - Total gaps found: 10
    - Critical: 2
    - High: 5
    - Medium: 3
  - Overall completeness score: 78%
  - Validation status: NEEDS_CLARIFICATION
```

### Step 6: Generate Clarification Questions

**For Each Gap**:
```typescript
Generate specific, actionable question:

Gap type: missing_ui
Question:
  id: Q-001
  type: design
  priority: high
  related_requirement: REQ-FUNC-010
  question: "How should users export data to CSV?"
  context: "Requirement REQ-FUNC-010 specifies CSV export, but no export button or menu option is visible in the designs."
  suggestions:
    - "Add 'Export' button in the data table toolbar?"
    - "Add export option in the overflow menu?"
    - "Include in settings panel?"
  stakeholders: [design]

Gap type: inconsistency
Question:
  id: Q-002
  type: product-design
  priority: critical
  related_requirement: REQ-FUNC-007
  related_component: COMP-030
  question: "Should the registration form have 3 or 5 fields?"
  context: "PRD specifies 5 fields (name, email, phone, address, city), but Figma design shows only 3 (name, email, phone)."
  suggestions:
    - "If 3 fields: Update PRD to match design"
    - "If 5 fields: Update Figma to include address and city"
    - "Make address/city optional fields?"
  stakeholders: [product, design]

Gap type: no_requirement
Question:
  id: Q-003
  type: product
  priority: medium
  related_component: COMP-025
  question: "Is the 'Special Dashboard Widget' still needed?"
  context: "Component exists in Figma but no corresponding requirement in PRD."
  suggestions:
    - "Add requirement to PRD"
    - "Remove from Figma if deprecated"
  stakeholders: [product]
```

### Step 7: Generate Outputs

**Primary Output**: `validation-report.md`
```markdown
# Requirements Validation Report

**Validated**: 2025-11-05 3:45 PM
**Duration**: 1m 52s
**Status**: ⚠️ NEEDS CLARIFICATION

## Summary

| Metric | Value |
|--------|-------|
| Total Requirements | 23 |
| Requirements with Complete UI | 18 (78%) |
| Requirements with Partial UI | 3 (13%) |
| Requirements with No UI | 2 (9%) |
| Components without Requirements | 5 (12%) |
| Total Gaps | 10 |
| Critical Issues | 2 |
| High Priority Issues | 5 |
| Medium Priority Issues | 3 |

**Overall Completeness**: 78%

## Validation Status

⚠️ **NEEDS CLARIFICATION**

Critical gaps and inconsistencies found. Clarification needed before proceeding to TDD generation.

## Requirement-Component Mapping

### ✅ Complete Mappings (18)

| Requirement | Components | Confidence |
|-------------|------------|------------|
| REQ-FUNC-001: User Authentication | Login Form, Button×2, Input×2 | 92% |
| REQ-FUNC-002: User Registration | Registration Form, Input×5, Button | 90% |
| ... | ... | ... |

### ⚠️ Partial Mappings (3)

| Requirement | Components | Issue |
|-------------|------------|-------|
| REQ-FUNC-005: User Profile | Profile Card, Avatar | Missing edit functionality |
| REQ-FUNC-011: Data Filtering | Filter Panel | Only 2 of 4 filters present |
| ... | ... | ... |

### ❌ No Mapping (2)

| Requirement | Status | Severity |
|-------------|--------|----------|
| REQ-FUNC-010: CSV Export | No UI component found | Critical |
| REQ-FUNC-015: Bulk Actions | No UI component found | High |

## Gaps and Issues

### 🔴 Critical (2)

**GAP-001: Missing CSV Export UI**
- **Type**: Missing UI
- **Requirement**: REQ-FUNC-010 (CSV Export)
- **Description**: No export button or menu option found in designs
- **Impact**: Users cannot export data as required
- **Stakeholder**: Design
- **Question**: Q-001 (see Clarification Questions section)

**GAP-002: Registration Form Field Mismatch**
- **Type**: Inconsistency
- **Requirement**: REQ-FUNC-007
- **Component**: COMP-030
- **Description**: PRD specifies 5 fields, Figma shows 3
- **Impact**: Implementation ambiguity
- **Stakeholder**: Product, Design
- **Question**: Q-002

### 🟡 High Priority (5)

[List high priority gaps...]

### 🟢 Medium Priority (3)

[List medium priority gaps...]

## Technical Feasibility

_Codebase analyzed: ./src_

### ✅ Existing Implementation (5 requirements)

Requirements that can leverage existing code:
- REQ-FUNC-001: Authentication (existing auth system)
- REQ-FUNC-003: User list (existing table component)
- ...

### ⚠️ Technical Concerns (3 requirements)

**REQ-FUNC-020: Real-time Collaboration**
- **Concern**: Requires WebSocket infrastructure
- **Current**: REST API only
- **Effort**: High (2-3 weeks)
- **Recommendation**: Architectural spike needed

[More concerns...]

## Clarification Questions (10)

See `clarification-questions.md` for full list.

## Recommendations

1. **Address critical gaps immediately**:
   - Add CSV export UI (GAP-001)
   - Resolve registration form inconsistency (GAP-002)

2. **Review medium priority gaps**:
   - 5 components without requirements may be deprecated

3. **Technical spike needed**:
   - REQ-FUNC-020 (Real-time collaboration) requires architecture decision

4. **Proceed to clarification phase**:
   - Run `/prism.clarify` to send questions to stakeholders

## Next Steps

1. Run `/prism.clarify --questions clarification-questions.md --mode interactive`
2. Address critical gaps
3. Once clarified, re-run validation
4. Proceed to TDD generation when validation passes
```

**Secondary Output**: `gaps.yaml`
```yaml
gaps:
  - id: GAP-001
    type: missing_ui
    severity: critical
    requirement_id: REQ-FUNC-010
    requirement_title: "CSV Export"
    description: "No UI component found for CSV export functionality"
    impact: "Users cannot export data"
    stakeholder: design
    question_id: Q-001

  - id: GAP-002
    type: inconsistency
    severity: critical
    requirement_id: REQ-FUNC-007
    component_id: COMP-030
    description: "PRD specifies 5 form fields, Figma shows 3"
    details:
      expected: ["name", "email", "phone", "address", "city"]
      found: ["name", "email", "phone"]
      missing: ["address", "city"]
    stakeholder: [product, design]
    question_id: Q-002

  # ... more gaps
```

**Tertiary Output**: `clarification-questions.md`
```markdown
# Clarification Questions

Generated: 2025-11-05 3:45 PM
Total Questions: 10 (2 critical, 5 high, 3 medium)

---

## Critical Priority (2)

### Q-001: CSV Export UI Missing
**Type**: Design
**Related**: REQ-FUNC-010
**Stakeholder**: Design Team

**Question**: How should users export data to CSV?

**Context**: Requirement REQ-FUNC-010 specifies CSV export functionality, but no export button or menu option is visible in the Figma designs.

**Suggestions**:
- Option A: Add 'Export' button in the data table toolbar?
- Option B: Add export option in the overflow menu?
- Option C: Include in settings panel?

**Impact**: Critical - Users cannot complete a key workflow without this

---

### Q-002: Registration Form Field Count
**Type**: Product + Design
**Related**: REQ-FUNC-007 (PRD), COMP-030 (Figma)
**Stakeholder**: Product Team, Design Team

**Question**: Should the registration form have 3 or 5 fields?

**Context**: The PRD specifies 5 fields (name, email, phone, address, city), but the Figma design shows only 3 fields (name, email, phone).

**Suggestions**:
- Option A: Use 3 fields - Update PRD to remove address and city
- Option B: Use 5 fields - Update Figma to include address and city
- Option C: Make address and city optional fields in a second step

**Impact**: Critical - Implementation cannot proceed without clarity

---

## High Priority (5)

[More questions...]

---

## Medium Priority (3)

[More questions...]
```

**Quaternary Output**: `requirement-component-map.yaml`
```yaml
# Traceability Matrix
traceability:
  - requirement_id: REQ-FUNC-001
    requirement_title: "User Authentication"
    components:
      - id: COMP-015
        name: "Login Form"
        coverage: complete
      - id: COMP-003
        name: "Button/Primary"
        coverage: complete
      - id: COMP-007
        name: "Input/Email"
        coverage: complete
      - id: COMP-008
        name: "Input/Password"
        coverage: complete
    mapping_status: complete
    confidence: 0.92

  - requirement_id: REQ-FUNC-005
    requirement_title: "User Profile Display"
    components:
      - id: COMP-042
        name: "Profile Card"
        coverage: partial
    mapping_status: partial
    confidence: 0.85
    gaps:
      - "Missing edit functionality"
      - "No save button"

  # ... more mappings
```

---

## Prompt Engineering Guidelines

```markdown
# Role
You are a senior requirements analyst and technical architect.

# Task
Cross-validate PRD requirements against Figma UI designs.

# Inputs
1. requirements.yaml - Structured requirements from PRD
2. components.yaml - UI components from Figma
3. (Optional) Codebase structure

# Process
1. Map each requirement to UI components
2. Identify gaps (missing UI, missing requirements, inconsistencies)
3. Assess technical feasibility
4. Generate specific clarification questions

# Output
- validation-report.md (comprehensive)
- gaps.yaml (structured gaps)
- clarification-questions.md (actionable questions)
- requirement-component-map.yaml (traceability)

# Quality Standards
- Be thorough: Don't miss critical gaps
- Be specific: Vague questions are not helpful
- Be actionable: Provide clear suggestions
- Be fair: Consider that some mappings are implicit
```

---

## Testing Criteria

**Test 1: Complete Requirements**
```
Input: Requirements and components that fully match
Expected:
  - 100% completeness score
  - Status: VALIDATED
  - No gaps
  - No questions
```

**Test 2: Missing UI Components**
```
Input: 5 requirements, only 3 have UI in Figma
Expected:
  - 2 gaps of type "missing_ui"
  - Questions generated for each
  - Status: NEEDS_CLARIFICATION
```

**Test 3: Inconsistencies**
```
Input: Requirements specify 10 items, Figma shows 7
Expected:
  - Gap of type "inconsistency"
  - Specific details of what's missing
  - Question for product/design team
```

**Test 4: Components Without Requirements**
```
Input: 15 components in Figma, only 12 have corresponding requirements
Expected:
  - 3 gaps of type "no_requirement"
  - Questions for product team
```

### Acceptance Criteria

- [ ] Validates 10 real PRD-Figma pairs with 90%+ gap detection
- [ ] Processing time < 3 minutes
- [ ] Questions are specific and actionable (manual review)
- [ ] No false negatives on critical gaps
- [ ] Output format valid

---

## Performance Requirements

- **Processing Time**: < 3 min for typical validation (20 reqs, 40 components)
- **Accuracy**: 90%+ gap detection rate
- **Mapping Precision**: 85%+ (reasonable mappings)
- **Claude API Calls**: 3-5 calls
- **Token Usage**: < 60K tokens

---

## Example Usage

```bash
> /prism.validate \
    --requirements .prism/prd-analysis-*/requirements.yaml \
    --components .prism/figma-analysis-*/components.yaml \
    --codebase ./src

Cross-validating requirements and components...
✓ Loaded 23 requirements
✓ Loaded 42 components
✓ Analyzed codebase structure (./src)
✓ Mapped requirements to components (18 complete, 3 partial, 2 missing)
✓ Detected 10 gaps (2 critical, 5 high, 3 medium)
✓ Generated 10 clarification questions
✓ Validation complete (1m 52s)

Validation Status: ⚠️ NEEDS CLARIFICATION

Critical Issues:
  • GAP-001: Missing CSV export UI
  • GAP-002: Registration form field mismatch (5 vs 3 fields)

Output files:
  📋 .prism/validation-20251105-154500/validation-report.md
  ⚠️ .prism/validation-20251105-154500/gaps.yaml
  ❓ .prism/validation-20251105-154500/clarification-questions.md
  🔗 .prism/validation-20251105-154500/requirement-component-map.yaml

Next steps:
  1. Review validation-report.md
  2. Address 2 critical gaps immediately
  3. Run /prism.clarify to send questions to stakeholders
```

---

**Document Owner**: MT-PRISM Team
**Last Updated**: 2025-11-05
