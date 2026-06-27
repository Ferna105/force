'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRegion } from '@/api';
import { mediaUrl, placeBannerFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { SectionTitle, BiomeTag } from '@/components/ui/tags';
import { PlaceBanner } from '@/components/ui/cards';

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
        <section className="world-hero">
          <div className="stars" />
          <div className="txt">
            <div className="kicker">{wName ? `Región de ${wName}` : 'Región'}</div>
            <h1 className="cinzel" style={{ fontSize: 'clamp(40px,6vw,72px)', lineHeight: '.97', color: '#F6ECD7', margin: '12px 0 14px', letterSpacing: '.03em' }}>{a.Name}</h1>
            {a.Description && <p className="sub" style={{ fontSize: 18 }}>{a.Description}</p>}
            <div className="stat-strip">
              <div className="s"><b>{places.length}</b><span>{places.length === 1 ? 'Lugar' : 'Lugares'}</span></div>
            </div>
          </div>
          <div className="orbwrap">
            <div className="planet">
              {art && <img src={art} alt={a.Name} />}
              <BiomeTag biome={a.Biome} abs />
            </div>
          </div>
        </section>

        <SectionTitle title={`Lugares de ${a.Name}`} />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          {places.map((p) => <PlaceBanner key={p.id} place={p} worldId={worldId} worldName={wName} />)}
        </div>
      </div>
    </>
  );
}
