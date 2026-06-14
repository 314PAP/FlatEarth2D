import type { GameState } from './types.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, COLOR_HUD_BG, COLOR_HP_BAR, COLOR_HP_LOST, COLOR_TEXT, COLOR_HEAT_BAR, CARDS_FOR_COMPANION } from './constants.js';

export class UI {
  private etherDuck = { active: false, timer: 0, x: -250, duration: 2.0, speed: 900 };

  update(_dt: number, _state: GameState): void {
    if (this.etherDuck.active) {
      this.etherDuck.timer += _dt;
      this.etherDuck.x += this.etherDuck.speed * _dt;
      if (this.etherDuck.timer >= this.etherDuck.duration) this.etherDuck.active = false;
    }
  }

  triggerEtherDuck(): void {
    this.etherDuck.active = true;
    this.etherDuck.timer = 0;
    this.etherDuck.x = -250;
  }

  draw(ctx: any, state: GameState): void {
    this.drawHpBar(ctx, state);
    this.drawHeatMeter(ctx, state);
    this.drawCardCount(ctx, state);
    this.drawScore(ctx, state);
    if (this.etherDuck.active) this.drawEtherDuck(ctx);
  }

  drawGameOver(ctx: any, score: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '32px "Segoe UI", sans-serif';
    ctx.fillText(`Skóre: ${score}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 20);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText('Stiskni ENTER nebo klepni pro restart', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 70);
    ctx.textAlign = 'left';
  }

  drawLevelComplete(ctx: any, level: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.fillStyle = '#80ff80';
    ctx.font = 'bold 64px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`ÚROVEŇ ${level} SPLNĚNA!`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillText('Připravte se na další vlnu...', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30);
    ctx.textAlign = 'left';
  }

  drawStartScreen(ctx: any): void {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    for (let i = 0; i < 120; i++) {
      const sx = ((i * 1737) % LOGICAL_WIDTH);
      const sy = ((i * 2591) % LOGICAL_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.4 + (i % 10) * 0.06;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 2 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const grad = ctx.createLinearGradient(LOGICAL_WIDTH / 2 - 300, 0, LOGICAL_WIDTH / 2 + 300, 0);
    grad.addColorStop(0, '#60c0ff');
    grad.addColorStop(0.5, '#ffee40');
    grad.addColorStop(1, '#ff60a0');
    ctx.fillStyle = grad;
    ctx.font = 'bold 96px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FLAT EARTH', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 100);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('Beat \'Em Up - Mlátička', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 10);

    ctx.fillStyle = '#f0e060';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    const blink = Math.floor(Date.now() / 600) % 2 === 0;
    if (blink) ctx.fillText('Stiskni ENTER nebo klepni pro start', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 90);
    ctx.textAlign = 'left';
  }

  private drawHpBar(ctx: any, state: GameState): void {
    const x = 20, y = 20, w = 200, h = 22;
    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = COLOR_HP_LOST;
    ctx.fillRect(x, y, w, h);
    const ratio = state.domoHp / state.domoMaxHp;
    if (ratio > 0) {
      ctx.fillStyle = COLOR_HP_BAR;
      ctx.fillRect(x, y, w * ratio, h);
    }
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`❤ ${state.domoHp} / ${state.domoMaxHp}`, x + 8, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  private drawHeatMeter(ctx: any, state: GameState): void {
    const x = 20, y = 54, w = 200, h = 22;
    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#331100';
    ctx.fillRect(x, y, w, h);
    const ratio = state.heatMeter / 100;
    if (ratio > 0) {
      ctx.fillStyle = COLOR_HEAT_BAR;
      ctx.fillRect(x, y, w * ratio, h);
    }
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🔥 ${Math.floor(state.heatMeter)}%`, x + 8, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  private drawCardCount(ctx: any, state: GameState): void {
    const x = 20, y = 88;
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`🃏 Karty: ${state.cardsCollected} / ${CARDS_FOR_COMPANION}`, x, y);
    ctx.textBaseline = 'alphabetic';
  }

  private drawScore(ctx: any, state: GameState): void {
    ctx.fillStyle = COLOR_HUD_BG;
    ctx.fillRect(LOGICAL_WIDTH - 180, 16, 164, 30, 6);
    ctx.fillStyle = COLOR_TEXT;
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Skóre: ${state.score}`, LOGICAL_WIDTH - 20, 31);
    ctx.textAlign = 'left';
  }

  private drawEtherDuck(ctx: any): void {
    const x = this.etherDuck.x;
    const cy = LOGICAL_HEIGHT / 2 - 40;
    ctx.save();
    ctx.translate(x, cy);
    ctx.scale(2.2, 2.2);
    ctx.fillStyle = '#f0d020';
    ctx.beginPath();
    ctx.ellipse(0, 10, 50, 38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d0b010';
    ctx.beginPath();
    ctx.ellipse(-15, 12, 30, 18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0d020';
    ctx.beginPath();
    ctx.arc(36, -18, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e07000';
    ctx.beginPath();
    ctx.moveTo(56, -20);
    ctx.lineTo(78, -16);
    ctx.lineTo(56, -12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(44, -22, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(45, -23, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8020';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 10, -38);
      ctx.lineTo(26 + i * 10, -52);
      ctx.lineTo(30 + i * 10, -38);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,80,0.9)';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ETHER KACHNA!', 20, -62);
    ctx.restore();
  }
}
