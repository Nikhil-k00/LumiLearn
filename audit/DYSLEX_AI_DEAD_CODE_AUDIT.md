# DysLex AI Dead-Code and Repository Cleanup Audit

Status: Read-only audit only. No files were edited, deleted, renamed, reformatted, or cleaned up.

## Scope and method

This audit covered the repository's runtime source, configuration, documentation, deployment files, and generated artifacts, with emphasis on the active code paths in:

- `frontend/src/`
- `backend/src/`
- `ai-service/`
- top-level config/deployment files
- audit and planning documents

Checks performed (read-only):

- enumerated the repository tree and source directories
- searched for route registrations, imports, hook usage, and module references
- scanned for empty files and comment-only files
- scanned for `TODO`/`FIXME`/debugging markers and obvious dead patterns
- reviewed runtime entrypoints and the main orchestration flow
- checked generated output folders (`.next`, `dist`, `__pycache__`, `node_modules`) to confirm they are build/install artifacts rather than source code

Limitations:

- This is a static repository audit, not a runtime dependency liveness test.
- Some files may be dormant but intentionally kept for future expansion or tooling.
- Dynamic or configuration-driven registration (for example framework conventions or env-based entrypoints) cannot be fully proven without running the full app under real traffic.

## Executive summary

High-confidence dead-code findings were limited. The repository is structured as a working app with active routes, hooks, controllers, models, and AI service logic wired together by convention. The strongest cleanup candidates are not production logic but operational/supporting artifacts and documentation files that were created as one-off investigation or audit outputs.

The main findings are:

- No broad, confirmed dead-code removal candidates were found in the core runtime paths.
- Several package files and `__init__.py` files are intentionally empty package markers or boilerplate and are not runtime code.
- One one-off diagnostic script (`backend/checkDuplicateAchievements.js`) is a likely manual-use artifact rather than production code.
- Planning and audit documents are active project records, not dead code, though they may be candidates for archival or triage later.
- Generated output directories should not be treated as dead code; they are build/install artifacts and are excluded from the cleanup recommendation list.

## File-by-file inventory

### Frontend (`frontend/`)

Active source entrypoints and route structure:

- `frontend/src/app/layout.tsx` — active root layout and metadata; not dead.
- `frontend/src/app/page.tsx` — active landing page.
- `frontend/src/app/login/` — active auth UI.
- `frontend/src/app/register/` — active student registration UI.
- `frontend/src/app/dashboard/` — active dashboard pages.
- `frontend/src/app/games/` — active game screens for phonics, word quest, memory challenge.
- `frontend/src/hooks/` — active session hooks (`usePoolGame`, `usePhonicsSession`, `useWordQuestSession`, `useMemorySession`, `useDashboardData`, `useTTS`).
- `frontend/src/components/` — active UI/game components and not dead based on imports from app pages.
- `frontend/src/contexts/` — active auth/accessibility providers.
- `frontend/src/lib/` — active API client and helpers.
- `frontend/src/data/` — active game data definitions / content.
- `frontend/next.config.js`, `frontend/tailwind.config.ts`, `frontend/tsconfig.json` — active framework config.

### Backend (`backend/`)

Active runtime structure:

- `backend/src/app.ts` — Express app factory, security middleware, rate limiting, route registration, 404 and error handling.
- `backend/src/server.ts` — server startup / graceful shutdown.
- `backend/src/controllers/` — `authController.ts`, `analyticsController.ts`, `gameController.ts`, `studentController.ts` — active API controllers.
- `backend/src/routes/` — `authRoutes.ts`, `analyticsRoutes.ts`, `gameRoutes.ts`, `studentRoutes.ts` — active API routes.
- `backend/src/models/` — active Mongoose models for `Student`, `Achievement`, `GameSession`, `GamePool`, etc.
- `backend/src/services/` — `aiService.ts` and `gamePoolService.ts` — active AI orchestration and pool refill logic.
- `backend/src/middleware/` — `auth.ts` — active JWT auth.
- `backend/src/utils/` — `gamification.ts`, `jwt.ts` — active helper logic.
- `backend/tsconfig.json` — active TypeScript compile config.

