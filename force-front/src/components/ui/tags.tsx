import {
  BIOME, BiomeIcon, RARITY, PLACE_TYPE, PlaceTypeIcon,
  type Biome, type Rarity, type PlaceType,
} from '@/lib/design';

/** Etiqueta de bioma. `abs` la posiciona como overlay (biome-abs). */
export function BiomeTag({ biome, abs = false }: { biome: Biome | null | undefined; abs?: boolean }) {
  if (!biome || !BIOME[biome]) return null;
  return (
    <span className={`biome ${BIOME[biome].className}${abs ? ' biome-abs' : ''}`}>
      <BiomeIcon biome={biome} />
      {BIOME[biome].label}
    </span>
  );
}

/** Insignia de rareza. */
export function RarityPill({ rarity }: { rarity: Rarity }) {
  const r = RARITY[rarity];
  return <span className={`pill ${r.pill}`}>{r.label}</span>;
}

/** Insignia de tipo de lugar (shop / game / information). */
export function TypePill({ type }: { type: PlaceType }) {
  const t = PLACE_TYPE[type];
  return (
    <span className={`type-pill ${t.pill}`}>
      <PlaceTypeIcon type={type} />
      {t.label}
    </span>
  );
}

/** Medidor de stat con relleno coloreado. */
export function Meter({
  label, value, fill = 'fill-gold', last = false,
}: { label: string; value: number; fill?: string; last?: boolean }) {
  return (
    <div className="meter" style={last ? { marginBottom: 0 } : undefined}>
      <div className="top"><span>{label}</span><b>{value}%</b></div>
      <div className="bar"><i className={fill} style={{ width: `${value}%` }} /></div>
    </div>
  );
}

/** Ficha numérica de un stat de progresión/combate (valor absoluto, no %). */
export function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px',
      borderRadius: 12, background: 'rgba(0,0,0,.18)',
      border: '1px solid rgba(214,181,130,.25)', minWidth: 64,
    }}>
      <span style={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase', color: '#C9B48E', opacity: .85 }}>{label}</span>
      <b style={{ fontSize: 20, color: '#F6ECD7', fontVariantNumeric: 'tabular-nums' }}>{value}</b>
    </div>
  );
}

/** Grilla de stats base de progresión/combate del compañero. */
export function CompanionStats({ stats }: {
  stats: { health: number; strength: number; defense: number; speed: number; luck: number; level: number };
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
      <StatChip label="Nivel" value={stats.level} />
      <StatChip label="Salud" value={stats.health} />
      <StatChip label="Fuerza" value={stats.strength} />
      <StatChip label="Defensa" value={stats.defense} />
      <StatChip label="Velocidad" value={stats.speed} />
      <StatChip label="Suerte" value={stats.luck} />
    </div>
  );
}

/* ============ Compañero — diseño de stats ============ */

// Metadatos por stat de combate: etiqueta, tope para normalizar la barra,
// clase de relleno e ícono. Los topes dejan margen para crecer (salud ~150,
// el trío fuerza/defensa/velocidad ~20, acorde al presupuesto base por especie).
const STAT_META = {
  health:   { label: 'Salud',     max: 150, fill: 'cmp-fill-health', icon: <path d="M12 20s-7-4.4-9.2-8.2C1 8.6 2.7 5.3 6 5.3c2 0 3.2 1.3 4 2.6.8-1.3 2-2.6 4-2.6 3.3 0 5 3.3 3.2 6.5C19 15.6 12 20 12 20z" /> },
  strength: { label: 'Fuerza',    max: 20,  fill: 'cmp-fill-str',    icon: <path d="M14.5 3.5l6 6-3 3-1.5-1.5-7 7 1.5 1.5-2 2-6-6 2-2 1.5 1.5 7-7-1.5-1.5z" /> },
  defense:  { label: 'Defensa',   max: 20,  fill: 'cmp-fill-def',    icon: <path d="M12 3l7 2.5v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10v-5L12 3z" /> },
  speed:    { label: 'Velocidad', max: 20,  fill: 'cmp-fill-spd',    icon: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /> },
} as const;

type StatKind = keyof typeof STAT_META;

/** Barra de una stat de combate real (valor absoluto + relleno normalizado al tope). */
export function StatBar({ kind, value }: { kind: StatKind; value: number }) {
  const m = STAT_META[kind];
  const pct = Math.max(4, Math.min(100, (value / m.max) * 100));
  return (
    <div className="cmp-stat">
      <div className="cmp-stat-h">
        <svg className="cmp-stat-ic" viewBox="0 0 24 24">{m.icon}</svg>
        <span className="lb">{m.label}</span>
        <b className="vl">{value}</b>
      </div>
      <div className="cmp-bar"><i className={m.fill} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/** Las 4 barras de combate del compañero (salud, fuerza, defensa, velocidad). */
export function CompanionStatBars({ stats }: {
  stats: { health: number; strength: number; defense: number; speed: number };
}) {
  return (
    <div className="cmp-bars">
      <StatBar kind="health" value={stats.health} />
      <StatBar kind="strength" value={stats.strength} />
      <StatBar kind="defense" value={stats.defense} />
      <StatBar kind="speed" value={stats.speed} />
    </div>
  );
}

/**
 * Nivel: número grande con una rueda (anillo de progreso) alrededor que se vacía
 * en nivel 1 y se llena en `max` (100). El relleno es (level-1)/(max-1).
 */
export function LevelRing({ level, max = 100 }: { level: number; max?: number }) {
  const size = 140, sw = 9, r = (size - sw) / 2 - 1, c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (level - 1) / (max - 1)));
  return (
    <div className="cmp-ring">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="lvlGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F4C969" />
            <stop offset="100%" stopColor="#BE801A" />
          </linearGradient>
        </defs>
        <circle className="cmp-ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw} />
        <circle
          className="cmp-ring-prog" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={sw}
          stroke="url(#lvlGrad)" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="cmp-ring-c">
        <b>{level}</b>
        <span>Nivel</span>
      </div>
    </div>
  );
}

