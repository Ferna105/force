'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useWorld } from '@/api';
import { mediaUrl, worldArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';

export default function WorldPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const { data: world, loading, error } = useWorld(worldId);

  if (loading) return <><Topbar crumb="Explorar" /><div className="page"><Loading /></div></>;
  if (error || !world) return <><Topbar crumb="Explorar" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const a = world.attributes;
  const regions = a.regions?.data ?? [];
  const art = mediaUrl(a.Image, worldArtFallback(a.Name));
  // Regiones ubicables sobre la imagen del mundo (las que tienen posición x/y).
  const pinned = regions.filter((r) => r.attributes.HotspotX != null && r.attributes.HotspotY != null);

  return (
    <>
      <Topbar crumb={<><Link href="/explore" style={{ color: 'var(--gold-soft)' }}>Explorar</Link> · <b>{a.Name}</b></>} />
      <div className="page">
        <div className="kicker">Mundo de Force</div>
        <h1 className="cinzel" style={{ fontSize: 'clamp(38px,5.5vw,68px)', lineHeight: '.97', color: '#F6ECD7', margin: '8px 0 12px', letterSpacing: '.03em' }}>{a.Name}</h1>
        {a.Description && <p className="sub" style={{ fontSize: 17, maxWidth: 760 }}>{a.Description}</p>}

        {/* Mapa del mundo: el planeta en grande con las regiones tocables (hotspots x/y). */}
        <div className="world-map">
          <div className="stars" aria-hidden />
          {art && <img src={art} alt={a.Name} />}
          {pinned.map((r) => {
            const ra = r.attributes;
            return (
              <Link
                key={r.id}
                className="region-hotspot"
                style={{ top: `${ra.HotspotY}%`, left: `${ra.HotspotX}%` }}
                href={`/explore/${world.id}/regions/${r.id}`}
              >
                <span className="dot" />
                <span className="lbl">{ra.Name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
