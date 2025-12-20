---
trigger: always_on
---

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

## Communication Guidelines
- **Primary Language**: Always respond in **Traditional Chinese (正體中文)** unless specifically requested otherwise.
- **Code Comments**: Use Traditional Chinese.

## 🛠 Development Workflow (The "Clear" Strategy)
We use a stateless workflow to save tokens.
1.  **Planning**: Read/Update `openspec/proposals/*.md`. This is our "Memory".
2.  **Coding**: Implement small chunks based on the proposal.
3.  **Checking**: Expect the user to run `git commit` after verification is OK.
4.  **Clearing**: Expect the user to run `/clear` often. Rely on `CLAUDE.md` and Proposal files for context, NOT chat history.