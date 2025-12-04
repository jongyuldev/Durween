# Tech Stack & Build System

## Core Technologies
- **Runtime**: Electron (desktop app framework)
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite
- **AI**: Google Gemini API (`@google/genai`)

## Key Dependencies
- `lucide-react` - Icon library
- `recharts` - Charts for stats visualization
- `d3` - Data visualization utilities
- `concurrently`, `wait-on`, `cross-env` - Dev tooling

## TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- JSX: react-jsx
- Path alias: `@/*` maps to project root

## Environment Variables
- `API_KEY` or `GEMINI_API_KEY` - Google Gemini API key (required)
- Loaded via Vite's `loadEnv` and exposed as `process.env.API_KEY`

## Common Commands

```bash
# Install dependencies
npm install

# Development (runs Vite + Electron concurrently)
npm run dev

# Build for production
npm run build

# Build and run Electron production
npm run electron:build

# Preview Vite build
npm run preview
```

## Development Notes
- Dev server runs on port 3000
- Electron waits for Vite server before launching (`wait-on tcp:3000`)
- `NODE_ENV=development` or `--dev` flag enables dev mode in Electron
