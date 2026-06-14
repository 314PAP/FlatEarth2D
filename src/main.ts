import { Engine } from './Engine.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './constants.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;

function resizeCanvas(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / LOGICAL_WIDTH, vh / LOGICAL_HEIGHT);
  canvas.style.width = `${Math.floor(LOGICAL_WIDTH * scale)}px`;
  canvas.style.height = `${Math.floor(LOGICAL_HEIGHT * scale)}px`;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const engine = new Engine(canvas);
engine.start();