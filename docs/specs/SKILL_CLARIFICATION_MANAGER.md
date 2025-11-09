# Skill Specification: Clarification Manager

**Skill Name**: `prism.clarify`
**Version**: 1.0
**Status**: Specification
**Owner**: MT-PRISM Team

---

## Overview

The Clarification Manager skill handles the iterative loop of sending questions to stakeholders, collecting responses, updating requirements, and re-validating. It supports both interactive mode (real-time Q&A with user) and async mode (send via Jira/Slack and wait for responses).

---

## Purpose & Goals

### Primary Goals
1. **Question Management**: Categorize and prioritize clarification questions
2. **Multi-Channel Distribution**: Send questions via Jira, Slack, email, or interactive chat
3. **Response Tracking**: Monitor which questions have been answered
4. **Requirement Updates**: Apply answers to requirements and regenerate artifacts
5. **Re-validation**: Trigger validation after clarifications are applied

### Success Criteria
- ✅ All questions categorized correctly by stakeholder type
- ✅ Questions delivered successfully (100% delivery rate)
- ✅ Responses captured and parsed accurately
- ✅ Requirements updated correctly based on answers
- ✅ Re-validation triggered automatically

---

## Input Parameters

### Required Parameters

**`--questions <path>`**
- Path to clarification-questions.md (from validation)
- Example: `.prism/validation-*/clarification-questions.md`

### Optional Parameters

**`--mode <mode>`**
- Distribution mode: `interactive`, `jira`, `slack`, `email`, `file`
- Default: `interactive`

**`--stakeholder-map <path>`**
- Mapping of stakeholder types to contacts
- Example: `./stakeholders.yaml`
- Default: Prompt user for each stakeholder

**`--batch-send`**
- Boolean: Send all questions at once vs. one-by-one
- Default: `false` (one-by-one in interactive)

**`--timeout-days <number>`**
- Days to wait for responses before escalation
- Default: `3`
- Only applies to async modes (jira, slack, email)

**`--auto-revalidate`**
- Boolean: Automatically re-run validation after updates
- Default: `true`

**`--output-dir <path>`**
- Output directory
- Default: `./.prism/clarifications-{timestamp}/`

---

## Processing Steps

### Step 1: Load and Parse Questions

```typescript
1. Load clarification-questions.md
2. Parse question format:
   - ID (Q-001, Q-002, etc.)
   - Priority (critical, high, medium, low)
   - Type (product, design, engineering, product-design, etc.)
   - Related requirement/component IDs
   - Question text
   - Context
   - Suggestions/options
   - Stakeholder(s)

3. Group questions:
   - By priority (critical first)
   - By stakeholder type
   - By related requirement

4. Validate all questions have required fields
```

### Step 2: Stakeholder Mapping

```typescript
Stakeholder Types:
  - product: Product Manager, Product Owner
  - design: UI/UX Designer, Design Lead
  - engineering: Tech Lead, Engineering Manager
  - product-design: Both product and design
  - all: All stakeholders

If stakeholder-map provided:
  Load from YAML:
    stakeholders:
      product:
        name: "Jane Smith"
        slack: "@jane"
        jira: "jsmith"
        email: "jane@company.com"
      design:
        name: "John Doe"
        slack: "@john.doe"
        jira: "jdoe"
        email: "john@company.com"

If not provided:
  Prompt user for each stakeholder type found in questions
```

### Step 3: Question Distribution

**Mode: Interactive**
```typescript
For each question (in priority order):
  1. Display question to user:
     ---
     Question Q-001 (Critical - Design)

     How should users export data to CSV?

     Context: Requirement REQ-FUNC-010 specifies CSV export, but no export
     button found in designs.

     Suggestions:
     A) Add 'Export' button in table toolbar
     B) Add export option in overflow menu
     C) Include in settings panel
     D) Other (please specify)

     Your answer:
     ---

  2. Capture user response:
     - Free text answer
     - Or selection from suggestions
     - Allow "Skip" or "Come back later"

  3. Store response:
     question_id: Q-001
     answered_by: user (interactive)
     answered_at: 2025-11-05T15:30:00Z
     answer: "Add Export button in table toolbar (Option A)"

  4. Ask follow-up if needed:
     "Should the export button be always visible or in a dropdown?"

  5. Move to next question

After all questions:
  - Show summary of answers
  - Ask: "Ready to apply changes and re-validate? (Y/n)"
```

