'use client';
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { placesService } from "../../../../../api/services";
import type { Place } from "../../../../../api/types";

// Función para obtener la URL de la imagen banner
function getBannerUrl(place: Place): string {
  if (place.attributes.Banner?.data?.attributes?.formats?.large?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${place.attributes.Banner.data.attributes.formats.large.url}`;
  }
  if (place.attributes.Banner?.data?.attributes?.formats?.medium?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${place.attributes.Banner.data.attributes.formats.medium.url}`;
  }
  if (place.attributes.Banner?.data?.attributes?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${place.attributes.Banner.data.attributes.url}`;
  }
  return "/next.svg"; // Fallback
}

// Función para obtener el icono y color según el tipo
function getTypeInfo(type: string) {
  const typeInfo = {
    'information': {
      icon: 'ℹ️',
      color: 'blue',
      label: 'Información',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      textColor: 'text-blue-600 dark:text-blue-400',
      borderColor: 'border-blue-200 dark:border-blue-700'
    },
    'game': {
      icon: '🎮',
      color: 'red',
      label: 'Juego',
      bgColor: 'bg-red-100 dark:bg-red-900/50',
      textColor: 'text-red-600 dark:text-red-400',
      borderColor: 'border-red-200 dark:border-red-700'
    },
    'shop': {
      icon: '🛍️',
      color: 'green',
      label: 'Tienda',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
      textColor: 'text-green-600 dark:text-green-400',
      borderColor: 'border-green-200 dark:border-green-700'
    }
  };
  return typeInfo[type as keyof typeof typeInfo] || typeInfo.information;
}

export default function PlacePage() {
  const params = useParams();
  const router = useRouter();
  const worldId = params.worldId as string;
  const placeId = params.placeId as string;
  
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await placesService.getById(parseInt(placeId), {
          populate: ['Banner']
        });
        
        if (response.data) {
          setPlace(response.data);
        } else {
          setError('Lugar no encontrado');
        }
      } catch (err) {
        console.error('Error fetching place:', err);
        setError('Error al cargar el lugar');
      } finally {
        setLoading(false);
      }
    };

    if (placeId) {
      fetchPlace();
    }
  }, [placeId]);

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
                  Cargando Lugar...
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
                Cargando lugar mágico...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !place) {
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
                {error || 'Lugar no encontrado'}
              </p>
              <button
                onClick={() => router.push(`/explore/${worldId}`)}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Volver al Mundo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const bannerUrl = getBannerUrl(place);
  const typeInfo = getTypeInfo(place.attributes.Type);

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
                {place.attributes.Name}
              </h1>
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                ✨ Lugar Mágico ✨
              </p>
            </div>
            <div className="w-20"></div> {/* Spacer para centrar */}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-8 py-6 relative z-10 max-w-4xl">
        {/* Imagen banner del lugar */}
        <div className="mb-8">
          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-500/20 dark:from-gray-600/20 dark:to-gray-700/20"></div>
            <Image
              src={bannerUrl}
              alt={place.attributes.Name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute top-4 right-4">
              <div className="w-4 h-4 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="text-sm px-3 py-1 rounded-full bg-white/90 dark:bg-gray-800/90 font-medium text-purple-600 dark:text-purple-400 backdrop-blur-sm">
                {typeInfo.icon} {typeInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Información del lugar */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700 mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {place.attributes.Name}
          </h2>
          
          <div className="prose prose-purple dark:prose-invert max-w-none">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {place.attributes.Description || "Descripción del lugar mágico..."}
            </p>
          </div>
        </div>

        {/* Tipo de lugar */}
        <div className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 ${typeInfo.borderColor}`}>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            📍 Tipo de Lugar
          </h3>
          
          <div className="flex items-center justify-center">
            <div className={`${typeInfo.bgColor} rounded-xl p-6 text-center border-2 ${typeInfo.borderColor}`}>
              <div className="text-4xl mb-2">
                {typeInfo.icon}
              </div>
              <div className={`text-xl font-bold ${typeInfo.textColor}`}>
                {typeInfo.label}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {place.attributes.Type}
              </div>
            </div>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-2 border-purple-200 dark:border-purple-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            💡 Información del Lugar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-300">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🏛️</span>
                <span><strong>Estado:</strong> Activo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">⚔️</span>
                <span><strong>Accesibilidad:</strong> Público</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🗺️</span>
                <span><strong>Región:</strong> Mundo Principal</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">🌙</span>
                <span><strong>Categoría:</strong> {typeInfo.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">✨</span>
                <span><strong>Magia:</strong> Presente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600 dark:text-purple-400">👥</span>
                <span><strong>Visitantes:</strong> Bienvenidos</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 