import type { Place } from '@/api/types';

// Props de una escena de lugar `information`. Cada escena recibe su `place` y se
// registra en `registry.tsx`; es reutilizable por cualquier evento.
export interface PlaceSceneProps {
  place: Place;
}
