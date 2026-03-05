# The Loophole — LSAT Logic Trainer

An interactive web app based on Ellen Cassidy's *The Loophole*, teaching logical reasoning through 4 game modes.

## Get Started

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org) (LTS version recommended).

### 2. Install dependencies
```bash
cd loophole-lsat
npm install
```

### 3. Run the dev server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Modules

| Module | Route | Description |
|--------|-------|-------------|
| **Flashcards** | `/flashcards` | Flip cards for indicator words, formal logic, and loophole vocabulary |
| **Logic Diagrams** | `/diagram` | Build if→then diagrams with auto-contrapositive generation |
| **Passage Finder** | `/passage` | Label sentences as Premise, Conclusion, Background, or Loophole |
| **Timed Quiz** | `/quiz` | 30-second timer, streak multipliers, high score tracking |

## Tech Stack

- React 18 + Vite + TypeScript
- Tailwind CSS
- Framer Motion (animations)
- React Flow (`@xyflow/react`) — diagram builder
- Zustand — state management with localStorage persistence

## Build for production
```bash
npm run build
```

Output goes to `dist/`. Deploy to Netlify, Vercel, or any static host.
