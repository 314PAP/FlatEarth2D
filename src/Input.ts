// ─── Input.ts – klávesnice + dotykový gamepad ───────────────────────────────

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  attack: boolean;
  ultimate: boolean;
}

export class InputManager {
  private state: InputState = {
    left: false, right: false,
    jump: false, attack: false, ultimate: false,
  };

  /** Bylo stisknuto jen v tomto snímku (jednoráz) */
  private justPressed: InputState = {
    left: false, right: false,
    jump: false, attack: false, ultimate: false,
  };

  private prevState: InputState = { ...this.state };

  constructor() {
    this.bindKeyboard();
    if (this.isTouchDevice()) {
      this.activateTouchOverlay();
      this.bindTouch();
    }
  }

  // ── Veřejné API ────────────────────────────────────────────────────────────

  get left()     { return this.state.left; }
  get right()    { return this.state.right; }
  get jump()     { return this.state.jump; }
  get attack()   { return this.state.attack; }
  get ultimate() { return this.state.ultimate; }

  isJustPressed(key: keyof InputState): boolean {
    return this.justPressed[key];
  }

  /** Volat na konci každého herního snímku */
  endFrame(): void {
    // justPressed = klávesy, které jsou DOWN nyní ale nebyly minulý snímek
    for (const k of Object.keys(this.state) as (keyof InputState)[]) {
      this.justPressed[k] = this.state[k] && !this.prevState[k];
    }
    this.prevState = { ...this.state };
  }

  // ── Detekce dotyku ────────────────────────────────────────────────────────

  private isTouchDevice(): boolean {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  }

  private activateTouchOverlay(): void {
    const overlay = document.getElementById('touch-overlay');
    if (overlay) overlay.classList.add('active');
  }

  // ── Klávesnice ────────────────────────────────────────────────────────────

  private bindKeyboard(): void {
    const map: Record<string, keyof InputState> = {
      ArrowLeft: 'left',  KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump',    KeyW: 'jump',    Space: 'jump',
      KeyJ: 'attack',     KeyE: 'attack',
      KeyK: 'ultimate',   KeyQ: 'ultimate',
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

  // ── Dotykový gamepad ──────────────────────────────────────────────────────

  private bindTouch(): void {
    this.bindBtn('dpad-left',   'left');
    this.bindBtn('dpad-right',  'right');
    this.bindBtn('btn-jump',    'jump');
    this.bindBtn('btn-attack',  'attack');
    this.bindBtn('btn-ultimate','ultimate');
  }

  private bindBtn(id: string, action: keyof InputState): void {
    const el = document.getElementById(id);
    if (!el) return;

    const press   = (e: Event) => { e.preventDefault(); this.state[action] = true;  el.classList.add('pressed'); };
    const release = (e: Event) => { e.preventDefault(); this.state[action] = false; el.classList.remove('pressed'); };

    el.addEventListener('touchstart', press,   { passive: false });
    el.addEventListener('touchend',   release, { passive: false });
    el.addEventListener('touchcancel',release, { passive: false });
    // záloha pro myš
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup',   release);
    el.addEventListener('mouseleave',release);
  }

  /** Aktualizuje vizuální stav tlačítka ultimate (disabled/enabled) */
  updateUltimateButton(available: boolean): void {
    const btn = document.getElementById('btn-ultimate');
    if (!btn) return;
    if (available) {
      btn.classList.remove('disabled');
    } else {
      btn.classList.add('disabled');
    }
  }
}