**Mode: Jira**
```typescript
For each question:
  1. Create Jira issue:
     project: from config
     issue_type: "Task" or "Question"
     summary: "Clarification Needed: [Question Title]"
     description: |
       **Question**: [Question text]

       **Context**: [Context]

       **Suggestions**:
       - Option A: ...
       - Option B: ...

       **Related**:
       - Requirement: REQ-FUNC-010
       - Gap: GAP-001

       **Priority**: Critical
       **Stakeholder**: @design-team

     assignee: from stakeholder map
     priority: map critical→Highest, high→High, etc.
     labels: ["clarification", "prism", "prd-discovery"]

  2. Use MCP Jira to create:
     issue_key = mcp_jira.createIssue(issue_data)

  3. Store mapping:
     question_id: Q-001
     jira_issue_key: "PROJ-1234"
     created_at: 2025-11-05T15:30:00Z
     status: "waiting"

  4. Set up webhook (if supported):
     - Listen for issue updates
     - Trigger when status changes to "Done" or "Resolved"
     - Fetch comment with answer

Summary:
  Created 10 Jira issues:
    - 2 critical (PROJ-1234, PROJ-1235)
    - 5 high (PROJ-1236 - PROJ-1240)
    - 3 medium (PROJ-1241 - PROJ-1243)

  Assigned to:
    - Product Team: 4 issues
    - Design Team: 5 issues
    - Engineering Team: 1 issue
```

**Mode: Slack**
```typescript
For each stakeholder type:
  1. Group questions by stakeholder

  2. Format Slack message with blocks:
     {
       "blocks": [
         {
           "type": "header",
           "text": "🔍 Clarification Needed for PRD Discovery"
         },
         {
           "type": "section",
           "text": "Hi <@jane>, we need your input on 4 questions..."
         },
         {
           "type": "divider"
         },
         {
           "type": "section",
           "text": "*Q-001 (Critical)*\nHow should users export data to CSV?\n\n_Context:_ ..."
         },
         {
           "type": "actions",
           "elements": [
             {
               "type": "button",
               "text": "Add Export Button",
               "value": "Q-001:A"
             },
             {
               "type": "button",
               "text": "Overflow Menu",
               "value": "Q-001:B"
             },
             {
               "type": "button",
               "text": "Other",
               "value": "Q-001:other"
             }
           ]
         }
       ]
     }

  3. Send via MCP Slack:
     message_ts = mcp_slack.sendMessage(channel, blocks)

  4. Store mapping:
     question_id: Q-001
     slack_channel: "#design-questions"
     slack_message_ts: "1699200000.123456"
     status: "waiting"

  5. Set up interaction handler:
     - When button clicked, capture response
     - If "Other" selected, prompt for free text in thread

Summary:
  Sent messages to 3 channels:
    - #product-questions: 4 questions
    - #design-questions: 5 questions
    - #eng-questions: 1 question
```

