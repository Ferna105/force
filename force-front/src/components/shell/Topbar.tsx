'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

/**
 * Acceso a la sesión en mobile. En escritorio esto vive en el pie del sidebar
 * (`.side-foot`), pero ese bloque se oculta al convertirse en tab bar, así que
 * sin esto no habría forma de iniciar ni cerrar sesión desde un teléfono.
 */
function SessionButton() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <Link className="btn btn-secondary btn-sm topbar-session mobile-only" href="/login">
        Entrar
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="topbar-session topbar-avatar mobile-only"
      onClick={() => { logout(); router.push('/'); }}
      title="Cerrar sesión"
      aria-label={`Cerrar sesión de ${user.username}`}
    >
      <span className="av">{user.username?.[0]?.toUpperCase() ?? 'N'}</span>
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M16 17l5-5-5-5M21 12H9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      </svg>
    </button>
  );
}

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
      <SessionButton />
    </div>
  );
}
