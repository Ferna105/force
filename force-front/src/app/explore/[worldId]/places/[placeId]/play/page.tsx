'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { usePlace, gamesService } from '@/api';
import type { GameStatus, GameClaimResponse, Place } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useToast } from '@/hooks/useToast';
import { mediaUrl, placeBannerFallback, fmt } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState } from '@/components/ui/states';
import DeoGame from './deo/DeoGame';
import GameHeader from './GameHeader';
import GameLoading, { LOADING_MS } from './GameLoading';
import { hhmmss } from './GameCooldownModal';

export default function PlayPage() {
  return (
    <ProtectedRoute>
      <PlayContent />
    </ProtectedRoute>
  );
}

// Despachador: trae el lugar + el estado del motor y elige el juego según
// `status.gameKey`. Cada juego es su propio componente; los que no tienen uno
// caen al `template` (animación + recompensa aleatoria).
function PlayContent() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const placeId = Number(params.placeId);
  const { data: place, loading, error } = usePlace(placeId);
  const { user } = useAuth();
  const { recordEvent } = useDiscovery();

  const [status, setStatus] = useState<GameStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // Al entrar registramos la jugada (habilita tareas de descubrimiento "jugar en…").
  useEffect(() => {
    if (user && placeId) recordEvent('play_place', { placeId });
  }, [user, placeId, recordEvent]);

  // Estado inicial del juego (qué juego corre + cooldown).
  useEffect(() => {
    let alive = true;
    gamesService.getStatus(placeId)
      .then((s) => { if (alive) setStatus(s); })
      .catch(() => { /* sin estado: caemos al template igual */ })
      .finally(() => { if (alive) setStatusLoading(false); });
    return () => { alive = false; };
  }, [placeId]);

  if (loading || statusLoading) return <><Topbar crumb="Jugar" /><div className="page"><Loading /></div></>;
  if (error || !place) return <><Topbar crumb="Jugar" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const a = place.attributes;
  const world = a.World?.data;
  const banner = mediaUrl(a.Banner, placeBannerFallback(a.Name));
  const crumb = (
    <>
      {world && <><Link href={`/explore/${world.id}`} style={{ color: 'var(--gold-soft)' }}>{world.attributes.Name}</Link> · </>}
      <Link href={`/explore/${worldId}/places/${placeId}`} style={{ color: 'var(--gold-soft)' }}>{a.Name}</Link> · <b>Jugar</b>
    </>
  );

  // Los Ojos de Deo — plataformero de descenso del mundo Deo.
  if (status?.gameKey === 'deo') {
    return (
      <>
        <Topbar crumb={crumb} />
        <div className="page game-page">
          <DeoGame placeId={placeId} worldId={worldId} initialStatus={status} name={a.Name} banner={banner} />
        </div>
      </>
    );
  }

  // Template por defecto (animación → reclamo → cooldown).
  return (
    <>
      <Topbar crumb={crumb} />
      <div className="page game-page">
        <TemplateGame place={place} worldId={worldId} placeId={placeId} status={status} />
      </div>
    </>
  );
}

// Juego de demostración por defecto: animación de 10s y recompensa aleatoria.
function TemplateGame({ place, worldId, placeId, status }: { place: Place; worldId: number; placeId: number; status: GameStatus | null }) {
  const { updateUser } = useAuth();
  const toast = useToast();

  const [animDone, setAnimDone] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claim, setClaim] = useState<GameClaimResponse | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState<number | null>(status && !status.canClaim ? status.secondsLeft : null);

  // La pantalla de carga genérica dura LOADING_MS; después se revela el botón / el cooldown.
  useEffect(() => {
    const t = setTimeout(() => setAnimDone(true), LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // Cuenta regresiva del enfriamiento (cuando todavía no se puede reclamar).
  useEffect(() => {
    if (cooldownSecs == null || cooldownSecs <= 0) return;
    const t = setInterval(() => {
      setCooldownSecs((s) => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSecs]);

  // Dispara el contrato de reclamo del motor: convierte puntos → monedas y acredita saldo.
  const doClaim = useCallback(async () => {
    setClaiming(true);
    try {
      // El template no envía puntaje; un juego real pasaría su score acá.
      const res = await gamesService.claim(placeId);
      setClaim(res);
      setCooldownSecs(res.secondsLeft);
      updateUser({ balance: res.balance });
      toast.show({
        tone: 'gold', icon: 'success', duration: 4000,
        message: <>¡Ganaste <b>F {fmt(res.reward)}</b>! Tu saldo: <b>F {fmt(res.balance)}</b>.</>,
      });
    } catch {
      // Posible carrera con el cooldown: refrescamos el estado real.
      try {
        const s = await gamesService.getStatus(placeId);
        setCooldownSecs(s.canClaim ? null : s.secondsLeft);
      } catch { /* noop */ }
      toast.show({ tone: 'danger', icon: 'warning', duration: 4000, message: 'No se pudo reclamar la recompensa.' });
    } finally {
      setClaiming(false);
    }
  }, [placeId, updateUser, toast]);

  const a = place.attributes;
  const banner = mediaUrl(a.Banner, placeBannerFallback(a.Name));
  const world = a.World?.data;
  const onCooldown = cooldownSecs != null && cooldownSecs > 0;

  // Encabezado genérico, siempre visible (también durante la carga).
  const header = (
    <GameHeader
      kicker={world ? `Mundo ${world.attributes.Name} · Juego` : 'Juego'}
      title={a.Name}
      description={a.Description}
    />
  );

  // Pantalla de carga genérica mientras "arranca" la partida.
  if (!animDone) return <>{header}<GameLoading name={a.Name} banner={banner} /></>;

  // Fase de reclamo: botón si se puede, o cuenta regresiva del cooldown.
  return (
    <>
      {header}
      <div className="play-stage panel">
      {banner && <img src={banner} alt={a.Name} />}
      <div className="scrim" />
      <div className="play-inner">
        {claim && <p className="play-reward">+ F {fmt(claim.reward)}</p>}
        {onCooldown ? (
          <>
            <p className="play-kicker">{claim ? 'Recompensa reclamada' : 'Ya jugaste hace poco'}</p>
            <p className="play-sub">Próxima recompensa disponible en</p>
            <p className="play-timer cinzel">{hhmmss(cooldownSecs!)}</p>
            <p className="play-sub" style={{ fontSize: 13, color: 'var(--mist-2)' }}>
              Solo se puede reclamar una vez cada {status?.cooldownHours ?? 6} horas (vale para todos los juegos).
            </p>
          </>
        ) : (
          <>
            {!claim && <h1 className="play-title cinzel">¡Tu recompensa está lista!</h1>}
            <p className="play-sub">Reclamá tus monedas (entre 0 y 100, según tu partida).</p>
            <button className="btn btn-primary btn-lg" disabled={claiming} onClick={doClaim}>
              {claiming ? 'Reclamando…' : '🏆 Reclamar recompensa'}
            </button>
          </>
        )}
        <Link className="btn btn-ghost" href={`/explore/${worldId}/places/${placeId}`}>Volver al lugar</Link>
      </div>
      </div>
    </>
  );
}
