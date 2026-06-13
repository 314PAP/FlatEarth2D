// ─── Sdílené typy ───────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Platform extends Rect {
  /** Vizuální výška zábradlí/povrchu */
  surfaceH: number;
}

/** Výsledek detekce kolize z obdélníkového sweeptestu */
export interface CollisionResult {
  hit: boolean;
  normalX: number;
  normalY: number;
  time: number;
}

/** Stav fyzikálního objektu */
export interface PhysicsBody extends Rect {
  vx: number;
  vy: number;
  onGround: boolean;
}

/** Materiály/věci, co Glober upustí */
export interface Drop {
  x: number;
  y: number;
  vy: number;
  collected: boolean;
  kind: 'ether' | 'material';
}

/** Herní stav pro render (vstup do Enginu) */
export interface GameState {
  ether: number;
  maxEther: number;
  score: number;
  domoHp: number;
  domoMaxHp: number;
  ultimateActive: boolean;
}
