'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMonster, useMonsters, useWorlds, usePlaces, useDiscoveredMonsters, companionsService } from '@/api';
import type { Monster } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { BIOME, mediaUrl, monsterArtFallback } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState } from '@/components/ui/states';
import { BiomeTag, StatsRadar, SectionTitle } from '@/components/ui/tags';
import { WorldCard, PlaceBanner, MonsterCard } from '@/components/ui/cards';

function MonsterView() {
  const params = useParams();
  const id = Number(params.id);
  const { data: monster, loading, error } = useMonster(id);
  const { data: monsters } = useMonsters({ populate: '*' });
  const { data: worlds } = useWorlds({ populate: '*' });
  const { data: places } = usePlaces({ populate: '*' });
  const { data: discoveredIds, loading: discLoading } = useDiscoveredMonsters(true);

  if (loading || discLoading) return <><Topbar crumb="Bestiario" /><div className="page"><Loading /></div></>;
  if (error || !monster) return <><Topbar crumb="Bestiario" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const discovered = new Set(discoveredIds ?? []);
  // Solo se puede ver la ficha de una criatura ya descubierta.
  if (!discovered.has(monster.id)) {
    return (
      <>
        <Topbar crumb={<><Link href="/monsters" style={{ color: 'var(--gold-soft)' }}>Bestiario</Link> · <b>???</b></>} />
        <div className="page">
          <div className="state">
            <h1 className="cinzel" style={{ fontSize: 40, color: '#F6ECD7' }}>Criatura sin descubrir</h1>
            <p className="sub">Todavía no encontraste esta criatura. Explorá los mundos para descubrirla.</p>
            <Link className="btn btn-primary" href="/explore">Explorar mundos ✦</Link>
          </div>
        </div>
      </>
    );
  }

  const a = monster.attributes;
  const biome = a.Biome;
  const art = mediaUrl(a.Image, monsterArtFallback(a.Name));
  const habitatWorld = biome ? (worlds ?? []).find((w) => w.attributes.Biome === biome) : undefined;
  const habitatPlace = biome ? (places ?? []).find((p) => p.attributes.Biome === biome) : undefined;
  // Las criaturas afines también se limitan a las ya descubiertas.
  const kin = (monsters ?? []).filter((m) => m.id !== monster.id && discovered.has(m.id) && (!biome || m.attributes.Biome === biome)).slice(0, 4);

  return (
    <>
      <Topbar crumb={<><Link href="/monsters" style={{ color: 'var(--gold-soft)' }}>Bestiario</Link> · <b>{a.Name}</b></>} />
      <div className="page">
        <div className="mon-top">
          <div className="mon-stage-big">
            {biome && <span className="biome-abs"><BiomeTag biome={biome} /></span>}
            {art && <img src={art} alt={a.Name} />}
            <div className="quick">
              {a.AverageHeight != null && <div className="q"><b>{a.AverageHeight.toLocaleString('es')} m</b><span>Altura prom.</span></div>}
              {a.AverageWeight != null && <div className="q"><b>{a.AverageWeight.toLocaleString('es')} kg</b><span>Peso prom.</span></div>}
              {biome && <div className="q"><b>{BIOME[biome].label}</b><span>Ecosistema</span></div>}
            </div>
          </div>

          <div>
            <div className="kicker">Criatura del bestiario</div>
            <h1 className="cinzel" style={{ fontSize: 'clamp(40px,6vw,64px)', color: '#F6ECD7', margin: '8px 0 4px', letterSpacing: '.03em', lineHeight: '.95' }}>{a.Name}</h1>
            {a.InnateAbility && (
              <div className="ability">
                <div className="lbl">✦ Habilidad innata</div>
                <p>{a.InnateAbility}</p>
              </div>
            )}
            <AdoptSection monster={monster} />
          </div>
        </div>

        {(a.Nature || a.Origin) && (
          <>
            <SectionTitle title="Naturaleza & origen" />
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {a.Nature && (
                <div className="panel" style={{ padding: '26px 30px' }}>
                  <div className="kicker">Naturaleza</div>
                  <p style={{ margin: '10px 0 0', color: '#EFE3CE' }}>{a.Nature}</p>
                </div>
              )}
              {a.Origin && (
                <div className="panel" style={{ padding: '26px 30px' }}>
                  <div className="kicker">Origen</div>
                  <p style={{ margin: '10px 0 0', color: '#EFE3CE' }}>{a.Origin}</p>
                </div>
              )}
            </div>
          </>
        )}

        {(habitatWorld || habitatPlace) && (
          <>
            <SectionTitle title="Hábitat" />
            <div className="habitat">
              {habitatWorld && <WorldCard world={habitatWorld} />}
              {habitatPlace && <PlaceBanner place={habitatPlace} />}
            </div>
          </>
        )}

        {kin.length > 0 && (
          <>
            <SectionTitle title="Criaturas afines" href="/monsters" action="Bestiario →" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              {kin.map((m: Monster) => <MonsterCard key={m.id} monster={m} />)}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function MonsterPage() {
  return (
    <ProtectedRoute>
      <MonsterView />
    </ProtectedRoute>
  );
}

/* Stats base (radar) + adopción: convierte al monstruo en compañero del usuario.
   Crea el compañero con sus stats inicializados al base de la especie. */
function AdoptSection({ monster }: { monster: Monster }) {
  const { user } = useAuth();
  const a = monster.attributes;
  const baseStats = {
    health: a.BaseHealth ?? 100,
    strength: a.BaseStrength ?? 10,
    defense: a.BaseDefense ?? 10,
    speed: a.BaseSpeed ?? 10,
    luck: a.BaseLuck ?? 5,
    level: a.BaseLevel ?? 1,
  };

  // ¿el usuario ya tiene a esta criatura como compañera?
  const [owned, setOwned] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) { setOwned(false); return; }
    companionsService.getMine().then((res) => {
      if (!active) return;
      setOwned(res.data.some((c) => c.attributes.monster?.data?.id === monster.id));
    }).catch(() => { if (active) setOwned(false); });
    return () => { active = false; };
  }, [user, monster.id]);

  const adopt = async () => {
    setBusy(true);
    setError(null);
    try {
      await companionsService.adopt(monster.id);
      setOwned(true);
      setConfirming(false);
    } catch {
      setError('No se pudo crear el compañero. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="kicker" style={{ margin: '22px 0 4px' }}>Estadísticas base</div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 18px' }}>
        <StatsRadar stats={baseStats} />
      </div>

      {owned ? (
        <p className="sub" style={{ fontSize: 14 }}>
          ✓ {a.Name} ya es tu compañero. <Link href="/" style={{ color: 'var(--gold-soft)' }}>Verlo en inicio →</Link>
        </p>
      ) : confirming ? (
        <div className="panel" style={{ padding: '20px 24px' }}>
          <p style={{ margin: '0 0 16px', color: '#EFE3CE' }}>
            ¿Seguro que querés convertir a <b>{a.Name}</b> en tu compañero?
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" disabled={busy} onClick={adopt}>
              {busy ? 'Creando…' : 'Sí, convertir'}
            </button>
            <button className="btn btn-secondary btn-lg" disabled={busy} onClick={() => setConfirming(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-lg"
          disabled={owned === null}
          onClick={() => setConfirming(true)}
        >
          Convertir en mi compañero ✦
        </button>
      )}
      {error && <p className="sub" style={{ fontSize: 13, marginTop: 12, color: '#E8A0A0' }}>{error}</p>}
    </>
  );
}
