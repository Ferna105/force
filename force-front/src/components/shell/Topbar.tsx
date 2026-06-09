'use client';

import { useAuth } from '@/hooks/useAuth';
import { fmt } from '@/lib/design';

type Props = {
  /** Migas: texto o nodo (incluye links de retorno). */
  crumb: React.ReactNode;
  /** Mostrar el buscador (placeholder, no funcional en esta versión). */
  search?: boolean;
  /** Mostrar el saldo de monedas. */
  coin?: boolean;
};

export default function Topbar({ crumb, search = false, coin = true }: Props) {
  const { user } = useAuth();

  return (
    <div className="topbar">
      <span className="crumb">{crumb}</span>
      <span className="sp" />
      {search && (
        <label className="search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
          <input placeholder="Buscar criaturas, mundos, objetos…" />
        </label>
      )}
      {coin && (
        <div className="coin"><span className="c">F</span> {fmt(user?.balance)}</div>
      )}
    </div>
  );
}
