'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useExploreData } from '@/api';
import type { World } from '@/api/types';
import { mediaUrl, worldArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';

const ORBIT_CLASS = ['o1', 'o2', 'o3'];

/** El universo Force como un sistema: Eryndor al centro y las lunas orbitando (1 vuelta = 1 día). */
function WorldSystem({ worlds }: { worlds: World[] }) {
  const center =
    worlds.find((w) => w.attributes.Name.toLowerCase() === 'eryndor') ?? worlds[0];
  const moons = worlds.filter((w) => w.id !== center?.id);

  if (!center) return null;

  const c = center.attributes;
  const sunImg = mediaUrl(c.Image, worldArtFallback(c.Name));

  return (
    <div className="solar-card" role="navigation" aria-label="Mundos de Force">
      <div className="stars" aria-hidden />
      <div className="solar">
        {moons.map((w, i) => {
          const a = w.attributes;
          const img = mediaUrl(a.Image, worldArtFallback(a.Name));
          return (
            <div key={w.id} className={`orbit ${ORBIT_CLASS[i % ORBIT_CLASS.length]}`}>
              <Link className="moon" href={`/explore/${w.id}`} title={a.Name}>
                <span className="rev">
                  {img && <img src={img} alt={a.Name} />}
                  <span className="nm cinzel">{a.Name}</span>
                </span>
              </Link>
            </div>
          );
        })}

        <Link className="sun" href={`/explore/${center.id}`} title={c.Name}>
          {sunImg && <img src={sunImg} alt={c.Name} />}
          <span className="nm cinzel">{c.Name}</span>
        </Link>
      </div>
    </div>
  );
}

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

        {data && <WorldSystem worlds={data.worlds} />}
      </div>
    </>
  );
}
