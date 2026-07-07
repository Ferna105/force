'use client';

/**
 * Página interna de un evento: el avance del usuario. Muestra SOLO los pasos que
 * ya cumplió (los pendientes se descubren jugando en el mundo, no se listan) y,
 * al completar el evento, sus recompensas finales.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { eventsService } from '@/api';
import type { EventView, EventRewardsConfig } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';

function RewardsCard({ rewards }: { rewards: EventRewardsConfig }) {
  return (
    <div className="panel" style={{ padding: '24px 28px', marginTop: 18, border: '1px solid rgba(230,166,48,.35)' }}>
      <div className="kicker" style={{ color: 'var(--gold)' }}>✦ Recompensas obtenidas</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
        {!!rewards.coins && <span className="deo-chip" style={{ color: 'var(--gold-soft)', background: 'rgba(230,166,48,.12)', borderColor: 'rgba(230,166,48,.4)' }}>🪙 +{rewards.coins} monedas</span>}
        {(rewards.items ?? []).map((it, i) => (
          <span key={i} className="deo-chip" style={{ color: 'var(--gold-soft)', background: 'rgba(230,166,48,.12)', borderColor: 'rgba(230,166,48,.4)' }}>
            🗡 {it.name}{it.quantity && it.quantity > 1 ? ` ×${it.quantity}` : ''}
          </span>
        ))}
        {rewards.discoverWorld && <span className="deo-chip">🌑 Descubriste el mundo {rewards.discoverWorld}</span>}
      </div>
    </div>
  );
}

function EventDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const [ev, setEv] = useState<EventView | null | 'error'>(null);

  useEffect(() => {
    if (!user || !id) return;
    eventsService.getOne(id).then((e) => setEv(e ?? 'error')).catch(() => setEv('error'));
  }, [user, id]);

  if (ev === null) return <div className="page"><Loading /></div>;
  if (ev === 'error') return <div className="page"><ErrorState message="No se pudo cargar el evento." /></div>;

  const done = ev.steps.filter((s) => s.done);
  const completed = ev.status === 'completed';
  const pct = ev.total ? Math.round((done.length / ev.total) * 100) : 0;

  return (
    <div className="page">
      <div className="kicker">Evento{completed ? ' · completado' : ''}</div>
      <h1 className="h-page" style={{ margin: '8px 0 8px' }}>{ev.name}</h1>
      {ev.description && <p className="sub" style={{ maxWidth: 720 }}>{ev.description}</p>}

      {/* Avance */}
      <div className="panel" style={{ padding: '20px 24px', marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="sub">Tu avance</span>
          <b className="fred" style={{ color: 'var(--gold-soft)' }}>{done.length} de {ev.total} pasos</b>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'var(--ink-3)', overflow: 'hidden', marginTop: 12 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--deo),var(--gold))', borderRadius: 99, transition: 'width .4s' }} />
        </div>
      </div>

      {/* Recompensas: solo al completar */}
      {completed && ev.rewards && <RewardsCard rewards={ev.rewards} />}

      {/* Pasos ya cumplidos (los pendientes NO se muestran) */}
      <div className="kicker" style={{ marginTop: 26 }}>Lo que lograste</div>
      {done.length === 0 ? (
        <p className="sub" style={{ marginTop: 10, fontStyle: 'italic' }}>Todavía no completaste ningún paso. El misterio te espera en el mundo.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
          {done.map((s) => (
            <div key={s.key} className="panel" style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'var(--verdant)', flex: 'none' }}>✓</span>
              <span style={{ color: '#EFE3CE' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {!completed && (
        <p className="sub" style={{ marginTop: 16, fontStyle: 'italic' }}>El misterio continúa… seguí explorando el mundo para avanzar.</p>
      )}
    </div>
  );
}

export default function EventDetailPage() {
  return (
    <ProtectedRoute>
      <Topbar crumb="Eventos" />
      <EventDetail />
    </ProtectedRoute>
  );
}
