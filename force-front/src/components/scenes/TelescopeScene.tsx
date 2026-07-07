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

// Posición fija del objetivo en el cielo (px desde el centro). El jugador debe
// arrastrar el cielo (ox,oy) hasta ≈ (-TX,-TY) para centrarlo.
const TX = 240, TY = -140, TOL = 26;
const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

export default function TelescopeScene({ place }: PlaceSceneProps) {
  const a = place.attributes;
  const { event, stepDone, reachedIndex, resolveStep } = useQuestEvent();
  const [hour, setHour] = useState<number | null>(null);
  const [ox, setOx] = useState(0);
  const [oy, setOy] = useState(0);
  const [grab, setGrab] = useState(false);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  useEffect(() => { setHour(new Date().getHours()); }, []);

  const done = stepDone('telescope');
  const active = reachedIndex('telescope') && !done;
  const isNight = hour != null && hour >= 21 && hour < 23;
  const coords = (event?.state?.coordinates as string) || null;
  const aligned = Math.hypot(TX + ox, TY + oy) < TOL;

  const onDown = (e: React.PointerEvent) => {
    if (!isNight || !active) return;
    drag.current = { sx: e.clientX, sy: e.clientY, ox, oy };
    setGrab(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOx(clamp(drag.current.ox + (e.clientX - drag.current.sx), 460));
    setOy(clamp(drag.current.oy + (e.clientY - drag.current.sy), 320));
  };
  const onUp = () => { drag.current = null; setGrab(false); };
  const autoFind = () => { setOx(-TX); setOy(-TY); };

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

      {done ? (
        <div className="npc-dialog no-tip">
          <div className="npc-name"><span className="badge" /> Coordenadas fijadas</div>
          <p className="npc-line">Anotá bien este rumbo. Sabrás dónde ingresarlo.</p>
          {coords && <div className="coords-read" style={{ marginTop: 12 }}>Coordenadas: <b>{coords}</b></div>}
        </div>
      ) : !active ? (
        <div className="npc-dialog no-tip">
          <p className="npc-line">El telescopio apunta al vacío. Todavía no es momento de buscar aquí.</p>
        </div>
      ) : (
        <>
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
                <div className="target" style={{ left: `calc(50% + ${TX + ox}px)`, top: `calc(50% + ${TY + oy}px)` }} />
                <div className={`reticle${aligned ? ' locked' : ''}`}>
                  <div className="ring" /><div className="ring in" />
                  <div className="cross h" /><div className="cross v" />
                </div>
                <div className="scope-hint">
                  {aligned ? 'Punto centrado — fijá las coordenadas' : 'Arrastrá para escanear el cielo · centrá el punto que titila'}
                </div>
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
            {isNight && <button className="btn btn-secondary" onClick={autoFind}>✧ Autoencontrar</button>}
            {isNight && (
              <button className="btn btn-primary" disabled={!aligned || busy} onClick={fijar}>
                {busy ? 'Fijando…' : 'Fijar coordenadas'}
              </button>
            )}
            {hour != null && <span className="npc-hint">Hora local: {String(hour).padStart(2, '0')}:00</span>}
          </div>
        </>
      )}
    </div>
  );
}
