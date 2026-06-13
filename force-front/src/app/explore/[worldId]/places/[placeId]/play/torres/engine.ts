/* ============================================================
   TORRES DE LA CORDILLERA — motor del juego (plataformero vertical)
   Canvas 1280x720. El jugador escala las ciudades verticales de la
   cordillera de Koril saltando entre plataformas bioluminiscentes.
   Cuanta más altura, más puntos. Las plataformas son estables un
   tiempo y luego se inclinan y se rompen. Las plataformas-trampa
   (cristal violeta, fractura roja) se rompen al instante. A más
   altura: menos plataformas y menos tiempo estable. SIEMPRE existe
   al menos un salto posible a una plataforma más elevada (el camino
   "garantizado" nunca es trampa y nunca decae hasta ser pisado).
   Flechas ◀ ▶ = mover · barra espaciadora = saltar.

   Portado del prototipo de diseño (torres-game.js) a un módulo ES:
   `createTorresGame()` devuelve una instancia con su propio estado,
   sin globales, con `destroy()` para la limpieza de React.
   ============================================================ */
/* eslint-disable @typescript-eslint/no-explicit-any */

export type TorresState = 'ready' | 'playing' | 'dead' | 'reclaim';
export type TorresCause = 'fall' | 'reclaim' | null;

export interface TorresHud {
  height: number;
  coins: number;
  cause: TorresCause;
  diff: number;
}

export interface TorresCallbacks {
  onState?: (state: TorresState, hud?: TorresHud) => void;
  onHud?: (hud: TorresHud) => void;
}

export interface TorresConfig {
  runSpeed: number;
  gravity: number;
  jump: number;
  stableBase: number;
  platDensity: number;
  trapDensity: number;
}

export interface TorresMountOpts {
  canvas: HTMLCanvasElement;
  callbacks?: TorresCallbacks;
  /** Base donde viven los sprites (deo-idle.png, deo-walk-a.png, deo-walk-b.png). */
  spriteBase?: string;
}

export interface TorresGameInstance {
  mount(opts: TorresMountOpts): Promise<void>;
  start(): void;
  reclaim(): void;
  retry(): void;
  getMode(): string;
  getHud(): TorresHud;
  setConfig(partial: Partial<TorresConfig>): void;
  getConfig(): TorresConfig;
  destroy(): void;
  readonly W: number;
  readonly H: number;
}

