export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  ultimate: boolean;
}

export class InputManager {
  private state: InputState = {
    left: false, right: false, up: false, down: false,
    jump: false, attack: false, ultimate: false,
  };
  private justPressed: InputState = { ...this.state };
  private prevState: InputState = { ...this.state };

  constructor() {
    this.bindKeyboard();
    if (this.isTouchDevice()) {
      this.activateTouchOverlay();
      this.bindTouch();
    }
  }

  get left() { return this.state.left; }
  get right() { return this.state.right; }
  get up() { return this.state.up; }
  get down() { return this.state.down; }
  get jump() { return this.state.jump; }
  get attack() { return this.state.attack; }
  get ultimate() { return this.state.ultimate; }

  isJustPressed(key: keyof InputState): boolean {
    return this.justPressed[key];
  }

  endFrame(): void {
    for (const k of Object.keys(this.state) as (keyof InputState)[]) {
      this.justPressed[k] = this.state[k] && !this.prevState[k];
    }
    this.prevState = { ...this.state };
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
  }

  private activateTouchOverlay(): void {
    const overlay = document.getElementById('touch-overlay');
    if (overlay) overlay.classList.add('active');
  }

  private bindKeyboard(): void {
    const map: Record<string, keyof InputState> = {
      KeyA: 'left', ArrowLeft: 'left',
      KeyD: 'right', ArrowRight: 'right',
      KeyW: 'up', ArrowUp: 'up',
      KeyS: 'down', ArrowDown: 'down',
      KeyK: 'jump', Space: 'jump',
      KeyJ: 'attack',
      KeyL: 'ultimate',
    };

    window.addEventListener('keydown', (e) => {
      const action = map[e.code];
      if (action) { this.state[action] = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
      const action = map[e.code];
      if (action) this.state[action] = false;
    });
  }

  private bindTouch(): void {
    this.bindBtn('dpad-left', 'left');
    this.bindBtn('dpad-right', 'right');
    this.bindBtn('dpad-up', 'up');
    this.bindBtn('dpad-down', 'down');
    this.bindBtn('btn-jump', 'jump');
    this.bindBtn('btn-attack', 'attack');
    this.bindBtn('btn-ultimate', 'ultimate');
  }

  private bindBtn(id: string, action: keyof InputState): void {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e: Event) => { e.preventDefault(); this.state[action] = true; el.classList.add('pressed'); };
    const release = (e: Event) => { e.preventDefault(); this.state[action] = false; el.classList.remove('pressed'); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
  }

  updateUltimateButton(available: boolean): void {
    const btn = document.getElementById('btn-ultimate');
    if (!btn) return;
    btn.classList.toggle('disabled', !available);
  }
}
