'use client';

/**
 * Escena "Una criatura extraña" (Dunas de Ceniza · Eryndor). El NPC del questline
 * de Deo: una escena con estados guiada por el paso actual del evento. La criatura
 * habla en glyphs (solo la entendés tras descifrar el libro), reacciona a «Deo»,
 * y su nave pasa de escombros → traducción → cristal → coordenadas → viaje.
 * Ata los pasos react_deo / translate_ship / use_ship / travel; para los pasos
 * que ocurren en otros lugares, muestra una pista de a dónde ir.
 */

/* eslint-disable @next/next/no-img-element */
import { useState } from 'react';
import Link from 'next/link';
import DeoText from '@/components/ui/DeoText';
import { useMonsters } from '@/api';
import { mediaUrl, monsterArtFallback } from '@/lib/design';
import { useToast } from '@/hooks/useToast';
import { useQuestEvent } from './useQuestEvent';
import type { PlaceSceneProps } from './types';

const SHIP_MSG = 'Fuente de energía insuficiente'; // mensaje en glyphs que hay que traducir

// Pistas para los pasos que se resuelven en otros lugares del mundo. Deliberadamente
// vagas: el jugador debe descubrir por su cuenta a dónde ir (p. ej. la biblioteca).
const HINTS: Record<string, string> = {
  read_book: 'No entendés su lengua… todavía. Sus símbolos parecen aguardar a que alguien aprenda a leerlos.',
  adopt_deo: 'La criatura confía en vos, parece que quiere convertirse en tu compañero.',
  feed_deo: 'Deo se ve débil y cansado, ¿tendrá hambre?',
  read_estelas: 'Deo mira hacia el horizonte reseco, donde la piedra vieja todavía recuerda su guerra.',
  get_crystal: 'Señala su nave rota: le falta algo de corazón blanco. Las arenas lo entregan solo a quien insiste.',
  read_final: 'Aquella lengua que descifraste todavía guardaba una última línea sin leer.',
  train_strength: 'Solo un emergente fuerte recuperará un reino perdido. Deo te mira, con ojos que buscan fortaleza.',
  telescope: 'La nave necesita un rumbo, y solo el cielo lo conoce. Pero el sol borra las estrellas.',
};

