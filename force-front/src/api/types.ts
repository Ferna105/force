// Tipos base para las respuestas de Strapi
export interface StrapiResponse<T> {
  data: T;
  meta: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface StrapiEntity {
  id: number;
  attributes: {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para imágenes de Strapi
export interface StrapiImage {
  data: {
    id: number;
    attributes: {
      name: string;
      alternativeText: string | null;
      caption: string | null;
      width: number;
      height: number;
      formats: {
        thumbnail: StrapiImageFormat;
        small: StrapiImageFormat;
        medium: StrapiImageFormat;
        large: StrapiImageFormat;
      };
      hash: string;
      ext: string;
      mime: string;
      size: number;
      url: string;
      previewUrl: string | null;
      provider: string;
      provider_metadata: unknown;
      createdAt: string;
      updatedAt: string;
    };
  } | null;
}

export interface StrapiImageFormat {
  name: string;
  hash: string;
  ext: string;
  mime: string;
  path: string | null;
  width: number;
  height: number;
  size: number;
  sizeInBytes: number;
  url: string;
}

// Unión de biomas/ecosistemas (debe coincidir con el enum del backend)
export type BiomeName = 'forest' | 'aqua' | 'volcanic' | 'space' | 'snow' | 'arid';

// Estrategia de descubrimiento de un monstruo (campo json en el backend).
// Una tarea queda definida por su `type` + `params` libres; el motor server-side
// es la única fuente de verdad de su evaluación.
export interface DiscoveryTask {
  type: string;
  label?: string;
  params?: Record<string, unknown>;
}
export interface DiscoveryStrategy {
  ordered?: boolean;
  tasks: DiscoveryTask[];
}

// Tipos específicos para cada entidad basados en la respuesta real
export interface Monster extends StrapiEntity {
  attributes: {
    Name: string;
    Image: StrapiImage | null;
    Nature: string | null;
    Origin: string | null;
    AverageHeight: number | null;
    AverageWeight: number | null;
    InnateAbility: string | null;
    Biome: BiomeName | null;
    DiscoveryStrategy?: DiscoveryStrategy | null;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface Place extends StrapiEntity {
  attributes: {
    Name: string;
    Description: string | null;
    Banner: StrapiImage | null;
    Type: 'shop' | 'game' | 'information';
    Biome: BiomeName | null;
    HotspotX: number | null;
    HotspotY: number | null;
    World?: { data: World | null };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

export interface World extends StrapiEntity {
  attributes: {
    Name: string;
    Description: string | null;
    Image: StrapiImage | null;
    Biome: BiomeName | null;
    places: {
      data: Place[];
    };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para las respuestas de la API
export type MonstersResponse = StrapiResponse<Monster[]>;
export type WorldsResponse = StrapiResponse<World[]>;
export type PlacesResponse = StrapiResponse<Place[]>;

// Tipos para respuestas de getById (un solo objeto)
export type MonsterResponse = StrapiResponse<Monster>;
export type WorldResponse = StrapiResponse<World>;
export type PlaceResponse = StrapiResponse<Place>;

// Tipos para parámetros de consulta
export interface QueryParams {
  populate?: string | string[];
  sort?: string | string[];
  filters?: Record<string, string>;
  pagination?: {
    page?: number;
    pageSize?: number;
  };
  fields?: string[];
}

// Tipo para errores de la API
export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

// Tipos para autenticación
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  provider: string;
  confirmed: boolean;
  blocked: boolean;
  balance?: number;
  // Solo presente cuando se pide con populate (shape aplanado de users-permissions)
  discoveredMonsters?: { id: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  jwt: string;
  user: AuthUser;
}

export interface AuthError {
  error: {
    message: string;
    status: number;
    details?: unknown;
  };
}

// Tipos para el content type Item
export interface Item extends StrapiEntity {
  attributes: {
    name: string;
    slug: string;
    description: string | null;
    type: 'weapon' | 'armor' | 'consumable' | 'key' | 'misc';
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    icon: StrapiImage | null;
    weight: number | null;
    value: number | null;
    is_stackable: boolean;
    max_stack: number;
    usable: boolean;
    cooldown: number;
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}

// Tipos para las respuestas de Item
export type ItemsResponse = StrapiResponse<Item[]>;
export type ItemResponse = StrapiResponse<Item>;

// ============ Compañero (relación usuario ↔ monstruo + cuidados) ============
export interface Companion extends StrapiEntity {
  attributes: {
    happiness: number;
    energy: number;
    bond: number;
    isActive: boolean;
    lastInteraction: string | null;
    monster?: { data: Monster | null };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
export type CompanionsResponse = StrapiResponse<Companion[]>;
export type CompanionResponse = StrapiResponse<Companion>;

// ============ Entrada de inventario (objeto + cantidad) ============
export interface InventoryEntry extends StrapiEntity {
  attributes: {
    quantity: number;
    item?: { data: Item | null };
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
  };
}
export type InventoryEntriesResponse = StrapiResponse<InventoryEntry[]>;

// Respuesta del endpoint de compra (POST /shop/buy)
export interface BuyResponse {
  balance: number;
  entry: { id: number; quantity: number };
  // Monstruos recién descubiertos por efecto de la compra (p. ej. "comprar en X").
  newlyDiscovered?: Monster[];
}

// ============ Descubrimiento de monstruos ============
export type DiscoveryEventType = 'visit_place' | 'play_place' | 'buy_item';

export interface DiscoveryEventRequest {
  type: DiscoveryEventType;
  placeId?: number;
  itemId?: number;
}

// Respuesta de /discovery/event y /discovery/sync
export interface DiscoveryResponse {
  newlyDiscovered: Monster[];
}
