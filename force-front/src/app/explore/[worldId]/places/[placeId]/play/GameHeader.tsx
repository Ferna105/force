'use client';

import type { ReactNode } from 'react';

// Encabezado GENÉRICO para cualquier juego de la plataforma. Se muestra siempre
// (también durante la pantalla de carga). El contenido viene por props: cada
// juego pasa su kicker/título/descripción y, opcionalmente, sus chips de stats.
export interface GameStat {
  n: ReactNode;   // valor (p. ej. "851 m", "+10 F")
  l: string;      // etiqueta (p. ej. "Tu récord")
}

export default function GameHeader({
  kicker,
  title,
  description,
  stats,
}: {
  kicker?: string;
  title: string;
  description?: string | null;
  stats?: GameStat[];
}) {
  return (
    <div className="game-head">
      <div>
        {kicker && <div className="kicker">{kicker}</div>}
        <h1 className="cinzel">{title}</h1>
        {description && <p className="sub">{description}</p>}
      </div>
      {stats && stats.length > 0 && (
        <div className="gh-stats">
          {stats.map((s, i) => (
            <div className="gh-stat" key={i}>
              <div className="n">{s.n}</div>
              <div className="l">{s.l}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
