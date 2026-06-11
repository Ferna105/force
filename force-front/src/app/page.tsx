'use client';

import Link from 'next/link';
import { useHomeData, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/tags';
import { WorldCard, PlaceBanner, MonsterCard } from '@/components/ui/cards';

export default function HomePage() {
  const { user } = useAuth();
  const { data, loading, error } = useHomeData();
  const { data: discoveredIds } = useDiscoveredMonsters(!!user);

  // Solo las criaturas que el usuario ya descubrió (vacío sin sesión).
  const discovered = new Set(discoveredIds ?? []);
  const discoveredMonsters = (data?.monsters ?? []).filter((m) => discovered.has(m.id));

  return (
    <>
      <Topbar crumb="Inicio" search coin />
      <div className="page">
        {loading && <Loading />}
        {error && <ErrorState message={error} />}
        {data && (
          <>
            <WelcomeHero
              showBestiary={!!user}
              fallbackName={discoveredMonsters[0]?.attributes.Name}
            />

            <SectionTitle title="Mundos para explorar" href="/explore" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {data.worlds.slice(0, 4).map((w) => <WorldCard key={w.id} world={w} short />)}
            </div>

            <SectionTitle title="Lugares destacados" href="/explore" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              {data.places.slice(0, 2).map((p) => <PlaceBanner key={p.id} place={p} />)}
            </div>

            {/* El bestiario reciente solo aparece con sesión y criaturas descubiertas. */}
            {user && discoveredMonsters.length > 0 && (
              <>
                <SectionTitle title="Bestiario reciente" href="/monsters" action="Abrir bestiario →" />
                <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
                  {discoveredMonsters.slice(0, 4).map((m) => <MonsterCard key={m.id} monster={m} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* Hero de bienvenida del inicio (la info del compañero vive ahora en /companion) */
function WelcomeHero({
  fallbackName, showBestiary = false,
}: {
  fallbackName?: string;
  showBestiary?: boolean;
}) {
  return (
    <section className="panel" style={{ padding: '40px 44px', borderRadius: 'var(--r-xl)' }}>
      <div className="kicker">Bienvenido a Force</div>
      <h1 className="cinzel" style={{ fontSize: 44, color: '#F6ECD7', margin: '8px 0 10px', letterSpacing: '.03em' }}>
        Tu universo viviente
      </h1>
      <p className="sub" style={{ marginBottom: 22 }}>
        Criaturas reales en ecosistemas vivos, mundos cinemáticos y reliquias por descubrir.
        {fallbackName ? ` Empezá conociendo a ${fallbackName}.` : ''}
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" href="/explore">Explorar mundos ✦</Link>
        {showBestiary && <Link className="btn btn-secondary" href="/monsters">Ver bestiario</Link>}
      </div>
    </section>
  );
}
