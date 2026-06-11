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
