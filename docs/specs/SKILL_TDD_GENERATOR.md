# Skill Specification: TDD Generator

**Skill Name**: `prism.generate-tdd`
**Version**: 1.0
**Status**: Specification
**Owner**: MT-PRISM Team

---

## Overview

The TDD Generator skill creates comprehensive Technical Design Documents from validated requirements. It generates architecture diagrams, API specifications, database schemas, component specifications, implementation tasks, and effort estimates.

---

## Purpose & Goals

### Primary Goals
1. **Comprehensive TDD**: Generate all sections of a production-ready TDD
2. **Architecture Design**: Create system architecture and component diagrams
3. **API Specifications**: Generate OpenAPI 3.1 specs with endpoints, schemas, examples
4. **Database Schema**: Define data models, relationships, migrations
5. **Implementation Plan**: Break down into tasks with effort estimates
6. **Artifact Generation**: Create supporting files (API specs, SQL, TypeScript types)

### Success Criteria
- ✅ TDD covers all validated requirements
- ✅ API spec is valid OpenAPI 3.1
- ✅ Database schema is executable SQL
- ✅ Task breakdown is actionable (can import to Jira/GitHub)
- ✅ Manual review: 4.5/5 quality rating
- ✅ Processing time < 5 minutes

---

## Input Parameters

### Required Parameters

**`--requirements <path>`**
- Path to validated requirements.yaml (preferably updated after clarifications)
- Example: `.prism/clarifications-*/updated-requirements.yaml`

### Optional Parameters

**`--components <path>`**
- Path to components.yaml (from Figma analysis)
- Used for frontend architecture section
- Default: Look in most recent figma-analysis directory

**`--codebase <path>`**
- Path to existing codebase for integration guidance
- Example: `./src`
- Default: None (greenfield project)

**`--template <path>`**
- Custom TDD template
- Default: Built-in template (templates/tdd-template.md)

**`--architecture <type>`**
- Architecture type: `monolith`, `microservices`, `hybrid`, `serverless`
- Default: Infer from requirements

**`--tech-stack <preset>`**
- Technology stack preset: `mern`, `nextjs`, `django`, `rails`, `custom`
- Default: `custom` (recommend based on requirements)

**`--output-format <format>`**
- Output format: `markdown`, `confluence`, `pdf`, `html`
- Default: `markdown`

**`--generate-artifacts`**
- Boolean: Generate supporting artifacts (API spec, SQL, etc.)
- Default: `true`

**`--create-tasks`**
- Boolean: Generate task breakdown for Jira/GitHub
- Default: `true`

**`--task-platform <platform>`**
- Task platform: `jira`, `github`, `linear`, `generic`
- Default: `generic` (CSV format)

**`--output-dir <path>`**
- Output directory
- Default: `./.prism/tdd-{timestamp}/`

---

## Processing Steps

### Step 1: Load and Analyze Inputs

```typescript
1. Load requirements.yaml:
   - Parse all requirements
   - Group by type, category, priority
   - Extract stakeholders, timeline

2. Load components.yaml (if provided):
   - Parse UI components
   - Build component inventory
   - Identify component patterns

3. Analyze codebase (if provided):
   - Detect framework (React, Vue, Django, Rails, etc.)
   - Identify architecture pattern
   - Find existing models, APIs, components
   - Detect tech stack

4. Load TDD template:
   - Parse template sections
   - Identify placeholders
   - Validate template structure
```

### Step 2: Determine Architecture

```typescript
Architecture Decision:

Factors to consider:
  1. Scale (users, data volume, requests/sec)
  2. Team size and structure
  3. Deployment requirements
  4. Existing infrastructure
  5. Complexity of requirements

Decision Matrix:

  Monolith (recommended if):
    - Small to medium team (< 10 engineers)
    - Clear domain boundaries not yet needed
    - Simple deployment preferred
    - Fast iteration priority

  Microservices (recommended if):
    - Large team (10+ engineers)
    - Multiple bounded contexts clear
    - Independent deployment needed
    - Scale requirements vary by service

  Hybrid (recommended if):
    - Existing monolith
    - New features benefit from isolation
    - Gradual migration strategy

  Serverless (recommended if):
    - Variable/spiky traffic
    - Event-driven architecture
    - Minimal infrastructure management

Output:
  Recommended Architecture: Monolith with microservices for async jobs
  Rationale: Medium team (8 engineers), clear core domain, but background
  jobs (CSV export, email) benefit from independent scaling.
```

### Step 3: Design System Architecture

