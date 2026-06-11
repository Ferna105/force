'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { usePlace, useMonsters, useDiscoveredMonsters, useActiveCompanion, inventoryService, shopService, battleService } from '@/api';
import type { Place, Item, ShopStock, DuelsLobby } from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useDiscovery } from '@/hooks/useDiscovery';
import { useToast } from '@/hooks/useToast';
import {
  PLACE_TYPE, mediaUrl, strapiMedia, placeBannerFallback, thumbFallback, fmt,
} from '@/lib/design';
import Topbar from '@/components/shell/Topbar';
import { Loading, ErrorState } from '@/components/ui/states';
import { BiomeTag, TypePill, SectionTitle } from '@/components/ui/tags';
import { ItemSlot, MonsterCard } from '@/components/ui/cards';

export default function PlacePage() {
  const params = useParams();
  const placeId = Number(params.placeId);
  const { data: place, loading, error } = usePlace(placeId);
  const { user } = useAuth();
  const { recordEvent } = useDiscovery();

  // Registrar la visita al lugar (habilita tareas de descubrimiento de tipo
  // "visitar lugar" / "visitar todos los lugares del mundo"). Una vez por lugar.
  useEffect(() => {
    if (user && placeId) recordEvent('visit_place', { placeId });
  }, [user, placeId, recordEvent]);

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

        {a.Type === 'shop' && <ShopBody placeId={placeId} />}
        {a.Type === 'game' && <GameBody place={place} />}
        {a.Type === 'information' && <InfoBody place={place} />}
        {a.Type === 'battledome' && <BattledomeBody placeId={placeId} />}
      </div>
    </>
  );
}

