'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMonsters, useDiscoveredMonsters } from '@/api';
import type { Biome } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState, BiomeChips } from '@/components/ui/states';
import { MonsterCard } from '@/components/ui/cards';

function BestiaryView() {
  const { data: monsters, loading, error } = useMonsters({ populate: '*' });
  const { data: discoveredIds, loading: discLoading } = useDiscoveredMonsters(true);
  const [biome, setBiome] = useState<Biome | 'all'>('all');

  const list = monsters ?? [];
  const total = list.length;
  const discovered = new Set(discoveredIds ?? []);
  const discoveredCount = discovered.size;
  // Solo se muestran las criaturas que el usuario ya encontró.
  const visible = list
    .filter((m) => discovered.has(m.id))
    .filter((m) => biome === 'all' || m.attributes.Biome === biome);
  const pct = total ? Math.round((discoveredCount / total) * 100) : 0;
  const busy = loading || discLoading;

  return (
    <>
      <Topbar crumb="Bestiario" search coin={false} />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="kicker">Catálogo viviente</div>
            <h1 className="h-page" style={{ margin: '8px 0 6px' }}>Bestiario</h1>
            <p className="sub">Acá viven las criaturas que ya encontraste. Seguí explorando los mundos para descubrir más.</p>
          </div>
          <div style={{ minWidth: 240 }}>
            <div className="meter" style={{ margin: 0 }}>
              <div className="top"><span>Descubiertas</span><b>{discoveredCount} / {total}</b></div>
              <div className="bar"><i className="fill-gold" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
        </div>

        <div style={{ margin: '24px 0' }}><BiomeChips value={biome} onChange={setBiome} /></div>

        {busy && <Loading />}
        {error && <ErrorState message={error} />}
        {!busy && visible.length > 0 && (
          <div className="beast-grid">
            {visible.map((m) => <MonsterCard key={m.id} monster={m} />)}
          </div>
        )}
        {!busy && !error && visible.length === 0 && (
          <div className="state">
            <p>Todavía no descubriste ninguna criatura{biome !== 'all' ? ' en este bioma' : ''}.</p>
            <Link className="btn btn-primary" href="/explore">Explorar mundos ✦</Link>
          </div>
        )}
      </div>
    </>
  );
}

export default function BestiaryPage() {
  return (
    <ProtectedRoute>
      <BestiaryView />
    </ProtectedRoute>
  );
}
