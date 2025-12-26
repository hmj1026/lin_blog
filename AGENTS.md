<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Development Guidelines

## 🎯 Core Development Philosophy

1.  **Single Source of Truth (SSOT)**
    Ensure one authoritative implementation per concept. Extend existing logic; never duplicate. Adhere strictly to project structure.
2.  **Read First, Code Later**
    Use `Grep`/`Glob` to study existing patterns before coding. Plan first to prevent technical debt and avoid reinventing the wheel.
3.  **Simplicity & Clarity**
    **Clear intent > Clever code.** Follow SOLID (esp. SRP) and DRY. Choose the "boring," obvious solution. Avoid premature abstraction.
4.  **Incremental Execution**
    Decompose complex tasks (>3 steps). Commit small changes that always compile and pass tests. Follow the Implementation Plan.
5.  **Pragmatic Mindset**
    **Pragmatic > Dogmatic.** Adapt principles to reality. Base development on verifiable facts, not guesses (Anti-Hallucination).
6.  **Test-Driven (TDD)**
    Write tests first to guarantee correctness and robustness.

---

## 🔍 Task Execution Flow

Before writing code, execute this checklist sequentially:

### 1. Preparation & Exploration
*   [ ] **Confirm Principles**: Adhere to Core Development Philosophy.
*   [ ] **Analyze**: Fully understand requirements; ask if ambiguous.
*   [ ] **Search**: Use `rg` (ripgrep) or `fd` to find existing patterns or reusable code.

### 2. Planning (The Staging Strategy)
For complex tasks (>3 steps), create `IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]
- **Goal**: [Specific deliverable]
- **Criteria**: [Testable outcomes]
- **Tests**: [Specific test cases]
- **Status**: [Todo|In Progress|Done]
```
*   *Instruction*: Update status continuously. Delete file upon project completion.

### 3. Implementation Loop (TDD)
Execute strictly in this order:
1.  **Study**: Review similar existing code patterns again.
2.  **Red**: Write a failing test first.
3.  **Green**: Write **minimal** code to pass the test.
4.  **Refactor**: Optimize while keeping tests green.
5.  **Commit**: specific message linking to the Plan Stage.

### 4. Anti-Loop Protocol (When Stuck)
**CRITICAL**: If a specific issue fails **3 times**, STOP immediately. Do not brute force.

1.  **Document Failure**: List what was tried, specific errors, and hypothesis.
2.  **Research**: Find 2-3 alternative approaches from docs or similar internal code.
3.  **Pivot**:
    *   Simplify the problem (split it further).
    *   Change abstraction level.
    *   Switch architectural angle.

---

## ✍️ Coding & Technical Standards

### 1. General Principles
-   **Language**: Communicate strictly in **Traditional Chinese (正體中文)**.
-   **Consistency First**: Follow existing project patterns, naming conventions, and directory structures.
    *   *Action*: Before coding, find **3 similar features** to identify common patterns.
-   **Documentation**: Add PHPDoc/JSDoc for all new units. Comments must be concise and precise.

### 2. Architecture & Design
-   **Composition > Inheritance**: Prefer Dependency Injection.
-   **Explicit > Implicit**: Clear data flow; avoid hidden magic.
-   **Interfaces > Singletons**: Enhance testability and flexibility.
-   **Decision Framework**: When in doubt, prioritize:
    1.  **Testability**: Can it be easily verified?
    2.  **Readability**: Understandable in 6 months?
    3.  **Reversibility**: How hard is it to change later?

### 3. Error Handling
-   **Fail Fast**: Use descriptive error messages with context.
-   **No Silent Failures**: Never swallow exceptions without logging or handling.

---

## 🤖 Agent Execution Environment

### 1. Optimal Tool Selection
*   **Find Files**: `fd`
*   **Find Text**: `rg` (ripgrep)
*   **Select**: `fzf`
*   **JSON/YAML**: `jq` / `yq`
*   **Code Structure**: `ast-grep` (Check [manual](https://ast-grep.github.io/llms.txt))

### 2. Execution Strategy
-   **File I/O**: Read large files in chunks (e.g., `head`/`tail` or 250-line blocks).
-   **Tooling**: Use strictly existing build systems and linters. **Do not** introduce new external dependencies without strong justification.

---

## ✅ Quality Assurance & "Definition of Done"

### 1. The Commit Checklist
Every commit must:
1.  [ ] **Compile** successfully.
2.  [ ] **Pass** all existing tests (Never disable/bypass tests).
3.  [ ] **Include** tests for new functionality (Red-Green-Refactor).
4.  [ ] **Lint**: No warnings/errors from project formatters.
5.  [ ] **Message**: Explain "why", linking to the Implementation Plan.

### 2. Test Guidelines
-   Test **behavior**, not implementation details.
-   One assertion per test ideally.
-   **Deterministic**: Tests must not be flaky.

### 3. Critical Rules (NEVER / ALWAYS)
-   ⛔ **NEVER**: Use `--no-verify`, disable tests to fix CI, or leave TODOs without issue numbers.
-   ✅ **ALWAYS**: Self-review before committing. Stop after **3 failed attempts** to reassess the approach.