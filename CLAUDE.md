# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install    # Install dependencies
npm run dev    # Start Vite dev server (hot reload)
npm run build  # Production build to dist/
npm run preview # Preview production build
```

## Architecture

Single-component React app rendering a Canvas-based slime mold simulation.

**Entry point**: `src/main.jsx` → renders `<SlimeMold />` component

**Core file**: `src/SlimeMold.jsx` (~1140 lines) - contains all simulation logic:

- **State**: `params` (simulation parameters), `stats` (organism display data)
- **Game loop**: `tick()` function in useEffect, uses `requestAnimationFrame`
- **Entity arrays**: `organisms`, `food`, `walls`, `seeds` (all local to useEffect)

### Simulation Mechanics

Each **organism** has:
- `nodes[]` - individual cells with {id, x, y, energy, lastAte}
- `edges[]` - connections between nodes {a, b}
- `hue` - color, `mutation` - {speed, reach, branches}

**Key behaviors**:
- Nodes drain energy each tick, gain from eating food
- Growth: nodes extend toward food when energy > `minEnergyToGrow`
- Autophagy: terminal nodes consumed when energy < `criticalThreshold`
- Division: organisms split when nodes >= `divisionThreshold` && energy >= `divisionEnergy`
- Predation: large organisms hunt single-cell organisms (3x energy required)

**Helper functions** (within useEffect):
- `dist()`, `distToSegment()`, `segmentsIntersect()` - geometry
- `isPathBlocked()`, `effectiveDistance()` - wall collision
- `findTarget()` - AI targeting (food, prey, seeds)
- `buildAdjacency()`, `getConnectedNodes()` - graph operations
- `closestTo()` - nearest node to point

### Input Handling

Touch/mouse events interpreted as:
- Single tap → add food
- Hold 500ms → add mutation food (purple)
- Triple tap → food burst (5 pieces)
- Double tap + drag → draw temporary wall

## Tech Stack

- React 18 + Vite 5
- Tailwind CSS (UI overlays only)
- Canvas 2D API (all simulation rendering)
