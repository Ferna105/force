'use client';

import { useState } from 'react';
import { useMonsters, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import type { Biome } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState, BiomeChips } from '@/components/ui/states';
import { MonsterCard } from '@/components/ui/cards';

export default function BestiaryPage() {
  const { user } = useAuth();
  const { data: monsters, loading, error } = useMonsters({ populate: '*' });
  const { data: discoveredIds } = useDiscoveredMonsters(!!user);
  const [biome, setBiome] = useState<Biome | 'all'>('all');

  const list = monsters ?? [];
  const total = list.length;
  // Sin sesión mostramos todo el catálogo como "descubierto"
  const isDiscovered = (id: number) => !user || (discoveredIds ?? []).includes(id);
  const discoveredCount = user ? (discoveredIds ?? []).length : total;
  const visible = list.filter((m) => biome === 'all' || m.attributes.Biome === biome);
  const pct = total ? Math.round((discoveredCount / total) * 100) : 0;

  return (
    <>
      <Topbar crumb="Bestiario" search coin={false} />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div className="kicker">Catálogo viviente</div>
            <h1 className="h-page" style={{ margin: '8px 0 6px' }}>Bestiario</h1>
            <p className="sub">Cada criatura es real en su ecosistema. Descubrilas explorando los mundos.</p>
          </div>
          <div style={{ minWidth: 240 }}>
            <div className="meter" style={{ margin: 0 }}>
              <div className="top"><span>Descubiertas</span><b>{discoveredCount} / {total}</b></div>
              <div className="bar"><i className="fill-gold" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
        </div>

        <div style={{ margin: '24px 0' }}><BiomeChips value={biome} onChange={setBiome} /></div>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {!loading && (
          <div className="beast-grid">
            {visible.map((m) => <MonsterCard key={m.id} monster={m} discovered={isDiscovered(m.id)} />)}
          </div>
        )}
      </div>
    </>
  );
}
