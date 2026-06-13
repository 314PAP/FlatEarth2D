// ─── Herní konstanty ────────────────────────────────────────────────────────

/** Logická šířka herní plochy (v pixelech) */
export const LOGICAL_WIDTH  = 1280;
/** Logická výška herní plochy (v pixelech) */
export const LOGICAL_HEIGHT = 720;

/** Cílový fyzikální krok v sekundách (60 fps) */
export const FIXED_DT = 1 / 60;
/** Maximální akumulovaný čas před vynucením kroku */
export const MAX_ACCUMULATED_DT = 0.25;

/** Gravitační zrychlení (px/s²) */
export const GRAVITY = 1800;
/** Rychlost skoku (px/s, záporná = nahoru) */
export const JUMP_VELOCITY = -680;
/** Horizontální rychlost pohybu (px/s) */
export const MOVE_SPEED = 320;

/** Maximální Ether energie */
export const MAX_ETHER = 100;
/** Přírůstek Etheru za zabití Globera */
export const ETHER_PER_KILL = 20;

/** Barvy UI */
export const COLOR_HUD_BG    = 'rgba(0,0,0,0.55)';
export const COLOR_ETHER_BAR = '#f0c020';
export const COLOR_HP_BAR    = '#30e060';
export const COLOR_HP_LOST   = '#e03030';
export const COLOR_TEXT      = '#ffffff';

/** Barvy světa */
export const COLOR_SKY      = '#1a1a2e';
export const COLOR_PLATFORM = '#2a6040';
export const COLOR_GROUND   = '#1a3a28';
