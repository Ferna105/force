'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRegion } from '@/api';
import { mediaUrl, placeBannerFallback, PLACE_TYPE } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { BiomeTag } from '@/components/ui/tags';

export default function RegionPage() {
  const params = useParams();
  const worldId = Number(params.worldId);
  const regionId = Number(params.regionId);
  const { data: region, loading, error } = useRegion(regionId);

  if (loading) return <><Topbar crumb="Explorar" /><div className="page"><Loading /></div></>;
  if (error || !region) return <><Topbar crumb="Explorar" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const a = region.attributes;
  const world = a.World?.data;
  const wName = world?.attributes?.Name;
  const places = a.places?.data ?? [];
  // Sin banner propio caemos al banner (o fallback) del primer lugar de la región.
  const first = places[0]?.attributes;
  const fallback = first ? mediaUrl(first.Banner, placeBannerFallback(first.Name)) : '';
  const art = mediaUrl(a.Banner, fallback);
  // Lugares ubicables sobre la imagen (los que tienen posición x/y).
  const pinned = places.filter((p) => p.attributes.HotspotX != null && p.attributes.HotspotY != null);

  return (
    <>
      <Topbar
        crumb={
          <>
            <Link href="/explore" style={{ color: 'var(--gold-soft)' }}>Explorar</Link>
            {' · '}
            <Link href={`/explore/${worldId}`} style={{ color: 'var(--gold-soft)' }}>{wName ?? 'Mundo'}</Link>
            {' · '}<b>{a.Name}</b>
          </>
        }
      />
      <div className="page">
        <div className="kicker">{wName ? `Región de ${wName}` : 'Región'}</div>
        <h1 className="cinzel" style={{ fontSize: 'clamp(38px,5.5vw,68px)', lineHeight: '.97', color: '#F6ECD7', margin: '8px 0 12px', letterSpacing: '.03em' }}>{a.Name}</h1>
        {a.Description && <p className="sub" style={{ fontSize: 17, maxWidth: 760 }}>{a.Description}</p>}

        {/* Mapa de la región: imagen grande con los lugares tocables (hotspots por x/y). */}
        <div className="region-map" data-biome={a.Biome ?? ''} style={{ marginTop: 26 }}>
          {art && <img src={art} alt={a.Name} />}
          <div className="map-scrim" />
          <BiomeTag biome={a.Biome} abs />
          {pinned.map((p) => {
            const pa = p.attributes;
            return (
              <Link
                key={p.id}
                className="region-hotspot"
                style={{ top: `${pa.HotspotY}%`, left: `${pa.HotspotX}%` }}
                href={`/explore/${worldId}/places/${p.id}`}
              >
                <span className="dot" />
                <span className="lbl">{pa.Name}<b>{PLACE_TYPE[pa.Type].label}</b></span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
