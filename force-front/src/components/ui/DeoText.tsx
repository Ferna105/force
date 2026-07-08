'use client';

/**
 * Texto en el idioma de Deo. Renderiza los glyphs (SVG inline) y revela a español
 * las primeras letras según `reveal` (fracción 0..1 o 'all'), a medida que avanza
 * el questline. Estilos en `globals.css` (.deo-*). Cifrado en `@/lib/deoGlyph`.
 */

import { useEffect, useRef } from 'react';
import { renderDeo, deoLetters, applyReveal } from '@/lib/deoGlyph';

type DeoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export default function DeoText({
  text,
  reveal = 0,
  size = 'md',
  className = '',
}: {
  text: string;
  reveal?: number | 'all';
  size?: DeoSize;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const html = renderDeo(text);

  useEffect(() => {
    const letters = deoLetters(text);
    const n = reveal === 'all' ? letters.length : Math.floor((Number(reveal) || 0) * letters.length);
    applyReveal(ref.current, n, letters);
  }, [text, reveal]);

  return (
    <div
      ref={ref}
      className={`deo deo-${size} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
