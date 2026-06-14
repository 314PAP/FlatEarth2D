export class Camera {
  private x = 0;
  private locked = false;
  private lockX = 0;

  update(targetX: number, _dt: number, enemiesActive: boolean): number {
    if (enemiesActive) {
      this.locked = true;
      this.lockX = Math.max(this.lockX, targetX);
    } else {
      this.locked = false;
    }

    // CPS-1: scroll right only when Domo crosses screen center
    if (targetX - this.x > 400) {
      this.x = targetX - 400;
    }

    // Never decrease (no backward scroll)
    return Math.max(this.x, 0);
  }

  isLocked(): boolean { return this.locked; }
  get xOffset(): number { return this.x; }
}
