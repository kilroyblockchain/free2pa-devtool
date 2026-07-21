# Skill Design Standards

## Required Fields
- Skill Name
- Purpose
- Inputs
- Output Format
- Decision Rules
- Escalation Triggers
- Security Notes
- Examples
- Test Cases
- Version

## Design Rules
1. One skill should solve one clear job task.
2. Input requirements must be unambiguous.
3. Output must be machine- and human-readable.
4. Include at least one known failure condition.
5. Include a clear handoff path when escalation is triggered.

## Quality Checklist
- is scope clear?
- is output deterministic enough?
- are edge cases documented?
- is escalation explicit?