```typescript
1. Define Layers:

   Presentation Layer:
     - Frontend: React SPA (based on Figma components)
     - Mobile: Not in requirements (future consideration)

   API Layer:
     - REST API (primary)
     - GraphQL (if complex data fetching needs)
     - WebSocket (if real-time requirements)

   Business Logic Layer:
     - Services (domain logic)
     - Validators
     - Business rules

   Data Layer:
     - Primary database: PostgreSQL
     - Cache: Redis
     - Search: Elasticsearch (if search requirements)
     - File storage: S3-compatible

   Infrastructure:
     - Authentication: OAuth 2.0 + JWT
     - Authorization: RBAC
     - Background jobs: Bull Queue + Redis
     - Monitoring: Prometheus + Grafana
     - Logging: Structured JSON logs

2. Define Components:

   Frontend Components (from Figma):
     - Design system library
     - Page components
     - Shared utilities

   Backend Services:
     - Auth Service
     - User Service
     - Data Service
     - Export Service (microservice)
     - Email Service (microservice)

   External Integrations:
     - Payment gateway (if applicable)
     - Third-party APIs
     - Email service (SendGrid, etc.)

3. Generate Architecture Diagram (Mermaid):

graph TB
    Client[Web Browser]
    LB[Load Balancer]
    API[API Server]
    Auth[Auth Service]
    Jobs[Job Queue]
    Worker1[Export Worker]
    Worker2[Email Worker]
    DB[(PostgreSQL)]
    Cache[(Redis)]
    S3[S3 Storage]

    Client --> LB
    LB --> API
    API --> Auth
    API --> DB
    API --> Cache
    API --> Jobs
    Jobs --> Worker1
    Jobs --> Worker2
    Worker1 --> S3
    Worker2 --> EmailService[Email Provider]
```

### Step 4: Generate API Specification

```typescript
For each requirement:
  1. Identify API needs:
     - CRUD operations
     - Search/filter
     - Bulk operations
     - File uploads/downloads
     - Real-time updates

  2. Define endpoints:

     Example: REQ-FUNC-001 (User Authentication)

     Endpoints:
       POST /api/v1/auth/login
       POST /api/v1/auth/logout
       POST /api/v1/auth/refresh
       POST /api/v1/auth/forgot-password
       POST /api/v1/auth/reset-password

  3. Define schemas:

     LoginRequest:
       type: object
       required: [email, password]
       properties:
         email:
           type: string
           format: email
         password:
           type: string
           minLength: 8
         rememberMe:
           type: boolean
           default: false

     LoginResponse:
       type: object
       properties:
         accessToken:
           type: string
         refreshToken:
           type: string
         user:
           $ref: '#/components/schemas/User'

  4. Define examples:

     Request:
       {
         "email": "user@example.com",
         "password": "SecurePass123!",
         "rememberMe": true
       }

     Response (200 OK):
       {
         "accessToken": "eyJhbGc...",
         "refreshToken": "dGhpc2lz...",
         "user": {
           "id": "usr_123",
           "email": "user@example.com",
           "name": "John Doe"
         }
       }

  5. Generate complete OpenAPI 3.1 spec:
     - All endpoints from requirements
     - All schemas
     - Authentication schemes
     - Error responses
     - Examples for all operations
```

### Step 5: Design Database Schema

```typescript
1. Extract entities from requirements:

   Entities identified:
     - User
     - Profile
     - Role
     - Permission
     - DataRecord (main business entity)
     - ExportJob
     - AuditLog

2. Define tables with columns:

   users:
     - id: UUID (PK)
     - email: VARCHAR(255) UNIQUE NOT NULL
     - password_hash: VARCHAR(255) NOT NULL
     - status: ENUM('active', 'inactive', 'locked')
     - created_at: TIMESTAMP NOT NULL
     - updated_at: TIMESTAMP NOT NULL

   profiles:
     - id: UUID (PK)
     - user_id: UUID (FK → users.id)
     - first_name: VARCHAR(100)
     - last_name: VARCHAR(100)
     - avatar_url: TEXT
     - created_at: TIMESTAMP NOT NULL
     - updated_at: TIMESTAMP NOT NULL

   data_records:
     - id: UUID (PK)
     - title: VARCHAR(255) NOT NULL
     - description: TEXT
     - status: VARCHAR(50)
     - created_by: UUID (FK → users.id)
     - created_at: TIMESTAMP NOT NULL
     - updated_at: TIMESTAMP NOT NULL
     - deleted_at: TIMESTAMP (soft delete)

3. Define relationships:

   - users 1:1 profiles
   - users 1:N data_records
   - users N:M roles (through user_roles)
   - roles N:M permissions (through role_permissions)

4. Define indexes:

   - users.email (unique)
   - data_records.created_by
   - data_records.status
   - data_records.created_at
   - data_records.deleted_at (for soft deletes)

5. Generate SQL migration:

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- More tables...
```

