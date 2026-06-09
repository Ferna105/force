'use client';

import { useState } from 'react';
import { useExploreData, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import type { Biome } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState, Segmented, BiomeChips } from '@/components/ui/states';
import { WorldCard, PlaceBanner, MonsterCard } from '@/components/ui/cards';

type Tab = 'mundos' | 'lugares' | 'criaturas';

export default function ExplorePage() {
  const { user } = useAuth();
  const { data, loading, error } = useExploreData();
  const { data: discoveredIds } = useDiscoveredMonsters(!!user);
  const [tab, setTab] = useState<Tab>('mundos');
  const [biome, setBiome] = useState<Biome | 'all'>('all');

  const match = (b?: string | null) => biome === 'all' || b === biome;
  // El bestiario (criaturas) solo es accesible con sesión iniciada.
  const discovered = new Set(discoveredIds ?? []);
  const tabOptions = [
    { key: 'mundos' as const, label: 'Mundos' },
    { key: 'lugares' as const, label: 'Lugares' },
    ...(user ? [{ key: 'criaturas' as const, label: 'Criaturas' }] : []),
  ];

  return (
    <>
      <Topbar crumb="Explorar" search coin={false} />
      <div className="page">
        <div className="kicker">El universo Force</div>
        <h1 className="h-page" style={{ margin: '8px 0 8px' }}>Explorar</h1>
        <p className="sub">Cada mundo es un ecosistema vivo. Filtrá por bioma para encontrar dónde habitan tus criaturas favoritas.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '26px 0 18px', flexWrap: 'wrap' }}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />
        </div>

        <div style={{ marginBottom: 26 }}><BiomeChips value={biome} onChange={setBiome} /></div>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}

        {data && tab === 'mundos' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {data.worlds.filter((w) => match(w.attributes.Biome)).map((w) => <WorldCard key={w.id} world={w} />)}
          </div>
        )}

        {data && tab === 'lugares' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            {data.places.filter((p) => match(p.attributes.Biome)).map((p) => <PlaceBanner key={p.id} place={p} />)}
          </div>
        )}

        {data && user && tab === 'criaturas' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {data.monsters.filter((m) => discovered.has(m.id) && match(m.attributes.Biome)).map((m) => <MonsterCard key={m.id} monster={m} />)}
          </div>
        )}
      </div>
    </>
  );
}
