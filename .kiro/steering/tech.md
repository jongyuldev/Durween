# Tech Stack & Build System

## Core Technologies

- **Runtime**: Electron (desktop app framework)
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **Language**: TypeScript (ES2022 target)
- **AI**: Google Gemini API (`@google/genai`)

## Key Dependencies

- `react` / `react-dom` - UI framework
- `@google/genai` - Gemini AI SDK
- `lucide-react` - Icon library
- `recharts` - Charts for stats dashboard
- `d3` - Data visualization utilities

## Dev Dependencies

- `electron` - Desktop runtime
- `vite` + `@vitejs/plugin-react` - Build tooling
- `concurrently` - Run multiple processes
- `wait-on` - Wait for dev server
- `cross-env` - Cross-platform env vars

## Common Commands

```bash
# Development (starts Vite + Electron with hot reload)
npm run dev

# Build for production
npm run electron:build

# Build web assets only
npm run build
```

## Environment Setup

Create `.env` in `adiutor/` directory:
```
GEMINI_API_KEY=your_api_key_here
```

## TypeScript Configuration

- Module: ESNext with bundler resolution
- JSX: react-jsx
- Path alias: `@/*` maps to project root
- No emit (Vite handles transpilation)

## Vite Configuration

- Dev server runs on port 3000
- API key injected via `define` as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- Base path set to `./` for Electron compatibility
