'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (isLoading) {
    return (
      <nav className="bg-gray-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Force Front
          </Link>
          <div className="animate-pulse bg-gray-700 h-8 w-24 rounded"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-900 text-white p-4 sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          Force Front
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={`flex items-center space-x-1 hover:text-blue-400 transition-colors ${pathname === '/' ? 'text-blue-400' : ''
              }`}
          >
            <span>🏠</span>
            <span>Mundo</span>
          </Link>

          <Link
            href="/explore"
            className={`flex items-center space-x-1 hover:text-blue-400 transition-colors ${pathname === '/explore' ? 'text-blue-400' : ''
              }`}
          >
            <span>🔍</span>
            <span>Explorar</span>
          </Link>

          <Link
            href="/monsters"
            className={`flex items-center space-x-1 hover:text-blue-400 transition-colors ${pathname === '/monsters' ? 'text-blue-400' : ''
              }`}
          >
            <span>🐉</span>
            <span>Bestiario</span>
          </Link>

          <Link
            href="/help"
            className={`flex items-center space-x-1 hover:text-blue-400 transition-colors ${pathname === '/help' ? 'text-blue-400' : ''
              }`}
          >
            <span>❓</span>
            <span>Ayuda</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-4">
              <Link
                href="/inventory"
                className={`flex items-center space-x-1 hover:text-blue-400 transition-colors ${pathname === '/inventory' ? 'text-blue-400' : ''
                  }`}
              >
                <span>🎒</span>
                <span>Inventario</span>
              </Link>
              <span className="text-sm text-gray-300">
                Hola, {user.username}
              </span>
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMobileMenu}
          className="md:hidden flex items-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          aria-label="Toggle mobile menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isMobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-700">
          <div className="flex flex-col space-y-4 pt-4">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${pathname === '/' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🏠</span>
              <span>Mundo</span>
            </Link>

            <Link
              href="/explore"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${pathname === '/explore' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🔍</span>
              <span>Explorar</span>
            </Link>

            <Link
              href="/monsters"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${pathname === '/monsters' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>🐉</span>
              <span>Bestiario</span>
            </Link>

            <Link
              href="/help"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${pathname === '/help' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span>❓</span>
              <span>Ayuda</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/inventory"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${pathname === '/inventory' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>🎒</span>
                  <span>Inventario</span>
                </Link>
                
                <div className="px-4 py-2 text-sm text-gray-300 border-t border-gray-700 pt-4">
                  Hola, {user.username}
                </div>
                
                <button
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="mx-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm transition-colors text-left"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="mx-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md text-sm transition-colors text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
} 