// ─── UI.ts – HUD a overlay obrazovky ────────────────────────────────────────

import type { GameState } from './types.js';
import {
  LOGICAL_WIDTH, LOGICAL_HEIGHT,
  COLOR_HUD_BG, COLOR_ETHER_BAR, COLOR_HP_BAR, COLOR_HP_LOST, COLOR_TEXT,
  MAX_ETHER,
} from './constants.js';

interface EtherDuckOverlay {
  active: boolean;
  timer: number;
  x: number;
  readonly DURATION: number;
  readonly SPEED: number;
}

export class UI {
  private etherDuck: EtherDuckOverlay = {
    active: false, timer: 0, x: -250,
    DURATION: 2.0, SPEED: 900,
  };

  update(dt: number, _state: GameState): void {

    if (this.etherDuck.active) {
      this.etherDuck.timer += dt;
      this.etherDuck.x     += this.etherDuck.SPEED * dt;
      if (this.etherDuck.timer >= this.etherDuck.DURATION) {
        this.etherDuck.active = false;
      }
    }
  }

  /** Spustí animaci Ether Kachny přecházející přes obrazovku */
  triggerEtherDuck(): void {
    this.etherDuck.active = true;
    this.etherDuck.timer  = 0;
    this.etherDuck.x      = -250;
  }

  draw(ctx: CanvasRenderingContext2D, state: GameState): void {
    this.drawHpBar(ctx, state);
    this.drawEtherBar(ctx, state);
    this.drawScore(ctx, state);

    if (this.etherDuck.active) {
      this.drawEtherDuck(ctx);
    }
  }

  drawGameOver(ctx: CanvasRenderingContext2D, score: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = '32px "Segoe UI", sans-serif';
    ctx.fillText(`Skóre: ${score}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 20);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText('Stiskni ENTER nebo klepni pro restart', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 70);

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  drawLevelComplete(ctx: CanvasRenderingContext2D, level: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.fillStyle = '#80ff80';
    ctx.font = 'bold 64px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ÚROVEŇ ${level} SPLNĚNA!`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillText('Připravte se na další vlnu...', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30);

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  drawStartScreen(ctx: CanvasRenderingContext2D): void {
    // Pozadí – hvězdné nebe
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    this.drawStars(ctx);

    // Gradientní titul
    const grad = ctx.createLinearGradient(
      LOGICAL_WIDTH / 2 - 300, 0,
      LOGICAL_WIDTH / 2 + 300, 0,
    );
    grad.addColorStop(0, '#60c0ff');
    grad.addColorStop(0.5,'#ffee40');
    grad.addColorStop(1,  '#ff60a0');

    ctx.save();
    ctx.shadowColor = 'rgba(80,180,255,0.7)';
    ctx.shadowBlur  = 30;
    ctx.fillStyle   = grad;
    ctx.font = 'bold 96px "Segoe UI", sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FLAT EARTH', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 100);
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Pomoz Domovi splošit globy! A/D nebo šipky = pohyb, MEZERNÍK = skok, J = útok, Q = Ether Kachna',
      LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 10,
    );

    ctx.fillStyle = '#f0e060';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) {
      ctx.fillText('Stiskni ENTER nebo klepni pro start', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 90);
    }

    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ─── Privátní vykreslovací metody ────────────────────────────────────────────

  private drawHpBar(ctx: CanvasRenderingContext2D, state: GameState): void {
    const x = 20, y = 20, w = 200, h = 22;

    ctx.fillStyle = COLOR_HUD_BG;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 6);
    ctx.fill();

