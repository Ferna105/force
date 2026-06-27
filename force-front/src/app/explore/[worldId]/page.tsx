'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorld, useMonsters, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { mediaUrl, worldArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/tags';
import { RegionCard, MonsterCard } from '@/components/ui/cards';

export default function WorldPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const { user } = useAuth();
  const { data: world, loading, error } = useWorld(worldId);
  const { data: monsters } = useMonsters({ populate: '*' });
  const { data: discoveredIds } = useDiscoveredMonsters(!!user);

  if (loading) return <><Topbar crumb="Explorar" /><div className="page"><Loading /></div></>;
  if (error || !world) return <><Topbar crumb="Explorar" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const a = world.attributes;
  const regions = a.regions?.data ?? [];
  const totalPlaces = regions.reduce((n, r) => n + (r.attributes.places?.data?.length ?? 0), 0);
  // Criaturas nativas: las que pertenecen a este mundo (relación World) y que el
  // usuario logueado ya descubrió (vacío sin sesión).
  const discovered = new Set(discoveredIds ?? []);
  const natives = (monsters ?? []).filter((m) => m.attributes.World?.data?.id === world.id && discovered.has(m.id));
  const art = mediaUrl(a.Image, worldArtFallback(a.Name));

  return (
    <>
      <Topbar crumb={<><Link href="/explore" style={{ color: 'var(--gold-soft)' }}>Explorar</Link> · <b>{a.Name}</b></>} />
      <div className="page">
        <section className="world-hero">
          <div className="stars" />
          <div className="txt">
            <h1 className="cinzel" style={{ fontSize: 'clamp(48px,7vw,84px)', lineHeight: '.95', color: '#F6ECD7', margin: '14px 0 14px', letterSpacing: '.03em' }}>{a.Name}</h1>
            {a.Description && <p className="sub" style={{ fontSize: 18 }}>{a.Description}</p>}
            <div className="stat-strip">
              <div className="s"><b>{regions.length}</b><span>{regions.length === 1 ? 'Región' : 'Regiones'}</span></div>
              <div className="s"><b>{totalPlaces}</b><span>Lugares</span></div>
              {user && <div className="s"><b>{natives.length}</b><span>Criaturas nativas</span></div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              {regions[0] && <Link className="btn btn-primary btn-lg" href={`/explore/${world.id}/regions/${regions[0].id}`}>Viajar a {a.Name} ✦</Link>}
              {user && <Link className="btn btn-secondary btn-lg" href="/monsters">Ver criaturas</Link>}
            </div>
          </div>
          <div className="orbwrap">
            <div className="planet">
              {art && <img src={art} alt={a.Name} />}
              {regions.filter((r) => r.attributes.HotspotX != null && r.attributes.HotspotY != null).map((r) => (
                <Link
                  key={r.id}
                  className="hotspot"
                  style={{ top: `${r.attributes.HotspotY}%`, left: `${r.attributes.HotspotX}%` }}
                  href={`/explore/${world.id}/regions/${r.id}`}
                >
                  <span className="dot" />
                  <span className="lbl">{r.attributes.Name} · <b>{r.attributes.places?.data?.length ?? 0} lugares</b></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SectionTitle title={`Regiones de ${a.Name}`} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          {regions.map((r) => <RegionCard key={r.id} region={r} worldId={world.id} />)}
        </div>

        {user && natives.length > 0 && (
          <>
            <SectionTitle title="Criaturas nativas" href="/monsters" action="Bestiario →" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {natives.slice(0, 4).map((m) => <MonsterCard key={m.id} monster={m} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
