'use client';

import { useState } from 'react';
import { useExploreData } from '@/api';
import type { PlaceType } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState, Segmented } from '@/components/ui/states';
import { WorldCard, PlaceBanner } from '@/components/ui/cards';

type Tab = 'mundos' | 'lugares';
type PlaceFilter = 'all' | PlaceType;

export default function ExplorePage() {
  const { data, loading, error } = useExploreData();
  const [tab, setTab] = useState<Tab>('mundos');
  const [placeFilter, setPlaceFilter] = useState<PlaceFilter>('all');

  const tabOptions = [
    { key: 'mundos' as const, label: 'Mundos' },
    { key: 'lugares' as const, label: 'Lugares' },
  ];

  // Subtabs para filtrar los lugares por tipo (tiendas / información / juegos).
  const placeFilterOptions = [
    { key: 'all' as const, label: 'Todos' },
    { key: 'shop' as const, label: 'Tiendas' },
    { key: 'information' as const, label: 'Información' },
    { key: 'game' as const, label: 'Juegos' },
  ];

  return (
    <>
      <Topbar crumb="Explorar" search coin={false} />
      <div className="page">
        <div className="kicker">El universo Force</div>
        <h1 className="h-page" style={{ margin: '8px 0 8px' }}>Explorar</h1>
        <p className="sub">Cada mundo es un ecosistema vivo. Recorré los mundos y descubrí los lugares que los habitan.</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '26px 0 18px', flexWrap: 'wrap' }}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={tabOptions}
          />
        </div>

        {tab === 'lugares' && (
          <div style={{ marginBottom: 26 }}>
            <Segmented<PlaceFilter>
              value={placeFilter}
              onChange={setPlaceFilter}
              options={placeFilterOptions}
            />
          </div>
        )}

        {loading && <Loading />}
        {error && <ErrorState message={error} />}

        {data && tab === 'mundos' && (
          <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 18 }}>
            {data.worlds.map((w) => <WorldCard key={w.id} world={w} row />)}
          </div>
        )}

        {data && tab === 'lugares' && (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            {data.places
              .filter((p) => placeFilter === 'all' || p.attributes.Type === placeFilter)
              .map((p) => <PlaceBanner key={p.id} place={p} />)}
          </div>
        )}
      </div>
    </>
  );
}
