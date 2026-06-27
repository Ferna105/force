import apiClient from './client';
import {
  MonstersResponse,
  WorldsResponse,
  PlacesResponse,
  RegionsResponse,
  RegionResponse,
  ItemsResponse,
  MonsterResponse,
  WorldResponse,
  PlaceResponse,
  ItemResponse,
  QueryParams,
  Monster,
  World,
  Place,
  Item,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  AuthUser,
  CompanionsResponse,
  CompanionResponse,
  InventoryEntriesResponse,
  BuyResponse,
  DiscoveryEventRequest,
  DiscoveryResponse,
  ShopStock,
  DuelsLobby,
  DuelDetail,
  GameStatus,
  GameClaimResponse,
  GameLeaderboard,
  TrainingInfo,
  TrainStat,
  NeighborhoodParcels,
  HouseResponse,
  HouseBuyResponse,
  HouseVisibility,
} from './types';

// Serializa un objeto/array anidado a la sintaxis de brackets de Strapi 4
// (p. ej. populate[places][populate][0]=Banner).
function appendNested(searchParams: URLSearchParams, key: string, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => appendNested(searchParams, `${key}[${i}]`, v));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) =>
      appendNested(searchParams, `${key}[${k}]`, v),
    );
  } else {
    searchParams.append(key, String(value));
  }
}

// Función helper para construir query parameters
function buildQueryParams(params: QueryParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.populate) {
    if (Array.isArray(params.populate)) {
      params.populate.forEach(item => searchParams.append('populate', item));
    } else if (typeof params.populate === 'object') {
      // populate anidado (Strapi 4): { places: { populate: ['Banner'] } } -> populate[places][populate][0]=Banner
      appendNested(searchParams, 'populate', params.populate);
    } else {
      searchParams.append('populate', params.populate);
    }
  }

  if (params.sort) {
    if (Array.isArray(params.sort)) {
      params.sort.forEach(item => searchParams.append('sort', item));
    } else {
      searchParams.append('sort', params.sort);
    }
  }

  if (params.filters) {
    Object.entries(params.filters).forEach(([key, value]) => {
      searchParams.append(`filters[${key}]`, value.toString());
    });
  }

  if (params.pagination) {
    if (params.pagination.page) {
      searchParams.append('pagination[page]', params.pagination.page.toString());
    }
    if (params.pagination.pageSize) {
      searchParams.append('pagination[pageSize]', params.pagination.pageSize.toString());
    }
  }

  if (params.fields) {
    params.fields.forEach(field => searchParams.append('fields', field));
  }

  return searchParams.toString();
}

// Servicio para Monstruos
export const monstersService = {
  // Obtener todos los monstruos
  async getAll(params?: QueryParams): Promise<MonstersResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/monsters?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching monsters: ${error}`);
    }
  },

  // Obtener un monstruo por ID
  async getById(id: number, params?: QueryParams): Promise<MonsterResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/monsters/${id}?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching monster ${id}: ${error}`);
    }
  },

  // Crear un nuevo monstruo
  async create(data: Monster): Promise<MonstersResponse> {
    try {
      const response = await apiClient.post('/monsters', { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error creating monster: ${error}`);
    }
  },

  // Actualizar un monstruo
  async update(id: number, data: Monster): Promise<MonstersResponse> {
    try {
      const response = await apiClient.put(`/monsters/${id}`, { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating monster ${id}: ${error}`);
    }
  },

  // Eliminar un monstruo
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/monsters/${id}`);
    } catch (error) {
      throw new Error(`Error deleting monster ${id}: ${error}`);
    }
  }
};

// Servicio para Mundos
export const worldsService = {
  // Obtener todos los mundos
  async getAll(params?: QueryParams): Promise<WorldsResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/worlds?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching worlds: ${error}`);
    }
  },

  // Obtener un mundo por ID
  async getById(id: number, params?: QueryParams): Promise<WorldResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/worlds/${id}?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching world ${id}: ${error}`);
    }
  },

  // Crear un nuevo mundo
  async create(data: World): Promise<WorldsResponse> {
    try {
      const response = await apiClient.post('/worlds', { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error creating world: ${error}`);
    }
  },

  // Actualizar un mundo
  async update(id: number, data: World): Promise<WorldsResponse> {
    try {
      const response = await apiClient.put(`/worlds/${id}`, { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating world ${id}: ${error}`);
    }
  },

  // Eliminar un mundo
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/worlds/${id}`);
    } catch (error) {
      throw new Error(`Error deleting world ${id}: ${error}`);
    }
  }
};

