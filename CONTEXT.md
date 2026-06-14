# CONTEXT.md – Flat Earth 2D Continuity Document

## Project Overview
2D Arcade-style Beat 'em Up web game called "Flat Earth".  
Stack: **Vite + TypeScript + HTML5 Canvas + GitHub Actions (CI/CD for GitHub Pages)**.  
Repository: `github.com/314PAP/FlatEarth2D`  
Deployment target: GitHub Pages via `gh-pages` branch.

---

## Planned Architecture

### File Tree
```
FlatEarth2D-main/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .gitignore
├── CONTEXT.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.ts
    ├── constants.ts
    ├── types.ts
    ├── Engine.ts
    ├── Camera.ts
    ├── Input.ts
    ├── Domo.ts
    ├── Glober.ts
    ├── CardManager.ts
    ├── Companion.ts
    ├── UI.ts
```

### Class Structures & Method Signatures

#### `src/Engine.ts`
- `class Engine`
  - `constructor(canvas: HTMLCanvasElement)`
  - `start(): void`
  - `loop(timestamp: number): void`
  - `fixedUpdate(dt: number): void`
  - `render(): void`
  - `buildState(): GameState`

#### `src/Camera.ts`
- `class Camera`
  - `constructor()`
  - `update(targetX: number, dt: number): number`
  - `layers: { speed: number; color: string }[]`

#### `src/Input.ts`
- `interface InputState`
- `class InputManager`
  - `left, right, jump, attack, ultimate: boolean`
  - `isJustPressed(key: keyof InputState): boolean`
  - `endFrame(): void`

#### `src/Domo.ts`
- `class Domo`
  - `body: PhysicsBody`
  - `update(dt, input, platforms): void`
  - `draw(ctx): void`
  - `attackRect: {x,y,w,h}`
  - `isAttacking: boolean`
  - `isDead: boolean`

#### `src/Glober.ts`
- `class Glober`
  - `body: PhysicsBody`
  - `alive: boolean`
  - `headState: 'globe' | 'flattening' | 'flat'`
  - `flatProgress: number`
  - `update(dt, platforms): void`
  - `draw(ctx): void`
  - `takeDamage(amount): void`

#### `src/CardManager.ts`
- `class CardManager`
  - `cardsCollected: number`
  - `heatMeter: number`
  - `spawnCard(x, y): void`
  - `update(dt): void`
  - `draw(ctx): void`

#### `src/Companion.ts`
- `class Companion`
  - `unlocked: boolean`
  - `active: boolean`
  - `summon(): void`
  - `update(dt): void`
  - `draw(ctx): void`

#### `src/UI.ts`
- `class UI`
  - `draw(ctx, state: GameState): void`
  - `drawHpBar(ctx, state): void`
  - `drawHeatMeter(ctx, state): void`
  - `drawCardCount(ctx, state): void`

---

## STEP 1 STATUS – COMPLETE

### Base Infrastructure
- `package.json`: scripts `dev`, `build`, `preview`; devDeps `typescript`, `vite`
- `tsconfig.json`: strict mode, bundler resolution
- `vite.config.ts`: `base: '/FlatEarth2D/'`
- `index.html`: responsive 16:9 layout with touch overlay
- `.github/workflows/deploy.yml`: GitHub Pages deployment on push to `main`
