// ─── main.ts – vstupní bod aplikace ─────────────────────────────────────────

import { Engine } from './Engine.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './constants.js';

// ─── Canvas setup + responzivní škálování ────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

canvas.width  = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;

function resizeCanvas(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const scaleX = vw / LOGICAL_WIDTH;
  const scaleY = vh / LOGICAL_HEIGHT;
  const scale  = Math.min(scaleX, scaleY);

  const displayW = Math.floor(LOGICAL_WIDTH  * scale);
  const displayH = Math.floor(LOGICAL_HEIGHT * scale);

  canvas.style.width  = `${displayW}px`;
  canvas.style.height = `${displayH}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── Spuštění enginu ─────────────────────────────────────────────────────────

const engine = new Engine(canvas);
engine.start();
