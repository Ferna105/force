/* ============================================================
   FORCE — El idioma de Deo (motor de glyphs, reutilizable)
   ------------------------------------------------------------
   Cifrado determinista 1:1 español → glyphs. Un glyph por letra
   (a–z + ñ). "Runas lunares": un eje vertical + una marca (anillo /
   creciente / rama / punto). Todo se dibuja inline como SVG (sin
   webfonts, apto para CSP). Portado del handoff de diseño
   (deo/deo-glyph.js) a un módulo TS puro (sin DOM ni window).

   Uso en React: <DeoText> (components/ui/DeoText.tsx) consume
   `renderDeo(text)` y aplica el "reveal" a español.
   ============================================================ */

// Orden canónico del alfabeto de Deo.
export const DEO_ALPHA = 'abcdefghijklmnñopqrstuvwxyz'.split('');

// ---- primitivas (fragmentos SVG; trazo = currentColor) ----
const spine = (y1: number, y2: number) => `<line x1="30" y1="${y1}" x2="30" y2="${y2}"/>`;
const ring = (y: number, r = 9) => `<circle cx="30" cy="${y}" r="${r}"/>`;
const ringOff = (x: number, y: number, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const dot = (y: number, r = 4.4) => `<circle class="df" cx="30" cy="${y}" r="${r}"/>`;
const dotOff = (x: number, y: number, r = 3) => `<circle class="df" cx="${x}" cy="${y}" r="${r}"/>`;
const arcR = (y: number, r = 9) => `<path d="M30 ${y - r} A ${r} ${r} 0 0 1 30 ${y + r}"/>`; // )
const arcL = (y: number, r = 9) => `<path d="M30 ${y - r} A ${r} ${r} 0 0 0 30 ${y + r}"/>`; // (
const cupU = (y: number, r = 11) => `<path d="M${30 - r} ${y} A ${r} ${r} 0 0 0 ${30 + r} ${y}"/>`; // ‿
const armL = (y: number) => `<line x1="30" y1="${y}" x2="12" y2="${y}"/>`;
const bar = (y: number) => `<line x1="14" y1="${y}" x2="46" y2="${y}"/>`;
const brU = (y: number) => `<line x1="30" y1="${y}" x2="46" y2="${y - 15}"/>`;
const brUl = (y: number) => `<line x1="30" y1="${y}" x2="14" y2="${y - 15}"/>`;
const brD = (y: number) => `<line x1="30" y1="${y}" x2="46" y2="${y + 15}"/>`;
const brDl = (y: number) => `<line x1="30" y1="${y}" x2="14" y2="${y + 15}"/>`;
const forkU = (y: number) => brUl(y) + brU(y);
const forkD = (y: number) => brDl(y) + brD(y);

const T = 21, M = 43, B = 65;

// Tabla de glyphs: letra → fragmentos SVG. Todas comparten familia (eje + marca).
const G: Record<string, string[]> = {
  a: [spine(11, 73), ring(M)],
  b: [spine(11, 73), ring(T, 8)],
  c: [spine(11, 73), arcR(M)],
  d: [spine(11, 73), ring(B, 8)],
  e: [spine(11, 73), bar(M)],
  f: [spine(11, 73), forkU(T + 3)],
  g: [spine(11, 73), arcL(B)],
  h: [spine(11, 73), ring(T, 7), ring(B, 7)],
  i: [spine(11, 73), dot(6)],
  j: [spine(11, 73), arcR(B)],
  k: [spine(11, 73), brU(M), brD(M)],
  l: [spine(11, 73), armL(B)],
  m: [spine(11, 73), ring(M), dotOff(11, M), dotOff(49, M)],
  n: [spine(11, 73), brD(T)],
  ñ: [spine(11, 73), brD(T), dot(6, 3)],
  o: [ringOff(30, M, 14)],
  p: [spine(11, 73), arcR(T)],
  q: [spine(11, 73), ring(T, 8), dotOff(46, B, 3)],
  r: [spine(11, 73), brU(T + 2)],
  s: [spine(21, 65), arcL(30, 8), arcR(52, 8)],
  t: [spine(11, 73), bar(T)],
  u: [spine(11, 73), cupU(B, 10)],
  v: [spine(11, 73), forkD(43)],
  w: [spine(11, 73), forkD(29), forkD(59)],
  x: [spine(11, 73), brUl(43), brD(43)],
  y: [spine(43, 73), forkU(M)],
  z: [spine(21, 65), bar(T), bar(B)],
};

const svgWrap = (inner: string) =>
  `<svg class="deo-svg" viewBox="0 0 60 84" fill="none" stroke="currentColor" ` +
  `stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

// Quita tildes/diéresis para el lookup (á→a, ü→u) pero conserva la ñ.
function base(ch: string): string {
  const low = ch.toLowerCase();
  if (low === 'ñ') return 'ñ';
  return low.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function isDeoLetter(ch: string): boolean {
  return Object.prototype.hasOwnProperty.call(G, base(ch));
}

export function glyphSVG(letter: string): string {
  const frags = G[base(letter || '')];
  if (!frags) return '';
  return svgWrap(frags.join(''));
}

const esc = (s: string) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

// Letras (en orden) que reciben glyph — las revelables, en mayúscula (como se
// muestran al revelarse). Espacios y puntuación no cuentan. `applyReveal` toma de
// este arreglo la letra a mostrar en cada posición.
export function deoLetters(text: string): string[] {
  const out: string[] = [];
  const t = String(text || '');
  for (let i = 0; i < t.length; i++) if (isDeoLetter(t[i])) out.push(t[i].toUpperCase());
  return out;
}

/**
 * Renderiza un texto al idioma de Deo como HTML (para dangerouslySetInnerHTML
 * dentro de un contenedor `.deo`). Cada letra lleva su glyph + un gemelo latino
 * **vacío**; los espacios/puntuación quedan neutros. El texto plano de las letras
 * NO se emite acá: lo escribe `applyReveal` recién al revelar cada letra, así el
 * mensaje cifrado no vive en el DOM antes de tiempo (no se puede copiar/inspeccionar
 * ni lo lee un lector de pantalla mientras siga en glyphs).
 */
export function renderDeo(text: string): string {
  const src = String(text == null ? '' : text);
  const out: string[] = [];
  let li = 0;
  let buf = '';
  const flushWord = () => {
    if (buf) { out.push(`<span class="deo-word">${buf}</span>`); buf = ''; }
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t') { flushWord(); out.push('<span class="deo-sp"> </span>'); continue; }
    if (ch === '\n') { flushWord(); out.push('<br>'); continue; }
    if (isDeoLetter(ch)) {
      // Gemelo latino vacío a propósito: applyReveal lo rellena al revelar.
      buf += `<span class="deo-ch" data-i="${li}"><span class="deo-g">${glyphSVG(ch)}</span>` +
        `<span class="deo-l"></span></span>`;
      li++;
    } else {
      buf += `<span class="deo-ch punct"><span class="deo-g">${esc(ch)}</span>` +
        `<span class="deo-l">${esc(ch)}</span></span>`;
    }
  }
  flushWord();
  return out.join('');
}

// Revela a español las primeras `n` letras dentro de un contenedor ya renderizado
// (client-side; se llama desde un efecto de React). Escribe la letra en el gemelo
// latino SOLO al revelarla —tomándola de `letters` (deoLetters(text))— y la borra
// si vuelve a ocultarse, para no dejar el texto plano en el DOM. La puntuación no
// cambia.
export function applyReveal(container: HTMLElement | null, n: number, letters: string[]): void {
  if (!container) return;
  container.querySelectorAll<HTMLElement>('.deo-ch').forEach((el) => {
    const idx = el.dataset.i;
    if (idx == null) return; // puntuación: sin cambio
    const i = Number(idx);
    const show = i < n;
    const lat = el.querySelector<HTMLElement>('.deo-l');
    if (lat) lat.textContent = show ? (letters[i] ?? '') : '';
    el.classList.toggle('is-latin', show);
  });
}

// Alfabeto para la lámina de referencia.
export const DEO_ALPHABET = DEO_ALPHA.map((letra) => ({ letra, svg: glyphSVG(letra) }));
