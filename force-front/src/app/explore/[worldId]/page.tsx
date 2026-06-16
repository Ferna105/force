'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorld, useMonsters, useDiscoveredMonsters } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { mediaUrl, worldArtFallback, PLACE_TYPE } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { SectionTitle } from '@/components/ui/tags';
import { PlaceBanner, MonsterCard } from '@/components/ui/cards';

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
  const places = a.places?.data ?? [];
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
              <div className="s"><b>{places.length}</b><span>Lugares</span></div>
              {user && <div className="s"><b>{natives.length}</b><span>Criaturas nativas</span></div>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 26, flexWrap: 'wrap' }}>
              {places[0] && <Link className="btn btn-primary btn-lg" href={`/explore/${world.id}/places/${places[0].id}`}>Viajar a {a.Name} ✦</Link>}
              {user && <Link className="btn btn-secondary btn-lg" href="/monsters">Ver criaturas</Link>}
            </div>
          </div>
          <div className="orbwrap">
            <div className="planet">
              {art && <img src={art} alt={a.Name} />}
              {places.filter((p) => p.attributes.HotspotX != null && p.attributes.HotspotY != null).map((p) => (
                <Link
                  key={p.id}
                  className="hotspot"
                  style={{ top: `${p.attributes.HotspotY}%`, left: `${p.attributes.HotspotX}%` }}
                  href={`/explore/${world.id}/places/${p.id}`}
                >
                  <span className="dot" />
                  <span className="lbl">{p.attributes.Name} · <b>{PLACE_TYPE[p.attributes.Type].label}</b></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SectionTitle title={`Lugares de ${a.Name}`} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          {places.map((p) => <PlaceBanner key={p.id} place={p} worldId={world.id} worldName={a.Name} />)}
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
