/**
 * Helpers del design system de Force.
 * Única fuente de verdad para los mapas de rareza / bioma / tipo de lugar
 * (portados de las constantes inline de los prototipos) + utilidades de media.
 */
import React from 'react';
import type { StrapiImage } from '@/api/types';

/* ============ TIPOS ============ */
export type Biome = 'forest' | 'aqua' | 'volcanic' | 'space' | 'snow' | 'arid';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type PlaceType = 'shop' | 'game' | 'information' | 'battledome';
export type ItemType = 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';

/* ============ RAREZA ============ */
export const RARITY: Record<Rarity, { label: string; pill: string; g: string; bd: string; c: string }> = {
  common:    { label: 'Común',       pill: 'p-common',    g: 'rgba(154,161,168,.3)',  bd: 'rgba(154,161,168,.45)', c: '#bcc2c8' },
  uncommon:  { label: 'Poco común',  pill: 'p-uncommon',  g: 'rgba(84,178,74,.38)',   bd: 'rgba(84,178,74,.5)',    c: '#7ed074' },
  rare:      { label: 'Raro',        pill: 'p-rare',      g: 'rgba(62,139,224,.38)',  bd: 'rgba(62,139,224,.5)',   c: '#73b0f0' },
  epic:      { label: 'Épico',       pill: 'p-epic',      g: 'rgba(154,87,228,.4)',   bd: 'rgba(154,87,228,.5)',   c: '#bd8ff0' },
  legendary: { label: 'Legendario',  pill: 'p-legendary', g: 'rgba(236,164,42,.45)',  bd: 'rgba(236,164,42,.55)',  c: '#f4c969' },
};

/* ============ TIPOS DE OBJETO ============ */
export const ITEM_TYPE_ES: Record<ItemType, string> = {
  weapon: 'Arma', armor: 'Armadura', consumable: 'Consumible', key: 'Llave', misc: 'Misceláneo',
};

/* ============ BIOMAS ============ */
export const BIOME: Record<Biome, { label: string; className: string }> = {
  forest:   { label: 'Bosque',    className: 'bi-forest' },
  aqua:     { label: 'Acuático',  className: 'bi-aqua' },
  volcanic: { label: 'Volcánico', className: 'bi-volcanic' },
  space:    { label: 'Espacial',  className: 'bi-space' },
  snow:     { label: 'Nevado',    className: 'bi-snow' },
  arid:     { label: 'Árido',     className: 'bi-arid' },
};

const BIOME_PATHS: Record<Biome, React.ReactNode> = {
  forest:   <path d="M5 21c8 0 13-5 13-13 0-1 0-2-.2-3C9 5 4 10 4 18c0 1 .3 2 1 3z" />,
  aqua:     <path d="M12 3s6 6 6 11a6 6 0 0 1-12 0c0-5 6-11 6-11z" />,
  volcanic: <path d="M12 3c1 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 1 .5 2 1.5 2C11 9 10 6 12 3z" />,
  space:    <path d="M12 3l2.2 5.5L20 9l-4.5 3.5L17 18l-5-3-5 3 1.5-5.5L4 9l5.8-.5z" />,
  snow:     <path d="M12 2v20M4 7l16 10M20 7L4 17" />,
  arid:     <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
};

export function BiomeIcon({ biome }: { biome: Biome }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      {BIOME_PATHS[biome]}
    </svg>
  );
}

/* ============ TIPOS DE LUGAR ============ */
export const PLACE_TYPE: Record<PlaceType, { label: string; pill: string }> = {
  shop:        { label: 'Tienda',      pill: 'tp-shop' },
  game:        { label: 'Juego',       pill: 'tp-game' },
  information: { label: 'Información', pill: 'tp-info' },
  battledome:  { label: 'Battledome',  pill: 'tp-battledome' },
};

const PLACE_TYPE_PATHS: Record<PlaceType, React.ReactNode> = {
  shop:        <path d="M3 9l1-5h16l1 5M5 9v10h14V9M9 13h6" />,
  game:        <><rect x="2" y="7" width="20" height="11" rx="4" /><path d="M7 12h3M8.5 10.5v3M16 11h.01M18 13h.01" /></>,
  information: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.5h.01" /></>,
  battledome:  <><path d="M14.5 14.5 20 20l1-3-3-1-5.5-5.5M9.5 14.5 4 20l-1-3 3-1 5.5-5.5" /><path d="M13 11l6.5-6.5 1.5 0 0 1.5L14.5 12.5M11 11 4.5 4.5 3 4.5 3 6l6.5 6.5" /></>,
};

