/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { World, Place, Region, Monster } from '@/api/types';
import {
  RARITY, ITEM_TYPE_ES, mediaUrl,
  worldArtFallback, thumbFallback, placeBannerFallback,
  type Rarity, type ItemType,
} from '@/lib/design';
import { BiomeTag, TypePill, RarityPill } from './tags';

/* ---- Tarjeta de Mundo ---- */
export function WorldCard({ world, row = false, short = false }: { world: World; row?: boolean; short?: boolean }) {
  const a = world.attributes;
  const img = mediaUrl(a.Image, worldArtFallback(a.Name));
  const places = a.places?.data?.length ?? 0;
  return (
    <Link className={`world${row ? ' wrow' : ''}${short ? ' wshort' : ''}`} href={`/explore/${world.id}`}>
      <div className="orb">{img && <img src={img} alt={a.Name} />}</div>
      <div className="wb">
        <h4 className="cinzel">{a.Name}</h4>
        {a.Description && <p>{a.Description}</p>}
        <span className="places-n">◆ {places} {places === 1 ? 'lugar' : 'lugares'}</span>
      </div>
    </Link>
  );
}

/* ---- Banner de Lugar ---- */
export function PlaceBanner({ place, worldId, worldName }: { place: Place; worldId?: number; worldName?: string }) {
  const a = place.attributes;
  const world = a.World?.data;
  const wId = worldId ?? world?.id;
  const wName = worldName ?? world?.attributes?.Name;
  const href = wId ? `/explore/${wId}/places/${place.id}` : `/explore/places/${place.id}`;
  const img = mediaUrl(a.Banner, placeBannerFallback(a.Name));
  return (
    <Link className="place" href={href} data-biome={a.Biome ?? ''}>
      {img && <img src={img} alt={a.Name} />}
      <div className="scrim" />
      <div className="ttype"><TypePill type={a.Type} /></div>
      <BiomeTag biome={a.Biome} abs />
      <div className="pb">
        <h3 className="cinzel">{a.Name}</h3>
        {wName && <div className="meta">Mundo · <b>{wName}</b></div>}
      </div>
    </Link>
  );
}

/* ---- Banner de Región (capa intermedia Mundo → Región → Lugar) ---- */
export function RegionCard({ region, worldId }: { region: Region; worldId: number }) {
  const a = region.attributes;
  const places = a.places?.data ?? [];
  // Sin banner propio caemos al banner (o fallback) del primer lugar de la región.
  const first = places[0]?.attributes;
  const fallback = first ? mediaUrl(first.Banner, placeBannerFallback(first.Name)) : '';
  const img = mediaUrl(a.Banner, fallback);
  return (
    <Link className="place" href={`/explore/${worldId}/regions/${region.id}`} data-biome={a.Biome ?? ''}>
      {img && <img src={img} alt={a.Name} />}
      <div className="scrim" />
      <BiomeTag biome={a.Biome} abs />
      <div className="pb">
        <h3 className="cinzel">{a.Name}</h3>
        <div className="meta">◆ {places.length} {places.length === 1 ? 'lugar' : 'lugares'}</div>
      </div>
    </Link>
  );
}

/* Resumen corto de la habilidad/naturaleza para la línea .ab */
function abilitySummary(m: Monster['attributes']): string {
  const src = m.InnateAbility || m.Nature || '';
  return src.split(/[—.\n·]/)[0].trim().slice(0, 40) || 'Criatura';
}

/* ---- Tarjeta de Monstruo (art tile full-bleed) ---- */
export function MonsterCard({ monster, discovered = true }: { monster: Monster; discovered?: boolean }) {
  const a = monster.attributes;
  const img = mediaUrl(a.Image, thumbFallback(a.Name));
  const height = a.AverageHeight != null ? `↥ ${a.AverageHeight.toLocaleString('es')} m` : '';

  if (!discovered) {
    return (
      <div className="mon-card undisc" data-biome={a.Biome ?? ''}>
        <div className="stage">{img && <img src={img} alt="" />}</div>
        <div className="mb">
          <h4 className="cinzel">???</h4>
          <div className="ab">Sin descubrir</div>
          <div className="row2"><span className="st">No catalogada</span></div>
        </div>
      </div>
    );
  }

  return (
    <Link className="mon-card" href={`/monsters/${monster.id}`} data-biome={a.Biome ?? ''}>
      <div className="stage">
        <BiomeTag biome={a.Biome} abs />
        {img && <img src={img} alt={a.Name} />}
      </div>
      <div className="mb">
        <h4 className="cinzel">{a.Name}</h4>
        <div className="ab">{abilitySummary(a)}</div>
        <div className="row2">
          <span className="st">{height}</span>
          {a.AverageWeight != null && <span className="st">{a.AverageWeight.toLocaleString('es')} kg</span>}
        </div>
      </div>
    </Link>
  );
}

/* ---- Slot de Objeto (art tile con glow por rareza) ---- */
export function ItemSlot({
  name, img, rarity, value, qty, type, showValue = true, selected = false, onClick, dataIndex, children,
}: {
  name: string;
  img: string;
  rarity: Rarity;
  value?: number | null;
  qty?: number;
  type?: ItemType;
  showValue?: boolean;
  selected?: boolean;
  onClick?: () => void;
  dataIndex?: number;
  children?: React.ReactNode;
}) {
  const r = RARITY[rarity];
  const rarText = `${r.label}${type && type !== 'misc' ? ` · ${ITEM_TYPE_ES[type].toLowerCase()}` : ''}`;
  return (
    <div
      className={`slot${selected ? ' sel' : ''}`}
      style={{ '--g': r.g, '--bd': r.bd, '--c': r.c } as React.CSSProperties}
      onClick={onClick}
      data-i={dataIndex}
    >
      {showValue && value != null && <span className="val">F {value.toLocaleString('es')}</span>}
      {qty != null && qty > 1 && <span className="qty">×{qty}</span>}
      <div className="imgwrap">{img && <img src={img} alt={name} />}</div>
      <div className="nm">{name}</div>
      <div className="rar">{rarText}</div>
      {children}
    </div>
  );
}

export { RarityPill };
