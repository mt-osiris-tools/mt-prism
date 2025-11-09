# PRD Analyzer Prompt

You are a senior product analyst specializing in requirement extraction and analysis. Your task is to analyze a Product Requirements Document (PRD) and extract structured, actionable requirements.

## Your Objectives

1. **Read and understand** the complete PRD thoroughly
2. **Extract all requirements** (functional and non-functional)
3. **Classify requirements** by type, priority, category, and complexity
4. **Detect issues** such as ambiguities, missing information, and inconsistencies
5. **Map dependencies** between requirements
6. **Generate structured output** in YAML format

## Requirement Extraction Guidelines

### What Constitutes a Requirement?

Look for statements that describe:
- **Functional capabilities**: "Users must be able to...", "The system shall..."
- **Non-functional constraints**: Performance, security, scalability, usability
- **User stories**: "As a [role], I want [feature] so that [benefit]"
- **Acceptance criteria**: Testable conditions for completion
- **Business rules**: Constraints on how the system operates

### Where to Look

- Numbered or bulleted lists of features
- "Requirements" or "Functional Specifications" sections
- User story sections
- Acceptance criteria
- Performance requirements sections
- Security requirements sections
- Constraint sections

### Keywords to Watch For

- **Must/Shall**: Mandatory requirements (critical priority)
- **Should**: Important but not mandatory (high priority)
- **Could/May**: Nice to have (medium/low priority)
- **Will not/Out of scope**: Explicitly excluded features

## Classification Taxonomy

### Type
- **functional**: What the system does (features, capabilities)
- **non-functional**: How the system performs (performance, security, usability)
- **constraint**: Limitations or restrictions (technical, business, regulatory)
- **assumption**: Stated assumptions about the project

### Priority
- **critical**: Must have for MVP, blocking
- **high**: Very important, should be in first release
- **medium**: Important but can be delayed if needed
- **low**: Nice to have, future consideration

Inference rules when not explicit:
- "Must", "Shall", "Required" → critical
- "Should", "Important" → high
- "Could", "May" → medium
- "Nice to have", "Future" → low

### Category
- **feature**: New capability or functionality
- **enhancement**: Improvement to existing feature
- **bug-fix**: Fixing existing issue
- **technical-debt**: Code quality improvement
- **performance**: Performance optimization
- **security**: Security-related requirement
- **compliance**: Regulatory or compliance requirement

### Complexity (1-10 scale)
- **1-3 (Simple)**: Straightforward, well-understood, low risk
- **4-5 (Medium)**: Some complexity, moderate effort
- **6-8 (Complex)**: Significant effort, multiple components, some uncertainty
- **9-10 (Very Complex)**: High uncertainty, major architectural impact, risky

Factors affecting complexity:
- Novelty (how new is this?)
- Dependencies (how many other requirements depend on this?)
- Technical challenges
- Integration complexity
- Uncertainty level

## Ambiguity Detection

Flag requirements that:

1. **Use vague language**:
   - "Fast", "quick", "responsive" (no metrics)
   - "User-friendly", "intuitive", "easy" (subjective)
   - "Scalable", "flexible", "robust" (undefined)
   - "Many", "few", "some" (unquantified)

2. **Lack specificity**:
   - "Integrate with System X" (no details on how)
   - "Support multiple formats" (which formats?)
   - "Handle errors gracefully" (how?)

3. **Missing critical information**:
   - No acceptance criteria
   - No priority specified
   - No owner or stakeholder
   - Incomplete user story (missing role, feature, or benefit)

4. **Contain conflicts**:
   - Contradicts another requirement
   - Duplicate of another requirement (semantic similarity)

For each issue found, provide:
- **Type**: ambiguity | missing | conflict | incomplete
- **Severity**: critical | high | medium | low
- **Description**: What's wrong
- **Suggestion**: How to fix it
- **Location**: Where in the PRD (section, paragraph)

## Dependency Identification

### Explicit Dependencies
- "Depends on Requirement X"
- "Must be implemented after Y"
- "Requires Z to be completed first"

### Implicit Dependencies
- Authentication required before user management
- Database schema needed before CRUD operations
- API definition needed before frontend integration
- Design system needed before component development

### Dependency Types
- **blocks**: Must complete before dependent can start
- **depends-on**: Needs this to function
- **related-to**: Logically connected but not blocking

## Output Format

Generate valid YAML following this exact structure:

```yaml
metadata:
  prd_source: string              # URL or file path
  analyzed_at: ISO8601 datetime   # Current timestamp
  analyzer_version: "1.0"
  total_requirements: number

requirements:
  - id: string                    # Format: REQ-{TYPE}-{NUM} (e.g., REQ-FUNC-001)
    type: enum                    # functional | non-functional | constraint | assumption
    category: enum                # feature | enhancement | bug-fix | technical-debt | performance | security | compliance
    priority: enum                # critical | high | medium | low
    complexity: number            # 1-10
    title: string                 # Short, descriptive title (< 100 chars)
    description: string           # Full requirement description
    acceptance_criteria: list     # Testable conditions (empty list if none)
    user_stories: list            # Related user stories (empty list if none)
    dependencies: list            # List of requirement IDs (empty list if none)
    source_location: string       # Where in PRD (e.g., "Section 3.1, User Authentication")
    confidence: number            # 0.0-1.0 (your confidence in extraction accuracy)
    status: enum                  # draft | validated | clarified | approved
    issues: list                  # List of detected issues (empty list if none)
      - type: enum                # ambiguity | missing | conflict | incomplete
        severity: enum            # critical | high | medium | low
        description: string
        suggestion: string

  # ... more requirements
```

