# Project Structure

```
adiutor/
├── App.tsx              # Main application component (state, UI, logic)
├── index.tsx            # React entry point
├── index.html           # HTML template
├── types.ts             # TypeScript types and enums
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables (GEMINI_API_KEY)
│
├── components/          # React UI components
│   ├── GhostCharacter.tsx   # Animated ghost SVG character
│   ├── GhostCharacter.css   # Ghost animations and styles
│   ├── StatsBoard.tsx       # Productivity stats dashboard
│   └── AduitorCharacter.tsx # Alternative character component
│
├── services/            # External service integrations
│   └── geminiService.ts     # All Gemini API interactions
│
├── electron/            # Electron main process
│   └── main.cjs             # Window creation, IPC handlers
│
└── dist/                # Build output (generated)
```

## Architecture Patterns

- **Single App Component**: Main `App.tsx` contains most state and UI logic
- **Services Layer**: `services/` directory for external API calls
- **Type Definitions**: Centralized in `types.ts` with enums for states/modes
- **Electron IPC**: Main process in `electron/main.cjs`, renderer uses `ipcRenderer` for window control

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Core app logic, state management, UI rendering |
| `types.ts` | All TypeScript interfaces and enums |
| `geminiService.ts` | Gemini API calls (chat, search, image gen, transcription) |
| `electron/main.cjs` | Electron window setup, IPC handlers |
| `GhostCharacter.tsx` | SVG ghost with state-based expressions |

## State Management

- React `useState` for all state (no external state library)
- `localStorage` for persistence (streak data, settings)
- Refs for audio recording, drag handling, and DOM elements
