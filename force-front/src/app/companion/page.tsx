'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useActiveCompanion } from '@/api';
import { useAuth } from '@/hooks/useAuth';
import { mediaUrl, monsterArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading } from '@/components/ui/states';
import { BiomeTag, CompanionStatBars, LevelRing, LuckCharm } from '@/components/ui/tags';

function CompanionView() {
  const { user } = useAuth();
  const { data: companion, loading } = useActiveCompanion(user?.id ?? null);
  const monster = companion?.attributes.monster?.data;

  if (loading) return <><Topbar crumb="Mi compañero" /><div className="page"><Loading /></div></>;

  // Sin compañero todavía: invitamos a descubrir y adoptar uno.
  if (!companion || !monster) {
    return (
      <>
        <Topbar crumb="Mi compañero" />
        <div className="page">
          <div className="state">
            <h1 className="cinzel" style={{ fontSize: 40, color: '#F6ECD7' }}>Todavía no tenés compañero</h1>
            <p className="sub">
              Descubrí criaturas explorando los mundos y convertí una en tu compañera desde su ficha.
            </p>
            <Link className="btn btn-primary" href="/explore">Explorar mundos ✦</Link>
          </div>
        </div>
      </>
    );
  }

  const a = companion.attributes;
  const m = monster.attributes;
  const art = mediaUrl(m.Image, monsterArtFallback(m.Name));

  return (
    <>
      <Topbar crumb="Mi compañero" />
      <div className="page">
        <section className="panel" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
          <div className="cmp-stage">
            <span style={{ position: 'absolute', top: 16, left: 16, zIndex: 2 }}><BiomeTag biome={m.Biome} /></span>
            {art && <img src={art} alt={m.Name} />}
          </div>
          <div style={{ padding: '34px 38px' }}>
            <div className="kicker">Tu compañero</div>
            <h1 className="cinzel" style={{ fontSize: 46, color: '#F6ECD7', margin: '8px 0 2px', letterSpacing: '.03em' }}>{m.Name}</h1>
            {m.Origin && <p className="sub" style={{ fontStyle: 'italic', margin: '0 0 4px' }}>{m.Origin}</p>}

            <div className="cmp-hero">
              <LevelRing level={a.level} />
              <LuckCharm luck={a.luck} />
            </div>

            <CompanionStatBars stats={a} />

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link className="btn btn-primary" href="/inventory">Cuidar a {m.Name} ✦</Link>
              <Link className="btn btn-secondary" href={`/monsters/${monster.id}`}>Ver ficha</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default function CompanionPage() {
  return (
    <ProtectedRoute>
      <CompanionView />
    </ProtectedRoute>
  );
}
