'use client';
import Image from "next/image";
import { useExploreData } from "../../api/hooks";
import type { World } from "../../api/types";

// Datos mockeados de mundos como fallback
const fallbackWorlds: World[] = [
  {
    id: 1,
    attributes: {
      Name: "Eryndor",
      Description: "Eryndor es un mundo de contrastes y fuerzas primordiales...",
      Image: null,
      places: { data: [] },
      createdAt: "",
      updatedAt: "",
      publishedAt: ""
    }
  }
];

// Función para obtener colores del mundo
function getWorldColors(world: World) {
  const colors = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900",
      border: "border-blue-200 dark:border-blue-700",
      text: "text-blue-800 dark:text-blue-200",
      accent: "text-blue-600 dark:text-blue-400"
    },
    gray: {
      bg: "bg-gray-100 dark:bg-gray-900",
      border: "border-gray-200 dark:border-gray-700",
      text: "text-gray-800 dark:text-gray-200",
      accent: "text-gray-600 dark:text-gray-400"
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900",
      border: "border-red-200 dark:border-red-700",
      text: "text-red-800 dark:text-red-200",
      accent: "text-red-600 dark:text-red-400"
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900",
      border: "border-green-200 dark:border-green-700",
      text: "text-green-800 dark:text-green-200",
      accent: "text-green-600 dark:text-green-400"
    }
  };
  
  // Mapear nombres de mundos a colores
  const worldColorMap: Record<string, keyof typeof colors> = {
    "Eryndor": "blue",
    "Deo": "gray", 
    "Egea": "red",
    "Koril": "green"
  };
  
  const color = worldColorMap[world.attributes.Name] || "blue";
  return colors[color] || colors.blue;
}

// Función para obtener color de dificultad
function getDifficultyColor(difficulty: string) {
  const colors = {
    "Fácil": "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    "Moderado": "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    "Alto": "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200",
    "Extremo": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
  };
  return colors[difficulty as keyof typeof colors] || colors.Moderado;
}

// Función para obtener color de estado
function getStatusColor(status: string) {
  const colors = {
    "Activo": "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    "Silencioso": "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200",
    "Inestable": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    "Vivo": "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200"
  };
  return colors[status as keyof typeof colors] || colors.Activo;
}

// Función para obtener características del mundo basadas en el nombre
function getWorldFeatures(worldName: string): string[] {
  const featuresMap: Record<string, string[]> = {
    "Eryndor": ["Montañas nevadas", "Bosques verdes", "Lagos cristalinos", "Desiertos áridos", "Grietas de magma"],
    "Deo": ["Túneles simétricos", "Estructuras metálicas", "Portales circulares", "Cristales oscuros", "Máquinas antiguas"],
    "Egea": ["Superficie carmesí", "Cráteres profundos", "Fisuras de magma", "Erupciones subterráneas", "Corazón ardiente"],
    "Koril": ["Minerales esmeralda", "Cráteres dorados", "Energía orgánica", "Torres metálicas", "Criaturas cristalinas"]
  };
  return featuresMap[worldName] || ["Características únicas"];
}

// Función para obtener tipo de mundo basado en el nombre
function getWorldType(worldName: string): string {
  const typeMap: Record<string, string> = {
    "Eryndor": "Mundo Principal",
    "Deo": "Luna Artificial", 
    "Egea": "Luna de Fuego",
    "Koril": "Luna Bioluminiscente"
  };
  return typeMap[worldName] || "Mundo Mágico";
}

// Función para obtener estado del mundo basado en el nombre
function getWorldStatus(worldName: string): string {
  const statusMap: Record<string, string> = {
    "Eryndor": "Activo",
    "Deo": "Silencioso",
    "Egea": "Inestable", 
    "Koril": "Vivo"
  };
  return statusMap[worldName] || "Desconocido";
}

// Función para obtener dificultad del mundo basado en el nombre
function getWorldDifficulty(worldName: string): string {
  const difficultyMap: Record<string, string> = {
    "Eryndor": "Moderado",
    "Deo": "Alto",
    "Egea": "Extremo",
    "Koril": "Moderado"
  };
  return difficultyMap[worldName] || "Moderado";
}

