'use client';

/**
 * Tracker de eventos (PR2 — motor de eventos). Versión funcional mínima
 * (pre-diseño): lista los eventos activos con su progreso, checklist de pasos y
 * un botón para resolver el paso interactivo (flag) actual. El hub visual
 * definitivo lo diseña Claude Design (ver sección de diseño del plan).
 */

import { useCallback, useEffect, useState } from 'react';
import { eventsService } from '@/api';
import type { EventView } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import ProtectedRoute from '@/components/ProtectedRoute';
import Topbar from '@/components/shell/Topbar';
import { Loading } from '@/components/ui/states';

function EventCard({ ev, onChanged }: { ev: EventView; onChanged: (v: EventView) => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const current = ev.steps.find((s) => s.current) ?? null;

  const resolveCurrent = useCallback(async () => {
    if (!current || current.type !== 'flag') return;
    setBusy(true);
    try {
      const res = await eventsService.resolveStep(ev.eventId, current.key);
      onChanged(res.view);
      const r = res.rewardsGranted;
      if (r) {
        const parts: string[] = [];
        if (r.coins) parts.push(`+${r.coins} monedas`);
        if (r.items?.length) parts.push(`${r.items.length} objeto(s)`);
        if (r.discovery?.world) parts.push(`descubriste ${r.discovery.world.attributes.Name}`);
        show({ tone: 'verdant', icon: 'success', message: `¡Evento completado! ${parts.join(' · ')}`, duration: 6000 });
      }
    } catch {
      show({ tone: 'danger', icon: 'warning', message: 'No se pudo resolver el paso.', duration: 4000 });
    } finally {
      setBusy(false);
    }
  }, [current, ev.eventId, onChanged, show]);

  const doneCount = ev.steps.filter((s) => s.done).length;

  return (
    <section className="panel" style={{ padding: 24, marginBottom: 18 }}>
      <div className="kicker">Evento{ev.status === 'completed' ? ' · completado' : ''}</div>
      <h2 className="cinzel" style={{ fontSize: 28, color: '#F6ECD7', margin: '6px 0 8px' }}>{ev.name}</h2>
      {ev.description && <p className="sub" style={{ marginBottom: 14 }}>{ev.description}</p>}

      <div className="sub" style={{ marginBottom: 12 }}>Progreso: <b>{doneCount}/{ev.total}</b></div>

      <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'grid', gap: 8 }}>
        {ev.steps.map((s) => (
          <li key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: s.done ? 1 : s.current ? 1 : 0.55 }}>
            <span aria-hidden style={{ width: 20 }}>{s.done ? '✅' : s.current ? '▶️' : '⬜'}</span>
            <span style={{ color: s.current ? 'var(--gold-soft)' : undefined }}>{s.label ?? s.key}</span>
          </li>
        ))}
      </ol>

      {ev.status !== 'completed' && current && current.type === 'flag' && (
        <button className="btn btn-primary" disabled={busy} onClick={resolveCurrent}>
          {busy ? 'Procesando…' : `Marcar: ${current.label ?? current.key}`}
        </button>
      )}
      {ev.status !== 'completed' && current && current.type !== 'flag' && (
        <div className="sub" style={{ fontStyle: 'italic' }}>
          Este paso se completa jugando: {current.label ?? current.key}
        </div>
      )}
    </section>
  );
}

function EventsBody() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventView[] | null>(null);

  useEffect(() => {
    if (!user) return;
    eventsService.getActive().then(setEvents).catch(() => setEvents([]));
  }, [user]);

  const onChanged = (v: EventView) =>
    setEvents((prev) => (prev ?? []).map((e) => (e.eventId === v.eventId ? v : e)));

  return (
    <div className="page">
      <div className="kicker">El universo Force</div>
      <h1 className="h-page" style={{ margin: '8px 0 8px' }}>Eventos</h1>
      <p className="sub">Aventuras por etapas con recompensas al completarlas.</p>

      {events === null && <Loading />}
      {events !== null && events.length === 0 && (
        <section className="panel" style={{ padding: 24 }}>
          <p className="sub" style={{ margin: 0 }}>No hay eventos activos en este momento.</p>
        </section>
      )}
      {events?.map((ev) => <EventCard key={ev.eventId} ev={ev} onChanged={onChanged} />)}
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
