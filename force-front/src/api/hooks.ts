'use client';
import { useState, useEffect } from 'react';
import { dataService, monstersService, worldsService, placesService, itemsService, authService, companionsService, inventoryService } from './services';
import type { Monster, World, Place, Item, Companion, InventoryEntry, QueryParams, LoginRequest, RegisterRequest, AuthUser } from './types';

// Hook para manejar estados de carga y error
interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Hook para obtener datos de la página principal
export function useHomeData() {
  const [state, setState] = useState<UseApiState<{
    monsters: Monster[];
    worlds: World[];
    places: Place[];
  }>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const data = await dataService.getHomeData();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchData();
  }, []);

  return state;
}

// Hook para obtener datos de exploración
export function useExploreData() {
  const [state, setState] = useState<UseApiState<{
    worlds: World[];
    places: Place[];
    monsters: Monster[];
  }>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const data = await dataService.getExploreData();
        setState({ data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchData();
  }, []);

  return state;
}

// Hook para obtener monstruos
export function useMonsters(params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Monster[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMonsters = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await monstersService.getAll(params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchMonsters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return state;
}

// Hook para obtener mundos
export function useWorlds(params?: QueryParams) {
  const [state, setState] = useState<UseApiState<World[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchWorlds = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await worldsService.getAll(params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchWorlds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return state;
}

// Hook para obtener lugares
export function usePlaces(params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Place[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await placesService.getAll(params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return state;
}

// Hook para obtener lugares por mundo
export function usePlacesByWorld(worldId: number, params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Place[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await placesService.getByWorld(worldId, params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    if (worldId) {
      fetchPlaces();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldId, JSON.stringify(params)]);

  return state;
}

// Hook para login
export function useLogin() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null
  });

  const login = async (credentials: LoginRequest) => {
    try {
      setState({ loading: true, error: null });
      const response = await authService.login(credentials);
      setState({ loading: false, error: null });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en login';
      setState({ loading: false, error: errorMessage });
      throw error;
    }
  };

  return { login, ...state };
}

// Hook para registro
export function useRegister() {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null
  });

  const register = async (userData: RegisterRequest) => {
    try {
      setState({ loading: true, error: null });
      const response = await authService.register(userData);
      setState({ loading: false, error: null });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en registro';
      setState({ loading: false, error: errorMessage });
      throw error;
    }
  };

  return { register, ...state };
}

// Hook para obtener información del usuario
export function useGetMe() {
  const [state, setState] = useState<UseApiState<AuthUser>>({
    data: null,
    loading: true,
    error: null
  });

  const getMe = async (token: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const user = await authService.getMe(token);
      setState({ data: user, loading: false, error: null });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error obteniendo información del usuario';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  };

  return { getMe, ...state };
}

// Hook para obtener items
export function useItems(params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Item[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await itemsService.getAll(params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return state;
}

// Hook para obtener items por tipo
export function useItemsByType(type: string, params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Item[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await itemsService.getByType(type, params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    if (type) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, JSON.stringify(params)]);

  return state;
}

// Hook para obtener items por rareza
export function useItemsByRarity(rarity: string, params?: QueryParams) {
  const [state, setState] = useState<UseApiState<Item[]>>({
    data: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));
        const response = await itemsService.getByRarity(rarity, params);
        setState({ data: response.data, loading: false, error: null });
      } catch (error) {
        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    if (rarity) {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rarity, JSON.stringify(params)]);

  return state;
}

// ============ Hooks de entidad individual ============

// Hook genérico de fetch con dependencia simple
function useEntity<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: true, error: null });
  useEffect(() => {
    let active = true;
    setState(prev => ({ ...prev, loading: true, error: null }));
    fetcher()
      .then(data => { if (active) setState({ data, loading: false, error: null }); })
      .catch(error => {
        if (active) setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'Error desconocido' });
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

// Un mundo por ID (con lugares poblados)
export function useWorld(id: number | null) {
  return useEntity<World | null>(
    async () => (id ? (await worldsService.getById(id, { populate: '*' })).data : null),
    [id]
  );
}

// Un lugar por ID (con mundo + banner poblados)
export function usePlace(id: number | null) {
  return useEntity<Place | null>(
    async () => (id ? (await placesService.getById(id, { populate: '*' })).data : null),
    [id]
  );
}

// Un monstruo por ID
export function useMonster(id: number | null) {
  return useEntity<Monster | null>(
    async () => (id ? (await monstersService.getById(id, { populate: '*' })).data : null),
    [id]
  );
}

// ============ Compañero, inventario, descubrimiento ============

// Compañero activo del usuario
export function useActiveCompanion(userId: number | null) {
  return useEntity<Companion | null>(
    async () => (userId ? (await companionsService.getActive()).data[0] ?? null : null),
    [userId]
  );
}

// Inventario del usuario
export function useInventory(userId: number | null) {
  return useEntity<InventoryEntry[]>(
    async () => (userId ? (await inventoryService.getMine()).data : []),
    [userId]
  );
}

// IDs de monstruos descubiertos por el usuario (para el bestiario)
export function useDiscoveredMonsters(enabled: boolean) {
  return useEntity<number[]>(
    async () => {
      if (!enabled) return [];
      const me = await authService.getMeFull();
      return (me.discoveredMonsters ?? []).map(m => m.id);
    },
    [enabled]
  );
}