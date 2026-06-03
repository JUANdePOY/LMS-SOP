# Workflow Orchestration Guide

> **Purpose**: This document defines the standard operating procedures and principles that guide all development work in this project. It must be followed for every change to ensure consistency, quality, and efficiency.

---

## 1. Plan Mode Default

### When to Use Plan Mode
Enter **plan mode** for ANY non-trivial task, defined as:
- 3 or more implementation steps
- Architectural decisions that affect multiple components
- Changes requiring coordination across different parts of the system
- Any work where the path forward is not immediately obvious

### How to Plan
1. **Write detailed specifications** upfront to reduce ambiguity
2. **Include verification steps** in the plan, not just building steps
3. **Document decisions** and rationale for future reference
4. **If something goes sideways**, STOP immediately and re-plan

### Plan Structure
- Clear objective definition
- Step-by-step breakdown with checkable items
- Risk identification and mitigation strategies
- Success criteria and validation methods

---

## 2. Subagent Strategy

### Philosophy
Use subagents liberally to keep the main context window clean and maintain focus on high-level coordination.

### When to Use Subagents
- Research and exploration tasks
- Parallel analysis of different aspects of a problem
- Deep dives into specific codebase areas
- Any task that can be executed independently

### Guidelines
- **One task per subagent** for focused execution
- **Throw more compute** at complex problems via parallel subagents
- **Clear, specific prompts** - subagents need exact requirements
- **Minimize context** - only provide what's necessary for the task

---

## 3. Self-Improvement Loop

### The Loop
After **ANY correction from the user** or when a mistake is identified:
1. Update `tasks/lessons.md` with the pattern that caused the issue
2. Write **concrete rules** for yourself that prevent the same mistake
3. **Ruthlessly iterate** on these lessons until mistake rate drops
4. **Review lessons** at session start for relevant project context

### What to Capture
- Technical misconceptions
- Process gaps
- Communication failures
- Assumptions that proved wrong
- Edge cases missed

### Format for Lessons
```
## [Date] - [Brief Title]
**Context**: [situation]
**Mistake**: [what went wrong]
**Pattern**: [generalizable rule]
**Action**: [how to avoid next time]
```

---

## 4. Verification Before Done

### Never Mark Complete Without Proof
- **Run tests** - show they pass
- **Check logs** - verify no errors or warnings introduced
- **Demonstrate correctness** - prove the change works as intended
- **Diff behavior** between main and your changes when relevant

### Quality Gates
1. **Would a staff engineer approve this?** - Ask yourself honestly
2. **Edge cases considered?** - Think beyond the happy path
3. **No regressions?** - Ensure existing functionality intact
4. **Documentation updated?** - If behavior changed, docs must reflect it

### Validation Checklist
- [ ] All tests pass (unit, integration, e2e)
- [ ] Code manually verified in relevant scenarios
- [ ] No new lint/type errors
- [ ] Performance impact assessed (if applicable)
- [ ] Security implications reviewed

---

## 5. Demand Elegance (Balanced)

### The Question
For non-trivial changes, **pause and ask**: "Is there a more elegant way?"

### When to Pursue Elegance
- The current solution feels hacky or brittle
- The change will be maintained long-term
- There's a clean abstraction waiting to emerge
- Multiple similar changes suggest a pattern

### When to Skip
- Simple, obvious fixes
- One-off changes with no future implications
- Time-critical patches where elegance would delay delivery
- The simple solution is proven and clear

### Challenge Your Work
Before presenting any solution, ask:
- "Knowing everything I know now, is this the best implementation?"
- "Will this be readable in 6 months?"
- "Does this respect existing patterns in the codebase?"
- "Is there duplication that should be extracted?"

---

## 6. Autonomous Bug Fixing

### Mindset
When given a bug report: **just fix it**. Don't ask for hand-holding.

### Process
1. **Point at logs, errors, failing tests** - identify root cause
2. **Resolve them** - implement the fix
3. **Verify the fix** - prove the bug is gone
4. **Prevent recurrence** - add tests or safeguards if appropriate

### Zero Context Switching
- The user should not need to explain how to fix it
- Don't ask "what should I do?" - figure it out
- Go fix failing tests without being told how
- Take ownership from report to resolution

---

## Task Management

### 1. Plan First
Write plan to `tasks/todo.md` with checkable items before starting implementation.

### 2. Verify Plan
Check in with the user before starting implementation if the plan involves significant decisions or risks.

### 3. Track Progress
Mark items complete as you go using the todo tracking system.

### 4. Explain Changes
Provide high-level summary at each significant step, but avoid unnecessary preamble.

### 5. Document Results
Add a review section to `tasks/todo.md` after completion with:
- What was done
- Validation performed
- Any caveats or future work

### 6. Capture Lessons
Update `tasks/lessons.md` after any corrections or learnings.

---

## Core Principles

### Simplicity First
- Make every change as simple as possible
- Impact minimal code
- Avoid over-engineering
- Choose clear over clever

### No Laziness
- Find **root causes**, not symptoms
- No temporary fixes that will break later
- Apply **senior developer standards** to all work
- If you're tempted to cut corners, that's the moment to slow down and do it right

### Minimal Impact
- **Only touch what's necessary**
- No side effects that could introduce new bugs
- Respect existing patterns and conventions
- Changes should be as localized as possible

---

## Execution Protocol

### For Every Task
1. **Read** - understand the current state and context
2. **Plan** - create a detailed plan in `tasks/todo.md`
3. **Check** - verify plan with user if needed
4. **Execute** - implement following the plan
5. **Validate** - prove it works (tests, manual check, etc.)
6. **Document** - update lessons and review as appropriate

### Communication Style
- **Concise and direct** - fewer than 4 lines when possible
- **Technical and clear** - no conversational filler
- **No questions at the end** - make responses final
- **No emojis** - unless explicitly requested
- **No greetings or conclusions** - get to the point

---

## File Locations

- **Main workflow document**: `WORKFLOW.md` (this file)
- **Task tracking**: `tasks/todo.md`
- **Lessons learned**: `tasks/lessons.md`
- **Project commands**: `.kilo/command/*.md`
- **Agent instructions**: `.kilo/agent/*.md`

**Last Updated**: 2026-05-01  
**Version**: 1.0