### Step 6: Generate Frontend Architecture

```typescript
Based on Figma components:

1. Component Structure:

   src/
   ├── components/
   │   ├── atoms/
   │   │   ├── Button/
   │   │   ├── Input/
   │   │   └── Badge/
   │   ├── molecules/
   │   │   ├── SearchBar/
   │   │   └── FormField/
   │   ├── organisms/
   │   │   ├── Navbar/
   │   │   ├── DataTable/
   │   │   └── Modal/
   │   └── templates/
   │       ├── DashboardLayout/
   │       └── AuthLayout/
   ├── pages/
   │   ├── Login/
   │   ├── Dashboard/
   │   ├── UserProfile/
   │   └── Settings/
   ├── hooks/
   │   ├── useAuth.ts
   │   ├── useUsers.ts
   │   └── useDataRecords.ts
   ├── services/
   │   ├── api.ts
   │   └── auth.ts
   ├── store/
   │   ├── authSlice.ts
   │   └── dataSlice.ts
   └── utils/
       ├── validation.ts
       └── formatting.ts

2. Generate TypeScript interfaces from API spec:

   // Generated from OpenAPI spec
   export interface User {
     id: string;
     email: string;
     name: string;
     status: 'active' | 'inactive' | 'locked';
     createdAt: string;
     updatedAt: string;
   }

   export interface LoginRequest {
     email: string;
     password: string;
     rememberMe?: boolean;
   }

   export interface LoginResponse {
     accessToken: string;
     refreshToken: string;
     user: User;
   }

3. Generate React Query hooks:

   // hooks/useAuth.ts
   export function useLogin() {
     return useMutation({
       mutationFn: (data: LoginRequest) => api.post('/auth/login', data),
       onSuccess: (data) => {
         setToken(data.accessToken);
         queryClient.invalidateQueries(['user']);
       }
     });
   }

4. Map Figma components to React components:

   | Figma Component | React Component | Props | State |
   |----------------|-----------------|-------|-------|
   | Button/Primary | Button | variant, size, onClick | - |
   | Input/Email | Input | type, value, onChange | error |
   | LoginForm | LoginForm | onSubmit | email, password, loading |
```

### Step 7: Generate Implementation Plan

```typescript
1. Identify phases:

   Phase 1: Foundation (Week 1-2)
     - Set up project structure
     - Configure database
     - Implement authentication
     - Set up CI/CD

   Phase 2: Core Features (Week 3-5)
     - User management
     - Data records CRUD
     - Search and filtering

   Phase 3: Advanced Features (Week 6-7)
     - CSV export (microservice)
     - Email notifications
     - Bulk operations

   Phase 4: Polish & Launch (Week 8)
     - Testing
     - Performance optimization
     - Documentation
     - Deployment

2. Break down into tasks:

   Task Structure:
     - ID: TASK-001
     - Title: Set up Next.js project with TypeScript
     - Description: Initialize Next.js 15 project with App Router
     - Requirements: None (foundation)
     - Effort: 2 story points
     - Dependencies: None
     - Assignee: Frontend Lead
     - Labels: [setup, frontend]

3. Estimate effort:

   Use story points (1-13 scale):
     1-2: Simple task (< 4 hours)
     3-5: Medium task (1-2 days)
     8: Complex task (3-5 days)
     13: Very complex (1 week+)

   Or T-shirt sizes:
     XS: 1-2 hours
     S: 2-4 hours
     M: 1-2 days
     L: 3-5 days
     XL: 1-2 weeks

4. Calculate total effort:

   Total Story Points: 89
   Team Velocity: ~20 points/sprint (2 weeks)
   Estimated Duration: 4-5 sprints (~8-10 weeks)
   Team Size: 5 engineers

5. Identify risks:

   - Real-time collaboration (REQ-FUNC-020): High complexity, 13 points
   - Third-party integration (REQ-FUNC-025): Unknown API, 8 points
   - Performance at scale (REQ-PERF-001): Needs load testing, 5 points
```

### Step 8: Generate TDD Document

