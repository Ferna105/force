'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Segundos → h:mm:ss (o mm:ss si es < 1h). Reutilizable por cualquier juego.
export function hhmmss(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Modal de enfriamiento GENÉRICO: se muestra cuando el usuario intenta reclamar
// pero ya reclamó este juego dentro de las últimas `cooldownHours` horas. Lleva
// su propia cuenta regresiva (no requiere que el padre la maneje). Sin textos
// propios de ningún juego.
//
// Se monta dentro de un contenedor `position:relative` (el `.stage` del juego).
export default function GameCooldownModal({
  secondsLeft,
  cooldownHours,
  onRetry,
  backHref,
}: {
  /** Segundos iniciales hasta poder reclamar de nuevo (del status/claim del motor). */
  secondsLeft: number;
  /** Horas de enfriamiento del motor (para el texto). */
  cooldownHours: number;
  /** Volver a jugar (reinicia la partida del juego). */
  onRetry: () => void;
  /** Link de "Volver al lugar" (a la página del place). */
  backHref: string;
}) {
  const [secs, setSecs] = useState(secondsLeft);

  // Reinicia el contador si cambia el valor inicial (p. ej. tras refrescar el status).
  useEffect(() => { setSecs(secondsLeft); }, [secondsLeft]);

  // Cuenta regresiva propia del modal.
  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [secs]);

  return (
    <div className="overlay show">
      <div className="ov-card">
        <div className="eyebrow">Enfriamiento</div>
        <h2>Ya reclamaste hace poco</h2>
        <p>Sólo se puede reclamar una recompensa cada {cooldownHours} horas en este juego. Podés seguir jugando igual.</p>
        <div className="ov-reward cooldown">
          <div className="amt">{hhmmss(secs)}<small>Próximo reclamo</small></div>
        </div>
        <div className="ov-actions">
          <button className="btn btn-primary btn-lg" onClick={onRetry}>↻ Jugar otra vez</button>
          <Link className="btn btn-secondary btn-lg" href={backHref}>Volver al lugar</Link>
        </div>
      </div>
    </div>
  );
}
