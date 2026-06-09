'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { monstersService } from '../../api/services';
import { Monster } from '../../api/types';

export default function MonstersPage() {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonsters = async () => {
      try {
        setLoading(true);
        const response = await monstersService.getAll({
          populate: '*',
          sort: 'Name:asc'
        });
        setMonsters(response.data || []);
      } catch (err) {
        console.error('Error fetching monsters:', err);
        setError('Error al cargar los monstruos');
      } finally {
        setLoading(false);
      }
    };

    fetchMonsters();
  }, []);

  const getImageUrl = (monster: Monster) => {
    if (monster.attributes.Image?.data?.attributes?.url) {
      return `${process.env.NEXT_PUBLIC_STRAPI_URL}${monster.attributes.Image.data.attributes.url}`;
    }
    return '/next.svg'; // Imagen por defecto
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Cargando monstruos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <p className="text-lg text-red-400 mb-4">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 relative overflow-hidden">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Bestiario
          </h1>
          <p className="text-gray-300 text-lg">
            Descubre las criaturas mágicas de nuestros mundos
          </p>
          <div className="mt-4 text-sm text-gray-400">
            {monsters.length} monstruo{monsters.length !== 1 ? 's' : ''} encontrado{monsters.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Grid de monstruos */}
        {monsters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🐉</div>
            <h3 className="text-xl font-semibold mb-2">No hay monstruos disponibles</h3>
            <p className="text-gray-400">Los monstruos aparecerán aquí cuando sean agregados al sistema.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {monsters.map((monster) => (
              <Link 
                key={monster.id} 
                href={`/monsters/${monster.id}`}
                className="group"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 border border-white/20">
                  {/* Imagen del monstruo */}
                  <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Image
                      src={getImageUrl(monster)}
                      alt={monster.attributes.Name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    />
                    {/* Overlay con gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Información del monstruo */}
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-purple-300 transition-colors">
                      {monster.attributes.Name}
                    </h3>
                    
                    {/* Información adicional si está disponible */}
                      <p className="text-xs text-gray-300 mb-1">
                        {monster.attributes.Nature || 'Unknown'}
                      </p>
                    
                    <p className="text-xs text-gray-400">
                      Altura: {monster.attributes.AverageHeight ? monster.attributes.AverageHeight + 'm' : 'Unknown'}
                    </p>
                  </div>

                  {/* Indicador de hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      Ver
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer con información adicional */}
        {monsters.length > 0 && (
          <div className="mt-12 text-center">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <h3 className="text-xl font-semibold mb-3 text-purple-300">
                Sobre el Bestiario
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed max-w-2xl mx-auto">
                Cada monstruo en este bestiario representa una criatura única de nuestros mundos mágicos. 
                Desde dragones ancestrales hasta criaturas mecánicas, cada una tiene su propia historia, 
                origen y habilidades innatas que las hacen especiales en el universo de Force.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 