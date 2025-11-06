# MT-PRISM Templates

This directory contains template files used by the MT-PRISM plugin for generating structured output.

## Template Files

| Template | Purpose | Used By |
|----------|---------|---------|
| [requirement.yaml](./requirement.yaml) | Schema for requirements output | PRD Analyzer |
| [component.yaml](./component.yaml) | Schema for components output | Figma Analyzer |
| [tdd-template.md](./tdd-template.md) | Template for Technical Design Document | TDD Generator |

## Usage

### In Skills

Skills reference these templates to understand the expected output format:

```typescript
// Load schema template
const requirementSchema = loadTemplate('requirement.yaml');

// Use as reference for output generation
const requirements = extractRequirements(prdContent, requirementSchema);
```

### TDD Template

The TDD template is used as a structure guide:

```typescript
// Load TDD template
const tddTemplate = loadTemplate('tdd-template.md');

// Fill in sections
const tdd = fillTemplate(tddTemplate, {
  PROJECT_NAME: projectName,
  DATE: new Date().toISOString(),
  // ... more replacements
});
```

## Schema Documentation

### requirement.yaml

Defines the structure of requirements extracted from PRDs:
- **metadata**: Source and analysis info
- **requirements**: Array of requirement objects
  - Each requirement has: id, type, priority, complexity, etc.
  - Issues array for detected problems

### component.yaml

Defines the structure of UI components from Figma:
- **metadata**: Figma file info
- **components**: Array of component objects
  - Each component has: id, name, type, variants, etc.
  - Design token references

### tdd-template.md

Comprehensive TDD structure with 12 main sections:
1. Executive Summary
2. Requirements Summary
3. System Architecture
4. Data Models
5. API Specification
6. Frontend Architecture
7. Security Considerations
8. Performance & Scalability
9. Testing Strategy
10. Deployment & DevOps
11. Implementation Plan
12. Open Questions & Decisions

## Customization

You can customize these templates for your organization:

### Custom TDD Template

Create `tdd-template-custom.md`:
```markdown
# Technical Design Document: {PROJECT_NAME}

## Our Custom Section 1
{Your custom content}

## Our Custom Section 2
{Your custom content}

{Include or modify standard sections as needed}
```

Use with:
```bash
/prism.generate-tdd --template ./templates/tdd-template-custom.md
```

### Custom Requirements Schema

Extend the requirement schema with custom fields:
```yaml
requirements:
  - id: string
    # ... standard fields
    custom_field_1: string  # Your custom field
    custom_field_2: number  # Another custom field
```

## Validation

Schemas can be validated using tools like:
- [yamllint](https://yamllint.readthedocs.io/) for YAML validation
- [yq](https://github.com/mikefarah/yq) for YAML processing
- Custom validators in skill implementation

## Related Documentation

- [Skill Specifications](../docs/specs/README.md) - How skills use these templates
- [Prompt Templates](../prompts/README.md) - Prompts that generate this output

---

**Maintainer**: MT-PRISM Team
**Last Updated**: 2025-11-05
