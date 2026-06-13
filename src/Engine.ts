// ─── Engine.ts – herní smyčka, fyzika a scéna ───────────────────────────────

import {
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
  FIXED_DT, MAX_ACCUMULATED_DT,
  COLOR_GROUND,
  MAX_ETHER, ETHER_PER_KILL,
} from './constants.js';
import type { Platform } from './types.js';
import { Domo }             from './Domo.js';
import { Glober, spawnWave } from './Glober.js';
import { UI }               from './UI.js';
import { InputManager }     from './Input.js';

// ─── Stav hry ─────────────────────────────────────────────────────────────────

type GamePhase = 'start' | 'playing' | 'levelComplete' | 'gameOver';

// ─── Platformy – statický level design ────────────────────────────────────────

const PLATFORMS: Platform[] = [
  // Zem
  { x: 0,    y: 630, w: 1280, h: 90,  surfaceH: 4 },
  // Levá nižší platforma
  { x: 80,   y: 490, w: 220,  h: 22,  surfaceH: 4 },
  // Střední platforma
  { x: 380,  y: 490, w: 220,  h: 22,  surfaceH: 4 },
  // Střední střední platforma
  { x: 560,  y: 370, w: 200,  h: 22,  surfaceH: 4 },
  // Pravá nižší platforma
  { x: 820,  y: 490, w: 220,  h: 22,  surfaceH: 4 },
  // Pravá vyšší platforma
  { x: 980,  y: 330, w: 200,  h: 22,  surfaceH: 4 },
  // Levá horní platforma
  { x: 100,  y: 320, w: 180,  h: 22,  surfaceH: 4 },
  // Nejvyšší střed
  { x: 540,  y: 200, w: 220,  h: 22,  surfaceH: 4 },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class Engine {
  private canvas: HTMLCanvasElement;
  private ctx:    CanvasRenderingContext2D;

  private domo:   Domo;
  private globers: Glober[] = [];
  private ui:     UI;
  private input:  InputManager;

  private phase: GamePhase = 'start';
  private level  = 1;
  private score  = 0;
  private ether  = 0;

  /** Časový akumulátor pro fixed-timestep */
  private accumulator = 0;
  private lastTime    = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private readonly _animRef = { id: 0 };

  // Přechod mezi úrovněmi
  private levelTransitionTimer = 0;
  private readonly LEVEL_TRANSITION = 2.5;

  // Parallax hvězdy (pre-generované)
  private stars: Array<{ x: number; y: number; r: number; speed: number; alpha: number }> = [];

  // Pozice kamery (horizontální scroll)
  private cameraX = 0;
  // camera deadzone reserved for multi-screen levels

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d')!;
    this.domo   = new Domo();
    this.ui     = new UI();
    this.input  = new InputManager();

    this.generateStars();
    this.bindRestartInput();
  }

  // ─── Spuštění / zastavení ──────────────────────────────────────────────────

  start(): void {
    this.lastTime = performance.now();
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    this._animRef.id = requestAnimationFrame((ts) => this.loop(ts));
  }

  // ─── Hlavní smyčka ────────────────────────────────────────────────────────

  private loop(timestamp: number): void {
    const rawDt = Math.min((timestamp - this.lastTime) / 1000, MAX_ACCUMULATED_DT);
    this.lastTime = timestamp;

    if (this.phase === 'playing') {
      this.accumulator += rawDt;

      // Fixed-timestep physics
      while (this.accumulator >= FIXED_DT) {
        this.fixedUpdate(FIXED_DT);
        this.accumulator -= FIXED_DT;
      }
    } else if (this.phase === 'levelComplete') {
      this.levelTransitionTimer += rawDt;
      if (this.levelTransitionTimer >= this.LEVEL_TRANSITION) {
        this.startNextLevel();
      }
    }

    // UI update vždy
    this.ui.update(rawDt, this.buildState());

    this.render();
    this.input.endFrame();
    this.scheduleFrame();
  }

  // ─── Fixed timestep update ────────────────────────────────────────────────

  private fixedUpdate(dt: number): void {
    this.domo.update(dt, this.input, PLATFORMS);

    // Globers
    for (const g of this.globers) {
      g.update(dt, PLATFORMS);
    }

    // Kolize útoku Doma s Globery
    if (this.domo.isAttacking) {
      const ar = this.domo.attackRect;
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(ar, g.body)) {
          g.takeDamage(this.domo.attackDamage);
          if (!g.alive) {
            this.score  += 100;
            this.ether   = Math.min(MAX_ETHER, this.ether + ETHER_PER_KILL);
          }
        }
      }
    }

    // Kolize Doma s živými Globery (Domo bere damage)
    if (!this.domo.isInvulnerable) {
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(this.domo.body, g.body)) {
          this.domo.takeDamage(1);
          break;
        }
      }
    }

    // Sběr dropů
    for (const g of this.globers) {
      for (const d of g.drops) {
        if (d.collected) continue;
        if (this.pointInRect(d.x, d.y, this.domo.body, 30)) {
          d.collected = true;
          if (d.kind === 'ether') {
            this.ether = Math.min(MAX_ETHER, this.ether + 5);
          } else {
            this.score += 50;
          }
        }
      }
    }

    // Ultimát
    if (this.input.isJustPressed('ultimate') && this.ether >= MAX_ETHER) {
      this.triggerUltimate();
    }

    // Aktualizace vizuálního stavu tlačítka ultimate (touch)
    this.input.updateUltimateButton(this.ether >= MAX_ETHER);

    // Kamera
    this.updateCamera();

    // Čistění mrtvých Globerů
    this.globers = this.globers.filter(g => !g.isRemoving);

    // Kontrola konce levelu
    if (this.globers.every(g => !g.alive)) {
      this.phase = 'levelComplete';
      this.levelTransitionTimer = 0;
    }

    // Kontrola game over
    if (this.domo.isDead) {
      this.phase = 'gameOver';
    }
  }

  private triggerUltimate(): void {
    this.ether = 0;
    for (const g of this.globers) {
      if (g.alive) {
        g.kill();
        this.score += 150;
      }
    }
    this.ui.triggerEtherDuck();
  }

  // ─── Kamera ───────────────────────────────────────────────────────────────

  private updateCamera(): void {
    const targetX = this.domo.body.x - LOGICAL_WIDTH * 0.4;
    this.cameraX += (targetX - this.cameraX) * 0.12;
    this.cameraX  = Math.max(0, Math.min(this.cameraX, LOGICAL_WIDTH - LOGICAL_WIDTH));
    // Single-screen level – kamera zůstane nulová (level se vejde do 1280px)
  }

  // ─── Úrovně ───────────────────────────────────────────────────────────────

  private startLevel(level: number): void {
    this.level   = level;
    this.globers = spawnWave(level);
    this.domo    = new Domo();
    this.accumulator = 0;
    this.phase   = 'playing';
  }

  private startNextLevel(): void {
    this.startLevel(this.level + 1);
  }

  // ─── Restart ──────────────────────────────────────────────────────────────

  private restart(): void {
    this.score  = 0;
    this.ether  = 0;
    this.startLevel(1);
  }

  private bindRestartInput(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter') {
        if (this.phase === 'start' || this.phase === 'gameOver') {
          if (this.phase === 'start') this.startLevel(1);
          else this.restart();
        }
      }
    });

    this.canvas.addEventListener('click', () => {
      if (this.phase === 'start')    this.startLevel(1);
      else if (this.phase === 'gameOver') this.restart();
    });

    this.canvas.addEventListener('touchstart', () => {
      if (this.phase === 'start')    this.startLevel(1);
      else if (this.phase === 'gameOver') this.restart();
    }, { passive: true });
  }

  // ─── Rendering ────────────────────────────────────────────────────────────

  private render(): void {
    const ctx = this.ctx;
    const W   = LOGICAL_WIDTH;
    const H   = LOGICAL_HEIGHT;

    ctx.clearRect(0, 0, W, H);

    if (this.phase === 'start') {
      this.ui.drawStartScreen(ctx);
      return;
    }

    // Pozadí
    this.drawBackground(ctx, W, H);

    // Platformy
    this.drawPlatforms(ctx);

    // Globers
    for (const g of this.globers) {
      g.draw(ctx);
    }

    // Domo
    this.domo.draw(ctx);

    // HUD
    this.ui.draw(ctx, this.buildState());

    // Overlays
    if (this.phase === 'levelComplete') {
      this.ui.drawLevelComplete(ctx, this.level);
    } else if (this.phase === 'gameOver') {
      this.ui.drawGameOver(ctx, this.score);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Gradient nebe
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0,   '#050510');
    skyGrad.addColorStop(0.5, '#0a0a2a');
    skyGrad.addColorStop(1,   '#0f1a10');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Hvězdy
    ctx.fillStyle = '#ffffff';
    for (const s of this.stars) {
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Měsíc
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.arc(W - 120, 80, 50, 0, Math.PI * 2);
    ctx.fill();
    // Stín měsíce
    ctx.fillStyle = '#0a0a2a';
    ctx.beginPath();
    ctx.arc(W - 100, 72, 46, 0, Math.PI * 2);
    ctx.fill();

    // Zem (pod platformami)
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, 630, W, H - 630);
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < PLATFORMS.length; i++) {
      const p = PLATFORMS[i];
      const isGround = i === 0;

      if (isGround) continue; // Zem je vykreslenaa výše

      // Základní plocha platformy
      const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      grad.addColorStop(0, '#3a7050');
      grad.addColorStop(1, '#1a4030');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 4);
      ctx.fill();

      // Zvýraznění horního okraje
      ctx.fillStyle = '#50c070';
      ctx.beginPath();
      ctx.rect(p.x + 2, p.y, p.w - 4, 3);
      ctx.fill();

      // Stín pod platformou
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h + 4, p.w / 2 - 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Zemní platforma
    const gp = PLATFORMS[0];
    const groundGrad = ctx.createLinearGradient(0, gp.y, 0, gp.y + gp.h);
    groundGrad.addColorStop(0, '#2a5038');
    groundGrad.addColorStop(0.1, '#1a3828');
    groundGrad.addColorStop(1, '#0a1810');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(gp.x, gp.y, gp.w, gp.h);

    // Trávový lem
    ctx.fillStyle = '#40a060';
    ctx.fillRect(0, gp.y, gp.w, 5);
  }

  private generateStars(): void {
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x:     Math.random() * LOGICAL_WIDTH,
        y:     Math.random() * LOGICAL_HEIGHT * 0.75,
        r:     Math.random() < 0.2 ? 2 : 1,
        speed: Math.random() * 0.2 + 0.05,
        alpha: Math.random() * 0.6 + 0.2,
      });
    }
  }

  // ─── Pomocné metody ───────────────────────────────────────────────────────

  private buildState() {
    return {
      ether:       this.ether,
      maxEther:    MAX_ETHER,
      score:       this.score,
      domoHp:      this.domo.hp,
      domoMaxHp:   this.domo.maxHp,
      ultimateActive: this.ether >= MAX_ETHER,
    };
  }

  private rectsOverlap(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
  ): boolean {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  private pointInRect(
    px: number, py: number,
    r: { x: number; y: number; w: number; h: number },
    expand = 0,
  ): boolean {
    return (
      px >= r.x - expand && px <= r.x + r.w + expand &&
      py >= r.y - expand && py <= r.y + r.h + expand
    );
  }
}
