import {
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
  FIXED_DT, MAX_ACCUMULATED_DT,
  COLOR_GROUND, MAX_ETHER, ETHER_PER_KILL,
  CARDS_FOR_COMPANION, BEATEMUP_GROUND_Y,
} from './constants.js';
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
  private companions: { x: number; y: number; vx: number; vy: number; life: number }[] = [];

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
      if (this.levelTransitionTimer >= this.LEVEL_TRANSITION) this.startNextLevel();
    }

    this.ui.update(rawDt, this.buildState());
    this.render();
    this.input.endFrame();
    this.scheduleFrame();
  }

  private fixedUpdate(dt: number): void {
    this.domo.update(dt, this.input, [] as any);
    for (const g of this.globers) g.update(dt, []);
    this.cardManager.update(dt);
    this.companion.update(dt);

    // Y-sort
    const list: any[] = [];
    list.push({ y: this.domo.body.y, kind: 'domo', obj: this.domo });
    for (const g of this.globers) if (g.alive) list.push({ y: g.body.y, kind: 'glober', obj: g });
    list.sort((a, b) => a.y - b.y);

    // Attack hit - Y-depth check
    if (this.domo.isAttacking) {
      const ar = this.domo.attackRect;
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(ar, g.body) && Math.abs(ar.y - g.body.y) < 40) {
          g.takeDamage(this.domo.attackDamage);
          if (!g.alive) {
            this.score += 100;
            this.heatMeter = Math.min(100, this.heatMeter + 15);
            this.ether = Math.min(MAX_ETHER, this.ether + ETHER_PER_KILL);
          }
        }
      }
    }

    // Domo hit
    if (!this.domo.isInvulnerable) {
      for (const g of this.globers) {
        if (!g.alive) continue;
        if (this.rectsOverlap(this.domo.body, g.body) && Math.abs(this.domo.body.y - g.body.y) < 40) {
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

    this.updateCamera();
    this.globers = this.globers.filter(g => !g.isRemoving);

    if (this.globers.every(g => !g.alive)) {
      this.phase = 'levelComplete';
      this.levelTransitionTimer = 0;
    }
    if (this.domo.isDead) this.phase = 'gameOver';
  }

  private triggerUltimate(): void {
    this.ether = 0;
    for (const g of this.globers) if (g.alive) { g.kill(); this.score += 150; }
    this.ui.triggerEtherDuck();
  }

  private updateCamera(): void {
    const targetX = this.domo.body.x - LOGICAL_WIDTH * 0.35;
    this.cameraX += (targetX - this.cameraX) * 0.1;
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
  }

  private startNextLevel(): void { this.startLevel(this.level + 1); }

  private restart(): void { this.score = 0; this.ether = 0; this.heatMeter = 0; this.startLevel(1); }

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

    // Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
    skyGrad.addColorStop(0, '#050510');
    skyGrad.addColorStop(1, '#0a0a2e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Ground
    ctx.fillStyle = COLOR_GROUND;
    ctx.fillRect(0, BEATEMUP_GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - BEATEMUP_GROUND_Y);

    // Y-sorted render
    const list: any[] = [];
    list.push({ y: this.domo.body.y, kind: 'domo', obj: this.domo });
    for (const g of this.globers) if (g.alive && !g.isRemoving) list.push({ y: g.body.y, kind: 'glober', obj: g });
    for (const c of this.cardManager.cards) if (!c.collected) list.push({ y: c.y, kind: 'card', obj: c });
    list.sort((a, b) => a.y - b.y);

    for (const item of list) {
      if (item.kind === 'domo') item.obj.draw(ctx);
      else if (item.kind === 'glober') item.obj.draw(ctx);
      else if (item.kind === 'card') this.cardManager.drawCard(ctx, item.obj);
    }

    this.ui.draw(ctx, this.buildState());
    if (this.phase === 'levelComplete') this.ui.drawLevelComplete(ctx, this.level);
    else if (this.phase === 'gameOver') this.ui.drawGameOver(ctx, this.score);
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

  private rectsOverlap(a: any, b: any): boolean {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private pointInRect(px: number, py: number, r: any, expand = 0): boolean {
    return px >= r.x - expand && px <= r.x + r.w + expand && py >= r.y - expand && py <= r.y + r.h + expand;
  }
}
