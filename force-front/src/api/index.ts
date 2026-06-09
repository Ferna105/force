// Exportar el cliente API
export { default as apiClient } from './client';

// Exportar tipos
export type {
  StrapiResponse,
  StrapiEntity,
  StrapiImage,
  BiomeName,
  Monster,
  World,
  Place,
  Item,
  Companion,
  InventoryEntry,
  BuyResponse,
  MonstersResponse,
  WorldsResponse,
  PlacesResponse,
  ItemsResponse,
  CompanionsResponse,
  InventoryEntriesResponse,
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
  companionsService,
  inventoryService,
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
  useWorld,
  usePlace,
  useMonster,
  useItems,
  useItemsByType,
  useItemsByRarity,
  useActiveCompanion,
  useInventory,
  useDiscoveredMonsters,
  useLogin,
  useRegister,
  useGetMe
} from './hooks';
