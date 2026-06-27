'use client';

import { useExploreData } from '@/api';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { WorldCard } from '@/components/ui/cards';

export default function ExplorePage() {
  const { data, loading, error } = useExploreData();

  return (
    <>
      <Topbar crumb="Explorar" search coin={false} />
      <div className="page">
        <div className="kicker">El universo Force</div>
        <h1 className="h-page" style={{ margin: '8px 0 8px' }}>Explorar</h1>
        <p className="sub">Cada mundo es un ecosistema vivo. Adentrate en cada mundo para descubrir sus regiones y los lugares que las habitan.</p>

        {loading && <Loading />}
        {error && <ErrorState message={error} />}

        {data && (
          <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 18, marginTop: 26 }}>
            {data.worlds.map((w) => <WorldCard key={w.id} world={w} row />)}
          </div>
        )}
      </div>
    </>
  );
}
