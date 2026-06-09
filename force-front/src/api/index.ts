// Exportar el cliente API
export { default as apiClient } from './client';

// Exportar tipos
export type {
  StrapiResponse,
  StrapiEntity,
  Monster,
  World,
  Place,
  Item,
  MonstersResponse,
  WorldsResponse,
  PlacesResponse,
  ItemsResponse,
  MonsterResponse,
  WorldResponse,
  PlaceResponse,
  ItemResponse,
  QueryParams,
  ApiError,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthError
} from './types';

// Exportar servicios
export {
  monstersService,
  worldsService,
  placesService,
  itemsService,
  dataService,
  authService
} from './services';

// Exportar hooks
export {
  useHomeData,
  useExploreData,
  useMonsters,
  useWorlds,
  usePlaces,
  usePlacesByWorld,
  useItems,
  useItemsByType,
  useItemsByRarity,
  useLogin,
  useRegister,
  useGetMe
} from './hooks'; 