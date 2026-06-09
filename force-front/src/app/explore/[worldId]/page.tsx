'use client';
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { worldsService } from "../../../api/services";
import type { World } from "../../../api/types";

// Función para obtener la URL de la imagen
function getImageUrl(world: World): string {
  if (world.attributes.Image?.data?.attributes?.formats?.large?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${world.attributes.Image.data.attributes.formats.large.url}`;
  }
  if (world.attributes.Image?.data?.attributes?.formats?.medium?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${world.attributes.Image.data.attributes.formats.medium.url}`;
  }
  if (world.attributes.Image?.data?.attributes?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${world.attributes.Image.data.attributes.url}`;
  }
  return "/next.svg"; // Fallback
}

export default function WorldPage() {
  const params = useParams();
  const router = useRouter();
  const worldId = params.worldId as string;
  
  const [world, setWorld] = useState<World | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await worldsService.getById(parseInt(worldId), {
          populate: ['Image', 'places']
        });
        
        if (response.data) {
          setWorld(response.data);
        } else {
          setError('Mundo no encontrado');
        }
      } catch (err) {
        console.error('Error fetching world:', err);
        setError('Error al cargar el mundo');
      } finally {
        setLoading(false);
      }
    };

    if (worldId) {
      fetchWorld();
    }
  }, [worldId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
          <div className="container mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                <span className="text-2xl">←</span>
                <span className="font-medium">Volver</span>
              </button>
              <div className="text-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Cargando Mundo...
                </h1>
              </div>
              <div className="w-20"></div> {/* Spacer para centrar */}
            </div>
          </div>
        </header>

        {/* Loading State */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-600 dark:text-purple-400 font-medium">
                Cargando mundo mágico...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
          <div className="container mx-auto px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                <span className="text-2xl">←</span>
                <span className="font-medium">Volver</span>
              </button>
              <div className="text-center">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Error
                </h1>
              </div>
              <div className="w-20"></div> {/* Spacer para centrar */}
            </div>
          </div>
        </header>

        {/* Error State */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                {error || 'Mundo no encontrado'}
              </p>
              <button
                onClick={() => router.push('/explore')}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Volver a Explorar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = getImageUrl(world);

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
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              <span className="text-2xl">←</span>
              <span className="font-medium">Volver</span>
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                {world.attributes.Name}
              </h1>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                ✨ Mundo Mágico ✨
              </p>
            </div>
            <div className="w-20"></div> {/* Spacer para centrar */}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-8 py-6 relative z-10 max-w-4xl">
        {/* Imagen del mundo */}
        <div className="mb-8">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-500/20 dark:from-gray-600/20 dark:to-gray-700/20"></div>
            <Image
              src={imageUrl}
              alt={world.attributes.Name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4">
              <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="text-sm px-3 py-1 rounded-full bg-white/90 dark:bg-gray-800/90 font-medium text-purple-600 dark:text-purple-400 backdrop-blur-sm">
                🌍 Mundo
              </span>
            </div>

            {/* Zonas clickeables para lugares */}
            {world.attributes.places?.data?.map((place, index) => {
              // Mapear colores por tipo de lugar
              const getPlaceColor = (type: string) => {
                const colors = {
                  'information': 'border-blue-400',
                  'game': 'border-red-500',
                  'shop': 'border-green-500'
                };
                return colors[type as keyof typeof colors] || 'border-purple-500';
              };

              const getPlaceHoverColor = (type: string) => {
                const colors = {
                  'information': 'hover:border-blue-300 hover:bg-blue-400/20',
                  'game': 'hover:border-red-300 hover:bg-red-500/20',
                  'shop': 'hover:border-green-300 hover:bg-green-500/20'
                };
                return colors[type as keyof typeof colors] || 'hover:border-purple-300 hover:bg-purple-500/20';
              };

              const getPlaceBgColor = (type: string) => {
                const colors = {
                  'information': 'bg-blue-600',
                  'game': 'bg-red-600',
                  'shop': 'bg-green-600'
                };
                return colors[type as keyof typeof colors] || 'bg-purple-600';
              };

              // Generar posiciones dinámicas basadas en el índice
              const positions = [
                { top: '20%', left: '30%' },
                { top: '35%', left: '45%' },
                { top: '50%', left: '60%' },
                { top: '65%', left: '25%' },
                { top: '40%', left: '70%' },
                { top: '75%', left: '40%' },
                { top: '30%', left: '50%' },
                { top: '55%', left: '35%' },
                { top: '80%', left: '55%' },
                { top: '25%', left: '65%' }
              ];

              const position = positions[index % positions.length];

              return (
                <a
                  key={place.id}
                  href={`/explore/${worldId}/places/${place.id}`}
                  title={place.attributes.Name}
                  className={`absolute border-2 rounded-full transition-all duration-300 cursor-pointer group ${getPlaceColor(place.attributes.Type)} ${getPlaceHoverColor(place.attributes.Type)}`}
                  style={{ 
                    top: position.top, 
                    left: position.left, 
                    width: '40px', 
                    height: '40px' 
                  }}
                >
                  <div className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ${getPlaceBgColor(place.attributes.Type)}`}>
                    {place.attributes.Name}
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Información del mundo */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {world.attributes.Name}
          </h2>
          
          <div className="prose prose-purple dark:prose-invert max-w-none">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {world.attributes.Description || "Descripción del mundo mágico..."}
            </p>
          </div>

          {/* Estadísticas básicas */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-purple-100 dark:bg-purple-900/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {world.attributes.places?.data?.length || 0}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                Lugares Descubiertos
              </div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                🌟
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Mundo Activo
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            💡 Información del Mundo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-300">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🏛️</span>
                <span><strong>Estado:</strong> Activo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">⚔️</span>
                <span><strong>Dificultad:</strong> Moderada</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🗺️</span>
                <span><strong>Región:</strong> Principal</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🌙</span>
                <span><strong>Tipo:</strong> Mundo Mágico</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">✨</span>
                <span><strong>Magia:</strong> Alta</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">👥</span>
                <span><strong>Población:</strong> Diversa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 