// Función para obtener la URL de la imagen
function getImageUrl(world: World): string {
  if (world.attributes.Image?.data?.attributes?.formats?.medium?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${world.attributes.Image.data.attributes.formats.medium.url}`;
  }
  if (world.attributes.Image?.data?.attributes?.url) {
    return `${process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'}${world.attributes.Image.data.attributes.url}`;
  }
  return "/next.svg"; // Fallback
}

// Componente de tarjeta de mundo
function WorldCard({ world }: { world: World }) {
  const colors = getWorldColors(world);
  const features = getWorldFeatures(world.attributes.Name);
  const type = getWorldType(world.attributes.Name);
  const status = getWorldStatus(world.attributes.Name);
  const difficulty = getWorldDifficulty(world.attributes.Name);
  const imageUrl = getImageUrl(world);
  const placesCount = world.attributes.places?.data?.length || 0;
  
  return (
    <article 
      className={`${colors.bg} ${colors.border} backdrop-blur-sm rounded-2xl shadow-lg border-2 overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl cursor-pointer`}
      onClick={() => window.location.href = `/explore/${world.id}`}
    >
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-400/20 to-gray-500/20 dark:from-gray-600/20 dark:to-gray-700/20"></div>
        <Image
          src={imageUrl}
          alt={world.attributes.Name}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs px-2 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 font-medium ${colors.accent}`}>
            🌍 {type}
          </span>
        </div>
        {/* Overlay de hover */}
        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
            <span className="text-white font-bold text-lg">Ver Detalles</span>
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {world.attributes.Name}
          </h3>
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(status)}`}>
              {status}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full border ${getDifficultyColor(difficulty)}`}>
              {difficulty}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
          {world.attributes.Description || "Descripción del mundo mágico..."}
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Lugares descubiertos:</span>
            <span className={`text-sm font-bold ${colors.accent}`}>{placesCount} lugares</span>
          </div>
          
          <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">Características principales:</span>
            <div className="flex flex-wrap gap-1">
              {features.slice(0, 3).map((feature, index) => (
                <span key={index} className="text-xs bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  ✨ {feature}
                </span>
              ))}
              {features.length > 3 && (
                <span className="text-xs bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                  +{features.length - 3} más
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// Componente principal
function ExploreContent() {
  const { data, loading, error } = useExploreData();
  
  // Usar datos de la API si están disponibles, sino usar fallback
  const worlds = data?.worlds || fallbackWorlds;
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 pb-20 relative overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
          <div className="container mx-auto px-8 py-4">
            <div className="flex justify-center items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src="/next.svg"
                    alt="Logo Mágico"
                    width={50}
                    height={50}
                    className="dark:invert drop-shadow-lg"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    Explorar Mundos
                  </h1>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    ✨ Descubre todos los reinos ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Loading State */}
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-600 dark:text-purple-400 font-medium">
                Cargando mundos mágicos...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 pb-20 relative overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
          <div className="container mx-auto px-8 py-4">
            <div className="flex justify-center items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Image
                    src="/next.svg"
                    alt="Logo Mágico"
                    width={50}
                    height={50}
                    className="dark:invert drop-shadow-lg"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    Explorar Mundos
                  </h1>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    ✨ Descubre todos los reinos ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Error State */}
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">
                Error al cargar los mundos
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-pink-300/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-blue-300/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-yellow-300/20 rounded-full blur-xl animate-pulse delay-1500"></div>
      </div>

      {/* Header con Logo */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b-2 border-purple-200 dark:border-purple-700">
        <div className="container mx-auto px-8 py-4">
          <div className="flex justify-center items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src="/next.svg"
                  alt="Logo Mágico"
                  width={50}
                  height={50}
                  className="dark:invert drop-shadow-lg"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Explorar Mundos
                </h1>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  ✨ Descubre todos los reinos ✨
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <div className="container mx-auto px-8 py-6 relative z-10 max-w-6xl">
        {/* Estadísticas de exploración */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-purple-200 dark:border-purple-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{worlds.length}</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Mundos Descubiertos</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-green-200 dark:border-green-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {worlds.reduce((total, world) => total + (world.attributes.places?.data?.length || 0), 0)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Lugares Totales</div>
          </div>
        </div>

        {/* Sección de mundos */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              🌍 Mundos Disponibles 🌍
            </h2>
            <p className="text-purple-600 dark:text-purple-400 font-medium">
              Explora cada rincón de nuestro universo mágico
            </p>
          </div>
          
          {/* Grid de mundos */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {worlds.map((world) => (
              <WorldCard key={world.id} world={world} />
            ))}
          </div>
        </section>

        {/* Información adicional */}
        <section className="mt-12">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              💡 Consejos de Exploración
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="space-y-2">
                <p>• <strong>Eryndor</strong> es el mundo principal, perfecto para comenzar tu aventura</p>
                <p>• <strong>Deo</strong> contiene tecnología antigua y secretos cósmicos</p>
                <p>• <strong>Egea</strong> es extremadamente peligrosa, prepárate bien</p>
              </div>
              <div className="space-y-2">
                <p>• <strong>Koril</strong> alberga criaturas bioluminiscentes únicas</p>
                <p>• Cada mundo tiene sus propios guardianes y desafíos</p>
                <p>• Los lugares se desbloquean conforme explores</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Explore() {
  return <ExploreContent />;
} 