// Servicio para Lugares
export const placesService = {
  // Obtener todos los lugares
  async getAll(params?: QueryParams): Promise<PlacesResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/places?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching places: ${error}`);
    }
  },

  // Obtener un lugar por ID
  async getById(id: number, params?: QueryParams): Promise<PlaceResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/places/${id}?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching place ${id}: ${error}`);
    }
  },

  // Obtener lugares por mundo
  async getByWorld(worldId: number, params?: QueryParams): Promise<PlacesResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/places?filters[world]=${worldId}&${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching places for world ${worldId}: ${error}`);
    }
  },

  // Crear un nuevo lugar
  async create(data: Place): Promise<PlacesResponse> {
    try {
      const response = await apiClient.post('/places', { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error creating place: ${error}`);
    }
  },

  // Actualizar un lugar
  async update(id: number, data: Place): Promise<PlacesResponse> {
    try {
      const response = await apiClient.put(`/places/${id}`, { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating place ${id}: ${error}`);
    }
  },

  // Eliminar un lugar
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/places/${id}`);
    } catch (error) {
      throw new Error(`Error deleting place ${id}: ${error}`);
    }
  }
};

// Servicio para Regiones (capa intermedia Mundo → Región → Lugar)
export const regionsService = {
  // Obtener todas las regiones
  async getAll(params?: QueryParams): Promise<RegionsResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/regions?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching regions: ${error}`);
    }
  },

  // Obtener una región por ID
  async getById(id: number, params?: QueryParams): Promise<RegionResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/regions/${id}?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching region ${id}: ${error}`);
    }
  },
};

// Servicio para Items
export const itemsService = {
  // Obtener todos los items
  async getAll(params?: QueryParams): Promise<ItemsResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/items?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching items: ${error}`);
    }
  },

  // Obtener un item por ID
  async getById(id: number, params?: QueryParams): Promise<ItemResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/items/${id}?${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching item ${id}: ${error}`);
    }
  },

  // Obtener items por tipo
  async getByType(type: string, params?: QueryParams): Promise<ItemsResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/items?filters[type]=${type}&${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching items by type ${type}: ${error}`);
    }
  },

  // Obtener items por rareza
  async getByRarity(rarity: string, params?: QueryParams): Promise<ItemsResponse> {
    try {
      const queryString = buildQueryParams(params);
      const response = await apiClient.get(`/items?filters[rarity]=${rarity}&${queryString}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching items by rarity ${rarity}: ${error}`);
    }
  },

  // Crear un nuevo item
  async create(data: Item): Promise<ItemsResponse> {
    try {
      const response = await apiClient.post('/items', { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error creating item: ${error}`);
    }
  },

  // Actualizar un item
  async update(id: number, data: Item): Promise<ItemsResponse> {
    try {
      const response = await apiClient.put(`/items/${id}`, { data });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating item ${id}: ${error}`);
    }
  },

  // Eliminar un item
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/items/${id}`);
    } catch (error) {
      throw new Error(`Error deleting item ${id}: ${error}`);
    }
  }
};

