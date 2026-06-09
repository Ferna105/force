'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { usePlace, useItems, useMonsters, inventoryService } from '@/api';
import type { Place, Item } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import {
  PLACE_TYPE, mediaUrl, placeBannerFallback, thumbFallback, fmt,
} from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { BiomeTag, TypePill, SectionTitle } from '@/components/ui/tags';
import { ItemSlot, MonsterCard } from '@/components/ui/cards';

export default function PlacePage() {
  const params = useParams();
  const placeId = Number(params.placeId);
  const { data: place, loading, error } = usePlace(placeId);

  if (loading) return <><Topbar crumb="Lugar" /><div className="page"><Loading /></div></>;
  if (error || !place) return <><Topbar crumb="Lugar" /><div className="page"><ErrorState message={error ?? undefined} /></div></>;

  const a = place.attributes;
  const world = a.World?.data;

  return (
    <>
      <Topbar
        crumb={<>{world && <><Link href={`/explore/${world.id}`} style={{ color: 'var(--gold-soft)' }}>{world.attributes.Name}</Link> · </>}<b>{a.Name}</b></>}
      />
      <div className="page">
        {/* HERO: el tipo es una etiqueta informativa, no un selector */}
        <section className="place-hero">
          {(() => { const img = mediaUrl(a.Banner, placeBannerFallback(a.Name)); return img && <img src={img} alt={a.Name} />; })()}
          <div className="scrim" />
          <div className="top">
            <TypePill type={a.Type} />
            <BiomeTag biome={a.Biome} />
          </div>
          <div className="pb">
            <h1 className="cinzel">{a.Name}</h1>
            {world && <div className="meta">Mundo · <b>{world.attributes.Name}</b></div>}
          </div>
        </section>

        {a.Type === 'shop' && <ShopBody />}
        {a.Type === 'game' && <GameBody place={place} />}
        {a.Type === 'information' && <InfoBody place={place} />}
      </div>
    </>
  );
}