### AI service (`ai-service/`)

Active runtime structure:

- `ai-service/main.py` — FastAPI entrypoint.
- `ai-service/api/routes.py` — active API router.
- `ai-service/agents/orchestrator.py` — active orchestration coordinator.
- `ai-service/agents/*.py` — specialist agents (`analytics_agent.py`, `phonics_agent.py`, `reading_agent.py`, `memory_agent.py`, `recommendation_agent.py`) are active and referenced through the orchestrator.
- `ai-service/models/schemas.py` — active request/response schema definitions.
- `ai-service/utils/openai_client.py` — active client helper.

### Documentation / planning / audit artifacts

- `README.md` — active project overview and setup instructions.
- `docs/ARCHITECTURE.md` — active architecture reference.
- `agent-analysis-plan.md` — planning / analysis artifact, not runtime code.
- `dyslex-ai-plan.md` — planning artifact, not runtime code.
- `audit/DYSLEX_AI_COMPLETE_CODE_AUDIT.md` and `.pdf` — generated project audit outputs, not runtime code.

### Generated / installed artifacts

- `frontend/.next/`
- `frontend/node_modules/`
- `backend/dist/`
- `backend/node_modules/`
- `ai-service/__pycache__/`
- `*.pyc` files

These are build/install outputs and should be treated as generated artifacts, not dead source code.

## Findings list

| # | File / symbol | Classification | Evidence | Impact | Recommendation |
|---|---|---|---|---|---|
| 1 | `backend/checkDuplicateAchievements.js` | Likely unused | Standalone diagnostic script; not referenced by Express app startup, route registration, or package scripts; used for manual duplicate-checking and not part of the runtime app | Low | REMOVE AFTER APPROVAL or DOCUMENT |
| 2 | `ai-service/agents/__init__.py` | Intentionally empty | Python package marker file; empty package initializer; no runtime behavior | None | KEEP |
| 3 | `ai-service/api/__init__.py` | Intentionally empty | Empty Python package marker; no runtime behavior | None | KEEP |
| 4 | `ai-service/models/__init__.py` | Intentionally empty | Empty Python package marker; no runtime behavior | None | KEEP |
| 5 | `ai-service/utils/__init__.py` | Intentionally empty | Empty Python package marker; no runtime behavior | None | KEEP |
| 6 | `agent-analysis-plan.md` | Likely unused as runtime | Project planning document; no app imports or runtime references | None | DOCUMENT |
| 7 | `dyslex-ai-plan.md` | Likely unused as runtime | Project planning document; no app imports or runtime references | None | DOCUMENT |
| 8 | `audit/DYSLEX_AI_COMPLETE_CODE_AUDIT.md` | Active audit artifact | Created for audit review, not runtime logic | None | DOCUMENT |
| 9 | `audit/DYSLEX_AI_COMPLETE_CODE_AUDIT.pdf` | Active audit artifact | Generated report artifact; not runtime logic | None | DOCUMENT |
| 10 | Generated output directories (`.next`, `dist`, `__pycache__`, `node_modules`) | Active generated artifacts | They are framework/build dependency outputs, not source files; present because the repo was installed and built | None | KEEP (do not treat as dead code) |

## Empty files, comment-only files, and boilerplate

No empty source files were found in the runtime paths.

Empty or intentionally empty package initializer files found:

- `ai-service/agents/__init__.py`
- `ai-service/api/__init__.py`
- `ai-service/models/__init__.py`
- `ai-service/utils/__init__.py`

These are Python package markers and are standard boilerplate. They do not constitute dead production logic.

## Unused imports / functions / duplicates / unreachable code