// Servicio general para obtener todos los datos necesarios
export const dataService = {
  // Obtener todos los datos para la página principal
  async getHomeData() {
    try {
      const [monsters, worlds, places] = await Promise.all([
        monstersService.getAll({ populate: '*' }),
        worldsService.getAll({ populate: '*' }),
        placesService.getAll({ populate: '*' })
      ]);

      return {
        monsters: monsters.data || [],
        worlds: worlds.data || [],
        places: places.data || []
      };
    } catch (error) {
      console.error('Error fetching home data:', error);
      return {
        monsters: [],
        worlds: [],
        places: []
      };
    }
  },

  // Obtener datos para la página de exploración (mundos + lugares + criaturas)
  async getExploreData() {
    try {
      const [worlds, places, monsters] = await Promise.all([
        worldsService.getAll({ populate: '*', sort: 'Name:asc' }),
        placesService.getAll({ populate: '*', sort: 'Name:asc' }),
        monstersService.getAll({ populate: '*', sort: 'Name:asc' }),
      ]);

      return {
        worlds: worlds.data || [],
        places: places.data || [],
        monsters: monsters.data || [],
      };
    } catch (error) {
      console.error('Error fetching explore data:', error);
      return { worlds: [], places: [], monsters: [] };
    }
  }
};

// Servicio de autenticación
export const authService = {
  // Login con email/contraseña
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/local', credentials);
      return response.data;
    } catch (error) {
      throw new Error(`Error en login: ${error}`);
    }
  },

  // Registro de usuario
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/local/register', userData);
      return response.data;
    } catch (error) {
      throw new Error(`Error en registro: ${error}`);
    }
  },

  // Obtener información del usuario actual
  async getMe(token: string): Promise<AuthUser> {
    try {
      const response = await apiClient.get('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo información del usuario: ${error}`);
    }
  },

  // Logout (limpiar token)
  logout(): void {
    // En el frontend, simplemente removemos el token del localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  },

  // Usuario actual con relaciones pobladas (saldo + monstruos descubiertos)
  async getMeFull(): Promise<AuthUser> {
    try {
      const response = await apiClient.get('/users/me?populate[discoveredMonsters][fields][0]=id');
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo el usuario: ${error}`);
    }
  }
};

// Servicio de compañeros (relación usuario ↔ monstruo + cuidados).
// Usa el endpoint /companions/mine scopeado por el token (la relación a user
// no es filtrable por el content API estándar).
export const companionsService = {
  // Compañero(s) activo(s) del usuario autenticado
  async getActive(): Promise<CompanionsResponse> {
    try {
      const response = await apiClient.get('/companions/mine');
      const active = (response.data?.data ?? []).filter((c: { attributes: { isActive: boolean } }) => c.attributes.isActive);
      return { data: active, meta: {} };
    } catch (error) {
      throw new Error(`Error fetching active companion: ${error}`);
    }
  },

  // Todos los compañeros del usuario autenticado
  async getMine(): Promise<CompanionsResponse> {
    try {
      const response = await apiClient.get('/companions/mine');
      return { data: response.data?.data ?? [], meta: {} };
    } catch (error) {
      throw new Error(`Error fetching companions: ${error}`);
    }
  },

  // Adoptar un monstruo como compañero (crea el compañero con stats base).
  async adopt(monsterId: number): Promise<CompanionResponse> {
    const response = await apiClient.post('/companions/adopt', { monsterId });
    return response.data;
  },

  // Acciones de cuidado (devuelven el compañero actualizado, shape aplanado)
  async feed(id: number) {
    const response = await apiClient.post(`/companions/${id}/feed`);
    return response.data;
  },
  async play(id: number) {
    const response = await apiClient.post(`/companions/${id}/play`);
    return response.data;
  },
  async pet(id: number) {
    const response = await apiClient.post(`/companions/${id}/pet`);
    return response.data;
  },

  // Equipar / quitar un objeto del compañero (devuelven el compañero actualizado,
  // con equippedItems poblado).
  async equip(id: number, itemId: number): Promise<CompanionResponse> {
    const response = await apiClient.post(`/companions/${id}/equip`, { itemId });
    return response.data;
  },
  async unequip(id: number, itemId: number): Promise<CompanionResponse> {
    const response = await apiClient.post(`/companions/${id}/unequip`, { itemId });
    return response.data;
  },

  // Curar al compañero con una poción (consume 1 del inventario, sube currentHealth).
  async heal(id: number, itemId: number): Promise<CompanionResponse> {
    const response = await apiClient.post(`/companions/${id}/heal`, { itemId });
    return response.data;
  },
};

// Servicio de inventario (entradas con cantidad) + tienda
export const inventoryService = {
  // Inventario del usuario autenticado (objetos + cantidades)
  async getMine(): Promise<InventoryEntriesResponse> {
    try {
      const response = await apiClient.get('/inventory-entries/mine');
      return { data: response.data?.data ?? [], meta: {} };
    } catch (error) {
      throw new Error(`Error fetching inventory: ${error}`);
    }
  },

  // Comprar un objeto (descuenta saldo y suma al inventario). Si se indica el
  // lugar (tienda) donde se compró, habilita tareas de descubrimiento del tipo
  // "comprar en el mundo X" y la respuesta puede traer monstruos descubiertos.
  async buy(itemId: number, placeId?: number): Promise<BuyResponse> {
    try {
      const response = await apiClient.post('/shop/buy', { itemId, placeId });
      return response.data;
    } catch (error) {
      throw new Error(`Error al comprar: ${error}`);
    }
  },
};

// Servicio de tienda: stock por lugar (objetos disponibles + cantidades).
export const shopService = {
  // Stock actual de una tienda. Si está agotada, trae la cuenta regresiva de
  // reabastecimiento (restockInSeconds).
  async getStock(placeId: number): Promise<ShopStock> {
    try {
      const response = await apiClient.get(`/shop/${placeId}/stock`);
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo el stock de la tienda: ${error}`);
    }
  },
};

