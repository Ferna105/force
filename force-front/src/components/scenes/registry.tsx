import type { ComponentType } from 'react';
import type { PlaceSceneProps } from './types';
import LibraryScene from './LibraryScene';
import EstelasScene from './EstelasScene';

/**
 * Registro de escenas interactivas de lugares `information`.
 *
 * La página de lugar (branch `information`) consulta este registro por nombre de
 * lugar y, si hay una escena, la renderiza en vez de la crónica genérica. Cada
 * escena es de un LUGAR (Biblioteca, Telescopio, …), no de un evento: así una
 * misma escena puede ser reutilizada por varios eventos/questlines.
 *
 * Para agregar una escena interactiva: crear el componente y registrar acá
 * `'Nombre exacto del lugar': Componente`. (Escenas próximas del questline de
 * Deo: 'Una criatura extraña' y 'Telescopio Ancestral'.)
 */
const INFO_SCENES: Record<string, ComponentType<PlaceSceneProps>> = {
  'Biblioteca de los Secretos': LibraryScene,
  'Estelas de la Guerra Antigua': EstelasScene,
};

export function getInfoScene(placeName: string): ComponentType<PlaceSceneProps> | undefined {
  return INFO_SCENES[placeName];
}

export type { PlaceSceneProps };