export default function CreatureScene({ place }: PlaceSceneProps) {
  const a = place.attributes;
  const { event, stepDone, isCurrent, reachedIndex, resolveStep } = useQuestEvent();
  const { data: monsters } = useMonsters({ populate: '*' });
  const deo = (monsters ?? []).find((m) => m.attributes.Name === 'Deo');
  const creatureArt = mediaUrl(deo?.attributes.Image, monsterArtFallback('Deo'));
  const { show } = useToast();
  const [translation, setTranslation] = useState('');
  const [coords, setCoords] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // "Sabés leer Deo" SOLO tras descifrar el libro (paso read_book cumplido). Ojo:
  // no usar reachedIndex('read_book'), porque el paso previo (visit_npc) se cumple
  // con solo visitar este lugar, y eso haría true a reachedIndex('read_book') antes
  // de leer el libro → el diálogo se mostraría traducido de antemano.
  const canRead = stepDone('read_book');
  const cur = event?.steps.find((s) => s.current)?.key ?? null;
  const completed = event?.status === 'completed';

  const run = async (key: string, payload?: Record<string, unknown>, okMsg?: string) => {
    setBusy(true); setErr(null);
    try {
      const res = await resolveStep(key, payload);
      // resolveStep lanza si el backend responde error (respuesta incorrecta / gate)
      if (res && okMsg) show({ tone: 'verdant', icon: 'success', message: okMsg, duration: 3500 });
      if (res?.rewardsGranted) {
        const r = res.rewardsGranted;
        const parts = [r.coins && `+${r.coins} monedas`, r.items?.length && `${r.items.length} objeto(s)`, r.discovery?.world && `descubriste ${r.discovery.world.attributes.Name}`].filter(Boolean);
        show({ tone: 'gold', icon: 'success', message: `¡La nave viajó a Deo! ${parts.join(' · ')}`, duration: 7000 });
      }
    } catch {
      setErr('Eso no es correcto.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: 26 }}>
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0,220px) 1fr', gap: 22, alignItems: 'start' }}>
        {/* La criatura */}
        <div className="panel" style={{ padding: 18, textAlign: 'center' }}>
          {creatureArt && (
            <img
              src={creatureArt}
              alt="Una criatura extraña"
              style={{
                width: '100%', borderRadius: 'var(--r-lg)', display: 'block',
                boxShadow: '0 0 40px -10px var(--deo-glow-strong)',
                animation: completed ? undefined : 'npcbob 3s ease-in-out infinite',
              }}
            />
          )}
        </div>

        {/* Diálogo + interacción por estado */}
        <div>
          {completed ? (
            <div className="npc-dialog">
              <div className="npc-name"><span className="badge" /> La luna del origen</div>
              <p className="npc-line">La nave se enciende, se eleva entre las dunas y se desvanece rumbo al cielo. Recuperaste un reino perdido en el espacio: <b>Deo</b> ya es parte de tu mapa.</p>
              {event && (
                <div className="npc-foot">
                  <Link className="btn btn-primary" href={`/events/${event.eventId}`}>Ver el evento y tus recompensas →</Link>
                </div>
              )}
            </div>
          ) : (
            <div className="npc-dialog">
              <div className="npc-name"><span className="badge" /> {canRead ? 'Deo' : '¿…?'}</div>

              {/* Habla en glyphs; se entiende una vez que sabés leer */}
              <div className="npc-line deo" style={{ marginBottom: 4 }}>
                <DeoText
                  text={
                    isCurrent('react_deo') ? 'pronuncia su nombre y sabre que puedo confiar'
                      : (cur === 'travel' || reachedIndex('use_ship')) ? 'reune mis piezas y despertare'
                        : 'no eres de aqui. vienes por ella, verdad'
                  }
                  size="md"
                  reveal={canRead ? 1 : 0}
                />
              </div>

              {/* --- Paso react_deo: decir «Deo» --- */}
              {isCurrent('react_deo') && (
                <div className="npc-foot">
                  <span className="npc-hint">Ahora entendés lo que murmura. Te reclama un nombre.</span>
                  <button className="btn btn-primary" disabled={busy} onClick={() => run('react_deo', undefined, 'La criatura reacciona a su nombre.')}>
                    Decir «Deo»
                  </button>
                </div>
              )}

              {/* --- Paso translate_ship: nave en escombros + traducción --- */}
              {isCurrent('translate_ship') && (
                <>
                  <div style={{ margin: '14px 0', padding: '14px 16px', border: '1px dashed rgba(138,127,232,.4)', borderRadius: 'var(--r-md)', background: 'rgba(138,127,232,.06)' }}>
                    <div className="deo-chip" style={{ marginBottom: 10 }}>◇ Restos de una nave · mensaje grabado</div>
                    <DeoText text={SHIP_MSG} size="sm" reveal={0} />
                  </div>
                  <div className="deo-input">
                    <input
                      className={err ? 'err' : ''}
                      placeholder="ESCRIBÍ LA TRADUCCIÓN…"
                      style={{ textTransform: 'uppercase' }}
                      value={translation}
                      onChange={(e) => {
                        // Solo A–Z, 0–9 y espacio: quita tildes (É→E) y descarta el resto.
                        const v = e.target.value
                          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                          .toUpperCase()
                          .replace(/[^A-Z0-9 ]/g, '');
                        setTranslation(v);
                        setErr(null);
                      }}
                    />
                    <button className="btn btn-primary" disabled={busy || !translation.trim()} onClick={() => run('translate_ship', { value: translation }, 'Traducción correcta.')}>
                      Traducir
                    </button>
                  </div>
                  {err && <div className="deo-feedback err">{err}</div>}
                </>
              )}

              {/* --- Paso use_ship: traer el cristal --- */}
              {isCurrent('use_ship') && (
                <div className="npc-foot">
                  <span className="npc-hint">Tenés la pieza de corazón blanco. La nave puede despertar.</span>
                  <button className="btn btn-primary" disabled={busy} onClick={() => run('use_ship', undefined, 'La nave se reconstruye… y se desvanece al primer intento.')}>
                    ◆ Traer el Cristal blanco oxidado
                  </button>
                </div>
              )}

              {/* --- Paso travel: la panza brilla, coordenadas --- */}
              {isCurrent('travel') && (
                <>
                  <p className="npc-line" style={{ margin: '12px 0 2px' }}>El dibujo en su estómago comienza a brillar. La nave reaparece, lista para partir.</p>
                  <div className="deo-input">
                    <input
                      className={err ? 'err' : ''}
                      placeholder="Ingresá el rumbo que anotaste…"
                      value={coords}
                      onChange={(e) => { setCoords(e.target.value); setErr(null); }}
                    />
                    <button className="btn btn-primary" disabled={busy || !coords.trim()} onClick={() => run('travel', { value: coords })}>
                      Viajar ✧
                    </button>
                  </div>
                  {err && <div className="deo-feedback err">{err}</div>}
                </>
              )}

              {/* --- Pasos que ocurren en otros lugares: pista --- */}
              {cur && HINTS[cur] && !stepDone(cur) && (
                <div className="npc-foot"><span className="npc-hint">{HINTS[cur]}</span></div>
              )}

              {/* Sin evento activo: base */}
              {!event && <div className="npc-foot"><span className="npc-hint">Algo en esta criatura te resulta extrañamente familiar.</span></div>}
            </div>
          )}

          <div className="panel" style={{ padding: '16px 22px', marginTop: 16 }}>
            <p style={{ color: '#EFE3CE', fontSize: 15, margin: 0, lineHeight: 1.6 }}>{a.Description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
