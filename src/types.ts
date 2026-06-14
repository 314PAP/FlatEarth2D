export interface Rect { x: number; y: number; w: number; h: number; }
export interface Vec2 { x: number; y: number; }
export interface Platform extends Rect { surfaceH: number; }
export interface PhysicsBody extends Rect { vx: number; vy: number; onGround: boolean; }
export interface Drop { x: number; y: number; vy: number; collected: boolean; kind: 'ether' | 'material'; }
export interface GameState {
  ether: number;
  maxEther: number;
  heatMeter: number;
  score: number;
  domoHp: number;
  domoMaxHp: number;
  cardsCollected: number;
  ultimateActive: boolean;
}