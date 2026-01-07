# COMPONENTS KNOWLEDGE BASE

## OVERVIEW
Next.js 15 UI components for Lin Blog.
Tech: Tailwind CSS, CVA, Lucide React.
Focus: Clean separation of Admin and Public layers.

## CONVENTIONS
- **Organization**:
  - `admin/`: Backend management components.
  - `ui/`: Shared atomic primitives (Button, Input).
  - Root: Public frontend UI.
- **Rendering Strategy**:
  - Default: **Server Components** (data fetching, SEO).
  - `"use client"`: Interactivity, state, browser APIs ONLY.
- **Logic & Data**:
  - **NO direct Prisma/DB imports**.
  - Use Server Actions or API routes calling `src/modules` Use Cases.
  - Components should be thin UI wrappers around props/actions.
- **Style**:
  - Tailwind CSS + `cn()` utility.
  - CVA for component variants.
  - PascalCase filenames.
