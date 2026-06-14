export interface Card {
  x: number;
  y: number;
  collected: boolean;
}

export interface Breakable {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  alive: boolean;
}

export class CardManager {
  cards: Card[] = [];
  cardsCollected = 0;
  heatMeter = 0;
  private spawnTimer = 0;
  private readonly SPAWN_INTERVAL = 3.0;
  breakables: Breakable[] = [];

  spawnCard(x: number, y: number): void {
    this.cards.push({ x, y, collected: false });
  }

  spawnBreakable(x: number, y: number): void {
    this.breakables.push({
      x, y,
      w: 40,
      h: 40,
      hp: 2,
      alive: true,
    });
  }

  update(dt: number): void {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.SPAWN_INTERVAL && this.cards.length < 5) {
      const side = Math.random() < 0.5 ? 200 : 1000;
      const y = 620 + Math.random() * 40;
      this.spawnCard(side + Math.random() * 200, y);
      this.spawnTimer = 0;
    }
  }

  drawCard(ctx: any, card: any): void {
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(card.x - 8, card.y - 12, 16, 20);
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    ctx.strokeRect(card.x - 8, card.y - 12, 16, 20);
  }

  drawBreakables(ctx: any): void {
    for (const b of this.breakables) {
      if (!b.alive) continue;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#5D2906';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
  }
}