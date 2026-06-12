'use client';

/* eslint-disable @next/next/no-img-element */

// Pantalla de carga GENÉRICA para cualquier juego de la plataforma. Se muestra
// durante `LOADING_MS` antes de iniciar la partida. El fondo es la imagen del
// juego (banner del place). Mismo orbe/animación para todos los juegos.
export const LOADING_MS = 5000;

export default function GameLoading({ name, banner }: { name: string; banner?: string | null }) {
  return (
    <div className="play-stage panel">
      {banner && <img src={banner} alt={name} />}
      <div className="scrim" />
      <div className="play-inner">
        <div className="play-orb-wrap">
          <div className="play-orb" />
          <span className="play-orb-core">🎮</span>
        </div>
        <p className="play-kicker">Iniciando partida</p>
        <h1 className="play-title cinzel">{name}</h1>
        <p className="play-sub">Preparando el juego…</p>
        <div className="play-charge"><i /></div>
      </div>
    </div>
  );
}
