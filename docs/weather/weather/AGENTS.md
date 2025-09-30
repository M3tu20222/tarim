# Repository Guidelines

## Project Structure & Module Organization
This Vite + React 19 dashboard keeps source files in the repo root. `App.tsx` wires global layout and mounts `components/WeatherDashboard.tsx`, while `index.tsx` boots the React tree. UI pieces live under `components/`, with charts and Gemini output separated into focused files. Data fetching and AI orchestration stay in `services/`, sharing typed contracts from `types.ts` and constants in `constants.ts`. Build tooling sits alongside (`vite.config.ts`, `tsconfig.json`), and environment defaults belong in `.env.local` (never commit real keys).

## Build, Test, and Development Commands
- `npm install` - install Node dependencies.
- `npm run dev` - start the Vite dev server on the configured port.
- `npm run build` - produce the optimized bundle in `dist/`.
- `npm run preview` - serve the build output for smoke testing.

## Coding Style & Naming Conventions
Follow the existing TypeScript + JSX patterns: 2-space indentation, semicolons, and single quotes. Components and hooks use PascalCase filenames (`WeatherDashboard.tsx`), utilities and constants use camelCase. Keep tailwind utility clusters readable by grouping related classes, and prefer deriving UI strings from shared constants. Extend `types.ts` when introducing new API models so fetchers and components stay type-safe. Use path alias `@/` for cross-folder imports instead of deep relative chains.

## Testing Guidelines
Automated tests are not configured yet; new features should ship with Vitest + React Testing Library coverage placed next to the source (for example `components/__tests__/WeatherDashboard.test.tsx`). Aim for unit coverage of data shaping logic in `services/` and interaction tests for major components. At minimum, document manual verification steps in the PR (run `npm run dev`, trigger Gemini analysis, validate charts render for current and historical data ranges).

## Commit & Pull Request Guidelines
History is fresh, so adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) with a short scope, e.g. `feat: add soil moisture overlay`. Each PR should link any tracking issue, summarize functional changes, list manual test commands, and attach updated UI screenshots when you touch visible components. Confirm `.env.local` stays local and redact API keys from logs or diffs.
