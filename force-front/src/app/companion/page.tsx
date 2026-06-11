'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useActiveCompanion, companionsService } from '@/api';
import type { Companion, Item } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { mediaUrl, monsterArtFallback, thumbFallback, type Rarity } from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading } from '@/components/ui/states';
import { BiomeTag, CompanionStatBars, LevelRing, LuckCharm, StatChip } from '@/components/ui/tags';
import { ItemSlot } from '@/components/ui/cards';

const MAX_EQUIP = 5;

function CompanionView() {
  const { user } = useAuth();
  const toast = useToast();
  const { data: fetched, loading } = useActiveCompanion(user?.id ?? null);

  // Copia local para reflejar quitar equipamiento sin recargar.
  const [companion, setCompanion] = useState<Companion | null>(null);
  const [busyItem, setBusyItem] = useState<number | null>(null);
  useEffect(() => { setCompanion(fetched ?? null); }, [fetched]);

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

  const equipped = a.equippedItems?.data ?? [];
  // Bonus del equipamiento y totales efectivos (base de la especie + equipo).
  const bonusAtk = equipped.reduce((s, it) => s + (it.attributes.attack || 0), 0);
  const bonusDef = equipped.reduce((s, it) => s + (it.attributes.defense || 0), 0);
  const effAtk = (a.strength || 0) + bonusAtk;
  const effDef = (a.defense || 0) + bonusDef;

  const unequip = async (it: Item) => {
    setBusyItem(it.id);
    try {
      const res = await companionsService.unequip(companion.id, it.id);
      setCompanion(res.data);
      toast.show({ tone: 'verdant', icon: 'success', duration: 3000, message: <>Quitaste <b>{it.attributes.name}</b>.</> });
    } catch {
      toast.show({ tone: 'danger', icon: 'warning', message: 'No se pudo quitar el objeto. Intentá de nuevo.', primary: { label: 'Entendido' } });
    } finally {
      setBusyItem(null);
    }
  };

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

        {/* Equipamiento: hasta 5 objetos; suman su ataque/defensa al total efectivo. */}
        <section className="panel" style={{ padding: '28px 32px', marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 }}>
            <div>
              <div className="kicker">Equipamiento</div>
              <h3 className="cinzel" style={{ fontSize: 24, color: '#F6ECD7', margin: '6px 0 0' }}>
                Objetos equipados <span style={{ color: '#C9B48E', fontSize: 16 }}>· {equipped.length}/{MAX_EQUIP}</span>
              </h3>
            </div>
            {/* Totales efectivos de combate (base + equipo). */}
            <div style={{ display: 'flex', gap: 8 }}>
              <StatChip label="Ataque" value={effAtk} />
              <StatChip label="Defensa" value={effDef} />
            </div>
          </div>

          {(bonusAtk > 0 || bonusDef > 0) && (
            <p className="sub" style={{ fontSize: 14, margin: '0 0 16px' }}>
              Bonus del equipamiento: <b style={{ color: '#f0a17a' }}>+{bonusAtk} ataque</b> · <b style={{ color: '#73b0f0' }}>+{bonusDef} defensa</b>.
            </p>
          )}

          <div className="inv-grid">
            {equipped.map((it) => {
              const at = it.attributes;
              return (
                <ItemSlot
                  key={it.id}
                  name={at.name}
                  img={mediaUrl(at.icon, thumbFallback(at.name))}
                  rarity={at.rarity as Rarity}
                  type={at.type}
                  showValue={false}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '6px 10px', fontSize: 13 }}
                    disabled={busyItem === it.id}
                    onClick={() => unequip(it)}
                  >
                    {busyItem === it.id ? '…' : 'Quitar'}
                  </button>
                </ItemSlot>
              );
            })}
            {/* Slots vacíos hasta completar MAX_EQUIP. */}
            {Array.from({ length: Math.max(0, MAX_EQUIP - equipped.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="slot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: .5, minHeight: 150, border: '1px dashed rgba(214,181,130,.3)' }}>
                <span className="sub" style={{ fontSize: 13, textAlign: 'center' }}>Vacío</span>
              </div>
            ))}
          </div>

          {equipped.length === 0 && (
            <p className="sub" style={{ fontSize: 14, marginTop: 14 }}>
              Equipá armas, armaduras o tótems desde tu <Link href="/inventory" style={{ color: 'var(--gold-soft)' }}>inventario</Link>.
            </p>
          )}
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
