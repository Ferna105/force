'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { fmt } from '@/lib/design';

/* Emblema de marca: estrella-tesoro dentro de anillo orbital + luna verde */
function Emblem() {
  return (
    <svg className="emblem" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="14.5" stroke="#E6A630" strokeWidth="2" />
      <circle cx="20" cy="20" r="14.5" stroke="#F4C969" strokeWidth="2" strokeDasharray="3 60" strokeLinecap="round" />
      <path d="M20 8.5l2.7 8.8 8.8 2.7-8.8 2.7L20 31.5l-2.7-8.8-8.8-2.7 8.8-2.7z" fill="#E6A630" />
      <path d="M20 12.5l1.6 5.9 5.9 1.6-5.9 1.6L20 27.5l-1.6-5.9-5.9-1.6 5.9-1.6z" fill="#F8DD9A" />
      <circle cx="33.2" cy="12.4" r="2.6" fill="#56A24E" stroke="#0e1a0c" strokeWidth="1" />
    </svg>
  );
}

type NavItem = { key: string; label: string; href: string; match: (p: string) => boolean; icon: React.ReactNode; auth?: boolean };

const ITEMS: NavItem[] = [
  {
    key: 'home', label: 'Inicio', href: '/', match: (p) => p === '/',
    icon: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  },
  {
    key: 'explorar', label: 'Explorar', href: '/explore', match: (p) => p.startsWith('/explore'),
    icon: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  },
  {
    // La ficha del compañero solo se muestra a usuarios con sesión iniciada.
    key: 'companero', label: 'Mi compañero', href: '/companion', match: (p) => p.startsWith('/companion'), auth: true,
    icon: <><path d="M12 21s-7-4.3-9.3-8.5C1 9 2.6 5.5 6 5.5c2 0 3.2 1.2 4 2.5.8-1.3 2-2.5 4-2.5 3.4 0 5 3.5 3.3 7C19 16.7 12 21 12 21z" /></>,
  },
  {
    key: 'inventario', label: 'Inventario', href: '/inventory', match: (p) => p.startsWith('/inventory'),
    icon: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M3 11h18M8 7V5a4 4 0 0 1 8 0v2" /></>,
  },
];

export default function Sidebar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <aside className="sidebar">
      <Link className="logo" href="/">
        <Emblem />
        <span className="wm">
          <b>FORCE<span className="dot">.</span></b>
          <small>Mundos vivos</small>
        </span>
      </Link>

      {ITEMS.filter((i) => !i.auth || user).map((i) => (
        <Link key={i.key} href={i.href} className={`nav-i ${i.match(pathname) ? 'active' : ''}`}>
          <svg viewBox="0 0 24 24">{i.icon}</svg>
          <span>{i.label}</span>
        </Link>
      ))}

      <div className="side-foot">
        <div className="coin" style={{ justifyContent: 'center' }}>
          <span className="c">F</span> {fmt(user?.balance)}
        </div>
        {user ? (
          <div className="user-chip">
            <div className="av">{user.username?.[0]?.toUpperCase() ?? 'N'}</div>
            <div>
              <b>{user.username}</b>
              <span>Domador{user.username?.endsWith('a') ? 'a' : ''}</span>
            </div>
            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg viewBox="0 0 24 24">
                <path d="M16 17l5-5-5-5M21 12H9M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
          </div>
        ) : (
          <Link className="btn btn-secondary btn-sm" href="/login" style={{ justifyContent: 'center' }}>
            Iniciar sesión
          </Link>
        )}
      </div>
    </aside>
  );
}
