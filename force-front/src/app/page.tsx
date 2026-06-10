'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useHomeData, useActiveCompanion, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { mediaUrl, monsterArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { BiomeTag, Meter, SectionTitle } from '@/components/ui/tags';
import { WorldCard, PlaceBanner, MonsterCard } from '@/components/ui/cards';

export default function HomePage() {
  const { user } = useAuth();
  const { data, loading, error } = useHomeData();
  const { data: companion } = useActiveCompanion(user?.id ?? null);
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
            <CompanionHero
              companion={companion}
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

/* Hero del compañero activo (o bienvenida si no hay sesión/compañero) */
function CompanionHero({
  companion, fallbackName, showBestiary = false,
}: {
  companion: ReturnType<typeof useActiveCompanion>['data'];
  fallbackName?: string;
  showBestiary?: boolean;
}) {
  const monster = companion?.attributes.monster?.data;

  if (!companion || !monster) {
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

  const a = companion.attributes;
  const m = monster.attributes;
  const art = mediaUrl(m.Image, monsterArtFallback(m.Name));

  return (
    <section className="panel" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
      <div style={{ position: 'relative', background: 'radial-gradient(120% 120% at 50% 8%,#D6B582,#8d6c47)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 18 }}>
        <span style={{ position: 'absolute', top: 16, left: 16 }}><BiomeTag biome={m.Biome} /></span>
        {art && <img src={art} alt={m.Name} style={{ height: 300, objectFit: 'contain', filter: 'drop-shadow(0 26px 24px rgba(60,40,20,.5))' }} />}
      </div>
      <div style={{ padding: '34px 38px' }}>
        <div className="kicker">Tu compañero</div>
        <h1 className="cinzel" style={{ fontSize: 46, color: '#F6ECD7', margin: '8px 0 2px', letterSpacing: '.03em' }}>{m.Name}</h1>
        {m.Origin && <p className="sub" style={{ fontStyle: 'italic', margin: '0 0 22px' }}>{m.Origin}</p>}
        <div style={{ maxWidth: 440 }}>
          <Meter label="Felicidad" value={a.happiness} fill="fill-gold" />
          <Meter label="Energía" value={a.energy} fill="fill-verd" />
          <div style={{ marginBottom: 24 }}><Meter label="Vínculo" value={a.bond} fill="fill-rare" last /></div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" href={`/monsters/${monster.id}`}>Cuidar a {m.Name} ✦</Link>
          <Link className="btn btn-secondary" href={`/monsters/${monster.id}`}>Ver ficha</Link>
        </div>
      </div>
    </section>
  );
}
