// ─── Glober.ts – nepřátelský Glober ─────────────────────────────────────────

import type { PhysicsBody, Platform, Drop } from './types.js';
import { GRAVITY, ETHER_PER_KILL } from './constants.js';

export const GLOBER_W = 44;
export const GLOBER_H = 60;

/** Stav hlavy Globera */
type HeadState = 'globe' | 'flattening' | 'flat';

export class Glober {
  body: PhysicsBody = {
    x: 0, y: 0,
    w: GLOBER_W, h: GLOBER_H,
    vx: 0, vy: 0,
    onGround: false,
  };

  hp         = 2;
  readonly maxHp = 2;
  alive      = true;
  headState: HeadState = 'globe';
  flattenTimer = 0;
  readonly FLATTEN_DURATION = 0.45;

  /** Vizuální oploštění – 1 = plný globus, 0 = disk */
  flatProgress = 1;

  /** Patrolovací meze (x souřadnice) */
  private patrolMinX = 0;
  private patrolMaxX = 0;
  private patrolSpeed = 90;
  private facing = 1;

  /** Doba po zabití před odstraněním (rozpadová animace) */
  private deathTimer = -1;
  readonly DEATH_DURATION = 1.2;

  /** Drops čekající na sbírání */
  drops: Drop[] = [];

  // Globus – rotace pro 3D efekt
  private globeRotation = 0;

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

  update(dt: number, platforms: Platform[]): void {
    if (!this.alive) {
      this.updateDeathAnimation(dt);
      this.updateDrops(dt);
      return;
    }

    this.globeRotation += dt * 80 * this.facing;

    // Patrolování
    if (this.body.x <= this.patrolMinX) {
      this.body.vx = this.patrolSpeed;
      this.facing   = 1;
    } else if (this.body.x + this.body.w >= this.patrolMaxX) {
      this.body.vx = -this.patrolSpeed;
      this.facing   = -1;
    }

    // Gravitace
    this.body.vy += GRAVITY * dt;

    this.body.x += this.body.vx * dt;
    this.body.y += this.body.vy * dt;

    this.resolveCollisions(platforms);

    // Oploštění timeru
    if (this.headState === 'flattening') {
      this.flattenTimer += dt;
      this.flatProgress  = Math.max(0, 1 - this.flattenTimer / this.FLATTEN_DURATION);
      if (this.flattenTimer >= this.FLATTEN_DURATION) {
        this.headState  = 'flat';
        this.flatProgress = 0;
      }
    }

    this.updateDrops(dt);
  }

