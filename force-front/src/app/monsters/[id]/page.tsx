'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMonster, useMonsters, useWorlds, usePlaces, useDiscoveredMonsters, companionsService } from '@/api';
import type { Monster } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
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
  const toast = useToast();
  const a = monster.attributes;
  const baseStats = {
    health: a.BaseHealth ?? 100,
    strength: a.BaseStrength ?? 10,
    defense: a.BaseDefense ?? 10,
    speed: a.BaseSpeed ?? 10,
    luck: a.BaseLuck ?? 5,
    level: a.BaseLevel ?? 1,
  };

  // ¿el usuario ya tiene un compañero? (solo se permite uno)
  const [hasCompanion, setHasCompanion] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) { setHasCompanion(false); return; }
    companionsService.getMine().then((res) => {
      if (!active) return;
      setHasCompanion(res.data.length > 0);
    }).catch(() => { if (active) setHasCompanion(false); });
    return () => { active = false; };
  }, [user, monster.id]);

  const adopt = async () => {
    setBusy(true);
    try {
      await companionsService.adopt(monster.id);
      setHasCompanion(true);
      // Aviso efímero de éxito (tono verdant).
      toast.show({
        tone: 'verdant',
        icon: 'success',
        message: <>¡Listo! <b>{a.Name}</b> ahora es tu compañero.</>,
        duration: 3600,
      });
    } catch {
      toast.show({
        tone: 'danger',
        icon: 'warning',
        message: 'No se pudo crear el compañero. Intentá de nuevo.',
        primary: { label: 'Entendido' },
      });
    } finally {
      setBusy(false);
    }
  };

  // Toast de confirmación (tono gold, primario + secundario) antes de adoptar.
  const confirmAdopt = () => {
    toast.show({
      tone: 'gold',
      icon: 'question',
      message: <>¿Seguro que querés convertir a <b>{a.Name}</b> en tu compañero?</>,
      secondary: { label: 'Cancelar' },
      primary: { label: 'Sí, convertir', onClick: adopt },
    });
  };

  return (
    <>
      <div className="kicker" style={{ margin: '22px 0 4px' }}>Estadísticas base</div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 18px' }}>
        <StatsRadar stats={baseStats} />
      </div>

      {/* El botón solo aparece si el usuario todavía no tiene un compañero (se permite uno). */}
      {hasCompanion === false && (
        <button
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={confirmAdopt}
        >
          {busy ? 'Creando…' : 'Convertir en mi compañero ✦'}
        </button>
      )}
    </>
  );
}