```typescript
TDD Structure (following template):

# Technical Design Document: [Project Name]

## 1. Executive Summary
- Project overview
- Goals and objectives
- Key stakeholders
- Timeline and milestones

## 2. Requirements Summary
- Functional requirements (high-level)
- Non-functional requirements
- Constraints and assumptions
- Out of scope

## 3. System Architecture
- Architecture diagram (Mermaid)
- Component overview
- Technology stack
- Infrastructure
- Deployment architecture

## 4. Data Models
- Entity Relationship Diagram (Mermaid)
- Table schemas
- Relationships
- Indexes
- Data migration strategy

## 5. API Specification
- Overview of API design
- Authentication and authorization
- Endpoint summary table
- Link to full OpenAPI spec
- Error handling strategy

## 6. Frontend Architecture
- Component structure
- State management
- Routing
- UI component mapping (from Figma)
- Data fetching strategy

## 7. Security Considerations
- Authentication approach
- Authorization (RBAC)
- Data encryption
- Input validation
- OWASP Top 10 mitigations

## 8. Performance & Scalability
- Expected load
- Caching strategy
- Database optimization
- CDN usage
- Horizontal scaling approach

## 9. Testing Strategy
- Unit testing (coverage target: 80%)
- Integration testing
- E2E testing (Playwright)
- Performance testing
- Security testing

## 10. Deployment & DevOps
- CI/CD pipeline
- Environment strategy (dev, staging, prod)
- Infrastructure as Code
- Monitoring and alerting
- Logging strategy
- Backup and disaster recovery

## 11. Implementation Plan
- Phase breakdown
- Task summary
- Effort estimates
- Timeline
- Resource allocation
- Dependencies and risks

## 12. Open Questions & Decisions
- Unresolved technical decisions
- Trade-offs to consider
- Future considerations

## Appendices
- Appendix A: Complete OpenAPI Specification
- Appendix B: Database Schema (SQL)
- Appendix C: Component Specifications
- Appendix D: Task Breakdown
- Appendix E: Glossary
```

### Step 9: Generate Supporting Artifacts

**Artifact 1: api-spec.yaml (OpenAPI 3.1)**
```yaml
openapi: 3.1.0
info:
  title: Project X API
  version: 1.0.0
  description: RESTful API for Project X

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

security:
  - BearerAuth: []

paths:
  /auth/login:
    post:
      summary: User login
      operationId: login
      tags: [Authentication]
      security: []  # Public endpoint
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        '200':
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/LoginResponse'
        '401':
          description: Invalid credentials
        '429':
          description: Too many requests

  # ... more endpoints

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
      required: [id, email, name]

    # ... more schemas
```

**Artifact 2: database-schema.sql**
```sql
-- Database: project_x
-- Generated: 2025-11-05

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'locked')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ... more tables

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Seed data (optional)
INSERT INTO users (email, password_hash, status) VALUES
  ('admin@example.com', crypt('admin123', gen_salt('bf')), 'active');
```

**Artifact 3: tasks.csv (or tasks.json for Jira)**
```csv
ID,Title,Description,Type,Priority,Effort,Phase,Dependencies,Labels
TASK-001,Set up Next.js project,Initialize Next.js 15 with TypeScript and App Router,Setup,High,2,1,,frontend;setup
TASK-002,Configure PostgreSQL,Set up PostgreSQL database with initial schema,Setup,High,3,1,,backend;database
TASK-003,Implement authentication,Build JWT-based auth with refresh tokens,Feature,Critical,8,1,TASK-002,backend;auth
TASK-004,Create Login UI,Build login form component from Figma,Feature,Critical,5,1,TASK-001,frontend;auth
...
```

**Artifact 4: types.ts (TypeScript interfaces)**
```typescript
// Generated from OpenAPI specification
// DO NOT EDIT - This file is auto-generated

export interface User {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'locked';
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ... more interfaces
```

### Step 10: Review and Finalize

```typescript
Quality Checks:

1. Completeness:
   - All requirements addressed in TDD ✓
   - All sections filled out ✓
   - No [TODO] placeholders ✓

2. Consistency:
   - API spec matches database schema ✓
   - Frontend components match Figma ✓
   - Task breakdown covers all requirements ✓

3. Feasibility:
   - No impossible requirements
   - Reasonable effort estimates
   - Identified risks and mitigation

4. Clarity:
   - Technical decisions explained
   - Architecture rationale provided
   - Clear next steps

Generate summary:
  ✅ TDD complete (45 pages)
  ✅ API spec generated (25 endpoints)
  ✅ Database schema (8 tables, 15 indexes)
  ✅ Task breakdown (78 tasks, 89 story points)
  ✅ All artifacts generated
  ✅ Estimated timeline: 8-10 weeks
```

