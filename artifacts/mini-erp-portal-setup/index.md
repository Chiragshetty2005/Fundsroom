---
kind: ticket
title: 'Bootstrap Mini ERP + CRM portal'
status: 2
---

## Scope

Set up the executable foundation for the case-study portal before implementing business modules.

## Settled initial choices

| Area              | Choice                                    | Reason                                                                                                              |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Repository layout | npm workspaces: `apps/web` and `apps/api` | Keeps the React UI and Express API independently deployable while sharing one developer workflow.                   |
| API               | Express + TypeScript                      | Fast to implement within the assignment while retaining typed boundaries and middleware support.                    |
| Database          | PostgreSQL + Prisma                       | Supports relational operations and will allow transactional challan confirmation and stock movements.               |
| Local services    | Locally installed PostgreSQL              | Matches the current development requirement while preserving a host-based configuration for later containerization. |

## Initial deliverables

- Root workspace scripts, formatting rules, and ignore rules
- Vite React + TypeScript application shell
- Express TypeScript API with environment validation, CORS, health endpoint, and consistent JSON errors
- PostgreSQL environment template and Prisma schema entry point
- Local setup instructions

## Verification

- `npm run build` passes for both applications.
- `npm run check` passes for both applications.
- `npm run format:check` passes.
- The API starts only after a successful PostgreSQL connection; an unavailable database returns a clear startup error.

## Next implementation boundaries

Authentication APIs, customer CRM operations, inventory operations, and challan operations remain intentionally unimplemented.