    ctx.fillStyle = COLOR_HP_LOST;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    const ratio = state.domoHp / state.domoMaxHp;
    if (ratio > 0) {
      ctx.fillStyle = COLOR_HP_BAR;
      ctx.beginPath();
      ctx.roundRect(x, y, w * ratio, h, 4);
      ctx.fill();
    }

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`❤ ${state.domoHp} / ${state.domoMaxHp}`, x + 8, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  private drawEtherBar(ctx: CanvasRenderingContext2D, state: GameState): void {
    const x = 20, y = 54, w = 200, h = 22;
    const ratio = state.ether / MAX_ETHER;

    ctx.fillStyle = COLOR_HUD_BG;
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(80,60,10,0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    if (ratio > 0) {
      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0,   '#e08000');
      grad.addColorStop(0.5, COLOR_ETHER_BAR);
      grad.addColorStop(1,   '#fff060');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w * ratio, h, 4);
      ctx.fill();
    }

    // Blikání při plném etheru
    if (state.ether >= MAX_ETHER) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.008);
      ctx.fillStyle = `rgba(255,220,0,${pulse * 0.4})`;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
    }

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡ ${Math.floor(state.ether)} / ${MAX_ETHER}`, x + 8, y + h / 2);
    ctx.textBaseline = 'alphabetic';

    if (state.ether >= MAX_ETHER) {
      ctx.fillStyle = '#ffe040';
      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText('ULTIMÁT PŘIPRAVEN!', x + w + 10, y + h / 2);
      ctx.textBaseline = 'alphabetic';
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: GameState): void {
    ctx.fillStyle = COLOR_HUD_BG;
    ctx.beginPath();
    ctx.roundRect(LOGICAL_WIDTH - 180, 16, 164, 30, 6);
    ctx.fill();

    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Skóre: ${state.score}`, LOGICAL_WIDTH - 20, 31);
    ctx.textAlign    = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawEtherDuck(ctx: CanvasRenderingContext2D): void {
    const x = this.etherDuck.x;
    const cy = LOGICAL_HEIGHT / 2 - 40;
    const scale = 2.2;

    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(scale, scale);

    // Záře kolem kachny
    const glow = ctx.createRadialGradient(0, 0, 10, 0, 0, 100);
    glow.addColorStop(0,   'rgba(255,220,50,0.55)');
    glow.addColorStop(0.5, 'rgba(255,150,50,0.2)');
    glow.addColorStop(1,   'rgba(255,100,50,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.fill();

    // Tělo kachny
    ctx.fillStyle = '#f0d020';
    ctx.beginPath();
    ctx.ellipse(0, 10, 50, 38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Křídlo
    ctx.fillStyle = '#d0b010';
    ctx.beginPath();
    ctx.ellipse(-15, 12, 30, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Hlava
    ctx.fillStyle = '#f0d020';
    ctx.beginPath();
    ctx.arc(36, -18, 22, 0, Math.PI * 2);
    ctx.fill();

    // Zobák
    ctx.fillStyle = '#e07000';
    ctx.beginPath();
    ctx.moveTo(56, -20);
    ctx.lineTo(78, -16);
    ctx.lineTo(56, -12);
    ctx.closePath();
    ctx.fill();

    // Oko
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(44, -22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(45, -23, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Korunka
    ctx.fillStyle = '#ff8020';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 10, -38);
      ctx.lineTo(26 + i * 10, -52);
      ctx.lineTo(30 + i * 10, -38);
      ctx.fill();
    }

    // Text efektu přes kachnu
    ctx.fillStyle = 'rgba(255,240,80,0.9)';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ETHER KACHNA!', 20, -62);

    ctx.restore();

    // Záblesky při průchodu
    const trails = 5;
    for (let i = 0; i < trails; i++) {
      const tx = x - 80 - i * 40;
      const ty = cy - 20 + (Math.sin(Date.now() * 0.01 + i) * 30);
      ctx.fillStyle = `rgba(255,220,50,${0.6 - i * 0.1})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 8 - i, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#ffffff';
    const seed = 42;
    for (let i = 0; i < 120; i++) {
      const sx = ((seed * (i + 1) * 1737) % LOGICAL_WIDTH);
      const sy = ((seed * (i + 1) * 2591) % LOGICAL_HEIGHT);
      const r  = ((i * 7) % 3 === 0) ? 2 : 1;
      const brightness = 0.4 + ((i * 13) % 10) * 0.06;
      ctx.globalAlpha = brightness;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
