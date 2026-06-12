'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { gamesService } from '@/api';
import type { GameStatus, GameClaimResponse } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { fmt } from '@/lib/design';
import { createDeoGame, type DeoCause, type DeoGameInstance, type DeoHud, type DeoState } from './engine';

// Fases de la pantalla. El motor del canvas vive aparte; estas controlan
// los overlays (telón inicial, muerte, recompensa, enfriamiento).
type Phase = 'ready' | 'playing' | 'death' | 'reward' | 'cooldown';

const LS_RECORD = 'force_deo_record';

// Segundos → h:mm:ss (o mm:ss si es < 1h).
function hhmmss(secs: number) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function DeoGame({
  placeId,
  worldId,
  initialStatus,
}: {
  placeId: number;
  worldId: number;
  initialStatus: GameStatus | null;
}) {
  const { updateUser } = useAuth();
  const toast = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<DeoGameInstance | null>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [depth, setDepth] = useState(0);                 // HUD: profundidad actual
  const [record, setRecord] = useState(0);               // récord local (cosmético)
  const [death, setDeath] = useState<{ cause: DeoCause; depth: number }>({ cause: null, depth: 0 });
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

  function bumpRecord(d: number) {
    setRecord((prev) => {
      if (d > prev) { localStorage.setItem(LS_RECORD, String(d)); return d; }
      return prev;
    });
  }

  // Asegura la recompensa: convierte la profundidad en monedas en el server.
  // Las monedas se revelan recién acá (al reclamar), tal como pide el diseño.
  const secure = useCallback(async (d: number) => {
    if (claiming) return;
    // Ya reclamó este juego en las últimas 6 h: no llamamos al server, mostramos el cooldown.
    if (onCooldownRef.current) { setPhase('cooldown'); return; }
    setClaiming(true);
    try {
      const res = await gamesService.claim(placeId, d);
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
  const onStateRef = useRef<(s: DeoState, h?: DeoHud) => void>(() => {});
  onStateRef.current = (state, h) => {
    if (state === 'ready') setPhase('ready');
    else if (state === 'playing') setPhase('playing');
    else if (state === 'dead' && h) { bumpRecord(h.depth); setDeath({ cause: h.cause, depth: h.depth }); setPhase('death'); }
    else if (state === 'reclaim' && h) { bumpRecord(h.depth); secure(h.depth); }
  };

  // Montaje único del motor sobre el canvas.
  useEffect(() => {
    const game = createDeoGame();
    gameRef.current = game;
    game.mount({
      canvas: canvasRef.current!,
      spriteBase: '/game/',
      callbacks: {
        onState: (s, h) => onStateRef.current(s, h),
        onHud: (h) => setDepth(h.depth),
      },
    });
    return () => { game.destroy(); gameRef.current = null; };
  }, []);

  // Cuenta regresiva del enfriamiento mientras está visible.
  useEffect(() => {
    if (phase !== 'cooldown' || cooldownSecs <= 0) return;
    const t = setInterval(() => setCooldownSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, cooldownSecs]);

  // ----- acciones de UI -----
  const onStart = () => gameRef.current?.start();
  const onReclaimHud = () => { if (gameRef.current?.getMode() === 'playing') gameRef.current.reclaim(); };
  const onRetry = () => gameRef.current?.retry();

  return (
    <div className="deo-game">
      <div className="game-head">
        <div>
          <div className="kicker">Mundo Deo · Juego de descenso</div>
          <h1 className="cinzel">Los Ojos de Deo</h1>
          <p className="sub">
            Descendé por los túneles colosales que se hunden hacia el núcleo de la luna. Los cristales
            oscuros laten al ritmo de la piedra — leé el latido, cruzá en el contratiempo y reclamá tus
            monedas antes de que el abismo te trague.
          </p>
        </div>
        <div className="gh-stats">
          <div className="gh-stat"><div className="n">{fmt(record)} m</div><div className="l">Tu récord</div></div>
          <div className="gh-stat"><div className="n">+10 F</div><div className="l">Por metro</div></div>
        </div>
      </div>

      <div className="stage" id="stage">
        <canvas ref={canvasRef} className="deo-canvas" />

        {/* HUD */}
        <div className="hud">
          <div className="hud-top">
            <div className="hud-left">
              <div className="hud-chip"><span className="lab">Profundidad</span><span className="val">{fmt(depth)}<small>m</small></span></div>
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
              <circle cx="20" cy="20" r="14.5" stroke="#E6A630" strokeWidth="2" />
              <circle cx="20" cy="20" r="14.5" stroke="#F4C969" strokeWidth="2" strokeDasharray="3 60" strokeLinecap="round" />
              <path d="M20 8.5l2.7 8.8 8.8 2.7-8.8 2.7L20 31.5l-2.7-8.8-8.8-2.7 8.8-2.7z" fill="#E6A630" />
              <circle cx="33.2" cy="12.4" r="2.6" fill="#56A24E" stroke="#0e1a0c" strokeWidth="1" />
            </svg>
            <div className="eyebrow">Mundo Deo</div>
            <h2>Los Ojos de Deo</h2>
            <p>
              Tres portales se hunden hacia el núcleo. Descendé tan profundo como te animes — cada metro
              suma monedas. Cuidado con los huecos y con los cristales cuando laten en{' '}
              <b style={{ color: '#c3bcff' }}>violeta</b>.
            </p>
            <div className="ov-keys">
              <div className="ov-key"><div className="keys"><kbd>◀</kbd><kbd>▶</kbd></div>Mover a Deo</div>
              <div className="ov-key"><div className="keys"><kbd>espacio</kbd></div>Saltar huecos</div>
            </div>
            <div className="ov-actions">
              <button className="btn btn-primary btn-lg" onClick={onStart}>▶ Comenzar descenso</button>
            </div>
          </div>
        </div>

        {/* MUERTE / RECOMPENSA / ENFRIAMIENTO */}
        <div className={`overlay${phase === 'death' || phase === 'reward' || phase === 'cooldown' ? ' show' : ''}`}>
          <div className="ov-card">
            {phase === 'death' && (
              <>
                <div className="eyebrow" style={{ color: '#f08a6a' }}>Fin del descenso</div>
                <h2>{death.cause === 'gap' ? 'Caíste al abismo' : 'Un cristal te alcanzó'}</h2>
                <p>
                  {death.cause === 'gap'
                    ? 'El vacío bajo los Ojos de Deo no perdona un salto mal calculado. Reclamá lo que juntaste o volvé a intentarlo.'
                    : 'El cristal pulsó justo cuando pasabas. Reclamá lo que juntaste o volvé a intentarlo.'}
                </p>
                <div className="ov-meta">
                  <div><div className="n">{fmt(death.depth)} m</div><div className="l">Profundidad</div></div>
                  <div><div className="n">{fmt(record)} m</div><div className="l">Tu récord</div></div>
                </div>
                <div className="ov-actions">
                  <button className="btn btn-primary btn-lg" disabled={claiming} onClick={() => secure(death.depth)}>
                    {claiming ? 'Reclamando…' : 'Reclamar'}
                  </button>
                  <button className="btn btn-secondary btn-lg" onClick={onRetry}>↻ Jugar otra vez</button>
                </div>
              </>
            )}

            {/* Modal final GENÉRICO (reutilizable por cualquier juego): recién acá
                se revelan las monedas ganadas, una vez que el jugador reclama. */}
            {phase === 'reward' && reward && (
              <>
                <div className="eyebrow" style={{ color: '#8ed085' }}>Recompensa</div>
                <h2>¡Recompensa reclamada!</h2>
                <p>Aseguraste las monedas de esta partida. Ya están sumadas a tu saldo.</p>
                <div className="ov-reward">
                  <span className="c">F</span>
                  <div className="amt">+{fmt(reward.reward)}<small>Monedas ganadas</small></div>
                </div>
                <div className="ov-meta">
                  <div><div className="n">F {fmt(reward.balance)}</div><div className="l">Saldo total</div></div>
                </div>
                <div className="ov-actions">
                  <button className="btn btn-primary btn-lg" onClick={onRetry}>↻ Jugar otra vez</button>
                  <Link className="btn btn-secondary btn-lg" href={`/explore/${worldId}/places/${placeId}`}>Volver al lugar</Link>
                </div>
              </>
            )}

            {phase === 'cooldown' && (
              <>
                <div className="eyebrow">Enfriamiento</div>
                <h2>Ya reclamaste hace poco</h2>
                <p>Sólo se puede reclamar una recompensa cada {initialStatus?.cooldownHours ?? 6} horas en este juego. Podés seguir jugando igual.</p>
                <div className="ov-reward" style={{ background: 'rgba(124,120,208,.1)', borderColor: 'rgba(124,120,208,.35)' }}>
                  <div className="amt" style={{ color: '#c3bcff' }}>{hhmmss(cooldownSecs)}<small>Próximo reclamo</small></div>
                </div>
                <div className="ov-actions">
                  <button className="btn btn-primary btn-lg" onClick={onRetry}>↻ Jugar otra vez</button>
                  <Link className="btn btn-secondary btn-lg" href={`/explore/${worldId}/places/${placeId}`}>Volver al lugar</Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
