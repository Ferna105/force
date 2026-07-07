'use client';

/**
 * Escena "Telescopio Ancestral" (Cima de la Cumbre Helada · Eryndor). LUGAR
 * reutilizable: minijuego de cielo nocturno. Arrastrá el cielo hasta centrar el
 * punto que titila bajo la retícula; al fijarlo revela las coordenadas. Solo
 * funciona de noche (21–23 h) — el gate horario lo valida el backend con la hora
 * local que envía la escena. Resuelve el paso `telescope`.
 */

import { useEffect, useRef, useState } from 'react';
import { useQuestEvent } from './useQuestEvent';
import type { PlaceSceneProps } from './types';

// Override de la hora del telescopio para desarrollo/pruebas (fuerza el gate de
// noche fuera del horario real). En `null` usa la hora local real (21–23 h).
const TEST_HOUR: number | null = null;

// Área navegable enorme: el cielo se panea hasta ±PAN_* px. El objetivo aparece
// en una posición aleatoria dentro de un rango amplio (hay que buscarlo de verdad).
const PAN_X = 2600, PAN_Y = 2200, TOL = 26;
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
const rand = (n: number) => Math.round((Math.random() * 2 - 1) * n);

export default function TelescopeScene({ place }: PlaceSceneProps) {
  const a = place.attributes;
  const { event, stepDone, reachedIndex, resolveStep } = useQuestEvent();
  const [hour, setHour] = useState<number | null>(null);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [grab, setGrab] = useState(false);
  const [busy, setBusy] = useState(false);
  // Posición del objetivo, aleatoria por montaje dentro del área navegable.
  const [target] = useState(() => ({ tx: rand(2000), ty: rand(1600) }));
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { setHour(TEST_HOUR ?? new Date().getHours()); }, []);

  const done = stepDone('telescope');
  const reached = reachedIndex('telescope');   // ya llegó al paso (o lo completó)
  const isNight = hour != null && hour >= 21 && hour < 23;

  // Navegación por teclado: las flechas panean el cielo en su dirección (mirar).
  // Sigue navegable incluso después de fijar (para volver a ver el punto marcado).
  useEffect(() => {
    if (!isNight || !reached) return;
    const STEP = 140;
    const onKey = (e: KeyboardEvent) => {
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft') dx = STEP;
      else if (e.key === 'ArrowRight') dx = -STEP;
      else if (e.key === 'ArrowUp') dy = STEP;
      else if (e.key === 'ArrowDown') dy = -STEP;
      else return;
      e.preventDefault();
      setOx((v) => clamp(v + dx, PAN_X));
      setOy((v) => clamp(v + dy, PAN_Y));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isNight, reached]);
  const coords = (event?.state?.coordinates as string) || null;
  const aligned = Math.hypot(target.tx + ox, target.ty + oy) < TOL;

  const onDown = (e: React.PointerEvent) => {
    if (!isNight || !reached) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox, oy };
    setGrab(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOx(clamp(drag.current.ox + (e.clientX - drag.current.sx), PAN_X));
    setOy(clamp(drag.current.oy + (e.clientY - drag.current.sy), PAN_Y));
  };
  const onUp = () => { drag.current = null; setGrab(false); };
  // Centra el cielo en el punto marcado (llevar el objetivo al centro del scope).
  const focusTarget = () => { setOx(clamp(-target.tx, PAN_X)); setOy(clamp(-target.ty, PAN_Y)); };

  const fijar = async () => {
    if (hour == null) return;
    setBusy(true);
    try { await resolveStep('telescope', { hour }); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 26 }}>
      <div className="panel" style={{ padding: '20px 26px', marginBottom: 18 }}>
        <div className="kicker">Telescopio Ancestral</div>
        <p style={{ color: '#EFE3CE', fontSize: 16, margin: '10px 0 0', lineHeight: 1.6 }}>{a.Description}</p>
      </div>

      {!reached ? (
        <div className="npc-dialog no-tip">
          <p className="npc-line">El telescopio apunta al vacío. Todavía no es momento de buscar aquí.</p>
        </div>
      ) : (
        <>
          {done && (
            <div className="npc-dialog no-tip" style={{ marginBottom: 14 }}>
              <div className="npc-name"><span className="badge" /> Coordenadas fijadas</div>
              {coords && (
                <div style={{ marginTop: 12 }}>
                  <div
                    className="coords-read"
                    style={{ cursor: 'pointer' }}
                    onClick={focusTarget}
                    title="Tocar para enfocar el punto en el telescopio"
                  >
                    Coordenadas: <b>{coords}</b> <span style={{ opacity: 0.55, fontWeight: 400 }}>· ◎ enfocar</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div
            className={`scope${grab ? ' grab' : ''}`}
            data-mode={isNight ? 'night' : 'day'}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            <div className="sky-layer" style={isNight ? { transform: `translate(${ox}px, ${oy}px)` } : undefined} />
            {isNight ? (
              <>
                <div
                  className={`target${done ? ' found' : ''}`}
                  style={{ left: `calc(50% + ${target.tx + ox}px)`, top: `calc(50% + ${target.ty + oy}px)` }}
                />
                {done && coords && (
                  <div className="coord-tag" style={{ left: `calc(50% + ${target.tx + ox}px)`, top: `calc(50% + ${target.ty + oy}px)` }}>
                    ✧ {coords}
                  </div>
                )}
                {/* La mira del telescopio se ve siempre en el cielo interactivo. */}
                <div className={`reticle${aligned ? ' locked' : ''}`}>
                  <div className="ring" /><div className="ring in" />
                  <div className="cross h" /><div className="cross v" />
                </div>
                {!done && (
                  <div className="scope-hint">
                    {aligned ? 'Punto centrado — fijá las coordenadas' : 'Arrastrá o usá las flechas para escanear el cielo'}
                  </div>
                )}
              </>
            ) : (
              <div className="lock-ov">
                <div className="lock-card">
                  <div className="sun" />
                  <h2>No es un buen momento para mirar al cielo</h2>
                  <p>El sol borra las estrellas. El punto que buscás solo aparece cuando cae la noche.</p>
                  <div className="win">Volvé entre las 21:00 y las 23:00</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {isNight && !done && (
              <button className="btn btn-primary" disabled={!aligned || busy} onClick={fijar}>
                {busy ? 'Fijando…' : 'Fijar coordenadas'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
