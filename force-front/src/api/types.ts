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