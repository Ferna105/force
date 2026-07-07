'use client';

/**
 * Lista de eventos del usuario. Solo un resumen (nombre + avance) que linkea a la
 * página interna de cada evento (`/events/[id]`), donde se ve el detalle del
 * progreso y las recompensas. No revela los pasos pendientes.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { eventsService } from '@/api';
import type { EventView } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import Topbar from '@/components/shell/Topbar';
import { Loading } from '@/components/ui/states';

function EventsBody() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventView[] | null>(null);

  useEffect(() => {
    if (!user) return;
    eventsService.getActive().then(setEvents).catch(() => setEvents([]));
  }, [user]);

  return (
    <div className="page">
      <div className="kicker">El universo Force</div>
      <h1 className="h-page" style={{ margin: '8px 0 8px' }}>Eventos</h1>
      <p className="sub">Tus aventuras por etapas. Entrá a cada una para ver tu avance y tus recompensas.</p>

      {events === null && <Loading />}
      {events !== null && events.length === 0 && (
        <div className="panel" style={{ padding: 24, marginTop: 18 }}>
          <p className="sub" style={{ margin: 0 }}>No hay eventos activos en este momento.</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        {events?.map((ev) => {
          const done = ev.steps.filter((s) => s.done).length;
          const pct = ev.total ? Math.round((done / ev.total) * 100) : 0;
          const completed = ev.status === 'completed';
          return (
            <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="panel" style={{ padding: '22px 26px', display: 'block', textDecoration: 'none' }}>
              <div className="kicker">Evento{completed ? ' · completado' : ''}</div>
              <h2 className="cinzel" style={{ fontSize: 24, color: '#F6ECD7', margin: '6px 0 6px' }}>{ev.name}</h2>
              {ev.description && <p className="sub" style={{ margin: '0 0 12px' }}>{ev.description}</p>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b className="fred" style={{ color: 'var(--gold-soft)' }}>{done} de {ev.total} pasos</b>
                <span className="fred" style={{ color: 'var(--gold-soft)' }}>Ver avance →</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--ink-3)', overflow: 'hidden', marginTop: 12 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,var(--deo),var(--gold))', borderRadius: 99 }} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function EventsPage() {
  return (
    <ProtectedRoute>
      <Topbar crumb="Eventos" />
      <EventsBody />
    </ProtectedRoute>
  );
}
