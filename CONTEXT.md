# CONTEXT.md – Flat Earth 2D Continuity Document

## Project Overview
2D Side-Scrolling Beat 'Em Up (Cadillacs and Dinosaurs / Streets of Rage style) called "Flat Earth".
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
    └── UI.ts
```

### Genre Specification
- 2D Beat 'Em Up (Cadillacs and Dinosaurs / Streets of Rage style)
- Continuous horizontal street/ground plane
- NO platforms to jump on
- Domo moves 4-way: Left/Right (X-axis) and Up/Down (Y-axis depth layers)
- Characters scale based on Y-position (depth: smaller when far back, larger when close)
- Dynamic Y-sort rendering for proper depth ordering
- Attacks register only when characters are on same horizontal level AND Y-depth overlaps

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
  - `left, right, up, down, jump, attack, ultimate: boolean`
  - `isJustPressed(key: keyof InputState): boolean`
  - `endFrame(): void`

#### `src/Domo.ts`
- `class Domo`
  - `body: PhysicsBody`
  - `update(dt, input, entities): void`
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
  - `update(dt, entities): void`
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

## STEP 1 STATUS – COMPLETE
- package.json, tsconfig.json, vite.config.ts created
- index.html created with responsive layout + touch overlay
- deploy.yml created
- npx tsc --noEmit passed
- Git commit and push to main branch performed
- CONTEXT.md status updated: Step 1 Complete

## CPS-1 ARCADE REFACTOR (2026-06-14)

### Camera Screen Lock (CPS-1 Logic)
- Camera scrolls horizontally ONLY when Domo crosses the screen center
- No backward scrolling allowed once advanced
- When enemy wave spawns, camera locks forward (right edge becomes a wall)
- After all enemies dead, flash "GO ->" UI before next section

### Arcade Hitboxes (Strict CPS-1)
- Attacks only land if X-boxes overlap AND |Y-depth| < 15 logical pixels
- Otherwise attacks miss completely (no damage)
- Render array sorted by Y-coordinate every frame for Z-indexing

### Breakable Objects
- Crates/barrels spawn on the floor, block movement until smashed
- On 0 HP drop: Illuminati Card, healing food, or temporary weapon (visual placeholder)

### Flanking AI
- Glober enemies use 3-state AI: approach -> flank -> strike
- Approach: move toward Domo on X, slight Y adjustment
- Flank: shuffle up/down to match Domo's depth layer
- Strike: only line up on same Y-layer when within range, then rush forward

### Module Changes
- `src/Camera.ts`: Added `locked` state, forward-only scroll lock
- `src/Engine.ts`: GO flash timer, camera pass `enemiesActive`, breakable spawn, refined hitbox
- `src/Glober.ts`: Added `AIState`, flanking logic with `flankDir`, Y-depth targeting
- `src/CardManager.ts`: Added `Breakable` interface and `spawnBreakable()`