  /** Dostane X damage, spustí oploštění, případně zabije */
  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;
    if (this.headState === 'globe') {
      this.headState    = 'flattening';
      this.flattenTimer = 0;
    }
    if (this.hp <= 0) {
      this.kill();
    }
  }

  /** Okamžité zabití (Ether Duck ultimate) */
  kill(): void {
    if (!this.alive) return;
    this.alive      = false;
    this.headState  = 'flat';
    this.flatProgress = 0;
    this.deathTimer = 0;
    this.spawnDrops();
  }

  private spawnDrops(): void {
    const cx = this.body.x + this.body.w / 2;
    const cy = this.body.y;

    // Ether drop
    this.drops.push({
      x: cx - 8, y: cy,
      vy: -200,
      collected: false,
      kind: 'ether',
    });

    // Material drop (30% šance)
    if (Math.random() < 0.3) {
      this.drops.push({
        x: cx + 4, y: cy,
        vy: -160,
        collected: false,
        kind: 'material',
      });
    }
  }

  private updateDrops(dt: number): void {
    for (const d of this.drops) {
      if (d.collected) continue;
      d.vy += GRAVITY * 0.5 * dt;
      d.y   += d.vy * dt;
    }
  }

  private updateDeathAnimation(dt: number): void {
    this.deathTimer += dt;
    // Rozpadová animace – Glober se smrskne dolů
    this.body.y += 80 * dt;
  }

  private resolveCollisions(platforms: Platform[]): void {
    this.body.onGround = false;
    for (const p of platforms) {
      if (!this.overlaps(p)) continue;

      const oX = this.overlapAxis(this.body.x, this.body.w, p.x, p.w);
      const oY = this.overlapAxis(this.body.y, this.body.h, p.y, p.h);

      if (oX < oY) {
        if (this.body.x < p.x) this.body.x -= oX;
        else                   this.body.x += oX;
        this.body.vx = 0;
      } else {
        if (this.body.y < p.y) {
          this.body.y = p.y - this.body.h;
          this.body.vy = 0;
          this.body.onGround = true;
        } else {
          this.body.y = p.y + p.h;
          this.body.vy = 0;
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

  private overlapAxis(a: number, aw: number, b: number, bw: number): number {
    return Math.min(a + aw, b + bw) - Math.max(a, b);
  }

  // ─── Rendering ──────────────────────────────────────────────────────────────

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.isRemoving) return;

    const { x, y, w, h } = this.body;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const alpha = this.alive ? 1
                : Math.max(0, 1 - this.deathTimer / this.DEATH_DURATION);
    ctx.globalAlpha = alpha;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing, 1);

    // ── Tělo ───────────────────────────────────────────────────────────────────
    ctx.fillStyle = '#6060c0';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = '#4040a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 6);
    ctx.stroke();

    // Nohavice
    ctx.fillStyle = '#3a3a8a';
    ctx.fillRect(-w / 2, h / 2 - 18, w / 2 - 2, 18);
    ctx.fillRect(2, h / 2 - 18, w / 2 - 2, 18);

    // ── Globus / disk na hlavě ─────────────────────────────────────────────────
    const headCY = -h / 2 - 22;

    if (this.headState === 'globe' || this.headState === 'flattening') {
      this.drawGlobe(ctx, 0, headCY, 22, this.flatProgress);
    } else {
      this.drawFlatDisk(ctx, 0, headCY + 18);
    }

    // ── Oči pod globem ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#ffee80';
    ctx.beginPath(); ctx.arc(-10, -h / 2 + 14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 10, -h / 2 + 14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#200000';
    ctx.beginPath(); ctx.arc(-9,  -h / 2 + 13, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 11, -h / 2 + 13, 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;

    // HP nad Globerem (pokud živý a má poškození)
    if (this.alive && this.hp < this.maxHp) {
      this.drawHpBar(ctx, x, y - 10, w);
    }

    // Drops
    this.drawDrops(ctx);
  }

  private drawGlobe(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    r: number,
    flatness: number,  // 1 = kulatý, 0 = disk
  ): void {
    const ry = r * flatness + 3 * (1 - flatness);
    const rx = r + 5 * (1 - flatness);

    // Gradient – iluze 3D
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - ry * 0.3, 1, cx, cy, rx);
    grad.addColorStop(0, '#80e0ff');
    grad.addColorStop(0.4,'#40a0e0');
    grad.addColorStop(0.8, '#1060a0');
    grad.addColorStop(1,   '#004488');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Zeměpisné linky (rotující)
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,200,255,0.45)';
    ctx.lineWidth = 1.2;

    // Rovník
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Poledník (rotující)
    const angle = (this.globeRotation % 360) * Math.PI / 180;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * Math.abs(Math.cos(angle)), ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Odlesk
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.28, cy - ry * 0.32, rx * 0.28, ry * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFlatDisk(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const grad = ctx.createLinearGradient(cx - 24, cy - 3, cx + 24, cy + 3);
    grad.addColorStop(0, '#1060a0');
    grad.addColorStop(0.5, '#80e0ff');
    grad.addColorStop(1, '#1060a0');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,200,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 24, 4, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
    const bw = w;
    const bh = 5;
    ctx.fillStyle = '#400000';
    ctx.fillRect(x, y, bw, bh);
    ctx.fillStyle = '#e05030';
    ctx.fillRect(x, y, bw * (this.hp / this.maxHp), bh);
  }

  private drawDrops(ctx: CanvasRenderingContext2D): void {
    for (const d of this.drops) {
      if (d.collected) continue;
      if (d.kind === 'ether') {
        ctx.fillStyle = '#f0d020';
        ctx.shadowColor = '#f0d020';
        ctx.shadowBlur = 10;
      } else {
        ctx.fillStyle = '#a0ffa0';
        ctx.shadowColor = '#a0ffa0';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

/** Továrna – vygeneruje vlnu Globerů pro danou úroveň */
export function spawnWave(level: number): Glober[] {
  const globers: Glober[] = [];
  const count = 3 + level * 2;

  const spawnPoints: Array<{ x: number; min: number; max: number; y: number }> = [
    { x: 300,  min: 200, max: 550, y: 560 },
    { x: 600,  min: 550, max: 850, y: 440 },
    { x: 850,  min: 750, max:1100, y: 560 },
    { x: 1050, min: 900, max:1200, y: 320 },
    { x: 200,  min: 100, max: 400, y: 320 },
  ];

  for (let i = 0; i < count; i++) {
    const sp = spawnPoints[i % spawnPoints.length];
    const g = new Glober(sp.x, sp.y - GLOBER_H, sp.min, sp.max);
    // Vyšší úroveň → více HP
    g.hp = Math.min(2 + Math.floor(level / 2), 5);
    (g as unknown as { maxHp: number }).maxHp = g.hp;
    globers.push(g);
  }

  return globers;
}

/** Ether za zabitého Globera */
export { ETHER_PER_KILL };
