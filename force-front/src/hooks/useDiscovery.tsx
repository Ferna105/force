'use client';

/* eslint-disable @next/next/no-img-element */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { discoveryService } from '@/api';
import type { DiscoveryEventType, Monster } from '@/api/types';
import { mediaUrl, monsterArtFallback, BIOME } from '@/lib/design';
import { useAuth } from '@/hooks/useAuth';

interface DiscoveryContextType {
  // Registra un evento de actividad (visitar/jugar) y encola lo descubierto.
  recordEvent: (type: DiscoveryEventType, opts?: { placeId?: number; itemId?: number }) => Promise<void>;
  // Encola monstruos ya descubiertos por otra vía (p. ej. la respuesta de compra).
  reportDiscoveries: (monsters?: Monster[] | null) => void;
  // Reevalúa estrategias basadas en estado (inventario) sin registrar evento.
  sync: () => Promise<void>;
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Cola de monstruos pendientes de mostrar (se muestran de a uno).
  const [queue, setQueue] = useState<Monster[]>([]);
  // Evita encolar el mismo monstruo dos veces en la misma sesión.
  const shownIds = useRef<Set<number>>(new Set());
  // El sync inicial por usuario corre una sola vez.
  const syncedFor = useRef<number | null>(null);

  const enqueue = useCallback((monsters?: Monster[] | null) => {
    if (!monsters || monsters.length === 0) return;
    const fresh = monsters.filter((m) => !shownIds.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach((m) => shownIds.current.add(m.id));
    setQueue((prev) => [...prev, ...fresh]);
  }, []);

  const recordEvent = useCallback(
    async (type: DiscoveryEventType, opts?: { placeId?: number; itemId?: number }) => {
      if (!user) return;
      try {
        const { newlyDiscovered } = await discoveryService.recordEvent({ type, ...opts });
        enqueue(newlyDiscovered);
      } catch {
        // El descubrimiento es accesorio: si falla, no rompemos la navegación.
      }
    },
    [user, enqueue]
  );

  const sync = useCallback(async () => {
    if (!user) return;
    try {
      const { newlyDiscovered } = await discoveryService.sync();
      enqueue(newlyDiscovered);
    } catch {
      /* no-op */
    }
  }, [user, enqueue]);

  // Al iniciar sesión, sincronizar una vez para resolver tareas de inventario.
  useEffect(() => {
    if (user && syncedFor.current !== user.id) {
      syncedFor.current = user.id;
      sync();
    }
    if (!user) {
      syncedFor.current = null;
      shownIds.current.clear();
    }
  }, [user, sync]);

  const current = queue[0] ?? null;
  const dismiss = useCallback(() => setQueue((prev) => prev.slice(1)), []);

  return (
    <DiscoveryContext.Provider value={{ recordEvent, reportDiscoveries: enqueue, sync }}>
      {children}
      {current && <DiscoveryModal monster={current} remaining={queue.length - 1} onClose={dismiss} />}
    </DiscoveryContext.Provider>
  );
}

export function useDiscovery() {
  const ctx = useContext(DiscoveryContext);
  if (ctx === undefined) {
    throw new Error('useDiscovery debe usarse dentro de un DiscoveryProvider');
  }
  return ctx;
}

/* ============ Modal informativo de descubrimiento ============ */
function DiscoveryModal({ monster, remaining, onClose }: { monster: Monster; remaining: number; onClose: () => void }) {
  const a = monster.attributes;
  const art = mediaUrl(a.Image, monsterArtFallback(a.Name));
  const biome = a.Biome ? BIOME[a.Biome] : null;

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const facts: Array<[string, string | null]> = [
    ['Naturaleza', a.Nature],
    ['Origen', a.Origin],
    ['Habilidad innata', a.InnateAbility],
    ['Bioma', biome?.label ?? null],
  ];

  return (
    <div className="disc-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="disc-modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="disc-kicker">✦ Nueva criatura descubierta</div>
        <div className="disc-art">
          {art && <img src={art} alt={a.Name} />}
        </div>
        <h2 className="cinzel disc-name">{a.Name}</h2>
        <div className="disc-facts">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="disc-fact">
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg disc-close" onClick={onClose}>
          {remaining > 0 ? `Siguiente (${remaining} más) →` : '¡Genial! Cerrar'}
        </button>
      </div>
    </div>
  );
}
