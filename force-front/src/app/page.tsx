import Image from "next/image";

// Datos mockeados de noticias basadas en el lore real de la base de datos
const mockNews = [
  {
    id: 1,
    title: "Nuevo portal descubierto en Frostpeak Citadel",
    excerpt: "Los sabios de las montañas nevadas han encontrado un portal ancestral en las torres de hielo de Frostpeak Citadel. Se dice que conecta con el Reino de las Estrellas...",
    image: "/next.svg",
    date: "2024-01-15",
    category: "Portales Mágicos",
    color: "purple",
    world: "Eryndor",
    place: "Frostpeak Citadel"
  },
  {
    id: 2,
    title: "El dragón de Ember Rift despierta",
    excerpt: "Los exploradores reportan actividad inusual en la grieta ardiente del este. El antiguo dragón de fuego que custodia las reliquias prohibidas ha comenzado a moverse...",
    image: "/vercel.svg",
    date: "2024-01-14",
    category: "Criaturas Mágicas",
    color: "rainbow",
    world: "Eryndor",
    place: "Ember Rift"
  },
  {
    id: 3,
    title: "Los ojos de Deo se abren por primera vez",
    excerpt: "Las tres enormes aberturas de la megápolis lunar han comenzado a emitir pulsos de energía. Los investigadores del Observatory Nexus están estudiando el fenómeno...",
    image: "/globe.svg",
    date: "2024-01-13",
    category: "Mundos Mágicos",
    color: "blue",
    world: "Deo",
    place: "Observatory Nexus"
  },
  {
    id: 4,
    title: "Cristales cantores encontrados en Luminous Caverns",
    excerpt: "Los mineros de Deo han descubierto cristales que emiten melodías mágicas en las cuevas bioluminiscentes. Los hongos metálicos parecen resonar con la música...",
    image: "/file.svg",
    date: "2024-01-12",
    category: "Tesoros Mágicos",
    color: "green",
    world: "Deo",
    place: "Luminous Caverns"
  },
  {
    id: 5,
    title: "El Corazón Ardiente de Egea late más fuerte",
    excerpt: "La gigantesca grieta iluminada por magma en Egea ha aumentado su intensidad. Los viajeros espaciales la usan como faro, pero algo ha cambiado en su ritmo...",
    image: "/next.svg",
    date: "2024-01-11",
    category: "Fenómenos Cósmicos",
    color: "purple",
    world: "Egea",
    place: "Crimson Rift"
  },
  {
    id: 6,
    title: "Verdant Spire transmite mensajes misteriosos",
    excerpt: "La torre de cristal verde en Koril ha comenzado a emitir señales desconocidas. Los herreros alquimistas del Crystal Forge Outpost están investigando...",
    image: "/vercel.svg",
    date: "2024-01-10",
    category: "Tecnología Mágica",
    color: "blue",
    world: "Koril",
    place: "Verdant Spire"
  },
  {
    id: 7,
    title: "Whispering Lake revela nuevos secretos",
    excerpt: "Las aguas del lago central de Eryndor han comenzado a susurrar palabras en un idioma antiguo. Los sabios creen que es un portal a otros planos de existencia...",
    image: "/globe.svg",
    date: "2024-01-09",
    category: "Portales Mágicos",
    color: "purple",
    world: "Eryndor",
    place: "Whispering Lake"
  },
  {
    id: 8,
    title: "Guardianes mecánicos activos en Reactor Abyss",
    excerpt: "Los guardianes de metal fundido en el núcleo de Deo han despertado. Los exploradores reportan actividad en el abismo iluminado por energía roja...",
    image: "/file.svg",
    date: "2024-01-08",
    category: "Criaturas Mágicas",
    color: "rainbow",
    world: "Deo",
    place: "The Reactor Abyss"
  },
  {
    id: 9,
    title: "Serpiente marina avistada cerca de Serpent's Rest Island",
    excerpt: "Los marineros han reportado avistamientos de la legendaria serpiente marina gigante cerca de la isla del sur. Los piratas y comerciantes están en alerta...",
    image: "/next.svg",
    date: "2024-01-07",
    category: "Criaturas Mágicas",
    color: "rainbow",
    world: "Eryndor",
    place: "Serpent's Rest Island"
  },
  {
    id: 10,
    title: "Oracle Grove responde a las estrellas",
    excerpt: "Las columnas de mineral verde en Koril han comenzado a brillar con intensidad inusual. Los susurros de antiguas inteligencias son más claros que nunca...",
    image: "/vercel.svg",
    date: "2024-01-06",
    category: "Fenómenos Cósmicos",
    color: "purple",
    world: "Koril",
    place: "Oracle Grove"
  },
  {
    id: 11,
    title: "Nuevos drones de batalla en Crater Arena",
    excerpt: "Los antiguos drones de batalla en el coliseo de Deo han activado nuevos protocolos de combate. Los aventureros buscan desafiar a estas máquinas legendarias...",
    image: "/globe.svg",
    date: "2024-01-05",
    category: "Tecnología Mágica",
    color: "blue",
    world: "Deo",
    place: "Crater Arena"
  },
  {
    id: 12,
    title: "Emerald Trenches revelan guardianes elementales",
    excerpt: "Las gargantas profundas de Koril han despertado a sus guardianes elementales. Las criaturas de cristal protegen minerales energéticos de gran valor...",
    image: "/file.svg",
    date: "2024-01-04",
    category: "Criaturas Mágicas",
    color: "rainbow",
    world: "Koril",
    place: "Emerald Trenches"
  }
];

