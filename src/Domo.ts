import type { PhysicsBody, Platform } from './types.js';
import { MOVE_SPEED, LOGICAL_WIDTH, LOGICAL_HEIGHT, BEATEMUP_GROUND_Y, BEATEMUP_FAR_LAYER_Y } from './constants.js';
import type { InputManager } from './Input.js';

export const DOMO_W = 48;
export const DOMO_H = 64;

type AttackPhase = 'none' | 'windup' | 'active' | 'recovery';

export class Domo {
  body: PhysicsBody = {
    x: 200, y: BEATEMUP_GROUND_Y - DOMO_H,
    w: DOMO_W, h: DOMO_H,
    vx: 0, vy: 0,
    onGround: true,
  };

  hp = 5;
  maxHp = 5;
  facing = 1;
  attackPhase: AttackPhase = 'none';
  attackTimer = 0;
  attackDamage = 1;

  private readonly WINDUP = 0.08;
  private readonly ACTIVE = 0.12;
  private readonly RECOVERY = 0.15;

  get attackRect() {
    const b = this.body;
    const ox = this.facing > 0 ? b.w : -52;
    return { x: b.x + ox, y: b.y + 8, w: 52, h: b.h - 16 };
  }

  get isAttacking(): boolean { return this.attackPhase === 'active'; }
  get isDead(): boolean { return this.hp <= 0; }

  invTimer = 0;
  get isInvulnerable(): boolean { return this.invTimer > 0; }

  update(dt: number, input: InputManager, _platforms: Platform[]): void {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }

    this.body.vx = dx * MOVE_SPEED;
    this.body.vy = dy * MOVE_SPEED;

    if (input.isJustPressed('jump') && this.body.onGround) {
      this.body.vy = -300;
      this.body.onGround = false;
    }

    this.body.x += this.body.vx * dt;
    this.body.y += this.body.vy * dt;

    // Clamp Y to depth layers
    if (this.body.y < BEATEMUP_FAR_LAYER_Y) this.body.y = BEATEMUP_FAR_LAYER_Y;
    if (this.body.y > BEATEMUP_GROUND_Y - this.body.h) this.body.y = BEATEMUP_GROUND_Y - this.body.h;

    if (this.body.x < 0) this.body.x = 0;
    if (this.body.x + this.body.w > 3000) this.body.x = 3000 - this.body.w;

    if (input.isJustPressed('attack') && this.attackPhase === 'none') {
      this.attackPhase = 'windup';
      this.attackTimer = this.WINDUP;
    }
    this.updateAttack(dt);

    if (this.invTimer > 0) this.invTimer -= dt;
  }

  private updateAttack(dt: number): void {
    if (this.attackPhase === 'none') return;
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      switch (this.attackPhase) {
        case 'windup':
          this.attackPhase = 'active';
          this.attackTimer = this.ACTIVE;
          break;
        case 'active':
          this.attackPhase = 'recovery';
          this.attackTimer = this.RECOVERY;
          break;
        case 'recovery':
          this.attackPhase = 'none';
          break;
      }
    }
  }

  takeDamage(amount: number): void {
    if (this.isInvulnerable || this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invTimer = 1.2;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;
    if (this.isInvulnerable && Math.floor(this.invTimer * 10) % 2 === 0) return;

    const depthRatio = (y + h - BEATEMUP_FAR_LAYER_Y) / (BEATEMUP_GROUND_Y - BEATEMUP_FAR_LAYER_Y);
    const scale = 0.6 + depthRatio * 0.4;

    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(this.facing * scale, scale);

    ctx.fillStyle = '#e8c060';
    ctx.fillRect(-w / 2, -h, w, h);

    ctx.fillStyle = '#f0d080';
    ctx.beginPath();
    ctx.arc(0, -h - 10, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-6, -h - 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -h - 12, 3, 0, Math.PI * 2);
    ctx.fill();

    if (this.attackPhase === 'active') {
      ctx.fillStyle = 'rgba(255, 220, 80, 0.4)';
      ctx.beginPath();
      ctx.arc(w / 2 + 20, -h / 2, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}