// Servicio de descubrimiento de monstruos.
// Registra eventos de actividad (visitar/jugar) y reevalúa las estrategias; la
// respuesta trae los monstruos recién descubiertos para mostrar el modal.
export const discoveryService = {
  async recordEvent(event: DiscoveryEventRequest): Promise<DiscoveryResponse> {
    try {
      const response = await apiClient.post('/discovery/event', event);
      return { newlyDiscovered: response.data?.newlyDiscovered ?? [] };
    } catch (error) {
      throw new Error(`Error registrando evento de descubrimiento: ${error}`);
    }
  },

  // Reevalúa sin registrar evento (tareas basadas en estado, p. ej. inventario).
  async sync(): Promise<DiscoveryResponse> {
    try {
      const response = await apiClient.post('/discovery/sync');
      return { newlyDiscovered: response.data?.newlyDiscovered ?? [] };
    } catch (error) {
      throw new Error(`Error sincronizando descubrimientos: ${error}`);
    }
  },
};

// Servicio del battledome: lobby de duelos (el combate en vivo va por socket).
export const battleService = {
  // Duelos abiertos de otros + los propios (open/active) de este battledome.
  async listDuels(placeId: number): Promise<DuelsLobby> {
    const response = await apiClient.get(`/battle/duels?placeId=${placeId}`);
    return { open: response.data?.open ?? [], mine: response.data?.mine ?? [] };
  },
  // Crear un duelo abierto (escrow del wager). Devuelve el id + saldo actualizado.
  async create(placeId: number, companionId: number, wager: number): Promise<{ id: number; balance: number }> {
    const response = await apiClient.post('/battle/duels', { placeId, companionId, wager });
    return response.data;
  },
  // Inscribirse a un duelo abierto (escrow del wager).
  async join(duelId: number, companionId: number): Promise<{ id: number; balance: number }> {
    const response = await apiClient.post(`/battle/duels/${duelId}/join`, { companionId });
    return response.data;
  },
  // Cancelar un duelo abierto propio (reintegra el wager).
  async cancel(duelId: number): Promise<{ id: number; balance: number }> {
    const response = await apiClient.post(`/battle/duels/${duelId}/cancel`);
    return response.data;
  },
  // Cargar un duelo (para la pantalla de batalla).
  async get(duelId: number): Promise<DuelDetail> {
    const response = await apiClient.get(`/battle/duels/${duelId}`);
    return response.data.duel;
  },
};

