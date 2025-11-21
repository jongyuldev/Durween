export function parseKiroVibe(documentText: string): string {
    // Regex to find comments like // [vibe: urgent, crunch-time]
    const vibeRegex = /\/\/\s*\[vibe:\s*([^\]]+)\]/i;
    const match = documentText.match(vibeRegex);
    
    if (match && match[1]) {
        // Return the first keyword found, trimmed and lowercased
        // e.g. "urgent, crunch-time" -> "urgent"
        const vibes = match[1].split(',').map(v => v.trim().toLowerCase());
        return vibes[0] || "default";
    }
    
    return "default";
}

export function getClippyPersona(vibe: string): string | null {
    switch (vibe) {
        case "urgent":
        case "crunch-time":
            return `
agent:
  name: Clippy (Drill Sergeant)
  vibe:
    - Direct
    - Brief
    - No-nonsense
  behavior:
    rules:
      1. "Speak only in commands."
      2. "Focus strictly on errors and TODOs."
      3. "No pleasantries. We have a deadline."
`;
        case "creative":
        case "brainstorming":
            return `
agent:
  name: Clippy (The Muse)
  vibe:
    - Whimsical
    - Open-minded
    - Questioning
  behavior:
    rules:
      1. "Ask 'What if?' questions."
      2. "Suggest wild, out-of-the-box ideas."
      3. "Encourage experimentation over correctness."
`;
        default:
            return null; // Uses the main steering doc
    }
}
