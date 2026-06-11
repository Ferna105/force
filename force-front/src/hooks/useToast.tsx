'use client';

/* Componente Toast del design system Force — anclado al borde inferior, con
   animación de deslizamiento hacia arriba. Variantes (tono + ícono): gold
   (confirmar), danger (destructivo), verdant (éxito), info. Soporta mensaje
   solo, mensaje + botón primario, o primario + secundario (flujos de
   confirmación), y un `duration` opcional para avisos efímeros que se cierran
   solos. API espejada de `Toast.show(...)` del design system. */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastTone = 'gold' | 'danger' | 'verdant' | 'info';
export type ToastIconName = 'question' | 'warning' | 'success' | 'info';
export type ToastButtonVariant = 'primary' | 'secondary' | 'danger' | 'verdant' | 'ghost';

interface ToastAction {
  label: string;
  onClick?: () => void;
  variant?: ToastButtonVariant;
}

export interface ToastOptions {
  tone?: ToastTone;
  icon?: ToastIconName | false;
  message: React.ReactNode;
  primary?: ToastAction;
  secondary?: ToastAction;
  // ms hasta el auto-cierre (avisos efímeros). Sin valor: persiste.
  duration?: number;
}

interface ToastContextType {
  show: (opts: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Tono → color del ícono y su píldora (bg/borde). Mismos valores del design system.
const TONES: Record<ToastTone, { c: string; bg: string; bd: string }> = {
  gold: { c: '#E6A630', bg: 'rgba(230,166,48,.14)', bd: 'rgba(230,166,48,.4)' },
  danger: { c: '#e0685b', bg: 'rgba(210,75,62,.15)', bd: 'rgba(210,75,62,.45)' },
  verdant: { c: '#6cc063', bg: 'rgba(86,162,78,.15)', bd: 'rgba(86,162,78,.45)' },
  info: { c: '#5aa1ea', bg: 'rgba(62,139,224,.15)', bd: 'rgba(62,139,224,.45)' },
};

// Glifos de cada ícono (trazo, 24×24) — copiados del design system.
function ToastGlyph({ name }: { name: ToastIconName }) {
  switch (name) {
    case 'question':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.2-2.7 3.9M12 17h.01" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="M12 3.2 21 19H3z" strokeLinejoin="round" />
          <path d="M12 10v4M12 16.5h.01" />
        </>
      );
    case 'success':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M8 12.4l2.6 2.6L16 9.6" />
        </>
      );
    case 'info':
      return (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 7.5h.01" />
        </>
      );
  }
}

interface ToastEntry extends ToastOptions {
  id: number;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="toast-host">
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (ctx === undefined) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return ctx;
}

function ToastItem({ entry, onClose }: { entry: ToastEntry; onClose: () => void }) {
  // enter → show (anima la entrada) → hide (anima la salida antes de desmontar).
  const [phase, setPhase] = useState<'enter' | 'show' | 'hide'>('enter');
  const tone = TONES[entry.tone ?? 'gold'];

  const close = useCallback(() => {
    setPhase('hide');
    window.setTimeout(onClose, 480); // espera a que termine la transición de salida
  }, [onClose]);

  // Doble rAF: garantiza que el navegador pinte el estado inicial (fuera de
  // pantalla) antes de aplicar `.show`, para que la transición se dispare.
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('show')));
    return () => cancelAnimationFrame(r);
  }, []);

  // Auto-cierre para avisos efímeros.
  useEffect(() => {
    if (!entry.duration) return;
    const t = window.setTimeout(close, entry.duration);
    return () => window.clearTimeout(t);
  }, [entry.duration, close]);

  const runAction = (action: ToastAction) => {
    action.onClick?.();
    close();
  };

  const cls = `toast${phase === 'show' ? ' show' : ''}${phase === 'hide' ? ' hide' : ''}`;

  return (
    <div
      className={cls}
      style={
        {
          '--tone': tone.c,
          '--tone-bg': tone.bg,
          '--tone-bd': tone.bd,
        } as React.CSSProperties
      }
    >
      {entry.icon !== false && (
        <div className="t-ic">
          <svg viewBox="0 0 24 24">
            <ToastGlyph name={entry.icon ?? 'question'} />
          </svg>
        </div>
      )}
      <div className="t-body">
        <div className="t-msg">{entry.message}</div>
      </div>
      {(entry.primary || entry.secondary) && (
        <div className="t-acts">
          {entry.secondary && (
            <button
              className={`btn btn-${entry.secondary.variant ?? 'secondary'} btn-sm`}
              onClick={() => runAction(entry.secondary!)}
            >
              {entry.secondary.label}
            </button>
          )}
          {entry.primary && (
            <button
              className={`btn btn-${entry.primary.variant ?? 'primary'} btn-sm`}
              onClick={() => runAction(entry.primary!)}
            >
              {entry.primary.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
