// ─── Domo.ts – hráčský charakter ────────────────────────────────────────────

import type { PhysicsBody, Platform } from './types.js';
import {
  GRAVITY, JUMP_VELOCITY, MOVE_SPEED,
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
} from './constants.js';
import type { InputManager } from './Input.js';

export const DOMO_W = 48;
export const DOMO_H = 64;

/** Fáze útoku */
type AttackPhase = 'none' | 'windup' | 'active' | 'recovery';

export class Domo {
  body: PhysicsBody = {
    x: 120, y: 400,
    w: DOMO_W, h: DOMO_H,
    vx: 0, vy: 0,
    onGround: false,
  };

  hp    = 5;
  maxHp = 5;

  /** Směr pohledu: 1 = vpravo, -1 = vlevo */
  facing = 1;

  // Útok
  attackPhase: AttackPhase = 'none';
  attackTimer  = 0;
  attackDamage = 1;

  /** Délky fází útoku v sekundách */
  private readonly WINDUP   = 0.08;
  private readonly ACTIVE   = 0.12;
  private readonly RECOVERY = 0.15;

  /** Hitbox útoku (aktivní pouze ve fázi active) */
  get attackRect() {
    const b = this.body;
    const ox = this.facing > 0 ? b.w : -52;
    return { x: b.x + ox, y: b.y + 8, w: 52, h: b.h - 16 };
  }

  get isAttacking(): boolean { return this.attackPhase === 'active'; }
  get isDead():      boolean { return this.hp <= 0; }

  // Vizuální invulnerabilita po zásahu
  invTimer = 0;
  get isInvulnerable(): boolean { return this.invTimer > 0; }

  // Coyote time (krátce po opuštění platformy lze skočit)
  private coyoteTimer = 0;
  private readonly COYOTE_TIME = 0.1;

  // Nárazník pro stisk skoku (jump buffer)
  private jumpBuffer = 0;
  private readonly JUMP_BUFFER_TIME = 0.12;

  update(dt: number, input: InputManager, platforms: Platform[]): void {
    // ── Skok buffer ───────────────────────────────────────────────────────────
    if (input.isJustPressed('jump')) this.jumpBuffer = this.JUMP_BUFFER_TIME;
    else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);

    // ── Coyote time ───────────────────────────────────────────────────────────
    if (this.body.onGround) {
      this.coyoteTimer = this.COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    // ── Horizontální pohyb ────────────────────────────────────────────────────
    const moving = input.left || input.right;
    if (input.left)  { this.body.vx = -MOVE_SPEED; this.facing = -1; }
    else if (input.right) { this.body.vx =  MOVE_SPEED; this.facing =  1; }
    else              { this.body.vx =  0; }

    // deceleration v vzduchu – mírné
    if (!moving && !this.body.onGround) {
      this.body.vx *= Math.pow(0.85, dt * 60);
    }

    // ── Skok ──────────────────────────────────────────────────────────────────
    const canJump = this.coyoteTimer > 0;
    if (this.jumpBuffer > 0 && canJump) {
      this.body.vy     = JUMP_VELOCITY;
      this.body.onGround = false;
      this.coyoteTimer  = 0;
      this.jumpBuffer   = 0;
    }

    // ── Gravitace ────────────────────────────────────────────────────────────
    this.body.vy += GRAVITY * dt;

    // Rychle padání (lepší feel)
    if (this.body.vy > 0 && !this.body.onGround) {
      this.body.vy += GRAVITY * 0.6 * dt;
    }

    // ── Fyzikální pohyb + kolize ──────────────────────────────────────────────
    this.body.x += this.body.vx * dt;
    this.body.y += this.body.vy * dt;

    this.resolveCollisions(platforms);

    // ── Hranice světa ────────────────────────────────────────────────────────
    if (this.body.x < 0) this.body.x = 0;
    if (this.body.x + this.body.w > LOGICAL_WIDTH)
      this.body.x = LOGICAL_WIDTH - this.body.w;

    // Propadnutí pod mapu = smrt/reset
    if (this.body.y > LOGICAL_HEIGHT + 200) this.respawn();

    // ── Útok ──────────────────────────────────────────────────────────────────
    if (input.isJustPressed('attack') && this.attackPhase === 'none') {
      this.attackPhase = 'windup';
      this.attackTimer  = this.WINDUP;
    }
    this.updateAttack(dt);

    // ── Invulnerabilita ───────────────────────────────────────────────────────
    if (this.invTimer > 0) this.invTimer -= dt;
  }