export function PlaceTypeIcon({ type }: { type: PlaceType }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      {PLACE_TYPE_PATHS[type]}
    </svg>
  );
}

/* Verbo del CTA según el tipo de lugar */
export const PLACE_CTA: Record<PlaceType, string> = {
  shop: 'Visitar mercado →', game: 'Jugar →', information: 'Explorar →',
  battledome: 'Entrar a la arena →',
};

/* Bioma del lugar → clase de arena del battledome (fondo animado). */
export const ARENA_CLASS: Record<Biome, string> = {
  arid: 'arena--arido', snow: 'arena--nevado', volcanic: 'arena--volcanico',
  forest: 'arena--bosque', space: 'arena--espacial', aqua: 'arena--acuatico',
};
/* Bioma del lugar → etiqueta de la arena. */
export const ARENA_LABEL: Record<Biome, string> = {
  arid: 'Arena Árida', snow: 'Arena Nevada', volcanic: 'Arena Volcánica',
  forest: 'Arena Boscosa', space: 'Arena Espacial', aqua: 'Arena Acuática',
};
/* Bioma → tipo de partícula del fondo de la arena. */
export const ARENA_PARTICLE: Record<Biome, { kind: string; n: number }> = {
  arid: { kind: 'dust', n: 26 }, snow: { kind: 'snow', n: 34 },
  volcanic: { kind: 'ember', n: 30 }, forest: { kind: 'leaf', n: 24 },
  space: { kind: 'star', n: 46 }, aqua: { kind: 'bubble', n: 28 },
};

/* ============ MEDIA ============ */
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

/** Prefija el host de Strapi a una URL relativa de media. */
export function strapiMedia(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/design/')) return url;
  return `${STRAPI_URL}${url}`;
}

/**
 * Extrae la URL de un campo media de Strapi, con fallback opcional
 * (p. ej. un asset de mockup en /design/...).
 */
export function mediaUrl(media: StrapiImage | null | undefined, fallback = ''): string {
  const url = media?.data?.attributes?.url;
  return url ? strapiMedia(url) : fallback;
}

/* ============ FALLBACKS DE ARTE (assets de mockup) ============
   Si una entidad no tiene media en Strapi, caemos a los assets de mockup
   copiados en /public/design (coinciden por nombre con los datos sembrados).
*/
const PLACE_FALLBACK: Record<string, string> = {
  'Isla del Reposo de la Serpiente': '/design/places/Serpent_s_Rest_Island_6fb4156c8e.png',
  'Atalaya de Obsidiana': '/design/places/Obsidian_Watchtower_98a7d946da.png',
  'Ciudadela de la Cumbre Helada': '/design/places/Frostpeak_Citadel_72eea5554f.png',
  'Cañada Verdante': '/design/places/Verdant_Hollow_98629f3361.png',
};

/** Arte de mundo (orbe). */
export function worldArtFallback(name: string): string {
  return `/design/art/world-${encodeURIComponent(name)}.png`;
}
/** Arte grande de monstruo (ficha). */
export function monsterArtFallback(name: string): string {
  return `/design/art/mon-${encodeURIComponent(name)}.png`;
}
/** Recorte transparente del monstruo (peleador en la arena del battledome). */
export function monsterCutoutFallback(name: string): string {
  return `/design/art/cut-${encodeURIComponent(name)}.png`;
}
/** Miniatura (monstruo en tarjeta u objeto en slot). */
export function thumbFallback(name: string): string {
  return `/design/thumbs/${encodeURIComponent(name)}.png`;
}
/** Banner de lugar. */
export function placeBannerFallback(name: string): string {
  return PLACE_FALLBACK[name] ?? '';
}

/* ============ FORMATO ============ */
/** Formatea un número con separador de miles en es (1480 -> "1.480"). */
export function fmt(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString('es');
}
