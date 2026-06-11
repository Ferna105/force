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
import { BiomeTag, Meter, CompanionStats, SectionTitle } from '@/components/ui/tags';
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
            <CareSection monsterId={monster.id} />
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

/* Cuidados: busca el compañero del usuario para este monstruo y permite
   alimentar / jugar / acariciar (sube stats vía endpoints custom). */
function CareSection({ monsterId }: { monsterId: number }) {
  const { user } = useAuth();
  const [comp, setComp] = useState<{
    id: number; happiness: number; energy: number; bond: number;
    health: number; strength: number; defense: number; speed: number; luck: number; level: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setComp(null); return; }
    companionsService.getMine().then((res) => {
      if (!active) return;
      const found = res.data.find((c) => c.attributes.monster?.data?.id === monsterId);
      if (found) {
        const at = found.attributes;
        setComp({
          id: found.id, happiness: at.happiness, energy: at.energy, bond: at.bond,
          health: at.health, strength: at.strength, defense: at.defense, speed: at.speed, luck: at.luck, level: at.level,
        });
      } else setComp(null);
    }).catch(() => {});
    return () => { active = false; };
  }, [user, monsterId]);

  const act = async (kind: 'feed' | 'play' | 'pet') => {
    if (!comp) return;
    setBusy(true);
    try {
      const res = await companionsService[kind](comp.id);
      setComp((c) => (c ? { ...c, happiness: res.happiness, energy: res.energy, bond: res.bond } : c));
    } catch { /* noop */ } finally { setBusy(false); }
  };

  const stats = comp ?? { happiness: 50, energy: 50, bond: 0 };

  return (
    <>
      <div className="kicker" style={{ margin: '22px 0 12px' }}>Cuidados</div>
      <Meter label="Felicidad" value={stats.happiness} fill="fill-gold" />
      <Meter label="Energía" value={stats.energy} fill="fill-verd" />
      <div style={{ marginBottom: 18 }}><Meter label="Vínculo" value={stats.bond} fill="fill-rare" last /></div>
      {comp && <CompanionStats stats={comp} />}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-verdant btn-lg" disabled={!comp || busy} onClick={() => act('feed')}>Alimentar 🍃</button>
        <button className="btn btn-primary btn-lg" disabled={!comp || busy} onClick={() => act('play')}>Jugar ✦</button>
        <button className="btn btn-secondary btn-lg" disabled={!comp || busy} onClick={() => act('pet')}>Acariciar</button>
      </div>
      {!comp && (
        <p className="sub" style={{ fontSize: 13, marginTop: 12 }}>
          {user ? 'Todavía no cuidás a esta criatura.' : 'Iniciá sesión para cuidar a esta criatura.'}
        </p>
      )}
    </>
  );
}
