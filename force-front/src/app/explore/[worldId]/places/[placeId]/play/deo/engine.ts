/* ============================================================
   LOS OJOS DE DEO — motor del juego (plataformero de descenso)
   Canvas 1280x720. El jugador controla a Deo con las flechas
   horizontales y salta con la barra espaciadora. El túnel es
   procedural: piedra gris, huecos sobre el abismo y cristales
   oscuros que laten al ritmo de la piedra. Leer el latido y
   pasar en el contratiempo es la clave.

   Portado del prototipo de diseño (deo-game.js) a un módulo ES:
   `createDeoGame()` devuelve una instancia con su propio estado,
   sin globales, con `destroy()` para la limpieza de React.
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type DeoState = 'ready' | 'playing' | 'dead' | 'reclaim';
export type DeoCause = 'gap' | 'crystal' | 'reclaim' | null;

export interface DeoHud {
  depth: number;
  coins: number;
  cause: DeoCause;
  beat: number;
  period: number;
  danger: boolean;
}

export interface DeoCallbacks {
  onState?: (state: DeoState, hud?: DeoHud) => void;
  onHud?: (hud: DeoHud) => void;
}

export interface DeoConfig {
  runSpeed: number;
  gravity: number;
  jump: number;
  beatStart: number;
  beatMin: number;
  crystalDensity: number;
  gapDensity: number;
}

export interface DeoMountOpts {
  canvas: HTMLCanvasElement;
  callbacks?: DeoCallbacks;
  /** Base donde viven los sprites (deo-idle.png, deo-walk-a.png, deo-walk-b.png). */
  spriteBase?: string;
}

export interface DeoGameInstance {
  mount(opts: DeoMountOpts): Promise<void>;
  start(): void;
  reclaim(): void;
  retry(): void;
  getMode(): string;
  getHud(): DeoHud;
  setConfig(partial: Partial<DeoConfig>): void;
  getConfig(): DeoConfig;
  destroy(): void;
  readonly W: number;
  readonly H: number;
}

