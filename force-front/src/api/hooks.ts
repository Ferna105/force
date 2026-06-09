'use client';
import { useState, useEffect } from 'react';
import { dataService, monstersService, worldsService, placesService, itemsService, authService } from './services';
import type { Monster, World, Place, Item, QueryParams, LoginRequest, RegisterRequest, AuthUser } from './types';

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
  }, [params]);

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
  }, [params]);

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
  }, [params]);

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
  }, [worldId, params]);

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
  }, [params]);

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
  }, [type, params]);

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
  }, [rarity, params]);

  return state;
} 