/* ============ TIENDA ============ */
function ShopBody() {
  const { user, updateUser } = useAuth();
  const { data: items, loading } = useItems({ populate: '*' });
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const buy = async (item: Item) => {
    if (!user) { setMsg('Iniciá sesión para comprar.'); return; }
    setBusy(item.id); setMsg(null);
    try {
      const res = await inventoryService.buy(item.id);
      updateUser({ balance: res.balance });
      setMsg(`Compraste ${item.attributes.name}. Saldo: F ${fmt(res.balance)}.`);
    } catch {
      setMsg('No se pudo completar la compra (¿saldo insuficiente?).');
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="sec-title">
        <h3 className="cinzel">Mercado</h3>
        <a>Saldo: <span className="coin" style={{ verticalAlign: 'middle' }}><span className="c">F</span> {fmt(user?.balance)}</span></a>
      </div>
      <p className="sub" style={{ marginBottom: 22 }}>Reliquias rescatadas de las profundidades. La rareza marca el precio — y el brillo.</p>
      {msg && <p className="sub" style={{ marginBottom: 16, color: 'var(--gold-soft)' }}>{msg}</p>}
      {loading && <Loading />}
      <div className="shop-grid">
        {(items ?? []).map((it) => {
          const i = it.attributes;
          return (
            <ItemSlot
              key={it.id}
              name={i.name}
              img={mediaUrl(i.icon, thumbFallback(i.name))}
              rarity={i.rarity}
              type={i.type}
              showValue={false}
            >
              <button className="btn btn-primary btn-sm buy" disabled={busy === it.id} onClick={() => buy(it)}>
                <span style={{ fontWeight: 700 }}>F</span> {fmt(i.value)}
              </button>
            </ItemSlot>
          );
        })}
      </div>
    </>
  );
}

/* ============ JUEGO (estático / placeholder) ============ */
function GameBody({ place }: { place: Place }) {
  const name = place.attributes.Name;
  const leaders = [
    { rk: 1, av: 'V', name: 'Vael', pts: '24.110' },
    { rk: 2, av: 'M', name: 'Mira', pts: '21.890' },
    { rk: 3, av: 'N', name: 'Nora (vos)', pts: '18.420', me: true },
    { rk: 4, av: 'K', name: 'Koa', pts: '17.005' },
    { rk: 5, av: 'T', name: 'Tover', pts: '15.330' },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginTop: 26 }}>
      <div className="panel" style={{ padding: '34px 36px' }}>
        <BiomeTag biome={place.attributes.Biome} />
        <h3 className="cinzel" style={{ fontSize: 30, color: '#F6ECD7', margin: '14px 0 6px' }}>El desafío de {name}</h3>
        <p className="sub">{place.attributes.Description || 'Superá el desafío antes de que se agote el tiempo. Cada victoria fortalece el vínculo con tu criatura.'}</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 14, margin: '24px 0' }}>
          {[['Difícil', 'Dificultad'], ['+250 F', 'Recompensa'], ['18.420', 'Tu récord']].map(([b, s]) => (
            <div key={s} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--ink-line)', borderRadius: 'var(--r-md)', padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-cinzel)', fontWeight: 700, fontSize: 20, color: 'var(--gold-soft)' }}>{b}</div>
              <div style={{ fontFamily: 'var(--font-fredoka)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mist-2)' }}>{s}</div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" style={{ marginTop: 12 }}>▶ Jugar ahora</button>
      </div>
      <div className="panel" style={{ padding: '24px 26px' }}>
        <div className="kicker" style={{ marginBottom: 6 }}>Tabla de clasificación</div>
        {leaders.map((l, idx) => (
          <div key={l.rk} className="lead" style={{ ...(l.me ? { background: 'rgba(230,166,48,.08)', borderRadius: 'var(--r-md)' } : {}), ...(idx === leaders.length - 1 ? { border: 'none' } : {}) }}>
            <span className="rk">{l.rk}</span>
            <span className="av" style={l.me ? { background: 'radial-gradient(circle at 35% 30%,#f0c878,#bf8420)', color: '#3a2606' } : undefined}>{l.av}</span>
            <b>{l.name}</b>
            <span className="pts">{l.pts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ INFORMACIÓN ============ */
function InfoBody({ place }: { place: Place }) {
  const a = place.attributes;
  const world = a.World?.data;
  const { data: monsters } = useMonsters({ populate: '*' });
  const inhabitants = (monsters ?? []).filter((m) => a.Biome && m.attributes.Biome === a.Biome).slice(0, 4);

  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', marginTop: 26 }}>
        <div>
          <div className="panel" style={{ padding: '30px 34px' }}>
            <div className="kicker">Crónica del lugar</div>
            <p style={{ color: '#EFE3CE', fontSize: 17, margin: '12px 0 0' }}>
              {a.Description || 'Un rincón con historia propia dentro del universo Force.'}
            </p>
          </div>
        </div>
        <div className="panel" style={{ padding: '24px 26px' }}>
          <div className="kicker" style={{ marginBottom: 14 }}>Datos del ecosistema</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="sub">Bioma</span>{a.Biome ? <BiomeTag biome={a.Biome} /> : <b className="fred">—</b>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ink-3)', paddingTop: 14 }}>
              <span className="sub">Tipo</span><b className="fred">{PLACE_TYPE[a.Type].label}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ink-3)', paddingTop: 14 }}>
              <span className="sub">Mundo</span><b className="fred" style={{ color: 'var(--gold-soft)' }}>{world?.attributes.Name ?? '—'}</b>
            </div>
            {a.Biome && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ink-3)', paddingTop: 14 }}>
                <span className="sub">Especies</span><b className="fred">{inhabitants.length} nativas</b>
              </div>
            )}
          </div>
        </div>
      </div>
      {inhabitants.length > 0 && (
        <>
          <SectionTitle title="Quién habita aquí" />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            {inhabitants.map((m) => <MonsterCard key={m.id} monster={m} />)}
          </div>
        </>
      )}
    </>
  );
}