**Mode: Email**
```typescript
For each stakeholder:
  1. Generate email:
     To: stakeholder email from map
     Subject: "Clarification Needed: PRD Discovery for [Project]"
     Body: |
       Hi [Name],

       We're conducting PRD discovery and need your input on the following questions:

       ## Critical Priority

       **Q-001: CSV Export UI**
       How should users export data to CSV?

       Context: Requirement REQ-FUNC-010 specifies CSV export, but no export
       button found in designs.

       Suggestions:
       A) Add 'Export' button in table toolbar
       B) Add export option in overflow menu
       C) Include in settings panel
       D) Other (please specify)

       Your answer: _____________________

       [More questions...]

       Please reply to this email with your answers, or fill out this form:
       [Link to web form - if available]

       Thanks!

  2. Send email (via external tool or SMTP)

  3. Store mapping:
     question_ids: [Q-001, Q-002, Q-003]
     email_to: "jane@company.com"
     email_message_id: "<abc123@company.com>"
     status: "waiting"

Note: Email mode requires manual response processing (copy-paste into tool)
```

**Mode: File**
```typescript
Generate markdown files for manual distribution:

  clarifications/product-questions.md:
    # Questions for Product Team

    ## Critical Priority

    ### Q-001: CSV Export UI
    **Related**: REQ-FUNC-010, GAP-001
    **Question**: How should users export data to CSV?
    ...
    **Answer**: [Please write your answer here]

  clarifications/design-questions.md:
    [Similar format]

Output:
  Generated 3 files:
    - clarifications/product-questions.md (4 questions)
    - clarifications/design-questions.md (5 questions)
    - clarifications/engineering-questions.md (1 question)

  Please distribute manually and fill in answers.
  When done, run: /prism.clarify --apply-responses clarifications/
```

### Step 4: Response Collection

**Interactive Mode**:
```typescript
Responses captured in real-time during Step 3
```

**Async Modes (Jira, Slack, Email)**:
```typescript
1. Poll for responses:
   - Check Jira issues for status changes
   - Listen for Slack message replies/button clicks
   - Monitor email inbox (manual or automated)

2. Parse responses:
   - Extract answer text
   - Map to question ID
   - Validate answer completeness

3. Handle incomplete answers:
   - Send reminder (after 1 day)
   - Escalate if no response after timeout

4. Store responses:
   responses:
     - question_id: Q-001
       answer: "Add Export button in table toolbar"
       answered_by: "jane@company.com"
       answered_at: "2025-11-06T10:15:00Z"
       source: jira
       source_id: "PROJ-1234"

     - question_id: Q-002
       answer: "Use 5 fields as specified in PRD"
       answered_by: "jane@company.com"
       answered_at: "2025-11-06T10:20:00Z"
       source: jira
       source_id: "PROJ-1235"
```

### Step 5: Apply Responses to Requirements

```typescript
For each response:
  1. Load related requirement/component:
     If question relates to requirement:
       Load requirements.yaml
       Find requirement by ID
     If question relates to component:
       Load components.yaml
       Find component by ID
     If question relates to gap:
       Determine what needs to be added/changed

  2. Update based on answer:

     Example 1: Missing UI component
       Question: "How should users export data to CSV?"
       Answer: "Add Export button in table toolbar"

       Action:
         - Add note to requirement:
           REQ-FUNC-010:
             ui_notes: "Add Export button in data table toolbar"
             status: clarified

         - Create pseudo-component entry:
           COMP-NEW-001:
             name: "Button/Export"
             type: Button
             location: "Data table toolbar"
             source: clarification
             related_requirement: REQ-FUNC-010

     Example 2: Inconsistency resolution
       Question: "Should registration form have 3 or 5 fields?"
       Answer: "Use 5 fields as in PRD. Update Figma."

       Action:
         - Update requirement:
           REQ-FUNC-007:
             status: clarified
             clarification: "Confirmed 5 fields. Figma to be updated."

         - Flag component for update:
           COMP-030:
             needs_update: true
             update_note: "Add address and city fields to match PRD"

     Example 3: Add missing requirement
       Question: "Is Special Dashboard Widget still needed?"
       Answer: "Yes, it's for displaying real-time metrics"

       Action:
         - Create new requirement:
           REQ-FUNC-NEW-001:
             title: "Real-time Metrics Display"
             description: "Display real-time metrics on dashboard using Special Widget"
             related_component: COMP-025
             source: clarification
             status: draft

  3. Save updated files:
     - updated-requirements.yaml
     - updated-components.yaml (if changes)
```

