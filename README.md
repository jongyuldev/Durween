# Clippy: The Context Guardian

**Category:** Resurrection
**Tech Stack:** Electron, TypeScript, React (Ready)

## Project Description
This project resurrects the infamous Microsoft Office Assistant ("Clippy") as a modern AI-powered development companion. He floats over your VS Code window and actively monitors your progress against your Kiro `specs`.

## Features
- **Always on Top:** Clippy stays visible while you code.
- **Context Monitoring:** Reads `project.specs` to track your pending tasks.
- **Steering Docs Enforcement:** Reads `steering.md` to adjust Clippy's personality (e.g., Passive-Aggressive).
- **MCP Integration:** Connects to a (simulated) MCP server to analyze your code context.

## How to Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Start Clippy:
   ```bash
   npm start
   ```

## Configuration
- **project.specs**: Add your tasks here using `- [ ] Task Name` format.
- **steering.yaml**: Configure Clippy's personality (e.g., "Humble", "Efficient").

## Kiro Integration
- **Specs Parsing:** Implemented in `src/renderer.ts`.
- **Steering Docs:** Implemented in `src/renderer.ts` (reads `steering.yaml`).
- **MCP Client:** Implemented in `src/mcp.ts`.