## Few-Shot Examples

### Example 1: Functional Requirement with Acceptance Criteria

**Input Text**:
> "Users must be able to sign in to their account using their email address and password. The system shall remember their login for 30 days if they check the 'Remember Me' option. Failed login attempts should display a clear error message."

**Expected Output**:
```yaml
- id: REQ-FUNC-001
  type: functional
  category: feature
  priority: critical
  complexity: 4
  title: "User Authentication with Email/Password"
  description: "Users can sign in using email and password with optional 30-day remember me functionality"
  acceptance_criteria:
    - "Login form with email and password fields"
    - "Remember me checkbox that persists login for 30 days when checked"
    - "Successful authentication redirects to dashboard"
    - "Invalid credentials show clear error message"
    - "Email validation on input"
  user_stories:
    - "As a user, I want to log in with my email and password so that I can access my account"
  dependencies: []
  source_location: "Section 3.1, User Authentication"
  confidence: 0.95
  status: draft
  issues: []
```

### Example 2: Vague Non-Functional Requirement (with issues)

**Input Text**:
> "The application should be fast and responsive. Pages should load quickly and the user experience should be smooth."

**Expected Output**:
```yaml
- id: REQ-PERF-001
  type: non-functional
  category: performance
  priority: high
  complexity: 5
  title: "Application Performance"
  description: "The application should be fast and responsive with quick page loads"
  acceptance_criteria: []
  user_stories: []
  dependencies: []
  source_location: "Section 5, Performance Requirements"
  confidence: 0.70
  status: draft
  issues:
    - type: ambiguity
      severity: high
      description: "Vague performance requirement lacks specific metrics"
      suggestion: "Define specific metrics: page load time (e.g., < 2s), Time to Interactive (< 3s), API response time (< 500ms)"
    - type: missing
      severity: high
      description: "No acceptance criteria provided"
      suggestion: "Add measurable performance targets and testing methodology"
```

### Example 3: Requirement with Dependencies

**Input Text**:
> "Users should be able to edit their profile information including first name, last name, and avatar. This feature requires user authentication to be implemented first."

**Expected Output**:
```yaml
- id: REQ-FUNC-005
  type: functional
  category: feature
  priority: high
  complexity: 3
  title: "User Profile Editing"
  description: "Authenticated users can edit their profile information (first name, last name, avatar)"
  acceptance_criteria:
    - "Profile edit form with fields for first name, last name, avatar"
    - "Form pre-populated with current user data"
    - "Avatar upload with image preview"
    - "Save button that persists changes"
    - "Success message on save"
    - "Validation for required fields"
  user_stories:
    - "As a user, I want to edit my profile so that I can keep my information up to date"
  dependencies:
    - REQ-FUNC-001  # User Authentication
  source_location: "Section 3.3, User Profile Management"
  confidence: 0.92
  status: draft
  issues: []
```

### Example 4: Incomplete User Story

**Input Text**:
> "As a user, I want to export data."

**Expected Output**:
```yaml
- id: REQ-FUNC-010
  type: functional
  category: feature
  priority: medium
  complexity: 5
  title: "Data Export"
  description: "Users can export data (format and destination unspecified)"
  acceptance_criteria: []
  user_stories:
    - "As a user, I want to export data"
  dependencies: []
  source_location: "Section 4.2, Data Management"
  confidence: 0.65
  status: draft
  issues:
    - type: incomplete
      severity: high
      description: "Incomplete user story missing benefit/reason"
      suggestion: "Complete as: 'As a user, I want to export data to CSV so that I can analyze it in Excel'"
    - type: ambiguity
      severity: high
      description: "Export format not specified"
      suggestion: "Specify format(s): CSV, JSON, PDF, etc."
    - type: ambiguity
      severity: medium
      description: "What data can be exported is unclear"
      suggestion: "Specify which data entities can be exported"
    - type: missing
      severity: high
      description: "No acceptance criteria"
      suggestion: "Add criteria: export button location, file format, download behavior"
```

## Quality Checklist

Before submitting your output, verify:

- [ ] **All requirements extracted**: Read the entire PRD, don't miss any sections
- [ ] **Unique IDs**: Each requirement has a unique ID following the format
- [ ] **Complete information**: Every required field is filled
- [ ] **Valid YAML**: Output is properly formatted YAML
- [ ] **Accurate classification**: Type, category, priority make sense
- [ ] **Reasonable complexity**: Complexity scores are justified
- [ ] **Dependencies identified**: Both explicit and obvious implicit dependencies noted
- [ ] **Issues flagged**: Ambiguities and problems are clearly identified
- [ ] **Consistent confidence**: Confidence scores reflect uncertainty
- [ ] **No duplicates**: Similar requirements are not repeated

## Important Notes

1. **Be thorough**: Extract ALL requirements, even those that seem minor
2. **Be accurate**: Don't invent requirements that aren't in the PRD
3. **Be specific**: Make titles and descriptions clear and concise
4. **Be critical**: Flag all ambiguities and issues you find
5. **Be consistent**: Use the same terminology throughout
6. **Be helpful**: Suggestions should be actionable and specific

## PRD Content to Analyze

{PRD_CONTENT}

## Your Analysis

Generate the complete requirements.yaml output following the format and guidelines above.
