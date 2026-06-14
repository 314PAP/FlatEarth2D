export class Companion {
  unlocked = false;
  active = false;
  activeTimer = 0;
  readonly ACTIVE_DURATION = 1.5;

  summon(): void {
    this.active = true;
    this.activeTimer = 0;
  }

  update(dt: number): void {
    if (this.active) {
      this.activeTimer += dt;
      if (this.activeTimer >= this.ACTIVE_DURATION) this.active = false;
    }
  }

  draw(ctx: any): void {
    if (!this.active) return;
    ctx.fillStyle = 'rgba(255, 220, 50, 0.3)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(640, 360, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px "Segoe UI"';
    ctx.textAlign = 'center';
    ctx.fillText('KACHNA', 640, 300);
  }
}
