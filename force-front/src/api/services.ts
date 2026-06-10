import apiClient from './client';
import {
  MonstersResponse,
  WorldsResponse,
  PlacesResponse,
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
  InventoryEntriesResponse,
  BuyResponse,
  DiscoveryEventRequest,
  DiscoveryResponse,
  ShopStock,
} from './types';

// Función helper para construir query parameters
function buildQueryParams(params: QueryParams = {}): string {
  const searchParams = new URLSearchParams();

  if (params.populate) {
    if (Array.isArray(params.populate)) {
      params.populate.forEach(item => searchParams.append('populate', item));
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