// Servicio del motor de juegos (places de tipo `game`).
// El motor solo provee el contrato de reclamo: cada juego tiene su propia
// mecánica/puntaje en el cliente, pero la conversión a monedas y el cooldown
// global (1 reclamo cada N horas) se resuelven en el servidor.
export const gamesService = {
  // Estado del juego para el usuario autenticado (qué juego + cooldown).
  async getStatus(placeId: number): Promise<GameStatus> {
    const response = await apiClient.get(`/games/${placeId}/status`);
    return response.data;
  },
  // Reclama la recompensa. `points` es el puntaje interno del juego (opcional:
  // el template no lo usa). Devuelve la recompensa, el saldo nuevo y el cooldown.
  async claim(placeId: number, points?: number): Promise<GameClaimResponse> {
    const response = await apiClient.post(`/games/${placeId}/claim`, { points });
    return response.data;
  },
  // Tabla de récords del juego (público). Con sesión, marca al usuario actual.
  async getLeaderboard(placeId: number, limit = 5): Promise<GameLeaderboard> {
    const response = await apiClient.get(`/games/${placeId}/leaderboard`, { params: { limit } });
    return response.data;
  },
};

// Escuela de entrenamiento: estado (tótem exigido, stats, entrenador) + iniciar entrenamiento.
export const trainingService = {
  // Estado de la escuela para un compañero (requiere sesión).
  async getInfo(placeId: number, companionId: number): Promise<TrainingInfo> {
    const response = await apiClient.get(`/training/${placeId}/info`, { params: { companionId } });
    return response.data;
  },
  // Inicia un entrenamiento de `stat`: cobra el tótem exigido y deja al compañero entrenando.
  async start(placeId: number, companionId: number, stat: TrainStat): Promise<TrainingInfo> {
    const response = await apiClient.post(`/training/${placeId}/start`, { companionId, stat });
    return response.data;
  },
};

// Servicio de vecindarios/casas (places de tipo `neighborhood`).
// El comprador elige una variante de casa en una parcela libre; cada usuario tiene
// una sola casa en todo el juego, con una grilla interior de muebles. Colocar un
// mueble consume 1 del inventario; quitarlo lo devuelve.
export const housesService = {
  // Mapa de parcelas de un vecindario (público; usa la sesión si hay token).
  async getParcels(placeId: number): Promise<NeighborhoodParcels> {
    const response = await apiClient.get(`/neighborhoods/${placeId}/parcels`);
    return response.data;
  },
  // Comprar una casa en una parcela libre (eligiendo una variante de diseño).
  async buy(placeId: number, parcelIndex: number, designId: number | null): Promise<HouseBuyResponse> {
    const response = await apiClient.post(`/neighborhoods/${placeId}/buy`, { parcelIndex, designId });
    return response.data;
  },
  // Mi casa (o null si todavía no tengo).
  async getMine(): Promise<HouseResponse> {
    const response = await apiClient.get('/houses/mine');
    return response.data;
  },
  // Entrar a una casa (pública para cualquiera, privada solo para el dueño).
  async getHouse(houseId: number): Promise<HouseResponse> {
    const response = await apiClient.get(`/houses/${houseId}`);
    return response.data;
  },
  // Colocar un mueble en un cubo (consume 1 del inventario). Devuelve la casa.
  async place(houseId: number, itemId: number, x: number, y: number): Promise<HouseResponse> {
    const response = await apiClient.post(`/houses/${houseId}/place`, { itemId, x, y });
    return response.data;
  },
  // Quitar un mueble de un cubo (devuelve 1 al inventario). Devuelve la casa.
  async remove(houseId: number, x: number, y: number): Promise<HouseResponse> {
    const response = await apiClient.post(`/houses/${houseId}/remove`, { x, y });
    return response.data;
  },
  // Alternar la visibilidad de la casa (pública / privada).
  async setVisibility(houseId: number, visibility: HouseVisibility): Promise<HouseResponse> {
    const response = await apiClient.post(`/houses/${houseId}/visibility`, { visibility });
    return response.data;
  },
};