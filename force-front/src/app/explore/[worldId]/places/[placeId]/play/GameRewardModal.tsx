'use client';

import Link from 'next/link';
import { fmt } from '@/lib/design';

// Modal de resultado GENÉRICO: se muestra al reclamar la recompensa de cualquier
// juego. Acá (y sólo acá) se revelan las monedas ganadas. No tiene textos
// propios de ningún juego — sirve igual para todos.
//
// Se monta dentro de un contenedor `position:relative` (p. ej. el `.stage` del
// juego); cubre su área como overlay. Usa las clases genéricas `.overlay`/
// `.ov-card` de globals.css.
export default function GameRewardModal({
  reward,
  balance,
  onRetry,
  backHref,
}: {
  /** Monedas ganadas (0..100), tal como las devolvió el motor. */
  reward: number;
  /** Saldo total actualizado tras acreditar la recompensa. */
  balance: number;
  /** Volver a jugar (reinicia la partida del juego). */
  onRetry: () => void;
  /** Link de "Volver al lugar" (a la página del place). */
  backHref: string;
}) {
  return (
    <div className="overlay show">
      <div className="ov-card">
        <div className="eyebrow" style={{ color: '#8ed085' }}>Recompensa</div>
        <h2>¡Recompensa reclamada!</h2>
        <p>Aseguraste las monedas de esta partida. Ya están sumadas a tu saldo.</p>
        <div className="ov-reward">
          <span className="c">F</span>
          <div className="amt">+{fmt(reward)}<small>Monedas ganadas</small></div>
        </div>
        <div className="ov-meta">
          <div><div className="n">F {fmt(balance)}</div><div className="l">Saldo total</div></div>
        </div>
        <div className="ov-actions">
          <button className="btn btn-primary btn-lg" onClick={onRetry}>↻ Jugar otra vez</button>
          <Link className="btn btn-secondary btn-lg" href={backHref}>Volver al lugar</Link>
        </div>
      </div>
    </div>
  );
}