/**
 * Suerte: diseño aparte del resto — un medallón-trébol con halo y destellos cuya
 * intensidad escala con la suerte (no es una barra). El valor va dentro del trébol.
 */
export function LuckCharm({ luck, max = 20 }: { luck: number; max?: number }) {
  const t = Math.max(0, Math.min(1, luck / max));
  // 6 destellos en órbita; se "encienden" de forma proporcional a la suerte.
  const sparks = Array.from({ length: 6 }, (_, i) => i);
  const lit = Math.round(t * sparks.length);
  return (
    <div className="cmp-luck" style={{ ['--luck' as string]: t }}>
      <div className="cmp-luck-orbit">
        {sparks.map((i) => {
          const a = (-90 + i * 60) * (Math.PI / 180);
          return (
            <span
              key={i}
              className={`cmp-luck-spark${i < lit ? ' on' : ''}`}
              style={{ left: `${50 + 48 * Math.cos(a)}%`, top: `${50 + 48 * Math.sin(a)}%` }}
            />
          );
        })}
        <div className="cmp-luck-medal">
          <svg viewBox="0 0 48 48" className="cmp-luck-clover" aria-hidden>
            <path d="M24 24c0-5-3-8-3-11a4 4 0 1 1 8 0c0 3-2 6-2 8 2-2 5-4 8-4a4 4 0 1 1 0 8c-3 0-6-2-8-2 2 2 4 5 4 8a4 4 0 1 1-8 0c0-3 2-6 2-8-2 2-5 4-8 4a4 4 0 1 1 0-8c3 0 6 2 8 2-2-2-3-3-3-5z" />
          </svg>
          <span className="cmp-luck-num">{luck}</span>
        </div>
      </div>
      <span className="cmp-luck-lab">Suerte</span>
    </div>
  );
}

// Ejes del radar de stats base, en el orden del diseño (Velocidad arriba, luego
// horario). `max` normaliza el radio de cada stat a 0..1 dejando margen para el
// crecimiento futuro; la etiqueta muestra el valor real de la especie.
const RADAR_AXES = [
  { key: 'speed', label: 'Velocidad', max: 20 },
  { key: 'strength', label: 'Fuerza', max: 20 },
  { key: 'defense', label: 'Defensa', max: 20 },
  { key: 'health', label: 'Salud', max: 150 },
] as const;

type RadarStats = { health: number; strength: number; defense: number; speed: number; luck: number; level: number };

/**
 * Polígono (radar) de estadísticas base — diseño del Force Design System:
 * relleno con gradiente dorado, anillos concéntricos, radios y etiquetas
 * (nombre en Fredoka + valor en Cinzel dorado). Lienzo fijo 240×240, R=86.
 */
export function StatsRadar({ stats }: { stats: RadarStats }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 86;
  const n = RADAR_AXES.length;
  const ang = (i: number) => ((-90 + (i * 360) / n) * Math.PI) / 180; // arranca arriba, sentido horario
  const at = (i: number, r: number): [number, number] => [cx + r * Math.cos(ang(i)), cy + r * Math.sin(ang(i))];
  const norm = (i: number) => Math.max(0, Math.min(1, stats[RADAR_AXES[i].key] / RADAR_AXES[i].max));
  const poly = (pts: [number, number][]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const dpts = RADAR_AXES.map((_, i) => at(i, R * norm(i)));

  return (
    <div className="radar-fig">
      <svg viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="radarFill" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#F4C969" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#E6A630" stopOpacity={0.18} />
          </radialGradient>
        </defs>
        {/* anillos concéntricos */}
        {[0.25, 0.5, 0.75, 1].map((lv) => (
          <polygon key={lv} className={`radar-grid${lv === 1 ? ' outer' : ''}`} points={poly(RADAR_AXES.map((_, i) => at(i, R * lv)))} />
        ))}
        {/* radios */}
        {RADAR_AXES.map((_, i) => {
          const [x, y] = at(i, R);
          return <line key={i} className="radar-spoke" x1={cx} y1={cy} x2={x.toFixed(1)} y2={y.toFixed(1)} />;
        })}
        {/* área de datos */}
        <polygon className="radar-area" points={poly(dpts)} />
        {/* vértices */}
        {dpts.map((p, i) => <circle key={i} className="radar-vtx" cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={3.5} />)}
      </svg>
      {/* etiquetas justo por fuera de cada eje */}
      {RADAR_AXES.map((ax, i) => {
        const [px, py] = at(i, R + 26);
        return (
          <div key={ax.key} className="radar-lab" style={{ left: `${(px / size) * 100}%`, top: `${(py / size) * 100}%` }}>
            <div className="nm">{ax.label}</div>
            <div className="vl">{stats[ax.key]}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Encabezado de sección con link opcional a la derecha. */
export function SectionTitle({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="sec-title">
      <h3 className="cinzel">{title}</h3>
      {href && <a href={href}>{action ?? 'Ver todos →'}</a>}
    </div>
  );
}
