'use client';

import { BIOME, BiomeIcon, RARITY, type Biome, type Rarity } from '@/lib/design';

/* ---- Estados de carga / error / vacío ---- */
export function Loading({ label = 'Cargando…' }: { label?: string }) {
  return <div className="state"><div className="spinner" /><p>{label}</p></div>;
}

export function ErrorState({ message }: { message?: string }) {
  return (
    <div className="state">
      <p style={{ color: '#f0a097' }}>No pudimos cargar el contenido.</p>
      {message && <p className="sub" style={{ fontSize: 13 }}>{message}</p>}
    </div>
  );
}

export function Empty({ label = 'Nada por aquí todavía.' }: { label?: string }) {
  return <div className="state"><p>{label}</p></div>;
}

/* ---- Filtro de biomas (chips) ---- */
const BIOMES = Object.keys(BIOME) as Biome[];

export function BiomeChips({ value, onChange }: { value: Biome | 'all'; onChange: (v: Biome | 'all') => void }) {
  return (
    <div className="chips">
      <button className={`chip-f${value === 'all' ? ' on' : ''}`} onClick={() => onChange('all')}>
        Todos los biomas
      </button>
      {BIOMES.map((b) => (
        <button key={b} className={`chip-f${value === b ? ' on' : ''}`} onClick={() => onChange(b)}>
          <span style={{ color: `var(--bio-${b})`, display: 'inline-flex' }}><BiomeIcon biome={b} /></span>
          {BIOME[b].label}
        </button>
      ))}
    </div>
  );
}

/* ---- Filtro de rarezas (chips) ---- */
const RARITIES = Object.keys(RARITY) as Rarity[];

export function RarityChips({ value, onChange }: { value: Rarity | 'all'; onChange: (v: Rarity | 'all') => void }) {
  return (
    <div className="chips">
      <button className={`chip-f${value === 'all' ? ' on' : ''}`} onClick={() => onChange('all')}>Todas</button>
      {RARITIES.map((r) => (
        <button key={r} className={`chip-f${value === r ? ' on' : ''}`} onClick={() => onChange(r)}>
          <span className={`pill ${RARITY[r].pill}`} style={{ padding: 0, border: 'none', background: 'none' }} />
          {RARITY[r].label}
        </button>
      ))}
    </div>
  );
}

/* ---- Control segmentado (tabs) ---- */
export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.key} className={value === o.key ? 'on' : ''} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
