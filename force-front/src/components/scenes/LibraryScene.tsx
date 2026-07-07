'use client';

/**
 * Escena "Biblioteca de los Secretos" (Ciudadela de la Cumbre Helada · Eryndor).
 * LUGAR reutilizable: estanterías por letra con libros de relleno y, en el
 * estante D, «Deo, la luna del origen», que se descifra al leerlo (registra
 * `read_book` → descubre a Deo) y revela su mensaje final más adelante
 * (`read_final`). Otros eventos pueden reutilizar esta biblioteca.
 */

import { useEffect, useMemo, useState } from 'react';
import DeoText from '@/components/ui/DeoText';
import { useQuestEvent } from './useQuestEvent';
import type { PlaceSceneProps } from './types';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const DEO_BOOK_ID = 'deo-luna-origen';
const DEO_BOOK_TITLE = 'Deo, la luna del origen';
const LORE = 'Deo no es una luna. Es un reino perdido en el espacio, dormido tras una guerra olvidada. Quien lea esta lengua carga con su memoria.';
const FINAL = 'Solo un emergente fuerte logrará recuperar un reino perdido en el espacio.';

// Libros de relleno: títulos mundanos + un párrafo inventado de tema diverso.
// Nada relacionado con lunas ni guerras: el jugador debe descubrir el libro
// especial por su cuenta (no se distingue de los demás).
const FILLER_TITLES = [
  'Herbología del valle', 'Bestiario menor', 'Diario de cosecha', 'Tratado de fraguas',
  'Cantares del deshielo', 'Rutas de comercio', 'Manual del relojero', 'Recetas de brasa',
  'El arte del pastoreo', 'Cartas de un cartógrafo', 'Tintes y tejidos', 'Aves de la ciudadela',
];
const FILLER_TEXTS = [
  'El cultivo de la menta plateada prefiere la sombra parcial y el riego al alba; sus hojas perfuman el pan y ahuyentan a las polillas.',
  'Anotaciones sobre el canto de los mirlos: repiten su melodía al amanecer y la abandonan apenas sube el calor del día.',
  'Recetario de fraguas: para templar una hoja fina, tres inmersiones breves valen más que una sola larga.',
  'Diario de cosecha: la calabaza de invierno madura mejor si se la deja secar dos semanas al sol antes de guardarla.',
  'Sobre el comercio de la sal: un saco pesado en el sur equivale a tres medidas de lino en el norte.',
  'Notas de un pastor: las ovejas de vellón oscuro resisten mejor la escarcha, aunque rinden algo menos de lana.',
  'Herbolario menor: la raíz de jengibre calma el estómago y la flor de manzanilla concilia el sueño.',
  'Cuaderno de un cartógrafo: los ríos de la meseta cambian de curso cada década; conviene rehacer los mapas a menudo.',
  'Tratado de quesos: el de cabra madura en cuevas frescas y gana sabor si se lo frota con hierbas del monte.',
  'Sobre los tejidos: el hilo teñido con cáscara de nuez conserva su color aunque se lo lave mil veces.',
  'Apuntes de un relojero: un péndulo más largo mide el tiempo más lento; todo está en dar con la longitud justa.',
  'Del buen pan: la masa levada con paciencia toda una noche pesa menos y dura más fresca que la apurada.',
];
const SPINE_COLORS = ['#6b3b2a', '#3a5540', '#4a3b6b', '#7a5a2a', '#2f4a58', '#5c2f3a', '#455036', '#603a52'];

// hash simple determinista
function h(s: string) { let n = 0; for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }

interface Book { id: string; title: string; color: string; w: number; hgt: number; key?: boolean; content?: string; }

// Un libro con aspecto normal (color/tamaño deterministas por su semilla).
function makeBook(id: string, seed: number, over: Partial<Book> = {}): Book {
  return {
    id,
    title: FILLER_TITLES[seed % FILLER_TITLES.length],
    color: SPINE_COLORS[seed % SPINE_COLORS.length],
    w: 28 + (seed % 5) * 3,
    hgt: 150 + (seed % 5) * 12,
    content: FILLER_TEXTS[seed % FILLER_TEXTS.length],
    ...over,
  };
}

