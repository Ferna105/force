'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();


  if (isLoading) {
    return (
      <footer className="bg-gray-900 text-white p-4 mt-auto">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-400">
            © 2024 Force Front
          </div>
          <div className="animate-pulse bg-gray-700 h-4 w-24 rounded"></div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-gray-900 text-white p-6 mt-auto">
      <div className="max-w-7xl mx-auto">
        {/* Sección principal del footer */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo y descripción */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">F</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Force Front
                </h3>
                <p className="text-xs text-gray-400">
                  Mundos y Monstruos
                </p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed max-w-md">
              Explora mundos mágicos, descubre criaturas legendarias y sumérgete en aventuras épicas.
              Force Front te lleva a un universo lleno de misterios y maravillas.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-purple-300">Explorar</h4>
            <div className="space-y-2">
              <Link
                href="/"
                className={`block text-sm hover:text-purple-300 transition-colors ${pathname === '/' ? 'text-purple-300' : 'text-gray-300'
                  }`}
              >
                🏠 Mundo Principal
              </Link>
              <Link
                href="/explore"
                className={`block text-sm hover:text-purple-300 transition-colors ${pathname === '/explore' ? 'text-purple-300' : 'text-gray-300'
                  }`}
              >
                🔍 Explorar Mundos
              </Link>
              <Link
                href="/monsters"
                className={`block text-sm hover:text-purple-300 transition-colors ${pathname === '/monsters' ? 'text-purple-300' : 'text-gray-300'
                  }`}
              >
                🐉 Bestiario
              </Link>
              <Link
                href="/help"
                className={`block text-sm hover:text-purple-300 transition-colors ${pathname === '/help' ? 'text-purple-300' : 'text-gray-300'
                  }`}
              >
                ❓ Ayuda
              </Link>
            </div>
          </div>

          {/* Información del usuario */}
          <div>
            <h4 className="text-lg font-semibold mb-4 text-purple-300">Cuenta</h4>
            <div className="space-y-2">
              {user ? (
                <>
                  <div className="text-sm text-gray-300">
                    <span className="text-purple-300">👤</span> Hola, {user.username}
                  </div>
                  <Link
                    href="/inventory"
                    className={`block text-sm hover:text-purple-300 transition-colors ${pathname === '/inventory' ? 'text-purple-300' : 'text-gray-300'
                      }`}
                  >
                    🎒 Inventario
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block text-sm text-gray-300 hover:text-purple-300 transition-colors"
                >
                  🔐 Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Línea separadora */}
        <div className="border-t border-gray-700 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright */}
            <div className="text-sm text-gray-400">
              © 2024 Force Front. Todos los derechos reservados.
            </div>

            {/* Enlaces legales */}
            <div className="flex items-center gap-6 text-sm">
              <Link
                href="/privacy"
                className="text-gray-400 hover:text-purple-300 transition-colors"
              >
                Privacidad
              </Link>
              <Link
                href="/terms"
                className="text-gray-400 hover:text-purple-300 transition-colors"
              >
                Términos
              </Link>
              <Link
                href="/contact"
                className="text-gray-400 hover:text-purple-300 transition-colors"
              >
                Contacto
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 