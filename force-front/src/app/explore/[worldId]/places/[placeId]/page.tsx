'use client';

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { usePlace, useMonsters, useDiscoveredMonsters, useActiveCompanion, inventoryService, shopService, battleService, gamesService, trainingService } from '@/api';
import type { Place, Item, ShopStock, DuelsLobby, GameStatus, GameLeaderboard, TrainingInfo, TrainStat } from '@/api/types';
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
  const region = a.region?.data;

  return (
    <>
      <Topbar
        crumb={<>{world && <><Link href={`/explore/${world.id}`} style={{ color: 'var(--gold-soft)' }}>{world.attributes.Name}</Link> · </>}{world && region && <><Link href={`/explore/${world.id}/regions/${region.id}`} style={{ color: 'var(--gold-soft)' }}>{region.attributes.Name}</Link> · </>}<b>{a.Name}</b></>}
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
        {a.Type === 'training' && <TrainingBody placeId={placeId} />}
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

/* ============ JUEGO ============ */
// Etiqueta humana de la dificultad declarada en el place.
const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Media', hard: 'Difícil' };
// Unidad del puntaje crudo según el juego (deo/torres miden en metros).
const GAME_UNIT: Record<string, string> = { deo: 'm', torres: 'm' };

function GameBody({ place }: { place: Place }) {
  const { user } = useAuth();
  const name = place.attributes.Name;
  // El juego se ejecuta en su propia ruta /play (animación + reclamo de recompensa).
  const worldId = place.attributes.World?.data?.id;
  const playHref = `/explore/${worldId}/places/${place.id}/play`;

  // Estado real del juego (dificultad, récord propio, tope de recompensa). Solo
  // con sesión: el endpoint requiere auth.
  const [status, setStatus] = useState<GameStatus | null>(null);
  // Tabla de récords real (público): mejor puntaje de cada usuario en este juego.
  const [board, setBoard] = useState<GameLeaderboard | null>(null);

  useEffect(() => {
    if (!user) { setStatus(null); return; }
    let alive = true;
    gamesService.getStatus(place.id).then((s) => { if (alive) setStatus(s); }).catch(() => {});
    return () => { alive = false; };
  }, [user, place.id]);

  useEffect(() => {
    let alive = true;
    gamesService.getLeaderboard(place.id).then((b) => { if (alive) setBoard(b); }).catch(() => {});
    return () => { alive = false; };
    // Se recarga al loguearse para que marque al usuario actual (manda el token).
  }, [place.id, user]);

  const gameKey = status?.gameKey ?? board?.gameKey ?? '';
  const unit = GAME_UNIT[gameKey] ?? 'pts';
  const difficulty = status?.difficulty ? (DIFFICULTY_LABEL[status.difficulty] ?? status.difficulty) : '—';
  const reward = status ? `Hasta ${status.maxReward} F` : '—';
  const record = status ? (status.bestScore > 0 ? `${fmt(status.bestScore)} ${unit}` : '—') : '—';

  return (
    <div className="grid" style={{ gridTemplateColumns: '1.4fr 1fr', marginTop: 26 }}>
      <div className="panel" style={{ padding: '34px 36px' }}>
        <BiomeTag biome={place.attributes.Biome} />
        <h3 className="cinzel" style={{ fontSize: 30, color: '#F6ECD7', margin: '14px 0 6px' }}>El desafío de {name}</h3>
        <p className="sub">{place.attributes.Description || 'Superá el desafío antes de que se agote el tiempo. Cada victoria fortalece el vínculo con tu criatura.'}</p>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 14, margin: '24px 0' }}>
          {[[difficulty, 'Dificultad'], [reward, 'Recompensa'], [record, 'Tu récord']].map(([b, s]) => (
            <div key={s} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--ink-line)', borderRadius: 'var(--r-md)', padding: 14 }}>
              <div style={{ fontFamily: 'var(--font-cinzel)', fontWeight: 700, fontSize: 20, color: 'var(--gold-soft)' }}>{b}</div>
              <div style={{ fontFamily: 'var(--font-fredoka)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--mist-2)' }}>{s}</div>
            </div>
          ))}
        </div>
        {!user && <p className="sub" style={{ marginBottom: 12 }}>Iniciá sesión para ver tu récord y reclamar la recompensa.</p>}
        <Link className="btn btn-primary btn-lg" style={{ marginTop: 12 }} href={playHref}>▶ Jugar ahora</Link>
      </div>
      <div className="panel" style={{ padding: '24px 26px' }}>
        <div className="kicker" style={{ marginBottom: 6 }}>Tabla de clasificación</div>
        {board && board.top.length === 0 && (
          <p className="sub" style={{ margin: '10px 0' }}>Todavía nadie marcó un récord. ¡Sé el primero!</p>
        )}
        {(board?.top ?? []).map((e, idx) => (
          <div key={e.userId} className="lead" style={{ ...(e.me ? { background: 'rgba(230,166,48,.08)', borderRadius: 'var(--r-md)' } : {}), ...(idx === board!.top.length - 1 && !board!.me ? { border: 'none' } : {}) }}>
            <span className="rk">{e.rank}</span>
            <span className="av" style={e.me ? { background: 'radial-gradient(circle at 35% 30%,#f0c878,#bf8420)', color: '#3a2606' } : undefined}>{(e.username[0] ?? '?').toUpperCase()}</span>
            <b>{e.username}{e.me ? ' (vos)' : ''}</b>
            <span className="pts">{fmt(e.score)} {unit}</span>
          </div>
        ))}
        {board?.me && (
          <div className="lead" style={{ background: 'rgba(230,166,48,.08)', borderRadius: 'var(--r-md)', border: 'none', marginTop: 6 }}>
            <span className="rk">{board.me.rank}</span>
            <span className="av" style={{ background: 'radial-gradient(circle at 35% 30%,#f0c878,#bf8420)', color: '#3a2606' }}>{(user?.username?.[0] ?? 'V').toUpperCase()}</span>
            <b>{user?.username} (vos)</b>
            <span className="pts">{fmt(board.me.score)} {unit}</span>
          </div>
        )}
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
  // El compañero no puede pelear mientras entrena en la escuela.
  const training = !!(comp?.trainingEndsAt && new Date(comp.trainingEndsAt).getTime() > Date.now());
  const blocked = fainted || training;
  const canWager = (w: number) => (user.balance ?? 0) >= w;

  const create = async () => {
    if (!companion || blocked) return;
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
    if (!companion || training) { toast.show({ tone: 'danger', icon: 'warning', message: 'Tu compañero está entrenando y no puede pelear.' }); return; }
    if (fainted) { toast.show({ tone: 'danger', icon: 'warning', message: 'Tu compañero está debilitado. Curalo con una poción antes de pelear.' }); return; }
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
          disabled={!companion || blocked}
          onClick={() => setComposing((v) => !v)}
        >
          ⚔ Crear duelo
        </button>
      </div>

      {!companion && (
        <div className="d-empty" style={{ marginTop: 18 }}>Todavía no tenés compañero. Adoptá una criatura desde su ficha para poder pelear.</div>
      )}
      {training && (
        <div className="d-empty" style={{ marginTop: 18, color: 'var(--gold-soft)' }}>
          <b style={{ color: 'var(--gold-soft)' }}>{monsterName}</b> está entrenando en la escuela y no puede pelear hasta que termine.
        </div>
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
              <button className="btn btn-primary btn-sm" disabled={blocked || !companion} onClick={() => join(d)}>Inscribirse</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============ ESCUELA DE ENTRENAMIENTO ============ */
// Etiqueta humana de cada disciplina entrenable.
const STAT_LABEL: Record<TrainStat, string> = {
  strength: 'Fuerza', defense: 'Defensa', speed: 'Velocidad', health: 'Salud', level: 'Nivel',
};
// Etiqueta humana de la rareza del tótem exigido.
const RARITY_ES: Record<string, string> = {
  common: 'común', uncommon: 'poco común', rare: 'raro', epic: 'épico', legendary: 'legendario',
};
// Duración en d / hh:mm:ss a partir de segundos (los entrenamientos duran días).
function fmtDur(secs: number) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const hms = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

function TrainingBody({ placeId }: { placeId: number }) {
  const { user } = useAuth();
  const { data: companion } = useActiveCompanion(user?.id ?? null);
  const [info, setInfo] = useState<TrainingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<TrainStat | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  const companionId = companion?.id ?? null;

  // Carga el estado de la escuela para el compañero activo.
  const load = useCallback(async () => {
    if (!companionId) { setLoading(false); return; }
    setLoading(true);
    try {
      const i = await trainingService.getInfo(placeId, companionId);
      setInfo(i);
    } catch {
      setMsg('No se pudo cargar la escuela.');
    } finally {
      setLoading(false);
    }
  }, [placeId, companionId]);

  useEffect(() => { load(); }, [load]);

  // Cuenta regresiva del entrenamiento en curso; al llegar a 0 recarga (el +gain
  // ya se aplicó en el server y el compañero queda libre).
  const trainingSecs = info?.status === 'training' ? info.secondsLeft : null;
  useEffect(() => {
    if (trainingSecs == null) { setSecsLeft(null); return; }
    setSecsLeft(trainingSecs);
    const t = setInterval(() => {
      setSecsLeft((s) => {
        if (s == null) return null;
        if (s <= 1) { clearInterval(t); load(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [trainingSecs, load]);

  const train = async (stat: TrainStat) => {
    if (!companionId) return;
    setBusy(stat); setMsg(null);
    try {
      const i = await trainingService.start(placeId, companionId, stat);
      setInfo(i);
      setMsg(`¡${STAT_LABEL[stat]} en entrenamiento! Volvé cuando termine.`);
    } catch {
      setMsg('No se pudo iniciar el entrenamiento (¿tenés el tótem que pide el maestro?).');
    } finally {
      setBusy(null);
    }
  };

  if (!user) {
    return (
      <div className="panel" style={{ padding: '34px 36px', marginTop: 26, textAlign: 'center' }}>
        <h3 className="cinzel" style={{ color: '#F6ECD7', marginBottom: 8 }}>Escuela de entrenamiento</h3>
        <p className="sub" style={{ margin: '0 auto 18px' }}>Iniciá sesión para entrenar a tu compañero.</p>
        <Link className="btn btn-primary" href="/login">Iniciar sesión</Link>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="d-empty" style={{ marginTop: 26 }}>
        Todavía no tenés compañero. Adoptá una criatura desde su ficha para poder entrenarla.
      </div>
    );
  }

  const trainer = info?.trainer ?? null;

  return (
    <div className="train-wrap">
      {/* Tarjeta del entrenador (siempre visible) */}
      {trainer && (
        <div className="panel train-trainer">
          <img
            className="train-trainer-img"
            src={trainer.imageUrl ? strapiMedia(trainer.imageUrl) : thumbFallback(trainer.name)}
            alt={trainer.name}
          />
          <div>
            <div className="kicker">Maestro de la escuela</div>
            <h3 className="cinzel" style={{ color: '#F6ECD7', margin: '4px 0 8px' }}>{trainer.name}</h3>
            <p className="sub" style={{ marginBottom: 10 }}>
              Especialista en{' '}
              <b style={{ color: 'var(--gold-soft)' }}>
                {trainer.specialties.map((s) => STAT_LABEL[s]).join(' y ') || '—'}
              </b>
              . Entrenar esas disciplinas con él sube <b>+2</b> en vez de +1.
            </p>
            <div className="train-spec-row">
              {trainer.specialties.map((s) => (
                <span key={s} className="train-spec">{STAT_LABEL[s]} +2</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {msg && <p className="sub" style={{ margin: '4px 0', color: 'var(--gold-soft)' }}>{msg}</p>}
      {loading && <Loading />}

      {/* Entrenamiento en curso */}
      {!loading && info?.status === 'training' && (
        <div className="panel" style={{ padding: '30px 34px', textAlign: 'center' }}>
          <div className="kicker" style={{ marginBottom: 8 }}>Entrenamiento en curso</div>
          <h3 className="cinzel" style={{ color: 'var(--gold-soft)', marginBottom: 6 }}>
            Entrenando {STAT_LABEL[info.stat]} (+{info.gain})
          </h3>
          <p className="sub" style={{ marginBottom: 14 }}>
            Tu compañero está en plena disciplina. No puede pelear hasta terminar.
          </p>
          <div className="train-clock cinzel">{fmtDur(secsLeft ?? info.secondsLeft)}</div>
        </div>
      )}

      {/* Libre: tótem exigido + grilla de disciplinas */}
      {!loading && info?.status === 'idle' && (
        <>
          <div className="panel train-demand">
            <div className="train-totem">
              {info.demandedTotem ? (
                <>
                  <img
                    src={info.demandedTotem.iconUrl ? strapiMedia(info.demandedTotem.iconUrl) : thumbFallback(info.demandedTotem.name)}
                    alt={info.demandedTotem.name}
                  />
                  <div>
                    <div className="kicker">El maestro exige</div>
                    <div className="cinzel" style={{ fontSize: 22, color: '#F6ECD7' }}>{info.demandedTotem.name}</div>
                    <div className="sub">
                      Tótem {RARITY_ES[info.demandedTotem.rarity] ?? info.demandedTotem.rarity} ·{' '}
                      {info.ownsDemanded
                        ? <b style={{ color: 'var(--verdant, #7bbf6a)' }}>Lo tenés ✓</b>
                        : <b style={{ color: 'var(--danger)' }}>No lo tenés — conseguilo en una tienda</b>}
                    </div>
                  </div>
                </>
              ) : (
                <div className="sub">No hay tótems disponibles para el nivel de tu compañero.</div>
              )}
            </div>
            <div className="train-meta">
              <div><b className="cinzel" style={{ color: 'var(--gold-soft)', fontSize: 20 }}>Nv. {info.level}</b><div className="sub">Nivel</div></div>
              <div><b className="cinzel" style={{ color: 'var(--gold-soft)', fontSize: 20 }}>{info.days}d</b><div className="sub">Duración</div></div>
            </div>
          </div>

          <div className="sec-title"><h3 className="cinzel">Disciplinas</h3></div>
          <p className="sub" style={{ marginBottom: 18 }}>
            Cada característica puede entrenarse hasta el doble del nivel. Para superar ese tope, subí el nivel.
          </p>
          <div className="train-grid">
            {info.stats.map((st) => {
              const capped = !st.canTrain;
              const disabled = busy != null || capped || !info.ownsDemanded;
              return (
                <div key={st.key} className={`panel train-stat${capped ? ' is-capped' : ''}`}>
                  <div className="train-stat-top">
                    <span className="cinzel">{STAT_LABEL[st.key]}</span>
                    <span className={`train-gain${st.gain > 1 ? ' boon' : ''}`}>+{st.gain}</span>
                  </div>
                  <div className="train-stat-val">
                    <b>{st.value}</b>
                    <span className="sub"> / {st.cap}{st.key === 'level' ? '' : st.key === 'health' ? ' (4× nivel)' : ' (2× nivel)'}</span>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={disabled}
                    onClick={() => train(st.key)}
                  >
                    {capped ? 'Tope alcanzado' : busy === st.key ? 'Iniciando…' : 'Entrenar'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
