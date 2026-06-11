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

/** Encabezado de sección con link opcional a la derecha. */
export function SectionTitle({ title, href, action }: { title: string; href?: string; action?: string }) {
  return (
    <div className="sec-title">
      <h3 className="cinzel">{title}</h3>
      {href && <a href={href}>{action ?? 'Ver todos →'}</a>}
    </div>
  );
}
