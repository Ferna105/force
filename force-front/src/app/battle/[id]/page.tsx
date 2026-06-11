'use client';

/* eslint-disable @next/next/no-img-element */
/* Pantalla de batalla en vivo del Battledome (/battle/:id).
   El servidor de sockets es autoritativo: emitimos jugadas (`duel:move`) y
   renderizamos el estado que difunde (`duel:state`). Mi criatura va a la
   izquierda, el rival a la derecha, sin importar quién creó el duelo. */
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { battleService } from '@/api';
import type {
  DuelDetail, BattleState, BattleLogEntry, BattleResult, DuelSide, BattleAction, BattleItem, BattleCompanion,
} from '@/api/types';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  ARENA_CLASS, ARENA_LABEL, ARENA_PARTICLE, RARITY,
  monsterCutoutFallback, strapiMedia, thumbFallback, fmt, type Biome,
} from '@/lib/design';
import { connectDuelSocket } from '@/lib/socket';
import Topbar from '@/components/shell/Topbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Loading, ErrorState } from '@/components/ui/states';

const other = (s: DuelSide): DuelSide => (s === 'creator' ? 'opponent' : 'creator');

const ACTIONS: { a: BattleAction; label: string; sub: string; icon: React.ReactNode }[] = [
  { a: 'atacar', label: 'Atacar', sub: 'Daño al rival', icon: <><path d="M12 3l1.6 2.3v7.7h-3.2V5.3L12 3z" /><path d="M8.8 13h6.4M12 13v6M10.2 19h3.6" /></> },
  { a: 'defender', label: 'Defender', sub: 'Reduce el golpe', icon: <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" /> },
  { a: 'esquivar', label: 'Esquivar', sub: 'Chance de evadir', icon: <path d="M4 12h10M10 7l5 5-5 5M20 5v14" /> },
];

interface Floater { id: number; lr: 'me' | 'foe'; text: string; type: string; }

// Imagen del peleador: la del monster en el content (Strapi); si no hay, cae al
// recorte transparente por nombre y por último a la miniatura.
function cutoutSrc(name: string, imageUrl: string | null): string {
  return imageUrl ? strapiMedia(imageUrl) : (monsterCutoutFallback(name) || thumbFallback(name));
}

function BattleScreen() {
  const params = useParams();
  const duelId = Number(params.id);
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [duel, setDuel] = useState<DuelDetail | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [state, setState] = useState<BattleState | null>(null);
  const [log, setLog] = useState<BattleLogEntry[]>([]);
  const [phase, setPhase] = useState<'loading' | 'waiting' | 'fighting' | 'over'>('loading');
  const [result, setResult] = useState<BattleResult | null>(null);
  const [selItem, setSelItem] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [fx, setFx] = useState<{ me: boolean; foe: boolean }>({ me: false, foe: false });
  const [hint, setHint] = useState('Elegí tu jugada. Equipar un objeto es opcional.');

  const socketRef = useRef<Socket | null>(null);
  const balanceRef = useRef(0);
  balanceRef.current = user?.balance ?? 0;
  const duelRef = useRef<DuelDetail | null>(null);
  duelRef.current = duel;

  // Lado del usuario en este duelo (estable una vez cargado).
  const mySide: DuelSide | null = duel && user
    ? (duel.creator?.userId === user.id ? 'creator' : duel.opponent?.userId === user.id ? 'opponent' : null)
    : null;
  const mySideRef = useRef<DuelSide | null>(null);
  mySideRef.current = mySide;

  const myComp: BattleCompanion | null = duel && mySide ? (mySide === 'creator' ? duel.creatorCompanion : duel.opponentCompanion) : null;
  const foeComp: BattleCompanion | null = duel && mySide ? (mySide === 'creator' ? duel.opponentCompanion : duel.creatorCompanion) : null;

  // --- Carga del duelo ---
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await battleService.get(duelId);
        if (!alive) return;
        setDuel(d);
        if (d.status === 'finished' && d.result) { setResult(d.result); setPhase('over'); }
        else setPhase(d.status === 'active' ? 'fighting' : 'waiting');
      } catch {
        if (alive) setLoadErr('No se pudo cargar el duelo.');
      }
    })();
    return () => { alive = false; };
  }, [duelId]);

  // Recarga el duelo (sin tocar la fase): se usa cuando un rival se inscribe
  // mientras esperábamos, para traer su compañero (imagen, nivel, datos), que
  // el duelo cargado en memoria todavía no tenía.
  const refetchDuel = useCallback(async () => {
    try {
      const d = await battleService.get(duelId);
      setDuel(d);
    } catch { /* noop: el socket sigue siendo la fuente de verdad del combate */ }
  }, [duelId]);

  // --- Animaciones derivadas del historial ---
  const addFloater = useCallback((lr: 'me' | 'foe', text: string, type: string) => {
    const id = Date.now() + Math.random();
    setFloaters((f) => [...f, { id, lr, text, type }]);
    setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1150);
  }, []);
  const hitFx = useCallback((lr: 'me' | 'foe') => {
    setFx((f) => ({ ...f, [lr]: true }));
    setTimeout(() => setFx((f) => ({ ...f, [lr]: false })), 460);
  }, []);

  // --- Socket: conexión + listeners ---
  // Se conecta una sola vez cuando el duelo y mi lado están listos. No depende
  // del objeto `duel` para no reconectar al recargarlo (los handlers leen el
  // estado vivo por refs).
  const ready = !!duel && !!mySide;
  useEffect(() => {
    if (!ready) return;
    const socket = connectDuelSocket();
    socketRef.current = socket;
    const lrOf = (side: DuelSide): 'me' | 'foe' => (side === mySideRef.current ? 'me' : 'foe');

    socket.on('connect', () => socket.emit('duel:join', { duelId }));
    socket.on('duel:waiting', () => { setPhase((p) => (p === 'over' ? p : 'waiting')); });
    socket.on('duel:state', ({ state: s }: { state: BattleState }) => {
      setState(s);
      setSubmitting(false);
      // El combate arrancó: si el rival se inscribió mientras esperábamos, el
      // duelo en memoria todavía no lo tiene. Lo recargamos para mostrar su
      // imagen y datos (el estado de combate no trae la imagen del compañero).
      const d = duelRef.current;
      const foe = d && (mySideRef.current === 'creator' ? d.opponentCompanion : d.creatorCompanion);
      if (!foe) refetchDuel();
      if (s.over) return;
      setPhase('fighting');
    });
    socket.on('duel:log', ({ entry }: { entry: BattleLogEntry }) => {
      setLog((l) => [entry, ...l]);
      const actorLR = lrOf(entry.side);
      const defLR = lrOf(other(entry.side));
      if (entry.action === 'atacar') {
        if (entry.miss) addFloater(defLR, 'Falló', 'miss');
        else { addFloater(defLR, `-${entry.dmg}`, entry.crit ? 'crit' : 'dmg'); hitFx(defLR); }
      } else if (entry.action === 'defender' && entry.heal) {
        addFloater(actorLR, `+${entry.heal}`, 'heal');
      }
    });
    socket.on('duel:over', ({ result: r }: { result: BattleResult }) => {
      setResult(r);
      setPhase('over');
      // El ganador se lleva el pozo (2× la apuesta): refleja el saldo en memoria.
      if (r.winner === mySideRef.current && r.wager > 0) {
        updateUser({ balance: balanceRef.current + r.wager * 2 });
      }
    });
    socket.on('duel:opponentLeft', () => {
      toast.show({ tone: 'info', icon: 'info', message: 'El rival se desconectó. Si no vuelve, ganás por abandono.', duration: 4000 });
    });
    socket.on('duel:error', ({ message }: { message: string }) => {
      toast.show({ tone: 'danger', icon: 'warning', message });
      setSubmitting(false);
    });

    return () => { socket.disconnect(); socketRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, duelId]);

  if (phase === 'loading') return <><Topbar crumb="Duelo" /><div className="page"><Loading /></div></>;
  // El rival (foeComp) puede no existir todavía mientras se espera que alguien se
  // inscriba: en ese caso se muestra la sala de espera, no un error.
  if (loadErr || !duel || !mySide || !myComp) {
    return <><Topbar crumb="Duelo" /><div className="page"><ErrorState message={loadErr ?? 'Duelo no disponible.'} /></div></>;
  }

  const foeSide = other(mySide);
  const hasFoe = !!foeComp;
  const arena = duel.arena as Biome;
  const backHref = duel.place ? `/explore/${duel.place.worldId}/places/${duel.place.id}` : '/explore';

  // Datos en vivo (del estado) o iniciales (del duelo) para el render.
  const meHp = state ? state[mySide].hp : myComp.currentHealth;
  const meMax = state ? state[mySide].maxHp : myComp.maxHp;
  const foeHp = state ? state[foeSide].hp : (foeComp?.currentHealth ?? 0);
  const foeMax = state ? state[foeSide].maxHp : (foeComp?.maxHp ?? 1);
  const myItems: BattleItem[] = state ? state[mySide].items : myComp.items;

  const myTurn = !!state && !state.over && state.turn === mySide && !submitting && phase === 'fighting';
  const isOver = phase === 'over';
  const fighting = !!state && !state.over;
  const waitingOpponent = !isOver && !fighting;
  const foeName = foeComp?.monsterName ?? 'Esperando rival';
  const myName = myComp.monsterName;

  // Objeto opcional: se puede pelear sin equipo (itemId puede ir en null).
  const play = (action: BattleAction) => {
    if (!myTurn) return;
    setSubmitting(true);
    socketRef.current?.emit('duel:move', { duelId, action, itemId: selItem });
  };

  // Abandonar: en combate es forfeit (perdés la apuesta); esperando rival, el
  // creador cancela el duelo y recupera la apuesta.
  const abandon = () => {
    toast.show({
      tone: 'danger', icon: 'warning',
      message: fighting
        ? <>¿Abandonar el duelo? Perdés la apuesta de <b>F {fmt(duel.wager)}</b>.</>
        : '¿Salir del duelo?',
      secondary: { label: 'Seguir' },
      primary: {
        label: fighting ? 'Abandonar' : 'Salir', variant: 'danger',
        onClick: async () => {
          if (fighting) {
            socketRef.current?.emit('duel:leave', { duelId });
          } else if (mySide === 'creator') {
            try { const res = await battleService.cancel(duelId); updateUser({ balance: res.balance }); } catch { /* noop */ }
          }
          router.push(backHref);
        },
      },
    });
  };

  const win = result?.winner === mySide;

  return (
    <>
      <Topbar crumb={<><Link href={backHref} style={{ color: 'var(--gold-soft)' }}>‹ {duel.place?.name ?? 'Coliseo'}</Link> · <b>Duelo</b></>} />
      <div className="page">
        <div className="bd-head">
          <div>
            <div className="kicker">Arena de combate</div>
            <h1 className="h-page cinzel" style={{ margin: '8px 0 6px' }}>Battledome</h1>
            <p className="sub">Duelo por turnos. Elegí tu jugada (el objeto es opcional).{duel.wager > 0 && <> Pozo en juego: <b style={{ color: 'var(--gold-soft)' }}>F {fmt(duel.wager * 2)}</b>.</>}</p>
          </div>
          {!isOver && (
            <button className="btn btn-secondary" onClick={abandon}>Abandonar</button>
          )}
        </div>

        {/* ARENA */}
        <Arena
          arena={arena}
          round={state?.round ?? 1}
          turnBanner={isOver ? null : myTurn ? 'me' : 'foe'}
          foeName={foeName}
          plates={{
            me: { name: myName, sub: 'Tu criatura', lvl: myComp.level, hp: meHp, max: meMax },
            foe: hasFoe ? { name: foeName, sub: 'Rival', lvl: foeComp!.level, hp: foeHp, max: foeMax } : null,
          }}
          meImg={cutoutSrc(myName, myComp.imageUrl)}
          foeImg={hasFoe ? cutoutSrc(foeName, foeComp!.imageUrl) : null}
          meTurn={myTurn}
          foeTurn={!!state && !state.over && state.turn === foeSide}
          waiting={waitingOpponent}
          fx={fx}
          floaters={floaters}
          result={isOver && result ? { win, foeName, myName, arenaLabel: ARENA_LABEL[arena], backHref } : null}
        />

        {/* HUD + historial */}
        <div className="bd-lower">
          <div className={`panel hud${myTurn ? '' : ' locked'}${(!isOver && !myTurn) ? ' waiting-on' : ''}`} style={{ padding: '22px 24px' }}>
            <div className="hud-turn">
              <span className="lvl" style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-cinzel)', fontWeight: 800, color: '#1a1206', background: 'radial-gradient(circle at 35% 30%,#FBE49C,#E6A630 60%,#A86C10)', flex: 'none' }}>⚔</span>
              <div>
                <div className="tt">{myTurn ? 'Tu turno' : isOver ? 'Combate terminado' : 'Turno del rival'}</div>
                <div className="ts">{myTurn ? 'Elegí tu jugada. Equipar un objeto es opcional.' : isOver ? 'El duelo finalizó.' : waitingOpponent ? 'Esperando que un rival se inscriba…' : `Esperando la jugada de ${foeName}…`}</div>
              </div>
            </div>

            {myItems.length > 0 && (
              <>
                <div className="kicker">Objetos equipados &nbsp;·&nbsp; opcional</div>
                <div className="equip">
                  {myItems.map((it) => {
                    const r = RARITY[it.rarity];
                    const selected = selItem === it.id;
                    return (
                      <button
                        key={it.id}
                        className={`eq${selected ? ' sel' : ''}`}
                        style={{ ['--c' as string]: r.c, ['--g' as string]: r.g, ['--bd' as string]: r.bd } as React.CSSProperties}
                        disabled={!myTurn}
                        // Tocar el objeto seleccionado lo deselecciona (pelea sin equipo).
                        onClick={() => { setSelItem(selected ? null : it.id); setHint(selected ? 'Sin objeto: jugada a mano limpia.' : `Equipado: ${it.name}.`); }}
                      >
                        <div className="ck">✓</div>
                        <div className="ei">{it.iconUrl ? <img src={strapiMedia(it.iconUrl)} alt={it.name} /> : <img src={thumbFallback(it.name)} alt={it.name} />}</div>
                        <div className="en">{it.name}</div>
                        <div className="ed">{it.heal > 0 ? `Cura ${it.heal}` : `ATQ ${it.attack} · DEF ${it.defense}`}</div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="kicker">Jugada</div>
            <div className="actions">
              {ACTIONS.map(({ a, label, sub, icon }) => (
                <button key={a} className="act" data-a={a} disabled={!myTurn} onClick={() => play(a)}>
                  <span className="aic"><svg viewBox="0 0 24 24" strokeLinejoin="round" strokeLinecap="round">{icon}</svg></span>
                  <span className="al">{label}</span><span className="asub">{sub}</span>
                </button>
              ))}
            </div>
            <p className="hint">{myItems.length === 0 ? 'Tu compañero no tiene objetos equipados: peleás con tus jugadas base.' : hint}</p>

            <div className="waiting">
              <div className="spinner" />
              <div className="wt">Esperando al oponente…</div>
              <div className="ws">{waitingOpponent ? 'Cuando un rival se inscriba, arranca el duelo.' : `${foeName} está eligiendo su jugada.`}</div>
            </div>
          </div>

          <div className="rail">
            <div className="panel">
              <h4 className="cinzel">Historial de jugadas</h4>
              <div className="log">
                {log.length === 0 && <div className="empty">Las jugadas aparecerán acá.</div>}
                {log.map((e, i) => (
                  <LogRow key={i} entry={e} mySide={mySide} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* Una entrada del historial, formateada en español. */
function LogRow({ entry, mySide }: { entry: BattleLogEntry; mySide: DuelSide }) {
  const cls = entry.side === mySide ? 'me' : 'foe';
  // El objeto es opcional: si no hay, la jugada es "a mano limpia".
  const withItem = entry.item ? <> con <i>{entry.item.name}</i></> : <> a mano limpia</>;
  let text: React.ReactNode;
  if (entry.action === 'atacar') {
    text = entry.miss
      ? <>atacó{withItem}, pero el golpe fue esquivado.</>
      : <>atacó{withItem} → <span style={{ color: '#ff9c84' }}>{entry.dmg} de daño</span>{entry.crit ? ' ¡crítico!' : ''}.</>;
  } else if (entry.action === 'defender') {
    text = <>se defendió{withItem}{entry.heal ? <> y recuperó <span style={{ color: '#8de07a' }}>{entry.heal} PV</span></> : ''}.</>;
  } else {
    text = <>se preparó para esquivar{withItem} {entry.chance != null && <span style={{ color: '#9fb0bb' }}>({entry.chance}%)</span>}.</>;
  }
  return (
    <div className="li">
      <span className="tag">Ronda {entry.round} · {entry.actorName}</span>
      <b className={cls}>{entry.actorName}</b> {text}
    </div>
  );
}

interface PlateData { name: string; sub: string; lvl: number; hp: number; max: number; }
interface ArenaProps {
  arena: Biome; round: number; turnBanner: 'me' | 'foe' | null; foeName: string;
  plates: { me: PlateData; foe: PlateData | null }; meImg: string; foeImg: string | null;
  meTurn: boolean; foeTurn: boolean; waiting: boolean; fx: { me: boolean; foe: boolean }; floaters: Floater[];
  result: { win: boolean; foeName: string; myName: string; arenaLabel: string; backHref: string } | null;
}

function Arena({ arena, round, turnBanner, foeName, plates, meImg, foeImg, meTurn, foeTurn, waiting, fx, floaters, result }: ArenaProps) {
  const part = ARENA_PARTICLE[arena];
  // Partículas del fondo (posiciones/duraciones aleatorias, fijas por arena).
  const particles = useMemo(() => Array.from({ length: part.n }, () => {
    const sz = part.kind === 'star' ? rnd(1.5, 3) : part.kind === 'ember' ? rnd(2, 4) : part.kind === 'bubble' ? rnd(3, 8) : rnd(2, 5);
    const top = part.kind === 'ember' || part.kind === 'bubble' ? rnd(60, 100) : part.kind === 'star' ? rnd(0, 70) : 0;
    const dur = part.kind === 'ember' ? rnd(2.5, 5) : part.kind === 'bubble' ? rnd(4, 8) : part.kind === 'star' ? rnd(1.5, 3.5) : rnd(5, 11);
    return {
      w: sz, left: rnd(0, 100), top,
      animationDuration: `${dur}s, ${rnd(2, 4).toFixed(1)}s`,
      animationDelay: `${(-rnd(0, dur)).toFixed(2)}s`,
    };
  }), [part.kind, part.n]);

  const hpClass = (p: PlateData) => pct(p.hp, p.max) <= 30 ? ' low' : '';

  return (
    <div className={`arena ${ARENA_CLASS[arena]}`}>
      <div className="bg-sky" />
      <div className="bg-silo" />
      <div className="bg-floor" />
      <div className="bg-rays" />
      <div className="particles">
        {particles.map((p, i) => (
          <span key={i} className={`pt ${part.kind}`} style={{ width: p.w, height: p.w, left: `${p.left}%`, top: `${p.top}%`, animationDuration: p.animationDuration, animationDelay: p.animationDelay }} />
        ))}
      </div>
      <div className="vignette" />

      <div className="arena-bar">
        <span className="env-badge"><span className="dot" style={{ color: PARTICLE_DOT[arena], background: PARTICLE_DOT[arena] }} />{ARENA_LABEL[arena]}</span>
        <span className="round-badge">Ronda <b>{round}</b></span>
      </div>

      {turnBanner && plates.foe && (
        <div className={`turn-banner ${turnBanner}`}>
          {turnBanner === 'me' ? 'Tu turno' : <>Turno de {foeName} <span className="dots"><i /><i /><i /></span></>}
        </div>
      )}
      {waiting && (
        <div className="turn-banner foe">Esperando rival <span className="dots"><i /><i /><i /></span></div>
      )}

      <div className="plate left">
        <div className="pr"><span className="lvl">{plates.me.lvl}</span><span><span className="pn">{plates.me.name}</span><br /><span className="pm">{plates.me.sub}</span></span></div>
        <div className={`hpbar me${hpClass(plates.me)}`}><i style={{ width: `${pct(plates.me.hp, plates.me.max)}%` }} /></div>
        <div className="hp-num"><span>PV</span><b>{Math.max(0, Math.round(plates.me.hp))} / {plates.me.max}</b></div>
      </div>
      {plates.foe && (
        <div className="plate right">
          <div className="pr"><span className="lvl">{plates.foe.lvl}</span><span><span className="pn">{plates.foe.name}</span><br /><span className="pm">{plates.foe.sub}</span></span></div>
          <div className={`hpbar foe${hpClass(plates.foe)}`}><i style={{ width: `${pct(plates.foe.hp, plates.foe.max)}%` }} /></div>
          <div className="hp-num"><span>PV</span><b>{Math.max(0, Math.round(plates.foe.hp))} / {plates.foe.max}</b></div>
        </div>
      )}

      <div className="vs"><div className="em">VS</div></div>

      <div className={`fighter left${meTurn ? ' is-turn' : ''}`} style={{ ['--glow' as string]: 'rgba(230,166,48,.45)', ['--ring' as string]: '#E6A630' } as React.CSSProperties}>
        <div className="platform" />
        <img className={`creature${fx.me ? ' hit' : ''}`} src={meImg} alt={plates.me.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = thumbFallback(plates.me.name); }} />
      </div>
      {foeImg && plates.foe && (
        <div className={`fighter right${foeTurn ? ' is-turn' : ''}`} style={{ ['--glow' as string]: 'rgba(210,75,62,.42)', ['--ring' as string]: '#d24b3e' } as React.CSSProperties}>
          <div className="platform" />
          <img className={`creature${fx.foe ? ' hit' : ''}`} src={foeImg} alt={plates.foe.name} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = thumbFallback(plates.foe!.name); }} />
        </div>
      )}

      {floaters.map((f) => (
        <div key={f.id} className={`floater ${f.type}`} style={{ left: f.lr === 'me' ? '23%' : '77%', top: '40%' }}>{f.text}</div>
      ))}

      {result && (
        <div className={`result show ${result.win ? 'win' : 'lose'}`}>
          <h2>{result.win ? '¡Victoria!' : 'Derrota'}</h2>
          <p>{result.win
            ? `${result.myName} dejó fuera de combate a ${result.foeName} en la ${result.arenaLabel}.`
            : `${result.foeName} venció a ${result.myName} esta vez.`}</p>
          <Link className="btn btn-primary btn-lg" href={result.backHref}>Volver al battledome ✦</Link>
        </div>
      )}
    </div>
  );
}

// Color del puntito del badge de arena por bioma.
const PARTICLE_DOT: Record<Biome, string> = {
  arid: '#e0ad6b', snow: '#dCE9F4', volcanic: '#ef6a2a', forest: '#7fc14f', space: '#9d8bff', aqua: '#48b6d8',
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pct = (hp: number, max: number) => Math.max(0, Math.min(100, (hp / max) * 100));

export default function BattlePage() {
  return (
    <ProtectedRoute>
      <BattleScreen />
    </ProtectedRoute>
  );
}
