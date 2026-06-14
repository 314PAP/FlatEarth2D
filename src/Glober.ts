import type { PhysicsBody } from './types.js';
import { BEATEMUP_GROUND_Y, BEATEMUP_FAR_LAYER_Y, MOVE_SPEED } from './constants.js';

export const GLOBER_W = 44;
export const GLOBER_H = 60;

type HeadState = 'globe' | 'flattening' | 'flat';
type AIState = 'approach' | 'flank' | 'strike';

export class Glober {
  body: PhysicsBody = {
    x: 0, y: 0,
    w: GLOBER_W, h: GLOBER_H,
    vx: 0, vy: 0,
    onGround: false,
  };

  hp = 2;
  readonly maxHp = 2;
  alive = true;
  headState: HeadState = 'globe';
  flattenTimer = 0;
  readonly FLATTEN_DURATION = 0.45;
  flatProgress = 1;

  private patrolMinX = 0;
  private patrolMaxX = 0;
  private patrolSpeed = 80;
  private facing = 1;
  private deathTimer = -1;
  readonly DEATH_DURATION = 1.2;
  drops: { x: number; y: number; vy: number; collected: boolean; kind: 'ether' | 'material' }[] = [];
  private globeRotation = 0;

  // Flanking AI
  aiState: AIState = 'approach';
  private aiTimer = 0;
  private flankDir = 1;
  private readonly FLANK_DURATION = 0.8;
  private readonly STRIKE_RANGE = 60;
  private readonly Y_DEPTH_TOLERANCE = 15;

  constructor(x: number, y: number, patrolMin: number, patrolMax: number) {
    this.body.x = x;
    this.body.y = y;
    this.patrolMinX = patrolMin;
    this.patrolMaxX = patrolMax;
    this.body.vx = this.patrolSpeed;
    this.facing = 1;
  }

  get isDead(): boolean { return !this.alive; }
  get isRemoving(): boolean { return this.deathTimer >= 0 && this.deathTimer >= this.DEATH_DURATION; }

  update(dt: number, domoBody: PhysicsBody | null): void {
    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }
    this.globeRotation += dt * 60 * this.facing;

    if (domoBody) {
      const dx = domoBody.x - this.body.x;
      const dy = domoBody.y - this.body.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const yDist = Math.abs(dy);

      // AI state machine
      if (yDist < this.Y_DEPTH_TOLERANCE && dist < this.STRIKE_RANGE) {
        this.aiState = 'strike';
      } else if (yDist < this.Y_DEPTH_TOLERANCE) {
        this.aiState = 'approach';
      } else {
        this.aiState = 'flank';
      }

      switch (this.aiState) {
        case 'approach':
          // Move toward Domo on X, adjust Y slightly
          this.body.vx = dx > 0 ? this.patrolSpeed : -this.patrolSpeed;
          this.body.vy = dy * 0.5;
          this.facing = dx > 0 ? 1 : -1;
          break;
        case 'flank':
          // Shuffle up/down to match Domo's Y-layer
          this.aiTimer += dt;
          if (this.aiTimer >= this.FLANK_DURATION) {
            this.aiTimer = 0;
            this.flankDir *= -1;
          }
          this.body.vx = dx > 0 ? this.patrolSpeed * 0.5 : -this.patrolSpeed * 0.5;
          this.body.vy = this.flankDir * MOVE_SPEED * 0.3;
          break;
        case 'strike':
          // Rush forward on same Y-layer
          this.body.vx = dx > 0 ? this.patrolSpeed * 1.5 : -this.patrolSpeed * 1.5;
          this.body.vy = 0;
          this.facing = dx > 0 ? 1 : -1;
          break;
      }
    }

    this.body.x += this.body.vx * dt;
    this.body.y += this.body.vy * dt;

    // Clamp to playfield
    if (this.body.x < this.patrolMinX) this.body.x = this.patrolMinX;
    if (this.body.x + this.body.w > this.patrolMaxX) this.body.x = this.patrolMaxX;
    if (this.body.y < BEATEMUP_FAR_LAYER_Y) this.body.y = BEATEMUP_FAR_LAYER_Y;
    if (this.body.y > BEATEMUP_GROUND_Y - this.body.h) this.body.y = BEATEMUP_GROUND_Y - this.body.h;

    if (this.headState === 'flattening') {
      this.flattenTimer += dt;
      this.flatProgress = Math.max(0, 1 - this.flattenTimer / this.FLATTEN_DURATION);
      if (this.flattenTimer >= this.FLATTEN_DURATION) {
        this.headState = 'flat';
        this.flatProgress = 0;
      }
    }
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.headState === 'globe') { this.headState = 'flattening'; this.flattenTimer = 0; }
    if (this.hp <= 0) this.kill();
  }

  kill(): void {
    if (!this.alive) return;
    this.alive = false;
    this.headState = 'flat';
    this.flatProgress = 0;
    this.deathTimer = 0;
    this.drops.push({
      x: this.body.x + this.body.w / 2,
      y: this.body.y,
      vy: -200,
      collected: false,
      kind: 'ether',
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.isRemoving) return;
    const { x, y, w, h } = this.body;
    const alpha = this.alive ? 1 : Math.max(0, 1 - this.deathTimer / this.DEATH_DURATION);
    ctx.globalAlpha = alpha;

    ctx.save();
    ctx.translate(x + w / 2, y + h);
    const depthRatio = (y + h - BEATEMUP_FAR_LAYER_Y) / (BEATEMUP_GROUND_Y - BEATEMUP_FAR_LAYER_Y);
    const scale = 0.5 + depthRatio * 0.5;
    ctx.scale(this.facing * scale, scale);

    ctx.fillStyle = '#6060c0';
    ctx.fillRect(-w / 2, -h, w, h);

    const headY = -h - 22;
    if (this.headState === 'globe' || this.headState === 'flattening') {
      const ry = 12 * this.flatProgress + 3 * (1 - this.flatProgress);
      const rx = 20 + 5 * (1 - this.flatProgress);
      ctx.fillStyle = '#40a0e0';
      ctx.beginPath();
      ctx.ellipse(0, headY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,200,255,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, headY, rx * Math.abs(Math.cos(this.globeRotation)), ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1060a0';
      ctx.beginPath();
      ctx.ellipse(0, headY + 20, 22, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#ffee80';
    ctx.beginPath();
    ctx.arc(-8, -h + 14, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -h + 14, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;

    for (const d of this.drops) {
      if (d.collected) continue;
      ctx.fillStyle = '#f0d020';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function spawnWave(level: number): Glober[] {
  const globers: Glober[] = [];
  const count = 3 + level * 2;
  const spawnPoints = [
    { x: 300, min: 200, max: 500, y: BEATEMUP_GROUND_Y - GLOBER_H },
    { x: 600, min: 500, max: 800, y: BEATEMUP_GROUND_Y - GLOBER_H },
    { x: 900, min: 800, max: 1100, y: BEATEMUP_GROUND_Y - GLOBER_H },
    { x: 1200, min: 1100, max: 1400, y: BEATEMUP_GROUND_Y - GLOBER_H },
  ];
  for (let i = 0; i < count; i++) {
    const sp = spawnPoints[i % spawnPoints.length];
    const g = new Glober(sp.x, sp.y, sp.min, sp.max);
    g.hp = Math.min(2 + Math.floor(level / 2), 5);
    (g as any).maxHp = g.hp;
    globers.push(g);
  }
  return globers;
}