### High-confidence status: no confirmed dead code found in active runtime paths

The main active runtime modules are cross-referenced in the expected framework patterns:

- Express route registration occurs in `backend/src/app.ts`.
- The backend controllers are registered via route files and are invoked by API endpoints.
- The game controller uses `gamePoolService` and `aiService` in the request flow.
- The frontend app pages import the session hooks and TTS hook directly.
- The AI service orchestrator explicitly imports and invokes the specialist agents.

### Likely candidates requiring human review before removal

1. `backend/checkDuplicateAchievements.js`
   - One-off duplicate-achievement diagnostic script created for a remediation check.
   - It is not part of the application runtime or a package script.
   - Safe only if a maintainer confirms it is intentionally no longer needed.

2. Planning docs (`agent-analysis-plan.md`, `dyslex-ai-plan.md`)
   - These are project planning artifacts and not runtime code.
   - They are not dead logic, but may be archival noise if the team prefers a cleaner repo.

## Potentially unused dependencies and config

### Notable findings

- No strong evidence of unused runtime packages was found after checking package files and imports/references.
- `axios` is used in the frontend API client and backend service layer.
- `helmet`, `cors`, `express-rate-limit`, and `mongoose` are wired into active middleware and app startup.
- `next`, `react`, `tailwindcss`, and charting libraries are part of the app's framework and dashboard UI.
- FastAPI and OpenAI-related dependencies in the AI service are used by `main.py`, `routes.py`, and the service utilities.

### Safe conclusions

- No dependency removal recommendation is justified based on static repo scan alone.
- Any dependency cleanup should be deferred until a package-usage analysis under a real build/test cycle is performed.

## Safe cleanup candidates vs manual review

### KEEP

- All active runtime source files in `frontend/src`, `backend/src`, and `ai-service/`
- `README.md`, `docs/ARCHITECTURE.md`, project config files, and deployment config
- `__init__.py` package markers
- Generated build/install directories (`.next`, `dist`, `__pycache__`, `node_modules`)

### REMOVE AFTER APPROVAL

- `backend/checkDuplicateAchievements.js` — only if maintainers confirm the script is no longer needed and no historical use case requires preserving it as a utility artifact.

### INVESTIGATE

- None of the main runtime modules showed clear dead code without further execution-based validation.
- Future cleanup should be done only with a live build/test pass and a dependency-usage audit.

### DOCUMENT

- Planning and audit documents
- One-off scripts used during investigation or remediation
- Repository-generated artifacts that are useful as historical references but not runtime code

## Prioritized cleanup plan

### High priority

- None. No confirmed dead production code paths were found in the active runtime project.

### Medium priority

- `backend/checkDuplicateAchievements.js`: review and decide whether to keep as a historical diagnostic helper or remove after approval.
- Planning docs: decide if they should remain as project records or be archived to a separate documentation location.

### Low priority

- Generated report artifacts and historical planning docs, if the team wants a cleaner repo without affecting functionality.

## Tests required before any removal

Before removing or archiving any candidate file, the minimum checks should be:

1. Confirm there are no imports, scripts, docs, or workflow references to the file.
2. Confirm the file is not part of any build, deploy, or local setup process.
3. Run the app's standard project validation commands in a clean environment.
4. For any script or utility, confirm it is not required for local debugging, support, or operational runbooks.

### Recommended validation commands (not executed here)

- `cd backend && npm run build`
- `cd backend && npm test`
- `cd frontend && npm run build`
- `cd ai-service && python -m compileall .`

These checks were not run as part of this audit because the task explicitly required a read-only, non-destructive audit and no code modifications.

## Final assessment

The repository does not appear to contain a large amount of confirmed dead source code. Most files are tied into the active app architecture. The only plausible cleanup candidates are one-off support scripts, planning docs, and generated artifacts. The repository should be left intact until a maintainer explicitly approves cleanup or archival actions.
