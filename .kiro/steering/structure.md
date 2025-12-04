# Project Structure

```
aduitor/
├── App.tsx              # Main application component (UI, state, logic)
├── index.tsx            # React entry point
├── index.html           # HTML template
├── types.ts             # TypeScript type definitions and enums
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
├── package.json         # Dependencies and scripts
├── .env                 # Environment variables (API keys)
│
├── components/          # React UI components
│   ├── GhostCharacter.tsx   # Animated ghost SVG character
│   ├── GhostCharacter.css   # Ghost animations and styles
│   └── StatsBoard.tsx       # Productivity stats with pie chart
│
├── services/            # External service integrations
│   └── geminiService.ts     # Google Gemini API wrapper
│
├── electron/            # Electron main process
│   └── main.cjs             # Window creation, IPC handlers
│
└── dist/                # Production build output
```

## Architecture Patterns

### State Management
- React `useState` for local component state
- `localStorage` for persistence (streaks, settings)
- No external state library - all state in `App.tsx`

### Service Layer
- `services/geminiService.ts` encapsulates all AI API calls
- Exports individual functions per capability (chat, search, transcribe, image gen)
- Tool definitions (function calling) defined in service file

### Component Design
- Functional components with TypeScript interfaces for props
- CSS modules/files for component-specific styles
- SVG-based character with CSS animations

### Electron Integration
- Main process in CommonJS (`main.cjs`)
- IPC for window controls (`move-window`, `minimize-app`, `close-app`)
- `nodeIntegration: true`, `contextIsolation: false` for direct Electron access
