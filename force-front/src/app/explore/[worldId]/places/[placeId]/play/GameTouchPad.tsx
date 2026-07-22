'use client';

import { useCallback, useEffect, useRef } from 'react';

export type PadAction = 'left' | 'right' | 'jump';

// Pad de controles táctiles GENÉRICO: izquierda / derecha / salto. Sin textos ni
// arte propios de ningún juego — cualquier plataformero lo reusa cableándolo a
// `engine.setInput`. En escritorio no se muestra (ver `.game-pad` en globals.css,
// visible sólo con puntero grueso), así que el teclado sigue siendo el control
// natural ahí.
//
// Se monta dentro de un contenedor `position:relative` (el `.stage` del juego).
//
// Usa Pointer Events (no touch): un único camino cubre dedo, stylus y mouse.
// `setPointerCapture` garantiza recibir el `pointerup` aunque el dedo se
// desplace fuera del botón — sin eso el personaje se queda corriendo.
export default function GameTouchPad({
  onInput,
  onRelease,
}: {
  /** Se dispara al presionar (down=true) y al soltar (down=false). */
  onInput: (action: PadAction, down: boolean) => void;
  /** Suelta todas las acciones (al desmontar o si el gesto se cancela). */
  onRelease?: () => void;
}) {
  // Guardamos los callbacks en refs para que el cleanup de desmontaje no
  // dependa de su identidad y no se re-ejecute en cada render del juego.
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;

  useEffect(() => () => { releaseRef.current?.(); }, []);

  const bind = useCallback((action: PadAction) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      onInput(action, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      onInput(action, false);
    },
    onPointerCancel: () => onInput(action, false),
    // Red de seguridad: si el navegador no entregó el capture, soltar al salir.
    onLostPointerCapture: () => onInput(action, false),
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }), [onInput]);

  return (
    <div className="game-pad" aria-hidden={false}>
      <div className="game-pad-side">
        <button type="button" className="pad-btn" aria-label="Mover a la izquierda" {...bind('left')}>
          <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <button type="button" className="pad-btn" aria-label="Mover a la derecha" {...bind('right')}>
          <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <button type="button" className="pad-btn pad-jump" aria-label="Saltar" {...bind('jump')}>
        <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
      </button>
    </div>
  );
}