---

## Prompt Engineering Guidelines

```markdown
# Role
You are a senior technical architect and engineering manager.

# Task
Generate a comprehensive Technical Design Document from validated requirements.

# Quality Standards
- Be thorough but concise
- Explain technical decisions and trade-offs
- Provide realistic effort estimates
- Consider scalability and maintainability
- Address security and performance
- Make it actionable for engineers

# TDD Structure
Follow standard TDD format with all sections.
Include diagrams (Mermaid), code examples, and detailed specifications.

# Artifacts
Generate executable artifacts:
- Valid OpenAPI 3.1 spec
- Executable SQL (PostgreSQL compatible)
- Importable task list (CSV/JSON)
- TypeScript interfaces

# Technical Decisions
Always explain:
- Why this architecture?
- Why this tech stack?
- What are the trade-offs?
- What are the risks?
```

---

## Testing Criteria

**Test 1: Simple CRUD Application**
```
Input: 10 requirements (basic CRUD + auth)
Expected:
  - TDD with all sections
  - 15-20 API endpoints
  - 5-6 database tables
  - 30-40 tasks
  - Valid OpenAPI spec
```

**Test 2: Complex Application**
```
Input: 50 requirements (multiple domains, integrations)
Expected:
  - Comprehensive TDD (40+ pages)
  - 60+ API endpoints
  - 15+ database tables
  - 100+ tasks
  - Microservices recommendation
```

**Test 3: With Existing Codebase**
```
Input: 20 requirements + existing Rails codebase
Expected:
  - Integration guidance with existing code
  - Database migrations (not new schema)
  - Reuse existing components
  - Gradual rollout plan
```

### Acceptance Criteria

- [ ] TDD covers all requirements (100%)
- [ ] API spec passes OpenAPI validation
- [ ] SQL executes without errors
- [ ] Task breakdown is actionable
- [ ] Manual review: 4.5/5 quality
- [ ] Processing time < 5 min

---

## Performance Requirements

- **Processing Time**: < 5 min for typical project (20-30 requirements)
- **TDD Length**: 30-50 pages
- **API Endpoints**: 15-60 (depends on requirements)
- **Claude API Calls**: 5-10 calls
- **Token Usage**: < 100K tokens

---

## Example Usage

```bash
> /prism.generate-tdd \
    --requirements .prism/clarifications-*/updated-requirements.yaml \
    --components .prism/figma-analysis-*/components.yaml \
    --codebase ./src \
    --tech-stack nextjs \
    --create-tasks \
    --task-platform jira

Generating Technical Design Document...

✓ Loaded 23 requirements (all validated)
✓ Loaded 42 UI components
✓ Analyzed codebase (Next.js 14 detected)
✓ Selected architecture: Monolith + background job microservices
✓ Generated system architecture diagram
✓ Designed database schema (8 tables, 15 indexes)
✓ Generated API specification (32 endpoints)
✓ Generated frontend architecture
✓ Created implementation plan (4 phases, 8 weeks)
✓ Generated task breakdown (78 tasks, 89 story points)
✓ Generated all artifacts

TDD Generation Complete! (3m 45s)

📄 Files generated:
  • TDD.md (12,450 words, 45 pages)
  • api-spec.yaml (valid OpenAPI 3.1, 32 endpoints)
  • database-schema.sql (8 tables, ready to execute)
  • tasks.json (78 tasks, Jira-ready)
  • types.ts (TypeScript interfaces from API spec)
  • architecture-diagram.mmd (Mermaid diagram)

📊 Summary:
  • Requirements covered: 23/23 (100%)
  • API endpoints: 32
  • Database tables: 8
  • Frontend components: 42
  • Implementation tasks: 78
  • Estimated effort: 89 story points
  • Timeline: 8-10 weeks (team of 5)

🎉 TDD ready for review!

Next steps:
  1. Review TDD.md with team
  2. Import tasks to Jira: jira import tasks.json
  3. Set up project: npm create next-app
  4. Initialize database: psql < database-schema.sql
```

---

## Future Enhancements

**Version 1.1**:
- Interactive TDD generation (review each section)
- Multiple tech stack presets (MERN, Django, Rails, etc.)
- Cost estimation (infrastructure, team)
- Compliance sections (GDPR, SOC2, etc.)

**Version 1.2**:
- AI-powered architecture recommendations
- Automatic dependency detection
- Risk assessment with mitigation strategies
- Integration with project management tools

---

**Document Owner**: MT-PRISM Team
**Last Updated**: 2025-11-05
