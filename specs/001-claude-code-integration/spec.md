# Feature Specification: Claude Code Session Integration

**Feature Branch**: `001-claude-code-integration`
**Created**: 2025-11-22
**Status**: Draft
**Input**: User description: "usually the process related to analize a prd is related with a specific project or workspace, i need to make this tools available also if i'm using claude code and i'm already loged in"

## Clarifications

### Session 2025-11-22

- Q: How should the system handle concurrent analysis attempts in the same workspace? → A: Block with lock file, offer to wait for completion or cancel
- Q: How long should completed and incomplete session data be retained in the `.prism/sessions/` directory? → A: 30 days for both completed and incomplete sessions
- Q: How should the system handle MCP server unavailability or connection failures? → A: Warn user, degrade gracefully to local-only mode (skip Confluence/Figma features)
- Q: When Claude Code authentication expires mid-analysis, how should the system recover? → A: Pause analysis, prompt user to re-authenticate, then continue automatically
- Q: What maximum timeout should apply to the entire PRD-to-TDD analysis workflow before considering it failed? → A: 30 minutes (reasonable buffer beyond 20-minute target)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run PRD Analysis in Active Claude Code Session (Priority: P1)

A developer is already logged into Claude Code and working in a project workspace. They want to analyze a PRD document that exists in their current project without leaving Claude Code or switching to a separate terminal session.

**Why this priority**: This is the core functionality that enables PRD analysis within the existing Claude Code workflow. It eliminates context switching and keeps developers in their primary work environment.

**Independent Test**: Can be fully tested by opening Claude Code in a project directory containing a PRD file, running the prism command, and verifying that analysis outputs are generated in the project workspace.

**Acceptance Scenarios**:

1. **Given** a user is in an active Claude Code session with a project open, **When** they run the prism command with a local PRD file path, **Then** the analysis executes using the Claude Code session's authentication and generates outputs in the project directory
2. **Given** a user is in Claude Code and specifies a Confluence PRD URL, **When** they run the prism command, **Then** the tool accesses Confluence via MCP and completes the analysis without requiring separate authentication
3. **Given** a user has already authenticated with Claude API in their Claude Code environment, **When** they run prism, **Then** the tool automatically uses the existing session credentials instead of requiring separate API key configuration

---

### User Story 2 - Access Analysis Outputs from Claude Code (Priority: P1)

After running a PRD analysis in Claude Code, the developer needs to review, edit, or share the generated TDD, API specs, and database schemas directly within the Claude Code interface.

**Why this priority**: Developers need immediate access to analysis outputs to continue their work. This ensures the entire workflow from PRD to implementation happens in one environment.

**Independent Test**: Can be tested by running a complete analysis in Claude Code and verifying that all output files (TDD, API spec, database schema) are accessible and readable within the Claude Code file explorer and editor.

**Acceptance Scenarios**:

1. **Given** a PRD analysis has completed in Claude Code, **When** the user navigates to the `.prism/sessions/` directory, **Then** all analysis outputs are visible in the file explorer
2. **Given** analysis outputs exist in the session directory, **When** the user opens a TDD or API spec file, **Then** the file opens in Claude Code's editor with proper syntax highlighting
3. **Given** the user wants to share analysis results with their team, **When** they access the session output directory, **Then** they can copy file paths or commit files to version control directly from Claude Code

---

### User Story 3 - Resume Previous Analysis Sessions (Priority: P2)

A developer started a PRD analysis in Claude Code but needs to continue work later or after encountering an error. They want to resume from where they left off without restarting the entire analysis.

**Why this priority**: Long-running analyses may be interrupted by network issues, session timeouts, or user actions. Resume capability prevents wasted work and improves reliability.

**Independent Test**: Can be tested by starting an analysis, intentionally interrupting it (closing Claude Code or stopping the process), then reopening Claude Code and using the `--resume` flag to continue from the saved state.

**Acceptance Scenarios**:

1. **Given** a user started a PRD analysis but closed Claude Code before completion, **When** they reopen Claude Code and run `prism --resume=<session-id>`, **Then** the analysis continues from the last completed step
2. **Given** an analysis failed due to a temporary error (network timeout, API rate limit), **When** the user runs the resume command, **Then** the tool retries the failed step without re-executing successful steps
3. **Given** a user wants to see available sessions to resume, **When** they run `prism --list-sessions`, **Then** they see all incomplete sessions with their status and timestamps

---

### User Story 4 - Configure Analysis Settings from Claude Code (Priority: P3)

A developer working in Claude Code wants to configure MT-PRISM settings (AI provider preference, output format, validation strictness) without editing configuration files manually.

**Why this priority**: Configuration management improves usability but is not essential for core functionality. Users can manually edit `.env` files as a workaround.

**Independent Test**: Can be tested by running configuration commands in Claude Code's terminal and verifying that settings persist across sessions without manual file editing.

**Acceptance Scenarios**:

1. **Given** a user wants to change their AI provider from Claude to GPT-4, **When** they run `prism config --provider=openai`, **Then** the setting is saved and subsequent analyses use GPT-4
2. **Given** a user wants to see their current configuration, **When** they run `prism config --show`, **Then** all current settings are displayed in a readable format
3. **Given** a user wants to reset to default settings, **When** they run `prism config --reset`, **Then** all custom configurations are cleared and defaults are restored

---

### Edge Cases