### Step 6: Re-validation (if auto-revalidate=true)

```typescript
1. Trigger validation:
   Run /prism.validate \
     --requirements updated-requirements.yaml \
     --components updated-components.yaml

2. Compare before/after:
   Previous gaps: 10 (2 critical, 5 high, 3 medium)
   Current gaps: 3 (0 critical, 1 high, 2 medium)

   Resolved: 7 gaps
   Remaining: 3 gaps

3. Check if validation passes:
   If critical gaps = 0 AND high gaps <= 2:
     Status: VALIDATED (ready for TDD)
   Else:
     Status: NEEDS_MORE_CLARIFICATION
     Generate new questions for remaining gaps
```

### Step 7: Generate Outputs

**Primary Output**: `clarification-summary.md`
```markdown
# Clarification Summary

**Session**: 2025-11-05 3:45 PM - 4:30 PM
**Mode**: Interactive
**Duration**: 45 minutes

## Questions Asked (10)

- Critical: 2
- High: 5
- Medium: 3

## Responses Collected (10)

✅ All questions answered

### By Stakeholder
- Product: 4 responses (Jane Smith)
- Design: 5 responses (John Doe)
- Engineering: 1 response (Tech Lead)

## Changes Applied

### Requirements Updated (3)
- REQ-FUNC-007: Confirmed 5 fields for registration
- REQ-FUNC-010: Added UI note for CSV export button
- REQ-FUNC-015: Added bulk action button to toolbar

### New Requirements Created (1)
- REQ-FUNC-NEW-001: Real-time metrics display

### Components Flagged for Update (2)
- COMP-030: Add address and city fields
- COMP-025: Document as real-time metrics widget

## Re-validation Results

**Status**: ✅ VALIDATED

Previous Gaps: 10 (2 critical, 5 high, 3 medium)
Current Gaps: 3 (0 critical, 1 high, 2 medium)

**Resolved**: 7 gaps
**Remaining**: 3 low-priority gaps (acceptable)

## Next Steps

✅ Validation passed!

Ready to proceed:
  `/prism.generate-tdd --requirements updated-requirements.yaml`
```

**Secondary Output**: `responses.yaml`
```yaml
responses:
  - question_id: Q-001
    question: "How should users export data to CSV?"
    priority: critical
    stakeholder: design
    answer: "Add Export button in table toolbar"
    answered_by: "John Doe (Design Lead)"
    answered_at: "2025-11-05T15:32:00Z"
    mode: interactive
    applied_to:
      - requirement: REQ-FUNC-010
        change: "Added UI note for export button"

  - question_id: Q-002
    question: "Should registration form have 3 or 5 fields?"
    priority: critical
    stakeholder: product-design
    answer: "Use 5 fields as specified in PRD. Will update Figma."
    answered_by: "Jane Smith (Product), John Doe (Design)"
    answered_at: "2025-11-05T15:35:00Z"
    mode: interactive
    applied_to:
      - requirement: REQ-FUNC-007
        change: "Confirmed 5 fields"
      - component: COMP-030
        change: "Flagged for Figma update"

  # ... more responses
```

**Tertiary Output**: `updated-requirements.yaml` and `updated-components.yaml`
(Same format as original, but with clarifications applied)

---

## Prompt Engineering Guidelines

```markdown
# Role
You are a clarification coordinator managing stakeholder Q&A.

# Task
1. Distribute questions to appropriate stakeholders
2. Collect and validate responses
3. Apply responses to requirements/components
4. Trigger re-validation

# Interactive Mode Tips
- Ask questions in priority order (critical first)
- Be patient and clear
- Provide context for each question
- Offer suggestions but allow free-form answers
- Summarize answers before applying

# Async Mode Tips
- Group questions by stakeholder
- Provide clear instructions
- Set expectations for response time
- Send reminders if needed
- Track response status

# Quality Standards
- Every question must get an answer
- Answers must be specific and actionable
- Apply changes accurately
- Verify changes with user before finalizing
```