// Función para obtener colores de categoría
function getCategoryColors(category: string) {
  const colors = {
    purple: "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700",
    rainbow: "bg-gradient-to-r from-pink-100 via-yellow-100 to-blue-100 dark:from-pink-900 dark:via-yellow-900 dark:to-blue-900 text-purple-800 dark:text-purple-200 border-pink-200 dark:border-pink-700",
    blue: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700",
    green: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
  };
  return colors[category as keyof typeof colors] || colors.blue;
}

// Función para obtener color del mundo
function getWorldColor(world: string) {
  const colors = {
    "Eryndor": "text-blue-600 dark:text-blue-400",
    "Deo": "text-gray-600 dark:text-gray-400",
    "Egea": "text-red-600 dark:text-red-400",
    "Koril": "text-green-600 dark:text-green-400"
  };
  return colors[world as keyof typeof colors] || "text-purple-600 dark:text-purple-400";
}

// Componente de tarjeta de noticia
function NewsCard({ news }: { news: typeof mockNews[0] }) {
  return (
    <article className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-purple-200 dark:border-purple-700 overflow-hidden transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-pink-400/20 dark:from-purple-600/20 dark:to-pink-600/20"></div>
        <Image
          src={news.image}
          alt={news.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs px-2 py-1 rounded-full bg-white/80 dark:bg-gray-800/80 font-medium ${getWorldColor(news.world)}`}>
            🌍 {news.world}
          </span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-3 py-1 rounded-full border ${getCategoryColors(news.color)} font-medium`}>
            ✨ {news.category}
          </span>
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            🌟 {new Date(news.date).toLocaleDateString('es-ES')}
          </span>
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 text-lg">
          {news.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-3">
          {news.excerpt}
        </p>
        
        {/* Información del lugar */}
        <div className="pt-3 border-t border-purple-200 dark:border-purple-600">
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
            🏰 {news.place}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-purple-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-pink-300/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-blue-300/20 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute top-60 left-1/2 w-12 h-12 bg-yellow-300/20 rounded-full blur-xl animate-pulse delay-1500"></div>
      </div>

      {/* Contenido principal */}
      <div className="container mx-auto px-8 py-6 relative z-10 max-w-6xl">
        {/* Estadísticas del mundo */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-purple-200 dark:border-purple-700">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Criaturas</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-blue-200 dark:border-blue-700">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">4</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Mundos</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-green-200 dark:border-green-700">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">26</div>
            <div className="text-xs text-green-600 dark:text-green-400">Lugares</div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 text-center border-2 border-red-200 dark:border-red-700">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">12</div>
            <div className="text-xs text-red-600 dark:text-red-400">Noticias</div>
          </div>
        </div>

        {/* Sección de noticias destacadas */}
        <section className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
              🌟 Aventuras Mágicas 🌟
            </h2>
            <p className="text-purple-600 dark:text-purple-400 font-medium">
              Descubre los secretos más increíbles de nuestro mundo
            </p>
          </div>
          
          {/* Grid de noticias */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mockNews.slice(0, 6).map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>
        </section>

        {/* Sección de noticias recientes */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-purple-800 dark:text-purple-300 mb-2">
              🎭 Más Historias Mágicas
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full"></div>
          </div>
          <div className="space-y-4">
            {mockNews.slice(6, 9).map((news) => (
              <article key={`recent-${news.id}`} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border-2 border-purple-200 dark:border-purple-700 transform hover:scale-102 transition-all duration-300">
                <div className="flex gap-4">
                  <div className="relative w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex-shrink-0 border-2 border-purple-200 dark:border-purple-600">
                    <Image
                      src={news.image}
                      alt={news.title}
                      fill
                      className="object-cover rounded-lg"
                    />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColors(news.color)} font-medium`}>
                        ✨ {news.category}
                      </span>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        🌟 {new Date(news.date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                      {news.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
                      {news.excerpt}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 ${getWorldColor(news.world)}`}>
                        🌍 {news.world}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                        🏰 {news.place}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
