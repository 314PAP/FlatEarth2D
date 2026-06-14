export class Camera {
  private x = 0;
  private locked = false;
  private lockTarget = 0;

  update(targetX: number, _dt: number, enemiesActive: boolean): number {
    if (enemiesActive) {
      this.locked = true;
      this.lockTarget = Math.max(this.x, targetX);
      this.x += (this.lockTarget - this.x) * 0.1;
    } else {
      this.locked = false;
      this.x += (targetX - this.x) * 0.1;
    }
    return Math.max(0, this.x);
  }

  isLocked(): boolean { return this.locked; }
  get xOffset(): number { return this.x; }
}
