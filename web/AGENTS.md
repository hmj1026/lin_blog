# WEB MODULE KNOWLEDGE BASE

**Context**: Next.js 15 App Router Blog (web/)

## OVERVIEW
Core application layer. Modern React, Tailwind CSS, Prisma (PostgreSQL), and NextAuth.
Implements Clean Architecture within `src/modules`.

## STRUCTURE
```
web/
├── scripts/              # Admin/CLI utilities (init-admin.js)
├── src/
│   ├── app/              # App Router (UI/API Layer)
│   │   ├── (admin)/      # Dashboard & CMS logic
│   │   └── (frontend)/   # Public blog pages
│   ├── components/       # Shared UI components
│   └── modules/          # DDD Core (Domain, Use Cases, Repos)
├── prisma/               # Schema & Migrations
└── public/               # Static assets
```

## WHERE TO LOOK
| Target | Location |
|------|----------|
| **Admin UI** | `src/app/(admin)/admin/` |
| **Blog UI** | `src/app/(frontend)/` |
| **Logic/Models** | `src/modules/` |
| **API Endpoints** | `src/app/api/` |
| **DB Access** | `src/modules/*/infrastructure/prisma/` |

## CONVENTIONS
- **Environment**: Root `.env` MUST be symlinked: `ln -sf ../.env .env`.
- **Logic**: No logic in components; use `src/modules` use-cases.
- **Routing**: Use group folders `(admin)` and `(frontend)` for layout separation.
- **Styling**: Tailwind CSS only.

## COMMANDS
```bash
npm run dev              # Local dev server
npm run build            # Production build
npm run db:push          # Sync Prisma schema
node scripts/init-admin.js  # Initialize admin user
```