export function createTorresGame(): TorresGameInstance {
  const W = 1280, H = 720;
  const START_X = W / 2;
  const START_Y = 600;            // y-mundo del suelo base (mayor = más abajo)
  const PX_PER_M = 12;            // px de ascenso por "metro" de altura

  // --- parámetros ajustables (Tweaks) ---
  const CFG: TorresConfig = {
    runSpeed: 6.0,     // velocidad horizontal máxima
    gravity: 0.66,     // gravedad
    jump: 16.2,        // impulso de salto
    stableBase: 2400,  // ms estables al pie de la torre
    platDensity: 1,    // multiplicador de plataformas extra
    trapDensity: 1,    // multiplicador de plataformas-trampa
  };

  let cv: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let sprites: Record<string, HTMLImageElement | null> = {};
  let ready = false;
  let spriteBase = '/game/';
  let raf = 0, lastT = 0;
  let mode: TorresState | 'over' = 'ready';   // ready | playing | over
  let cb: TorresCallbacks = {};

  const keys = { left: false, right: false, jump: false };
  let player: any, camY: number, camMin: number, platforms: any[], debris: any[], spores: any[];
  let towersFar: any[], towersNear: any[];
  let genY: number, pathCx: number, rowIndex: number, bestY: number, clock: number, deathCause: TorresCause;

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

  // ---------- utilidades ----------
  function rand(a: number, b: number) { return a + Math.random() * (b - a); }
  function chance(p: number) { return Math.random() < p; }
  function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  function heightMeters() { return Math.max(0, Math.floor((START_Y - bestY) / PX_PER_M)); }
  function coins() { return Math.floor(heightMeters() * 8); }
  // dificultad ligada a la altura que se está generando (0 al pie -> 1 muy arriba)
  function diffAt(y: number) { return clamp(((START_Y - y) / PX_PER_M) / 620, 0, 1); }
  function difficulty() { return clamp(((START_Y - bestY) / PX_PER_M) / 620, 0, 1); }

  function hud(): TorresHud {
    return { height: heightMeters(), coins: coins(), cause: deathCause, diff: difficulty() };
  }

  // ---------- generación procedural (de abajo hacia arriba) ----------
  function addPlat(x: number, y: number, w: number, type: string) {
    const goldEdge = type === 'normal' ? chance(0.42) : false;
    const p = {
      x, y, w, h: 16, type,
      landed: false, landAt: 0, state: 'idle', // idle|stable|tilt|breaking|gone
      tilt: 0, tiltDir: 1, breakAt: 0, stableMs: 2400,
      gold: goldEdge, seed: Math.random() * 100, bob: Math.random() * Math.PI * 2,
      base: false,
    };
    platforms.push(p);
    return p;
  }

  function generateRow() {
    const d = diffAt(genY);
    rowIndex++;
    const early = rowIndex <= 4;

    // separación vertical (siempre dentro del alcance del salto)
    const gap = early ? rand(96, 116) : rand(lerp(104, 122, d), lerp(132, 150, d));
    const ny = genY - gap;

    // plataforma GARANTIZADA del camino (nunca trampa, decae sólo al pisarse)
    const w = early ? rand(180, 230) : clamp(lerp(186, 100, d) + rand(-16, 16), 84, 240);
    const spread = early ? 110 : lerp(140, 188, d);
    const cx = clamp(pathCx + rand(-spread, spread), 70 + w / 2, W - 70 - w / 2);
    const guaranteed = addPlat(cx - w / 2, ny, w, 'normal');
    guaranteed.stableMs = lerp(CFG.stableBase, CFG.stableBase * 0.3, d);
    pathCx = cx;

    // plataformas extra (menos a más altura)
    let nExtra;
    if (early) nExtra = 2;
    else if (d < 0.35) nExtra = chance(0.5) ? 2 : 1;
    else if (d < 0.7) nExtra = chance(0.55) ? 1 : 0;
    else nExtra = chance(0.28) ? 1 : 0;
    nExtra = Math.round(nExtra * CFG.platDensity);

    const trapProb = early ? 0 : clamp(lerp(0.16, 0.5, d) * CFG.trapDensity, 0, 0.7);
    for (let i = 0; i < nExtra; i++) {
      const ew = clamp(lerp(170, 96, d) * rand(0.72, 1) + rand(-10, 10), 78, 220);
      let ex = clamp(rand(60, W - 60 - ew), 60, W - 60 - ew);
      // no encimar la garantizada
      if (ex + ew > guaranteed.x - 30 && ex < guaranteed.x + guaranteed.w + 30) {
        ex = guaranteed.x > W / 2 ? Math.max(60, guaranteed.x - ew - 60) : Math.min(W - 60 - ew, guaranteed.x + guaranteed.w + 60);
      }
      const type = chance(trapProb) ? 'trap' : 'normal';
      const ey = ny + rand(-30, 30);
      const ep = addPlat(ex, ey, ew, type);
      ep.stableMs = lerp(CFG.stableBase, CFG.stableBase * 0.3, diffAt(ey));
    }

    genY = ny;
  }

  function ensureWorld() {
    while (genY > camY - 520) generateRow();
    const cut = camY + H + 380;
    platforms = platforms.filter(p => p.y < cut);
  }

  // ---------- ciclo de vida ----------
  function reset() {
    player = { x: START_X, y: START_Y, vx: 0, vy: 0, w: 46, h: 86, onGround: true, facing: 1, coyote: 8, jumpBuf: 0, animT: 0, frame: 0, plat: null, sprite: 'idle' };
    camY = START_Y - H * 0.58; camMin = camY;
    platforms = []; debris = []; spores = [];
    genY = START_Y + 40; pathCx = START_X; rowIndex = 0;
    bestY = START_Y; clock = 0; deathCause = null;
    // suelo base ancho y seguro
    const base = addPlat(START_X - 280, START_Y, 560, 'normal');
    base.stableMs = 999999; base.base = true; base.gold = true;
    player.plat = base; base.landed = true; base.landAt = -999999; base.state = 'stable';
    // torres de fondo (parallax)
    towersFar = []; towersNear = [];
    for (let i = 0; i < 26; i++) towersFar.push({ x: rand(0, W), w: rand(46, 120), h: rand(160, 520), t: rand(0, 1), gold: chance(0.3) });
    for (let i = 0; i < 16; i++) towersNear.push({ x: rand(0, W), w: rand(70, 180), h: rand(220, 640), t: rand(0, 1), gold: chance(0.35) });
    for (let i = 0; i < 70; i++) spores.push({ x: rand(0, W), y: rand(0, H), s: rand(0.15, 0.7), r: rand(0.7, 2.4), gold: chance(0.4) });
    ensureWorld();
  }

  function start() {
    if (!ready) return;
    reset();
    mode = 'playing';
    cb.onState?.('playing');
    cb.onHud?.(hud());
  }

  function endRun(cause: TorresCause) {
    if (mode !== 'playing') return;
    mode = 'over';
    deathCause = cause;       // 'fall' | 'reclaim'
    cb.onState?.(cause === 'reclaim' ? 'reclaim' : 'dead', hud());
  }

  // ---------- input ----------
  function onKey(e: KeyboardEvent, down: boolean) {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': keys.left = down; break;
      case 'ArrowRight': case 'KeyD': keys.right = down; break;
      case 'Space': case 'ArrowUp': case 'KeyW':
        keys.jump = down; if (down && player) player.jumpBuf = 9; break;
      default: return;
    }
    e.preventDefault();
  }

  // ---------- física + actualización ----------
  function isSolid(pl: any) {
    if (pl.state === 'gone') return false;
    if (pl.type === 'trap') return !pl.landed || (clock - pl.landAt < 150);
    return pl.state !== 'breaking' || (clock - pl.breakAt < 60);
  }

  function landOn(pl: any) {
    if (pl === player.plat && pl.landed) return;
    player.plat = pl;
    if (!pl.landed) {
      pl.landed = true; pl.landAt = clock;
      if (pl.type === 'trap') { pl.state = 'breaking'; pl.breakAt = clock; spawnShards(pl, true); }
      else { pl.state = 'stable'; pl.tiltDir = (player.x < pl.x + pl.w / 2) ? -1 : 1; }
    }
  }

  function updatePlatform(pl: any) {
    if (pl.type === 'trap') {
      if (pl.landed && pl.state === 'breaking' && clock - pl.landAt > 150 && pl.state !== 'gone') {
        pl.state = 'gone';
      }
      return;
    }
    if (pl.base) return;
    if (pl.state === 'stable') {
      const e = clock - pl.landAt;
      if (e > pl.stableMs) { pl.state = 'tilt'; pl.breakAt = clock; }
    } else if (pl.state === 'tilt') {
      const tp = (clock - pl.breakAt) / lerp(620, 320, diffAt(pl.y));
      pl.tilt = clamp(tp, 0, 1) * 0.5 * pl.tiltDir;
      if (tp >= 1) { pl.state = 'breaking'; pl.breakAt = clock; spawnShards(pl, false); }
    } else if (pl.state === 'breaking') {
      if (clock - pl.breakAt > 240) pl.state = 'gone';
    }
  }

  function spawnShards(pl: any, trap: boolean) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      debris.push({
        x: pl.x + rand(0, pl.w), y: pl.y + rand(-4, 10),
        vx: rand(-2.4, 2.4), vy: rand(-1, 2), r: rand(4, 11),
        rot: rand(0, 6.28), vr: rand(-0.2, 0.2), life: 1,
        gold: trap ? false : pl.gold, trap,
      });
    }
  }

  function update(dt: number) {
    clock += dt;
    const p = player;

    // horizontal
    const acc = 0.95, fric = 0.80;
    if (keys.left && !keys.right) { p.vx -= acc; p.facing = -1; }
    else if (keys.right && !keys.left) { p.vx += acc; p.facing = 1; }
    else p.vx *= fric;
    p.vx = clamp(p.vx, -CFG.runSpeed, CFG.runSpeed);
    if (Math.abs(p.vx) < 0.05) p.vx = 0;

    // si la plataforma bajo el jugador se inclina, lo empuja a deslizar
    if (p.onGround && p.plat && p.plat.state === 'tilt') {
      p.vx += p.plat.tiltDir * 0.42;
      p.vx = clamp(p.vx, -CFG.runSpeed * 1.4, CFG.runSpeed * 1.4);
    }
    p.x += p.vx;

    // muros laterales de la torre
    const wall = 44;
    if (p.x < wall + p.w * 0.5) { p.x = wall + p.w * 0.5; if (p.vx < 0) p.vx = 0; }
    if (p.x > W - wall - p.w * 0.5) { p.x = W - wall - p.w * 0.5; if (p.vx > 0) p.vx = 0; }

    // salto (coyote + buffer)
    if (p.onGround) p.coyote = 8; else p.coyote = Math.max(0, p.coyote - 1);
    p.jumpBuf = Math.max(0, p.jumpBuf - 1);
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = -CFG.jump; p.onGround = false; p.coyote = 0; p.jumpBuf = 0; p.plat = null;
    }
    // gravedad + salto variable
    p.vy += CFG.gravity;
    if (!keys.jump && p.vy < 0) p.vy += CFG.gravity * 0.55;
    p.vy = Math.min(p.vy, 21);
    p.y += p.vy;

    // colisión: sólo al caer, aterrizando sobre el tope
    const prevFeet = p.y - p.vy;
    p.onGround = false;
    for (const pl of platforms) {
      if (!isSolid(pl)) continue;
      if (p.x + 15 < pl.x || p.x - 15 > pl.x + pl.w) continue;
      if (p.vy >= 0 && prevFeet <= pl.y + 13 && p.y >= pl.y) {
        p.y = pl.y; p.vy = 0; p.onGround = true; landOn(pl);
      }
    }
    if (!p.onGround && p.plat && !isSolid(p.plat)) p.plat = null;

    // actualizar plataformas
    for (const pl of platforms) updatePlatform(pl);

    // récord de altura
    if (p.y < bestY) bestY = p.y;

    // cámara: sigue al jugador suavemente arriba y abajo, pero con un "piso":
    // nunca cae más de media pantalla por debajo del punto más alto alcanzado,
    // así un rebote no mata, pero una caída larga al vacío sí.
    const target = p.y - H * 0.58;
    camY += (target - camY) * 0.11;
    if (camY < camMin) camMin = camY;
    const floor = camMin + H * 0.52;
    if (camY > floor) camY = floor;

    ensureWorld();
    updateDebris();

    // muerte: caer por debajo de la vista
    if (p.y - camY > H + 90) { endRun('fall'); return; }

    updateAnim(dt);
    cb.onHud?.(hud());
  }

  function updateDebris() {
    for (const d of debris) {
      d.vy += 0.5; d.x += d.vx; d.y += d.vy; d.rot += d.vr; d.life -= 0.02;
    }
    debris = debris.filter(d => d.life > 0 && d.y - camY < H + 120);
  }

  function updateAnim(dt: number) {
    const p = player;
    if (!p.onGround) { p.sprite = p.vy < 0 ? 'walkB' : 'walkA'; return; }
    if (Math.abs(p.vx) > 0.4) {
      p.animT += dt * (0.6 + Math.abs(p.vx) / CFG.runSpeed * 0.9);
      if (p.animT > 120) { p.animT = 0; p.frame ^= 1; }
      p.sprite = p.frame ? 'walkB' : 'walkA';
    } else p.sprite = 'idle';
  }

  // ---------- render ----------
  function sy(y: number) { return y - camY; }

  function draw() {
    drawBackground();
    for (const pl of platforms) drawPlatform(pl);
    drawDebris();
    drawPlayer();
    drawSpores();
    drawVignette();
    drawHeightRibbon();
  }

  function drawBackground() {
    // cielo: verde-teal profundo con resplandor dorado abajo y nebulosa arriba
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#06140f');
    g.addColorStop(0.45, '#0a1d17');
    g.addColorStop(0.8, '#0c241b');
    g.addColorStop(1, '#0e2a1d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // nebulosa dorada (parallax muy lento, arriba)
    const nb = ((-camY * 0.04) % 900 + 900) % 900;
    const ng = ctx.createRadialGradient(W * 0.74, 120 - nb * 0.2, 40, W * 0.74, 120 - nb * 0.2, 460);
    ng.addColorStop(0, 'rgba(230,180,70,0.16)');
    ng.addColorStop(1, 'rgba(230,180,70,0)');
    ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);

    // estrellas / partículas lejanas
    ctx.save();
    const starOff = ((-camY * 0.12) % H + H) % H;
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % W;
      const syy = ((i * 89.3) % H + starOff) % H;
      ctx.globalAlpha = 0.18 + (i % 5) * 0.06;
      ctx.fillStyle = i % 4 ? '#bfe9c8' : '#f0d68a';
      ctx.fillRect(sx, syy, 1.6, 1.6);
    }
    ctx.restore();

    drawTowerLayer(towersFar, 0.22, '#0f2a20', '#143d2b', 360);
    // chorros de energía dorada (parallax medio)
    drawEnergyStreams();
    drawTowerLayer(towersNear, 0.5, '#0c241b', '#10342440', 520);
  }

  function drawTowerLayer(towers: any[], par: number, body: string, edge: string, span: number) {
    const off = ((camY * par) % span + span) % span;
    ctx.save();
    for (const t of towers) {
      // repetir en vertical
      for (let k = -1; k <= 1; k++) {
        const baseY = (t.t * span + off) % span + k * span + 60;
        const x = t.x, w = t.w, h = t.h;
        const top = baseY - h;
        const grad = ctx.createLinearGradient(0, top, 0, baseY);
        grad.addColorStop(0, body);
        grad.addColorStop(1, '#06120d');
        ctx.fillStyle = grad;
        ctx.fillRect(x - w / 2, top, w, h);
        // aguja
        ctx.beginPath();
        ctx.moveTo(x - w * 0.18, top); ctx.lineTo(x, top - h * 0.18); ctx.lineTo(x + w * 0.18, top);
        ctx.closePath(); ctx.fill();
        // ventanas bioluminiscentes
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = t.gold ? 'rgba(240,200,90,0.5)' : 'rgba(70,224,160,0.45)';
        for (let yy = top + 24; yy < baseY - 16; yy += 26) {
          for (let xx = x - w / 2 + 8; xx < x + w / 2 - 6; xx += 16) {
            if ((xx + yy) % 3 === 0) ctx.fillRect(xx, yy, 4, 7);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
    void edge;
    ctx.restore();
  }

  function drawEnergyStreams() {
    ctx.save();
    const off = ((camY * 0.34) % 520 + 520) % 520;
    for (let i = 0; i < 5; i++) {
      const x = (i * 281 + 90) % W;
      const grad = ctx.createLinearGradient(x, 0, x, H);
      grad.addColorStop(0, 'rgba(240,200,90,0)');
      grad.addColorStop(0.5, 'rgba(240,200,90,0.10)');
      grad.addColorStop(1, 'rgba(255,150,40,0.16)');
      ctx.fillStyle = grad;
      const ww = 10 + (i % 3) * 5;
      ctx.fillRect(x + Math.sin((off + i * 90) * 0.01) * 14, 0, ww, H);
    }
    ctx.restore();
  }

  function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPlatform(pl: any) {
    if (pl.state === 'gone') return;
    const x = pl.x, y = sy(pl.y), w = pl.w;
    const bob = pl.base ? 0 : Math.sin(clock * 0.002 + pl.bob) * 2.2;
    ctx.save();
    ctx.translate(x + w / 2, y + bob);
    if (pl.tilt) ctx.rotate(pl.tilt);
    ctx.translate(-(x + w / 2), -(y + bob));

    const left = x, top = y + bob;
    const trap = pl.type === 'trap';
    // estado de aviso (estable terminando o inclinándose)
    let warn = 0;
    if (!trap && !pl.base && pl.state === 'stable') {
      const frac = (clock - pl.landAt) / pl.stableMs;
      if (frac > 0.62) warn = (frac - 0.62) / 0.38;
    }
    if (!trap && pl.state === 'tilt') warn = 1;
    const breaking = pl.state === 'breaking';
    if (breaking) ctx.globalAlpha = 0.55;

    // color del borde luminoso
    let edge, edgeGlow;
    if (trap) { edge = '#c0466e'; edgeGlow = 'rgba(210,70,120,0.8)'; }
    else if (warn > 0) {
      // verde -> ámbar -> rojo (telegrafía clara, sin gris)
      const w2 = warn * warn;
      const r = lerp(120, 240, warn), gg = lerp(220, 70, w2), b = lerp(120, 40, warn);
      edge = `rgb(${r | 0},${gg | 0},${b | 0})`; edgeGlow = `rgba(${r | 0},${gg | 0},${b | 0},0.9)`;
    } else if (pl.gold) { edge = '#f0c84a'; edgeGlow = 'rgba(240,200,74,0.75)'; }
    else { edge = '#46e0a0'; edgeGlow = 'rgba(70,224,160,0.7)'; }

    // sacudida al inclinarse
    let shake = 0;
    if (warn > 0.55 && !trap) shake = Math.sin(clock * 0.05) * warn * 1.4;

    // cuerpo metálico
    const bodyH = 30;
    const bg = ctx.createLinearGradient(0, top, 0, top + bodyH);
    bg.addColorStop(0, trap ? '#241019' : '#16271f');
    bg.addColorStop(1, trap ? '#0c0709' : '#0a1610');
    ctx.fillStyle = bg;
    roundRectPath(left + shake, top, w, bodyH, 8);
    ctx.fill();

    // tope luminoso
    ctx.save();
    ctx.shadowColor = edgeGlow; ctx.shadowBlur = 14 + warn * 12;
    ctx.fillStyle = edge;
    roundRectPath(left + shake, top, w, 5, 3);
    ctx.fill();
    ctx.restore();

    // detalle: remaches / runas
    ctx.globalAlpha *= 1;
    if (trap) {
      // fracturas rojas
      ctx.strokeStyle = 'rgba(220,80,110,0.85)'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      const cxp = left + w / 2;
      ctx.moveTo(cxp - w * 0.3, top + 6); ctx.lineTo(cxp - 6, top + 20); ctx.lineTo(cxp + 8, top + 9); ctx.lineTo(cxp + w * 0.3, top + 22);
      ctx.stroke();
      // núcleo violeta inestable
      ctx.fillStyle = 'rgba(150,80,200,0.5)';
      for (let i = 0; i < 3; i++) ctx.fillRect(left + w * (0.25 + i * 0.25) - 2, top + 12, 4, 8);
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      for (let bx = left + 16; bx < left + w - 10; bx += 30) ctx.fillRect(bx + shake, top + 14, 2, 10);
      // gotas de cristal bajo el borde
      ctx.fillStyle = edge; ctx.globalAlpha = (breaking ? 0.4 : 0.55);
      for (let bx = left + 22; bx < left + w - 12; bx += 64) {
        ctx.beginPath(); ctx.moveTo(bx, top + bodyH - 2); ctx.lineTo(bx + 4, top + bodyH + 7); ctx.lineTo(bx + 8, top + bodyH - 2); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = breaking ? 0.55 : 1;
    }
    ctx.restore();
  }

  function drawDebris() {
    ctx.save();
    for (const d of debris) {
      ctx.globalAlpha = Math.max(0, d.life) * 0.9;
      ctx.translate(d.x, sy(d.y)); ctx.rotate(d.rot);
      ctx.fillStyle = d.trap ? '#a8456a' : (d.gold ? '#f0c84a' : '#46e0a0');
      ctx.shadowColor = d.trap ? 'rgba(210,70,120,0.7)' : (d.gold ? 'rgba(240,200,74,0.6)' : 'rgba(70,224,160,0.6)');
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(-d.r, d.r * 0.5); ctx.lineTo(0, -d.r); ctx.lineTo(d.r, d.r * 0.5); ctx.closePath(); ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    const img = sprites[p.sprite] || sprites.idle;
    if (!img) return;
    const dw = 126, dh = 126;
    const x = p.x, y = sy(p.y);
    ctx.save();
    ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y + 2, p.w * 0.62 * (p.onGround ? 1 : 0.7), 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // halo bioluminiscente suave
    ctx.save();
    const halo = ctx.createRadialGradient(x, y - dh * 0.4, 6, x, y - dh * 0.4, 78);
    halo.addColorStop(0, 'rgba(70,224,160,0.12)'); halo.addColorStop(1, 'rgba(70,224,160,0)');
    ctx.fillStyle = halo; ctx.fillRect(x - 80, y - dh, 160, dh + 20);
    ctx.restore();
    ctx.translate(x, y - dh + 22);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -dw / 2, 0, dw, dh);
    ctx.restore();
  }

  function drawSpores() {
    ctx.save();
    for (const s of spores) {
      s.y -= s.s * 0.5; s.x += Math.sin(s.y * 0.02) * 0.2;
      if (s.y < -6) { s.y = H + 6; s.x = rand(0, W); }
      ctx.globalAlpha = 0.12 + s.s * 0.22;
      ctx.fillStyle = s.gold ? '#f0d68a' : '#7fe9b4';
      ctx.shadowColor = s.gold ? 'rgba(240,200,90,0.7)' : 'rgba(70,224,160,0.7)';
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawVignette() {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // marcas de altura sutiles al costado derecho
  function drawHeightRibbon() {
    ctx.save();
    ctx.font = '600 12px Fredoka, sans-serif';
    ctx.textAlign = 'right';
    const step = 25; // metros por marca
    const botY = camY + H;
    let m = Math.ceil((START_Y - botY) / PX_PER_M / step) * step;
    if (m < 0) m = 0;
    for (let mm = m; ; mm += step) {
      const wy = START_Y - mm * PX_PER_M;
      const screenY = sy(wy);
      if (screenY < -20) break;
      if (screenY > H + 20 || mm <= 0) continue;
      ctx.strokeStyle = 'rgba(120,180,150,0.10)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(W - 96, screenY); ctx.lineTo(W - 30, screenY); ctx.stroke();
      ctx.fillStyle = 'rgba(150,210,180,0.35)';
      ctx.fillText(mm + ' m', W - 30, screenY - 4);
    }
    ctx.restore();
  }

  // ---------- loop ----------
  function frame(t: number) {
    raf = requestAnimationFrame(frame);
    if (!lastT) lastT = t;
    let dt = t - lastT; lastT = t;
    if (dt > 50) dt = 50;
    if (mode === 'playing') update(dt);
    draw();
  }

  // ---------- API pública ----------
  return {
    async mount(opts: TorresMountOpts) {
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
    setConfig(partial: Partial<TorresConfig>) { Object.assign(CFG, partial); },
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