/* ============ TIENDA ============ */
// mm:ss a partir de segundos.
function mmss(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ShopBody({ placeId }: { placeId: number }) {
  const { user, updateUser } = useAuth();
  const { reportDiscoveries } = useDiscovery();
  const [stock, setStock] = useState<ShopStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  // Carga el stock de esta tienda (objetos disponibles + cantidades).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await shopService.getStock(placeId);
      setStock(s);
    } catch {
      setMsg('No se pudo cargar la tienda.');
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => { load(); }, [load]);

  // Si la tienda está agotada, cuenta regresiva hasta el reabastecimiento; al
  // llegar a 0 recarga el stock (el cron del backend ya lo regeneró).
  const depleted = !!stock && stock.items.length === 0 && stock.restockInSeconds != null;
  useEffect(() => {
    if (!depleted) { setSecsLeft(null); return; }
    setSecsLeft(stock!.restockInSeconds!);
    const t = setInterval(() => {
      setSecsLeft((s) => {
        if (s == null) return null;
        if (s <= 1) { clearInterval(t); load(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [depleted, stock, load]);

  const buy = async (line: { item: Item; quantity: number }) => {
    const item = line.item;
    if (!user) { setMsg('Iniciá sesión para comprar.'); return; }
    setBusy(item.id); setMsg(null);
    try {
      // Se pasa el lugar: habilita tareas "comprar en X" y descuenta del stock.
      const res = await inventoryService.buy(item.id, placeId);
      updateUser({ balance: res.balance });
      reportDiscoveries(res.newlyDiscovered);
      if (res.stock) setStock(res.stock);
      setMsg(`Compraste ${item.attributes.name}. Saldo: F ${fmt(res.balance)}.`);
    } catch {
      setMsg('No se pudo completar la compra (¿saldo insuficiente o sin stock?).');
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
      <p className="sub" style={{ marginBottom: 22 }}>Mercancía fresca de la región. El stock es limitado: cuando se agota, tarda unos minutos en reponerse.</p>
      {msg && <p className="sub" style={{ marginBottom: 16, color: 'var(--gold-soft)' }}>{msg}</p>}
      {loading && <Loading />}
      {!loading && depleted && (
        <div className="panel" style={{ padding: '28px 32px', textAlign: 'center' }}>
          <h3 className="cinzel" style={{ color: 'var(--gold-soft)', marginBottom: 8 }}>Tienda agotada</h3>
          <p className="sub">Reabasteciendo… vuelve en <b style={{ color: 'var(--gold-soft)' }}>{mmss(secsLeft ?? 0)}</b></p>
        </div>
      )}
      {!loading && !depleted && (
        <div className="shop-grid">
          {(stock?.items ?? []).map((line) => {
            const it = line.item;
            const i = it.attributes;
            const soldOut = line.quantity <= 0;
            return (
              <ItemSlot
                key={it.id}
                name={i.name}
                img={mediaUrl(i.icon, thumbFallback(i.name))}
                rarity={i.rarity}
                type={i.type}
                qty={line.quantity}
                showValue={false}
              >
                <button
                  className="btn btn-primary btn-sm buy"
                  disabled={busy === it.id || soldOut}
                  onClick={() => buy(line)}
                >
                  <span style={{ fontWeight: 700 }}>F</span> {fmt(i.value)}
                </button>
              </ItemSlot>
            );
          })}
        </div>
      )}
    </>
  );
}

/* ============ JUEGO (estático / placeholder) ============ */
function GameBody({ place }: { place: Place }) {
  const { user } = useAuth();
  const { recordEvent } = useDiscovery();
  const name = place.attributes.Name;
  const play = () => { if (user) recordEvent('play_place', { placeId: place.id }); };
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
        <button className="btn btn-primary btn-lg" style={{ marginTop: 12 }} onClick={play}>▶ Jugar ahora</button>
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
  const { user } = useAuth();
  const { data: monsters } = useMonsters({ populate: '*' });
  const { data: discoveredIds } = useDiscoveredMonsters(!!user);
  // Habitantes: solo las criaturas que el usuario logueado descubrió (vacío sin sesión).
  const discovered = new Set(discoveredIds ?? []);
  const inhabitants = (monsters ?? []).filter((m) => a.Biome && m.attributes.Biome === a.Biome && discovered.has(m.id)).slice(0, 4);

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
            {a.Biome && user && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--ink-3)', paddingTop: 14 }}>
                <span className="sub">Especies</span><b className="fred">{inhabitants.length} nativas</b>
              </div>
            )}
          </div>
        </div>
      </div>
      {user && inhabitants.length > 0 && (
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

/* ============ BATTLEDOME (lobby de duelos) ============ */
const WAGERS = [100, 250, 500, 1000];

function BattledomeBody({ placeId }: { placeId: number }) {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { data: companion } = useActiveCompanion(user?.id ?? null);

  const [lobby, setLobby] = useState<DuelsLobby>({ open: [], mine: [] });
  const [composing, setComposing] = useState(false);
  const [wager, setWager] = useState(250);
  const [busy, setBusy] = useState(false);

  // Carga (y repolea) el lobby para reflejar inscripciones en vivo.
  const load = useCallback(async () => {
    if (!user) return;
    try { setLobby(await battleService.listDuels(placeId)); } catch { /* noop */ }
  }, [user, placeId]);
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [user, load]);

  if (!user) {
    return (
      <div className="panel" style={{ padding: '34px 36px', marginTop: 26, textAlign: 'center' }}>
        <h3 className="cinzel" style={{ color: '#F6ECD7', marginBottom: 8 }}>Arena de duelos</h3>
        <p className="sub" style={{ margin: '0 auto 18px' }}>Iniciá sesión para crear duelos o inscribirte a uno.</p>
        <Link className="btn btn-primary" href="/login">Iniciar sesión</Link>
      </div>
    );
  }

  const comp = companion?.attributes;
  const monsterName = comp?.monster?.data?.attributes.Name ?? null;
  const cur = comp?.currentHealth ?? 0;
  const max = comp?.health ?? 100;
  const fainted = !!comp && cur <= 0;
  const canWager = (w: number) => (user.balance ?? 0) >= w;

  const create = async () => {
    if (!companion || fainted) return;
    if (!canWager(wager)) { toast.show({ tone: 'danger', icon: 'warning', message: 'No te alcanza el saldo para esa apuesta.' }); return; }
    setBusy(true);
    try {
      const res = await battleService.create(placeId, companion.id, wager);
      updateUser({ balance: res.balance });
      router.push(`/battle/${res.id}`);
    } catch {
      toast.show({ tone: 'danger', icon: 'warning', message: 'No se pudo crear el duelo.' });
      setBusy(false);
    }
  };

  const join = (d: DuelsLobby['open'][number]) => {
    if (!companion || fainted) { toast.show({ tone: 'danger', icon: 'warning', message: 'Tu compañero está debilitado. Curalo con una poción antes de pelear.' }); return; }
    if (!canWager(d.wager)) { toast.show({ tone: 'danger', icon: 'warning', message: 'No te alcanza el saldo para esa apuesta.' }); return; }
    toast.show({
      tone: 'gold', icon: 'question',
      message: <>¿Inscribirte al duelo de <b>{d.creator?.username}</b>? Apostás <b>F {fmt(d.wager)}</b>.</>,
      secondary: { label: 'Cancelar' },
      primary: {
        label: 'Sí, pelear',
        onClick: async () => {
          try {
            const res = await battleService.join(d.id, companion.id);
            updateUser({ balance: res.balance });
            router.push(`/battle/${res.id}`);
          } catch {
            toast.show({ tone: 'danger', icon: 'warning', message: 'No se pudo inscribir (¿saldo o compañero ocupado?).' });
          }
        },
      },
    });
  };

  const cancel = async (id: number) => {
    try {
      const res = await battleService.cancel(id);
      updateUser({ balance: res.balance });
      load();
    } catch { /* noop */ }
  };

  const pot = lobby.open.reduce((s, d) => s + d.wager, 0);
  const duelImg = (d: { monsterImageUrl: string | null; monsterName: string }) =>
    d.monsterImageUrl ? strapiMedia(d.monsterImageUrl) : thumbFallback(d.monsterName);

  return (
    <>
      <div className="col-intro">
        <div>
          <div className="kicker">Coliseo · duelos por turnos</div>
          <h3 className="cinzel">Arena de duelos</h3>
          <p className="sub">Inscribite a un duelo abierto creado por otra domadora, o creá el tuyo y esperá a que un rival se anote a pelear. El ganador se lleva el pozo.</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          disabled={!companion || fainted}
          onClick={() => setComposing((v) => !v)}
        >
          ⚔ Crear duelo
        </button>
      </div>

      {!companion && (
        <div className="d-empty" style={{ marginTop: 18 }}>Todavía no tenés compañero. Adoptá una criatura desde su ficha para poder pelear.</div>
      )}
      {fainted && (
        <div className="d-empty" style={{ marginTop: 18, color: 'var(--danger)' }}>
          <b style={{ color: 'var(--danger)' }}>{monsterName}</b> está debilitado. Curalo con una poción en <Link href="/companion" style={{ color: 'var(--gold-soft)' }}>tu compañero</Link> para volver a pelear.
        </div>
      )}

      <div className="col-stats">
        <div className="col-stat"><div className="n">{lobby.open.length}</div><div className="l">Duelos abiertos</div></div>
        <div className="col-stat"><div className="n">{comp ? `${Math.max(0, cur)} / ${max}` : '—'}</div><div className="l">Salud de tu compañero</div></div>
        <div className="col-stat"><div className="n"><span style={{ fontFamily: 'var(--font-fredoka)' }}>F</span> {fmt(pot)}</div><div className="l">En juego ahora</div></div>
      </div>

      {/* composer */}
      {companion && comp && (
        <div className={`panel col-composer${composing ? ' show' : ''}`}>
          <div className="cf-row">
            <div className="kicker">Tu criatura</div>
            <div className="cf-mons">
              <div className="cf-mon sel">
                <img src={mediaUrl(comp.monster?.data?.attributes.Image, thumbFallback(monsterName ?? 'Tronc'))} alt={monsterName ?? ''} />
                <div className="nm">{monsterName}</div>
              </div>
            </div>
          </div>
          <div className="cf-row">
            <div className="kicker">Apuesta</div>
            <div className="cf-chips">
              {WAGERS.map((w) => (
                <button key={w} className={`cf-w${w === wager ? ' on' : ''}`} disabled={!canWager(w)} onClick={() => setWager(w)}>
                  <span className="c">F</span> {fmt(w)}
                </button>
              ))}
            </div>
          </div>
          <div className="cf-actions">
            <button className="btn btn-primary" disabled={busy} onClick={create}>Publicar duelo</button>
            <button className="btn btn-ghost" onClick={() => setComposing(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* tus duelos */}
      <div className="sec-title"><h3 className="cinzel">Tus duelos</h3></div>
      <div className="duel-list">
        {lobby.mine.length === 0 && (
          <div className="d-empty">Todavía no creaste ningún duelo. Tocá «Crear duelo» para abrir uno.</div>
        )}
        {lobby.mine.map((d) => (
          <div key={d.id} className={`duel ${d.status === 'active' ? 'ready' : 'mine'}`}>
            <div className="d-av">{(user.username?.[0] ?? 'N').toUpperCase()}</div>
            <img className="d-mon" src={duelImg(d)} alt={d.monsterName} />
            <div className="d-info">
              <div className="d-top"><b>Tu duelo</b><span className="d-lvl">Nv. {d.level}</span></div>
              <div className="d-sub">con <b style={{ color: '#F6ECD7' }}>{d.monsterName}</b></div>
              {d.status === 'active'
                ? <div className="d-wait ok">✓ Un rival aceptó tu duelo</div>
                : <div className="d-wait"><span className="spinner-sm" /> Esperando rival…</div>}
            </div>
            <div className="d-right">
              <span className="d-wager"><span className="c">F</span> {fmt(d.wager)}</span>
              {d.status === 'active'
                ? <Link className="btn btn-verdant btn-sm" href={`/battle/${d.id}`}>Entrar a la arena</Link>
                : <button className="btn btn-ghost btn-sm" onClick={() => cancel(d.id)}>Cancelar</button>}
            </div>
          </div>
        ))}
      </div>

      {/* duelos abiertos */}
      <div className="sec-title"><h3 className="cinzel">Duelos abiertos</h3><a>{lobby.open.length} esperando rival</a></div>
      <div className="duel-list">
        {lobby.open.length === 0 && (
          <div className="d-empty">No hay duelos abiertos por ahora. ¡Creá el primero!</div>
        )}
        {lobby.open.map((d) => (
          <div key={d.id} className="duel">
            <div className="d-av">{(d.creator?.username?.[0] ?? '?').toUpperCase()}</div>
            <img className="d-mon" src={duelImg(d)} alt={d.monsterName} />
            <div className="d-info">
              <div className="d-top"><b>{d.creator?.username}</b><span className="d-lvl">Nv. {d.level}</span></div>
              <div className="d-sub">con <b style={{ color: '#F6ECD7' }}>{d.monsterName}</b></div>
            </div>
            <div className="d-right">
              <span className="d-wager"><span className="c">F</span> {fmt(d.wager)}</span>
              <button className="btn btn-primary btn-sm" disabled={fainted || !companion} onClick={() => join(d)}>Inscribirse</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
