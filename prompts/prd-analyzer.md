# PRD Analysis Task

You are an expert requirements analyst. Your task is to extract structured, unambiguous requirements from a Product Requirements Document (PRD).

## Objective

Analyze the provided PRD and extract ALL requirements, classifying them by type, assigning priority and complexity, and identifying any ambiguities or missing information.

## PRD Content

```markdown
{{prd_content}}
```

## Analysis Guidelines

### 1. Requirement Extraction
- Extract EVERY requirement, no matter how small
- Include functional, performance, security, and constraint requirements
- Do not add requirements that aren't in the PRD
- Capture exact intent without interpretation

### 2. Requirement Types
- **Functional**: Features, user actions, system behavior, business logic
- **Performance**: Speed, scalability, throughput, latency, resource usage
- **Security**: Authentication, authorization, encryption, compliance, privacy
- **Constraint**: Technology choices, integration requirements, timeline, budget

### 3. Priority Assignment
- **Critical**: Security, compliance, core business functionality, blocking dependencies
- **High**: Primary features, key user workflows, important integrations
- **Medium**: Secondary features, enhancements, optional integrations
- **Low**: Nice-to-have features, future considerations, cosmetic improvements

### 4. Complexity Scoring (1-10)
Consider:
- Number of acceptance criteria (more = higher complexity)
- Technical complexity (APIs, algorithms, distributed systems)
- Number of dependencies (more = higher complexity)
- Integration requirements (external services, third-party APIs)

Score ranges:
- **1-3**: Simple (single component, < 3 criteria, no dependencies)
- **4-6**: Moderate (multiple components, 3-5 criteria, few dependencies)
- **7-10**: Complex (distributed, > 5 criteria, many dependencies, advanced algorithms)

### 5. Ambiguity Detection
Flag requirements with:
- **Vague language**: "fast", "good", "many", "some", "well"
- **Missing details**: "TBD", "unclear", "undefined", "pending"
- **Questions**: Requirements phrased as questions
- **Contradictions**: Conflicting statements
- **Placeholders**: [PLACEHOLDER], [TBD]
- **Missing acceptance criteria**: How will this be verified?

### 6. Confidence Scoring (0.0-1.0)
- **0.9-1.0**: Clear, specific, measurable requirements with complete acceptance criteria
- **0.7-0.8**: Mostly clear with minor ambiguities
- **0.5-0.6**: Significant ambiguities or missing details
- **< 0.5**: Very vague or incomplete requirements

## Output Format

Generate a complete RequirementsOutput object with:

### Metadata
- `generated_at`: Current timestamp (ISO 8601)
- `prd_source`: Source identifier (file name, URL, or "inline")
- `total_requirements`: Count of all extracted requirements
- `complexity_average`: Average complexity score
- `confidence_average`: Average confidence score

### Requirements Array
For each requirement:
- `id`: Format REQ-{TYPE}-{NUMBER} (e.g., REQ-FUNC-001, REQ-PERF-001)
  - FUNC: Functional
  - PERF: Performance
  - SEC: Security
  - CONS: Constraint
- `type`: One of: functional, performance, security, constraint
- `priority`: One of: critical, high, medium, low
- `complexity`: Integer 1-10
- `title`: Brief descriptive title (< 100 characters)
- `description`: Full requirement description (extracted from PRD)
- `acceptance_criteria`: List of specific, testable criteria
- `dependencies`: List of requirement IDs this depends on (if any)
- `confidence`: Float 0.0-1.0 (how confident are you in this requirement?)
- `status`: Always "identified" for initial extraction
- `issues`: Array of detected problems

### Issue Format
For each issue:
- `type`: One of: ambiguous, incomplete, contradiction
- `severity`: One of: critical, high, medium, low
- `description`: Clear explanation of the problem and suggested resolution

## Examples

### Example 1: Clear Functional Requirement
```
Text: "Users must be able to register with email and password. Password must be at least 8 characters."

Requirement:
{
  "id": "REQ-FUNC-001",
  "type": "functional",
  "priority": "high",
  "complexity": 3,
  "title": "User Registration",
  "description": "Users must be able to register with email and password. Password must be at least 8 characters.",
  "acceptance_criteria": [
    "Registration form with email and password fields",
    "Email format validation",
    "Password minimum length validation (8 characters)",
    "Successful registration creates user account",
    "Error messages for invalid inputs"
  ],
  "dependencies": [],
  "confidence": 0.95,
  "status": "identified",
  "issues": []
}
```

### Example 2: Ambiguous Performance Requirement
```
Text: "The system should load quickly and handle many concurrent users."

Requirement:
{
  "id": "REQ-PERF-001",
  "type": "performance",
  "priority": "medium",
  "complexity": 5,
  "title": "Page Load Performance",
  "description": "The system should load quickly and handle many concurrent users.",
  "acceptance_criteria": [
    "Page loads within acceptable time",
    "System supports multiple concurrent users"
  ],
  "dependencies": [],
  "confidence": 0.35,
  "status": "identified",
  "issues": [
    {
      "type": "ambiguous",
      "severity": "high",
      "description": "Vague performance term 'quickly' - should specify exact latency (e.g., 'within 2 seconds')"
    },
    {
      "type": "ambiguous",
      "severity": "high",
      "description": "Vague quantity 'many' - should specify exact number (e.g., '10,000 concurrent users')"
    },
    {
      "type": "incomplete",
      "severity": "medium",
      "description": "Acceptance criteria lack specific, measurable targets"
    }
  ]
}
```

### Example 3: Incomplete Requirement
```
Text: "Payment integration is required. Provider TBD pending legal review."

Requirement:
{
  "id": "REQ-FUNC-002",
  "type": "functional",
  "priority": "high",
  "complexity": 7,
  "title": "Payment Processing Integration",
  "description": "Payment integration is required. Provider TBD pending legal review.",
  "acceptance_criteria": [
    "Integrate with payment provider",
    "Process credit card payments",
    "Handle payment confirmation"
  ],
  "dependencies": [],
  "confidence": 0.50,
  "status": "identified",
  "issues": [
    {
      "type": "incomplete",
      "severity": "critical",
      "description": "Payment provider not specified (TBD) - cannot implement without knowing provider"
    },
    {
      "type": "incomplete",
      "severity": "high",
      "description": "Blocked: pending legal review - cannot proceed until approved"
    }
  ]
}
```

## Important Notes

1. **Be Thorough**: Extract every requirement, even if it seems minor
2. **Be Honest**: If something is ambiguous, flag it and explain why
3. **Be Specific**: Generate detailed acceptance criteria even if PRD is vague
4. **Be Accurate**: Don't invent requirements not in the PRD
5. **Be Helpful**: Suggest specific improvements for ambiguous requirements

## Session Context

- Session ID: {{session_id}}
- Analysis Date: {{current_date}}

Now analyze the PRD and generate the complete RequirementsOutput.