---

## Testing Criteria

**Test 1: Interactive Mode**
```
Input: 5 questions, user answers all
Expected:
  - All questions asked in priority order
  - All answers captured
  - Changes applied correctly
  - Re-validation triggered
```

**Test 2: Jira Mode**
```
Input: 10 questions
Expected:
  - 10 Jira issues created
  - Correct assignment
  - Responses captured when issues resolved
  - Changes applied
```

**Test 3: Partial Responses**
```
Input: 10 questions, only 7 answered within timeout
Expected:
  - 7 responses applied
  - 3 questions escalated
  - Partial re-validation
```

**Test 4: Conflicting Responses**
```
Input: Product says "5 fields", Design says "3 fields"
Expected:
  - Conflict detected
  - Flag for human review
  - Don't apply conflicting changes
```

### Acceptance Criteria

- [ ] All distribution modes working (interactive, jira, slack, file)
- [ ] 100% question delivery rate
- [ ] Responses captured accurately
- [ ] Changes applied correctly
- [ ] Re-validation triggered
- [ ] Handles timeouts and reminders

---

## Performance Requirements

- **Interactive Mode**: Real-time (no delays)
- **Jira Issue Creation**: < 30 seconds for 10 questions
- **Response Collection**: Poll every 1 hour in async modes
- **Change Application**: < 1 minute for 10 responses

---

## Example Usage

### Interactive Mode
```bash
> /prism.clarify \
    --questions .prism/validation-*/clarification-questions.md \
    --mode interactive

Loading 10 clarification questions...
Entering interactive mode. I'll ask each question and wait for your answer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Question 1 of 10 (Critical - Design)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q-001: How should users export data to CSV?

Context: Requirement REQ-FUNC-010 specifies CSV export functionality,
but no export button or menu option is visible in the Figma designs.

Suggestions:
  A) Add 'Export' button in the data table toolbar
  B) Add export option in the overflow menu
  C) Include in settings panel
  D) Other (please specify)

Your answer: A

Great! Add Export button in the data table toolbar.

Would you like the button to be:
  1) Always visible
  2) Only visible when rows are selected
  3) In a dropdown menu

Your choice: 1

Perfect! Moving to next question...

[Continue for all 10 questions...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All 10 questions answered!

Ready to apply changes and re-validate? (Y/n): Y

Applying changes...
✓ Updated 3 requirements
✓ Created 1 new requirement
✓ Flagged 2 components for update
✓ Saved updated-requirements.yaml
✓ Saved updated-components.yaml

Re-validating...
✓ Validation complete
✓ Gaps reduced from 10 → 3 (all low priority)
✓ Status: VALIDATED

🎉 Ready to generate TDD!

Next step:
  /prism.generate-tdd --requirements updated-requirements.yaml
```

### Jira Mode
```bash
> /prism.clarify \
    --questions .prism/validation-*/clarification-questions.md \
    --mode jira \
    --stakeholder-map ./stakeholders.yaml

Creating Jira issues for clarification questions...
✓ Connected to Jira
✓ Loaded stakeholder map
✓ Creating 10 issues...

Created issues:
  • PROJ-1234: Q-001 (Critical) → @jane-smith
  • PROJ-1235: Q-002 (Critical) → @john-doe
  • PROJ-1236: Q-003 (High) → @jane-smith
  ...
  • PROJ-1243: Q-010 (Medium) → @tech-lead

All issues created successfully!

Tracking responses...
  • Timeout: 3 days
  • Reminders: After 1 day
  • Status: Check with /prism.clarify --check-status

Run this command to check for responses:
  /prism.clarify --check-status --session-id sess-123
```

---

**Document Owner**: MT-PRISM Team
**Last Updated**: 2025-11-05
