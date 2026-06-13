'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { gamesService } from '@/api';
import type { GameStatus, GameClaimResponse } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fmt } from '@/lib/design';
import GameHeader from '../GameHeader';
import GameLoading, { LOADING_MS } from '../GameLoading';
import GameRewardModal from '../GameRewardModal';
import GameCooldownModal from '../GameCooldownModal';
import { createTorresGame, type TorresCause, type TorresGameInstance, type TorresHud, type TorresState } from './engine';

// Fases de la pantalla. El motor del canvas vive aparte; estas controlan
// los overlays (telón inicial, muerte, recompensa, enfriamiento). La muerte es
// específica del juego; recompensa y enfriamiento usan los modales genéricos.
type Phase = 'ready' | 'playing' | 'death' | 'reward' | 'cooldown';

const LS_RECORD = 'force_torres_record';

export default function TorresGame({
  placeId,
  worldId,
  initialStatus,
  name,
  banner,
}: {
  placeId: number;
  worldId: number;
  initialStatus: GameStatus | null;
  name: string;
  banner?: string | null;
}) {
  const { updateUser } = useAuth();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<TorresGameInstance | null>(null);

  // Pantalla de carga genérica (5s) antes de mostrar el juego.
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('ready');
  const [height, setHeight] = useState(0);               // HUD: altura actual
  const [record, setRecord] = useState(0);               // récord local (cosmético)
  const [death, setDeath] = useState<{ cause: TorresCause; height: number }>({ cause: null, height: 0 });
  const [reward, setReward] = useState<GameClaimResponse | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<number>(initialStatus && !initialStatus.canClaim ? initialStatus.secondsLeft : 0);
  const [claiming, setClaiming] = useState(false);

  // El cooldown vive en el server (por juego, 6 h). Lo cacheamos para la UX.
  const onCooldownRef = useRef<boolean>(!!initialStatus && !initialStatus.canClaim);

  // Récord local: sólo para el cartel "Tu récord", el saldo real viene del backend.
  useEffect(() => {
    const r = Number(localStorage.getItem(LS_RECORD) || 0);
    if (r > 0) setRecord(r);
  }, []);

  function bumpRecord(h: number) {
    setRecord((prev) => {
      if (h > prev) { localStorage.setItem(LS_RECORD, String(h)); return h; }
      return prev;
    });
  }

  // Asegura la recompensa: convierte la altura en monedas en el server.
  // Las monedas se revelan recién acá (al reclamar), tal como pide el diseño.
  const secure = useCallback(async (h: number) => {
    if (claiming) return;
    // Ya reclamó este juego en las últimas 6 h: no llamamos al server, mostramos el cooldown.
    if (onCooldownRef.current) { setPhase('cooldown'); return; }
    setClaiming(true);
    try {
      const res = await gamesService.claim(placeId, h);
      setReward(res);
      updateUser({ balance: res.balance });
      onCooldownRef.current = !res.canClaim;
      setCooldownSecs(res.secondsLeft);
      setPhase('reward');
      toast.show({
        tone: 'gold', icon: 'success', duration: 4000,
        message: <>¡Aseguraste <b>F {fmt(res.reward)}</b>! Tu saldo: <b>F {fmt(res.balance)}</b>.</>,
      });
    } catch {
      // Posible carrera con el cooldown: refrescamos el estado real del server.
      try {
        const s = await gamesService.getStatus(placeId);
        onCooldownRef.current = !s.canClaim;
        setCooldownSecs(s.secondsLeft);
        setPhase(s.canClaim ? 'death' : 'cooldown');
      } catch {
        setPhase('death');
      }
      toast.show({ tone: 'danger', icon: 'warning', duration: 4000, message: 'No se pudo reclamar la recompensa.' });
    } finally {
      setClaiming(false);
    }
  }, [claiming, placeId, updateUser, toast]);

  // El motor dispara estado por callbacks; los puenteamos a las fases via ref
  // (para que el efecto de montaje no dependa del estado y corra una sola vez).
  const onStateRef = useRef<(s: TorresState, h?: TorresHud) => void>(() => {});
  onStateRef.current = (state, h) => {
    if (state === 'ready') setPhase('ready');
    else if (state === 'playing') setPhase('playing');
    else if (state === 'dead' && h) { bumpRecord(h.height); setDeath({ cause: h.cause, height: h.height }); setPhase('death'); }
    else if (state === 'reclaim' && h) { bumpRecord(h.height); secure(h.height); }
  };

  // Pantalla de carga: tras LOADING_MS revelamos el juego.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // Montaje del motor sobre el canvas, recién cuando termina la carga (el canvas
  // ya está en el DOM). El preload de sprites corre acá.
  useEffect(() => {
    if (loading) return;
    const game = createTorresGame();
    gameRef.current = game;
    game.mount({
      canvas: canvasRef.current!,
      spriteBase: '/game/',
      callbacks: {
        onState: (s, h) => onStateRef.current(s, h),
        onHud: (h) => setHeight(h.height),
      },
    });
    return () => { game.destroy(); gameRef.current = null; };
  }, [loading]);

  // ----- acciones de UI -----
  const backHref = `/explore/${worldId}/places/${placeId}`;
  const onStart = () => gameRef.current?.start();
  const onReclaimHud = () => { if (gameRef.current?.getMode() === 'playing') gameRef.current.reclaim(); };
  const onRetry = () => gameRef.current?.retry();

  // Encabezado genérico, siempre visible (también durante la carga).
  const header = (
    <GameHeader
      kicker="Cordillera de Koril · Juego de ascenso"
      title={name}
      description="Escalá las ciudades verticales que coronan la gran cordillera de Koril. Saltá entre plataformas bioluminiscentes que sólo aguantan unos instantes antes de inclinarse y quebrarse — cuanto más alto trepes, más monedas ganás. Esquivá las losas-trampa de cristal violeta: ceden al primer paso."
      stats={[{ n: `${fmt(record)} m`, l: 'Tu récord' }, { n: '+8 F', l: 'Por metro' }]}
    />
  );

  // Pantalla de carga genérica mientras "arranca" el juego.
  if (loading) return <div className="torres-game">{header}<GameLoading name={name} banner={banner} /></div>;

  return (
    <div className="torres-game">
      {header}

      <div className="stage" id="stage">
        <canvas ref={canvasRef} className="torres-canvas" />

        {/* HUD */}
        <div className="hud">
          <div className="hud-top">
            <div className="hud-left">
              <div className="hud-chip"><span className="lab">Altura</span><span className="val">{fmt(height)}<small>m</small></span></div>
            </div>
            <div className="hud-right">
              <button className="btn btn-primary btn-sm btn-reclaim" onClick={onReclaimHud} disabled={phase !== 'playing'}>Reclamar</button>
            </div>
          </div>
        </div>

        <div className="ctrl-hint" style={{ opacity: phase === 'playing' ? 1 : 0 }}>
          <span className="grp"><kbd>◀</kbd><kbd>▶</kbd> Mover</span>
          <span className="grp"><kbd>espacio</kbd> Saltar</span>
        </div>

        {/* READY */}
        <div className={`overlay${phase === 'ready' ? ' show' : ''}`}>
          <div className="ov-card">
            <svg className="ov-emblem" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="14.5" stroke="#46e0a0" strokeWidth="2" />
              <circle cx="20" cy="20" r="14.5" stroke="#f0c84a" strokeWidth="2" strokeDasharray="3 60" strokeLinecap="round" />
              <path d="M20 7l3 9 3-6 2 12-5-3-3 12-3-12-5 3 2-12 3 6z" fill="#46e0a0" />
              <circle cx="20" cy="20" r="3" fill="#f0c84a" />
            </svg>
            <div className="eyebrow">Cordillera de Koril</div>
            <h2>Torres de la Cordillera</h2>
            <p>
              Trepá lo más alto que te animes. Cada metro suma monedas. Las plataformas verdes y
              doradas se inclinan y rompen tras unos segundos — saltá antes de que cedan. Las losas
              de cristal <b style={{ color: '#d27a9c' }}>violeta</b> son trampas: se rompen al instante.
            </p>
            <div className="ov-keys">
              <div className="ov-key"><div className="keys"><kbd>◀</kbd><kbd>▶</kbd></div>Mover</div>
              <div className="ov-key"><div className="keys"><kbd>espacio</kbd></div>Saltar</div>
            </div>
            <div className="ov-actions">
              <button className="btn btn-primary btn-lg" onClick={onStart}>▲ Comenzar ascenso</button>
            </div>
          </div>
        </div>

        {/* MUERTE — específica del juego (altura/récord). */}
        <div className={`overlay${phase === 'death' ? ' show' : ''}`}>
          <div className="ov-card">
            <div className="eyebrow" style={{ color: '#f08a6a' }}>Fin del ascenso</div>
            <h2>Caíste de la torre</h2>
            <p>
              Una plataforma cedió bajo tus pies y el vacío de la cordillera hizo el resto.
              Reclamá lo que juntaste o volvé a intentarlo.
            </p>
            <div className="ov-meta">
              <div><div className="n">{fmt(death.height)} m</div><div className="l">Altura</div></div>
              <div><div className="n">{fmt(record)} m</div><div className="l">Tu récord</div></div>
            </div>
            <div className="ov-actions">
              <button className="btn btn-primary btn-lg" disabled={claiming} onClick={() => secure(death.height)}>
                {claiming ? 'Reclamando…' : 'Reclamar'}
              </button>
              <button className="btn btn-secondary btn-lg" onClick={onRetry}>↻ Escalar otra vez</button>
            </div>
          </div>
        </div>

        {/* RECOMPENSA / ENFRIAMIENTO — modales GENÉRICOS (compartidos por todos los juegos). */}
        {phase === 'reward' && reward && (
          <GameRewardModal reward={reward.reward} balance={reward.balance} onRetry={onRetry} backHref={backHref} />
        )}
        {phase === 'cooldown' && (
          <GameCooldownModal
            secondsLeft={cooldownSecs}
            cooldownHours={initialStatus?.cooldownHours ?? 6}
            onRetry={onRetry}
            backHref={backHref}
          />
        )}
      </div>
    </div>
  );
}