  private updateAttack(dt: number): void {
    if (this.attackPhase === 'none') return;
    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      switch (this.attackPhase) {
        case 'windup':
          this.attackPhase = 'active';
          this.attackTimer  = this.ACTIVE;
          break;
        case 'active':
          this.attackPhase = 'recovery';
          this.attackTimer  = this.RECOVERY;
          break;
        case 'recovery':
          this.attackPhase = 'none';
          break;
      }
    }
  }

  private resolveCollisions(platforms: Platform[]): void {
    this.body.onGround = false;

    for (const p of platforms) {
      if (!this.overlaps(p)) continue;

      const overlapX = this.overlapOnAxis(this.body.x, this.body.w, p.x, p.w);
      const overlapY = this.overlapOnAxis(this.body.y, this.body.h, p.y, p.h);

      if (overlapX < overlapY) {
        // Kolize ze strany
        if (this.body.x < p.x) this.body.x -= overlapX;
        else                   this.body.x += overlapX;
        this.body.vx = 0;
      } else {
        // Kolize shora/zdola
        if (this.body.y < p.y) {
          // Domo ≙ nad platformou → přistání
          this.body.y = p.y - this.body.h;
          this.body.vy = 0;
          this.body.onGround = true;
        } else {
          // Domo narazil zdola
          this.body.y = p.y + p.h;
          this.body.vy = Math.abs(this.body.vy) * 0.1;
        }
      }
    }
  }

  private overlaps(p: Platform): boolean {
    return (
      this.body.x < p.x + p.w &&
      this.body.x + this.body.w > p.x &&
      this.body.y < p.y + p.h &&
      this.body.y + this.body.h > p.y
    );
  }

  private overlapOnAxis(a: number, aw: number, b: number, bw: number): number {
    return Math.min(a + aw, b + bw) - Math.max(a, b);
  }

  takeDamage(amount: number): void {
    if (this.isInvulnerable || this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invTimer = 1.2;
  }

  private respawn(): void {
    this.body.x = 120;
    this.body.y = 300;
    this.body.vx = 0;
    this.body.vy = 0;
    this.hp = this.maxHp;
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.body;

    // Blikání při invulnerabilitě
    if (this.isInvulnerable && Math.floor(this.invTimer * 10) % 2 === 0) return;

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(this.facing, 1);

    // Tělo
    ctx.fillStyle = '#e8c060';
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.fill();

    // Tmavší kontury
    ctx.strokeStyle = '#a08020';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    ctx.stroke();

    // Obličej
    ctx.fillStyle = '#1a1a2e';
    // Oči
    ctx.beginPath();
    ctx.arc(-10, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(10, -14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Bílá část oka
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-8, -15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -15, 2, 0, Math.PI * 2);
    ctx.fill();

    // Úsměv
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -5, 12, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Vlasy
    ctx.fillStyle = '#5a2a00';
    ctx.beginPath();
    ctx.ellipse(0, -h / 2 - 4, 18, 10, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Útočná animace
    if (this.attackPhase !== 'none') {
      this.drawAttack(ctx, w, h);
    }

    ctx.restore();
  }

  private drawAttack(ctx: CanvasRenderingContext2D, w: number, _h: number): void {
    const progress = this.attackPhase === 'active' ? 1.0 :
                     this.attackPhase === 'windup' ? 0.4 : 0.15;

    ctx.strokeStyle = `rgba(255,200,50,${progress})`;
    ctx.lineWidth = 4 * progress;

    // Švih mečem/pěstí
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, -8);
    ctx.lineTo(w / 2 + 44 * progress, -8 + 16 * progress);
    ctx.stroke();

    // Záblesk efekt
    if (this.attackPhase === 'active') {
      ctx.fillStyle = 'rgba(255,220,80,0.3)';
      ctx.beginPath();
      ctx.arc(w / 2 + 26, 0, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
}
