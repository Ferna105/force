'use client';

/* Cliente de socket.io para los duelos del Battledome.
   Se conecta al host de Strapi (no a /api) y autentica con el JWT del
   localStorage en el handshake. El servidor es autoritativo: emitimos
   jugadas (`duel:move`) y recibimos el estado (`duel:state`). */
import { io, Socket } from 'socket.io-client';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

/** Abre una conexión de socket autenticada para los duelos. */
export function connectDuelSocket(): Socket {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return io(STRAPI_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });
}
