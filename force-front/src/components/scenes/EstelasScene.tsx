'use client';

/**
 * Escena "Estelas de la Guerra Antigua" (Meseta · Eryndor). Dos inscripciones de
 * piedra bilingües: el mensaje en idioma de Deo (glyphs) + su traducción al
 * español debajo, para el jugador que ya aprendió a leer. Leer ambas marca el
 * paso `read_estelas` del evento.
 */

import { useState } from 'react';
import DeoText from '@/components/ui/DeoText';
import { useQuestEvent } from './useQuestEvent';
import type { PlaceSceneProps } from './types';

const INSCRIPCIONES = [
  'Nuestra guerra con Deo fue inevitable',
  'Recibieron el perdón de la serpiente tras la guerra pasada',
];

export default function EstelasScene({ place }: PlaceSceneProps) {
  const a = place.attributes;
  const { event, stepDone, reachedIndex, resolveStep } = useQuestEvent();
  const [busy, setBusy] = useState(false);

  const done = stepDone('read_estelas');
  // El jugador "sabe leer" una vez que descifró el libro (read_book).
  const canRead = reachedIndex('read_book');
  const isActiveStep = reachedIndex('read_estelas') && !done;

  const confirmar = async () => {
    setBusy(true);
    try { await resolveStep('read_estelas'); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 26 }}>
      <div className="panel" style={{ padding: '24px 28px', marginBottom: 18 }}>
        <div className="kicker">Meseta de la Guerra Antigua</div>
        <p style={{ color: '#EFE3CE', fontSize: 16, margin: '10px 0 0', lineHeight: 1.6 }}>{a.Description}</p>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
        {INSCRIPCIONES.map((msg, i) => (
          <div key={i} className="npc-dialog no-tip" style={{ textAlign: 'center' }}>
            <div className="npc-name" style={{ justifyContent: 'center' }}>
              <span className="badge" /> Inscripción {i === 0 ? 'I' : 'II'}
            </div>
            <DeoText text={msg} size="md" reveal={canRead ? 0.35 : 0} />
            {canRead && (
              <p className="npc-line" style={{ marginTop: 14, color: 'var(--deo-ice)', fontStyle: 'italic' }}>
                «{msg}»
              </p>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {!canRead && <span className="npc-hint">No entendés estos símbolos… todavía. Descifrá primero el libro de la biblioteca.</span>}
        {done && <span className="deo-chip">✓ Inscripciones leídas</span>}
        {isActiveStep && (
          <button className="btn btn-primary" disabled={busy} onClick={confirmar}>
            {busy ? 'Grabando…' : 'Ya leí las inscripciones'}
          </button>
        )}
        {!event && canRead && <span className="npc-hint">El eco de la guerra resuena en la piedra.</span>}
      </div>
    </div>
  );
}
