'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { monstersService } from '../../../api/services';
import { Monster } from '../../../api/types';

export default function MonsterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [monster, setMonster] = useState<Monster | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonster = async () => {
      try {
        setLoading(true);
        const id = Number(params.id);
        if (isNaN(id)) {
          setError('ID de monstruo inválido');
          return;
        }

        const response = await monstersService.getById(id, {
          populate: '*'
        });
        setMonster(response.data);
      } catch (err) {
        console.error('Error fetching monster:', err);
        setError('Error al cargar el monstruo');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMonster();
    }
  }, [params.id]);

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
              <p className="text-lg">Cargando monstruo...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !monster) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="text-6xl mb-4">🐉</div>
              <h2 className="text-2xl font-bold mb-4">Monstruo no encontrado</h2>
              <p className="text-gray-400 mb-6">{error || 'El monstruo que buscas no existe'}</p>
              <div className="space-x-4">
                <button 
                  onClick={() => router.back()}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Volver
                </button>
                <Link 
                  href="/monsters"
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors inline-block"
                >
                  Ver todos los monstruos
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 relative overflow-hidden">
      <div className="container mx-auto px-8 py-6 relative z-10 max-w-6xl">
        {/* Botón de volver */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center text-gray-300 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
        </div>

        {/* Header del monstruo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            {monster.attributes.Name}
          </h1>
          {monster.attributes.Nature && (
            <p className="text-xl text-gray-300 mb-4">{monster.attributes.Nature}</p>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Layout principal: Imagen a la izquierda, información a la derecha */}
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Columna izquierda - Imagen */}
            <div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                <Image
                  src={getImageUrl(monster)}
                  alt={monster.attributes.Name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              </div>
            </div>

            {/* Columna derecha - Información */}
            <div className="space-y-6">
              {/* Información básica */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-purple-300">Información Básica</h3>
                
                {monster.attributes.Origin && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Origen</h4>
                    <p className="text-gray-200">{monster.attributes.Origin}</p>
                  </div>
                )}

                {monster.attributes.AverageHeight && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Altura Promedio</h4>
                    <p className="text-gray-200">{monster.attributes.AverageHeight} metros</p>
                  </div>
                )}

                {monster.attributes.AverageWeight && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-400 mb-1">Peso Promedio</h4>
                    <p className="text-gray-200">{monster.attributes.AverageWeight} kg</p>
                  </div>
                )}
              </div>

              {/* Habilidad innata */}
              {monster.attributes.InnateAbility && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h3 className="text-xl font-semibold mb-4 text-purple-300">Habilidad Innata</h3>
                  <p className="text-gray-200 leading-relaxed">{monster.attributes.InnateAbility}</p>
                </div>
              )}

              {/* Sobre el monstruo */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-purple-300">Sobre {monster.attributes.Name}</h3>
                <p className="text-gray-200 leading-relaxed">
                  {monster.attributes.Nature && (
                    <>
                      <strong>Naturaleza:</strong> {monster.attributes.Nature}
                      <br /><br />
                    </>
                  )}
                  {monster.attributes.Origin && (
                    <>
                      <strong>Origen:</strong> {monster.attributes.Origin}
                      <br /><br />
                    </>
                  )}
                  Esta criatura mágica forma parte del bestiario de nuestros mundos. 
                  Cada monstruo tiene características únicas que los hacen especiales 
                  en el universo de Force.
                </p>
              </div>

              {/* Estadísticas */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-semibold mb-4 text-purple-300">Estadísticas</h3>
                <div className="space-y-3">
                  {monster.attributes.AverageHeight && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Altura</span>
                      <span className="text-purple-300 font-semibold">{monster.attributes.AverageHeight}m</span>
                    </div>
                  )}
                  {monster.attributes.AverageWeight && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Peso</span>
                      <span className="text-purple-300 font-semibold">{monster.attributes.AverageWeight}kg</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Tipo</span>
                    <span className="text-purple-300 font-semibold">Criatura Mágica</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Botón para ver todos los monstruos */}
          <div className="text-center mt-12">
            <Link 
              href="/monsters"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 inline-block"
            >
              Ver todos los monstruos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 