export function createDeoGame(): DeoGameInstance {
  const W = 1280, H = 720;
  const FLOOR_Y = 568;            // tope del suelo base
  const DEATH_Y = 820;            // caer más abajo = abismo
  const START_X = 360;            // x de salida del jugador
  const PX_PER_M = 11;            // px de avance por "metro" de profundidad

  // --- parámetros ajustables (Tweaks) ---
  const CFG: DeoConfig = {
    runSpeed: 5.4,     // velocidad horizontal máxima
    gravity: 0.74,     // gravedad
    jump: 15.4,        // impulso de salto
    beatStart: 1500,   // ms del latido al inicio
    beatMin: 620,      // ms del latido a máxima profundidad
    crystalDensity: 1, // multiplicador de cristales
    gapDensity: 1,     // multiplicador de huecos
  };

  let cv: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let sprites: Record<string, HTMLImageElement | null> = {};
  let ready = false;
  let spriteBase = '/game/';
  let raf = 0, lastT = 0;
  let mode: DeoState | 'over' = 'ready';   // ready | playing | over
  let cb: DeoCallbacks = {};

  const keys = { left: false, right: false, jump: false };
  let player: any, cam: any, platforms: any[], crystals: any[], gems: any[], dust: any[], frontier: number;
  let depthMax: number, beatClock: number, beatPhase: number, beatPeriod: number, deathCause: DeoCause;

  let keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  let keyupHandler: ((e: KeyboardEvent) => void) | null = null;

  // ---------- carga de sprites ----------
  function load(src: string): Promise<HTMLImageElement | null> {
    return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  async function preload() {
    const [idle, wa, wb] = await Promise.all([
      load(spriteBase + 'deo-idle.png'), load(spriteBase + 'deo-walk-a.png'), load(spriteBase + 'deo-walk-b.png'),
    ]);
    sprites = { idle, walkA: wa, walkB: wb };
    ready = true;
  }

  // ---------- generación procedural ----------
  function rand(a: number, b: number) { return a + Math.random() * (b - a); }
  function chance(p: number) { return Math.random() < p; }

  function difficulty() {
    // 0 en superficie -> 1 en profundidad (>~520 m)
    const m = depthMeters();
    return Math.min(1, m / 520);
  }

  function ensureWorld() {
    while (frontier < cam.x + W + 700) {
      generateChunk();
    }
    // limpiar lo que quedó muy atrás
    const cut = cam.x - 400;
    platforms = platforms.filter(p => p.x + p.w > cut);
    crystals = crystals.filter(c => c.x > cut);
    gems = gems.filter(g => g.x > cut);
  }

  function addPlatform(x: number, y: number, w: number) { platforms.push({ x, y, w }); return platforms[platforms.length - 1]; }

  function generateChunk() {
    const d = difficulty();
    const x = frontier;

    // ¿hueco? (nunca dos seguidos; más frecuentes y anchos en profundidad)
    const gapP = (0.16 + d * 0.30) * CFG.gapDensity;
    if (x > START_X + 360 && !(platforms as any).lastWasGap && chance(gapP)) {
      const gap = rand(110, 150 + d * 110);        // ancho del hueco
      // a veces una plataforma flotante en medio del hueco
      if (gap > 200 || chance(0.45)) {
        const fw = rand(120, 180);
        const fy = FLOOR_Y - rand(40, 120);
        addPlatform(x + (gap - fw) / 2, fy, fw);
      }
      frontier = x + gap;
      (platforms as any).lastWasGap = true;
      return;
    }
    (platforms as any).lastWasGap = false;

    // plataforma de suelo, a veces escalonada
    let y = FLOOR_Y;
    if (chance(0.30)) y = FLOOR_Y - Math.round(rand(0, 1)) * 0 - (chance(0.5) ? rand(38, 70) : -rand(0, 0));
    y = Math.max(FLOOR_Y - 96, Math.min(FLOOR_Y, y));
    const w = rand(230, 380);
    const plat = addPlatform(x, y, w);

    // cristal pulsante sobre la plataforma (deja borde seguro)
    const crysP = (0.30 + d * 0.45) * CFG.crystalDensity;
    if (w > 250 && chance(crysP)) {
      const cw = rand(46, 74);
      const cx = plat.x + rand(80, w - cw - 80);
      crystals.push({
        x: cx, y: plat.y, w: cw,
        hMax: rand(74, 116),
        offset: chance(0.5) ? 0 : 0.5,   // algunos laten en contratiempo
        ceiling: false,
      });
    } else if (chance(0.16 + d * 0.22) && w > 220) {
      // cristal colgante del techo (deep)
      const cw = rand(46, 70);
      const cx = plat.x + rand(70, w - cw - 70);
      crystals.push({ x: cx, y: plat.y, w: cw, hMax: rand(80, 130), offset: chance(0.5) ? 0 : 0.5, ceiling: true, ceilY: plat.y - rand(150, 200) });
    }

    frontier = x + w;
  }

  // ---------- ciclo de vida ----------
  function reset() {
    player = { x: START_X, y: FLOOR_Y - 96, vx: 0, vy: 0, w: 54, h: 92, onGround: true, facing: 1, coyote: 0, jumpBuf: 0, animT: 0, frame: 0, maxX: START_X };
    cam = { x: 0 };
    platforms = []; crystals = []; gems = []; dust = [];
    (platforms as any).lastWasGap = false;
    frontier = 0;
    depthMax = START_X;
    beatClock = 0; beatPhase = 0; beatPeriod = CFG.beatStart; deathCause = null;
    // suelo inicial seguro
    addPlatform(-200, FLOOR_Y, 760);
    frontier = 560;
    for (let i = 0; i < 60; i++) dust.push({ x: rand(0, W), y: rand(0, H), s: rand(0.2, 1), r: rand(0.6, 2.2) });
    ensureWorld();
  }

  function start() {
    if (!ready) return;
    reset();
    mode = 'playing';
    cb.onState?.('playing');
    cb.onHud?.(hud());
  }

  function endRun(cause: DeoCause) {
    if (mode !== 'playing') return;
    mode = 'over';
    deathCause = cause;       // 'gap' | 'crystal' | 'reclaim'
    cb.onState?.(cause === 'reclaim' ? 'reclaim' : 'dead', hud());
  }

  function depthMeters() { return Math.max(0, (depthMax - START_X) / PX_PER_M); }
  function coins() { return Math.floor(depthMeters() * 10); }
  function hud(): DeoHud {
    return {
      depth: Math.floor(depthMeters()), coins: coins(), cause: deathCause,
      beat: beatPhase, period: beatPeriod,
      danger: crystalExtension(beatPhase) >= 0.55,
    };
  }

  // ---------- input ----------
  function onKey(e: KeyboardEvent, down: boolean) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': keys.left = down; break;
      case 'ArrowRight': case 'KeyD': keys.right = down; break;
      case 'Space': keys.jump = down; if (down && player) player.jumpBuf = 8; break;
      case 'ArrowUp': case 'ArrowDown': break; // verticales no hacen nada
      default: return;                          // otras teclas: no intervenir
    }
    e.preventDefault();   // evita que la página haga scroll con flechas/espacio
  }

  // ---------- física + actualización ----------
  function update(dt: number) {
    // latido se acelera con la profundidad
    const d = difficulty();
    beatPeriod = CFG.beatStart - (CFG.beatStart - CFG.beatMin) * d;
    beatClock += dt;
    if (beatClock >= beatPeriod) beatClock -= beatPeriod;
    beatPhase = beatClock / beatPeriod;

    const p = player;
    // horizontal
    const acc = 0.9, fric = 0.80;
    if (keys.left && !keys.right) { p.vx -= acc; p.facing = -1; }
    else if (keys.right && !keys.left) { p.vx += acc; p.facing = 1; }
    else p.vx *= fric;
    p.vx = Math.max(-CFG.runSpeed, Math.min(CFG.runSpeed, p.vx));
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
    p.x += p.vx;

    // salto (coyote + buffer)
    if (p.onGround) p.coyote = 8; else p.coyote = Math.max(0, p.coyote - 1);
    p.jumpBuf = Math.max(0, p.jumpBuf - 1);
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -CFG.jump; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
    }
    // gravedad
    p.vy += CFG.gravity;
    if (!keys.jump && p.vy < 0) p.vy += CFG.gravity * 0.6; // salto variable
    p.vy = Math.min(p.vy, 22);
    p.y += p.vy;

    // colisión con tope de plataformas
    p.onGround = false;
    const feet = p.y, prevFeet = p.y - p.vy;
    for (const pl of platforms) {
      if (p.x + p.w * 0.5 < pl.x || p.x - p.w * 0.5 > pl.x + pl.w) continue;
      if (p.vy >= 0 && prevFeet <= pl.y + 14 && feet >= pl.y) {
        p.y = pl.y; p.vy = 0; p.onGround = true;
      }
    }

    // límite izquierdo de cámara (no retroceder fuera de pantalla)
    const minX = cam.x + 40 + p.w * 0.5;
    if (p.x < minX) { p.x = minX; if (p.vx < 0) p.vx = 0; }

    // profundidad
    if (p.x > depthMax) depthMax = p.x;

    // muerte por abismo
    if (p.y > DEATH_Y) { endRun('gap'); return; }

    // muerte por cristal activo
    for (const c of crystals) {
      const ph = (beatPhase + c.offset) % 1;
      const ext = crystalExtension(ph);            // 0..1
      if (ext < 0.55) continue;                    // sólo letal cuando extendido
      const lethalH = c.hMax * ext;
      const lx = c.x; let ly: number;
      const lh = lethalH;
      if (c.ceiling) { ly = c.ceilY; } else { ly = c.y - lethalH; }
      // caja del jugador
      const px0 = p.x - p.w * 0.42, px1 = p.x + p.w * 0.42;
      const py0 = p.y - p.h * 0.92, py1 = p.y - 4;
      if (px1 > lx + 6 && px0 < lx + c.w - 6 && py1 > ly && py0 < ly + lh) {
        endRun('crystal'); return;
      }
    }

    // cámara sigue al jugador (mira hacia adelante)
    const target = p.x - W * 0.32;
    cam.x += (target - cam.x) * 0.12;
    if (cam.x < -200) cam.x = -200;

    ensureWorld();

    // animación
    updateAnim(dt);

    cb.onHud?.(hud());
  }

  function crystalExtension(ph: number) {
    // ph 0..1 -> extensión: sube rápido, mantiene, baja. Letal en la cresta.
    // ventana activa ~ 38% del ciclo
    if (ph < 0.10) return ph / 0.10;          // emerge
    if (ph < 0.40) return 1;                  // extendido (letal)
    if (ph < 0.52) return 1 - (ph - 0.40) / 0.12; // retrae
    return 0;                                 // guardado (seguro)
  }

  function updateAnim(dt: number) {
    const p = player;
    if (!p.onGround) {
      p.sprite = p.vy < 0 ? 'walkB' : 'walkA';   // sube=frame3, cae=frame2
      return;
    }
    if (Math.abs(p.vx) > 0.4) {
      p.animT += dt * (0.6 + Math.abs(p.vx) / CFG.runSpeed * 0.9);
      if (p.animT > 120) { p.animT = 0; p.frame ^= 1; }
      p.sprite = p.frame ? 'walkB' : 'walkA';     // intercala 2 y 3
    } else {
      p.sprite = 'idle';                          // quieto = frame 1
    }
  }

  // ---------- render ----------
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawAbyss();
    for (const pl of platforms) drawPlatform(pl);
    for (const c of crystals) drawCrystal(c);
    drawPlayer();
    drawDust();
    drawVignette();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0b0d11');
    g.addColorStop(0.5, '#15171c');
    g.addColorStop(1, '#0a0b0e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // veta de cristal latiendo al fondo
    const pulse = crystalExtension(beatPhase);
    ctx.save();
    ctx.globalAlpha = 0.05 + pulse * 0.10;
    ctx.fillStyle = '#6f78c8';
    for (let i = 0; i < 5; i++) {
      const bx = ((i * 360 - cam.x * 0.25) % (W + 400) + W + 400) % (W + 400) - 200;
      ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 40, H * 0.5); ctx.lineTo(bx - 30, H); ctx.lineTo(bx - 90, H * 0.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // muros de piedra (parallax lejano y cercano)
    drawWallLayer(0.35, '#1b1e24', 120);
    drawWallLayer(0.6, '#23262d', 60);
  }

  function drawWallLayer(par: number, color: string, top: number) {
    ctx.fillStyle = color;
    const off = -(cam.x * par) % 220;
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    for (let x = -50; x < W + 60; x += 110) {
      const seed = Math.sin((x - off) * 0.07 + par * 99);
      ctx.lineTo(x + off, top + seed * 26 + 30);
      ctx.lineTo(x + off + 55, top + Math.cos((x - off) * 0.05) * 22);
    }
    ctx.lineTo(W + 60, 0); ctx.closePath(); ctx.fill();
  }

  function drawAbyss() {
    // el fondo bajo el suelo: abismo con resplandor profundo
    const g = ctx.createLinearGradient(0, FLOOR_Y - 20, 0, H);
    g.addColorStop(0, 'rgba(8,9,12,0)');
    g.addColorStop(0.5, 'rgba(6,7,10,0.85)');
    g.addColorStop(1, 'rgba(40,46,86,0.5)');
    ctx.fillStyle = g; ctx.fillRect(0, FLOOR_Y - 20, W, H - FLOOR_Y + 20);
  }

  function sx(x: number) { return x - cam.x; }

  function drawPlatform(pl: any) {
    const x = sx(pl.x), y = pl.y, w = pl.w, h = H - y + 60;
    // cuerpo de piedra
    const g = ctx.createLinearGradient(0, y, 0, y + 120);
    g.addColorStop(0, '#3b3f47');
    g.addColorStop(0.12, '#2c2f36');
    g.addColorStop(1, '#15171b');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // borde superior iluminado
    ctx.fillStyle = '#4c515b'; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = 'rgba(150,160,180,.25)'; ctx.fillRect(x, y, w, 2);
    // bloques tallados
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1.5;
    for (let bx = x + 28; bx < x + w - 10; bx += 64) { ctx.beginPath(); ctx.moveTo(bx, y + 8); ctx.lineTo(bx, y + 70); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, y + 40); ctx.lineTo(x + w, y + 40); ctx.stroke();
    // pequeñas vetas de cristal decorativas en el borde
    const pulse = crystalExtension(beatPhase);
    ctx.save(); ctx.globalAlpha = 0.25 + pulse * 0.5;
    ctx.fillStyle = '#7c84d8';
    for (let bx = x + 16; bx < x + w - 8; bx += 150) { ctx.fillRect(bx, y + 14, 2, 8); }
    ctx.restore();
  }

  function drawCrystal(c: any) {
    const ph = (beatPhase + c.offset) % 1;
    const ext = crystalExtension(ph);
    const charging = ph > 0.86 || (ph < 0.10);        // telegrafía
    const x = sx(c.x), w = c.w;
    const h = c.hMax * Math.max(ext, 0.14);
    const lethal = ext >= 0.55;
    const glow = lethal ? 1 : (charging ? 0.55 : 0.18);

    let baseY: number, dir: number;
    if (c.ceiling) { baseY = c.ceilY; dir = 1; } else { baseY = c.y; dir = -1; }

    // ancla de roca (para que el cristal no flote)
    ctx.save();
    ctx.fillStyle = '#191b22';
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    if (c.ceiling) {
      ctx.moveTo(x - 12, baseY + 10);
      ctx.quadraticCurveTo(x + w / 2, baseY - 18, x + w + 12, baseY + 10);
      ctx.lineTo(x + w + 12, baseY - 46); ctx.lineTo(x - 12, baseY - 46);
    } else {
      ctx.moveTo(x - 10, baseY + 2);
      ctx.quadraticCurveTo(x + w / 2, baseY - 13, x + w + 10, baseY + 2);
      ctx.lineTo(x + w + 10, baseY + 22); ctx.lineTo(x - 10, baseY + 22);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.save();
    // resplandor
    ctx.shadowColor = lethal ? 'rgba(150,120,240,0.9)' : 'rgba(110,120,210,0.5)';
    ctx.shadowBlur = 18 + glow * 26;
    // grupo de púas de cristal
    const spikes = 3;
    for (let i = 0; i < spikes; i++) {
      const sw = w / spikes;
      const cx = x + sw * (i + 0.5);
      const sh = h * (0.7 + 0.3 * Math.sin(i * 2 + 1));
      const tip = baseY + dir * sh;
      const grad = ctx.createLinearGradient(0, baseY, 0, tip);
      grad.addColorStop(0, '#20222b');
      grad.addColorStop(1, lethal ? '#8a7fe8' : '#4a4f78');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx - sw * 0.42, baseY);
      ctx.lineTo(cx, tip);
      ctx.lineTo(cx + sw * 0.42, baseY);
      ctx.closePath(); ctx.fill();
      // núcleo brillante
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#cfd0ff';
      ctx.beginPath();
      ctx.moveTo(cx - sw * 0.14, baseY + dir * sh * 0.18);
      ctx.lineTo(cx, tip);
      ctx.lineTo(cx + sw * 0.14, baseY + dir * sh * 0.18);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    const img = sprites[p.sprite] || sprites.idle;
    if (!img) return;
    const dw = 132, dh = 132;                 // los frames son cuadrados con padding
    const x = sx(p.x), y = p.y;
    ctx.save();
    // sombra
    ctx.globalAlpha = 0.32; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y + 2, p.w * 0.6 * (p.onGround ? 1 : 0.7), 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(x, y - dh + 24);            // alinear pies con y
    if (p.facing < 0) { ctx.scale(-1, 1); }
    ctx.drawImage(img, -dw / 2, 0, dw, dh);
    ctx.restore();
  }

  function drawDust() {
    ctx.save();
    for (const d of dust) {
      d.y -= d.s * 0.4; d.x -= d.s * 0.15;
      if (d.y < -4) { d.y = H + 4; d.x = rand(0, W); }
      ctx.globalAlpha = 0.10 + d.s * 0.12;
      ctx.fillStyle = '#aab0c8';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // ---------- loop ----------
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    let dt = t - lastT; lastT = t;
    if (dt > 50) dt = 50;          // clamp
    if (mode === 'playing') update(dt);
    draw();
  }

  // ---------- API pública ----------
  return {
    async mount(opts: DeoMountOpts) {
      cv = opts.canvas; ctx = cv.getContext('2d')!; cb = opts.callbacks || {};
      if (opts.spriteBase) spriteBase = opts.spriteBase;
      cv.width = W; cv.height = H;
      await preload();
      reset();
      keydownHandler = (e) => onKey(e, true);
      keyupHandler = (e) => onKey(e, false);
      window.addEventListener('keydown', keydownHandler);
      window.addEventListener('keyup', keyupHandler);
      lastT = 0; raf = requestAnimationFrame(frame);
      cb.onState?.('ready');
    },
    start,
    reclaim() { endRun('reclaim'); },
    retry() { start(); },
    getMode() { return mode; },
    getHud() { return hud(); },
    setConfig(partial: Partial<DeoConfig>) { Object.assign(CFG, partial); },
    getConfig() { return Object.assign({}, CFG); },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (keydownHandler) window.removeEventListener('keydown', keydownHandler);
      if (keyupHandler) window.removeEventListener('keyup', keyupHandler);
      keydownHandler = keyupHandler = null;
    },
    W, H,
  };
}
