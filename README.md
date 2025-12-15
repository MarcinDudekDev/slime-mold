# Slime Mold Simulation

Interactive multi-organism slime mold simulation with energy-based growth, autophagy, and evolutionary mechanics.

## Features

- **Multiple Organisms**: Up to 8 competing organisms with unique colors and mutations
- **Energy System**: Nodes consume energy, share it intelligently, and perform autophagy when starving
- **Growth & Division**: Organisms grow toward food and divide when reaching sufficient size/energy
- **Predation**: Large organisms can hunt and consume single-cell organisms
- **Walls**: Draw temporary barriers to influence organism movement
- **Seeds**: Dead organisms leave seeds that transfer their mutations when consumed
- **Mutations**: Purple food grants random mutations (speed, reach, branching)

## Controls

- **Tap**: Add food
- **Hold**: Add mutation food (purple)
- **Triple tap**: Food burst (5 pieces)
- **Double tap + drag**: Draw wall

## Parameters

Adjustable via settings panel (⚙):
- Organism count, tick rate, energy drain
- Growth cost/interval, division thresholds
- Food spawn rate/amount
- Wall duration

## Installation

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Tech Stack

- React 18
- Vite 5
- Tailwind CSS
- Canvas API

## License

MIT
