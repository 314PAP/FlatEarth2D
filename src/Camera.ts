export class Camera {
  private x = 0;

  update(targetX: number, _dt: number): number {
    this.x += (targetX - this.x) * 0.1;
    return this.x;
  }

  get xOffset(): number {
    return this.x;
  }
}
