'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useItems, type Item } from '@/api';
import Image from 'next/image';

// Función para obtener la URL de la imagen del item
function getItemIconUrl(item: Item): string {
  if (item.attributes.icon?.data?.attributes?.formats?.thumbnail?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${item.attributes.icon.data.attributes.formats.thumbnail.url}`;
  }
  if (item.attributes.icon?.data?.attributes?.formats?.small?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${item.attributes.icon.data.attributes.formats.small.url}`;
  }
  if (item.attributes.icon?.data?.attributes?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${item.attributes.icon.data.attributes.url}`;
  }
  return "/next.svg"; // Fallback
}

// Función para obtener el ícono según el tipo de item (fallback)
function getItemIcon(type: string): string {
  const icons = {
    weapon: '⚔️',
    armor: '🛡️',
    consumable: '🧪',
    key: '🗝️',
    misc: '📦'
  };
  return icons[type as keyof typeof icons] || '📦';
}

// Función para obtener el color según la rareza
function getRarityColor(rarity: string): string {
  const colors = {
    common: 'text-gray-600 dark:text-gray-400',
    uncommon: 'text-green-600 dark:text-green-400',
    rare: 'text-blue-600 dark:text-blue-400',
    epic: 'text-purple-600 dark:text-purple-400',
    legendary: 'text-yellow-600 dark:text-yellow-400'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
}

// Función para obtener el color de fondo según la rareza
function getRarityBgColor(rarity: string): string {
  const colors = {
    common: 'bg-gray-100 dark:bg-gray-800',
    uncommon: 'bg-green-100 dark:bg-green-900/30',
    rare: 'bg-blue-100 dark:bg-blue-900/30',
    epic: 'bg-purple-100 dark:bg-purple-900/30',
    legendary: 'bg-yellow-100 dark:bg-yellow-900/30'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
}

// Función para obtener el color del borde según la rareza
function getRarityBorderColor(rarity: string): string {
  const colors = {
    common: 'border-gray-300 dark:border-gray-600',
    uncommon: 'border-green-300 dark:border-green-600',
    rare: 'border-blue-300 dark:border-blue-600',
    epic: 'border-purple-300 dark:border-purple-600',
    legendary: 'border-yellow-300 dark:border-yellow-600'
  };
  return colors[rarity as keyof typeof colors] || colors.common;
}

// Función para obtener el nombre del tipo
function getTypeName(type: string): string {
  const types = {
    weapon: 'Arma',
    armor: 'Armadura',
    consumable: 'Consumible',
    key: 'Llave',
    misc: 'Misceláneo'
  };
  return types[type as keyof typeof types] || type;
}

export default function InventoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Obtener items del backend con paginación de 10
  const { data: items, loading: itemsLoading, error: itemsError } = useItems(
    useMemo(() => ({
      pagination: { pageSize: 100 },
      populate: 'icon'
    }), [])
  );

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Filtrar inventario
  const filteredInventory = items?.filter(item => {
    const matchesFilter = filter === 'all' || item.attributes.type === filter;
    const matchesSearch = item.attributes.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.attributes.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesFilter && matchesSearch;
  }) || [];

  // No agrupar por tipo - mantener lista plana

  if (authLoading || itemsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-600 dark:text-purple-400 font-medium">
                Cargando inventario...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Se redirigirá automáticamente
  }

  // Mostrar error si hay problema cargando los items
  if (itemsError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Error al cargar el inventario
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {itemsError}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-pink-300/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-blue-300/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-yellow-300/20 rounded-full blur-xl animate-pulse delay-1500"></div>
      </div>

      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
        <div className="container mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">🎒</span>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Inventario
                </h1>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  ✨ Objetos de {user.username} ✨
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total: {items?.length || 0} objetos
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Filtros y búsqueda */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔍 Buscar objetos
              </label>
              <input
                type="text"
                id="search"
                placeholder="Buscar por nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filtro por tipo */}
            <div className="md:w-48">
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🏷️ Filtrar por tipo
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="weapon">Armas</option>
                <option value="armor">Armaduras</option>
                <option value="consumable">Consumibles</option>
                <option value="key">Llaves</option>
                <option value="misc">Misceláneos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de objetos */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎒</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                No se encontraron objetos
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Intenta cambiar los filtros o la búsqueda
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInventory.map((item) => (
                <div
                  key={item.id}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl ${getRarityBgColor(item.attributes.rarity)} ${getRarityBorderColor(item.attributes.rarity)}`}
                >
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className="relative mb-4">
                      {item.attributes.icon ? (
                        <Image
                          src={getItemIconUrl(item)}
                          alt={item.attributes.name}
                          width={96}
                          height={96}
                          className="w-24 h-24 object-contain"
                          onError={(e) => {
                            // Fallback to emoji if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = document.createElement('span');
                            fallback.className = 'text-5xl';
                            fallback.textContent = getItemIcon(item.attributes.type);
                            target.parentNode?.insertBefore(fallback, target);
                          }}
                        />
                      ) : (
                        <span className="text-5xl">{getItemIcon(item.attributes.type)}</span>
                      )}
                      {item.attributes.is_stackable && item.attributes.max_stack > 1 && (
                        <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                          {item.attributes.max_stack}
                        </span>
                      )}
                    </div>
                    
                    <div className="w-full">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">
                        {item.attributes.name}
                      </h3>
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${getRarityColor(item.attributes.rarity)} bg-opacity-20 ${getRarityBgColor(item.attributes.rarity)}`}>
                          {item.attributes.rarity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {getTypeName(item.attributes.type)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 text-center">
                    {item.attributes.description || 'Sin descripción'}
                  </p>
                  
                  {/* Información adicional del item */}
                  <div className="space-y-2">
                    {item.attributes.value && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-yellow-600">💰</span>
                        <span className="text-gray-600 dark:text-gray-400">Valor: {item.attributes.value}</span>
                      </div>
                    )}
                    {item.attributes.weight && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-gray-600">⚖️</span>
                        <span className="text-gray-600 dark:text-gray-400">Peso: {item.attributes.weight}kg</span>
                      </div>
                    )}
                    {item.attributes.usable && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-green-600">✨</span>
                        <span className="text-gray-600 dark:text-gray-400">Usable</span>
                      </div>
                    )}
                    {item.attributes.cooldown > 0 && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <span className="text-blue-600">⏱️</span>
                        <span className="text-gray-600 dark:text-gray-400">Cooldown: {item.attributes.cooldown}s</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 