- What happens when the user runs prism in a Claude Code session but hasn't set up API credentials yet? (System should detect missing credentials and provide actionable error message with setup instructions)
- How does the system handle running multiple prism analyses concurrently in the same Claude Code workspace? (System uses lock file to prevent concurrent runs, offering user choice to wait for completion or cancel)
- What happens when the Claude Code session times out or loses authentication during a long-running analysis? (System pauses the analysis, prompts user to re-authenticate, then automatically continues without requiring manual resume)
- What happens if a lock file exists but the analysis process crashed? (System should detect stale locks and offer to clear them)
- How does the tool behave when run in a Claude Code session vs. a standalone terminal? (Tool should detect the execution environment and adapt authentication strategy accordingly)
- What happens if the user's project workspace lacks write permissions for creating `.prism/` directory? (System should check permissions early and suggest alternative output locations)
- What happens when MCP servers (Confluence, Figma) are unavailable during analysis? (System warns user and continues in local-only mode, skipping features that require those services)
- What happens if the analysis exceeds the 30-minute timeout? (System saves current state, fails gracefully with error message, and allows user to resume with --resume flag)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when running in a Claude Code session environment (vs. standalone terminal)
- **FR-002**: System MUST use Claude Code's existing authentication credentials when available instead of requiring separate API key configuration
- **FR-003**: System MUST create analysis outputs in the current project workspace (`.prism/` directory relative to working directory)
- **FR-004**: System MUST support resuming interrupted analyses using `--resume=<session-id>` flag
- **FR-005**: System MUST provide a command to list available sessions with status information (`--list-sessions`)
- **FR-006**: System MUST handle authentication errors gracefully by pausing the analysis, prompting the user to re-authenticate (e.g., "Claude Code authentication expired. Please run: claude login"), and automatically continuing the analysis once authentication is restored
- **FR-007**: System MUST prevent concurrent analyses in the same workspace using a lock file mechanism, and when a second analysis is attempted, offer the user options to either wait for the current analysis to complete or cancel the request
- **FR-008**: System MUST save session state after each major step (PRD analysis, Figma analysis, validation, etc.) to enable resume functionality
- **FR-009**: System MUST support configuration management via CLI commands (`prism config --provider=<name>`, `prism config --show`, `prism config --reset`)
- **FR-010**: System MUST provide progress feedback in Claude Code's terminal output (step indicators, time elapsed, current operation)
- **FR-011**: System MUST check workspace write permissions before starting analysis and provide actionable error if insufficient
- **FR-012**: System MUST integrate with Claude Code's MCP servers (Confluence, Figma, Jira, Slack) when they are configured and available in the environment
- **FR-013**: System MUST fall back to manual authentication (API keys in `.env`) when Claude Code authentication is not available
- **FR-014**: System MUST automatically remove session data (both completed and incomplete) older than 30 days from the `.prism/sessions/` directory
- **FR-015**: System MUST degrade gracefully to local-only mode when MCP servers are unavailable or misconfigured, displaying a warning to the user and skipping features that depend on those external services (e.g., Confluence PRD access, Figma design analysis)
- **FR-016**: System MUST enforce a 30-minute maximum timeout for the entire PRD-to-TDD analysis workflow, saving session state and failing gracefully with an actionable error message if the timeout is exceeded

### Key Entities

- **Claude Code Session**: Represents an active Claude Code environment with existing authentication, workspace context, and available MCP servers
- **Project Workspace**: The directory in which Claude Code is currently open, where `.prism/` outputs will be created
- **Session State**: Persistent record of analysis progress (completed steps, intermediate outputs, timestamps) enabling resume functionality. Sessions are retained for 30 days before automatic cleanup regardless of completion status
- **Configuration Profile**: User preferences for AI provider, output format, validation settings stored in `.prism/config.yaml`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete a full PRD-to-TDD analysis in Claude Code without leaving the environment or switching to a terminal
- **SC-002**: 95% of analyses that start in Claude Code successfully complete without authentication errors
- **SC-003**: Users can resume interrupted analyses and complete them in under 30 seconds from the resume command
- **SC-004**: Session state is saved after each major step, ensuring no more than 5 minutes of work is lost on interruption
- **SC-005**: Users can access all analysis outputs (TDD, API spec, database schema) directly in Claude Code's file explorer within 2 seconds of completion
- **SC-006**: Configuration changes via CLI commands persist across sessions without requiring manual file editing
- **SC-007**: 90% of users successfully run their first PRD analysis in Claude Code without consulting documentation (based on error message clarity and authentication auto-detection)
- **SC-008**: 95% of analyses complete within the 20-minute target; those exceeding 30 minutes timeout gracefully with saved state and clear recovery instructions

## Assumptions

- Claude Code provides a detectable environment variable or API to identify when the tool is running within a Claude Code session
- Claude Code's authentication system provides a programmatic way to access credentials (API tokens) for use by integrated tools
- Users running MT-PRISM in Claude Code have already authenticated with Claude API (`claude login` or equivalent)
- Claude Code sessions maintain authentication for at least the duration of a typical PRD analysis (20 minutes)
- The current working directory in Claude Code is always the project workspace root where `.prism/` should be created
- MCP servers configured in Claude Code are accessible to child processes (like the prism CLI)
- Users understand the difference between running prism in Claude Code (automatic auth) vs. standalone terminal (manual API keys)
- Users have sufficient disk space to retain 30 days of session data (estimated 50-100MB per session)

## Out of Scope

- Custom Claude Code UI panels or widgets for displaying analysis results (initial version uses standard file system and terminal output)
- Real-time collaboration features (multiple users analyzing the same PRD in shared Claude Code sessions)
- Deep integration with Claude Code's git workflow (automatic commits, branch creation) - users manage version control manually
- Custom syntax highlighting or validation for TDD/API spec files beyond standard markdown/YAML support
- Integration with Claude Code's debugging or testing frameworks
- Automatic updates or version management within Claude Code environment