function shelfBooks(letter: string): Book[] {
  const count = 5 + (h(letter) % 4);
  const books: Book[] = [];
  for (let i = 0; i < count; i++) books.push(makeBook(`${letter}-${i}`, h(letter + i)));
  if (letter === 'D') {
    // El libro clave, sin ninguna marca visual: mismo aspecto que el resto (su
    // color/tamaño salen del hash como cualquier otro). `key` es solo lógico.
    const book = makeBook('deo', h('deo'), { title: DEO_BOOK_TITLE, key: true, content: undefined });
    books.splice(Math.floor(books.length / 2), 0, book);
  }
  return books;
}

export default function LibraryScene({ place }: PlaceSceneProps) {
  const a = place.attributes;
  const { event, stepDone, reachedIndex, recordEvent, resolveStep } = useQuestEvent();
  const [letter, setLetter] = useState('A');
  const [open, setOpen] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);

  const books = useMemo(() => shelfBooks(letter), [letter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Estado del libro de Deo según el progreso.
  const readDone = stepDone('read_book');
  const finalStage = reachedIndex('read_final') && !stepDone('read_final');
  const canDecipher = !!event && reachedIndex('read_book') && !readDone;
  const revealFrac = event && event.total ? Math.min(1, event.currentStep / event.total) : 0;

  const descifrar = async () => {
    setBusy(true);
    try { await recordEvent('read_book', { bookId: DEO_BOOK_ID }); }
    finally { setBusy(false); }
  };
  const comprendi = async () => {
    setBusy(true);
    try { await resolveStep('read_final'); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 26 }}>
      <div className="panel" style={{ padding: '20px 26px', marginBottom: 18 }}>
        <div className="kicker">Biblioteca de los Secretos</div>
        <p style={{ color: '#EFE3CE', fontSize: 16, margin: '10px 0 0', lineHeight: 1.6 }}>{a.Description}</p>
      </div>

      {/* Navegación por letra */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {LETTERS.map((l) => (
          <button
            key={l}
            onClick={() => setLetter(l)}
            className="btn"
            style={{
              minWidth: 34, padding: '6px 10px',
              background: l === letter ? 'var(--gold)' : 'var(--ink-2)',
              color: l === letter ? '#241a08' : 'var(--mist)',
              borderColor: 'var(--ink-line)',
              fontWeight: 600,
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Estante */}
      <div className="shelf-wrap">
        <span className="shelf-label">{letter}</span>
        <div className="shelf">
          {books.map((b) => (
            <div
              key={b.id}
              className="book"
              onClick={() => setOpen(b)}
              style={{ width: b.w, height: b.hgt, background: b.color }}
            >
              <span className="t">{b.title}</span>
              <span className="band" />
            </div>
          ))}
        </div>
        <div className="shelf-plank" />
      </div>

      {/* Lector */}
      {open && (
        <div className="deo-ov" onClick={() => setOpen(null)}>
          <div className="deo-card" onClick={(e) => e.stopPropagation()}>
            {open.key ? (
              <>
                <div className="deo-chip" style={{ marginBottom: 12 }}>Idioma desconocido</div>
                <h3>{DEO_BOOK_TITLE}</h3>
                <div style={{ margin: '18px 0' }}>
                  <DeoText text={LORE} size="md" reveal={readDone ? revealFrac : 0} />
                </div>
                {finalStage && (
                  <div className="npc-dialog no-tip" style={{ marginTop: 10 }}>
                    <div className="npc-name"><span className="badge" /> El mensaje final se revela</div>
                    <DeoText text={FINAL} size="md" reveal={1} />
                    <p className="npc-line" style={{ marginTop: 12, color: 'var(--deo-ice)', fontStyle: 'italic' }}>«{FINAL}»</p>
                  </div>
                )}
                <div className="npc-foot">
                  {!event && <span className="npc-hint">Nadie en la ciudadela sabe leer estos símbolos.</span>}
                  {canDecipher && (
                    <button className="btn btn-primary" disabled={busy} onClick={descifrar}>
                      {busy ? 'Descifrando…' : 'Descifrar el libro'}
                    </button>
                  )}
                  {readDone && !finalStage && <span className="deo-chip">✓ Libro descifrado</span>}
                  {finalStage && (
                    <button className="btn btn-primary" disabled={busy} onClick={comprendi}>
                      {busy ? 'Grabando…' : 'Comprendí'}
                    </button>
                  )}
                  <button className="btn btn-secondary" onClick={() => setOpen(null)}>Cerrar</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 20 }}>{open.title}</h3>
                <p className="npc-line" style={{ marginTop: 14 }}>{open.content}</p>
                <div className="npc-foot">
                  <button className="btn btn-secondary" onClick={() => setOpen(null)}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
