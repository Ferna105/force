'use client';

/**
 * Acceso a un evento de questline para las escenas de lugar. Trae el evento
 * activo + el progreso del usuario y expone helpers para leer/avanzar pasos.
 *
 * Genérico (no atado a un evento puntual): `useQuestEvent()` resuelve el evento
 * activo (el primero, si hay uno solo) y `useQuestEvent(nombre)` uno específico.
 * Así una escena de lugar reutilizable (Biblioteca, Telescopio) sirve a cualquier
 * evento; una escena narrativa puede pedir su evento por nombre.
 *
 *  - `resolveStep(key, payload?)` — resuelve un paso interactivo (flag/answer/telescope).
 *  - `recordEvent(type, opts)` — registra un evento pasivo (p. ej. read_book) y refresca.
 *  - helpers `stepDone`, `isCurrent`, `flag`, `reachedIndex`.
 * Sin evento activo (o sin sesión) `event` es null y la escena muestra su estado base.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventsService, discoveryService } from '@/api';
import type { EventView, EventStepResponse, DiscoveryEventType } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';

export function useQuestEvent(eventName?: string) {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventView | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setEvent(null); setLoading(false); return; }
    try {
      const events = await eventsService.getActive();
      const chosen = eventName ? events.find((e) => e.name === eventName) : events[0];
      setEvent(chosen ?? null);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [user, eventName]);

  useEffect(() => { refresh(); }, [refresh]);

  // Resuelve un paso interactivo y actualiza el evento con la vista devuelta.
  const resolveStep = useCallback(
    async (key: string, payload?: Record<string, unknown>): Promise<EventStepResponse | null> => {
      if (!event) return null;
      const res = await eventsService.resolveStep(event.eventId, key, payload);
      setEvent(res.view);
      return res;
    },
    [event]
  );

  // Registra un evento pasivo (read_book, visit_place…) y refresca el progreso.
  const recordEvent = useCallback(
    async (type: DiscoveryEventType, opts?: { placeId?: number; itemId?: number; bookId?: string }) => {
      const res = await discoveryService.recordEvent({ type, ...opts });
      await refresh();
      return res;
    },
    [refresh]
  );

  const steps = useMemo(() => event?.steps ?? [], [event]);
  const stepDone = useCallback((key: string) => steps.find((s) => s.key === key)?.done ?? false, [steps]);
  const isCurrent = useCallback((key: string) => steps.find((s) => s.key === key)?.current ?? false, [steps]);
  const flag = useCallback((name: string) => !!event?.state?.[name], [event]);
  // ¿El usuario ya llegó (o pasó) el paso `key`? (índice ≤ currentStep)
  const reachedIndex = useCallback(
    (key: string) => {
      const idx = steps.findIndex((s) => s.key === key);
      return idx >= 0 && idx <= (event?.currentStep ?? -1);
    },
    [steps, event]
  );

  return { event, loading, refresh, resolveStep, recordEvent, stepDone, isCurrent, flag, reachedIndex };
}
