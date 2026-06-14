import {
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
  FIXED_DT, MAX_ACCUMULATED_DT,
  MAX_ETHER, ETHER_PER_KILL,
  CARDS_FOR_COMPANION, BEATEMUP_GROUND_Y,
} from './constants.js';
import type { Rect } from './types.js';
import { Domo } from './Domo.js';
import { Glober, spawnWave } from './Glober.js';
import { UI } from './UI.js';
import { InputManager } from './Input.js';
import { CardManager } from './CardManager.js';
import { Companion } from './Companion.js';

type GamePhase = 'start' | 'playing' | 'levelComplete' | 'gameOver';

export class Engine {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private domo: Domo;
  globers: Glober[] = [];
  private ui: UI;
  private input: InputManager;
  private cardManager: CardManager;
  private companion: Companion;
  private phase: GamePhase = 'start';
  private level = 1;
  private score = 0;
  private ether = 0;
  private heatMeter = 0;
  private accumulator = 0;
  private lastTime = 0;
  private animRef = { id: 0 } as { id: number };
  private levelTransitionTimer = 0;
  private readonly LEVEL_TRANSITION = 2.5;
  private cameraX = 0;
  private goFlashTimer = 0;
  private readonly GO_FLASH_DURATION = 1.5;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.domo = new Domo();
    this.ui = new UI();
    this.input = new InputManager();
    this.cardManager = new CardManager();
    this.companion = new Companion();
    this.bindRestartInput();
  }

  start(): void {
    this.lastTime = performance.now();
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    this.animRef.id = requestAnimationFrame((ts) => this.loop(ts));
  }

  private loop(timestamp: number): void {
    const rawDt = Math.min((timestamp - this.lastTime) / 1000, MAX_ACCUMULATED_DT);
    this.lastTime = timestamp;

    if (this.phase === 'playing') {
      this.accumulator += rawDt;
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

    this.ui.update(rawDt, this.buildState());
    this.render();
    this.input.endFrame();
    this.scheduleFrame();
  }

  private fixedUpdate(dt: number): void {
    this.domo.update(dt, this.input, [] as any);
    for (const g of this.globers) g.update(dt, this.domo.body);
    this.cardManager.update(dt);
    this.companion.update(dt);

    // Y-sort every frame
    const list: Array<{ y: number; kind: string; obj: any }> = [];
    list.push({ y: this.domo.body.y, kind: 'domo', obj: this.domo });
    for (const g of this.globers) if (g.alive) list.push({ y: g.body.y, kind: 'glober', obj: g });
    list.sort((a, b) => a.y - b.y);

    // CPS-1 arcade hitbox: X overlap AND |Y-depth| < 15
    if (this.domo.isAttacking) {
      const ar = this.domo.attackRect;
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(ar, g.body) && Math.abs(ar.y - g.body.y) < 15) {
          g.takeDamage(this.domo.attackDamage);
          if (!g.alive) {
            this.score += 100;
            this.heatMeter = Math.min(100, this.heatMeter + 15);
            this.ether = Math.min(MAX_ETHER, this.ether + ETHER_PER_KILL);
          }
        }
      }

      // Breakable objects
      for (const b of this.cardManager.breakables) {
        if (!b.alive) continue;
        if (this.rectsOverlap(ar, b)) {
          b.hp -= this.domo.attackDamage;
          if (b.hp <= 0) {
            b.alive = false;
            this.cardManager.cardsCollected++;
            this.score += 25;
          }
        }
      }
    }

    // Domo hit
    if (!this.domo.isInvulnerable) {
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(this.domo.body, g.body) && Math.abs(this.domo.body.y - g.body.y) < 15) {
          this.domo.takeDamage(1);
          break;
        }
      }
    }

    // Cards
    for (const c of this.cardManager.cards) {
      if (c.collected) continue;
      if (this.pointInRect(c.x, c.y, this.domo.body)) {
        c.collected = true;
        this.cardManager.cardsCollected++;
      }
    }

    // Ultimate
    if (this.input.isJustPressed('ultimate') && this.ether >= MAX_ETHER && this.cardManager.cardsCollected >= CARDS_FOR_COMPANION) {
      this.companion.unlocked = true;
      this.companion.summon();
      this.triggerUltimate();
    }
    this.input.updateUltimateButton(this.ether >= MAX_ETHER && this.cardManager.cardsCollected >= CARDS_FOR_COMPANION);

    // Camera: scroll right only when Domo crosses screen center
    const enemiesActive = this.globers.some(g => g.alive);
    this.updateCamera(enemiesActive, this.domo.body.x);

    // Hard lock: block Domo from moving left of camera
    if (this.domo.body.x < this.cameraX) {
      this.domo.body.x = this.cameraX;
    }

    // GO flash when wave cleared
    if (!enemiesActive && this.globers.length > 0) {
      this.goFlashTimer = this.GO_FLASH_DURATION;
      this.globers = [];
      this.phase = 'levelComplete';
      this.levelTransitionTimer = 0;
    }

    this.globers = this.globers.filter(g => !g.isRemoving);

    if (this.domo.isDead) this.phase = 'gameOver';
  }

  private triggerUltimate(): void {
    this.ether = 0;
    for (const g of this.globers) if (g.alive) { g.kill(); this.score += 150; }
    this.ui.triggerEtherDuck();
  }

  private updateCamera(enemiesActive: boolean, domoX: number): void {
    if (enemiesActive) {
      // Lock forward - Domo can only advance camera, never retreat
      if (domoX - this.cameraX > 400) {
        this.cameraX = domoX - 400;
      }
    } else {
      // Normal follow when no enemies
      const targetX = domoX - LOGICAL_WIDTH * 0.35;
      this.cameraX += (targetX - this.cameraX) * 0.1;
    }
    this.cameraX = Math.max(0, this.cameraX);
  }

  private startLevel(level: number): void {
    this.level = level;
    this.globers = spawnWave(level);
    this.domo = new Domo();
    this.cardManager = new CardManager();
    this.companion = new Companion();
    this.accumulator = 0;
    this.phase = 'playing';
    this.goFlashTimer = 0;

    // Spawn breakable objects around the street
    for (let i = 0; i < 6; i++) {
      this.cardManager.spawnBreakable(400 + i * 300, BEATEMUP_GROUND_Y - 40);
    }
  }

  private startNextLevel(): void { this.startLevel(this.level + 1); }

  private restart(): void {
    this.score = 0;
    this.ether = 0;
    this.heatMeter = 0;
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
      if (this.phase === 'start') this.startLevel(1);
      else if (this.phase === 'gameOver') this.restart();
    });
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    if (this.phase === 'start') { this.ui.drawStartScreen(ctx); return; }

    // Sky (screen space, no camera)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    skyGrad.addColorStop(0, '#050510');
    skyGrad.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // World-space rendering with camera offset
    ctx.save();
    ctx.translate(-this.cameraX, 0);

    // Ground (world space, scrolls with camera)
    ctx.fillStyle = '#1a3a28';
    ctx.fillRect(0, BEATEMUP_GROUND_Y, 4000, LOGICAL_HEIGHT - BEATEMUP_GROUND_Y);

    // Breakables (world space)
    this.cardManager.drawBreakables(ctx);

    // Y-sorted render
    const list: Array<{ y: number; kind: string; obj: any }> = [];
    list.push({ y: this.domo.body.y, kind: 'domo', obj: this.domo });
    for (const g of this.globers) if (g.alive && !g.isRemoving) list.push({ y: g.body.y, kind: 'glober', obj: g });
    for (const c of this.cardManager.cards) if (!c.collected) list.push({ y: c.y, kind: 'card', obj: c });
    list.sort((a, b) => a.y - b.y);

    for (const item of list) {
      if (item.kind === 'domo') item.obj.draw(ctx);
      else if (item.kind === 'glober') item.obj.draw(ctx);
      else if (item.kind === 'card') this.cardManager.drawCard(ctx, item.obj);
    }

    ctx.restore();

    // UI (screen space, no camera)
    this.ui.draw(ctx, this.buildState());
    if (this.phase === 'levelComplete') this.ui.drawLevelComplete(ctx, this.level);
    else if (this.phase === 'gameOver') this.ui.drawGameOver(ctx, this.score);

    // GO flash (screen space)
    if (this.goFlashTimer > 0) {
      this.goFlashTimer -= 0.016;
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 72px "Segoe UI"';
      ctx.textAlign = 'center';
      ctx.fillText('GO ->', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
      ctx.textAlign = 'left';
    }

    // Debug camera lock indicator
    if (this.globers.some(g => g.alive)) {
      ctx.fillStyle = 'rgba(255,0,0,0.6)';
      ctx.fillRect(LOGICAL_WIDTH - 20, 0, 20, 20);
    }
  }

  buildState() {
    return {
      ether: this.ether,
      maxEther: MAX_ETHER,
      heatMeter: this.heatMeter,
      score: this.score,
      domoHp: this.domo.hp,
      domoMaxHp: this.domo.maxHp,
      cardsCollected: this.cardManager.cardsCollected,
      ultimateActive: this.ether >= MAX_ETHER && this.cardManager.cardsCollected >= CARDS_FOR_COMPANION,
    };
  }

  private rectsOverlap(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private pointInRect(px: number, py: number, r: Rect, expand = 0): boolean {
    return px >= r.x - expand && px <= r.x + r.w + expand && py >= r.y - expand && py <= r.y + r.h + expand;
  }
}
